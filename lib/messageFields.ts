// Message Detail content rules (no duplicated information). Mirrors jic-site/src/server/mobile-view.ts
// so the screen stays clean with the old API too: the Reason card is only the reason, and every
// other collected field goes in "Additional information" in form order with the form's labels.
// Name, phone, the reason field, and the caller-id echo are never repeated.

export type StoredField = { label?: unknown; value?: unknown };
export type ViewField = { label: string; value: string };
export type LogEvent = { action?: unknown; by?: unknown; detail?: unknown; at?: unknown };

const NAME_LABELS = new Set(["caller", "caller name", "name", "full name", "your name"]);
const PHONE_LABELS = new Set(["phone", "phone number", "caller phone", "callback", "callback number", "call back number", "mobile", "mobile number", "best number", "number", "caller id", "confirm phone", "phone (confirm)"]);
const REASON_LABELS = new Set(["reason", "reason for calling", "reason for call", "regarding", "re", "comment", "comments", "message", "concern", "issue"]);

export function norm(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function bareLabel(label: unknown) {
  return norm(label).replace(/[:*?]+$/g, "").trim();
}

export function phoneKey(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function isNameLabel(label: unknown) { return NAME_LABELS.has(bareLabel(label)); }
export function isPhoneLabel(label: unknown) { return PHONE_LABELS.has(bareLabel(label)); }
export function isReasonLabel(label: unknown) { return REASON_LABELS.has(bareLabel(label)); }

export function cleanFields(raw: unknown): ViewField[] {
  if (!Array.isArray(raw)) return [];
  const out: ViewField[] = [];
  for (const item of raw as StoredField[]) {
    const label = String(item?.label ?? "").trim();
    const value = String(item?.value ?? "").trim();
    if (!value) continue;
    out.push({ label: label || "Detail", value });
  }
  return out;
}

function isCallerIdLine(line: string) {
  return /^(details:\s*)?caller id:/i.test(line.trim());
}

/**
 * The reason text alone. Prefers the stored `reason`, then a Reason/Regarding/Comment field,
 * then `message_text`. Drops lines or `; `-joined segments that only repeat another field
 * ("Email: x"), a value already shown (name, phone, a field value), or the caller-id echo.
 */
export function reasonOnly(input: { reason?: unknown; message_text?: unknown; fields?: unknown; caller_name?: unknown; caller_phone?: unknown; from_number?: unknown }): string {
  const fields = cleanFields(input.fields);
  const fromField = fields.find((field) => isReasonLabel(field.label) && !isCallerIdLine(field.value))?.value || "";
  const base = String(input.reason ?? "").trim() || fromField || String(input.message_text ?? "").trim();
  const others = fields.filter((field) => !(isReasonLabel(field.label) && field.value === fromField));
  const labels = new Set(others.map((field) => bareLabel(field.label)));
  const values = new Set(others.map((field) => norm(field.value)));
  for (const value of [input.caller_name, input.caller_phone, input.from_number]) if (norm(value)) values.add(norm(value));
  const phones = new Set([input.caller_phone, input.from_number, ...others.map((f) => f.value)].map(phoneKey).filter((d) => d.length >= 7));
  const keep = (segment: string) => {
    const text = segment.trim();
    if (!text) return false;
    if (isCallerIdLine(text)) return false;
    const pair = text.match(/^([^:]{1,60}):\s*(.+)$/);
    if (pair) {
      const label = bareLabel(pair[1]);
      const value = norm(pair[2]);
      if (labels.has(label) || values.has(value) || isNameLabel(label) || isPhoneLabel(label)) return false;
      if (phoneKey(value).length >= 7 && phones.has(phoneKey(value)) && value.replace(/[\d\s()+.-]/g, "") === "") return false;
    }
    if (values.has(norm(text)) && norm(text) !== norm(base.split(/\n/)[0])) return false;
    return true;
  };
  const lines = base.split(/\r?\n/).flatMap((line) => line.split(/\s*;\s+(?=[^:;]{1,60}:)/)).filter(keep);
  return lines.join("\n").trim();
}

/** Every collected field except name, phone, the reason field, and the caller-id echo. Form order kept. */
export function additionalFields(input: { reason?: unknown; message_text?: unknown; fields?: unknown; caller_name?: unknown; caller_phone?: unknown; from_number?: unknown }): ViewField[] {
  const reason = norm(reasonOnly(input));
  const shown = new Set([norm(input.caller_name), reason].filter(Boolean));
  const phones = new Set([input.caller_phone, input.from_number].map(phoneKey).filter((d) => d.length >= 7));
  const seen = new Set<string>();
  const out: ViewField[] = [];
  for (const field of cleanFields(input.fields)) {
    if (isNameLabel(field.label) || isPhoneLabel(field.label) || isReasonLabel(field.label)) continue;
    if (isCallerIdLine(field.value)) continue;
    const key = norm(field.value);
    if (shown.has(key)) continue;
    if (phones.has(phoneKey(field.value)) && field.value.replace(/[\d\s()+.-]/g, "") === "") continue;
    const dedupe = `${bareLabel(field.label)}\u0000${key}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(field);
  }
  return out;
}

export type MessageField = { label?: string; value?: string };

/** "Label: value" lines written into message_text by the old API, which often has no fields array. */
function labelValueLines(text: string): ViewField[] {
  const out: ViewField[] = [];
  const parts = text.split(/\r?\n/).flatMap((line) => line.split(/\s*;\s+(?=[^:;]{1,60}:)/));
  for (const segment of parts) {
    const pair = segment.trim().match(/^([^:]{1,60}):\s*(.+)$/);
    if (!pair) continue;
    const label = pair[1].trim();
    const value = pair[2].trim();
    if (!label || !value || /^https?$/i.test(label)) continue;
    out.push({ label, value });
  }
  return out;
}

/** Form fields first, then label lines from message_text that the form did not already include. */
function mergeFields(primary: unknown, text: string): ViewField[] {
  const out = cleanFields(primary);
  const seen = new Set(out.map((field) => `${bareLabel(field.label)}\u0000${norm(field.value)}`));
  for (const field of labelValueLines(text)) {
    const key = `${bareLabel(field.label)}\u0000${norm(field.value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(field);
  }
  return out;
}

/** Everything the detail screen and inbox need, from whatever the API returned. */
export function messageContent(message: Record<string, unknown> | null | undefined, preview: { caller_name?: string; caller_phone?: string; message_text?: string } = {}) {
  const m = message || {};
  const callerName = str(m.caller_name) || str(preview.caller_name);
  const callerPhone = str(m.caller_phone) || str(preview.caller_phone) || str(m.from_number);
  const messageText = str(m.message_text) || str(preview.message_text);
  // A newer server sends additional_fields already cleaned. An older one leaves extras as
  // "Label: value" lines inside message_text, so harvest those only when the server did not.
  // The reason still comes from `reason`, a Reason field, or message_text — never from additional_fields alone.
  const serverExtras = Array.isArray(m.additional_fields) ? cleanFields(m.additional_fields) : null;
  const stored = serverExtras ? cleanFields(m.fields) : mergeFields(m.fields, messageText);
  const input = {
    reason: str(m.reason),
    message_text: messageText,
    fields: stored,
    caller_name: callerName,
    caller_phone: callerPhone,
    from_number: m.from_number,
  };
  const reason = reasonOnly(input);
  // Run the same rules again so a stale or older server can never put name, phone, or the reason back on screen.
  const additional = additionalFields({ ...input, fields: serverExtras ?? stored });
  return { callerName, callerPhone, reason, additional, formName: str(m.form_name) };
}

/** Inbox preview line: the reason alone, one line. */
export function reasonPreview(message: Record<string, unknown>): string {
  return messageContent(message).reason.replace(/\s+/g, " ").trim();
}

/** First and last initial ("Bob Dillon" -> "BD"); one letter for a single name; "?" when empty. */
export function initials(name: unknown): string {
  const words = String(name ?? "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
