import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Image } from "react-native";
import { router } from "expo-router";
import { authorizedFetch, messagesListUrl, SignedOutError } from "../lib/messageApi";

type Message = {
  id: string;
  caller_name: string;
  caller_phone: string;
  message_text: string;
  urgency: string;
  status: string;
  created_at: string;
};

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await authorizedFetch(messagesListUrl(filter, search));
      if (res.status === 401) return router.replace("/");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      if (e instanceof SignedOutError) router.replace("/");
    }
  }

  useEffect(() => { load(); }, [filter]);

  const filtered = messages.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.caller_name?.toLowerCase().includes(q) || m.caller_phone?.includes(q) || m.message_text?.toLowerCase().includes(q);
  });

  const unread = messages.filter(m => m.status === "new").length;

  function formatTime(d: string) {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/jic-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.headerTitle}>JIC Messages</Text>
        <TouchableOpacity onPress={() => router.push("/settings")} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.subHeader}>
        <Text style={styles.heading}>Messages</Text>
        {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread} New</Text></View>}
      </View>
      <Text style={styles.sub}>Your latest messages</Text>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.search} placeholder="Search messages..." value={search} onChangeText={setSearch} placeholderTextColor="#999" />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)}>
          <Text style={styles.filterIcon}>⚙</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, item.status === "new" && styles.cardUnread]} onPress={() => router.push(`/message/${encodeURIComponent(item.id)}`)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.caller_name?.[0] || "?"}</Text></View>
            <View style={styles.cardContent}>
              <View style={styles.cardRow}>
                <Text style={[styles.name, item.status === "new" && styles.nameUnread]}>{item.caller_name || "Unknown"}</Text>
                <Text style={styles.time}>{formatTime(item.created_at)}</Text>
              </View>
              <Text style={styles.phone}>{item.caller_phone}</Text>
              <Text style={styles.preview} numberOfLines={2}>{item.message_text}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No messages</Text>}
      />
      <Modal visible={showFilter} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Filter Messages</Text>
            {["all", "unread", "read"].map(f => (
              <TouchableOpacity key={f} style={styles.filterOption} onPress={() => setFilter(f)}>
                <View style={[styles.radio, filter === f && styles.radioOn]} />
                <Text style={styles.filterLabel}>{f === "all" ? "All Messages" : f === "unread" ? "Unread Only" : "Read Only"}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setFilter("all"); setShowFilter(false); }}><Text>Clear</Text></TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  header: { backgroundColor: "#0c2340", alignItems: "center", paddingTop: 40, paddingBottom: 12, position: "relative" },
  settingsBtn: { position: "absolute", right: 16, top: 48 },
  settingsIcon: { color: "#fff", fontSize: 20 },
  logo: { width: 140, height: 70 },
  headerTitle: { color: "#fff", fontSize: 16, marginTop: 4 },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16 },
  heading: { fontSize: 22, fontWeight: "700", color: "#0c2340" },
  badge: { backgroundColor: "#14b8a6", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  sub: { color: "#5c6b7a", fontSize: 14, paddingHorizontal: 16, marginBottom: 12 },
  searchRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e0e0e0" },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, paddingVertical: 10, fontSize: 14 },
  filterBtn: { marginLeft: 8, backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#e0e0e0" },
  filterIcon: { fontSize: 16 },
  card: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, alignItems: "center" },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: "#14b8a6" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e0f2f1", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#14b8a6", fontWeight: "700", fontSize: 16 },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "500", color: "#0c2340" },
  nameUnread: { fontWeight: "700" },
  time: { color: "#7d8ea5", fontSize: 12 },
  phone: { color: "#5c6b7a", fontSize: 13 },
  preview: { color: "#5c6b7a", fontSize: 13, marginTop: 2 },
  chevron: { color: "#ccc", fontSize: 20 },
  empty: { textAlign: "center", color: "#7d8ea5", marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  filterOption: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#ccc", marginRight: 12 },
  radioOn: { borderColor: "#14b8a6", backgroundColor: "#14b8a6" },
  filterLabel: { fontSize: 15 },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  clearBtn: { padding: 10, marginRight: 8 },
  applyBtn: { backgroundColor: "#14b8a6", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  applyText: { color: "#fff", fontWeight: "600" },
});
