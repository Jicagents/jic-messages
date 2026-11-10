import * as SecureStore from "expo-secure-store";

const API = "https://jicagents.com";

export async function signIn(email: string, password: string): Promise<{ token: string; slug: string }> {
  const res = await fetch(`${API}/api/portal/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
  });
  if (!res.ok) throw new Error("Sign-in failed");
  const cookie = res.headers.get("set-cookie") || "";
  const match = cookie.match(/jic_portal=([^;]+)/);
  if (!match) throw new Error("No session");
  const token = match[1];
  await SecureStore.setItemAsync("jic_token", token);
  const slug = token.split("|")[1] || "";
  return { token, slug };
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("jic_token");
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync("jic_token");
}
