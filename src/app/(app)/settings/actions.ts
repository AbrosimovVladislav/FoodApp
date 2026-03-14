'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSettings(data: {
  daily_calorie_limit: number
  daily_protein_goal: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('settings')
    .upsert(
      { user_id: user.id, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/cabinet')
  revalidatePath('/planner')
  return { success: true }
}
