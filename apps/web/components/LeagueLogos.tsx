/**
 * A league's logo, or both of its logos side by side when it has a second one
 * (a co-organizer or sponsor). Renders nothing when there is no logo at all,
 * so callers can drop it in without checking.
 */
export function LeagueLogos({
  primary,
  secondary,
  size,
  gap = 8,
}: {
  primary: string | null | undefined;
  secondary?: string | null;
  size: number;
  gap?: number;
}) {
  const urls = [primary, secondary].filter((u): u is string => !!u);
  if (urls.length === 0) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, flexShrink: 0 }}>
      {urls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "contain" }} />
      ))}
    </span>
  );
}
