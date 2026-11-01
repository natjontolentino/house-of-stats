/**
 * "Special" features: built into the streaming apps but switched on per code (league) here. The key is what the
 * apps look for in the code's feature list; keep keys stable once released.
 */
export const STREAM_FEATURES = [
  { key: "zoom", label: "Camera zoom (0.6x / 1x / 2x)" },
] as const;

export const STREAM_FEATURE_KEYS: readonly string[] = STREAM_FEATURES.map((f) => f.key);
