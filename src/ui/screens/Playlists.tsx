import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { useCallback, useState } from "react";
import { Screen } from "../../types/screen.ts";
import { Footer } from "../components/Footer.tsx";
import { PlaylistRow } from "../components/PlaylistRow.tsx";
import { usePlaylists } from "../hooks/usePlaylists.ts";
import { useT } from "../../lib/i18n.tsx";

interface PlaylistsProps {
  navigate: (screen: Screen) => void;
  onSync: (playlistId: string) => void;
}

type ViewMode = "list" | "detail";

export function Playlists({ navigate, onSync }: PlaylistsProps) {
  const t = useT();
  const { items, remove, refresh } = usePlaylists();
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useInput((input, key) => {
    if (key.escape) {
      if (confirmDelete) {
        setConfirmDelete(false);
      } else if (mode === "detail") {
        setMode("list");
        setSelectedId(null);
      } else {
        navigate(Screen.Dashboard);
      }
    }
    if (input === "q" && mode === "list") navigate(Screen.Dashboard);
  });

  const listItems = items.map(({ playlist, stats }) => ({
    label: `${playlist.title} (${stats.downloaded}/${stats.total})`,
    value: playlist.id,
    key: playlist.id,
  }));

  const handleSelect = useCallback((item: { value: string }) => {
    setSelectedId(item.value);
    setMode("detail");
  }, []);

  if (items.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>{t("playlistsEmpty")}</Text>
        <Text dimColor>
          {t("playlistsEmptyPress")} <Text>ESC</Text>{" "}
          {t("playlistsEmptyHint")}
        </Text>
        <Footer hints={[{ key: "ESC", label: t("footerBack") }]} />
      </Box>
    );
  }

  if (mode === "detail" && selectedId) {
    const entry = items.find((i) => i.playlist.id === selectedId);
    if (!entry) return null;

    const detailItems = [
      { label: t("playlistsSync"), value: "sync" },
      { label: t("playlistsDelete"), value: "delete" },
      { label: t("playlistsBackToList"), value: "back" },
    ];

    const handleDetailSelect = (item: { value: string }) => {
      switch (item.value) {
        case "sync":
          onSync(entry.playlist.id);
          break;
        case "delete":
          setConfirmDelete(true);
          break;
        case "back":
          setMode("list");
          setSelectedId(null);
          break;
      }
    };

    if (confirmDelete) {
      const confirmItems = [
        { label: t("playlistsConfirmYes"), value: "yes" },
        { label: t("playlistsConfirmNo"), value: "no" },
      ];
      const handleConfirm = (item: { value: string }) => {
        if (item.value === "yes") {
          remove(entry.playlist.id);
          refresh();
          setMode("list");
          setSelectedId(null);
          setConfirmDelete(false);
        } else {
          setConfirmDelete(false);
        }
      };

      return (
        <Box flexDirection="column" paddingX={1}>
          <Text color="red" bold>
            {t("playlistsConfirmTitle", { name: entry.playlist.title })}
          </Text>
          <Text dimColor>{t("playlistsConfirmNote")}</Text>
          <Box marginTop={1}>
            <SelectInput items={confirmItems} onSelect={handleConfirm} />
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        <PlaylistRow playlist={entry.playlist} stats={entry.stats} isSelected />
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>{t("playlistsUrl")} {entry.playlist.url}</Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput items={detailItems} onSelect={handleDetailSelect} />
        </Box>
        <Footer hints={[{ key: "ESC", label: t("footerBack") }]} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SelectInput items={listItems} onSelect={handleSelect} />
      <Footer
        hints={[
          { key: "↑↓", label: t("footerNavigate") },
          { key: "↵", label: t("footerDetails") },
          { key: "ESC", label: t("footerBack") },
        ]}
      />
    </Box>
  );
}
