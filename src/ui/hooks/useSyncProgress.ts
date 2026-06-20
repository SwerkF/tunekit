import { useState, useCallback, useRef } from "react";
import { runSync } from "../../services/sync-engine.ts";
import type { SyncProgressEvent } from "../../types/models.ts";

export interface SyncFailure {
  trackTitle: string;
  message: string;
}

export interface SyncState {
  isRunning: boolean;
  events: SyncProgressEvent[];
  currentTrack: string | null;
  trackIndex: number;
  totalTracks: number;
  tracksAdded: number;
  tracksFailed: number;
  failures: SyncFailure[];
  isComplete: boolean;
  errorMessage: string | null;
  currentPlaylistTitle: string | null;
}

const INITIAL_STATE: SyncState = {
  isRunning: false,
  events: [],
  currentTrack: null,
  trackIndex: 0,
  totalTracks: 0,
  tracksAdded: 0,
  tracksFailed: 0,
  failures: [],
  isComplete: false,
  errorMessage: null,
  currentPlaylistTitle: null,
};

export function useSyncProgress() {
  const [state, setState] = useState<SyncState>(INITIAL_STATE);
  const runningRef = useRef(false);

  const startSync = useCallback(async (playlistIds?: string[]) => {
    if (runningRef.current) return;
    runningRef.current = true;

    setState({ ...INITIAL_STATE, isRunning: true });

    await runSync(playlistIds ?? null, (event) => {
      setState((prev) => {
        const updated: SyncState = { ...prev, events: [...prev.events, event] };

        switch (event.type) {
          case "start":
            updated.currentPlaylistTitle = event.playlistTitle ?? null;
            updated.totalTracks = 0;
            updated.trackIndex = 0;
            break;
          case "track_start":
            updated.currentTrack = event.trackTitle ?? null;
            updated.trackIndex = event.trackIndex ?? prev.trackIndex;
            updated.totalTracks = event.totalTracks ?? prev.totalTracks;
            break;
          case "track_done":
            updated.tracksAdded = prev.tracksAdded + 1;
            break;
          case "track_error":
            updated.tracksFailed = prev.tracksFailed + 1;
            updated.failures = [
              ...prev.failures,
              {
                trackTitle: event.trackTitle ?? "Titre inconnu",
                message: event.message ?? "Erreur inconnue",
              },
            ];
            break;
          case "complete":
            updated.isRunning = false;
            updated.isComplete = true;
            updated.tracksAdded = event.tracksAdded ?? prev.tracksAdded;
            updated.tracksFailed = event.tracksFailed ?? prev.tracksFailed;
            updated.currentTrack = null;
            break;
          case "error":
            updated.isRunning = false;
            updated.isComplete = true;
            updated.errorMessage = event.message ?? "Erreur inconnue";
            break;
          default: {
            const _exhaustive: never = event.type;
            void _exhaustive;
          }
        }

        return updated;
      });
    });

    runningRef.current = false;
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    runningRef.current = false;
  }, []);

  return { state, startSync, reset };
}
