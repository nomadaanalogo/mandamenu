import { createClient } from '@supabase/supabase-js'

// Bypasea RLS — usar solo en server-side para operaciones que lo requieran
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
