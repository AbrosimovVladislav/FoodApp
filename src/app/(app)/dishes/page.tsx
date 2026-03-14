import { createClient } from '@/lib/supabase/server'
import { DishesPageClient } from '@/components/dishes/dishes-page-client'
import type { Ingredient } from '@/types/database'
import type { DishWithIngredients } from '@/components/dishes/dish-card'

export default async function DishesPage() {
  const supabase = await createClient()

  const [dishesResult, ingredientsResult] = await Promise.all([
    supabase
      .from('dishes')
      .select('*, dish_ingredients(*, ingredients(*))')
      .order('created_at', { ascending: false }),
    supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true }),
  ])

  if (dishesResult.error) throw new Error(dishesResult.error.message)
  if (ingredientsResult.error) throw new Error(ingredientsResult.error.message)

  return (
    <DishesPageClient
      dishes={dishesResult.data as DishWithIngredients[]}
      ingredients={ingredientsResult.data as Ingredient[]}
    />
  )
}
