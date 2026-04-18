/// <reference types="vite/client" />

/** Keys exposed to the client via `import.meta.env` (must match `.env.example` / `.env.local`). */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
