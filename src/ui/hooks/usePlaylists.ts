import { useState, useCallback } from "react";
import type { Playlist, PlaylistStats } from "../../types/models.ts";
import {
  findAllPlaylists,
  getPlaylistStats,
  deletePlaylist,
} from "../../db/repositories/playlist-repository.ts";
import { addPlaylist } from "../../services/playlist-service.ts";

export interface PlaylistWithStats {
  playlist: Playlist;
  stats: PlaylistStats;
}

export function usePlaylists() {
  const [items, setItems] = useState<PlaylistWithStats[]>(() => loadAll());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadAll(): PlaylistWithStats[] {
    return findAllPlaylists().map((playlist) => ({
      playlist,
      stats: getPlaylistStats(playlist.id),
    }));
  }

  const refresh = useCallback(() => {
    setItems(loadAll());
  }, []);

  const add = useCallback(async (url: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await addPlaylist(url);
      setItems(loadAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback((id: string): void => {
    deletePlaylist(id);
    setItems((prev) => prev.filter((p) => p.playlist.id !== id));
  }, []);

  return { items, loading, error, refresh, add, remove };
}
