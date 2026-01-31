import type {
  ChimeKitClient,
  ChimeKitFetcherOptions,
  ChimeKitInboxMetaResponse,
  ChimeKitListMessagesResponse,
  ChimeKitMessageDetailsResponse,
  ChimeKitMemberPreferencesResponse,
  ChimeKitRequestQuery,
  ChimeKitUnreadCountResponse,
} from "../types";

const DEFAULT_MEMBER_API_BASE = "https://api.chimekit.com/member/v1";

export interface TokenManager {
  get(): Promise<string>;
  clear(): void;
}

export class StaticTokenManager implements TokenManager {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async get() {
    return this.token;
  }

  clear() {}
}

export class DynamicTokenManager implements TokenManager {
  private tokenPromise: Promise<string> | null = null;
  private getToken: () => Promise<string> | string;

  constructor(getToken: () => Promise<string> | string) {
    this.getToken = getToken;
  }

  async get() {
    if (!this.tokenPromise) {
      this.tokenPromise = Promise.resolve(this.getToken());
    }
    return this.tokenPromise;
  }

  clear() {
    this.tokenPromise = null;
  }
}

type CreateMemberClientOptions = {
  publicKey: string;
  tokenManager: TokenManager;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  onAuthError?: (error: Error) => void;
};

type RequestOptions = ChimeKitFetcherOptions;

type MemberClientInternal = {
  client: ChimeKitClient;
  ping: () => Promise<void>;
};

export const createMemberClient = (
  options: CreateMemberClientOptions
): MemberClientInternal => {
  const fetchFn = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_MEMBER_API_BASE);

  const request = async <T>(
    path: string,
    init?: RequestOptions
  ): Promise<T> => {
    const { query, body, ...rest } = init ?? {};
    const method = (rest.method ?? "GET").toUpperCase();
    const headers = new Headers(rest.headers ?? {});

    headers.set("Accept", "application/json");
    headers.set("X-CK-PUBLIC-KEY", options.publicKey);

    const serializedBody = serializeBody(body);
    if (
      serializedBody &&
      method !== "GET" &&
      method !== "HEAD" &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }

    const makeRequest = async (token: string) => {
      const requestHeaders = new Headers(headers);
      requestHeaders.set("Authorization", `Bearer ${token}`);

      const response = await fetchFn(buildUrl(baseUrl, path, query), {
        ...rest,
        method,
        headers: requestHeaders,
        body:
          method === "GET" || method === "HEAD" ? undefined : serializedBody,
      });

      const text = await response.text();
      const data = text ? safeJson(text) : undefined;

      if (!response.ok) {
        const message = extractErrorMessage(data, response.status);
        const error = new Error(message);
        (error as Error & { status?: number; data?: unknown }).status =
          response.status;
        (error as Error & { status?: number; data?: unknown }).data = data;
        throw error;
      }

      return data as T;
    };

    try {
      const token = await options.tokenManager.get();
      return await makeRequest(token);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error as Error & { status?: number }).status === 401
      ) {
        // Clear the token and try to get a new one
        options.tokenManager.clear();
        try {
          const newToken = await options.tokenManager.get();
          return await makeRequest(newToken);
        } catch (retryError) {
          if (options.onAuthError && retryError instanceof Error) {
            options.onAuthError(retryError);
          }
          throw retryError;
        }
      }
      throw error;
    }
  };

  const listInbox: ChimeKitClient["listInbox"] = (filters) => {
    let statusQuery: string | undefined;
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        statusQuery = filters.status.join(",");
      } else {
        statusQuery = filters.status;
      }
    }

    return request<ChimeKitListMessagesResponse>("inbox", {
      method: "GET",
      query: {
        ...filters,
        status: statusQuery,
      },
    });
  };

  const unreadCount: ChimeKitClient["unreadCount"] = (filters) =>
    request<ChimeKitUnreadCountResponse>("inbox/unread", {
      method: "GET",
      query: filters,
    });

  const markRead: ChimeKitClient["markRead"] = (notificationId) =>
    request<void>(`inbox/${notificationId}/read`, { method: "POST" });

  const markUnread: ChimeKitClient["markUnread"] = (notificationId) =>
    request<void>(`inbox/${notificationId}/unread`, { method: "POST" });

  const markAllRead: ChimeKitClient["markAllRead"] = () =>
    request<void>("inbox/read-all", { method: "POST" });

  const archiveAll: ChimeKitClient["archiveAll"] = () =>
    request<void>("inbox/archive-all", { method: "POST" });

  const archive: ChimeKitClient["archive"] = (notificationId) =>
    request<void>(`inbox/${notificationId}/archive`, { method: "POST" });

  const unarchive: ChimeKitClient["unarchive"] = (notificationId) =>
    request<void>(`inbox/${notificationId}/unarchive`, { method: "POST" });

  const getMeta: ChimeKitClient["getMeta"] = () =>
    request<ChimeKitInboxMetaResponse>("inbox/meta", { method: "GET" });

  const getMessage: ChimeKitClient["getMessage"] = (messageId) =>
    request<ChimeKitMessageDetailsResponse>(`inbox/message/${messageId}`, {
      method: "GET",
    });

  const getPreferences: ChimeKitClient["getPreferences"] = () =>
    request<ChimeKitMemberPreferencesResponse>("inbox/preferences", {
      method: "GET",
    });

  const updatePreferences: ChimeKitClient["updatePreferences"] = (payload) =>
    request<ChimeKitMemberPreferencesResponse>("inbox/preferences", {
      method: "PUT",
      body: payload,
    });

  const fetcher: ChimeKitClient["fetcher"] = (path, init) =>
    request(path, init);

  const client: ChimeKitClient = {
    listInbox,
    getMessage,
    unreadCount,
    markRead,
    markUnread,
    markAllRead,
    archiveAll,
    archive,
    unarchive,
    getMeta,
    getPreferences,
    updatePreferences,
    fetcher,
  };

  const ping = () => request<void>("", { method: "GET" });

  return { client, ping };
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const buildUrl = (base: string, path: string, query?: ChimeKitRequestQuery) => {
  const normalizedBase = base || "/";
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  const search = query
    ? Object.entries(query)
        .filter(([, val]) => val !== null && val !== undefined)
        .map(
          ([key, val]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`
        )
        .join("&")
    : "";

  return `${normalizedBase}${normalizedPath}${search ? `?${search}` : ""}`;
};

const serializeBody = (body: RequestOptions["body"]) => {
  if (body == null) {
    return undefined;
  }

  if (typeof body === "string") {
    return body;
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return body;
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return body;
  }

  if (isPlainObject(body)) {
    return JSON.stringify(body);
  }

  return body as BodyInit;
};

const safeJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const extractErrorMessage = (data: unknown, status: number) => {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return `Request failed (${status})`;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";
