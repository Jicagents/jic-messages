/** How long the app may sit in the background before it asks for the phone's unlock again. */
export const LOCK_CHOICES = [
  { v: 0, label: "Right away" },
  { v: 1, label: "1 minute" },
  { v: 2, label: "2 minutes" },
  { v: 5, label: "5 minutes" },
] as const;

export type LockMinutes = (typeof LOCK_CHOICES)[number]["v"];
export const DEFAULT_LOCK_MINUTES: LockMinutes = 2;

export function coerceLockMinutes(raw: unknown): LockMinutes {
  return LOCK_CHOICES.some((c) => c.v === raw) ? (raw as LockMinutes) : DEFAULT_LOCK_MINUTES;
}

/** True when the app was away long enough to require unlocking. A missing timestamp means it was never backgrounded. */
export function shouldLock(backgroundedAt: number | null, now: number, minutes: LockMinutes): boolean {
  if (backgroundedAt == null) return false;
  return now - backgroundedAt >= minutes * 60_000;
}
