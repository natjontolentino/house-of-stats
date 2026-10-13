import { LiveFontScope } from "../../components/live/LiveFontScope";

export default function LiveBoardLayout({ children }: { children: React.ReactNode }) {
  return <LiveFontScope>{children}</LiveFontScope>;
}
