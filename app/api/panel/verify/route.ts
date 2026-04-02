import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ── Rate limiter en memoria ────────────────────────────────────────────────
// Persiste mientras el proceso esté vivo (efectivo contra brute force)
const attempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX_ATTEMPTS  = 5
const LOCKOUT_MS    = 15 * 60 * 1000  // 15 minutos
const WINDOW_MS     = 10 * 60 * 1000  // ventana de 10 minutos

function getKey(ip: string, locationId: string) {
  return `${ip}:${locationId}`
}

function checkRateLimit(ip: string, locationId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const key = getKey(ip, locationId)
  const now = Date.now()
  const record = attempts.get(key)

  if (record) {
    // Si está bloqueado, rechazar
    if (record.lockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000) }
    }
    // Si la ventana expiró, resetear
    if (now - (record.lockedUntil - LOCKOUT_MS) > WINDOW_MS && record.count < MAX_ATTEMPTS) {
      attempts.delete(key)
    }
  }

  return { allowed: true }
}

function recordFailedAttempt(ip: string, locationId: string) {
  const key = getKey(ip, locationId)
  const now = Date.now()
  const record = attempts.get(key)
  const count = (record?.count ?? 0) + 1

  attempts.set(key, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : (record?.lockedUntil ?? 0),
  })
}

function clearAttempts(ip: string, locationId: string) {
  attempts.delete(getKey(ip, locationId))
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // Obtener IP del cliente
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { locationId, pin } = await request.json()

  if (!locationId || !pin) {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }

  // Verificar rate limit antes de consultar la DB
  const { allowed, retryAfterSeconds } = checkRateLimit(ip, locationId)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: `Demasiados intentos. Intentá en ${Math.ceil(retryAfterSeconds! / 60)} minutos.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: location } = await supabase
    .from('locations')
    .select('panel_pin')
    .eq('id', locationId)
    .single()

  if (!location?.panel_pin) {
    return NextResponse.json({ ok: false, error: 'Panel no configurado' }, { status: 403 })
  }

  if (location.panel_pin !== pin) {
    recordFailedAttempt(ip, locationId)
    return NextResponse.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 })
  }

  // PIN correcto — limpiar intentos fallidos
  clearAttempts(ip, locationId)
  return NextResponse.json({ ok: true })
}
