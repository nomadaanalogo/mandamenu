import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'La imagen no puede superar 10 MB. Intentá con un screenshot o una foto de menor resolución.' }, { status: 413 })
  }

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Sos un experto en digitalizar menús de restaurante desde imágenes.

PASO 1 — Leé la imagen con mucho cuidado. Identificá y memorizá:
- Todas las categorías o secciones del menú
- Todos los productos con sus nombres, descripciones y precios exactos
- Todos los extras, variantes, adicionales u opciones que veas

PASO 2 — Volcá todo lo que leíste usando EXACTAMENTE este formato:

# Nombre de categoría
! Nombre del producto $precio
! Nombre del producto $precio

El formato de producto es:
! Nombre del producto $precio
> Descripción del producto (si tiene)

Si hay extras que aplican a toda la categoría, ponelos después del #:
# Nombre de categoría
## Nombre del grupo de extras
* Opción $precio
* Opción sin costo

Si los extras son de un producto específico, ponelos después de ese !:
! Nombre del producto $precio
> Descripción
## Nombre del grupo de extras
* Opción $precio

Reglas importantes:
- NO omitas ningún producto aunque el precio no se vea bien — si no se lee el precio, poné el nombre igual sin precio
- Incluí la descripción del producto con > si hay texto descriptivo debajo del nombre (ingredientes, características, etc.)
- Mantené los nombres tal como aparecen en el menú, sin traducir ni cambiar
- Respetá el orden en que aparecen en la imagen
- Solo devolvé el texto formateado, sin comentarios ni explicaciones`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: 4000,
  })

  const text = response.choices[0]?.message?.content?.trim() ?? ''
  return NextResponse.json({ text })
}
