import type { Locale } from "./i18n.ts";

export interface TunekitConfig {
  language: Locale | null;
  syncIntervalMinutes: number;
  musicImportFolder: string | null;
  audioFormat: string;
  audioQuality: string;
}
