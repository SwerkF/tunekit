import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState, useCallback } from "react";
import Spinner from "ink-spinner";
import { Screen } from "../../types/screen.ts";
import { Footer } from "../components/Footer.tsx";
import { usePlaylists } from "../hooks/usePlaylists.ts";
import { useT } from "../../lib/i18n.tsx";

interface AddPlaylistProps {
  navigate: (screen: Screen) => void;
}

type AddState = "input" | "loading" | "success" | "error";

export function AddPlaylist({ navigate }: AddPlaylistProps) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [addState, setAddState] = useState<AddState>("input");
  const [message, setMessage] = useState("");
  const { add } = usePlaylists();

  useInput((input, key) => {
    if (key.escape || input === "q") {
      if (addState === "input") navigate(Screen.Dashboard);
    }
    if (addState === "success" && key.return) {
      navigate(Screen.Playlists);
    }
    if (addState === "error" && (key.return || key.escape)) {
      setAddState("input");
      setMessage("");
    }
  });

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (
        !trimmed.includes("youtube.com/playlist") &&
        !trimmed.includes("youtu.be/") &&
        !trimmed.includes("youtube.com/watch")
      ) {
        setMessage(t("addInvalidUrl"));
        setAddState("error");
        return;
      }

      setAddState("loading");
      setMessage("");

      try {
        await add(trimmed);
        setAddState("success");
        setMessage(t("addSuccess"));
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err));
        setAddState("error");
      }
    },
    [add, t]
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {addState === "input" && (
        <>
          <Box marginBottom={1}>
            <Text dimColor>{t("addInstructions")} </Text>
            <Text bold>{t("addEnterKey")}</Text>
          </Box>
          <Box>
            <Text color="cyan" bold>
              {t("addUrlLabel")}{" "}
            </Text>
            <TextInput
              value={url}
              onChange={setUrl}
              onSubmit={handleSubmit}
              placeholder="https://youtube.com/playlist?list=..."
            />
          </Box>
          <Footer
            hints={[
              { key: "↵", label: t("footerConfirm") },
              { key: "ESC", label: t("footerCancel") },
            ]}
          />
        </>
      )}

      {addState === "loading" && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> {t("addLoading")}</Text>
        </Box>
      )}

      {addState === "success" && (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ {message}
          </Text>
          <Text dimColor>{t("addSuccessHint")}</Text>
        </Box>
      )}

      {addState === "error" && (
        <Box flexDirection="column">
          <Text color="red" bold>
            {t("addErrorTitle")}
          </Text>
          <Text color="red">{message}</Text>
          <Text dimColor>{t("addErrorHint")}</Text>
        </Box>
      )}
    </Box>
  );
}
