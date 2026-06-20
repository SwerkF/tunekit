import { Box, Text } from "ink";
import { Screen } from "../../types/screen.ts";
import { useT } from "../../lib/i18n.tsx";
import type { Translations } from "../../types/i18n.ts";

const SCREEN_LABEL_KEYS: Record<Screen, keyof Translations> = {
  [Screen.Dashboard]: "screenDashboard",
  [Screen.Playlists]: "screenPlaylists",
  [Screen.Add]: "screenAdd",
  [Screen.Sync]: "screenSync",
  [Screen.Settings]: "screenSettings",
  [Screen.Daemon]: "screenDaemon",
  [Screen.Logs]: "screenLogs",
  [Screen.LanguageSetup]: "screenLanguageSetup",
};

interface HeaderProps {
  screen: Screen;
}

export function Header({ screen }: HeaderProps) {
  const t = useT();
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
      <Text bold color="cyan">
        TuneKit
      </Text>
      <Text color="gray"> › </Text>
      <Text bold color="yellow">
        {t(SCREEN_LABEL_KEYS[screen])}
      </Text>
    </Box>
  );
}
