import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { useState, useEffect, useCallback } from "react";
import { Screen } from "../../types/screen.ts";
import { Footer } from "../components/Footer.tsx";
import {
  installDaemon,
  uninstallDaemon,
  getDaemonStatus,
} from "../../commands/daemon.ts";
import { loadConfig } from "../../lib/config.ts";
import { PLIST_PATH } from "../../lib/paths.ts";
import { useT } from "../../lib/i18n.tsx";

interface DaemonProps {
  navigate: (screen: Screen) => void;
}

type DaemonAction = "idle" | "installing" | "uninstalling";

interface DaemonStatusInfo {
  installed: boolean;
  running: boolean;
  pid: number | null;
  lastExitStatus: number | null;
}

export function Daemon({ navigate }: DaemonProps) {
  const t = useT();
  const [status, setStatus] = useState<DaemonStatusInfo | null>(null);
  const [action, setAction] = useState<DaemonAction>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const config = loadConfig();

  const refreshStatus = useCallback(async () => {
    const s = await getDaemonStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, []);

  useInput((input, key) => {
    if (action === "idle" && (key.escape || input === "q")) {
      navigate(Screen.Dashboard);
    }
  });

  const handleInstall = useCallback(async () => {
    setAction("installing");
    setFeedback(null);
    try {
      await installDaemon(true);
      await refreshStatus();
      setFeedback(t("daemonInstalledMsg"));
    } catch (err) {
      setFeedback(
        `${t("errorLabel")} : ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setAction("idle");
    }
  }, [refreshStatus, t]);

  const handleUninstall = useCallback(async () => {
    setAction("uninstalling");
    setFeedback(null);
    try {
      await uninstallDaemon(true);
      await refreshStatus();
      setFeedback(t("daemonUninstalledMsg"));
    } catch (err) {
      setFeedback(
        `${t("errorLabel")} : ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setAction("idle");
    }
  }, [refreshStatus, t]);

  const menuItems = status?.installed
    ? [
        { label: t("daemonReinstall"), value: "install" },
        { label: t("daemonUninstall"), value: "uninstall" },
        { label: t("daemonRefresh"), value: "refresh" },
        { label: t("daemonBack"), value: "back" },
      ]
    : [
        { label: t("daemonInstall"), value: "install" },
        { label: t("daemonRefresh"), value: "refresh" },
        { label: t("daemonBack"), value: "back" },
      ];

  const handleSelect = useCallback(
    (item: { value: string }) => {
      switch (item.value) {
        case "install":
          handleInstall();
          break;
        case "uninstall":
          handleUninstall();
          break;
        case "refresh":
          refreshStatus();
          break;
        case "back":
          navigate(Screen.Dashboard);
          break;
      }
    },
    [handleInstall, handleUninstall, refreshStatus, navigate]
  );

  if (action !== "idle") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text>
            {" "}
            {action === "installing"
              ? t("daemonInstalling")
              : t("daemonUninstalling")}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        flexDirection="column"
        marginBottom={1}
        borderStyle="round"
        borderColor={status?.running ? "green" : "gray"}
        paddingX={1}
      >
        <Box gap={2}>
          <Text dimColor>{t("daemonStatus")}</Text>
          {status === null ? (
            <Text color="cyan">{t("daemonLoading")}</Text>
          ) : status.running ? (
            <Text color="green" bold>
              {t("daemonActive", { pid: status.pid ?? 0 })}
            </Text>
          ) : status.installed ? (
            <Text color="yellow">{t("daemonInstalledInactive")}</Text>
          ) : (
            <Text color="gray">{t("daemonNotInstalled")}</Text>
          )}
        </Box>
        <Text dimColor>
          {t("daemonInterval")}{" "}
          <Text color="white">{config.syncIntervalMinutes} min</Text>
        </Text>
        {status?.lastExitStatus !== null &&
          status?.lastExitStatus !== undefined && (
            <Text dimColor>
              {t("daemonLastExit")}{" "}
              <Text color={status.lastExitStatus === 0 ? "green" : "red"}>
                {status.lastExitStatus}
              </Text>
            </Text>
          )}
        <Text dimColor>
          {t("daemonPlist")} <Text color="white">{PLIST_PATH}</Text>
        </Text>
      </Box>

      {feedback && (
        <Box marginBottom={1}>
          <Text color={feedback.startsWith(t("errorLabel")) ? "red" : "green"}>
            {feedback}
          </Text>
        </Box>
      )}

      <SelectInput items={menuItems} onSelect={handleSelect} />
      <Footer hints={[{ key: "ESC", label: t("footerBack") }]} />
    </Box>
  );
}
