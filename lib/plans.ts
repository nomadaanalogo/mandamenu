import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export interface PlanLimits {
  planName: string
  status: string
  maxRestaurants: number  // -1 = ilimitado
  maxLocations: number    // -1 = ilimitado
  trialEndsAt: string | null
}

export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('status, trial_ends_at, plans(name, max_restaurants, max_locations)')
    .eq('owner_id', userId)
    .single()

  if (!sub || !sub.plans) {
    return {
      planName: 'Trial',
      status: 'trial',
      maxRestaurants: 1,
      maxLocations: 1,
      trialEndsAt: null,
    }
  }

  const plan = (Array.isArray(sub.plans) ? sub.plans[0] : sub.plans) as { name: string; max_restaurants: number; max_locations: number }

  return {
    planName: plan.name,
    status: sub.status,
    maxRestaurants: plan.max_restaurants,
    maxLocations: plan.max_locations,
    trialEndsAt: sub.trial_ends_at ?? null,
  }
}

export async function canCreateRestaurant(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserPlanLimits(userId)

  if (limits.maxRestaurants === -1) return { allowed: true }

  const { count } = await serviceClient
    .from('restaurants')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)

  if ((count ?? 0) >= limits.maxRestaurants) {
    return {
      allowed: false,
      reason: `Tu plan ${limits.planName} permite hasta ${limits.maxRestaurants} restaurante${limits.maxRestaurants > 1 ? 's' : ''}. Actualizá tu plan para agregar más.`,
    }
  }

  return { allowed: true }
}

export async function canCreateLocation(userId: string, restaurantId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserPlanLimits(userId)

  if (limits.maxLocations === -1) return { allowed: true }

  const { count } = await serviceClient
    .from('locations')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)

  if ((count ?? 0) >= limits.maxLocations) {
    return {
      allowed: false,
      reason: `Tu plan ${limits.planName} permite hasta ${limits.maxLocations} sede${limits.maxLocations > 1 ? 's' : ''} por restaurante. Actualizá tu plan para agregar más.`,
    }
  }

  return { allowed: true }
}
