import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { en, type MessageKey } from './en';
import { ru } from './ru';

export type Locale = 'en' | 'ru';

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  en: en as Record<MessageKey, string>,
  ru,
};

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const dict = dictionaries[locale] ?? dictionaries.en;
  const template = dict[key] ?? dictionaries.en[key] ?? key;
  return interpolate(template, vars);
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => {
        document.documentElement.lang = locale;
        set({ locale });
      },
    }),
    {
      name: 'logo-platform-locale',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state?.locale) {
          document.documentElement.lang = state.locale;
        }
      },
    },
  ),
);

/** Subscribes to locale so UI re-renders on language change. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return (key: MessageKey, vars?: Vars) => translate(locale, key, vars);
}

export function useLocale() {
  return useLocaleStore((s) => s.locale);
}

export type { MessageKey };
