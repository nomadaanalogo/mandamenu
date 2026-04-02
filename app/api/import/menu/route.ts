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
            text: `Analizá esta imagen de un menú de restaurante y extraé todo el contenido usando este formato exacto:

# Nombre de la categoría
## Nombre del grupo de extras (si aplica a TODOS los productos de esa categoría)
* Opción del extra $precio (si tiene costo adicional)
* Opción del extra (si no tiene costo)

! Nombre del producto $precio
## Nombre del grupo de extras (si es específico de este producto)
* Opción $precio
* Opción

Reglas:
- Usá # para cada categoría
- Usá ## para grupos de extras o variantes (ej: "Cocción", "Tamaño", "Salsas", "Adicionales")
- Si los extras aplican a TODOS los productos de la categoría, escribí ## justo después del # (antes del primer !)
- Si los extras son solo de un producto, escribí ## justo después del ! de ese producto
- Usá ! para cada producto, con el precio al final con $ (ej: ! Hamburguesa Clásica $12000)
- Usá * para cada opción dentro de un grupo ## (ej: * Extra queso $2000 o * Sin cebolla)
- Si el precio no se ve claro, no lo incluyas
- Mantené los nombres exactamente como aparecen en el menú
- Solo devolvé el texto formateado, sin explicaciones adicionales`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: 2500,
  })

  const text = response.choices[0]?.message?.content?.trim() ?? ''
  return NextResponse.json({ text })
}
