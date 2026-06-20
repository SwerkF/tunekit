import React, { createContext, useContext } from "react";
import type { Locale, Translations } from "../types/i18n.ts";
import { en } from "../locales/en.ts";
import { fr } from "../locales/fr.ts";

const dictionaries: Record<Locale, Translations> = { en, fr };

type TFn = (key: keyof Translations, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  t: TFn;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (key) => String(key),
});

export function useT(): TFn {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

function makeTFn(locale: Locale): TFn {
  const dict = dictionaries[locale];
  const fallback = dictionaries.en;
  return (key, vars) => {
    let str = dict[key] ?? fallback[key] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

interface I18nProviderProps {
  locale: Locale;
  children: React.ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const t = makeTFn(locale);
  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
