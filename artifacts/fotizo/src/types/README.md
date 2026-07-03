# types/

Shared, cross-feature TypeScript types (domain models, DTOs).

Today the domain interfaces (`Product`, `Service`, etc.) are declared inline in the components that
use them. When the API contract lands, generate/centralize the domain types here (ideally sourced
from `@workspace/api-zod` / the OpenAPI spec) so there is a single source of truth.
