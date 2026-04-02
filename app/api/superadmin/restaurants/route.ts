import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'superadmin') return null
  return user
}

// GET /api/superadmin/restaurants — lista todos los restaurantes
export async function GET() {
  if (!await verifySuperAdmin()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, owner_id, referred_by, primary_color, logo_url')
    .order('name')

  if (!restaurants?.length) return NextResponse.json([])

  const { data: { users: authUsers } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email]))

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('restaurant_id, status')

  const subMap = Object.fromEntries((subs ?? []).map(s => [s.restaurant_id, s.status]))

  const result = restaurants.map(r => ({
    ...r,
    owner_email: emailMap[r.owner_id] ?? '—',
    subscription_status: subMap[r.id] ?? 'sin plan',
  }))

  return NextResponse.json(result)
}
