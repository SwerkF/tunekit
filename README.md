<div align="center">
  <img src="assets/logo.png" alt="TuneKit" width="480" />

  <p>Automatically sync YouTube playlists to <strong>Apple Music</strong> on macOS, from the terminal.</p>

  <p>
    <img src="https://img.shields.io/badge/macOS-only-black?logo=apple" alt="macOS" />
    <img src="https://img.shields.io/badge/runtime-Bun-f472b6?logo=bun" alt="Bun" />
    <img src="https://img.shields.io/badge/language-TypeScript-3178c6?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/UI-Ink-cyan" alt="Ink TUI" />
  </p>
</div>

---

> **Legal disclaimer**: downloading YouTube content may violate YouTube's [Terms of Service](https://www.youtube.com/static?template=terms). This tool is intended for strictly personal use, for playlists you own or that are royalty-free.

---

## Prerequisites

### System dependencies

```bash
brew install yt-dlp ffmpeg bun
# Optional — improves MP3 thumbnail embedding on older ffmpeg versions
brew install atomicparsley
```

### Apple Music

- Open **Apple Music** at least once after installation.
- In *Music > Settings > Files*, enable:
  - **Copy files to Music Media folder when adding to library**
  - **Keep Music Media folder organized**
- Apple Music must be **open** to process newly imported files.

---

## Installation

```bash
cd /path/to/tunekit
bun install
bun link   # makes 'tunekit' available globally
tunekit init
```

---

## Usage

### Interactive TUI (recommended)

```bash
tunekit
```

Launches the Ink interface in your terminal. Keyboard navigation:

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate lists |
| `Enter` | Select / confirm |
| `ESC` | Go back |
| `q` | Quit |

#### Available screens

| Screen | Description |
|--------|-------------|
| **Dashboard** | Stats overview, daemon status |
| **Playlists** | List, inspect, individually sync playlists |
| **Add** | Paste a YouTube URL to start tracking |
| **Sync** | Manual sync with real-time progress bar |
| **Settings** | Sync interval, Apple Music folder, language |
| **Daemon** | Install / manage the launchd background service |
| **Logs** | Colour-coded log viewer with level filtering |

At first launch, TuneKit asks you to choose your language (English / Français).

---

### Headless commands (scripts & automation)

```bash
# First-time setup
tunekit init

# Add a playlist
tunekit add "https://youtube.com/playlist?list=PLxxxxx"

# Sync all playlists
tunekit sync

# Sync a specific playlist
tunekit sync <playlist-id>

# Silent sync (used by launchd)
tunekit sync --quiet
```

---

## Automatic sync (launchd daemon)

TuneKit uses **launchd** to sync in the background, even when the terminal is closed.

```bash
# Install and start the daemon
tunekit daemon install

# Check status
tunekit daemon status

# Uninstall
tunekit daemon uninstall
```

The sync frequency is configurable from the **Settings** screen (`syncIntervalMinutes`, default: 60 minutes).  
After changing the interval, go to Settings → *Reapply daemon* to apply the change.

---

## What gets downloaded

For each track, TuneKit downloads:

- **Audio** — MP3, best available quality (`-q 0`)
- **Thumbnail** — embedded as cover art in the MP3 file
- **Metadata** — title, artist (uploader), album (playlist name), track number, year

---

## Data

All data is stored under `~/.tunekit/`:

| Path | Contents |
|------|----------|
| `~/.tunekit/tunekit.db` | SQLite database (playlists, tracks, sync history) |
| `~/.tunekit/config.json` | User configuration |
| `~/.tunekit/logs/tunekit.log` | Application logs |
| `~/.tunekit/logs/launchd.log` | Daemon logs |
| `~/.tunekit/tmp/` | Temporary downloads |

---

## Troubleshooting

### Apple Music folder not found

Open Apple Music first, then configure the path manually in TuneKit Settings or edit `~/.tunekit/config.json`:

```json
{
  "musicImportFolder": "/Users/you/Music/Music/Media/Automatically Add to Music"
}
```

### Files don't appear in Apple Music

Apple Music must be **open** to process files dropped into the auto-import folder.

### yt-dlp or ffmpeg not found

```bash
brew install yt-dlp ffmpeg
tunekit init
```

### A playlist is private or has unavailable videos

Unavailable videos are marked `failed` in the database and retried on the next sync. All other videos in the playlist download normally.

---

## Architecture

```
assets/              Logo and static assets
bin/tunekit.ts       Entry point (bun shebang)
src/
  adapters/          yt-dlp wrapper (download, metadata, thumbnails)
  commands/          Headless sub-commands (sync, init, add, daemon)
  db/                SQLite via bun:sqlite (migrations, repositories)
  lib/               Config, logger, lock, Apple Music folder detection, i18n
  locales/           en.ts / fr.ts — translation dictionaries
  services/          Business logic (sync engine, playlist service)
  types/             TypeScript interfaces and enums
  ui/
    screens/         Dashboard, Playlists, Add, Sync, Settings, Daemon, Logs
    components/      Header, Footer, StatusBadge, PlaylistRow
    hooks/           usePlaylists, useSyncProgress
~/.tunekit/          Runtime user data (gitignored)
```
