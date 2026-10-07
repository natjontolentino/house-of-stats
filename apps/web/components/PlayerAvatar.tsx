"use client";

import { useEffect, useState } from "react";

/** Colours chosen to stay legible with white initials on top. */
const AVATAR_COLORS = ["#3a7bd5", "#d75a2c", "#1a8f4c", "#8e5bd0", "#c2417a", "#0f8b9e", "#b8790a", "#5b6b7f"];

/** Stable string hash so the same name always lands on the same colour. */
function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** First letter of the first and last word ("Dennis Ibay" -> "DI"); one letter for a single name. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Circular player avatar: the uploaded photo when there is one, otherwise (or
 * if the image fails to load) initials on a colour derived from the name. The
 * initials circle always renders underneath, so a broken or slow image never
 * leaves a hole or a broken-image icon.
 */
export function PlayerAvatar({
  name,
  photoUrl,
  size = 32,
  ring,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  /** Optional ring colour, e.g. to set the avatar off a dark background. */
  ring?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photoUrl]);

  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: colorFor(name),
        color: "white",
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 700,
        letterSpacing: "0.02em",
        lineHeight: 1,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
        verticalAlign: "middle",
      }}
    >
      {initialsOf(name)}
      {photoUrl && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
    </span>
  );
}
