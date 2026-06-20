import {
  mkdirSync,
  renameSync,
  existsSync,
  copyFileSync,
  unlinkSync,
  statSync,
} from "fs";
import { join } from "path";
import { findAllPlaylists, findPlaylistById, updatePlaylistLastSyncedAt } from "../db/repositories/playlist-repository.ts";
import {
  findTrackByVideoId,
  createTrack,
  updateTrackStatus,
  resetStaleDownloadingTracks,
  resetTrackForRetry,
} from "../db/repositories/track-repository.ts";
import {
  createSyncRun,
  completeSyncRun,
} from "../db/repositories/sync-run-repository.ts";
import { fetchPlaylistInfo, downloadTrack, type TrackMeta } from "../adapters/yt-dlp.ts";
import { getAppleMusicFolder } from "../lib/apple-music-folder.ts";
import { acquireLock, releaseLock } from "../lib/lock.ts";
import { logger } from "../lib/logger.ts";
import { TMP_DIR } from "../lib/paths.ts";
import { TrackStatus } from "../types/track-status.ts";
import { SyncRunStatus } from "../types/sync-run-status.ts";
import type { SyncProgressEvent, Track } from "../types/models.ts";

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim().slice(0, 200);
}

function buildTargetFilename(
  videoId: string,
  title: string | null,
  artist: string | null
): string {
  if (artist && title) {
    return `${sanitizeFilename(artist)} - ${sanitizeFilename(title)}.mp3`;
  }
  if (title) {
    return `${sanitizeFilename(title)}.mp3`;
  }
  return `${videoId}.mp3`;
}

function resolveFilenameConflict(dir: string, filename: string): string {
  const base = filename.replace(/\.mp3$/, "");
  let candidate = join(dir, filename);
  let counter = 1;
  while (existsSync(candidate)) {
    candidate = join(dir, `${base} (${counter}).mp3`);
    counter++;
  }
  return candidate;
}

/**
 * Déplace un fichier de manière atomique.
 * Utilise renameSync si possible (même partition) ;
 * tombe en fallback copy+delete si src et dest sont sur des partitions différentes (EXDEV).
 * Cela garantit qu'Apple Music ne voit jamais un fichier partiel :
 * le fichier n'apparaît dans le dossier d'import qu'une fois entièrement écrit.
 */
function moveFile(src: string, dest: string): void {
  // Sanity check : le fichier source doit exister et être non-vide
  if (!existsSync(src)) {
    throw new Error(`Fichier source introuvable : ${src}`);
  }
  const stat = statSync(src);
  if (stat.size === 0) {
    try { unlinkSync(src); } catch { /* ignore */ }
    throw new Error("Le fichier téléchargé est vide (conversion échouée ?)");
  }

  try {
    // Atomic rename — même partition
    renameSync(src, dest);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EXDEV" || code === "EPERM") {
      // Cross-filesystem (ex. tmp sur / et Music sur un volume externe) :
      // copie complète puis suppression de la source
      copyFileSync(src, dest);
      try { unlinkSync(src); } catch { /* ignore, cleanup best-effort */ }
    } else {
      throw err;
    }
  }
}

function cleanupTmpFile(videoId: string): void {
  const path = join(TMP_DIR, `${videoId}.mp3`);
  if (existsSync(path)) {
    try { unlinkSync(path); } catch { /* ignore */ }
  }
}

async function syncPlaylist(
  playlistId: string,
  onEvent: (event: SyncProgressEvent) => void
): Promise<{ added: number; failed: number }> {
  const playlist = findPlaylistById(playlistId);
  if (!playlist) {
    throw new Error(`Playlist introuvable : ${playlistId}`);
  }

  onEvent({
    type: "start",
    playlistId,
    playlistTitle: playlist.title,
  });

  logger.info(`Synchronisation de la playlist : ${playlist.title}`);

  const info = await fetchPlaylistInfo(playlist.url);

  // Séparer les entrées en trois catégories :
  // - nouvelles (jamais vues) → créer en DB puis télécharger
  // - échouées / en attente → réessayer (resetTrackForRetry)
  // - déjà téléchargées → ignorer
  const RETRYABLE = new Set<string>([TrackStatus.Failed, TrackStatus.Pending]);

  const entriesToProcess = info.entries.filter((entry) => {
    const existing = findTrackByVideoId(playlistId, entry.id);
    if (!existing) return true;
    return RETRYABLE.has(existing.status);
  });

  const totalNew = entriesToProcess.length;
  let added = 0;
  let failed = 0;

  // Index de position réel dans la playlist complète (pour le tag numéro de piste)
  const entryIndexMap = new Map<string, number>(
    info.entries.map((e, i) => [e.id, i + 1])
  );

  for (let i = 0; i < entriesToProcess.length; i++) {
    const entry = entriesToProcess[i];

    // Récupère ou crée l'entrée DB
    const existing = findTrackByVideoId(playlistId, entry.id);
    let track: Track;
    if (existing) {
      // Réinitialise le track échoué/interrompu pour réessai propre
      resetTrackForRetry(existing.id);
      track = { ...existing, status: TrackStatus.Pending, errorMessage: null };
    } else {
      track = createTrack({
        id: crypto.randomUUID(),
        playlistId,
        youtubeVideoId: entry.id,
        title: entry.title,
        artist: entry.uploader,
      });
    }

    onEvent({
      type: "track_start",
      playlistId,
      playlistTitle: playlist.title,
      trackTitle: entry.title,
      trackIndex: i + 1,
      totalTracks: totalNew,
    });

    updateTrackStatus(track.id, TrackStatus.Downloading);

    const trackMeta: TrackMeta = {
      title: entry.title,
      artist: entry.uploader,
      album: playlist.title,
      trackNumber: entryIndexMap.get(entry.id) ?? null,
    };

    const result = await downloadTrack(entry.id, trackMeta, (line) => {
      // Forward yt-dlp progress lines (e.g., [download] 45.2% of ...)
      if (line.startsWith("[download]")) {
        onEvent({
          type: "track_start",
          playlistId,
          trackTitle: entry.title,
          trackIndex: i + 1,
          totalTracks: totalNew,
          message: line.trim(),
        });
      }
    });

    if (!result.success || !result.filePath) {
      // Nettoyage du fichier temporaire partiel éventuel
      cleanupTmpFile(entry.id);
      updateTrackStatus(track.id, TrackStatus.Failed, {
        errorMessage: result.error ?? "Échec inconnu",
      });
      logger.error(`Échec pour "${entry.title}"`, result.error);
      onEvent({
        type: "track_error",
        playlistId,
        trackTitle: entry.title,
        message: result.error,
      });
      failed++;
      continue;
    }

    // Déplacement vers le dossier Apple Music une fois le téléchargement 100% terminé.
    // moveFile() vérifie que le fichier est non-vide et gère les cross-filesystem (EXDEV).
    try {
      const musicFolder = getAppleMusicFolder();
      const targetFilename = buildTargetFilename(
        entry.id,
        entry.title,
        entry.uploader
      );
      const targetPath = resolveFilenameConflict(musicFolder, targetFilename);

      moveFile(result.filePath, targetPath);

      updateTrackStatus(track.id, TrackStatus.Downloaded, {
        filePath: targetPath,
        title: entry.title,
        artist: entry.uploader ?? undefined,
      });

      logger.info(`Importé : ${targetFilename}`);
      onEvent({
        type: "track_done",
        playlistId,
        trackTitle: entry.title,
        trackIndex: i + 1,
        totalTracks: totalNew,
      });
      added++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Nettoyage du fichier temporaire si le déplacement a échoué
      cleanupTmpFile(entry.id);
      updateTrackStatus(track.id, TrackStatus.Failed, {
        errorMessage: msg,
      });
      logger.error(`Impossible de déplacer le fichier pour "${entry.title}"`, err);
      onEvent({ type: "track_error", trackTitle: entry.title, message: msg });
      failed++;
    }
  }

  updatePlaylistLastSyncedAt(playlistId, new Date().toISOString());

  return { added, failed };
}

export async function runSync(
  playlistIds: string[] | null,
  onEvent: (event: SyncProgressEvent) => void
): Promise<void> {
  if (!acquireLock()) {
    onEvent({
      type: "error",
      message:
        "Une synchronisation est déjà en cours. Réessayez dans quelques instants.",
    });
    return;
  }

  mkdirSync(TMP_DIR, { recursive: true });
  resetStaleDownloadingTracks();

  const targets = playlistIds
    ? playlistIds
    : findAllPlaylists().map((p) => p.id);

  if (targets.length === 0) {
    releaseLock();
    onEvent({
      type: "complete",
      tracksAdded: 0,
      tracksFailed: 0,
      message: "Aucune playlist enregistrée.",
    });
    return;
  }

  const syncRun = createSyncRun(targets.length === 1 ? targets[0] : null);
  let totalAdded = 0;
  let totalFailed = 0;

  try {
    for (const playlistId of targets) {
      const { added, failed } = await syncPlaylist(playlistId, onEvent);
      totalAdded += added;
      totalFailed += failed;
    }

    const status =
      totalFailed === 0
        ? SyncRunStatus.Success
        : totalAdded === 0
        ? SyncRunStatus.Failed
        : SyncRunStatus.Partial;

    completeSyncRun(syncRun.id, status, totalAdded, totalFailed);
  } catch (err) {
    logger.error("Erreur critique pendant la synchronisation", err);
    completeSyncRun(syncRun.id, SyncRunStatus.Failed, totalAdded, totalFailed);
    onEvent({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    releaseLock();
  }

  onEvent({
    type: "complete",
    tracksAdded: totalAdded,
    tracksFailed: totalFailed,
  });
}
