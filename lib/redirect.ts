export type PreferredMethod = "text" | "email" | "call" | "app" | "text_email";
export type SendChoice = "preference" | PreferredMethod;
export type RedirectChannel =
  | "text_mobile"
  | "email"
  | "call_mobile"
  | "app_notification"
  | "text_and_email"
  | "preference";

export type Availability = Record<PreferredMethod, boolean>;

export type Teammate = {
  id: string;
  name: string;
  role: string | null;
  preferredMethod: PreferredMethod | null;
  available: Availability;
};

export const ALL_AVAILABLE: Availability = {
  text: true,
  email: true,
  call: true,
  app: true,
  text_email: true,
};

export const METHOD_OPTIONS: {
  id: PreferredMethod;
  channel: Exclude<RedirectChannel, "preference">;
  label: string;
  short: string;
  prefers: string;
  hint: string;
}[] = [
  { id: "text", channel: "text_mobile", label: "Text message", short: "text", prefers: "Prefers text", hint: "Sends a text to their mobile number." },
  { id: "email", channel: "email", label: "Email", short: "email", prefers: "Prefers email", hint: "Sends an email to their address." },
  { id: "call", channel: "call_mobile", label: "Phone call", short: "call", prefers: "Prefers a phone call", hint: "Rings their phone." },
  { id: "app", channel: "app_notification", label: "App notification", short: "an app notification", prefers: "Prefers the app", hint: "Sends a push notification in the app." },
  { id: "text_email", channel: "text_and_email", label: "Text and email", short: "text and email", prefers: "Prefers text and email", hint: "Sends both a text and an email." },
];

const PREFERENCE_HINT = "Uses the method this person prefers.";

const CHANNEL_TO_METHOD: Record<string, PreferredMethod> = {
  text: "text",
  text_mobile: "text",
  sms: "text",
  email: "email",
  call: "call",
  call_mobile: "call",
  phone: "call",
  app: "app",
  app_notification: "app",
  text_email: "text_email",
  text_and_email: "text_email",
};

export function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || name.trim() || "them";
}

export function prefersLabel(method: PreferredMethod | null): string {
  if (!method) return "Preference not set";
  return METHOD_OPTIONS.find((option) => option.id === method)?.prefers ?? "Preference not set";
}

export function methodHint(choice: SendChoice): string {
  if (choice === "preference") return PREFERENCE_HINT;
  return METHOD_OPTIONS.find((option) => option.id === choice)?.hint ?? PREFERENCE_HINT;
}

export function channelFor(choice: SendChoice): RedirectChannel {
  if (choice === "preference") return "preference";
  return METHOD_OPTIONS.find((option) => option.id === choice)?.channel ?? "text_mobile";
}

/** New channel values an older server may reject with 400. */
export function isLegacyChannel(channel: RedirectChannel): boolean {
  return channel === "text_mobile" || channel === "email" || channel === "call_mobile";
}

export function sendButtonLabel(personName: string | null, choice: SendChoice): string {
  const method = METHOD_OPTIONS.find((option) => option.id === choice);
  if (!personName) {
    if (choice === "preference") return "Redirect message";
    return `Send by ${method?.label ?? "text"}`;
  }
  const who = firstName(personName);
  if (choice === "preference") return `Send to ${who}`;
  return `Send to ${who} by ${method?.short ?? "text"}`;
}

function asMethod(value: unknown): PreferredMethod | null {
  if (typeof value !== "string") return null;
  const mapped = CHANNEL_TO_METHOD[value.trim().toLowerCase()];
  if (mapped === "text" || mapped === "email" || mapped === "call" || mapped === "app" || mapped === "text_email") return mapped;
  return null;
}

function availabilityFrom(raw: unknown): Availability {
  if (!raw || typeof raw !== "object") return { ...ALL_AVAILABLE };
  const record = raw as Record<string, unknown>;
  const flag = (key: PreferredMethod) => (typeof record[key] === "boolean" ? (record[key] as boolean) : true);
  return {
    text: flag("text"),
    email: flag("email"),
    call: flag("call"),
    app: flag("app"),
    text_email: flag("text_email"),
  };
}

export function parseRedirectTargets(payload: unknown): { preferredId: string | null; teammates: Teammate[] } {
  if (!payload || typeof payload !== "object") return { preferredId: null, teammates: [] };
  const body = payload as Record<string, unknown>;
  const preferredId = typeof body.preferred_id === "string" && body.preferred_id.trim() ? body.preferred_id.trim() : null;
  const raw = Array.isArray(body.targets) ? body.targets : [];
  const teammates: Teammate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? row.user_id ?? "").trim();
    const name = String(row.name ?? row.full_name ?? "").trim();
    if (!id || !name) continue;
    const role = typeof row.role === "string" && row.role.trim() ? row.role.trim() : null;
    const preferredMethod = asMethod(row.preferred_method) ?? asMethod(row.channel);
    teammates.push({ id, name, role, preferredMethod, available: availabilityFrom(row.available) });
  }
  return { preferredId, teammates };
}

export function initialTeammateId(preferredId: string | null, teammates: Teammate[]): string | null {
  if (preferredId && teammates.some((person) => person.id === preferredId)) return preferredId;
  return teammates[0]?.id ?? null;
}

/** Preferred person first. Everyone else keeps the server order. */
export function orderTeammates(preferredId: string | null, teammates: Teammate[]): Teammate[] {
  if (!preferredId) return teammates;
  const preferred = teammates.filter((person) => person.id === preferredId);
  const rest = teammates.filter((person) => person.id !== preferredId);
  return [...preferred, ...rest];
}

export function teammateLabel(person: Teammate, preferredId: string | null): string {
  return person.id === preferredId ? `Preferred: ${person.name}` : person.name;
}
