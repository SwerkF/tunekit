# TuneKit — Agent Memory

## Project identity
- **Name**: TuneKit
- **Purpose**: macOS CLI app to sync YouTube playlists → Apple Music via `yt-dlp` + `ffmpeg`
- **Runtime**: Bun (always use `bun`, never npm/yarn/pnpm unless Bun unavailable)
- **Language**: TypeScript strict (`tsconfig.json` — `bundler` resolution, `react-jsx`)
- **TUI**: Ink (React for CLI) — interactive by default, headless subcommands via Commander
- **Database**: SQLite via `bun:sqlite`, migrations in `src/db/migrations.ts`
- **Config file**: `~/.tunekit/config.json` (fields: `language`, `syncIntervalMinutes`, `musicImportFolder`, `audioFormat`, `audioQuality`)

## Internationalisation
- The app is **bilingual EN/FR**.
- Language is selected at first launch via `LanguageSetup` screen, stored in config as `"language": "en" | "fr" | null`.
- All UI strings go through `useT()` hook from `src/lib/i18n.tsx` (React Context).
- Adding strings: add to `src/types/i18n.ts` (Translations interface) + both `src/locales/en.ts` and `src/locales/fr.ts`.
- **Always respond to the user in French.**

## Recurring corrections — critical patterns

### 1. launchd daemon — use `launchctl load -w`, NOT `bootstrap`
`launchctl bootstrap gui/$UID` fails with "Bootstrap failed: 5: Input/output error" on modern macOS.
Always use:
```bash
launchctl load -w /path/to/plist      # install
launchctl unload /path/to/plist       # uninstall
launchctl list com.tunekit.sync       # status
```
Before installing: always unload the existing agent first (ignore errors). Add `~/.bun/bin` to PATH in the plist `EnvironmentVariables`.

### 2. Cross-filesystem file moves — always use copy+delete fallback
`renameSync` throws `EXDEV` when src and dest are on different filesystems (e.g. tmp on `/` vs Music on an external volume). Always implement:
```typescript
try {
  renameSync(src, dest);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === "EXDEV" || code === "EPERM") {
    copyFileSync(src, dest);
    unlinkSync(src);
  } else throw err;
}
```

### 3. Apple Music folder — tilde expansion required
User paths like `~/Music/Music/Media.localized/Automatically Add to Music.localized` must be expanded before use. `loadConfig()` calls `expandTildeInConfig()` automatically. Detection candidates include both `Media` and `Media.localized` variants.

### 4. Track retry logic — filter `Pending` AND `Failed`
The sync engine must re-process tracks with status `Pending` OR `Failed`, not only new tracks. Use `resetTrackForRetry()` before re-downloading.

### 5. Download → move pattern (Apple Music import safety)
Always download to `~/.tunekit/tmp/<videoId>.mp3` first. Only move to Apple Music folder **after** the file is 100% complete and non-empty. Apple Music watches the folder and will import partial files if moved mid-download.

### 6. yt-dlp MP3 metadata flags
Use `--embed-metadata --embed-thumbnail` plus `--parse-metadata` for album (playlist title), artist, and track number. ffmpeg ≥ 6.0 handles thumbnail embedding for MP3 natively (no AtomicParsley needed if ffmpeg is recent).

## Key file map
| Path | Role |
|------|------|
| `src/lib/i18n.tsx` | I18n engine — `I18nProvider`, `useT()`, `useLocale()` |
| `src/locales/en.ts` / `fr.ts` | Translation dictionaries |
| `src/types/i18n.ts` | `Translations` interface (all keys) |
| `src/lib/config.ts` | Config load/save — tilde expansion on load |
| `src/lib/apple-music-folder.ts` | Auto-detect Apple Music import folder |
| `src/lib/lock.ts` | File-based sync lock (stale detection) |
| `src/adapters/yt-dlp.ts` | yt-dlp wrapper — download + metadata |
| `src/services/sync-engine.ts` | Core sync logic — diff, download, move, DB update |
| `src/commands/daemon.ts` | launchd install/uninstall/status |
| `src/db/migrations.ts` | SQLite schema |
| `src/ui/App.tsx` | Root — language guard + screen router |
| `src/ui/screens/LanguageSetup.tsx` | First-launch language picker |

## User preferences
- Always respond in French.
- Never use `variable as Type` casts — use type guards instead.
- Always create enums and interfaces (no raw string types).
- Exhaustive switch on unions/enums with `never` default case.
- No inline imports (all imports at top of file).
- Imports at top of every file — no inline imports.
