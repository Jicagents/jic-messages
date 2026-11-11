const API = "https://jicagents.com";

/** Query-param detail URL. The path form /api/mobile/message/<id> is not a route. */
export function messageDetailUrl(id: string) {
  return `${API}/api/mobile/message?id=${encodeURIComponent(id)}`;
}

export function messagesListUrl(filter: string, search: string) {
  return `${API}/api/mobile/messages?filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(search)}`;
}

export function routeParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Push opens use data.messageId, which the server sets to messages.id (UUID).
 * Ignore urls, call ids, and retell_call_id suffixes so a short ref is not substituted for the UUID.
 */
export function messageIdFromData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const raw = record.messageId ?? record.message_id;
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return id || null;
}

export function isMessageUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Surface the JSON error body (`error` or `message`) instead of the status code alone. */
export function formatApiError(status: number, raw: string): string {
  const body = raw.trim();
  if (!body) return `Failed to load (${status})`;
  if (body.startsWith("<")) {
    return `Failed to load (${status}): the server returned a page instead of a message.`;
  }
  try {
    const parsed = JSON.parse(body) as { error?: unknown; message?: unknown };
    const detail =
      typeof parsed.error === "string" && parsed.error.trim()
        ? parsed.error.trim()
        : typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : body;
    return `Failed to load (${status}): ${detail}`;
  } catch {
    return `Failed to load (${status}): ${body.slice(0, 300)}`;
  }
}
