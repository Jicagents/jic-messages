import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { router } from "expo-router";
import { getToken } from "../lib/auth";

type Message = {
  id: string;
  caller_name: string;
  caller_phone: string;
  message_text: string;
  urgency: string;
  created_at: string;
};

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const token = await getToken();
    if (!token) return router.replace("/");
    const slug = token.split("|")[1] || "";
    const res = await fetch(`https://jicagents.com/api/portal/messages?slug=${slug}`, {
      headers: { Cookie: `jic_portal=${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>JIC Messages</Text>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/message/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.caller_name || "Unknown"}</Text>
              {item.urgency === "urgent" && <Text style={styles.urgent}>URGENT</Text>}
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
  header: { backgroundColor: "#0c2340", color: "#fff", fontSize: 20, fontWeight: "700", padding: 16, paddingTop: 48 },
  card: { backgroundColor: "#fff", margin: 12, padding: 16, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  name: { fontSize: 16, fontWeight: "600", color: "#0c2340" },
  urgent: { color: "#e11d48", fontSize: 12, fontWeight: "700" },
  preview: { color: "#5c6b7a", fontSize: 14, marginBottom: 4 },
  time: { color: "#7d8ea5", fontSize: 12 },
  empty: { textAlign: "center", color: "#7d8ea5", marginTop: 40 },
});
