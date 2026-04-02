import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import SellerDashboard from '@/components/seller/SellerDashboard'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function SellerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Datos del seller
  const { data: sellerData } = await serviceClient
    .from('users')
    .select('referral_code')
    .eq('id', user.id)
    .single()

  if (!sellerData?.referral_code) redirect('/login')

  // Restaurantes referidos
  const { data: restaurants } = await serviceClient
    .from('restaurants')
    .select('id, name, slug, owner_id, referred_by')
    .eq('referred_by', sellerData.referral_code)
    .order('name')

  // Suscripciones de esos restaurantes
  const ownerIds = (restaurants ?? []).map(r => r.owner_id)
  const { data: subs } = ownerIds.length > 0
    ? await serviceClient
        .from('subscriptions')
        .select('owner_id, status, plans(name, price_monthly)')
        .in('owner_id', ownerIds)
    : { data: [] }

  const subMap = Object.fromEntries(
    (subs ?? []).map(s => [s.owner_id, s])
  )

  // Emails de los dueños
  const { data: { users: authUsers } } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email]))

  const enrichedRestaurants = (restaurants ?? []).map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    owner_email: emailMap[r.owner_id] ?? '—',
    status: subMap[r.owner_id]?.status ?? 'sin plan',
    plan_name: (subMap[r.owner_id]?.plans as { name: string; price_monthly: number } | null)?.name ?? '—',
    plan_price: (subMap[r.owner_id]?.plans as { name: string; price_monthly: number } | null)?.price_monthly ?? 0,
  }))

  return (
    <SellerDashboard
      referralCode={sellerData.referral_code}
      email={user.email ?? ''}
      restaurants={enrichedRestaurants}
    />
  )
}
