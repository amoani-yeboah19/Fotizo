# api/

The reusable HTTP client — the **only** place in the app that performs network I/O.
Services call it; pages, components, hooks and contexts must not import it or call `fetch`.

## Files

- `client.ts` — `api.get/post/put/patch/del<T>()` over `fetch`, with base-URL joining, JSON
  encode/decode, cookie credentials, and a typed `ApiError`. Swapping transport (e.g. to the
  generated `@workspace/api-client-react` client once the OpenAPI spec grows) means editing only
  this file.
- `config.ts` — `API_BASE_URL` and `USE_MOCKS`, read from Vite env (`VITE_API_BASE_URL`,
  `VITE_USE_MOCKS`). See `../../.env.example`.
- `index.ts` — barrel: `import { api, ApiError, USE_MOCKS } from "@/api"`.

## Usage (from a service only)

```ts
import { api } from "@/api";

const products = await api.get<Product[]>("/products");
const created  = await api.post<Order>("/orders", { productId, quantity });
```

Errors throw `ApiError` with `.status` and `.data`.
