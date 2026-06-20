import { Box, Text, useInput } from "ink";
import { useState, useEffect, useCallback } from "react";
import { existsSync, readFileSync, statSync } from "fs";
import { Screen } from "../../types/screen.ts";
import { Footer } from "../components/Footer.tsx";
import { LOG_FILE } from "../../lib/paths.ts";
import { useT } from "../../lib/i18n.tsx";

interface LogsProps {
  navigate: (screen: Screen) => void;
}

interface ParsedLine {
  raw: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "OTHER";
  timestamp: string;
  message: string;
}

function parseLine(raw: string): ParsedLine {
  const match = raw.match(/^\[(.+?)\] \[(INFO|WARN|ERROR|DEBUG)\] (.*)$/);
  if (match) {
    return {
      raw,
      level: match[2] as ParsedLine["level"],
      timestamp: match[1].replace("T", " ").replace(/\.\d+Z$/, ""),
      message: match[3],
    };
  }
  return { raw, level: "OTHER", timestamp: "", message: raw };
}

function levelColor(level: ParsedLine["level"]): string {
  switch (level) {
    case "ERROR": return "red";
    case "WARN":  return "yellow";
    case "INFO":  return "green";
    case "DEBUG": return "gray";
    case "OTHER": return "white";
    default: {
      const _exhaustive: never = level;
      void _exhaustive;
      return "white";
    }
  }
}

const PAGE_SIZE = 20;

export function Logs({ navigate }: LogsProps) {
  const t = useT();
  const [lines, setLines] = useState<ParsedLine[]>([]);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "ERROR" | "WARN">("ALL");
  const [lastMtime, setLastMtime] = useState(0);

  const loadLogs = useCallback(() => {
    if (!existsSync(LOG_FILE)) {
      setLines([]);
      return;
    }
    try {
      const mtime = statSync(LOG_FILE).mtimeMs;
      if (mtime === lastMtime) return;
      setLastMtime(mtime);

      const raw = readFileSync(LOG_FILE, "utf-8");
      const parsed = raw
        .split("\n")
        .filter(Boolean)
        .map(parseLine)
        .reverse();
      setLines(parsed);
      setOffset(0);
    } catch { /* ignore */ }
  }, [lastMtime]);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const filtered =
    filter === "ALL" ? lines : lines.filter((l) => l.level === filter);

  useInput((input, key) => {
    if (key.escape || input === "q") {
      navigate(Screen.Dashboard);
      return;
    }
    if (input === "r") {
      setLastMtime(0);
      loadLogs();
      return;
    }
    if (input === "e") {
      setFilter((f) => (f === "ERROR" ? "ALL" : "ERROR"));
      setOffset(0);
      return;
    }
    if (input === "w") {
      setFilter((f) => (f === "WARN" ? "ALL" : "WARN"));
      setOffset(0);
      return;
    }
    if (key.downArrow || input === "j") {
      setOffset((o) =>
        Math.min(o + 1, Math.max(0, filtered.length - PAGE_SIZE))
      );
    }
    if (key.upArrow || input === "k") {
      setOffset((o) => Math.max(0, o - 1));
    }
  });

  const page = filtered.slice(offset, offset + PAGE_SIZE);
  const total = filtered.length;

  if (!existsSync(LOG_FILE)) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>{t("logsNoFile")}</Text>
        <Text dimColor>{t("logsNoFileHint")}</Text>
        <Footer hints={[{ key: "ESC", label: t("footerBack") }]} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box paddingX={1} gap={2} marginBottom={0}>
        <Text dimColor>
          {t("logsFilterLabel")}{" "}
          <Text color={filter === "ALL" ? "cyan" : "white"} bold={filter === "ALL"}>
            {t("logsFilterAll")}
          </Text>
        </Text>
        <Text dimColor>
          <Text color={filter === "ERROR" ? "red" : "white"} bold={filter === "ERROR"}>
            {t("logsFilterErrors")}
          </Text>
          <Text dimColor> (e)</Text>
        </Text>
        <Text dimColor>
          <Text color={filter === "WARN" ? "yellow" : "white"} bold={filter === "WARN"}>
            {t("logsFilterWarnings")}
          </Text>
          <Text dimColor> (w)</Text>
        </Text>
        <Text dimColor>
          {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}/{total}
        </Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {page.length === 0 ? (
          <Text dimColor>
            {t("logsNoEntries")}
            {filter !== "ALL" ? t("logsNoEntriesLevel", { level: filter }) : ""}
            .
          </Text>
        ) : (
          page.map((line, i) => (
            <Box key={i} gap={1}>
              <Text dimColor>{line.timestamp}</Text>
              <Text color={levelColor(line.level)} bold={line.level === "ERROR"}>
                [{line.level}]
              </Text>
              <Text
                color={
                  line.level === "ERROR"
                    ? "red"
                    : line.level === "WARN"
                    ? "yellow"
                    : "white"
                }
                wrap="truncate"
              >
                {line.message}
              </Text>
            </Box>
          ))
        )}
      </Box>

      <Footer
        hints={[
          { key: "↑↓ / jk", label: t("footerScroll") },
          { key: "e", label: t("footerFilterErrors") },
          { key: "w", label: t("footerFilterWarnings") },
          { key: "r", label: t("footerRefresh") },
          { key: "ESC", label: t("footerBack") },
        ]}
      />
    </Box>
  );
}
