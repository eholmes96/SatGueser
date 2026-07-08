import { createClient } from '@supabase/supabase-js'

// Single browser Supabase client for the whole app. The publishable key is a
// public, client-safe key (it ships in the bundle by design) — row-level
// security (see supabase/migrations) is what actually protects data, not
// secrecy of this key. The secret key is never used here; it lives only in the
// submit-daily Edge Function's secrets.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

// Whether Supabase is configured at build time. When these vars are absent
// (e.g. a fork without a backend, or local dev before setup), the app must
// still run fully as a guest on localStorage — callers check this before
// reaching for the client instead of crashing at import time.
export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        // Magic-link tokens arrive in the URL hash on redirect back; let the
        // client parse and clear them automatically.
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
