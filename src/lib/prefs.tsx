import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type TextSize = "s" | "m" | "l" | "xl";
export type Theme = "system" | "light" | "dark";

export interface Prefs {
  textSize: TextSize;
  theme: Theme;
  simplified: boolean;
}

const DEFAULTS: Prefs = { textSize: "m", theme: "system", simplified: false };
const STORAGE_KEY = "sidekick-prefs";
const FONT_SIZES: Record<TextSize, string> = {
  s: "15px",
  m: "16px",
  l: "18px",
  xl: "20px",
};

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

const PrefsContext = createContext<{
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}>({ prefs: DEFAULTS, setPref: () => {} });

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    document.documentElement.style.fontSize = FONT_SIZES[prefs.textSize];

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const dark =
        prefs.theme === "dark" ||
        (prefs.theme === "system" && systemDark.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    applyTheme();
    systemDark.addEventListener("change", applyTheme);
    return () => systemDark.removeEventListener("change", applyTheme);
  }, [prefs]);

  const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setPrefs((prev) => ({ ...prev, [key]: value }));

  return (
    <PrefsContext.Provider value={{ prefs, setPref }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}
