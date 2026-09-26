// Runtime configuration for the data layer, sourced from Vite env vars.
//
// VITE_API_BASE_URL     — base URL the API client prepends to every request (default "/api").
// VITE_USE_MOCKS        — "true" (default) serves in-memory mock data; "false" hits the real API.
// VITE_USE_MOCK_AUTH    — same, but for auth only. Falls back to VITE_USE_MOCKS when unset.
// VITE_USE_MOCK_CATALOG — same, but for the product catalog only. Falls back to VITE_USE_MOCKS
//                         when unset. Each domain flips independently as its backend ships —
//                         bookings/messages stay mocked until those exist server-side.
// VITE_USE_MOCK_ORDERS  — same, but for cart/checkout/order-history only.
// VITE_USE_MOCK_ARTISANS — same, but for the services (artisans) catalog only.
// VITE_USE_MOCK_MESSAGES — same, but for conversations/messaging only.
// VITE_USE_MOCK_AUTOS   — same, but for Fotizo Autos vehicle enquiries only.
// VITE_USE_MOCK_SUPPORT — same, but for customer-support requests only.
//
// A backend developer connects a real backend by setting these; no UI code changes.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

// The extended preview workspace is enabled only in explicit demo builds.
// Production uses the server-backed manager screens from main.
export const ADMIN_USE_MOCKS = import.meta.env.VITE_DEMO_MODE === "true" && (import.meta.env.VITE_USE_MOCK_ADMIN ?? "true") !== "false";

export const AUTH_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_AUTH ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const CATALOG_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_CATALOG ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const ORDERS_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_ORDERS ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

// VITE_USE_MOCK_SELLER_CATALOG — the seller's own listings (/seller/products and the
// post/edit/remove mutations), split out from the public catalog above.
//
// Those endpoints are session-scoped, while browsing products is not. A demo build
// signs in through mock auth, so it holds no backend session and any real call here
// would 401 — yet it still wants the public catalog to serve genuine listings. Falls
// back to VITE_USE_MOCK_CATALOG when unset, so every existing config is unchanged.
export const SELLER_CATALOG_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_SELLER_CATALOG ??
    import.meta.env.VITE_USE_MOCK_CATALOG ??
    import.meta.env.VITE_USE_MOCKS ??
    "true") !== "false";

// VITE_USE_MOCK_SHOP — the Fotizo Shop storefront (the departments, not the
// seller marketplace). It stays on the committed catalogue until the China
// representative dashboard publishes shop inventory to the API.
//
// The database seed deliberately creates the representative's imported items
// as unpublished until pricing and stock are approved. Reading `/products`
// before that workflow is in place makes the public shop appear empty. Set
// VITE_USE_MOCK_SHOP=false only when those listings are ready to publish.
export const SHOP_USE_MOCKS = (import.meta.env.VITE_USE_MOCK_SHOP ?? "true") !== "false";

export const ARTISANS_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_ARTISANS ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const MESSAGES_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_MESSAGES ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const AUTOS_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_AUTOS ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export const SUPPORT_USE_MOCKS =
  (import.meta.env.VITE_USE_MOCK_SUPPORT ?? import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

// VITE_DEMO_MODE — "true" only in the shareable demo build (`vite build --mode demo`,
// see .env.demo). It adds the /demo role-picker route so a reviewer can drop straight
// into any role's dashboard without needing a real account. Unset everywhere else, so
// the route does not exist in the production bundle.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
