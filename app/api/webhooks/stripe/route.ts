import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

// Cliente con service role para escribir desde webhook (sin sesión de usuario)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getPlanIdByName(name: string) {
  const { data } = await supabase.from('plans').select('id').eq('name', name).single()
  return data?.id ?? null
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id
  const planName = session.metadata?.plan_name
  if (!userId || !planName) return

  const planId = await getPlanIdByName(planName)
  if (!planId) return

  const stripeSubscriptionId = session.subscription as string
  const customerId = session.customer as string

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (existing) {
    await supabase.from('subscriptions').update({
      plan_id: planId,
      status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
      trial_ends_at: null,
    }).eq('owner_id', userId)
  } else {
    await supabase.from('subscriptions').insert({
      owner_id: userId,
      plan_id: planId,
      status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
    })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id
  const planName = subscription.metadata?.plan_name
  if (!userId) return

  const status = subscription.status === 'active' ? 'active'
    : subscription.status === 'past_due' ? 'past_due'
    : subscription.status === 'canceled' ? 'cancelled'
    : 'trial'

  const update: Record<string, unknown> = { status, stripe_subscription_id: subscription.id }

  if (planName) {
    const planId = await getPlanIdByName(planName)
    if (planId) update.plan_id = planId
  }

  await supabase.from('subscriptions').update(update).eq('owner_id', userId)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) return

  const trialPlanId = await getPlanIdByName('Trial')
  await supabase.from('subscriptions').update({
    status: 'cancelled',
    plan_id: trialPlanId,
  }).eq('owner_id', userId)
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Sin firma' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
  }

  return NextResponse.json({ received: true })
}
