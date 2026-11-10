import * as SecureStore from "expo-secure-store";

const API = "https://jicagents.com";

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

export async function refreshToken() {
  const refresh = await SecureStore.getItemAsync("jic_refresh");
  if (!refresh) return null;
  const res = await fetch(`${API}/api/mobile/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  await SecureStore.setItemAsync("jic_access", data.access);
  await SecureStore.setItemAsync("jic_refresh", data.refresh);
  return data.access;
}

export async function signOut() {
  await SecureStore.deleteItemAsync("jic_access");
  await SecureStore.deleteItemAsync("jic_refresh");
}
