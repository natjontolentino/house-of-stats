/**
 * Fix Round 1, C1: the grid needs a condensed/neutral sans with tabular
 * numerals so dense numeric columns scan quickly and don't shift width as
 * values change — not the rounded default face. Loaded once in App.tsx via
 * useFonts; these constants resolve to the real family names once loaded,
 * and fall back to the system default (undefined) before that / on failure,
 * so nothing crashes if font loading is ever unavailable.
 */
export const GRID_FONT_FAMILY = "RobotoCondensed_400Regular";
export const GRID_FONT_FAMILY_BOLD = "RobotoCondensed_700Bold";

let fontsReady = false;

export function setGridFontsReady(ready: boolean) {
  fontsReady = ready;
}

/** Returns the condensed family name once loaded, else undefined (system default). */
export function gridFont(bold = false): string | undefined {
  if (!fontsReady) return undefined;
  return bold ? GRID_FONT_FAMILY_BOLD : GRID_FONT_FAMILY;
}
