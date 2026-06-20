import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useState, useCallback } from "react";
import { Screen } from "../../types/screen.ts";
import { Footer } from "../components/Footer.tsx";
import { loadConfig, setConfigValue } from "../../lib/config.ts";
import { installDaemon } from "../../commands/daemon.ts";
import { useT } from "../../lib/i18n.tsx";
import type { Locale } from "../../types/i18n.ts";

interface SettingsProps {
  navigate: (screen: Screen) => void;
  onLocaleChange: (locale: Locale) => void;
}

type EditMode = "menu" | "interval" | "folder" | "saving";

const LOCALE_OPTIONS: Array<{ label: string; value: Locale }> = [
  { label: "English", value: "en" },
  { label: "Français", value: "fr" },
];

export function Settings({ navigate, onLocaleChange }: SettingsProps) {
  const t = useT();
  const config = loadConfig();
  const [mode, setMode] = useState<EditMode>("menu");
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pickingLang, setPickingLang] = useState(false);

  useInput((input, key) => {
    if (mode === "menu" && !pickingLang) {
      if (key.escape || input === "q") navigate(Screen.Dashboard);
    }
    if ((mode === "interval" || mode === "folder") && key.escape) {
      setMode("menu");
      setValue("");
    }
    if (pickingLang && key.escape) {
      setPickingLang(false);
    }
  });

  const menuItems = [
    {
      label: t("settingsIntervalLabel", { n: config.syncIntervalMinutes }),
      value: "interval",
    },
    {
      label: t("settingsFolderLabel", {
        path: config.musicImportFolder ?? t("settingsFolderAuto"),
      }),
      value: "folder",
    },
    { label: t("settingsReapplyDaemon"), value: "daemon" },
    {
      label: t("settingsLanguageLabel", {
        lang: config.language === "en" ? "English" : "Français",
      }),
      value: "language",
    },
    { label: t("settingsBack"), value: "back" },
  ];

  const handleMenuSelect = useCallback(
    (item: { value: string }) => {
      switch (item.value) {
        case "interval":
          setValue(String(config.syncIntervalMinutes));
          setMode("interval");
          break;
        case "folder":
          setValue(config.musicImportFolder ?? "");
          setMode("folder");
          break;
        case "daemon":
          setMode("saving");
          installDaemon(true)
            .then(() => {
              setFeedback(t("settingsDaemonUpdated"));
              setMode("menu");
            })
            .catch((err) => {
              setFeedback(
                `${t("errorLabel")} : ${err instanceof Error ? err.message : String(err)}`
              );
              setMode("menu");
            });
          break;
        case "language":
          setPickingLang(true);
          break;
        case "back":
          navigate(Screen.Dashboard);
          break;
      }
    },
    [config, navigate, t]
  );

  const handleIntervalSubmit = useCallback(
    (val: string) => {
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 1) {
        setFeedback(t("settingsIntervalInvalid"));
      } else {
        setConfigValue("syncIntervalMinutes", n);
        setFeedback(t("settingsIntervalUpdated", { n }));
      }
      setMode("menu");
      setValue("");
    },
    [t]
  );

  const handleFolderSubmit = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      setConfigValue("musicImportFolder", trimmed || null);
      setFeedback(
        trimmed
          ? t("settingsFolderUpdated", { path: trimmed })
          : t("settingsFolderReset")
      );
      setMode("menu");
      setValue("");
    },
    [t]
  );

  const handleLangSelect = useCallback(
    (item: { value: Locale }) => {
      setConfigValue("language", item.value);
      onLocaleChange(item.value);
      setPickingLang(false);
    },
    [onLocaleChange]
  );

  if (mode === "saving") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="cyan">{t("settingsUpdatingDaemon")}</Text>
      </Box>
    );
  }

  if (mode === "interval") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold>{t("settingsIntervalTitle")}</Text>
        <Box marginTop={1}>
          <Text color="cyan">{t("settingsIntervalField")} </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleIntervalSubmit}
            placeholder="60"
          />
        </Box>
        <Footer
          hints={[
            { key: "↵", label: t("footerConfirm") },
            { key: "ESC", label: t("footerCancel") },
          ]}
        />
      </Box>
    );
  }

  if (mode === "folder") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold>{t("settingsFolderTitle")}</Text>
        <Text dimColor>{t("settingsFolderHint")}</Text>
        <Box marginTop={1}>
          <Text color="cyan">{t("settingsFolderField")} </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleFolderSubmit}
            placeholder="~/Music/Music/Media/Automatically Add to Music"
          />
        </Box>
        <Footer
          hints={[
            { key: "↵", label: t("footerConfirm") },
            { key: "ESC", label: t("footerCancel") },
          ]}
        />
      </Box>
    );
  }

  if (pickingLang) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold>{t("langSetupSubtitle")}</Text>
        <Box marginTop={1}>
          <SelectInput items={LOCALE_OPTIONS} onSelect={handleLangSelect} />
        </Box>
        <Footer hints={[{ key: "ESC", label: t("footerCancel") }]} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {feedback && (
        <Box marginBottom={1}>
          <Text color="green">{feedback}</Text>
        </Box>
      )}
      <SelectInput items={menuItems} onSelect={handleMenuSelect} />
      <Footer hints={[{ key: "ESC", label: t("footerBack") }]} />
    </Box>
  );
}
