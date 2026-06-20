import { existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
import type {
  YtDlpPlaylistInfo,
  YtDlpPlaylistEntry,
  YtDlpDownloadResult,
} from "../types/models.ts";
import { TMP_DIR } from "../lib/paths.ts";
import { logger } from "../lib/logger.ts";

export interface TrackMeta {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  trackNumber?: number | null;
}

async function runYtDlp(
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["yt-dlp", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

export async function checkYtDlp(): Promise<boolean> {
  try {
    const result = await runYtDlp(["--version"]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export async function checkFfmpeg(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["ffmpeg", "-version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function checkAtomicParsley(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["AtomicParsley", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function fetchPlaylistInfo(url: string): Promise<YtDlpPlaylistInfo> {
  logger.info(`Récupération des informations de la playlist : ${url}`);

  const result = await runYtDlp([
    "--flat-playlist",
    "--dump-single-json",
    "--no-warnings",
    "--no-abort-on-error",
    url,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(
      `yt-dlp a échoué (code ${result.exitCode}) : ${result.stderr.trim()}`
    );
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    throw new Error("Impossible de lire la réponse de yt-dlp");
  }

  const entries = ((data.entries as Array<Record<string, unknown>>) ?? [])
    .filter((e) => e && e.id)
    .map(
      (entry): YtDlpPlaylistEntry => ({
        id: String(entry.id),
        title: String(entry.title ?? entry.id),
        uploader: entry.uploader ? String(entry.uploader) : null,
      })
    );

  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? data.id ?? url),
    entries,
  };
}

/** Supprime tous les fichiers temporaires liés à un videoId (*.part, fichiers intermédiaires…) */
function cleanupPartialFiles(videoId: string): void {
  try {
    const files = readdirSync(TMP_DIR);
    for (const file of files) {
      if (file.startsWith(videoId)) {
        try { unlinkSync(join(TMP_DIR, file)); } catch { /* ignore */ }
      }
    }
  } catch { /* ignore si tmp/ n'existe pas */ }
}

/** Extrait un message d'erreur lisible depuis la sortie stderr de yt-dlp */
function parseYtDlpError(stderr: string): string {
  if (!stderr) return "Échec du téléchargement";
  const errorLine = stderr.split("\n").find((l) => l.startsWith("ERROR:"));
  if (errorLine) {
    return errorLine.replace(/^ERROR:\s*/, "").trim();
  }
  const firstLine = stderr.split("\n").find((l) => l.trim());
  return firstLine?.trim() ?? "Échec du téléchargement";
}

/**
 * Construit les arguments --parse-metadata pour injecter album,
 * artiste et numéro de piste dans les tags ID3 du MP3.
 */
function buildParseMetadataArgs(meta: TrackMeta): string[] {
  const args: string[] = [];

  // Album = titre de la playlist
  if (meta.album) {
    // Échappe les caractères spéciaux (: est le délimiteur yt-dlp)
    const safe = meta.album.replace(/:/g, "\\:");
    args.push("--parse-metadata", `${safe}:%(meta_album)s`);
  }

  // Artiste — yt-dlp l'injecte déjà via --embed-metadata, mais on
  // force si une valeur explicite est fournie
  if (meta.artist) {
    const safe = meta.artist.replace(/:/g, "\\:");
    args.push("--parse-metadata", `${safe}:%(meta_artist)s`);
  }

  // Numéro de piste dans la playlist
  if (meta.trackNumber != null) {
    args.push(
      "--parse-metadata",
      `${meta.trackNumber}:%(meta_track)s`
    );
  }

  return args;
}

export async function downloadTrack(
  videoId: string,
  meta: TrackMeta,
  onProgress?: (line: string) => void
): Promise<YtDlpDownloadResult> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  // Fichier déterministe dans tmp/ — déplacé vers Apple Music
  // uniquement APRÈS conversion complète (évite que Music importe un fichier partiel).
  const outputTemplate = join(TMP_DIR, `${videoId}.%(ext)s`);
  const expectedPath = join(TMP_DIR, `${videoId}.mp3`);

  logger.info(`Téléchargement : ${videoId} — album : "${meta.album ?? "?"}", artiste : "${meta.artist ?? "?"}"`);

  const metadataArgs = buildParseMetadataArgs(meta);

  const proc = Bun.spawn(
    [
      "yt-dlp",
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      // Métadonnées basiques (titre, uploader, date…)
      "--embed-metadata",
      // Miniature YouTube intégrée comme cover art (nécessite ffmpeg ≥ 6 ou AtomicParsley)
      "--embed-thumbnail",
      // Métadonnées supplémentaires (album, artiste forcé, numéro de piste)
      ...metadataArgs,
      "--no-playlist",
      "--no-warnings",
      "--newline",
      "-o", outputTemplate,
      videoUrl,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    }
  );

  // Collecte stderr en parallèle pour ne pas bloquer le streaming stdout
  const stderrPromise = new Response(proc.stderr).text();

  const decoder = new TextDecoder();
  const reader = proc.stdout.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (onProgress) {
      const text = decoder.decode(value);
      text
        .split("\n")
        .filter(Boolean)
        .forEach((line) => onProgress(line));
    }
  }

  const [exitCode, stderr] = await Promise.all([proc.exited, stderrPromise]);

  if (exitCode !== 0) {
    cleanupPartialFiles(videoId);
    const errorMsg = parseYtDlpError(stderr);
    logger.error(`Échec du téléchargement de "${videoId}" : ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  if (existsSync(expectedPath)) {
    return { success: true, filePath: expectedPath };
  }

  // Cas rare : yt-dlp a réussi mais .mp3 absent (problème ffmpeg ?)
  cleanupPartialFiles(videoId);
  const detail = parseYtDlpError(stderr);
  logger.error(`Fichier introuvable après téléchargement : ${expectedPath}. ${detail}`);
  return {
    success: false,
    error: `Conversion audio échouée${detail ? ` : ${detail}` : ""}`,
  };
}
