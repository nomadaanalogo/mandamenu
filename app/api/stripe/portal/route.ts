import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/stripe/portal — abre el portal de cliente de Stripe
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .single()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 404 })
  }

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/admin/upgrade`,
  })

  return NextResponse.json({ url: session.url })
}
