import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";
import { loadConfig, setConfigValue } from "./config.ts";

/** Expand le ~ en chemin absolu (Node.js ne le fait pas automatiquement). */
function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return join(homedir(), p.slice(2));
  }
  return p;
}

const CANDIDATES = [
  // macOS Ventura+ : dossier Media peut être "Media.localized"
  join(homedir(), "Music", "Music", "Media.localized", "Automatically Add to Music.localized"),
  join(homedir(), "Music", "Music", "Media.localized", "Automatically Add to Music"),
  // macOS Monterey et précédents
  join(homedir(), "Music", "Music", "Media", "Automatically Add to Music.localized"),
  join(homedir(), "Music", "Music", "Media", "Automatically Add to Music"),
  // iTunes (anciens macOS)
  join(homedir(), "Music", "iTunes", "iTunes Media", "Automatically Add to Music.localized"),
  join(homedir(), "Music", "iTunes", "iTunes Media", "Automatically Add to Music"),
];

export function getAppleMusicFolder(): string {
  const config = loadConfig();

  if (config.musicImportFolder) {
    const expanded = expandTilde(config.musicImportFolder);
    if (existsSync(expanded)) {
      // Sauvegarde le chemin expandé pour les prochains appels
      if (expanded !== config.musicImportFolder) {
        setConfigValue("musicImportFolder", expanded);
      }
      return expanded;
    }
    // Chemin configuré invalide → on tente la détection auto avant de lancer l'erreur
  }

  for (const candidate of CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const configured = config.musicImportFolder
    ? `\nChemin configuré "${config.musicImportFolder}" introuvable.`
    : "";

  throw new Error(
    `Dossier « Automatically Add to Music » introuvable.${configured}\n` +
      "Ouvrez Apple Music au moins une fois, ou configurez le chemin manuellement :\n" +
      "  tunekit config set musicImportFolder <chemin>"
  );
}

export function detectAppleMusicFolder(): string | null {
  const config = loadConfig();

  if (config.musicImportFolder) {
    const expanded = expandTilde(config.musicImportFolder);
    if (existsSync(expanded)) return expanded;
  }

  for (const candidate of CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}
