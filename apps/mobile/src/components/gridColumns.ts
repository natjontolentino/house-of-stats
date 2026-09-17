import type { ViewStyle } from "react-native";

/**
 * Fix Round 1, A1: the grid must fit its container with no horizontal
 * scrolling at any screen width, so columns can never be fixed pixel
 * values. Every numeric column shares one flexbox spec (`colNarrow`) that
 * grows/shrinks with whatever space is actually available at runtime;
 * numeric columns absorb the squeeze first (flexShrink on them, not on
 * name), and the name column takes whatever remains, bounded by a sensible
 * min/max so it neither clips a nickname nor swallows the whole row on a
 * very wide screen.
 */
export const JERSEY_COLUMN_WIDTH = 26;
export const NAME_COLUMN_MIN = 90;
export const NAME_COLUMN_MAX = 170;
export const NARROW_COLUMN_MIN = 24;
export const NARROW_COLUMN_BASIS = 32;

/** # through W/T, excluding jersey and name (spec 6.3's full column list). */
export const NARROW_COLUMN_COUNT = 15;

export const colJersey: ViewStyle = { width: JERSEY_COLUMN_WIDTH };

export const colName: ViewStyle = {
  flexGrow: 1,
  flexShrink: 0,
  flexBasis: NAME_COLUMN_MIN,
  minWidth: NAME_COLUMN_MIN,
  maxWidth: NAME_COLUMN_MAX,
};

export const colNarrow: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: NARROW_COLUMN_BASIS,
  minWidth: NARROW_COLUMN_MIN,
};

/**
 * Absolute floor for the whole row (every column at its minimum). Used only
 * for the dev-time overflow assertion — real sizing is handled by flexbox
 * itself, not by this number.
 */
export const MIN_ROW_WIDTH = JERSEY_COLUMN_WIDTH + NAME_COLUMN_MIN + NARROW_COLUMN_MIN * NARROW_COLUMN_COUNT;
