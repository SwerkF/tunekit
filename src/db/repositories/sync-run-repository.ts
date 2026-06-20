import { getDb } from "../client.ts";
import type { SyncRun } from "../../types/models.ts";
import { SyncRunStatus } from "../../types/sync-run-status.ts";

export function createSyncRun(playlistId: string | null): SyncRun {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO sync_runs (id, playlistId, startedAt, status)
       VALUES (?, ?, ?, ?)`
    )
    .run(id, playlistId, now, SyncRunStatus.Running);

  return findSyncRunById(id)!;
}

export function completeSyncRun(
  id: string,
  status: SyncRunStatus,
  tracksAdded: number,
  tracksFailed: number
): void {
  getDb()
    .prepare(
      `UPDATE sync_runs SET
        status = ?,
        finishedAt = ?,
        tracksAdded = ?,
        tracksFailed = ?
       WHERE id = ?`
    )
    .run(status, new Date().toISOString(), tracksAdded, tracksFailed, id);
}

export function findSyncRunById(id: string): SyncRun | null {
  return getDb()
    .prepare("SELECT * FROM sync_runs WHERE id = ?")
    .get(id) as SyncRun | null;
}

export function findRecentSyncRuns(limit = 10): SyncRun[] {
  return getDb()
    .prepare(
      "SELECT * FROM sync_runs ORDER BY startedAt DESC LIMIT ?"
    )
    .all(limit) as SyncRun[];
}

export function findLastSyncRun(): SyncRun | null {
  return getDb()
    .prepare(
      "SELECT * FROM sync_runs WHERE status != 'running' ORDER BY startedAt DESC LIMIT 1"
    )
    .get() as SyncRun | null;
}
