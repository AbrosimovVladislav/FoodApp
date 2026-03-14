'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcEntryKBJU, roundKBJU } from '@/lib/calc-kbju'
import type { DishWithIngredients } from '@/components/dishes/dish-card'
import type { Ingredient, MealPlan } from '@/types/database'

export async function closeDayLog(
  date: string,
  mealPlan: MealPlan[],
  dishes: DishWithIngredients[],
  ingredients: Ingredient[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Remove existing food_log entries for this date (re-close)
  await supabase.from('food_log').delete().eq('date', date).not('dish_id', 'is', null)

  const rows = mealPlan
    .filter((e) => e.dish_id || e.ingredient_id)
    .map((entry) => {
      const kbju = roundKBJU(calcEntryKBJU(entry, dishes, ingredients))
      return {
        date,
        dish_id: entry.dish_id ?? null,
        custom_note: entry.ingredient_id
          ? ingredients.find((i) => i.id === entry.ingredient_id)?.name ?? null
          : null,
        total_calories: kbju.calories,
        total_protein: kbju.protein,
        total_fat: kbju.fat,
        total_carbs: kbju.carbs,
        user_id: user.id,
      }
    })

  if (rows.length === 0) return { success: true }

  const { error } = await supabase.from('food_log').insert(rows)
  if (error) return { success: false, error: error.message }

  revalidatePath('/log')
  revalidatePath('/cabinet')
  return { success: true }
}

export async function addExtraLog(data: {
  date: string
  note: string
  calories: number
  protein: number
  fat: number
  carbs: number
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('food_log').insert({
    date: data.date,
    dish_id: null,
    custom_note: data.note,
    total_calories: Math.round(data.calories),
    total_protein: Math.round(data.protein * 10) / 10,
    total_fat: Math.round(data.fat * 10) / 10,
    total_carbs: Math.round(data.carbs * 10) / 10,
    user_id: user.id,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/log')
  revalidatePath('/cabinet')
  return { success: true }
}

export async function removeExtraLog(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('food_log').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/log')
  revalidatePath('/cabinet')
  return { success: true }
}
