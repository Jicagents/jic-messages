/** Decode a JWT `exp` (seconds) without verifying the signature. */
export function accessTokenExpiryMs(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4);
    const json = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when the access token has more than `skewMs` left. Opaque tokens are treated as usable. */
export function accessTokenIsFresh(token: string, nowMs: number, skewMs = 60_000): boolean {
  const exp = accessTokenExpiryMs(token);
  if (exp == null) return true;
  return exp - nowMs > skewMs;
}
