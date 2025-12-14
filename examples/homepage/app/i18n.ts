export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  categories: Record<string, string>;
}

export const languages: Record<string, LanguageConfig> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    categories: {
      navigation: "Navigation",
      features: "Features",
    },
  },
  ko: {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    categories: {
      navigation: "탐색",
      features: "기능",
    },
  },
};

export const defaultLang = "en";

export const additionalLangs = Object.keys(languages).filter((l) =>
  l !== defaultLang
);

export function detectLang(key: string): string {
  for (const lang of additionalLangs) {
    if (key.startsWith(`${lang}/`)) {
      return lang;
    }
  }
  return defaultLang;
}

export function stripLangPrefix(key: string): string {
  const lang = detectLang(key);
  if (lang === defaultLang) return key;
  return key.replace(new RegExp(`^${lang}/`), "");
}

export function addLangPrefix(key: string, lang: string): string {
  if (lang === defaultLang) return key;
  return `${lang}/${key}`;
}

export function getLangConfig(key: string): LanguageConfig {
  return languages[detectLang(key)] ?? languages[defaultLang];
}

export function isLang(key: string, lang: string): boolean {
  return detectLang(key) === lang;
}
