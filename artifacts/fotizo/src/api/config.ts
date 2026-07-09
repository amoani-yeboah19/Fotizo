// Runtime configuration for the data layer, sourced from Vite env vars.
//
// VITE_API_BASE_URL     — base URL the API client prepends to every request (default "/api").
// VITE_USE_MOCKS        — "true" (default) serves in-memory mock data; "false" hits the real API.
// VITE_USE_MOCK_AUTH    — same, but for auth only. Falls back to VITE_USE_MOCKS when unset.
// VITE_USE_MOCK_CATALOG — same, but for the product catalog only. Falls back to VITE_USE_MOCKS
//                         when unset. Each domain flips independently as its backend ships —
//                         orders/bookings/messages stay mocked until those exist server-side.
//
// A backend developer connects a real backend by setting these; no UI code changes.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const AUTH_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_AUTH ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const CATALOG_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_CATALOG ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";
