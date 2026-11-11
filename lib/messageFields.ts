export type MessageField = { label?: string; value?: string };

function norm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Drop an exact "Reason" row (the screen shows "Reason for calling" separately)
 * and any later row whose value repeats a value already on screen.
 */
export function fieldsToShow(fields: MessageField[], messageText?: string | null): { label: string; value: string }[] {
  const seen = new Set<string>();
  if (messageText?.trim()) seen.add(norm(messageText));
  const out: { label: string; value: string }[] = [];
  for (const field of fields) {
    const label = String(field?.label ?? "").trim();
    const value = String(field?.value ?? "").trim();
    if (!value) continue;
    if (norm(label) === "reason") continue;
    const key = norm(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: label || "Detail", value });
  }
  return out;
}
