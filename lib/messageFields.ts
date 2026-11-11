export type MessageField = { label?: string; value?: string };

function norm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const HIDDEN_LABELS = new Set([
  "reason",
  "caller",
  "caller name",
  "name",
  "phone",
  "phone number",
  "caller phone",
  "mobile",
  "mobile number",
]);

function digits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Drop Reason, caller name, and phone cards. The screen shows those itself.
 * Also drop any later row whose value repeats a value already on screen.
 */
export function fieldsToShow(
  fields: MessageField[],
  messageText?: string | null,
  hideValues: string[] = [],
): { label: string; value: string }[] {
  const seen = new Set<string>();
  const seenDigits = new Set<string>();
  if (messageText?.trim()) seen.add(norm(messageText));
  for (const value of hideValues) {
    const text = norm(value);
    if (text) seen.add(text);
    const nums = digits(value);
    if (nums.length >= 7) seenDigits.add(nums.length === 11 && nums.startsWith("1") ? nums.slice(1) : nums);
  }
  const out: { label: string; value: string }[] = [];
  for (const field of fields) {
    const label = String(field?.label ?? "").trim();
    const value = String(field?.value ?? "").trim();
    if (!value) continue;
    if (HIDDEN_LABELS.has(norm(label))) continue;
    const key = norm(value);
    if (seen.has(key)) continue;
    const nums = digits(value);
    const local = nums.length === 11 && nums.startsWith("1") ? nums.slice(1) : nums;
    if (local.length >= 7 && seenDigits.has(local)) continue;
    seen.add(key);
    out.push({ label: label || "Detail", value });
  }
  return out;
}
