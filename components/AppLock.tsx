import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { getAccess } from "../lib/auth";
import { hasScreenLock, unlockWithDevice } from "../lib/deviceAuth";
import { shouldLock } from "../lib/lockPolicy";
import { loadLockMinutes } from "../lib/lockStore";
import { colors, space, type } from "../lib/theme";
import { BrandLogo } from "./BrandLogo";
import { PrimaryButton } from "./ui";

/**
 * Wraps the whole app. While the app is not in the foreground it paints an opaque cover, so the
 * app-switcher preview shows nothing. If the app was away longer than the chosen time it stays
 * covered until the phone's unlock succeeds.
 */
export function AppLock({ children }: { children: ReactNode }) {
  const [covered, setCovered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const awayAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setBusy(true);
    try {
      if (await unlockWithDevice()) setLocked(false);
    } finally {
      prompting.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      // The unlock prompt itself can flicker the app state; ignore that.
      if (prompting.current) return;
      if (state === "active") {
        const away = awayAt.current;
        awayAt.current = null;
        const signedIn = !!(await getAccess());
        if (signedIn && shouldLock(away, Date.now(), await loadLockMinutes())) {
          if (await hasScreenLock()) {
            setLocked(true);
            setCovered(false);
            void unlock();
            return;
          }
        }
        setCovered(false);
      } else {
        if (awayAt.current == null) awayAt.current = Date.now();
        setCovered(true);
      }
    });
    return () => sub.remove();
  }, [unlock]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {covered || locked ? (
        <View style={styles.cover} pointerEvents="auto" accessibilityViewIsModal importantForAccessibility="yes">
          <BrandLogo size={56} />
          {locked ? (
            <>
              <Text style={styles.title}>JIC Messages is locked</Text>
              <Text style={styles.body}>Unlock with your fingerprint, face, or phone PIN to continue.</Text>
              <PrimaryButton label="Unlock" onPress={unlock} busy={busy} style={styles.btn} />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md, zIndex: 1000, elevation: 1000 },
  title: { ...type.h2, color: colors.text, marginTop: space.lg, textAlign: "center" },
  body: { ...type.body, color: colors.textFaint, textAlign: "center" },
  btn: { alignSelf: "stretch", marginTop: space.md },
});
