import * as SecureStore from "expo-secure-store";
import { accessTokenIsFresh } from "./accessToken";

const API = "https://jicagents.com";
let refreshInFlight: Promise<string | null> | null = null;

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API}/api/mobile/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  await SecureStore.setItemAsync("jic_access", data.access);
  await SecureStore.setItemAsync("jic_refresh", data.refresh);
  return data;
}

export async function getAccess(): Promise<string | null> {
  return SecureStore.getItemAsync("jic_access");
}

async function refreshTokenOnce(): Promise<string | null> {
  const refresh = await SecureStore.getItemAsync("jic_refresh");
  if (!refresh) return null;
  const res = await fetch(`${API}/api/mobile/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.access) return null;
  await SecureStore.setItemAsync("jic_access", data.access);
  if (data.refresh) await SecureStore.setItemAsync("jic_refresh", data.refresh);
  return data.access as string;
}

/** One refresh at a time. Concurrent callers share the same exchange. */
export function refreshToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshTokenOnce().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Stored access token, refreshed when it is missing or within 60s of exp. */
export async function getValidAccess(): Promise<string | null> {
  const current = await getAccess();
  if (current && accessTokenIsFresh(current, Date.now())) return current;
  return refreshToken();
}

export async function signOut() {
  await SecureStore.deleteItemAsync("jic_access");
  await SecureStore.deleteItemAsync("jic_refresh");
}
