'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSettings(data: {
  daily_calorie_limit: number
  daily_protein_goal: number
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('settings').update(data).eq('id', 1)
  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/cabinet')
  revalidatePath('/planner')
  return { success: true }
}
