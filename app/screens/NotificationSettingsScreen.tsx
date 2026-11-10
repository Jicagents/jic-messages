// app/screens/NotificationSettingsScreen.tsx  (React Native)
// Restyle with the app's existing components/theme: this file shows structure and behaviour.
import { useEffect, useState, useCallback } from "react";
import { View, Text, Switch, Pressable, ScrollView, StyleSheet, AppState, Platform } from "react-native";
import { SOUND_IDS, type VibratePattern } from "../lib/alertChannel";
import { ensureAlertChannel, getPermissionStatus, requestPermissions, openDndSettings, openSystemSettings, type PermissionStatus } from "../lib/notifications";
import { previewSound } from "../lib/previewSound";
import type { Prefs } from "../lib/prefs";

type Api = { savePrefs: (p: Prefs) => Promise<void>; sendTest: () => Promise<void> };
const VIBES: { v: VibratePattern; label: string }[] = [{ v: "short", label: "Short" }, { v: "long", label: "Long" }, { v: "pulse", label: "Pulse" }];
const REPEATS: { v: Prefs["repeatMin"]; label: string }[] = [{ v: 0, label: "Off" }, { v: 1, label: "1 min" }, { v: 2, label: "2 min" }, { v: 5, label: "5 min" }];
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);

export function NotificationSettingsScreen({ prefs, api }: { prefs: Prefs; api: Api }) {
  const [p, setP] = useState(prefs);
  const [perm, setPerm] = useState<PermissionStatus | null>(null);
  const refresh = useCallback((next: Prefs) => { getPermissionStatus(next).then(setPerm); }, []);
  useEffect(() => {
    refresh(p);
    const sub = AppState.addEventListener("change", (st) => st === "active" && refresh(p)); // user may have changed system settings
    return () => sub.remove();
  }, [p, refresh]);

  const update = (next: Prefs) => {
    setP(next);
    ensureAlertChannel(next).then(() => api.savePrefs(next)).catch(() => {});
  };

  const stepsLeft =
    (perm?.notifications !== "granted" ? 1 : 0) +
    (p.override && Platform.OS === "android" && perm?.overrideDnd === false ? 1 : 0);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.h1}>Notifications</Text>

      <View style={[s.card, p.override && s.cardOn]}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Override phone settings</Text>
            <Text style={s.help}>Alerts sound and vibrate even when your phone is on silent, vibrate-only, or Do Not Disturb.</Text>
          </View>
          <Switch value={p.override} onValueChange={(v) => update({ ...p, override: v })} />
        </View>
        {p.override && (
          <View style={[s.status, stepsLeft ? s.statusWarn : s.statusOk]}>
            <Text style={stepsLeft ? s.warnText : s.okText}>
              {stepsLeft === 0 ? "Ready on this phone" : `${stepsLeft} step${stepsLeft > 1 ? "s" : ""} left to finish setup`}
            </Text>
            {perm?.notifications === "denied" && <Pressable onPress={openSystemSettings}><Text style={s.link}>Turn on notifications</Text></Pressable>}
            {perm?.notifications === "undetermined" && <Pressable onPress={() => requestPermissions().then(() => refresh(p))}><Text style={s.link}>Allow notifications</Text></Pressable>}
            {Platform.OS === "android" && perm?.overrideDnd === false && <Pressable onPress={openDndSettings}><Text style={s.link}>Allow Do Not Disturb override</Text></Pressable>}
            {Platform.OS === "ios" && perm?.criticalAlerts === false && <Text style={s.small}>Critical Alerts are not approved for this app yet. Alerts break through Focus but still follow the silent switch.</Text>}
          </View>
        )}
      </View>

      <View style={s.card}>
        <View style={s.row}>
          <View style={{ flex: 1 }}><Text style={s.title}>Sound</Text></View>
          <Switch value={p.sound.enabled} onValueChange={(v) => update({ ...p, sound: { ...p.sound, enabled: v } })} />
        </View>
        <View style={[s.chips, !p.sound.enabled && s.dim]} pointerEvents={p.sound.enabled ? "auto" : "none"}>
          {SOUND_IDS.map((id) => (
            <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: p.sound.id === id }}
              onPress={() => { update({ ...p, sound: { ...p.sound, id } }); previewSound(id); }}
              style={[s.chip, p.sound.id === id && s.chipOn]}>
              <Text style={[s.chipText, p.sound.id === id && s.chipTextOn]}>{cap(id)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Vibrate</Text>
            {Platform.OS === "ios" && <Text style={s.help}>iPhone controls vibration itself. Change it in Settings, Sounds & Haptics.</Text>}
          </View>
          <Switch value={p.vibrate.enabled} onValueChange={(v) => update({ ...p, vibrate: { ...p.vibrate, enabled: v } })} />
        </View>
        {Platform.OS === "android" && (
          <View style={[s.chips, !p.vibrate.enabled && s.dim]} pointerEvents={p.vibrate.enabled ? "auto" : "none"}>
            {VIBES.map((o) => (
              <Pressable key={o.v} onPress={() => update({ ...p, vibrate: { ...p.vibrate, pattern: o.v } })} style={[s.chip, p.vibrate.pattern === o.v && s.chipOn]}>
                <Text style={[s.chipText, p.vibrate.pattern === o.v && s.chipTextOn]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.title}>Ring again if not opened</Text>
        <Text style={s.help}>Sends the alert again until someone opens the message.</Text>
        <View style={s.seg}>
          {REPEATS.map((o) => (
            <Pressable key={o.v} onPress={() => update({ ...p, repeatMin: o.v })} style={[s.segBtn, p.repeatMin === o.v && s.segOn]}>
              <Text style={[s.chipText, p.repeatMin === o.v && s.chipTextOn]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={s.btn} onPress={() => api.sendTest()}><Text style={s.btnText}>Send test alert</Text></Pressable>
      <Text style={s.foot}>The test goes through the same path as a real message, so what you hear is what you will get. Nothing can override a phone that is off or has no signal.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 20, gap: 14, backgroundColor: "#0B1220" },
  h1: { color: "#E9F0F8", fontSize: 30, fontWeight: "600", marginBottom: 4 },
  card: { backgroundColor: "#0F1626", borderColor: "rgba(148,178,214,.22)", borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  cardOn: { borderColor: "#14B8A6" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  title: { color: "#E9F0F8", fontSize: 17, fontWeight: "600" },
  help: { color: "#8FA0B6", fontSize: 13, lineHeight: 19, marginTop: 2 },
  small: { color: "#FBBF24", fontSize: 12.5, lineHeight: 18 },
  status: { borderRadius: 12, padding: 12, gap: 6 },
  statusOk: { backgroundColor: "rgba(52,211,153,.10)" }, statusWarn: { backgroundColor: "rgba(251,191,36,.12)" },
  okText: { color: "#34D399", fontSize: 14 }, warnText: { color: "#FBBF24", fontSize: 14 },
  link: { color: "#5EEAD4", fontSize: 14, textDecorationLine: "underline", minHeight: 44, textAlignVertical: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, dim: { opacity: 0.4 },
  chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "rgba(148,178,214,.3)" },
  chipOn: { borderColor: "#14B8A6", backgroundColor: "rgba(20,184,166,.15)" },
  chipText: { color: "#A7B6C9", fontSize: 14 }, chipTextOn: { color: "#E9F0F8" },
  seg: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 12, backgroundColor: "rgba(6,10,18,.7)", borderWidth: 1, borderColor: "rgba(148,178,214,.18)" },
  segBtn: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 9 }, segOn: { backgroundColor: "rgba(20,184,166,.2)" },
  btn: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: "rgba(148,178,214,.3)", alignItems: "center", justifyContent: "center" },
  btnText: { color: "#E9F0F8", fontSize: 15, fontWeight: "500" },
  foot: { color: "#8FA0B6", fontSize: 12.5, lineHeight: 18 },
});
