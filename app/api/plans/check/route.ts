import { createClient } from '@/lib/supabase/server'
import { canCreateRestaurant, canCreateLocation } from '@/lib/plans'
import { NextResponse } from 'next/server'

// GET /api/plans/check?type=restaurant
// GET /api/plans/check?type=location&restaurantId=xxx
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'restaurant') {
    const result = await canCreateRestaurant(user.id)
    return NextResponse.json(result)
  }

  if (type === 'location') {
    const restaurantId = searchParams.get('restaurantId')
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId requerido' }, { status: 400 })
    const result = await canCreateLocation(user.id, restaurantId)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'type inválido' }, { status: 400 })
}
