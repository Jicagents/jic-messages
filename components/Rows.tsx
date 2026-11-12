import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { colors, radius, space } from "../lib/theme";

/** A tappable settings row with an icon, title, optional subtitle, and a chevron. */
export function NavRow({ icon, title, subtitle, onPress, first }: { icon: string; title: string; subtitle?: string; onPress: () => void; first?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
      <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
      <View style={styles.main}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

export function SwitchRow({ title, subtitle, value, onChange, first, disabled }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; first?: boolean; disabled?: boolean }) {
  return (
    <View style={[styles.row, !first && styles.divider, disabled && { opacity: 0.5 }]}>
      <View style={styles.main}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.teal, false: colors.surfaceHigh }}
        thumbColor={value ? colors.white : colors.textMuted}
        accessibilityLabel={title}
      />
    </View>
  );
}

export function Choices<T extends string | number>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.choices}>
      {options.map((o) => (
        <Pressable
          key={String(o.v)}
          onPress={() => onChange(o.v)}
          style={[styles.choice, o.v === value && styles.choiceOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: o.v === value }}
        >
          <Text style={[styles.choiceText, o.v === value && styles.choiceTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { opacity: 0.7 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,199,199,0.14)", alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 17, color: colors.aqua },
  main: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  chev: { color: colors.textFaint, fontSize: 26, fontWeight: "300" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  choice: { minHeight: 40, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: "center" },
  choiceOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  choiceText: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },
  choiceTextOn: { color: colors.tealInk },
});
