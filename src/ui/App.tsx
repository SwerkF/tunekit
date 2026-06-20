import { Box, useApp } from "ink";
import { useState, useCallback } from "react";
import { Screen } from "../types/screen.ts";
import { Header } from "./components/Header.tsx";
import { Dashboard } from "./screens/Dashboard.tsx";
import { Playlists } from "./screens/Playlists.tsx";
import { AddPlaylist } from "./screens/AddPlaylist.tsx";
import { SyncProgress } from "./screens/SyncProgress.tsx";
import { Settings } from "./screens/Settings.tsx";
import { Daemon } from "./screens/Daemon.tsx";
import { Logs } from "./screens/Logs.tsx";
import { LanguageSetup } from "./screens/LanguageSetup.tsx";
import { runInit } from "../commands/init.ts";
import { existsSync } from "fs";
import { DB_PATH } from "../lib/paths.ts";
import { useEffect } from "react";
import { loadConfig, setConfigValue } from "../lib/config.ts";
import { I18nProvider } from "../lib/i18n.tsx";
import type { Locale } from "../types/i18n.ts";

export function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>(Screen.Dashboard);
  const [syncPlaylistId, setSyncPlaylistId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale | null>(() => {
    const cfg = loadConfig();
    return cfg.language ?? null;
  });

  // Auto-init on first launch
  useEffect(() => {
    if (!existsSync(DB_PATH)) {
      runInit(true).catch(console.error);
    }
  }, []);

  const handleLanguageSelect = useCallback((chosen: Locale) => {
    setConfigValue("language", chosen);
    setLocale(chosen);
  }, []);

  const navigate = useCallback(
    (s: Screen) => {
      if (s === Screen.Dashboard && screen === Screen.Dashboard) {
        exit();
        return;
      }
      setScreen(s);
    },
    [screen, exit]
  );

  const handleSync = useCallback((id: string) => {
    setSyncPlaylistId(id);
    setScreen(Screen.Sync);
  }, []);

  const handleSyncAll = useCallback(() => {
    setSyncPlaylistId(null);
    setScreen(Screen.Sync);
  }, []);

  // First launch: no language selected yet — show bilingual picker (no header)
  if (!locale) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <LanguageSetup onSelect={handleLanguageSelect} />
      </Box>
    );
  }

  return (
    <I18nProvider locale={locale}>
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        <Header screen={screen} />
        {screen === Screen.Dashboard && (
          <Dashboard
            navigate={(s) => {
              if (s === Screen.Sync) handleSyncAll();
              else navigate(s);
            }}
          />
        )}
        {screen === Screen.Playlists && (
          <Playlists navigate={navigate} onSync={handleSync} />
        )}
        {screen === Screen.Add && <AddPlaylist navigate={navigate} />}
        {screen === Screen.Sync && (
          <SyncProgress navigate={navigate} playlistId={syncPlaylistId} />
        )}
        {screen === Screen.Settings && (
          <Settings navigate={navigate} onLocaleChange={setLocale} />
        )}
        {screen === Screen.Daemon && <Daemon navigate={navigate} />}
        {screen === Screen.Logs && <Logs navigate={navigate} />}
        {screen === Screen.LanguageSetup && (
          <LanguageSetup onSelect={handleLanguageSelect} />
        )}
      </Box>
    </I18nProvider>
  );
}
