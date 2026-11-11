export type Method = "text" | "email" | "call" | "app" | "text_email";
export const ALL_METHODS: Method[] = ["text", "email", "call", "app", "text_email"];

export type TeamMember = {
  id: string;
  name: string;
  role: string | null;
  pref: Method;
  available: Method[];
};

export const METHOD_LABEL: Record<Method, string> = {
  text: "Text message",
  email: "Email",
  call: "Phone call",
  app: "App notification",
  text_email: "Text and email",
};

export const METHOD_SHORT: Record<Method, string> = {
  text: "text",
  email: "email",
  call: "call",
  app: "app alert",
  text_email: "text and email",
};

export const METHOD_ICON: Record<Method, string> = {
  text: "💬",
  email: "✉️",
  call: "📞",
  app: "🔔",
  text_email: "💬✉️",
};

export const METHOD_HINT: Record<Method, string> = {
  text: "Sends a text with the caller, number, reason and your note.",
  email: "Sends an email with the caller, number, reason and your note.",
  call: "Places a call and reads the message aloud. If they miss it, a text follows.",
  app: "Sends a push alert to their phone. The message opens in the app.",
  text_email: "Sends both a text and an email.",
};

const PREF_FROM_CHANNEL: Record<string, Method> = {
  text: "text",
  text_mobile: "text",
  email: "email",
  call: "call",
  call_mobile: "call",
  phone: "call",
  app: "app",
  app_notification: "app",
  text_email: "text_email",
  text_and_email: "text_email",
};

export function isMethod(value: unknown): value is Method {
  return value === "text" || value === "email" || value === "call" || value === "app" || value === "text_email";
}

export function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || "them";
}

function asMethod(value: unknown): Method | null {
  if (typeof value !== "string") return null;
  return PREF_FROM_CHANNEL[value.trim().toLowerCase()] ?? null;
}

function availableOf(raw: unknown): Method[] {
  if (Array.isArray(raw)) {
    const methods = raw.map(asMethod).filter((item): item is Method => item != null);
    return methods.length ? methods : [...ALL_METHODS];
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return ALL_METHODS.filter((method) => record[method] !== false);
  }
  return [...ALL_METHODS];
}

/** Accepts a bare array, or { team } / { targets } from an older payload. Missing fields do not throw. */
export function parseTeam(payload: unknown): TeamMember[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { team?: unknown }).team)
      ? (payload as { team: unknown[] }).team
      : payload && typeof payload === "object" && Array.isArray((payload as { targets?: unknown }).targets)
        ? (payload as { targets: unknown[] }).targets
        : [];
  const people: TeamMember[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const name = String(row.name ?? "").trim();
    if (!id || !name) continue;
    const role = typeof row.role === "string" && row.role.trim() ? row.role.trim() : null;
    const pref = asMethod(row.pref) ?? asMethod(row.preferred_method) ?? asMethod(row.channel) ?? "text";
    people.push({ id, name, role, pref, available: availableOf(row.available) });
  }
  return people;
}

export function messageIsRead(message: { read?: unknown; status?: unknown } | null, previewStatus = ""): boolean {
  if (message && typeof message.read === "boolean") return message.read;
  const status = String(message?.status ?? previewStatus ?? "").toLowerCase();
  if (!status) return true;
  return status !== "new" && status !== "unread";
}

export function redirectErrorMessage(status: number, body: string): string {
  const raw = body.trim();
  if (raw.startsWith("<") || !raw) {
    if (status === 404) return "That teammate was not found.";
    if (status === 422) return "That person has no contact method set up.";
    if (status === 400) return "Could not send. Try another way.";
    if (status === 502) return "The message could not be delivered.";
    return "Could not send. Try another way.";
  }
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim() && parsed.error !== "not_found" && parsed.error !== "no_contact" && parsed.error !== "bad_request" && parsed.error !== "send_failed") {
      return parsed.error.trim();
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
  } catch {
    return raw.slice(0, 180);
  }
  if (status === 404) return "That teammate was not found.";
  if (status === 422) return "That person has no contact method set up.";
  if (status === 502) return "The message could not be delivered.";
  return "Could not send. Try another way.";
}
