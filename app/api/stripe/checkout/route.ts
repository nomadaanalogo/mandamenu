import { createClient } from '@/lib/supabase/server'
import { stripe, PRICE_IDS } from '@/lib/stripe'
import { NextResponse } from 'next/server'

// POST /api/stripe/checkout
// body: { planName: 'Basic' | 'Standard' | 'Premium' }
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { planName } = await request.json()
    const priceId = PRICE_IDS[planName]
    if (!priceId) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

    const origin = request.headers.get('origin') ?? 'http://localhost:3000'

    // Buscar o crear customer en Stripe
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('owner_id', user.id)
      .single()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/admin?upgraded=1`,
      cancel_url: `${origin}/admin/upgrade`,
      metadata: {
        supabase_user_id: user.id,
        plan_name: planName,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_name: planName,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Error al crear la sesión de pago' }, { status: 500 })
  }
}
