import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'superadmin') return null
  return user
}

// PATCH /api/superadmin/restaurants/[id]/assign — asigna o desasigna un seller
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verifySuperAdmin()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const { referred_by } = await request.json()

  const supabase = await createClient()
  const { error } = await supabase
    .from('restaurants')
    .update({ referred_by: referred_by ?? null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
