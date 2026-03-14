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

export async function removePantryItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('pantry').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/pantry')
  return { success: true }
}
