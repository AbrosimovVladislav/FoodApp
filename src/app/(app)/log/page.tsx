import { createClient } from '@/lib/supabase/server'
import { LogClient } from '@/components/log/log-client'
import type { DishWithIngredients } from '@/components/dishes/dish-card'
import type { Ingredient, MealPlan, FoodLog, Settings } from '@/types/database'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const date = params.date ?? toDateStr(new Date())

  const supabase = await createClient()

  const [mealPlanResult, foodLogResult, dishesResult, ingredientsResult, settingsResult] =
    await Promise.all([
      supabase
        .from('meal_plan')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true }),
      supabase.from('food_log').select('*').eq('date', date).order('created_at', { ascending: true }),
      supabase
        .from('dishes')
        .select('*, dish_ingredients(*, ingredients(*))')
        .order('name', { ascending: true }),
      supabase.from('ingredients').select('*').order('name', { ascending: true }),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ])

  if (mealPlanResult.error) throw new Error(mealPlanResult.error.message)
  if (dishesResult.error) throw new Error(dishesResult.error.message)
  if (ingredientsResult.error) throw new Error(ingredientsResult.error.message)
  if (settingsResult.error) throw new Error(settingsResult.error.message)

  return (
    <LogClient
      date={date}
      mealPlan={mealPlanResult.data as MealPlan[]}
      foodLog={(foodLogResult.data ?? []) as FoodLog[]}
      dishes={dishesResult.data as DishWithIngredients[]}
      ingredients={ingredientsResult.data as Ingredient[]}
      settings={settingsResult.data as Settings}
    />
  )
}
