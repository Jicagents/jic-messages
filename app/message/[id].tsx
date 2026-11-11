import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Linking, ScrollView, Image, TextInput, RefreshControl, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authorizedFetch, formatApiError, isMessageUuid, messageDetailUrl, routeParam, SignedOutError } from "../../lib/messageApi";
import { fieldsToShow } from "../../lib/messageFields";
import { formatUsPhone } from "../../lib/phone";
import {
  ALL_METHODS,
  firstName,
  messageIsRead,
  METHOD_HINT,
  METHOD_ICON,
  METHOD_LABEL,
  METHOD_SHORT,
  parseTeam,
  redirectErrorMessage,
  type Method,
  type TeamMember,
} from "../../lib/redirect";

const SEND_HEIGHT = 54;

export default function MessageDetail() {
  const insets = useSafeAreaInsets();
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
  const [savedNote, setSavedNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [read, setRead] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamHidden, setTeamHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [toId, setToId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const message = loaded?.id === messageId ? loaded.message : null;
  const activeId = useRef(messageId);
  activeId.current = messageId;
  const markedRead = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);

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
        if (loaded?.id === requested) say(text);
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
        if (loaded?.id === requested) say(text);
        else {
          setErrorText(text);
          setPhase("error");
        }
        return;
      }
      setLoaded({ id: requested, message: data.message });
      setPhase("ready");
    } catch (e) {
      if (activeId.current !== requested) return;
      if (e instanceof SignedOutError) return router.replace("/");
      if (loaded?.id === requested) say("Network error");
      else {
        setErrorText("Network error");
        setPhase("error");
      }
    }
  }, [loaded, messageId, say]);

  useEffect(() => {
    if (!messageId) return;
    load();
  }, [messageId]);

  useEffect(() => {
    if (!messageId) return;
    let cancel = false;
    setTeam([]);
    setTeamHidden(false);
    setToId(null);
    setMethod(null);
    (async () => {
      try {
        const res = await authorizedFetch("https://jicagents.com/api/mobile/team");
        if (cancel) return;
        if (res.status === 404) {
          setTeamHidden(true);
          return;
        }
        if (!res.ok) {
          setTeamHidden(true);
          say("Could not load your team");
          return;
        }
        setTeam(parseTeam(await res.json()));
      } catch {
        if (!cancel) {
          setTeamHidden(true);
          say("Could not load your team");
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [messageId]);

  useEffect(() => {
    if (!message || !messageId) return;
    const initialNote = String(message.note ?? message.dispatch_note ?? "");
    setNote(initialNote);
    setSavedNote(initialNote);
    const alreadyRead = messageIsRead(message, preview.status);
    setRead(alreadyRead);
    if (alreadyRead || markedRead.current === messageId) return;
    markedRead.current = messageId;
    setRead(true);
    postRead(messageId, true).catch(() => {
      setRead(false);
      say("Could not update");
    });
  }, [messageId, message]);

  const person = useMemo(() => team.find((member) => member.id === toId) ?? null, [team, toId]);
  const effective: Method | null = person ? (method ?? person.pref) : null;
  const noteClean = note === savedNote;

  async function toggleRead() {
    if (!messageId) return;
    const next = !read;
    setRead(next);
    try {
      await postRead(messageId, next);
    } catch {
      setRead(!next);
      say("Could not update");
    }
  }

  async function saveNote() {
    if (!messageId || noteClean || saving) return;
    setSaving(true);
    try {
      const res = await authorizedFetch("https://jicagents.com/api/mobile/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, note }),
      });
      if (!res.ok) {
        say("Could not save the note");
        return;
      }
      setSavedNote(note);
      say("Note saved");
    } catch {
      say("Could not save the note");
    } finally {
      setSaving(false);
    }
  }

  function callCaller(raw: string) {
    if (!raw) return;
    Linking.openURL("tel:" + encodeURIComponent("*67") + encodeURIComponent(raw));
  }

  async function send() {
    if (!person || !effective || busy || !messageId) return;
    setBusy(true);
    try {
      const body: { message_id: string; toMemberId: string; method?: Method } = {
        message_id: messageId,
        toMemberId: person.id,
      };
      if (method) body.method = method;
      const res = await authorizedFetch("https://jicagents.com/api/mobile/message-redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(redirectErrorMessage(res.status, text));
      let sent: Method = effective;
      let fellBack = false;
      try {
        const data = JSON.parse(text) as { method?: unknown; fellBack?: unknown };
        if (isKnownMethod(data.method)) sent = data.method;
        fellBack = data.fellBack === true;
      } catch {
        fellBack = false;
      }
      const who = firstName(person.name);
      say(fellBack ? `Sent to ${who} by ${METHOD_SHORT[sent]} (${METHOD_SHORT[effective]} was not available)` : `Sent to ${person.name} by ${METHOD_SHORT[sent]}`);
    } catch (e) {
      say(e instanceof Error ? e.message : "Could not send. Try another way.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!messageId || (phase === "loading" && !message)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#14b8a6" style={{ marginTop: 48 }} />
        <Text style={styles.loadingText}>{preview.caller_name ? `Loading ${preview.caller_name}...` : "Loading..."}</Text>
      </View>
    );
  }

  if (phase === "error" && !message) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.errorPage, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + SEND_HEIGHT }]}>
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
  if (!message) return <View style={styles.container}><Text style={styles.loadingText}>Loading...</Text></View>;

  const callerName = stringOr(message.caller_name, preview.caller_name) || "Unknown caller";
  const callerPhone = stringOr(message.caller_phone, preview.caller_phone);
  const reason = stringOr(message.message_text, message.reason, preview.message_text);
  const createdAt = stringOr(message.created_at, preview.created_at);
  const fields = fieldsToShow(Array.isArray(message.fields) ? message.fields : [], reason, [callerName, callerPhone]);
  const callerLabel = callerName === "Unknown caller" ? "caller" : callerName;
  const when = formatWhen(createdAt);
  const sendLabel = !person ? "Send to…" : method ? `Send to ${firstName(person.name)} by ${METHOD_SHORT[method]}` : `Send to ${firstName(person.name)}`;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + SEND_HEIGHT }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#14b8a6" />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <View style={styles.logoPill}>
            <Image source={require("../../assets/jic-logo-mark.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="JIC Agents" />
          </View>
        </View>

        <View style={styles.nameRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(callerName || "?")[0]}</Text></View>
          <View style={styles.nameMain}>
            <Text style={styles.name}>{callerName}</Text>
            {callerPhone ? (
              <Text onPress={() => callCaller(callerPhone)} style={styles.phone}>{formatUsPhone(callerPhone)}</Text>
            ) : null}
            {when ? <Text style={styles.date}>{when}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: read }}
            accessibilityLabel="Read status. Tap to change."
            onPress={toggleRead}
            style={[styles.pill, read ? styles.pillRead : styles.pillUnread]}
          >
            <Text style={[styles.pillText, read ? styles.pillTextRead : styles.pillTextUnread]}>{read ? "✓ Read" : "Unread"}</Text>
          </Pressable>
        </View>

        {fields.length ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Message details</Text>
            {fields.map((field, index) => (
              <View key={`${field.label}-${index}`} style={index ? styles.fieldGap : undefined}>
                <Text style={styles.kicker}>{field.label}</Text>
                <Text style={styles.body}>{field.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {reason ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Reason for calling</Text>
            <Text style={styles.body}>{reason}</Text>
          </View>
        ) : null}

        <Pressable style={styles.callBtn} onPress={() => callCaller(callerPhone)} disabled={!callerPhone}>
          <Text style={styles.callText}>Call {callerLabel}</Text>
        </Pressable>
        <Text style={styles.callCaption}>Your number is hidden (*67)</Text>

        <View style={styles.card}>
          <Text style={styles.kicker}>Dispatch note</Text>
          <View style={styles.noteRow}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={(value) => setNote(value)}
              placeholder="Add a note for your team"
              placeholderTextColor="#6b7a90"
              multiline
            />
            <Pressable
              style={[styles.saveBtn, noteClean ? styles.saveClean : styles.saveDirty]}
              onPress={saveNote}
              disabled={noteClean || saving}
            >
              <Text style={[styles.saveText, noteClean ? styles.saveTextClean : styles.saveTextDirty]}>{noteClean ? "Saved" : saving ? "Saving" : "Save"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.redirectTitle} accessibilityRole="header">Redirect message</Text>
          {teamHidden ? (
            <Text style={styles.hint}>Redirect to a teammate is not available right now.</Text>
          ) : (
            <>
              <Text style={styles.kicker}>Send to</Text>
              <Pressable
                style={[styles.combo, open && styles.comboOpen]}
                onPress={() => { setOpen((value) => !value); setMethodOpen(false); }}
                accessibilityRole="button"
              >
                {person ? (
                  <View style={styles.comboMain}>
                    <Avatar name={person.name} />
                    <View style={styles.comboText}>
                      <Text style={styles.comboName}>{person.name}</Text>
                      {person.role ? <Text style={styles.role}>{person.role}</Text> : null}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.placeholder}>Choose a teammate</Text>
                )}
                <Text style={styles.caret}>{open ? "▴" : "▾"}</Text>
              </Pressable>
              {open ? (
                <View style={styles.list}>
                  {team.length === 0 ? <Text style={styles.empty}>No other teammates yet</Text> : null}
                  {team.map((member) => (
                    <Pressable
                      key={member.id}
                      style={styles.member}
                      onPress={() => { setToId(member.id); setMethod(null); setOpen(false); setMethodOpen(false); }}
                    >
                      <Avatar name={member.name} />
                      <View style={styles.comboText}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {member.role ? <Text style={styles.role}>{member.role}</Text> : null}
                      </View>
                      <Text style={styles.prefers}>Prefers {METHOD_SHORT[member.pref]}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {person ? (
                <>
                  <Text style={[styles.kicker, styles.howLabel]}>How to reach {firstName(person.name)}</Text>
                  <Pressable
                    style={[styles.combo, methodOpen && styles.comboOpen, { minHeight: 52 }]}
                    onPress={() => { setMethodOpen((value) => !value); setOpen(false); }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.methodIcon}>{method ? METHOD_ICON[method] : "⭐"}</Text>
                    <View style={styles.comboText}>
                      <Text style={styles.comboName}>{method ? METHOD_LABEL[method] : "Their preference"}</Text>
                      {method == null ? <Text style={styles.role}>{METHOD_LABEL[person.pref]}</Text> : null}
                    </View>
                    <Text style={styles.caret}>{methodOpen ? "▴" : "▾"}</Text>
                  </Pressable>
                  {methodOpen ? (
                    <View style={styles.list}>
                      <Pressable style={styles.member} onPress={() => { setMethod(null); setMethodOpen(false); }}>
                        <Text style={styles.methodIcon}>⭐</Text>
                        <View style={styles.comboText}>
                          <Text style={styles.memberName}>Their preference</Text>
                          <Text style={styles.role}>{METHOD_LABEL[person.pref]}</Text>
                        </View>
                      </Pressable>
                      {ALL_METHODS.map((item) => {
                        const enabled = person.available.includes(item);
                        return (
                          <Pressable
                            key={item}
                            style={[styles.member, !enabled && styles.memberOff]}
                            disabled={!enabled}
                            onPress={() => { setMethod(item); setMethodOpen(false); }}
                          >
                            <Text style={styles.methodIcon}>{METHOD_ICON[item]}</Text>
                            <Text style={[styles.memberName, styles.comboText]}>{METHOD_LABEL[item]}</Text>
                            {!enabled ? <Text style={styles.prefers}>Not set up</Text> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                  {effective ? <Text style={styles.hint}>{METHOD_HINT[effective]}</Text> : null}
                </>
              ) : null}

              <Pressable
                style={[styles.sendBtn, !person && styles.sendIdle]}
                disabled={!person || busy}
                onPress={send}
              >
                {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={[styles.sendText, !person && styles.sendTextIdle]}>{sendLabel}</Text>}
              </Pressable>
            </>
          )}
          <Text style={styles.toast} accessibilityLiveRegion="polite">{toast}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.smallAvatar}>
      <Text style={styles.smallAvatarText}>{(name || "?")[0]}</Text>
    </View>
  );
}

async function postRead(id: string, next: boolean) {
  const res = await authorizedFetch("https://jicagents.com/api/mobile/message-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, read: next }),
  });
  if (!res.ok) throw new Error("Could not update");
}

function isKnownMethod(value: unknown): value is Method {
  return value === "text" || value === "email" || value === "call" || value === "app" || value === "text_email";
}

function stringOr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function formatWhen(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  page: { padding: 16, gap: 14 },
  errorPage: { padding: 24 },
  loadingText: { textAlign: "center", color: "#6b7a90", marginTop: 12 },
  errorBody: { color: "#0c2340", fontSize: 16, lineHeight: 22 },
  requested: { color: "#6b7a90", fontSize: 13, marginTop: 8 },
  link: { color: "#14b8a6", marginTop: 16, fontSize: 16 },
  header: { backgroundColor: "#0c2340", flexDirection: "row", alignItems: "center", marginHorizontal: -16, marginTop: -16, paddingBottom: 12, paddingHorizontal: 16, marginBottom: 2 },
  back: { color: "#fff", fontSize: 24, marginRight: 8, minWidth: 32 },
  logoPill: { backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  logo: { width: 120, height: 64 },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#dff3f0", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#0d9488" },
  nameMain: { flex: 1 },
  name: { fontSize: 21, fontWeight: "700", color: "#0c2340" },
  phone: { fontSize: 15, color: "#0d9488", textDecorationLine: "underline", marginTop: 2 },
  date: { fontSize: 13, color: "#6b7a90", marginTop: 2 },
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", borderWidth: 1 },
  pillRead: { borderColor: "#bfe6e1", backgroundColor: "#e6f6f3" },
  pillUnread: { borderColor: "#f2b8b8", backgroundColor: "#fde8e8" },
  pillText: { fontWeight: "700", fontSize: 13.5 },
  pillTextRead: { color: "#0d9488" },
  pillTextUnread: { color: "#b42318" },
  card: { backgroundColor: "#ffffff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#d7dfea" },
  kicker: { fontSize: 12.5, color: "#6b7a90", marginBottom: 4 },
  body: { fontSize: 17, lineHeight: 24, color: "#0c2340" },
  fieldGap: { marginTop: 12 },
  callBtn: { minHeight: 56, borderRadius: 14, backgroundColor: "#14b8a6", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  callText: { fontSize: 17, fontWeight: "700", color: "#04201c" },
  callCaption: { textAlign: "center", fontSize: 12.5, color: "#6b7a90", marginTop: -8 },
  noteRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  noteInput: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: "#d7dfea", borderRadius: 10, padding: 10, color: "#0c2340", fontSize: 15, textAlignVertical: "top" },
  saveBtn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  saveClean: { backgroundColor: "#e6f6f3" },
  saveDirty: { backgroundColor: "#0c2340" },
  saveText: { fontWeight: "700", fontSize: 15 },
  saveTextClean: { color: "#0d9488" },
  saveTextDirty: { color: "#ffffff" },
  redirectTitle: { fontSize: 16, fontWeight: "700", color: "#0c2340", marginBottom: 10 },
  combo: { minHeight: 56, borderWidth: 1, borderColor: "#d7dfea", borderRadius: 12, backgroundColor: "#f9fbfd", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  comboOpen: { borderColor: "#14b8a6" },
  comboMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  comboText: { flex: 1 },
  comboName: { fontSize: 16, fontWeight: "600", color: "#0c2340" },
  placeholder: { flex: 1, fontSize: 16, color: "#6b7a90" },
  caret: { color: "#0c2340", fontSize: 16 },
  list: { marginTop: 8, borderWidth: 1, borderColor: "#d7dfea", borderRadius: 12, overflow: "hidden", backgroundColor: "#ffffff" },
  empty: { padding: 14, color: "#6b7a90", fontSize: 14 },
  member: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  memberOff: { opacity: 0.5 },
  memberName: { fontSize: 15.5, fontWeight: "600", color: "#0c2340" },
  role: { fontSize: 12.5, color: "#6b7a90", marginTop: 1 },
  prefers: { fontSize: 12.5, color: "#6b7a90" },
  methodIcon: { fontSize: 16, width: 28, textAlign: "center" },
  howLabel: { marginTop: 14 },
  hint: { fontSize: 12.5, lineHeight: 18, color: "#6b7a90", marginTop: 8 },
  sendBtn: { marginTop: 14, minHeight: SEND_HEIGHT, borderRadius: 14, backgroundColor: "#0c2340", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  sendIdle: { backgroundColor: "#e3e9f1" },
  sendText: { fontSize: 16.5, fontWeight: "700", color: "#ffffff", textAlign: "center" },
  sendTextIdle: { color: "#6b7a90" },
  smallAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#dff3f0", alignItems: "center", justifyContent: "center" },
  smallAvatarText: { fontSize: 14, fontWeight: "700", color: "#0d9488" },
  toast: { minHeight: 20, textAlign: "center", fontSize: 13, fontWeight: "500", color: "#0d9488", marginTop: 8 },
});
