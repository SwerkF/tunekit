import { mkdirSync } from "fs";
import { TUNEKIT_DIR, TMP_DIR, LOG_DIR } from "../lib/paths.ts";
import { saveConfig, loadConfig } from "../lib/config.ts";
import { getDb } from "../db/client.ts";
import { checkYtDlp, checkFfmpeg, checkAtomicParsley } from "../adapters/yt-dlp.ts";
import { detectAppleMusicFolder } from "../lib/apple-music-folder.ts";
import { logger } from "../lib/logger.ts";

export async function runInit(quiet = false): Promise<void> {
  const log = quiet
    ? (_: string) => {}
    : (msg: string) => process.stdout.write(msg + "\n");

  log("Initialisation de TuneKit...");

  // Create directory structure
  mkdirSync(TUNEKIT_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  // Initialize config if not present
  const config = loadConfig();
  saveConfig(config);

  // Initialize database (runs migrations)
  getDb();

  log("  ✓ Base de données initialisée");
  log("  ✓ Configuration créée");

  // Check system binaries
  const [hasYtDlp, hasFfmpeg, hasAtomicParsley] = await Promise.all([
    checkYtDlp(),
    checkFfmpeg(),
    checkAtomicParsley(),
  ]);

  if (!hasYtDlp) {
    log("  ✗ yt-dlp introuvable — installez-le avec : brew install yt-dlp");
  } else {
    log("  ✓ yt-dlp disponible");
  }

  if (!hasFfmpeg) {
    log("  ✗ ffmpeg introuvable — installez-le avec : brew install ffmpeg");
  } else {
    log("  ✓ ffmpeg disponible");
  }

  if (!hasAtomicParsley) {
    log(
      "  ⚠ AtomicParsley absent — les miniatures MP3 nécessitent ffmpeg ≥ 6 ou : brew install atomicparsley"
    );
  } else {
    log("  ✓ AtomicParsley disponible (miniatures dans les MP3)");
  }

  // Detect Apple Music folder
  const musicFolder = detectAppleMusicFolder();
  if (musicFolder) {
    log(`  ✓ Dossier Apple Music : ${musicFolder}`);
  } else {
    log(
      "  ✗ Dossier Apple Music introuvable — ouvrez Apple Music puis relancez cette commande"
    );
  }

  logger.info("Initialisation terminée");
  log("\nTuneKit est prêt. Lancez tunekit pour ouvrir l'interface.");
}
