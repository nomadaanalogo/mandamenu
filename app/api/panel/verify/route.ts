import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export async function POST(request: Request) {
  const { locationId, pin } = await request.json()

  if (!locationId || !pin) {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: location } = await supabase
    .from('locations')
    .select('panel_pin, pin_attempts, pin_locked_until')
    .eq('id', locationId)
    .single()

  if (!location?.panel_pin) {
    return NextResponse.json({ ok: false, error: 'Panel no configurado' }, { status: 403 })
  }

  // Verificar si está bloqueado
  if (location.pin_locked_until && new Date(location.pin_locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(location.pin_locked_until).getTime() - Date.now()) / 60000
    )
    return NextResponse.json(
      { ok: false, error: `Demasiados intentos. Intentá en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.` },
      { status: 429 }
    )
  }

  // PIN incorrecto
  if (location.panel_pin !== pin) {
    const newAttempts = (location.pin_attempts ?? 0) + 1
    const shouldLock = newAttempts >= MAX_ATTEMPTS

    await supabase
      .from('locations')
      .update({
        pin_attempts: newAttempts,
        pin_locked_until: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : null,
      })
      .eq('id', locationId)

    return NextResponse.json(
      { ok: false, error: shouldLock
        ? `Demasiados intentos. Panel bloqueado por ${LOCKOUT_MINUTES} minutos.`
        : `PIN incorrecto. ${MAX_ATTEMPTS - newAttempts} intento${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} restante${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''}.`
      },
      { status: 401 }
    )
  }

  // PIN correcto — resetear intentos
  await supabase
    .from('locations')
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq('id', locationId)

  return NextResponse.json({ ok: true })
}
