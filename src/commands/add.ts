import { addPlaylist } from "../services/playlist-service.ts";
import { logger } from "../lib/logger.ts";

export async function runAddCommand(url: string, quiet: boolean): Promise<void> {
  const log = quiet
    ? (_: string) => {}
    : (msg: string) => process.stdout.write(msg + "\n");

  log(`Ajout de la playlist : ${url}`);

  const playlist = await addPlaylist(url);

  logger.info(`Playlist ajoutée : ${playlist.title} (${playlist.id})`);
  log(`✓ Playlist ajoutée : "${playlist.title}"`);
}
