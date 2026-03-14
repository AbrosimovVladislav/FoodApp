import { createClient } from '@/lib/supabase/server'
import { CabinetClient } from '@/components/cabinet/cabinet-client'
import { calcEntryKBJU, roundKBJU } from '@/lib/calc-kbju'
import type { DishWithIngredients } from '@/components/dishes/dish-card'
import type { Ingredient, MealPlan, Settings } from '@/types/database'

export interface DayStats {
  date: string
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface TopDish {
  dishId: string
  name: string
  count: number
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function CabinetPage() {
  const supabase = await createClient()

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)
  const fromDate = toDateStr(thirtyDaysAgo)
  const toDate = toDateStr(today)

  const [settingsResult, mealPlanResult, dishesResult, ingredientsResult] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase
      .from('meal_plan')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true }),
    supabase
      .from('dishes')
      .select('*, dish_ingredients(*, ingredients(*))')
      .order('name', { ascending: true }),
    supabase.from('ingredients').select('*').order('name', { ascending: true }),
  ])

  if (settingsResult.error) throw new Error(settingsResult.error.message)
  if (dishesResult.error) throw new Error(dishesResult.error.message)
  if (ingredientsResult.error) throw new Error(ingredientsResult.error.message)

  const settings = settingsResult.data as Settings
  const mealPlan = (mealPlanResult.data ?? []) as MealPlan[]
  const dishes = dishesResult.data as DishWithIngredients[]
  const ingredients = ingredientsResult.data as Ingredient[]

  // Aggregate КБЖУ per day
  const dayMap = new Map<string, { calories: number; protein: number; fat: number; carbs: number }>()
  for (const entry of mealPlan) {
    const kbju = roundKBJU(calcEntryKBJU(entry, dishes, ingredients))
    const existing = dayMap.get(entry.date) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 }
    dayMap.set(entry.date, {
      calories: existing.calories + kbju.calories,
      protein: existing.protein + kbju.protein,
      fat: existing.fat + kbju.fat,
      carbs: existing.carbs + kbju.carbs,
    })
  }

  // Build array for last 14 days (bar chart)
  const last14: DayStats[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = toDateStr(d)
    const stats = dayMap.get(dateStr)
    last14.push({
      date: dateStr,
      calories: stats ? Math.round(stats.calories) : 0,
      protein: stats ? Math.round(stats.protein * 10) / 10 : 0,
      fat: stats ? Math.round(stats.fat * 10) / 10 : 0,
      carbs: stats ? Math.round(stats.carbs * 10) / 10 : 0,
    })
  }

  // Weekly avg (last 7 days with data)
  const last7 = last14.slice(7)
  const last7WithData = last7.filter((d) => d.calories > 0)
  const weeklyAvg =
    last7WithData.length > 0
      ? {
          calories: Math.round(last7WithData.reduce((s, d) => s + d.calories, 0) / last7WithData.length),
          protein: Math.round((last7WithData.reduce((s, d) => s + d.protein, 0) / last7WithData.length) * 10) / 10,
          fat: Math.round((last7WithData.reduce((s, d) => s + d.fat, 0) / last7WithData.length) * 10) / 10,
          carbs: Math.round((last7WithData.reduce((s, d) => s + d.carbs, 0) / last7WithData.length) * 10) / 10,
        }
      : null

  // Top 5 dishes (last 30 days)
  const dishCount = new Map<string, number>()
  for (const entry of mealPlan) {
    if (entry.dish_id) {
      dishCount.set(entry.dish_id, (dishCount.get(entry.dish_id) ?? 0) + 1)
    }
  }
  const topDishes: TopDish[] = Array.from(dishCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dishId, count]) => ({
      dishId,
      name: dishes.find((d) => d.id === dishId)?.name ?? dishId,
      count,
    }))

  return (
    <CabinetClient
      settings={settings}
      last14={last14}
      weeklyAvg={weeklyAvg}
      topDishes={topDishes}
      calorieLimit={settings.daily_calorie_limit}
    />
  )
}
