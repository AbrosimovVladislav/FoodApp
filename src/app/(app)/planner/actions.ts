'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addMealPlanEntry(params: {
  date: string
  dishId?: string
  ingredientId?: string
  amount_g: number
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('meal_plan').insert({
    date: params.date,
    dish_id: params.dishId ?? null,
    ingredient_id: params.ingredientId ?? null,
    amount_g: params.amount_g,
    slot: `meal_${Date.now()}`,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/planner')
  return { success: true }
}

export async function removeMealPlanEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('meal_plan').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/planner')
  return { success: true }
}
