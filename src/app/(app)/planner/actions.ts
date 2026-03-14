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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('meal_plan').insert({
    date: params.date,
    dish_id: params.dishId ?? null,
    ingredient_id: params.ingredientId ?? null,
    amount_g: params.amount_g,
    slot: `meal_${Date.now()}`,
    user_id: user.id,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/planner')
  revalidatePath('/pantry')
  return { success: true }
}

export async function updateMealPlanEntry(id: string, amount_g: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('meal_plan').update({ amount_g }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/planner')
  revalidatePath('/pantry')
  return { success: true }
}

export async function removeMealPlanEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('meal_plan').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/planner')
  revalidatePath('/pantry')
  return { success: true }
}

export async function markAsEaten(entryId: string) {
  const supabase = await createClient()

  const { data: entry, error: entryError } = await supabase
    .from('meal_plan')
    .select('*')
    .eq('id', entryId)
    .single()

  if (entryError || !entry) return { success: false, error: 'Запись не найдена' }

  // Build list of ingredients to deduct
  const toDeduct: { ingredient_id: string; amount_g: number }[] = []

  if (entry.dish_id && entry.amount_g) {
    const { data: dishIngredients } = await supabase
      .from('dish_ingredients')
      .select('*')
      .eq('dish_id', entry.dish_id)

    if (dishIngredients && dishIngredients.length > 0) {
      const totalDishWeight = dishIngredients.reduce((s, di) => s + di.amount_g, 0)
      const ratio = totalDishWeight > 0 ? entry.amount_g / totalDishWeight : 1
      for (const di of dishIngredients) {
        toDeduct.push({ ingredient_id: di.ingredient_id, amount_g: di.amount_g * ratio })
      }
    }
  } else if (entry.ingredient_id && entry.amount_g) {
    toDeduct.push({ ingredient_id: entry.ingredient_id, amount_g: entry.amount_g })
  }

  // Deduct each ingredient from pantry
  for (const { ingredient_id, amount_g } of toDeduct) {
    const { data: existing } = await supabase
      .from('pantry')
      .select('id, amount_g')
      .eq('ingredient_id', ingredient_id)
      .single()

    if (!existing) continue

    const newAmount = Math.round(Math.max(0, existing.amount_g - amount_g))
    if (newAmount === 0) {
      await supabase.from('pantry').delete().eq('id', existing.id)
    } else {
      await supabase.from('pantry').update({ amount_g: newAmount }).eq('id', existing.id)
    }
  }

  // Mark entry as eaten
  await supabase.from('meal_plan').update({ eaten: true }).eq('id', entryId)

  revalidatePath('/pantry')
  revalidatePath('/planner')
  return { success: true }
}
