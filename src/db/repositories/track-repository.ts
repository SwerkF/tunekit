import { getDb } from "../client.ts";
import type { Track } from "../../types/models.ts";
import { TrackStatus } from "../../types/track-status.ts";

export function findTracksByPlaylistId(playlistId: string): Track[] {
  return getDb()
    .prepare("SELECT * FROM tracks WHERE playlistId = ? ORDER BY createdAt ASC")
    .all(playlistId) as Track[];
}

export function findTrackByVideoId(
  playlistId: string,
  youtubeVideoId: string
): Track | null {
  return getDb()
    .prepare(
      "SELECT * FROM tracks WHERE playlistId = ? AND youtubeVideoId = ?"
    )
    .get(playlistId, youtubeVideoId) as Track | null;
}

export function findTrackById(id: string): Track | null {
  return getDb()
    .prepare("SELECT * FROM tracks WHERE id = ?")
    .get(id) as Track | null;
}

export function findFailedTracks(playlistId?: string): Track[] {
  if (playlistId) {
    return getDb()
      .prepare(
        "SELECT * FROM tracks WHERE playlistId = ? AND status = 'failed'"
      )
      .all(playlistId) as Track[];
  }
  return getDb()
    .prepare("SELECT * FROM tracks WHERE status = 'failed'")
    .all() as Track[];
}

export function createTrack(data: {
  id: string;
  playlistId: string;
  youtubeVideoId: string;
  title: string | null;
  artist: string | null;
}): Track {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO tracks
        (id, playlistId, youtubeVideoId, title, artist, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.id,
      data.playlistId,
      data.youtubeVideoId,
      data.title,
      data.artist,
      TrackStatus.Pending,
      now,
      now
    );

  return findTrackByVideoId(data.playlistId, data.youtubeVideoId)!;
}

export function updateTrackStatus(
  id: string,
  status: TrackStatus,
  extras: {
    filePath?: string;
    errorMessage?: string;
    title?: string;
    artist?: string;
  } = {}
): void {
  const now = new Date().toISOString();
  const downloadedAt =
    status === TrackStatus.Downloaded ? now : undefined;

  getDb()
    .prepare(
      `UPDATE tracks SET
        status = ?,
        filePath = COALESCE(?, filePath),
        errorMessage = COALESCE(?, errorMessage),
        title = COALESCE(?, title),
        artist = COALESCE(?, artist),
        downloadedAt = COALESCE(?, downloadedAt),
        updatedAt = ?
       WHERE id = ?`
    )
    .run(
      status,
      extras.filePath ?? null,
      extras.errorMessage ?? null,
      extras.title ?? null,
      extras.artist ?? null,
      downloadedAt ?? null,
      now,
      id
    );
}

export function resetStaleDownloadingTracks(): void {
  getDb()
    .prepare(
      "UPDATE tracks SET status = 'pending', updatedAt = ? WHERE status = 'downloading'"
    )
    .run(new Date().toISOString());
}

/**
 * Remet un track échoué ou interrompu à zéro pour être réessayé.
 * Efface explicitement le message d'erreur et le chemin de fichier partiel.
 */
export function resetTrackForRetry(id: string): void {
  getDb()
    .prepare(
      `UPDATE tracks SET
        status = ?,
        errorMessage = NULL,
        filePath = NULL,
        updatedAt = ?
       WHERE id = ?`
    )
    .run(TrackStatus.Pending, new Date().toISOString(), id);
}
