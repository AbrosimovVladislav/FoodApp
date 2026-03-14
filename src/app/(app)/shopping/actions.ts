'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function generateShoppingList(weekStartStr: string) {
  const supabase = await createClient()

  const weekStart = new Date(weekStartStr + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 5)
  const weekEndStr = toDateStr(weekEnd)

  // Only look at today and future dates — past meals already consumed (pantry is ground truth)
  const today = toDateStr(new Date())
  const fromDate = today > weekStartStr ? today : weekStartStr

  // 1. Get meal_plan entries from today (or week start if future week) to week end
  const { data: mealPlan, error: mpError } = await supabase
    .from('meal_plan')
    .select('*')
    .gte('date', fromDate)
    .lte('date', weekEndStr)

  if (mpError) return { success: false, error: mpError.message }

  // 2. Get dish_ingredients for all dishes in the plan
  const dishIds = [...new Set(mealPlan.filter((e) => e.dish_id).map((e) => e.dish_id as string))]
  const { data: dishIngredients, error: diError } = dishIds.length > 0
    ? await supabase
        .from('dish_ingredients')
        .select('*')
        .in('dish_id', dishIds)
    : { data: [], error: null }

  if (diError) return { success: false, error: diError.message }

  // 3. Aggregate needed amounts by ingredient_id (skip already eaten entries)
  const needed = new Map<string, number>()

  for (const entry of (mealPlan ?? []).filter((e) => e.eaten !== true)) {
    if (entry.dish_id && entry.amount_g) {
      const dis = dishIngredients?.filter((di) => di.dish_id === entry.dish_id) ?? []
      const totalDishWeight = dis.reduce((s, di) => s + di.amount_g, 0)
      const ratio = totalDishWeight > 0 ? entry.amount_g / totalDishWeight : 1
      for (const di of dis) {
        const cur = needed.get(di.ingredient_id) ?? 0
        needed.set(di.ingredient_id, cur + di.amount_g * ratio)
      }
    } else if (entry.ingredient_id && entry.amount_g) {
      const cur = needed.get(entry.ingredient_id) ?? 0
      needed.set(entry.ingredient_id, cur + entry.amount_g)
    }
  }

  // 4. Get pantry
  const { data: pantry, error: pantryError } = await supabase
    .from('pantry')
    .select('ingredient_id, amount_g')

  if (pantryError) return { success: false, error: pantryError.message }

  const pantryMap = new Map<string, number>()
  for (const p of pantry ?? []) {
    pantryMap.set(p.ingredient_id, p.amount_g)
  }

  // 5. Compute deficit
  const deficit: { ingredient_id: string; amount_g: number }[] = []
  for (const [ingredientId, neededG] of needed) {
    const inPantry = pantryMap.get(ingredientId) ?? 0
    const missing = neededG - inPantry
    if (missing > 0) {
      deficit.push({ ingredient_id: ingredientId, amount_g: Math.round(missing) })
    }
  }

  // 6. Delete existing unpurchased auto-generated items for this week
  const { error: delError } = await supabase
    .from('shopping_list')
    .delete()
    .eq('week_start_date', weekStartStr)
    .eq('purchased', false)

  if (delError) return { success: false, error: delError.message }

  // 7. Insert deficit items
  if (deficit.length > 0) {
    const { error: insError } = await supabase.from('shopping_list').insert(
      deficit.map((d) => ({
        ingredient_id: d.ingredient_id,
        amount_g: d.amount_g,
        week_start_date: weekStartStr,
        purchased: false,
      }))
    )
    if (insError) return { success: false, error: insError.message }
  }

  revalidatePath('/shopping')
  return { success: true, count: deficit.length }
}

export async function markPurchased(id: string) {
  const supabase = await createClient()

  // Get the item first
  const { data: item, error: getError } = await supabase
    .from('shopping_list')
    .select('ingredient_id, amount_g')
    .eq('id', id)
    .single()

  if (getError || !item) return { success: false, error: getError?.message ?? 'Not found' }

  // Mark as purchased
  const { error: updError } = await supabase
    .from('shopping_list')
    .update({ purchased: true })
    .eq('id', id)

  if (updError) return { success: false, error: updError.message }

  // Add to pantry (upsert: add to existing)
  const { data: existing } = await supabase
    .from('pantry')
    .select('id, amount_g')
    .eq('ingredient_id', item.ingredient_id)
    .single()

  if (existing) {
    await supabase
      .from('pantry')
      .update({ amount_g: existing.amount_g + item.amount_g })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('pantry')
      .insert({ ingredient_id: item.ingredient_id, amount_g: item.amount_g })
  }

  revalidatePath('/shopping')
  revalidatePath('/pantry')
  return { success: true }
}

export async function unmarkPurchased(id: string) {
  const supabase = await createClient()

  const { data: item, error: getError } = await supabase
    .from('shopping_list')
    .select('ingredient_id, amount_g')
    .eq('id', id)
    .single()

  if (getError || !item) return { success: false, error: getError?.message ?? 'Not found' }

  const { error: updError } = await supabase
    .from('shopping_list')
    .update({ purchased: false })
    .eq('id', id)

  if (updError) return { success: false, error: updError.message }

  // Subtract from pantry
  const { data: existing } = await supabase
    .from('pantry')
    .select('id, amount_g')
    .eq('ingredient_id', item.ingredient_id)
    .single()

  if (existing) {
    const newAmount = existing.amount_g - item.amount_g
    if (newAmount <= 0) {
      await supabase.from('pantry').delete().eq('id', existing.id)
    } else {
      await supabase.from('pantry').update({ amount_g: newAmount }).eq('id', existing.id)
    }
  }

  revalidatePath('/shopping')
  revalidatePath('/pantry')
  return { success: true }
}

export async function addManualShoppingItem(
  ingredientId: string,
  amountG: number,
  weekStartStr: string
) {
  const supabase = await createClient()
  const { error } = await supabase.from('shopping_list').insert({
    ingredient_id: ingredientId,
    amount_g: amountG,
    week_start_date: weekStartStr,
    purchased: false,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/shopping')
  return { success: true }
}

export async function markPurchasedByIngredientIds(
  items: { ingredient_id: string; amount_g: number }[],
  weekStartStr: string
) {
  const supabase = await createClient()
  const results: string[] = []

  for (const item of items) {
    // Find unpurchased shopping list item for this ingredient this week
    const { data: existing } = await supabase
      .from('shopping_list')
      .select('id, amount_g')
      .eq('ingredient_id', item.ingredient_id)
      .eq('week_start_date', weekStartStr)
      .eq('purchased', false)
      .single()

    const amountToAdd = item.amount_g

    if (existing) {
      // Mark as purchased
      await supabase.from('shopping_list').update({ purchased: true }).eq('id', existing.id)
    }

    // Add to pantry
    const { data: pantryItem } = await supabase
      .from('pantry')
      .select('id, amount_g')
      .eq('ingredient_id', item.ingredient_id)
      .single()

    if (pantryItem) {
      await supabase
        .from('pantry')
        .update({ amount_g: pantryItem.amount_g + amountToAdd })
        .eq('id', pantryItem.id)
    } else {
      await supabase
        .from('pantry')
        .insert({ ingredient_id: item.ingredient_id, amount_g: amountToAdd })
    }

    results.push(item.ingredient_id)
  }

  revalidatePath('/shopping')
  revalidatePath('/pantry')
  return { success: true, count: results.length }
}

export async function removeShoppingItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('shopping_list').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/shopping')
  return { success: true }
}

