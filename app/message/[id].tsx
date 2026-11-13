import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, View, Text, StyleSheet, Pressable, Linking, ScrollView, TextInput, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authorizedFetch, formatApiError, isMessageUuid, messageDetailUrl, routeParam, SignedOutError } from "../../lib/messageApi";
import { messageContent } from "../../lib/messageFields";
import { Avatar, Card, ReadPill, ScreenHeader, SectionLabel, Toast } from "../../components/ui";
import { BOTTOM_GAP, colors, radius, space, type } from "../../lib/theme";
import { formatUsPhone } from "../../lib/phone";
import { loadPrefs } from "../../lib/prefsStore";
import { syncRemindersFromServer } from "../../lib/reminders";
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
/**
 * The call button dials *67 before the number (existing behavior). Whether that actually hides the
 * caller id depends on the carrier and has not been confirmed for this team, so the caption does not
 * promise it. Flip to true only after a verified test call shows "No Caller ID".
 */
const HIDDEN_NUMBER_VERIFIED = false;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const message = loaded?.id === messageId ? loaded.message : null;
  const activeId = useRef(messageId);
  activeId.current = messageId;
  const markedRead = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedNoteRef = useRef("");

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
        if (leaveIfSignedOut(res.status)) return;
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
      } catch (error) {
        if (cancel || leaveIfSignedOut(error)) return;
        setTeamHidden(true);
        say("Could not load your team");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [messageId]);

  useEffect(() => {
    setNote("");
    setSavedNote("");
    savedNoteRef.current = "";
    setJustSaved(false);
    setMoreOpen(false);
  }, [messageId]);

  useEffect(() => {
    if (!message || !messageId) return;
    const initialNote = String(message.note ?? message.dispatch_note ?? "");
    // Keep an unsaved draft, including a cleared box, across pull-to-refresh.
    const previousSaved = savedNoteRef.current;
    setNote((current) => (current.trim() !== previousSaved.trim() ? current : initialNote));
    setSavedNote(initialNote);
    savedNoteRef.current = initialNote;
    const alreadyRead = messageIsRead(message, preview.status);
    setRead(alreadyRead);
    if (alreadyRead || markedRead.current === messageId) return;
    markedRead.current = messageId;
    setRead(true);
    postRead(messageId, true).catch((error) => {
      if (markedRead.current === messageId) markedRead.current = null;
      setRead(false);
      if (leaveIfSignedOut(error)) return;
      say("Could not update");
    });
  }, [messageId, message]);

  const person = useMemo(() => team.find((member) => member.id === toId) ?? null, [team, toId]);
  const effective: Method | null = person ? (method ?? person.pref) : null;
  const noteClean = note.trim() === savedNote.trim();

  async function toggleRead() {
    if (!messageId) return;
    const next = !read;
    setRead(next);
    try {
      await postRead(messageId, next);
    } catch (error) {
      setRead(!next);
      if (leaveIfSignedOut(error)) return;
      say("Could not update");
    }
  }

  async function saveNote() {
    if (!messageId || noteClean || saving) return;
    setJustSaved(false);
    setSaving(true);
    try {
      const res = await authorizedFetch("https://jicagents.com/api/mobile/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, note }),
      });
      if (leaveIfSignedOut(res.status)) return;
      if (!res.ok) {
        say("Could not save the note");
        return;
      }
      let stored = note.trim();
      try {
        const data = (await res.json()) as { note?: unknown };
        if (typeof data?.note === "string") stored = data.note;
      } catch {
        // Older server answers { ok: true } only.
      }
      setNote(stored);
      setSavedNote(stored);
      savedNoteRef.current = stored;
      setJustSaved(true);
      say("Note saved");
    } catch (error) {
      if (leaveIfSignedOut(error)) return;
      say("Could not save the note");
    } finally {
      setSaving(false);
    }
  }

  function callCaller(raw: string) {
    if (!raw) return;
    Linking.openURL("tel:" + encodeURIComponent("*67") + encodeURIComponent(raw));
  }

  /** Texts and emails are not secure channels. Ask before sending message details through them. */
  function confirmSend() {
    if (!person || !effective || busy) return;
    if (effective === "app") {
      void send();
      return;
    }
    const channel = effective === "call" ? "a phone call" : effective === "text" ? "a text message" : effective === "email" ? "an email" : "a text and an email";
    Alert.alert(
      "Send outside the app?",
      `This sends the caller's details by ${channel}. Texts, emails and calls are not secure, so only send what you are allowed to share this way. App notifications keep the message inside JIC Messages.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send anyway", style: "destructive", onPress: () => void send() },
      ],
    );
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
      if (leaveIfSignedOut(res.status)) return;
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
      if (leaveIfSignedOut(e)) return;
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
      <View style={styles.container}>
        <ScreenHeader back />
        <ActivityIndicator color={colors.teal} style={{ marginTop: 48 }} />
        <Text style={styles.loadingText}>{preview.caller_name ? `Loading ${preview.caller_name}…` : "Loading…"}</Text>
      </View>
    );
  }

  if (phase === "error" && !message) {
    return (
      <View style={styles.container}>
        <ScreenHeader back />
        <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + BOTTOM_GAP }]}>
          <Card>
            <Text style={styles.body}>{errorText}</Text>
            {messageId ? (
              <Text style={styles.muted}>
                Requested id: {messageId}
                {isMessageUuid(messageId) ? "" : " (not a message UUID)"}
              </Text>
            ) : null}
            <Pressable onPress={refresh} style={styles.linkBtn}><Text style={styles.link}>Try again</Text></Pressable>
            <Pressable onPress={() => router.back()} style={styles.linkBtn}><Text style={styles.link}>Go back</Text></Pressable>
          </Card>
        </ScrollView>
      </View>
    );
  }
  if (!message) return <View style={styles.container}><ScreenHeader back /><Text style={styles.loadingText}>Loading…</Text></View>;

  const content = messageContent(message, preview);
  const callerName = content.callerName || "Unknown caller";
  const callerPhone = content.callerPhone;
  const reason = content.reason;
  const extras = content.additional;
  const createdAt = stringOr(message.created_at, preview.created_at);
  const callerLabel = callerName === "Unknown caller" ? "caller" : firstName(callerName) || callerName;
  const when = formatWhen(createdAt);
  const sendLabel = !person ? "Choose a teammate" : method ? `Send to ${firstName(person.name)} by ${METHOD_SHORT[method]}` : `Send to ${firstName(person.name)}`;
  const saveLabel = saving ? "Saving…" : noteClean ? (justSaved || savedNote ? "Saved" : "Save") : "Save";

  function toggleMore() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMoreOpen((value) => !value);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + BOTTOM_GAP }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} colors={[colors.teal]} progressBackgroundColor={colors.surface} />}
        >
          <Card style={styles.callerCard}>
            <View style={styles.nameRow}>
              <Avatar name={callerName} size={54} />
              <View style={styles.nameMain}>
                <Text style={styles.name} numberOfLines={2}>{callerName}</Text>
                {callerPhone ? (
                  <Text onPress={() => callCaller(callerPhone)} style={styles.phone} accessibilityRole="link">{formatUsPhone(callerPhone)}</Text>
                ) : null}
                {when ? <Text style={styles.date}>{when}</Text> : null}
              </View>
              <ReadPill read={read} onPress={toggleRead} />
            </View>
            {content.formName ? <Text style={styles.formName}>{content.formName}</Text> : null}
          </Card>

          {reason ? (
            <Card>
              <SectionLabel>Reason for calling</SectionLabel>
              <Text style={styles.reason} selectable>{reason}</Text>
            </Card>
          ) : null}

          {extras.length ? (
            <Card style={styles.noPad}>
              <Pressable
                onPress={toggleMore}
                style={styles.accordionHead}
                accessibilityRole="button"
                accessibilityState={{ expanded: moreOpen }}
                accessibilityLabel={`Additional information, ${extras.length} ${extras.length === 1 ? "item" : "items"}`}
              >
                <Text style={styles.accordionTitle}>Additional information ({extras.length})</Text>
                <Text style={[styles.chevron, moreOpen && styles.chevronOpen]}>⌄</Text>
              </Pressable>
              {moreOpen ? (
                <View style={styles.accordionBody}>
                  {extras.map((field, index) => (
                    <View key={`${field.label}-${index}`} style={[styles.fieldRow, index > 0 && styles.fieldDivider]}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <Text style={styles.fieldValue} selectable>{field.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          <View>
            <Pressable
              style={({ pressed }) => [styles.callBtn, !callerPhone && styles.callOff, pressed && { opacity: 0.85 }]}
              onPress={() => callCaller(callerPhone)}
              disabled={!callerPhone}
              accessibilityRole="button"
              accessibilityLabel={`Call ${callerLabel}`}
            >
              <Text style={[styles.callIcon, !callerPhone && styles.callTextOff]}>✆</Text>
              <Text style={[styles.callText, !callerPhone && styles.callTextOff]}>Call {callerLabel}</Text>
            </Pressable>
            <Text style={styles.callCaption}>{HIDDEN_NUMBER_VERIFIED ? "Your number is hidden (*67)" : "Dials *67 first. Number hiding depends on your carrier."}</Text>
          </View>

          <Card>
            <SectionLabel>Dispatch note</SectionLabel>
            <View style={styles.noteRow}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={(value) => { setNote(value); setJustSaved(false); }}
                placeholder="Add a note for your team"
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={2000}
              />
              <Pressable
                style={[styles.saveBtn, noteClean ? styles.saveClean : styles.saveDirty]}
                onPress={saveNote}
                disabled={noteClean || saving}
                accessibilityRole="button"
                accessibilityLabel={saveLabel}
              >
                <Text style={[styles.saveText, noteClean ? styles.saveTextClean : styles.saveTextDirty]}>{saveLabel}</Text>
              </Pressable>
            </View>
          </Card>

          <Card>
            <Text style={styles.redirectTitle} accessibilityRole="header">Redirect message</Text>
            {teamHidden ? (
              <Text style={styles.hint}>Redirect to a teammate is not available right now.</Text>
            ) : (
              <>
                <SectionLabel>Send to</SectionLabel>
                <Pressable
                  style={[styles.combo, open && styles.comboOpen]}
                  onPress={() => { setOpen((value) => !value); setMethodOpen(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                >
                  {person ? (
                    <View style={styles.comboMain}>
                      <Avatar name={person.name} size={36} />
                      <View style={styles.comboText}>
                        <Text style={styles.comboName}>{person.name}</Text>
                        {person.role ? <Text style={styles.role}>{person.role}</Text> : null}
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.placeholder}>Choose a teammate</Text>
                  )}
                  <Text style={[styles.caret, open && styles.chevronOpen]}>⌄</Text>
                </Pressable>
                {open ? (
                  <View style={styles.list}>
                    {team.length === 0 ? <Text style={styles.empty}>No other teammates yet</Text> : null}
                    {team.map((member, index) => (
                      <Pressable
                        key={member.id}
                        style={[styles.member, index > 0 && styles.fieldDivider, member.id === toId && styles.memberOn]}
                        onPress={() => { setToId(member.id); setMethod(null); setOpen(false); setMethodOpen(false); }}
                      >
                        <Avatar name={member.name} size={36} />
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
                    <SectionLabel style={styles.howLabel}>How to reach {firstName(person.name)}</SectionLabel>
                    <Pressable
                      style={[styles.combo, methodOpen && styles.comboOpen]}
                      onPress={() => { setMethodOpen((value) => !value); setOpen(false); }}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: methodOpen }}
                    >
                      <Text style={styles.methodIcon}>{method ? METHOD_ICON[method] : "⭐"}</Text>
                      <View style={styles.comboText}>
                        <Text style={styles.comboName}>{method ? METHOD_LABEL[method] : "Their preference"}</Text>
                        {method == null ? <Text style={styles.role}>{METHOD_LABEL[person.pref]}</Text> : null}
                      </View>
                      <Text style={[styles.caret, methodOpen && styles.chevronOpen]}>⌄</Text>
                    </Pressable>
                    {methodOpen ? (
                      <View style={styles.list}>
                        <Pressable style={[styles.member, method == null && styles.memberOn]} onPress={() => { setMethod(null); setMethodOpen(false); }}>
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
                              style={[styles.member, styles.fieldDivider, !enabled && styles.memberOff, method === item && styles.memberOn]}
                              disabled={!enabled}
                              onPress={() => { setMethod(item); setMethodOpen(false); }}
                              accessibilityState={{ disabled: !enabled, selected: method === item }}
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
                    {effective && effective !== "app" ? <Text style={styles.hint}>⚠ Not secure: only the app notification keeps the message inside JIC Messages.</Text> : null}
                  </>
                ) : null}

                <Pressable
                  style={({ pressed }) => [styles.sendBtn, !person && styles.sendIdle, pressed && person && { opacity: 0.85 }]}
                  disabled={!person || busy}
                  onPress={confirmSend}
                  accessibilityRole="button"
                >
                  {busy ? <ActivityIndicator color={colors.tealInk} /> : <Text style={[styles.sendText, !person && styles.sendTextIdle]}>{sendLabel}</Text>}
                </Pressable>
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast text={toast} bottom={insets.bottom + 24} />
    </View>
  );
}

function leaveIfSignedOut(errorOrStatus: unknown): boolean {
  if (errorOrStatus instanceof SignedOutError || errorOrStatus === 401) {
    router.replace("/");
    return true;
  }
  return false;
}

async function postRead(id: string, next: boolean) {
  const res = await authorizedFetch("https://jicagents.com/api/mobile/message-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, read: next }),
  });
  if (res.status === 401) throw new SignedOutError();
  if (!res.ok) throw new Error("Could not update");
  // Opening or un-reading a message changes the unread count, so refresh the phone's reminder.
  loadPrefs().then((p) => syncRemindersFromServer(p.repeatMin)).catch(() => {});
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
  container: { flex: 1, backgroundColor: colors.bg },
  page: { padding: space.lg, gap: space.lg },
  loadingText: { textAlign: "center", color: colors.textMuted, marginTop: space.md },
  body: { ...type.body },
  muted: { ...type.muted, marginTop: space.sm },
  linkBtn: { marginTop: space.lg, minHeight: 40, justifyContent: "center" },
  link: { color: colors.aqua, fontSize: 16, fontWeight: "700" },
  callerCard: { paddingVertical: space.lg },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  nameMain: { flex: 1 },
  name: { fontSize: 22, fontWeight: "800", color: colors.text },
  phone: { fontSize: 16, color: colors.aqua, marginTop: 3, fontWeight: "600" },
  date: { fontSize: 13, color: colors.textFaint, marginTop: 3 },
  formName: { marginTop: space.md, fontSize: 12.5, color: colors.textFaint },
  reason: { fontSize: 18, lineHeight: 26, color: colors.text },
  noPad: { padding: 0 },
  accordionHead: { minHeight: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg },
  accordionTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  chevron: { color: colors.aqua, fontSize: 22, lineHeight: 22, marginTop: -8 },
  chevronOpen: { transform: [{ rotate: "180deg" }], marginTop: 8 },
  accordionBody: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: space.lg, paddingBottom: space.sm },
  fieldRow: { paddingVertical: space.md },
  fieldDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  fieldLabel: { fontSize: 12.5, color: colors.textMuted, marginBottom: 3, fontWeight: "600" },
  fieldValue: { fontSize: 16, lineHeight: 22, color: colors.text },
  callBtn: { minHeight: 58, borderRadius: radius.md, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg, flexDirection: "row", gap: space.sm },
  callOff: { backgroundColor: colors.surfaceHigh },
  callIcon: { fontSize: 20, color: colors.tealInk, fontWeight: "800" },
  callText: { fontSize: 17.5, fontWeight: "800", color: colors.tealInk },
  callTextOff: { color: colors.textFaint },
  callCaption: { textAlign: "center", fontSize: 12.5, color: colors.textFaint, marginTop: space.sm },
  noteRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  noteInput: { flex: 1, minHeight: 50, maxHeight: 160, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 12, color: colors.text, fontSize: 15.5, textAlignVertical: "top" },
  saveBtn: { minHeight: 50, minWidth: 84, paddingHorizontal: space.lg, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  saveClean: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder },
  saveDirty: { backgroundColor: colors.teal },
  saveText: { fontWeight: "800", fontSize: 15 },
  saveTextClean: { color: colors.aqua },
  saveTextDirty: { color: colors.tealInk },
  redirectTitle: { ...type.h2, marginBottom: space.md },
  combo: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, paddingHorizontal: space.md, flexDirection: "row", alignItems: "center", gap: space.md },
  comboOpen: { borderColor: colors.teal },
  comboMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },
  comboText: { flex: 1 },
  comboName: { fontSize: 16, fontWeight: "700", color: colors.text },
  placeholder: { flex: 1, fontSize: 16, color: colors.textFaint },
  caret: { color: colors.aqua, fontSize: 22, lineHeight: 22, marginTop: -8 },
  list: { marginTop: space.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.bgDeep },
  empty: { padding: 14, color: colors.textMuted, fontSize: 14 },
  member: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  memberOn: { backgroundColor: "rgba(0,199,199,0.10)" },
  memberOff: { opacity: 0.45 },
  memberName: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  role: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  prefers: { fontSize: 12.5, color: colors.textFaint },
  methodIcon: { fontSize: 17, width: 28, textAlign: "center" },
  howLabel: { marginTop: space.lg },
  hint: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, marginTop: space.sm },
  sendBtn: { marginTop: space.lg, minHeight: SEND_HEIGHT, borderRadius: radius.md, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  sendIdle: { backgroundColor: colors.surfaceHigh },
  sendText: { fontSize: 16.5, fontWeight: "800", color: colors.tealInk, textAlign: "center" },
  sendTextIdle: { color: colors.textFaint },
});
