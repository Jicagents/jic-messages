import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "./BrandLogo";
import { initials } from "../lib/messageFields";
import { card, colors, radius, space, type } from "../lib/theme";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[card, style]}>{children}</View>;
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.label, { marginBottom: space.sm }, style]}>{children}</Text>;
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.38) }]}>{initials(name)}</Text>
    </View>
  );
}

export function ReadPill({ read, onPress, compact }: { read: boolean; onPress?: () => void; compact?: boolean }) {
  const body = (
    <Text style={[styles.pillText, read ? styles.pillTextRead : styles.pillTextUnread, compact && styles.pillTextCompact]}>
      {read ? "✓ Read" : "● Unread"}
    </Text>
  );
  const style = [styles.pill, read ? styles.pillRead : styles.pillUnread, compact && styles.pillCompact];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: read }}
      accessibilityLabel={read ? "Read. Tap to mark unread." : "Unread. Tap to mark read."}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && { opacity: 0.75 }]}
    >
      {body}
    </Pressable>
  );
}

/** Navy top bar with the shared logo, an optional back arrow and title, and safe-area padding. */
export function ScreenHeader({ title, back, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.headerRow}>
        {back ? (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/inbox"))} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : null}
        <BrandLogo size={30} />
        {title ? (
          <Text style={[type.title, styles.headerTitle]} numberOfLines={1} accessibilityRole="header">{title}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {right}
      </View>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, busy, style, variant = "teal" }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>; variant?: "teal" | "ghost" | "danger" }) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === "teal" && styles.btnTeal,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        off && variant === "teal" && styles.btnOff,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "teal" ? colors.tealInk : colors.text} />
      ) : (
        <Text style={[styles.btnText, variant === "teal" ? { color: off ? colors.textFaint : colors.tealInk } : variant === "danger" ? { color: colors.danger } : { color: colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Toast({ text, bottom }: { text: string; bottom: number }) {
  if (!text) return null;
  return (
    <View pointerEvents="none" style={[styles.toast, { bottom }]} accessibilityLiveRegion="polite">
      <Text style={styles.toastText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: "rgba(0,199,199,0.16)", borderWidth: 1, borderColor: "rgba(70,226,221,0.5)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.aqua, fontWeight: "800", letterSpacing: 0.5 },
  pill: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: "center", borderWidth: 1 },
  pillCompact: { minHeight: 24, paddingHorizontal: 9 },
  pillRead: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  pillUnread: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  pillText: { fontWeight: "800", fontSize: 13 },
  pillTextCompact: { fontSize: 11.5 },
  pillTextRead: { color: colors.aqua },
  pillTextUnread: { color: colors.danger },
  header: { backgroundColor: colors.bgDeep, paddingHorizontal: space.lg, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  headerTitle: { flex: 1, fontSize: 22, marginLeft: space.xs },
  backBtn: { width: 36, height: 40, alignItems: "flex-start", justifyContent: "center" },
  backText: { color: colors.text, fontSize: 34, lineHeight: 36, fontWeight: "300" },
  btn: { minHeight: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  btnTeal: { backgroundColor: colors.teal },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.borderStrong },
  btnDanger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder },
  btnOff: { backgroundColor: colors.surfaceHigh },
  btnText: { fontSize: 16.5, fontWeight: "800", textAlign: "center" },
  toast: { position: "absolute", left: space.lg, right: space.lg, backgroundColor: colors.aqua, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: space.lg, alignItems: "center" },
  toastText: { color: colors.tealInk, fontWeight: "700", fontSize: 14.5, textAlign: "center" },
});
