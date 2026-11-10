import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getAccess, refreshToken } from "../../lib/auth";

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState<any>(null);

  useEffect(() => {
    async function load() {
      let token = await getAccess();
      if (!token) token = await refreshToken();
      if (!token) return router.replace("/");
      const res = await fetch(`https://jicagents.com/api/mobile/message/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(data.message);
      }
    }
    load();
  }, [id]);

  if (!message) return <View style={styles.container}><Text>Loading...</Text></View>;

  const fields = Array.isArray(message.fields) ? message.fields : [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Image source={require("../../assets/jic-logo.png")} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={styles.content}>
        <View style={styles.callerRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{message.caller_name?.[0] || "?"}</Text></View>
          <View>
            <Text style={styles.name}>{message.caller_name || "Unknown"}</Text>
            <Text style={styles.phone}>{message.caller_phone}</Text>
            <Text style={styles.date}>{new Date(message.created_at).toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✓ {message.status === "new" ? "New" : "Read"}</Text>
        </View>
        <Text style={styles.section}>Message Details</Text>
        {fields.map((f: any, i: number) => (
          <View key={i} style={styles.field}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <Text style={styles.fieldValue}>{f.value}</Text>
          </View>
        ))}
        {message.message_text && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Reason for Calling</Text>
            <Text style={styles.fieldValue}>{message.message_text}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${message.caller_phone}`)}>
          <Text style={styles.callBtnText}>Call Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  header: { backgroundColor: "#0c2340", flexDirection: "row", alignItems: "center", paddingTop: 40, paddingBottom: 12, paddingHorizontal: 16 },
  back: { color: "#fff", fontSize: 24, marginRight: 12 },
  logo: { width: 120, height: 60 },
  content: { padding: 16 },
  callerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#e0f2f1", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#14b8a6", fontWeight: "700", fontSize: 20 },
  name: { fontSize: 18, fontWeight: "700", color: "#0c2340" },
  phone: { color: "#5c6b7a", fontSize: 14 },
  date: { color: "#7d8ea5", fontSize: 12 },
  statusBadge: { backgroundColor: "#e0f2f1", borderRadius: 8, padding: 8, alignSelf: "flex-start", marginBottom: 16 },
  statusText: { color: "#14b8a6", fontWeight: "600" },
  section: { fontSize: 16, fontWeight: "700", color: "#0c2340", marginBottom: 12 },
  field: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 8 },
  fieldLabel: { color: "#7d8ea5", fontSize: 12, marginBottom: 4 },
  fieldValue: { color: "#0c2340", fontSize: 15 },
  callBtn: { backgroundColor: "#14b8a6", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  callBtnText: { color: "#0c2340", fontWeight: "700" },
});
