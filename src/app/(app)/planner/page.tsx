import { createClient } from '@/lib/supabase/server'
import { PlannerPageClient } from '@/components/planner/planner-page-client'
import type { DishWithIngredients } from '@/components/dishes/dish-card'
import type { Ingredient, MealPlan, Settings } from '@/types/database'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const weekStart = params.week ? new Date(params.week) : getMonday(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 5)

  const weekStartStr = toDateStr(weekStart)
  const weekEndStr = toDateStr(weekEnd)

  const supabase = await createClient()

  const [mealPlanResult, dishesResult, ingredientsResult, settingsResult] = await Promise.all([
    supabase
      .from('meal_plan')
      .select('*')
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .order('created_at', { ascending: true }),
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
    <PlannerPageClient
      mealPlan={mealPlanResult.data as MealPlan[]}
      dishes={dishesResult.data as DishWithIngredients[]}
      ingredients={ingredientsResult.data as Ingredient[]}
      settings={settingsResult.data as Settings}
      weekStartStr={weekStartStr}
    />
  )
}
