/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_USE_MOCK_AUTH?: string;
  readonly VITE_USE_MOCK_CATALOG?: string;
  readonly VITE_USE_MOCK_ORDERS?: string;
  readonly VITE_USE_MOCK_ARTISANS?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
