import { homedir } from "os";
import { join } from "path";

export const TUNEKIT_DIR = join(homedir(), ".tunekit");
export const DB_PATH = join(TUNEKIT_DIR, "tunekit.db");
export const CONFIG_PATH = join(TUNEKIT_DIR, "config.json");
export const LOCK_PATH = join(TUNEKIT_DIR, ".sync.lock");
export const TMP_DIR = join(TUNEKIT_DIR, "tmp");
export const LOG_DIR = join(TUNEKIT_DIR, "logs");
export const LOG_FILE = join(LOG_DIR, "tunekit.log");
export const LAUNCHD_LOG = join(LOG_DIR, "launchd.log");
export const PLIST_PATH = join(
  homedir(),
  "Library",
  "LaunchAgents",
  "com.tunekit.sync.plist"
);
