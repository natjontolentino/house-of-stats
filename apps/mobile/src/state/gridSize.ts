import { useWindowDimensions } from "react-native";

/** Landscape phones are under ~500dp tall; shorter rows keep all five on-court players on screen. Tablets keep the full 48dp touch target. */
export function useCellHeight(): number {
  const { height } = useWindowDimensions();
  return height < 500 ? 40 : 48;
}
