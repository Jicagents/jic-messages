import { getValidAccess, refreshToken } from "./auth";

const RETRIES = 2;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  formatApiError,
  isMessageUuid,
  messageDetailUrl,
  messageIdFromData,
  messagesListUrl,
  routeParam,
} from "./messageUrl";

export class SignedOutError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "SignedOutError";
  }
}

/**
 * Bearer request that waits for a usable access token.
 * Refreshes once for the whole app if the token is near expiry, and again on 401.
 * 401, network errors, and 5xx are retried twice with a short backoff before the caller sees a failure.
 */
export async function authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await wait(300 * attempt);
    const token = last?.status === 401 ? await refreshToken() : await getValidAccess();
    if (!token) throw new SignedOutError();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    try {
      last = await fetch(url, { ...init, headers });
    } catch (error) {
      if (attempt === RETRIES) throw error;
      last = null;
      continue;
    }
    if (last.status !== 401 && last.status < 500) return last;
    if (attempt === RETRIES) return last;
  }
  throw new SignedOutError();
}
