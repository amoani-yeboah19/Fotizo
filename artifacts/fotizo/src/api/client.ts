// Reusable, framework-agnostic HTTP client. This is the ONLY module in the app that
// performs network I/O. Services call `api.get/post/...`; nothing else should import this
// or call `fetch` directly. Swapping transport (e.g. to the generated @workspace/api-client-react
// client once the OpenAPI contract grows) means changing only this file.

import { API_BASE_URL } from "./config";

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
  const headers: Record<string, string> = { Accept: "application/json" };

  let body: string | undefined;
  if (options.body !== undefined) {
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
