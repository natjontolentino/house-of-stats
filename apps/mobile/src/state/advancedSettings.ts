import * as SecureStore from "expo-secure-store";

/**
 * Device-level options that change how the tracker behaves, kept off by
 * default so the standard tracker is exactly what it always was.
 */
const SHOT_ZONES_KEY = "courtstats.advanced.shotZones";

/** Whether the "where was that shot from?" picker appears after each field goal. Off unless the tracker turned it on. */
export async function loadShotZonesEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(SHOT_ZONES_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function saveShotZonesEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(SHOT_ZONES_KEY, enabled ? "1" : "0");
  } catch {
    // The setting still applies for this session; it just won't be remembered.
  }
}
