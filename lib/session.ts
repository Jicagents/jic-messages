import { getAccess } from "./auth";

export type Session = { email: string; slug: string; role: string };

/** Read (not verify) the signed-in email, org slug, and role from the opaque access token: email|slug|role|exp|type|sig. */
export function sessionFromToken(token: string | null | undefined): Session | null {
  const parts = String(token || "").split("|");
  if (parts.length < 6 || !parts[0]) return null;
  return { email: parts[0], slug: parts[1] || "", role: parts[2] || "" };
}

export async function currentSession(): Promise<Session | null> {
  return sessionFromToken(await getAccess());
}
