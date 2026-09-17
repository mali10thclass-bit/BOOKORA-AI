import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Language, type TranslationKey } from "@/lib/i18n";

interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function isRtl(l: Language): boolean {
  return l === "ar" || l === "ur";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("bookora-lang") as Language) || "en";
    }
    return "en";
  });

  // Apply the stored language (and RTL direction for Arabic/Urdu) on
  // mount — previously the <html lang/dir> was only updated after the
  // user changed the language mid-session.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("bookora-lang", l);
  };

  const t = (key: TranslationKey): string => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  };

  const dir: "ltr" | "rtl" = isRtl(lang) ? "rtl" : "ltr";

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
