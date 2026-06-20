import type { Database } from "bun:sqlite";

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        youtubePlaylistId TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        lastSyncedAt TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_playlists_youtubePlaylistId
        ON playlists(youtubePlaylistId);

      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        playlistId TEXT NOT NULL,
        youtubeVideoId TEXT NOT NULL,
        title TEXT,
        artist TEXT,
        filePath TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        errorMessage TEXT,
        downloadedAt TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
        UNIQUE(playlistId, youtubeVideoId)
      );

      CREATE INDEX IF NOT EXISTS idx_tracks_playlistId ON tracks(playlistId);
      CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);

      CREATE TABLE IF NOT EXISTS sync_runs (
        id TEXT PRIMARY KEY,
        playlistId TEXT,
        startedAt TEXT NOT NULL DEFAULT (datetime('now')),
        finishedAt TEXT,
        tracksAdded INTEGER NOT NULL DEFAULT 0,
        tracksFailed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'running',
        FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE SET NULL
      );
    `,
  },
];

export function runMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  for (const migration of MIGRATIONS) {
    const applied = db
      .prepare("SELECT version FROM schema_migrations WHERE version = ?")
      .get(migration.version);

    if (!applied) {
      db.transaction(() => {
        db.run(migration.sql);
        db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(
          migration.version
        );
      })();
    }
  }
}
