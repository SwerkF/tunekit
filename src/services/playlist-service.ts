import {
  findAllPlaylists,
  findPlaylistById,
  findPlaylistByYoutubeId,
  createPlaylist,
  deletePlaylist,
  getPlaylistStats,
} from "../db/repositories/playlist-repository.ts";
import { fetchPlaylistInfo } from "../adapters/yt-dlp.ts";
import type { Playlist, PlaylistStats } from "../types/models.ts";

export async function addPlaylist(url: string): Promise<Playlist> {
  const info = await fetchPlaylistInfo(url);

  const existing = findPlaylistByYoutubeId(info.id);
  if (existing) {
    throw new Error(
      `Cette playlist est déjà enregistrée : "${existing.title}"`
    );
  }

  return createPlaylist({
    id: crypto.randomUUID(),
    youtubePlaylistId: info.id,
    url,
    title: info.title,
  });
}

export function listPlaylists(): Playlist[] {
  return findAllPlaylists();
}

export function getPlaylist(id: string): Playlist | null {
  return findPlaylistById(id);
}

export function removePlaylist(id: string): void {
  const playlist = findPlaylistById(id);
  if (!playlist) {
    throw new Error(`Playlist introuvable : ${id}`);
  }
  deletePlaylist(id);
}

export function getStats(playlistId: string): PlaylistStats {
  return getPlaylistStats(playlistId);
}
