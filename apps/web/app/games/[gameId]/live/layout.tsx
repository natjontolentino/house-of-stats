import { LiveFontScope } from "../../../../components/live/LiveFontScope";

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <LiveFontScope>{children}</LiveFontScope>;
}
