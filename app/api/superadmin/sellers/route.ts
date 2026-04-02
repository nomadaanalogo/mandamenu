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

// GET /api/superadmin/sellers — lista todos los sellers
export async function GET() {
  if (!await verifySuperAdmin()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: sellers } = await supabase
    .from('users')
    .select('id, role, referral_code')
    .eq('role', 'seller')

  if (!sellers?.length) return NextResponse.json([])

  // Obtener emails desde auth.users usando service role
  const { data: { users: authUsers } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email]))

  // Contar restaurantes referidos por cada seller
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('referred_by')
    .not('referred_by', 'is', null)

  const refCounts: Record<string, number> = {}
  for (const r of restaurants ?? []) {
    if (r.referred_by) refCounts[r.referred_by] = (refCounts[r.referred_by] ?? 0) + 1
  }

  const result = sellers.map(s => ({
    ...s,
    email: emailMap[s.id] ?? '—',
    restaurants_count: refCounts[s.referral_code ?? ''] ?? 0,
  }))

  return NextResponse.json(result)
}

// POST /api/superadmin/sellers — convierte un usuario en seller
export async function POST(request: Request) {
  if (!await verifySuperAdmin()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { email, referral_code } = await request.json()
  if (!email || !referral_code) {
    return NextResponse.json({ error: 'email y referral_code son requeridos' }, { status: 400 })
  }

  // Buscar usuario en auth por email
  const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const authUser = users.find(u => u.email === email.toLowerCase().trim())
  if (!authUser) {
    return NextResponse.json({ error: 'No existe una cuenta con ese email' }, { status: 404 })
  }

  const supabase = await createClient()

  // Verificar que el referral_code no esté en uso
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', referral_code)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Ese código ya está en uso' }, { status: 409 })
  }

  const { error } = await supabase
    .from('users')
    .update({ role: 'seller', referral_code })
    .eq('id', authUser.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
