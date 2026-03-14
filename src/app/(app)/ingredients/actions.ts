'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { IngredientFormValues } from '@/lib/validations/ingredient'

export async function createIngredient(values: IngredientFormValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('ingredients').insert({
    name: values.name,
    category: values.category,
    calories_per_100g: values.calories_per_100g,
    protein_per_100g: values.protein_per_100g,
    fat_per_100g: values.fat_per_100g,
    carbs_per_100g: values.carbs_per_100g,
    unit: values.unit || 'г',
    user_id: user.id,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/ingredients')
  revalidatePath('/dishes')
  return { success: true }
}

export async function updateIngredient(id: string, values: IngredientFormValues) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ingredients')
    .update({
      name: values.name,
      category: values.category,
      calories_per_100g: values.calories_per_100g,
      protein_per_100g: values.protein_per_100g,
      fat_per_100g: values.fat_per_100g,
      carbs_per_100g: values.carbs_per_100g,
      unit: values.unit || 'г',
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/ingredients')
  revalidatePath('/dishes')
  return { success: true }
}

export async function deleteIngredient(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/ingredients')
  return { success: true }
}
