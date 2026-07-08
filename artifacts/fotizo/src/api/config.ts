// Runtime configuration for the data layer, sourced from Vite env vars.
//
// VITE_API_BASE_URL   — base URL the API client prepends to every request (default "/api").
// VITE_USE_MOCKS      — "true" (default) serves in-memory mock data; "false" hits the real API.
// VITE_USE_MOCK_AUTH  — same, but for auth only. Lets auth run against the real backend
//                       while catalog/orders/messages stay mocked until those endpoints
//                       exist server-side. Falls back to VITE_USE_MOCKS when unset.
//
// A backend developer connects a real backend by setting these; no UI code changes.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const AUTH_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_AUTH ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";
