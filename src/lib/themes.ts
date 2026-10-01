import type { Theme, ThemeName } from "./types";
import { inkOn, inkOnBoth } from "./contrast";

const fonts =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const themes: Record<ThemeName, Theme> = {
  classic: {
    name: "classic",
    white: "#f0d9b5",
    black: "#b58863",
    border: "#5a4632",
    zeroLine: "rgba(90, 70, 50, 0.45)",
    fontFamily: fonts,
    radius: 4,
  },
  lichess: {
    name: "lichess",
    white: "#f0f0f0",
    black: "#666",
    border: "#2c2c2c",
    zeroLine: "rgba(0, 0, 0, 0.28)",
    fontFamily: fonts,
    radius: 0,
  },
  chesscom: {
    name: "chesscom",
    white: "#eeeed2",
    black: "#769656",
    border: "#312e2b",
    zeroLine: "rgba(49, 46, 43, 0.35)",
    fontFamily: fonts,
    radius: 3,
  },
  midnight: {
    name: "midnight",
    white: "#d7e3f4",
    black: "#1b2433",
    border: "#0b1018",
    zeroLine: "rgba(215, 227, 244, 0.35)",
    labelColor: "#ff7a00",
    labelOnWhite: "#ff7a00",
    labelOnBlack: "#ff7a00",
    fontFamily: fonts,
    radius: 6,
  },
  broadcast: {
    name: "broadcast",
    white: "#ffffff",
    black: "#111111",
    border: "#000000",
    zeroLine: "rgba(255, 255, 255, 0.35)",
    fontFamily: fonts,
    radius: 2,
  },
  "high-contrast": {
    name: "high-contrast",
    white: "#ffffff",
    black: "#000000",
    border: "#ffff00",
    zeroLine: "#ffff00",
    labelColor: "#ff7a00",
    labelOnWhite: "#ff7a00",
    labelOnBlack: "#ff7a00",
    fontFamily: fonts,
    radius: 0,
  },
};

export function resolveTheme(input?: ThemeName | Partial<Theme>): Theme {
  if (!input) return { ...themes.lichess };
  if (typeof input === "string") {
    return { ...(themes[input as ThemeName] ?? themes.lichess) };
  }
  const base =
    input.name && input.name in themes
      ? themes[input.name as ThemeName]
      : themes.lichess;
  return { ...base, ...input };
}

export function themeToCssVars(theme: Theme): Record<string, string> {
  return {
    "--ceb-white": theme.white,
    "--ceb-black": theme.black,
    "--ceb-track": theme.track ?? theme.black,
    "--ceb-border": theme.border ?? "transparent",
    "--ceb-zero": theme.zeroLine ?? "rgba(0,0,0,0.3)",
    "--ceb-label": theme.labelColor ?? inkOnBoth(theme.white, theme.black),
    "--ceb-label-on-white": theme.labelOnWhite ?? inkOn(theme.white, "#111"),
    "--ceb-label-on-black": theme.labelOnBlack ?? inkOn(theme.black, "#fff"),
    "--ceb-font": theme.fontFamily ?? "sans-serif",
    "--ceb-radius": `${theme.radius ?? 0}px`,
  };
}
