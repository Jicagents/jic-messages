import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Image, TextInput, Alert, RefreshControl, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { authorizedFetch, formatApiError, isMessageUuid, messageDetailUrl, routeParam, SignedOutError } from "../../lib/messageApi";
import { fieldsToShow } from "../../lib/messageFields";
import { dialDigits, formatUsPhone } from "../../lib/phone";

export default function MessageDetail() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    caller_name?: string | string[];
    caller_phone?: string | string[];
    message_text?: string | string[];
    status?: string | string[];
    created_at?: string | string[];
  }>();
  const messageId = routeParam(params.id);
  const preview = {
    caller_name: routeParam(params.caller_name),
    caller_phone: routeParam(params.caller_phone),
    message_text: routeParam(params.message_text),
    status: routeParam(params.status),
    created_at: routeParam(params.created_at),
  };
  const [loaded, setLoaded] = useState<{ id: string; message: any } | null>(null);
  const [errorText, setErrorText] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const message = loaded?.id === messageId ? loaded.message : null;
  const activeId = useRef(messageId);
  activeId.current = messageId;

  const load = useCallback(async () => {
    if (!messageId) return;
    const requested = messageId;
    setPhase((current) => (loaded?.id === requested ? current : "loading"));
    setErrorText("");
    try {
      const res = await authorizedFetch(messageDetailUrl(requested));
      if (activeId.current !== requested) return;
      if (res.status === 401) return router.replace("/");
      if (!res.ok) {
        const text = formatApiError(res.status, await res.text());
        if (loaded?.id === requested) Alert.alert("Couldn't refresh", text);
        else {
          setErrorText(text);
          setPhase("error");
        }
        return;
      }
      const data = await res.json();
      if (activeId.current !== requested) return;
      if (!data?.message) {
        const text = "Failed to load: the server returned no message.";
        if (loaded?.id === requested) Alert.alert("Couldn't refresh", text);
        else {
          setErrorText(text);
          setPhase("error");
        }
        return;
      }
      setLoaded({ id: requested, message: data.message });
      setPhase("ready");
      setErrorText("");
    } catch (e) {
      if (activeId.current !== requested) return;
      if (e instanceof SignedOutError) return router.replace("/");
      if (loaded?.id === requested) Alert.alert("Couldn't refresh", "Network error");
      else {
        setErrorText("Network error");
        setPhase("error");
      }
    }
  }, [loaded, messageId]);

  useEffect(() => {
    if (!messageId) return;
    load();
  }, [messageId]);

  function dialBlocked(raw?: string) {
    const phone = dialDigits(raw || message?.caller_phone || preview.caller_phone || "");
    if (!phone) return Alert.alert("No phone number");
    Linking.openURL(`tel:*67${phone}`);
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function saveNote() {
    if (!note.trim() || !messageId) return;
    setSaving(true);
    try {
      const res = await authorizedFetch("https://jicagents.com/api/mobile/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, note: note.trim() }),
      });
      if (res.ok) {
        setNote("");
        Alert.alert("Note saved");
      } else {
        Alert.alert("Couldn't save note", formatApiError(res.status, await res.text()));
      }
    } catch {
      Alert.alert("Couldn't save note", "Network error");
    }
    setSaving(false);
  }

  async function redirect(channel: string) {
    if (!messageId) return;
    try {
      const res = await authorizedFetch("https://jicagents.com/api/mobile/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, channel }),
      });
      if (res.ok) Alert.alert("Redirected", `Sent via ${channel}`);
      else Alert.alert("Failed", formatApiError(res.status, await res.text()));
    } catch {
      Alert.alert("Failed", "Could not redirect");
    }
  }

  if (!messageId || (phase === "loading" && !message)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#14b8a6" style={{ marginTop: 48 }} />
        <Text style={styles.loadingText}>{preview.caller_name ? `Loading ${preview.caller_name}...` : "Loading..."}</Text>
      </View>
    );
  }

  if (phase === "error" && !message) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.errorPage}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#14b8a6" />}
      >
        <Text style={styles.errorBody}>{errorText}</Text>
        {messageId ? (
          <Text style={styles.requested}>
            Requested id: {messageId}
            {isMessageUuid(messageId) ? "" : " (not a message UUID)"}
          </Text>
        ) : null}
        <TouchableOpacity onPress={refresh}><Text style={styles.link}>Try again</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>Go back</Text></TouchableOpacity>
      </ScrollView>
    );
  }
  if (!message) return <View style={styles.container}><Text>Loading...</Text></View>;

  const callerName = message.caller_name || preview.caller_name || "Unknown";
  const callerPhone = message.caller_phone || preview.caller_phone || "";
  const reason = message.message_text || preview.message_text || "";
  const createdAt = message.created_at || preview.created_at;
  const status = message.status || preview.status;
  const fields = fieldsToShow(Array.isArray(message.fields) ? message.fields : [], reason);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#14b8a6" />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Image source={require("../../assets/jic-logo.png")} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={styles.content}>
        <View style={styles.callerRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{message.caller_name?.[0] || "?"}</Text></View>
          <View>
            <Text style={styles.name}>{callerName}</Text>
            {callerPhone ? (
              <TouchableOpacity onPress={() => dialBlocked(callerPhone)}>
                <Text style={styles.phone}>{formatUsPhone(callerPhone)}</Text>
              </TouchableOpacity>
            ) : null}
            {createdAt ? <Text style={styles.date}>{new Date(createdAt).toLocaleString()}</Text> : null}
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✓ {status === "new" ? "New" : "Read"}</Text>
        </View>
        <Text style={styles.section}>Message Details</Text>
        {fields.map((f, i) => (
          <View key={i} style={styles.field}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <Text style={styles.fieldValue}>{f.value}</Text>
          </View>
        ))}
        {reason ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Reason for Calling</Text>
            <Text style={styles.fieldValue}>{reason}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Calls</Text>
        <TouchableOpacity style={styles.callBtn} onPress={() => dialBlocked(callerPhone)}>
          <Text style={styles.callBtnText}>Call Back (*67)</Text>
        </TouchableOpacity>

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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  errorPage: { padding: 24 },
  loadingText: { textAlign: "center", color: "#5c6b7a", marginTop: 12 },
  errorBody: { color: "#0c2340", fontSize: 16, lineHeight: 22 },
  requested: { color: "#5c6b7a", fontSize: 13, marginTop: 8 },
  link: { color: "#14b8a6", marginTop: 16, fontSize: 16 },
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
