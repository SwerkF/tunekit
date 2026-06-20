import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { useCallback } from "react";
import type { Locale } from "../../types/i18n.ts";

interface LanguageSetupProps {
  onSelect: (locale: Locale) => void;
}

const LANGUAGE_ITEMS = [
  { label: "English", value: "en" as Locale },
  { label: "Français", value: "fr" as Locale },
];

export function LanguageSetup({ onSelect }: LanguageSetupProps) {
  const handleSelect = useCallback(
    (item: { value: Locale }) => onSelect(item.value),
    [onSelect]
  );

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          Welcome to TuneKit · Bienvenue dans TuneKit
        </Text>
        <Text dimColor>
          Choose your language · Choisissez votre langue
        </Text>
      </Box>

      <SelectInput items={LANGUAGE_ITEMS} onSelect={handleSelect} />
    </Box>
  );
}
