import * as SecureStore from "expo-secure-store";
import { coerceLockMinutes, DEFAULT_LOCK_MINUTES, type LockMinutes } from "./lockPolicy";

const KEY = "jic_lock_minutes";

export async function loadLockMinutes(): Promise<LockMinutes> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw == null ? DEFAULT_LOCK_MINUTES : coerceLockMinutes(Number(raw));
  } catch {
    return DEFAULT_LOCK_MINUTES;
  }
}

export async function saveLockMinutes(minutes: LockMinutes) {
  await SecureStore.setItemAsync(KEY, String(minutes));
}
