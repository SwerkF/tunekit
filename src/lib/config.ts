import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { TUNEKIT_DIR, CONFIG_PATH } from "./paths.ts";
import type { TunekitConfig } from "../types/config.ts";

/** Expand ~ → chemin absolu pour les valeurs de chemin dans la config. */
function expandTildeInConfig(config: TunekitConfig): TunekitConfig {
  if (config.musicImportFolder?.startsWith("~")) {
    return {
      ...config,
      musicImportFolder: join(homedir(), config.musicImportFolder.slice(2)),
    };
  }
  return config;
}

const DEFAULT_CONFIG: TunekitConfig = {
  language: null,
  syncIntervalMinutes: 60,
  musicImportFolder: null,
  audioFormat: "mp3",
  audioQuality: "0",
};

export function loadConfig(): TunekitConfig {
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    return expandTildeInConfig(parsed);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: TunekitConfig): void {
  mkdirSync(TUNEKIT_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export function getConfigValue<K extends keyof TunekitConfig>(
  key: K
): TunekitConfig[K] {
  return loadConfig()[key];
}

export function setConfigValue<K extends keyof TunekitConfig>(
  key: K,
  value: TunekitConfig[K]
): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

export function ensureTunekitDir(): void {
  mkdirSync(TUNEKIT_DIR, { recursive: true });
}
