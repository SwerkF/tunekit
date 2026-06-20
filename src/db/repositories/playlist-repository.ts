import { getDb } from "../client.ts";
import type { Playlist, PlaylistStats } from "../../types/models.ts";

export function findAllPlaylists(): Playlist[] {
  return getDb()
    .prepare("SELECT * FROM playlists ORDER BY createdAt DESC")
    .all() as Playlist[];
}

export function findPlaylistById(id: string): Playlist | null {
  return getDb()
    .prepare("SELECT * FROM playlists WHERE id = ?")
    .get(id) as Playlist | null;
}

export function findPlaylistByYoutubeId(
  youtubePlaylistId: string
): Playlist | null {
  return getDb()
    .prepare("SELECT * FROM playlists WHERE youtubePlaylistId = ?")
    .get(youtubePlaylistId) as Playlist | null;
}

export function createPlaylist(data: {
  id: string;
  youtubePlaylistId: string;
  url: string;
  title: string;
}): Playlist {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO playlists
        (id, youtubePlaylistId, url, title, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.id, data.youtubePlaylistId, data.url, data.title, now, now);

  return findPlaylistById(data.id)!;
}

export function updatePlaylistLastSyncedAt(
  id: string,
  date: string
): void {
  getDb()
    .prepare(
      "UPDATE playlists SET lastSyncedAt = ?, updatedAt = ? WHERE id = ?"
    )
    .run(date, new Date().toISOString(), id);
}

export function deletePlaylist(id: string): void {
  getDb().prepare("DELETE FROM playlists WHERE id = ?").run(id);
}

export function getPlaylistStats(playlistId: string): PlaylistStats {
  const row = getDb()
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'downloaded' THEN 1 ELSE 0 END) as downloaded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status IN ('pending','downloading') THEN 1 ELSE 0 END) as pending
       FROM tracks WHERE playlistId = ?`
    )
    .get(playlistId) as { total: number; downloaded: number; failed: number; pending: number };

  return {
    total: row.total ?? 0,
    downloaded: row.downloaded ?? 0,
    failed: row.failed ?? 0,
    pending: row.pending ?? 0,
  };
}
