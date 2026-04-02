import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const RESERVED = ['admin', 'superadmin', 'api', 'login', 'register']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) return NextResponse.json({ available: false })
  if (RESERVED.includes(slug)) return NextResponse.json({ available: false, reason: 'reservado' })

  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .single()

  return NextResponse.json({ available: !data })
}