import * as LocalAuthentication from "expo-local-authentication";

/** JIC Messages always asks for the phone's own unlock: fingerprint or face, with the PIN, pattern or password as the fallback. */
export async function hasScreenLock(): Promise<boolean> {
  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function unlockWithDevice(promptMessage = "Unlock JIC Messages"): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false });
    return result.success;
  } catch {
    return false;
  }
}

export const NO_SCREEN_LOCK_MESSAGE =
  "To protect messages, JIC Messages needs a screen lock on this phone. Set a PIN, pattern, password, fingerprint or face unlock in your phone's Settings, then open the app again.";
