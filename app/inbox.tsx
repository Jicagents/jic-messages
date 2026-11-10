import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { router } from "expo-router";
import { getAccess, refreshToken, signOut } from "../lib/auth";

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
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    let token = await getAccess();
    if (!token) token = await refreshToken();
    if (!token) return router.replace("/");
    const res = await fetch("https://jicagents.com/api/mobile/messages", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      token = await refreshToken();
      if (!token) return router.replace("/");
    }
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>JIC Messages</Text>
        <TouchableOpacity onPress={async () => { await signOut(); router.replace("/"); }}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/message/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.caller_name || "Unknown"}</Text>
              {item.urgency === "urgent" && <Text style={styles.urgent}>URGENT</Text>}
              {item.status === "new" && <View style={styles.dot} />}
            </View>
            <Text style={styles.preview} numberOfLines={2}>{item.message_text}</Text>
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No messages</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  header: { backgroundColor: "#0c2340", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 48 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  logout: { color: "#14b8a6", fontSize: 14 },
  card: { backgroundColor: "#fff", margin: 12, padding: 16, borderRadius: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 16, fontWeight: "600", color: "#0c2340" },
  urgent: { color: "#e11d48", fontSize: 12, fontWeight: "700" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#14b8a6" },
  preview: { color: "#5c6b7a", fontSize: 14, marginBottom: 4 },
  time: { color: "#7d8ea5", fontSize: 12 },
  empty: { textAlign: "center", color: "#7d8ea5", marginTop: 40 },
});
