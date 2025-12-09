/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUD_STORAGE_URL?: string
  readonly VITE_USE_CLOUD_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

