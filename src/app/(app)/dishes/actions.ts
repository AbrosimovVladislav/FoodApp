'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DishFormValues } from '@/lib/validations/dish'

export async function createDish(values: DishFormValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .insert({
      name: values.name,
      description: values.description ?? null,
      meal_type: values.meal_type,
      user_id: user.id,
    })
    .select('id')
    .single()

  if (dishError) return { success: false, error: dishError.message }

  const { error: ingError } = await supabase.from('dish_ingredients').insert(
    values.ingredients.map((i) => ({
      dish_id: dish.id,
      ingredient_id: i.ingredient_id,
      amount_g: i.amount_g,
    }))
  )

  if (ingError) return { success: false, error: ingError.message }

  revalidatePath('/dishes')
  return { success: true, dishId: dish.id }
}

export async function updateDish(id: string, values: DishFormValues) {
  const supabase = await createClient()

  const { error: dishError } = await supabase
    .from('dishes')
    .update({
      name: values.name,
      description: values.description ?? null,
      meal_type: values.meal_type,
    })
    .eq('id', id)

  if (dishError) return { success: false, error: dishError.message }

  // Replace all ingredients
  const { error: deleteError } = await supabase
    .from('dish_ingredients')
    .delete()
    .eq('dish_id', id)

  if (deleteError) return { success: false, error: deleteError.message }

  const { error: ingError } = await supabase.from('dish_ingredients').insert(
    values.ingredients.map((i) => ({
      dish_id: id,
      ingredient_id: i.ingredient_id,
      amount_g: i.amount_g,
    }))
  )

  if (ingError) return { success: false, error: ingError.message }

  revalidatePath('/dishes')
  return { success: true }
}

export async function deleteDish(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('dishes').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dishes')
  return { success: true }
}
