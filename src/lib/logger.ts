import { appendFileSync, mkdirSync } from "fs";
import { LOG_DIR, LOG_FILE } from "./paths.ts";

function ensureLogDir(): void {
  mkdirSync(LOG_DIR, { recursive: true });
}

function format(level: string, message: string): string {
  return `[${new Date().toISOString()}] [${level}] ${message}\n`;
}

export const logger = {
  info(message: string): void {
    ensureLogDir();
    appendFileSync(LOG_FILE, format("INFO", message));
  },

  warn(message: string): void {
    ensureLogDir();
    appendFileSync(LOG_FILE, format("WARN", message));
  },

  error(message: string, error?: unknown): void {
    ensureLogDir();
    const extra =
      error instanceof Error ? ` — ${error.message}` : error ? String(error) : "";
    appendFileSync(LOG_FILE, format("ERROR", `${message}${extra}`));
  },

  debug(message: string): void {
    if (process.env.TUNEKIT_DEBUG) {
      ensureLogDir();
      appendFileSync(LOG_FILE, format("DEBUG", message));
    }
  },
};
