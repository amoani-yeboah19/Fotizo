# services/

The data-access layer. **All** backend communication and data/business logic lives here — the UI
(pages, components, contexts) never touches mock data, `fetch`, or the API client directly.

## How the UI talks to services

```
pages / components ─▶ feature hooks (React Query) ─▶ services ─▶ @/api ─▶ HTTP
contexts ───────────────────────────────────────▶ services ─▶ mocks (when VITE_USE_MOCKS)
```

Each service exposes async functions and internally chooses mock vs real API by the `USE_MOCKS`
flag:

```ts
async listProducts(): Promise<Product[]> {
  if (USE_MOCKS) { await delay(); return fx.products; }   // mock
  return api.get<Product[]>("/products");                 // real backend
}
```

- `mocks/` — in-memory fixtures + a `delay()` latency helper. Nothing outside `services/` imports these.
- `*.service.ts` — one object per domain (`catalogService`, `artisansService`, `authService`, …),
  re-exported from `index.ts`.
- Feature hooks live in `@/features/<feature>/hooks.ts` and wrap these services in React Query.

## How to connect a real backend (no UI changes required)

1. Implement the HTTP endpoints below (any stack). Match the request/response shapes to the domain
   types in `@/types`.
2. Set `VITE_API_BASE_URL` to the backend URL and `VITE_USE_MOCKS=false` (see `.env.example`).
3. Done — the UI already calls these services; nothing in `pages/`, `components/`, or `contexts/`
   changes.

### Endpoint contract the services expect

| Service | Method & path | Returns (`@/types`) |
| --- | --- | --- |
| catalog | `GET /products` | `Product[]` |
| catalog | `GET /products/:id` | `Product` |
| catalog | `GET /products/:id/related` | `Product[]` |
| catalog | `GET /categories` | `Category[]` |
| catalog | `GET /seller/products` | `SellerProduct[]` |
| artisans | `GET /services` | `Service[]` |
| artisans | `GET /services/:id` | `Service` |
| content | `GET /testimonials` | `Testimonial[]` |
| orders | `GET /orders` | `Order[]` |
| bookings | `GET /bookings` | `Booking[]` |
| dashboard | `GET /admin/metrics` | `ManagerMetrics` |
| dashboard | `GET /developer/stats` | `DeveloperStats` |
| currency | `GET /currency/rates` | `CurrencyRates` |
| auth | `POST /auth/login` `{ email, password }` | `User` |
| auth | `POST /auth/register` `{ name, email, password, role }` | `User` |
| auth | `GET /auth/me` | `User` (401 if unauthenticated) |
| auth | `POST /auth/logout` | — |
| messages | `GET /conversations` | `Conversation[]` |
| messages | `POST /conversations/:id/messages` `{ content }` | `Message` |
| messages | `POST /conversations/:id/read` | — |

Auth uses cookie sessions (`credentials: "include"`); `saveSession`/`clearSession` become no-ops
against the real API since the session cookie is server-managed.
