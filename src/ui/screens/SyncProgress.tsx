import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { useEffect } from "react";
import { Screen } from "../../types/screen.ts";
import { Footer } from "../components/Footer.tsx";
import { useSyncProgress } from "../hooks/useSyncProgress.ts";
import { useT } from "../../lib/i18n.tsx";

interface SyncProgressProps {
  navigate: (screen: Screen) => void;
  playlistId: string | null;
}

const MAX_FAILURES_SHOWN = 8;

export function SyncProgress({ navigate, playlistId }: SyncProgressProps) {
  const t = useT();
  const { state, startSync, reset } = useSyncProgress();

  useEffect(() => {
    startSync(playlistId ? [playlistId] : undefined);
    return () => { reset(); };
  }, []);

  useInput((input, key) => {
    if (state.isComplete || state.errorMessage) {
      if (key.return || input === "q" || key.escape) {
        reset();
        navigate(Screen.Dashboard);
      }
      if (input === "l") {
        reset();
        navigate(Screen.Logs);
      }
    }
  });

  if (state.errorMessage) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="red" bold>✗ {t("errorLabel")}</Text>
        <Text color="red">{state.errorMessage}</Text>
        <Footer hints={[{ key: "↵ / ESC", label: t("footerBack") }]} />
      </Box>
    );
  }

  if (state.isComplete) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box gap={2}>
          <Text color="green" bold>{t("syncDone")}</Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text color="green" bold>{state.tracksAdded}</Text>
            <Text dimColor> {t("syncAdded")}</Text>
          </Text>
          {state.tracksFailed > 0 && (
            <Text>
              <Text color="red" bold>{state.tracksFailed}</Text>
              <Text dimColor> {t("syncFailed")}</Text>
            </Text>
          )}
        </Box>

        {state.failures.length > 0 && (
          <Box
            flexDirection="column"
            marginTop={1}
            borderStyle="round"
            borderColor="red"
            paddingX={1}
          >
            <Text color="red" bold>{t("syncFailedTitle")}</Text>
            {state.failures.slice(0, MAX_FAILURES_SHOWN).map((f, i) => (
              <Box key={i} flexDirection="column" marginTop={0}>
                <Text>
                  <Text color="red">✗ </Text>
                  <Text bold>{f.trackTitle}</Text>
                </Text>
                <Text dimColor>  {f.message}</Text>
              </Box>
            ))}
            {state.failures.length > MAX_FAILURES_SHOWN && (
              <Text dimColor>
                {t("syncMoreFailures", {
                  n: state.failures.length - MAX_FAILURES_SHOWN,
                })}
              </Text>
            )}
          </Box>
        )}

        <Footer
          hints={[
            { key: "↵ / ESC", label: t("footerBack") },
            { key: "l", label: t("footerViewLogs") },
          ]}
        />
      </Box>
    );
  }

  const progressPercent =
    state.totalTracks > 0
      ? Math.round((state.trackIndex / state.totalTracks) * 100)
      : 0;

  const barWidth = 28;
  const filled = Math.round((barWidth * progressPercent) / 100);
  const progressBar =
    "[" + "█".repeat(filled) + "░".repeat(barWidth - filled) + "]";

  return (
    <Box flexDirection="column" paddingX={1}>
      {state.currentPlaylistTitle && (
        <Box marginBottom={1}>
          <Text dimColor>{t("syncPlaylistLabel")} </Text>
          <Text bold>{state.currentPlaylistTitle}</Text>
        </Box>
      )}

      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text>
          {" "}
          {state.currentTrack
            ? t("syncDownloading", { title: state.currentTrack })
            : t("syncPreparing")}
        </Text>
      </Box>

      {state.totalTracks > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Box gap={1}>
            <Text color="cyan">{progressBar}</Text>
            <Text bold>{progressPercent}%</Text>
          </Box>
          <Text dimColor>
            {t("syncTracksProcessed", {
              index: state.trackIndex,
              total: state.totalTracks,
            })}
          </Text>
        </Box>
      )}

      <Box marginTop={1} gap={3}>
        <Text>
          <Text color="green" bold>{state.tracksAdded}</Text>
          <Text dimColor> {t("syncAdding")}</Text>
        </Text>
        {state.tracksFailed > 0 && (
          <Text>
            <Text color="red" bold>{state.tracksFailed}</Text>
            <Text dimColor> {t("syncErrors")}</Text>
          </Text>
        )}
      </Box>

      {state.failures.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>{t("syncLastErrors")}</Text>
          {state.failures.slice(-3).map((f, i) => (
            <Text key={i} color="red" dimColor>
              ✗ {f.trackTitle}: {f.message}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
