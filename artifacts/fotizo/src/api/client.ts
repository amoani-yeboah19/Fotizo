// Reusable, framework-agnostic HTTP client. This is the ONLY module in the app that
// performs network I/O. Services call `api.get/post/...`; nothing else should import this
// or call `fetch` directly. Swapping transport (e.g. to the generated @workspace/api-client-react
// client once the OpenAPI contract grows) means changing only this file.

import { API_BASE_URL } from "./config";
import { reportSessionRejected } from "./session-events";

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly url: string;

  constructor(status: number, statusText: string, data: T | null, url: string) {
    super(`HTTP ${status} ${statusText} for ${url}`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.url = url;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const url = /^https?:\/\//.test(path)
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.append(key, String(value));
  }
  const search = qs.toString();
  return search ? `${url}?${search}` : url;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: { params?: QueryParams; body?: unknown } = {},
): Promise<T> {
  const url = buildUrl(path, options.params);
  const headers: Record<string, string> = { Accept: "application/json", "X-Fotizo-Request": "1" };

  let body: string | Blob | undefined;
  if (options.body instanceof Blob) {
    // Files (image uploads) are sent as-is; the server checks their real type.
    headers["Content-Type"] = options.body.type || "application/octet-stream";
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    // Send session cookies so cookie-based auth works without the UI handling tokens.
    credentials: "include",
  });

  const data = parseBody(await response.text());

  if (!response.ok) {
    // Auth endpoints answer 401 as part of normal sign-in; anything else means
    // the session this page believed in has ended.
    if (response.status === 401 && !path.startsWith("/auth/")) reportSessionRejected();
    throw new ApiError(response.status, response.statusText, data, url);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>("GET", path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, { body }),
};

/**
 * The server's own explanation for a rejected request (validation, limits,
 * conflicts), or `fallback` for network and server failures.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (
    err instanceof ApiError &&
    err.status >= 400 &&
    err.status < 500 &&
    err.data &&
    typeof err.data === "object" &&
    "error" in err.data &&
    typeof err.data.error === "string"
  )
    return err.data.error;
  return fallback;
}
