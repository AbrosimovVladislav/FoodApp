'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addPantryItem(ingredient_id: string, amount_g: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('pantry')
    .upsert({ ingredient_id, amount_g }, { onConflict: 'ingredient_id' })
  if (error) return { success: false, error: error.message }
  revalidatePath('/pantry')
  return { success: true }
}

export async function updatePantryAmount(id: string, amount_g: number) {
  const supabase = await createClient()
  if (amount_g <= 0) {
    const { error } = await supabase.from('pantry').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('pantry')
      .update({ amount_g })
      .eq('id', id)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath('/pantry')
  return { success: true }
}

export async function setPantryAmount(ingredient_id: string, amount_g: number) {
  const supabase = await createClient()
  if (amount_g <= 0) {
    await supabase.from('pantry').delete().eq('ingredient_id', ingredient_id)
  } else {
    await supabase
      .from('pantry')
      .upsert({ ingredient_id, amount_g }, { onConflict: 'ingredient_id' })
  }
  revalidatePath('/pantry')
  return { success: true }
}

export async function bulkUpdatePantry(
  updates: { ingredient_id: string; action: 'set' | 'add'; amount_g: number }[]
) {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('pantry')
    .select('ingredient_id, amount_g, id')

  const currentMap = new Map((current ?? []).map((p) => [p.ingredient_id, p]))

  for (const update of updates) {
    const existing = currentMap.get(update.ingredient_id)
    const newAmount =
      update.action === 'add'
        ? (existing?.amount_g ?? 0) + update.amount_g
        : update.amount_g

    if (newAmount <= 0) {
      if (existing) {
        await supabase.from('pantry').delete().eq('id', existing.id)
      }
    } else {
      await supabase
        .from('pantry')
        .upsert({ ingredient_id: update.ingredient_id, amount_g: newAmount }, { onConflict: 'ingredient_id' })
    }
  }

  revalidatePath('/pantry')
  return { success: true }
}

export async function buyIngredient(ingredient_id: string, amount_g: number) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('pantry')
    .select('id, amount_g')
    .eq('ingredient_id', ingredient_id)
    .single()
  if (existing) {
    const { error } = await supabase
      .from('pantry')
      .update({ amount_g: existing.amount_g + amount_g })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('pantry').insert({ ingredient_id, amount_g })
    if (error) return { success: false, error: error.message }
  }
  revalidatePath('/pantry')
  return { success: true }
}

export async function removePantryItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('pantry').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/pantry')
  return { success: true }
}
