import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { LOCK_PATH } from "./paths.ts";

export function acquireLock(): boolean {
  if (existsSync(LOCK_PATH)) {
    // Check if the locking process is still alive
    try {
      const pid = parseInt(readFileSync(LOCK_PATH, "utf-8").trim(), 10);
      if (!isNaN(pid)) {
        try {
          process.kill(pid, 0); // Signal 0 = check existence
          return false; // Process exists, lock is valid
        } catch {
          // Process doesn't exist, stale lock — remove it
          unlinkSync(LOCK_PATH);
        }
      }
    } catch {
      // Can't read lock file, assume stale
      try { unlinkSync(LOCK_PATH); } catch { /* ignore */ }
    }
  }

  writeFileSync(LOCK_PATH, String(process.pid));
  return true;
}

export function releaseLock(): void {
  try {
    if (existsSync(LOCK_PATH)) {
      unlinkSync(LOCK_PATH);
    }
  } catch { /* ignore */ }
}

export function isLocked(): boolean {
  if (!existsSync(LOCK_PATH)) return false;

  try {
    const pid = parseInt(readFileSync(LOCK_PATH, "utf-8").trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
