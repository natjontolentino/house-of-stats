/** Small team logo, or nothing when the team hasn't uploaded one. */
export function TeamLogo({ url, size = 20 }: { url: string | null | undefined; size?: number }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}
