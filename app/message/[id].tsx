import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Image, TextInput, RefreshControl, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authorizedFetch, formatApiError, isMessageUuid, messageDetailUrl, routeParam, SignedOutError } from "../../lib/messageApi";
import { fieldsToShow } from "../../lib/messageFields";
import { dialDigits, formatUsPhone } from "../../lib/phone";
import {
  channelFor,
  firstName,
  initialTeammateId,
  isLegacyChannel,
  methodHint,
  METHOD_OPTIONS,
  orderTeammates,
  parseRedirectTargets,
  prefersLabel,
  sendButtonLabel,
  teammateLabel,
  type SendChoice,
  type Teammate,
} from "../../lib/redirect";

const BUTTON_HEIGHT = 48;
const BAR_TOP = 12;
const SCROLL_GAP = 24;

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
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectNote, setRedirectNote] = useState("");
  const [redirectError, setRedirectError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [readOverride, setReadOverride] = useState<boolean | null>(null);
  const [targetsPhase, setTargetsPhase] = useState<"loading" | "ready" | "fallback">("loading");
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [teammateId, setTeammateId] = useState<string | null>(null);
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [sendChoice, setSendChoice] = useState<SendChoice>("preference");
  const [openMenu, setOpenMenu] = useState<"who" | "how" | null>(null);
  const message = loaded?.id === messageId ? loaded.message : null;
  const activeId = useRef(messageId);
  activeId.current = messageId;
  const barHeight = BAR_TOP + BUTTON_HEIGHT + Math.max(insets.bottom, 12);
  const scrollPad = insets.bottom + BUTTON_HEIGHT + BAR_TOP + SCROLL_GAP;

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
        if (loaded?.id === requested) setRedirectError(text);
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
        if (loaded?.id === requested) setRedirectError(text);
        else {
          setErrorText(text);
          setPhase("error");
        }
        return;
      }
      setLoaded({ id: requested, message: data.message });
      setReadOverride(null);
      setPhase("ready");
      setErrorText("");
    } catch (e) {
      if (activeId.current !== requested) return;
      if (e instanceof SignedOutError) return router.replace("/");
      if (loaded?.id === requested) setRedirectError("Network error");
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

  useEffect(() => {
    if (!messageId) return;
    let cancel = false;
    setTargetsPhase("loading");
    setTeammates([]);
    setTeammateId(null);
    setSendChoice("preference");
    (async () => {
      try {
        const res = await authorizedFetch("https://jicagents.com/api/mobile/redirect-targets");
        if (cancel) return;
        if (res.status === 404 || !res.ok) {
          setTargetsPhase("fallback");
          return;
        }
        const parsed = parseRedirectTargets(await res.json());
        if (cancel) return;
        if (!parsed.teammates.length) {
          setTargetsPhase("fallback");
          return;
        }
        const ordered = orderTeammates(parsed.preferredId, parsed.teammates);
        setTeammates(ordered);
        setPreferredId(parsed.preferredId);
        setTeammateId(initialTeammateId(parsed.preferredId, ordered));
        setTargetsPhase("ready");
      } catch {
        if (!cancel) setTargetsPhase("fallback");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [messageId]);

  function dialBlocked(raw?: string) {
    const phone = dialDigits(raw || message?.caller_phone || preview.caller_phone || "");
    if (!phone) return setRedirectError("No phone number");
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
      if (res.ok) setNote("");
      else setRedirectError(formatApiError(res.status, await res.text()));
    } catch {
      setRedirectError("Couldn't save the note.");
    }
    setSaving(false);
  }

  async function sendRedirect() {
    if (!messageId || redirecting) return;
    const person = teammates.find((item) => item.id === teammateId) ?? null;
    if (targetsPhase === "ready" && !person) return;
    let channel = channelFor(sendChoice);
    setRedirecting(true);
    setRedirectError("");
    setRedirectNote("");
    const post = (next: typeof channel) => {
      const body: { message_id: string; channel: string; target_user_id?: string } = { message_id: messageId, channel: next };
      if (person) body.target_user_id = person.id;
      return authorizedFetch("https://jicagents.com/api/mobile/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    };
    try {
      let res = await post(channel);
      if (res.status === 400 && !isLegacyChannel(channel)) {
        channel = "text_mobile";
        res = await post(channel);
      }
      if (res.ok) {
        const who = person ? firstName(person.name) : "";
        setRedirectNote(person ? `Sent to ${who}.` : "Message sent.");
      } else {
        setRedirectError(formatApiError(res.status, await res.text()));
      }
    } catch {
      setRedirectError("Couldn't redirect. Try again.");
    }
    setRedirecting(false);
  }

  const person = teammates.find((item) => item.id === teammateId) ?? null;
  const buttonLabel = sendButtonLabel(targetsPhase === "ready" ? person?.name ?? null : null, sendChoice);

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.errorPage, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
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
  const unread = readOverride === null ? status === "new" : !readOverride;
  const fields = fieldsToShow(Array.isArray(message.fields) ? message.fields : [], reason, [callerName, callerPhone]);
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: scrollPad }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#14b8a6" />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Image source={require("../../assets/jic-logo-mark.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="JIC Agents" />
        </View>
        <View style={styles.content}>
          <View style={styles.callerRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{callerName[0] || "?"}</Text></View>
            <View style={styles.callerMain}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{callerName}</Text>
                <TouchableOpacity
                  style={[styles.pill, unread ? styles.pillUnread : styles.pillRead]}
                  onPress={() => setReadOverride(unread)}
                  accessibilityRole="button"
                  accessibilityLabel={unread ? "Mark as read" : "Mark as unread"}
                >
                  <Text style={[styles.pillText, unread ? styles.pillTextUnread : styles.pillTextRead]}>{unread ? "Unread" : "Read"}</Text>
                </TouchableOpacity>
              </View>
              {callerPhone ? (
                <TouchableOpacity onPress={() => dialBlocked(callerPhone)}>
                  <Text style={styles.phone}>{formatUsPhone(callerPhone)}</Text>
                </TouchableOpacity>
              ) : null}
              {createdAt ? <Text style={styles.date}>{new Date(createdAt).toLocaleString()}</Text> : null}
            </View>
          </View>

          <TouchableOpacity style={styles.callBtn} onPress={() => dialBlocked(callerPhone)}>
            <Text style={styles.callBtnText}>Call {firstName(callerName)}</Text>
            <Text style={styles.callCaption}>*67 blocks your caller ID</Text>
          </TouchableOpacity>

          {fields.length ? <Text style={styles.section}>Message details</Text> : null}
          {fields.map((field, index) => (
            <View key={`${field.label}-${index}`} style={styles.field}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldValue}>{field.value}</Text>
            </View>
          ))}

          {reason ? (
            <>
              <Text style={styles.section}>Reason for calling</Text>
              <View style={styles.field}>
                <Text style={styles.fieldValue}>{reason}</Text>
              </View>
            </>
          ) : null}

          <Text style={styles.section}>Dispatch note</Text>
          <View style={styles.noteRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note..."
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <TouchableOpacity style={styles.noteBtn} onPress={saveNote} disabled={saving || !note.trim()}>
              <Text style={styles.noteBtnText}>{saving ? "Saving" : "Save"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.section}>Redirect</Text>
          {targetsPhase === "loading" ? <Text style={styles.hint}>Loading people...</Text> : null}
          {targetsPhase === "ready" ? (
            <View style={styles.block}>
              <Text style={styles.menuLabel}>Send to</Text>
              <TouchableOpacity style={styles.drop} onPress={() => setOpenMenu(openMenu === "who" ? null : "who")} accessibilityRole="button">
                <Text style={styles.dropText}>{person ? teammateLabel(person, preferredId) : "Choose a person"}</Text>
                <Text style={styles.chevron}>{openMenu === "who" ? "▴" : "▾"}</Text>
              </TouchableOpacity>
              {openMenu === "who" ? (
                <View style={styles.menu}>
                  {teammates.map((item) => {
                    const selected = item.id === teammateId;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.person, selected && styles.personOn]}
                        onPress={() => {
                          setTeammateId(item.id);
                          setSendChoice("preference");
                          setOpenMenu(null);
                        }}
                      >
                        <View style={styles.miniAvatar}><Text style={styles.miniAvatarText}>{item.name[0] || "?"}</Text></View>
                        <View style={styles.personText}>
                          <Text style={styles.personName}>{teammateLabel(item, preferredId)}</Text>
                          {item.role ? <Text style={styles.personMeta}>{item.role}</Text> : null}
                          <Text style={styles.personMeta}>{prefersLabel(item.preferredMethod)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.menuLabel}>{person ? `How to reach ${firstName(person.name)}` : "How"}</Text>
            <TouchableOpacity style={styles.drop} onPress={() => setOpenMenu(openMenu === "how" ? null : "how")} accessibilityRole="button">
              <Text style={styles.dropText}>{sendChoice === "preference" ? "Their preference" : METHOD_OPTIONS.find((option) => option.id === sendChoice)?.label}</Text>
              <Text style={styles.chevron}>{openMenu === "how" ? "▴" : "▾"}</Text>
            </TouchableOpacity>
            {openMenu === "how" ? (
              <View style={styles.menu}>
                <TouchableOpacity style={[styles.method, sendChoice === "preference" && styles.personOn]} onPress={() => { setSendChoice("preference"); setOpenMenu(null); }}>
                  <Text style={styles.personName}>Their preference</Text>
                </TouchableOpacity>
                {METHOD_OPTIONS.map((option) => {
                  const enabled = person ? person.available[option.id] : true;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.method, !enabled && styles.methodOff, sendChoice === option.id && styles.personOn]}
                      disabled={!enabled}
                      onPress={() => { setSendChoice(option.id); setOpenMenu(null); }}
                    >
                      <Text style={styles.personName}>{option.label}</Text>
                      {!enabled ? <Text style={styles.personMeta}>Not set up</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
            <Text style={styles.hint}>{methodHint(sendChoice)}</Text>
            {redirectNote ? <Text style={styles.ok}>{redirectNote}</Text> : null}
            {redirectError ? <Text style={styles.fail}>{redirectError}</Text> : null}
          </View>
        </View>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={[styles.sendBtn, (redirecting || targetsPhase === "loading") && styles.sendOff]} disabled={redirecting || targetsPhase === "loading"} onPress={sendRedirect}>
          <Text style={styles.sendText}>{redirecting ? "Sending..." : buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  errorPage: { padding: 24 },
  loadingText: { textAlign: "center", color: "#5c6b7a", marginTop: 12 },
  errorBody: { color: "#0c2340", fontSize: 16, lineHeight: 22 },
  requested: { color: "#5c6b7a", fontSize: 13, marginTop: 8 },
  link: { color: "#14b8a6", marginTop: 16, fontSize: 16 },
  header: { backgroundColor: "#0c2340", flexDirection: "row", alignItems: "center", paddingBottom: 8, paddingHorizontal: 16 },
  back: { color: "#fff", fontSize: 24, marginRight: 8, minWidth: 32 },
  logo: { width: 168, height: 88, backgroundColor: "transparent", flexShrink: 1 },
  content: { padding: 16 },
  callerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#e0f2f1", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#14b8a6", fontWeight: "700", fontSize: 20 },
  callerMain: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { flex: 1, fontSize: 18, fontWeight: "700", color: "#0c2340", flexShrink: 1 },
  phone: { color: "#14b8a6", fontSize: 14, textDecorationLine: "underline", marginTop: 2 },
  date: { color: "#7d8ea5", fontSize: 12, marginTop: 2 },
  pill: { minHeight: 32, paddingHorizontal: 10, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pillUnread: { backgroundColor: "#14b8a6" },
  pillRead: { backgroundColor: "#e0f2f1", borderWidth: 1, borderColor: "#14b8a6" },
  pillText: { fontSize: 13, fontWeight: "700" },
  pillTextUnread: { color: "#0c2340" },
  pillTextRead: { color: "#0f766e" },
  section: { fontSize: 16, fontWeight: "700", color: "#0c2340", marginTop: 16, marginBottom: 8 },
  field: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 8 },
  fieldLabel: { color: "#7d8ea5", fontSize: 12, marginBottom: 4 },
  fieldValue: { color: "#0c2340", fontSize: 15, lineHeight: 21 },
  callBtn: { backgroundColor: "#14b8a6", borderRadius: 8, minHeight: 48, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  callBtnText: { color: "#0c2340", fontWeight: "700", fontSize: 16 },
  callCaption: { color: "#134e4a", fontSize: 12, marginTop: 2 },
  noteRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  noteInput: { flex: 1, backgroundColor: "#fff", borderRadius: 8, padding: 12, minHeight: 72, textAlignVertical: "top", color: "#0c2340", fontSize: 15 },
  noteBtn: { backgroundColor: "#0c2340", borderRadius: 8, minHeight: 44, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  noteBtnText: { color: "#fff", fontWeight: "700" },
  block: { marginBottom: 8 },
  menuLabel: { color: "#5c6b7a", fontSize: 13, marginBottom: 6 },
  drop: { minHeight: 48, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  dropText: { flex: 1, color: "#0c2340", fontSize: 16 },
  chevron: { color: "#0c2340", fontSize: 14 },
  menu: { marginTop: 6, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" },
  person: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  personOn: { backgroundColor: "#e0f2f1" },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ccfbf1", alignItems: "center", justifyContent: "center" },
  miniAvatarText: { color: "#0f766e", fontWeight: "700" },
  personText: { flex: 1 },
  personName: { color: "#0c2340", fontSize: 15, fontWeight: "600" },
  personMeta: { color: "#5c6b7a", fontSize: 13, marginTop: 1 },
  method: { paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  methodOff: { opacity: 0.45 },
  hint: { color: "#5c6b7a", fontSize: 13, lineHeight: 18, marginTop: 6 },
  ok: { color: "#0f766e", fontSize: 13, marginTop: 6 },
  fail: { color: "#e11d48", fontSize: 13, marginTop: 6 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: BAR_TOP, paddingHorizontal: 16 },
  sendBtn: { minHeight: BUTTON_HEIGHT, borderRadius: 8, backgroundColor: "#14b8a6", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  sendOff: { opacity: 0.6 },
  sendText: { color: "#0c2340", fontWeight: "700", fontSize: 16, textAlign: "center" },
});
