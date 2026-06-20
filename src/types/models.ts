export interface Playlist {
  id: string;
  youtubePlaylistId: string;
  url: string;
  title: string;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  playlistId: string;
  youtubeVideoId: string;
  title: string | null;
  artist: string | null;
  filePath: string | null;
  status: string;
  errorMessage: string | null;
  downloadedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncRun {
  id: string;
  playlistId: string | null;
  startedAt: string;
  finishedAt: string | null;
  tracksAdded: number;
  tracksFailed: number;
  status: string;
}

export interface YtDlpPlaylistEntry {
  id: string;
  title: string;
  uploader: string | null;
}

export interface YtDlpPlaylistInfo {
  id: string;
  title: string;
  entries: YtDlpPlaylistEntry[];
}

export interface YtDlpDownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface SyncProgressEvent {
  type:
    | "start"
    | "track_start"
    | "track_done"
    | "track_error"
    | "complete"
    | "error";
  playlistId?: string;
  playlistTitle?: string;
  trackTitle?: string;
  trackIndex?: number;
  totalTracks?: number;
  tracksAdded?: number;
  tracksFailed?: number;
  message?: string;
}

export interface PlaylistStats {
  total: number;
  downloaded: number;
  failed: number;
  pending: number;
}
