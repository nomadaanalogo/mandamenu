import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  // ── 1. Verificar sesión del usuario ───────────────────────────────────────
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const restaurantId = formData.get('restaurantId') as string | null

  if (!file || !restaurantId) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  // ── 2. Validar tipo y tamaño del archivo ──────────────────────────────────
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Usá JPG, PNG, WEBP o GIF.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera los 5 MB.' }, { status: 400 })
  }

  // ── 3. Verificar que el restaurante le pertenece al usuario ───────────────
  const { data: restaurant } = await supabaseAuth
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Sin permiso para modificar este restaurante' }, { status: 403 })
  }

  // ── 4. Subir el archivo con el service role ───────────────────────────────
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext = file.name.split('.').pop()
  const path = `logos/${restaurantId}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('restaurant-assets')
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
