import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { authorizedFetch, SignedOutError } from "../lib/messageApi";
import { Screen } from "../components/Screen";
import { Avatar, Card } from "../components/ui";
import { colors, radius, space, type } from "../lib/theme";

type Shift = { id: string; person_name: string; date: string; start: string; current: boolean; mine?: boolean };

export default function MySchedule() {
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authorizedFetch("https://jicagents.com/api/mobile/schedule");
      if (res.status === 401) return router.replace("/");
      if (res.status === 404) {
        const text = await res.text();
        setShifts([]);
        setNote(text.includes("No organization") ? "No organization is linked to this account." : "The schedule is not available yet. It needs the latest JIC portal update.");
        return;
      }
      if (!res.ok) {
        setShifts([]);
        setNote("Could not load the schedule. Pull down to try again.");
        return;
      }
      const data = await res.json();
      setShifts(Array.isArray(data?.shifts) ? data.shifts : []);
      setNote("");
    } catch (e) {
      if (e instanceof SignedOutError) return router.replace("/");
      setShifts([]);
      setNote("Network error. Pull down to try again.");
    }
  }, []);

  useEffect(() => {
    // The fetch lives in a nested function so its state updates are not synchronous effect work.
    void (async () => {
      await load();
    })();
  }, [load]);

  return (
    <Screen
      title="My Schedule"
      back
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.teal} colors={[colors.teal]} progressBackgroundColor={colors.surface} />}
    >
      <Text style={styles.intro}>Next on-call shifts from your office calendar. Read only; changes are made in the JIC portal.</Text>
      {shifts === null ? <Text style={type.muted}>Loading…</Text> : null}
      {shifts && shifts.length === 0 ? <Card><Text style={styles.body}>{note || "No upcoming on-call shifts."}</Text></Card> : null}
      {(shifts || []).map((shift, index) => (
        <Card key={shift.id || `${shift.date}-${shift.start}-${index}`} style={[styles.shift, shift.current && styles.shiftNow]}>
          <View style={styles.dateBox}>
            <Text style={styles.dow}>{weekday(shift.date)}</Text>
            <Text style={styles.day}>{dayNum(shift.date)}</Text>
            <Text style={styles.mon}>{month(shift.date)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.time}>Starts {time12(shift.start)}</Text>
            <View style={styles.personRow}>
              <Avatar name={shift.person_name} size={28} />
              <Text style={styles.person} numberOfLines={1}>{shift.person_name}</Text>
            </View>
            <View style={styles.tags}>
              {shift.current ? <Text style={[styles.tag, styles.tagNow]}>On call now</Text> : null}
              {shift.mine ? <Text style={styles.tag}>You</Text> : null}
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function parts(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
const weekday = (date: string) => parts(date)?.toLocaleDateString([], { weekday: "short" }) ?? "";
const month = (date: string) => parts(date)?.toLocaleDateString([], { month: "short" }) ?? "";
const dayNum = (date: string) => {
  const parsed = parts(date);
  return parsed ? String(parsed.getDate()) : "";
};
function time12(hhmm: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!match) return hhmm || "";
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const styles = StyleSheet.create({
  intro: { ...type.muted, lineHeight: 19 },
  body: { ...type.body, fontSize: 15.5 },
  shift: { flexDirection: "row", gap: space.lg, alignItems: "center" },
  shiftNow: { borderColor: colors.teal },
  dateBox: { width: 62, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, alignItems: "center" },
  dow: { color: colors.aqua, fontWeight: "800", fontSize: 12.5, textTransform: "uppercase" },
  day: { color: colors.text, fontWeight: "800", fontSize: 24 },
  mon: { color: colors.textMuted, fontSize: 12.5 },
  time: { color: colors.text, fontWeight: "700", fontSize: 16 },
  personRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  person: { color: colors.textMuted, fontSize: 15, flex: 1 },
  tags: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  tag: { color: colors.aqua, fontSize: 12, fontWeight: "800", borderWidth: 1, borderColor: colors.successBorder, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, overflow: "hidden" },
  tagNow: { backgroundColor: colors.teal, color: colors.tealInk, borderColor: colors.teal },
});
