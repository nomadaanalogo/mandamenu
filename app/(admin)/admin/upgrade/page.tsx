import { createClient } from '@/lib/supabase/server'
import { getUserPlanLimits } from '@/lib/plans'
import UpgradeClient from './UpgradeClient'

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const limits = await getUserPlanLimits(user!.id)

  return <UpgradeClient limits={limits} />
}
