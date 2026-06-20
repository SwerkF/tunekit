import { runSync } from "../services/sync-engine.ts";
import { logger } from "../lib/logger.ts";
import type { SyncProgressEvent } from "../types/models.ts";

export async function runSyncCommand(
  playlistId: string | null,
  quiet: boolean
): Promise<void> {
  const log = quiet
    ? (_: string) => {}
    : (msg: string) => process.stdout.write(msg + "\n");

  log("Synchronisation en cours...");
  logger.info("Synchronisation démarrée (mode headless)");

  const onEvent = (event: SyncProgressEvent): void => {
    switch (event.type) {
      case "start":
        log(`\nPlaylist : ${event.playlistTitle}`);
        break;
      case "track_start":
        if (!event.message) {
          log(
            `  [${event.trackIndex}/${event.totalTracks}] ${event.trackTitle}`
          );
        }
        break;
      case "track_done":
        log(`  ✓ ${event.trackTitle}`);
        break;
      case "track_error":
        log(`  ✗ ${event.trackTitle} — ${event.message}`);
        break;
      case "complete":
        log(
          `\nTerminé : ${event.tracksAdded} ajouté(s), ${event.tracksFailed} échec(s)`
        );
        break;
      case "error":
        log(`Erreur : ${event.message}`);
        logger.error(event.message ?? "Erreur inconnue");
        break;
      default: {
        const _exhaustive: never = event.type;
        void _exhaustive;
      }
    }
  };

  await runSync(playlistId ? [playlistId] : null, onEvent);
}
