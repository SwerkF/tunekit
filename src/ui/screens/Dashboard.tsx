import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { useCallback, useState, useEffect } from "react";
import { Screen } from "../../types/screen.ts";
import { Footer } from "../components/Footer.tsx";
import { usePlaylists } from "../hooks/usePlaylists.ts";
import { findLastSyncRun } from "../../db/repositories/sync-run-repository.ts";
import { getDaemonStatus } from "../../commands/daemon.ts";
import { useT } from "../../lib/i18n.tsx";

interface DashboardProps {
  navigate: (screen: Screen) => void;
}

interface MenuItem {
  label: string;
  value: Screen;
}

export function Dashboard({ navigate }: DashboardProps) {
  const t = useT();
  const { items } = usePlaylists();
  const [daemonRunning, setDaemonRunning] = useState(false);
  const lastSync = findLastSyncRun();

  useEffect(() => {
    getDaemonStatus().then(({ running }) => setDaemonRunning(running));
  }, []);

  const totalTracks = items.reduce((acc, { stats }) => acc + stats.total, 0);
  const downloadedTracks = items.reduce(
    (acc, { stats }) => acc + stats.downloaded,
    0
  );
  const failedTracks = items.reduce((acc, { stats }) => acc + stats.failed, 0);

  function formatDate(iso: string | null): string {
    if (!iso) return t("dashTimeNever");
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return t("dashTimeJustNow");
    if (diffMin < 60) return t("dashTimeMinutesAgo", { n: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t("dashTimeHoursAgo", { n: diffH });
    const diffD = Math.floor(diffH / 24);
    return t("dashTimeDaysAgo", { n: diffD });
  }

  const menuItems: MenuItem[] = [
    { label: t("dashMenuPlaylists"), value: Screen.Playlists },
    { label: t("dashMenuAdd"), value: Screen.Add },
    { label: t("dashMenuSync"), value: Screen.Sync },
    { label: t("dashMenuSettings"), value: Screen.Settings },
    { label: t("dashMenuDaemon"), value: Screen.Daemon },
    { label: t("dashMenuLogs"), value: Screen.Logs },
  ];

  const handleSelect = useCallback(
    (item: MenuItem) => navigate(item.value),
    [navigate]
  );

  useInput((input) => {
    if (input === "q") process.exit(0);
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1} paddingX={1}>
        <Box gap={2}>
          <Text>
            <Text bold color="cyan">{items.length}</Text>
            <Text dimColor> {t("dashPlaylists")}</Text>
          </Text>
          <Text dimColor>·</Text>
          <Text>
            <Text bold color="green">{downloadedTracks}</Text>
            <Text dimColor>{t("dashTracks", { total: totalTracks })}</Text>
          </Text>
          {failedTracks > 0 && (
            <>
              <Text dimColor>·</Text>
              <Text>
                <Text bold color="red">{failedTracks}</Text>
                <Text dimColor> {t("dashErrors")}</Text>
              </Text>
            </>
          )}
        </Box>

        <Box gap={2} marginTop={0}>
          <Text dimColor>
            {t("dashLastSync")}{" "}
            <Text color="white">{formatDate(lastSync?.finishedAt ?? null)}</Text>
          </Text>
          <Text dimColor>·</Text>
          <Text dimColor>
            {t("dashDaemon")}{" "}
            {daemonRunning ? (
              <Text color="green">{t("dashDaemonActive")}</Text>
            ) : (
              <Text color="yellow">{t("dashDaemonInactive")}</Text>
            )}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <SelectInput items={menuItems} onSelect={handleSelect} />
      </Box>

      <Footer
        hints={[
          { key: "↑↓", label: t("footerNavigate") },
          { key: "↵", label: t("footerOpen") },
          { key: "q", label: t("footerQuit") },
        ]}
      />
    </Box>
  );
}
