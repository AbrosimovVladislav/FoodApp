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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const weekStart = params.week ? new Date(params.week) : getMonday(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const weekStartStr = toDateStr(weekStart)
  const weekEndStr = toDateStr(weekEnd)

  const supabase = await createClient()

  const [mealPlanResult, dishesResult, ingredientsResult, settingsResult, { data: { user } }] = await Promise.all([
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
    supabase.from('settings').select('*').maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (mealPlanResult.error) throw new Error(mealPlanResult.error.message)
  if (dishesResult.error) throw new Error(dishesResult.error.message)
  if (ingredientsResult.error) throw new Error(ingredientsResult.error.message)
  if (settingsResult.error) throw new Error(settingsResult.error.message)

  const settings = (settingsResult.data ?? { daily_calorie_limit: 2000, daily_protein_goal: 120 }) as Settings
  const userName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? null

  return (
    <PlannerPageClient
      mealPlan={mealPlanResult.data as MealPlan[]}
      dishes={dishesResult.data as DishWithIngredients[]}
      ingredients={ingredientsResult.data as Ingredient[]}
      settings={settings}
      weekStartStr={weekStartStr}
      userName={userName}
    />
  )
}
