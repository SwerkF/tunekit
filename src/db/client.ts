import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { TUNEKIT_DIR, DB_PATH } from "../lib/paths.ts";
import { runMigrations } from "./migrations.ts";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;

  mkdirSync(TUNEKIT_DIR, { recursive: true });

  _db = new Database(DB_PATH);
  _db.run("PRAGMA journal_mode=WAL");
  _db.run("PRAGMA foreign_keys=ON");

  runMigrations(_db);

  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
