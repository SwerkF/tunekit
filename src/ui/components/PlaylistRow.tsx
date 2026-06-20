import { Box, Text } from "ink";
import type { Playlist, PlaylistStats } from "../../types/models.ts";

interface PlaylistRowProps {
  playlist: Playlist;
  stats: PlaylistStats;
  isSelected?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "jamais";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD}j`;
}

export function PlaylistRow({ playlist, stats, isSelected = false }: PlaylistRowProps) {
  return (
    <Box flexDirection="column" paddingLeft={isSelected ? 0 : 2}>
      <Box>
        {isSelected && <Text color="cyan" bold>▶ </Text>}
        <Text bold={isSelected} color={isSelected ? "cyan" : "white"}>
          {playlist.title}
        </Text>
      </Box>
      <Box paddingLeft={isSelected ? 2 : 0}>
        <Text dimColor>
          {stats.downloaded}/{stats.total} morceaux
        </Text>
        {stats.failed > 0 && (
          <Text color="red">  {stats.failed} erreur(s)</Text>
        )}
        <Text dimColor>  sync : {formatDate(playlist.lastSyncedAt)}</Text>
      </Box>
    </Box>
  );
}
