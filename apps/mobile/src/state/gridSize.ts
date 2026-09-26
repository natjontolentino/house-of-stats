import { createContext, useContext } from "react";

/** Height of one grid cell in dp. Tablets keep the full 48dp touch target; the phone tracker layout provides a smaller value computed from the space it actually has. */
export const GridSizeContext = createContext<number>(48);

export function useCellHeight(): number {
  return useContext(GridSizeContext);
}

const VISIBLE_PLAYER_ROWS = 5;
const ROW_BORDER = 1;

/** The tallest cell for which five rows (each with a 1dp bottom border) fit in the scroll area, kept between 28 and 48dp. */
export function cellHeightForViewport(viewportHeight: number): number {
  const fit = Math.floor(viewportHeight / VISIBLE_PLAYER_ROWS) - ROW_BORDER;
  return Math.max(28, Math.min(48, fit));
}
