/** US 10-digit display. Strips a leading country code 1. Other lengths stay as dialed. */
export function formatUsPhone(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return String(raw ?? "");
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

export function dialDigits(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}
