import { Box, Text } from "ink";

interface FooterProps {
  hints?: Array<{ key: string; label: string }>;
}

const DEFAULT_HINTS = [
  { key: "↑↓", label: "naviguer" },
  { key: "↵", label: "sélectionner" },
  { key: "ESC", label: "retour" },
  { key: "q", label: "quitter" },
];

export function Footer({ hints = DEFAULT_HINTS }: FooterProps) {
  return (
    <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
      <Text dimColor>
        {hints.map((h, i) => (
          <Text key={h.key}>
            {i > 0 ? <Text dimColor>  </Text> : null}
            <Text color="white" bold>
              {h.key}
            </Text>
            <Text dimColor> {h.label}</Text>
          </Text>
        ))}
      </Text>
    </Box>
  );
}
