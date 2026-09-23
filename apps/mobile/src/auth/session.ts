import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const SESSION_KEY = "courtstats.session";
const INSTALLATION_KEY = "courtstats.installationId";

export interface LeagueSession {
  leagueId: string;
  leagueName: string;
  deviceId: string;
}

/** A stable per-install identifier, independent of which league is currently logged in -- lets the same physical device be recognized (and reuse its device row) across league switches. */
export async function getInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_KEY);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALLATION_KEY, id);
  return id;
}

export async function loadSession(): Promise<LeagueSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LeagueSession;
  } catch {
    return null;
  }
}

export async function saveSession(session: LeagueSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
