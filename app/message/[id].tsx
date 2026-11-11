import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Image, TextInput, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getAccess, refreshToken } from "../../lib/auth";

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState<any>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let token = await getAccess();
        if (!token) token = await refreshToken();
        if (!token) return router.replace("/");
        const res = await fetch(`https://jicagents.com/api/mobile/message/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessage(data.message);
        } else {
          setError(`Failed to load (${res.status})`);
        }
      } catch (e) {
        setError("Network error");
      }
    }
    load();
  }, [id]);

  function dialBlocked() {
    const phone = String(message?.caller_phone || "").replace(/\D/g, "");
    if (!phone) return Alert.alert("No phone number");
    Linking.openURL(`tel:*67${phone}`);
  }

  async function saveNote() {
    if (!note.trim()) return;
    setSaving(true);
    const token = await getAccess();
    await fetch("https://jicagents.com/api/mobile/note", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: id, note: note.trim() }),
    }).catch(() => {});
    setNote("");
    setSaving(false);
    Alert.alert("Note saved");
  }

  async function redirect(channel: string) {
    const token = await getAccess();
    const res = await fetch("https://jicagents.com/api/mobile/redirect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: id, channel }),
    }).catch(() => null);
    if (res?.ok) Alert.alert("Redirected", `Sent via ${channel}`);
    else Alert.alert("Failed", "Could not redirect");
  }

  if (error) return <View style={styles.container}><Text>{error}</Text><TouchableOpacity onPress={() => router.back()}><Text style={{color:"#14b8a6",marginTop:12}}>Go back</Text></TouchableOpacity></View>;
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
            <TouchableOpacity onPress={dialBlocked}>
              <Text style={styles.phone}>{message.caller_phone} (tap to call *67)</Text>
            </TouchableOpacity>
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

        <Text style={styles.section}>Dispatch Note</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note..."
          value={note}
          onChangeText={setNote}
          multiline
        />
        <TouchableOpacity style={styles.noteBtn} onPress={saveNote} disabled={saving}>
          <Text style={styles.noteBtnText}>{saving ? "Saving..." : "Save Note"}</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Redirect</Text>
        <View style={styles.redirectRow}>
          <TouchableOpacity style={styles.redirectBtn} onPress={() => redirect("text_mobile")}>
            <Text style={styles.redirectText}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.redirectBtn} onPress={() => redirect("email")}>
            <Text style={styles.redirectText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.redirectBtn} onPress={() => redirect("call_mobile")}>
            <Text style={styles.redirectText}>Call</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.callBtn} onPress={dialBlocked}>
          <Text style={styles.callBtnText}>Call Back (*67)</Text>
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
  phone: { color: "#14b8a6", fontSize: 14, textDecorationLine: "underline" },
  date: { color: "#7d8ea5", fontSize: 12 },
  statusBadge: { backgroundColor: "#e0f2f1", borderRadius: 8, padding: 8, alignSelf: "flex-start", marginBottom: 16 },
  statusText: { color: "#14b8a6", fontWeight: "600" },
  section: { fontSize: 16, fontWeight: "700", color: "#0c2340", marginTop: 16, marginBottom: 12 },
  field: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 8 },
  fieldLabel: { color: "#7d8ea5", fontSize: 12, marginBottom: 4 },
  fieldValue: { color: "#0c2340", fontSize: 15 },
  noteInput: { backgroundColor: "#fff", borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: "top" },
  noteBtn: { backgroundColor: "#0c2340", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 8 },
  noteBtnText: { color: "#fff", fontWeight: "600" },
  redirectRow: { flexDirection: "row", gap: 8 },
  redirectBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 8, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#14b8a6" },
  redirectText: { color: "#14b8a6", fontWeight: "600" },
  callBtn: { backgroundColor: "#14b8a6", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16, marginBottom: 32 },
  callBtnText: { color: "#0c2340", fontWeight: "700" },
});
