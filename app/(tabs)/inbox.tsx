import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, TextInput } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { authorizedFetch, messagesListUrl, SignedOutError } from "../../lib/messageApi";
import { formatUsPhone, dialDigits } from "../../lib/phone";
import { reasonPreview } from "../../lib/messageFields";
import { messageIsRead } from "../../lib/redirect";
import { Avatar, ReadPill, ScreenHeader } from "../../components/ui";
import { colors, radius, space } from "../../lib/theme";

type Message = {
  id: string;
  caller_name?: string | null;
  caller_phone?: string | null;
  from_number?: string | null;
  message_text?: string | null;
  reason?: string | null;
  fields?: unknown;
  additional_fields?: unknown;
  urgency?: string | null;
  status?: string | null;
  created_at: string;
};

type Filter = "all" | "unread";

const isUnread = (m: Message) => !messageIsRead({ status: m.status });

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      // The server ignores filter and q today; both are applied below on the phone.
      const res = await authorizedFetch(messagesListUrl("all", ""));
      if (res.status === 401) return router.replace("/");
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
        setError("");
      } else {
        setError("Could not load messages. Pull down to try again.");
      }
    } catch (e) {
      if (e instanceof SignedOutError) return router.replace("/");
      setError("Network error. Pull down to try again.");
    } finally {
      setLoaded(true);
    }
  }, []);

  // Reload when the tab comes back into view, so a message opened (and marked read) shows its new state.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unreadCount = useMemo(() => messages.filter(isUnread).length, [messages]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return messages.filter((m) => {
      if (filter === "unread" && !isUnread(m)) return false;
      if (!q) return true;
      const name = String(m.caller_name || "").toLowerCase();
      const reason = reasonPreview(m as Record<string, unknown>).toLowerCase();
      const phone = dialDigits(String(m.caller_phone || m.from_number || ""));
      return name.includes(q) || reason.includes(q) || (qDigits.length >= 3 && phone.includes(qDigits));
    });
  }, [messages, filter, search]);

  function open(item: Message) {
    setMessages((list) => list.map((m) => (m.id === item.id && m.status === "new" ? { ...m, status: "read" } : m)));
    router.push({
      pathname: "/message/[id]",
      params: {
        id: item.id,
        caller_name: item.caller_name ?? "",
        caller_phone: item.caller_phone ?? "",
        message_text: reasonPreview(item as Record<string, unknown>),
        status: item.status ?? "",
        created_at: item.created_at ?? "",
      },
    });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Messages"
        right={unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount} unread</Text></View> : null}
      />
      <View style={styles.controls}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.search}
            placeholder="Search name, phone, or reason"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={10} accessibilityLabel="Clear search">
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.chips}>
          <Chip label={`All (${messages.length})`} on={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label={`Unread (${unreadCount})`} on={filter === "unread"} onPress={() => setFilter("unread")} />
        </View>
      </View>
      {error && messages.length > 0 ? <Text style={styles.errorBanner}>{error}</Text> : null}
      <FlatList
        style={styles.messages}
        data={shown}
        keyExtractor={(m) => m.id}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const unread = isUnread(item);
          const name = item.caller_name || "Unknown caller";
          const phone = item.caller_phone || item.from_number || "";
          const preview = reasonPreview(item as Record<string, unknown>);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, unread && styles.cardUnread, pressed && { opacity: 0.85 }]}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${unread ? "Unread. " : ""}${name}. ${preview}`}
            >
              <Avatar name={name} size={44} />
              <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>{name}</Text>
                  <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                </View>
                {phone ? <Text style={styles.phone}>{formatUsPhone(phone)}</Text> : null}
                {preview ? <Text style={styles.preview} numberOfLines={2}>{preview}</Text> : null}
                <View style={styles.pillRow}>
                  {item.urgency === "urgent" ? <Text style={styles.urgent}>URGENT</Text> : null}
                  <ReadPill read={!unread} compact />
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {!loaded ? "Loading…" : error || (search || filter === "unread" ? "No messages match." : "No messages yet.")}
          </Text>
        }
      />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function formatTime(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const days = (now.getTime() - date.getTime()) / 86400000;
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  badge: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { color: colors.tealInk, fontSize: 12.5, fontWeight: "800" },
  controls: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  errorBanner: { color: colors.danger, fontSize: 14, paddingHorizontal: space.lg, paddingTop: space.md },
  messages: { flex: 1 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.border, minHeight: 48 },
  searchIcon: { color: colors.textMuted, fontSize: 20, marginRight: space.sm },
  search: { flex: 1, paddingVertical: 10, fontSize: 15.5, color: colors.text },
  clear: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 4 },
  chips: { flexDirection: "row", gap: space.sm },
  chip: { minHeight: 38, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: "center" },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },
  chipTextOn: { color: colors.tealInk },
  list: { padding: space.lg, paddingBottom: 40, gap: space.md },
  card: { flexDirection: "row", gap: space.md, backgroundColor: colors.surface, padding: space.md + 2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, elevation: 3 },
  cardUnread: { borderColor: colors.teal, backgroundColor: "#0D3150" },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  nameUnread: { fontWeight: "800" },
  time: { color: colors.textFaint, fontSize: 12.5 },
  phone: { color: colors.aqua, fontSize: 13.5, marginTop: 2 },
  preview: { color: colors.textMuted, fontSize: 14, lineHeight: 19, marginTop: 4 },
  pillRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: space.sm, marginTop: space.sm },
  urgent: { color: colors.danger, fontWeight: "800", fontSize: 11.5, letterSpacing: 0.8 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40, fontSize: 15 },
});
