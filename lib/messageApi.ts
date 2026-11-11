import { getAccess, refreshToken } from "./auth";

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

/** Bearer token the mobile routes expect, with one refresh retry on 401. */
export async function authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getAccess();
  if (!token) token = await refreshToken();
  if (!token) throw new SignedOutError();

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  let res = await fetch(url, { ...init, headers });
  if (res.status !== 401) return res;

  const next = await refreshToken();
  if (!next) throw new SignedOutError();
  headers.set("Authorization", `Bearer ${next}`);
  return fetch(url, { ...init, headers });
}
