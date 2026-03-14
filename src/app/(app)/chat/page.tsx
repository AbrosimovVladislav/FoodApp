import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ChatClient } from '@/components/chat/chat-client'
import { calcDishKBJU } from '@/lib/calc-kbju'
import type { DishWithIngredients } from '@/components/dishes/dish-card'
import type { Ingredient, MealPlan, Settings } from '@/types/database'

export interface TodayMealEntry {
  id: string
  name: string
  amount_g: number
  calories: number
  eaten: boolean
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function ChatPage() {
  const supabase = await createClient()
  const today = toDateStr(new Date())

  const [planResult, dishesResult, ingredientsResult, settingsResult, { data: { user } }] = await Promise.all([
    supabase.from('meal_plan').select('*').eq('date', today).order('created_at', { ascending: true }),
    supabase.from('dishes').select('*, dish_ingredients(*, ingredients(*))'),
    supabase.from('ingredients').select('*'),
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.auth.getUser(),
  ])

  const dishes = (dishesResult.data ?? []) as DishWithIngredients[]
  const ingredients = (ingredientsResult.data ?? []) as Ingredient[]
  const mealPlan = (planResult.data ?? []) as MealPlan[]
  const dailyLimit = (settingsResult.data as Settings | null)?.daily_calorie_limit ?? 2000

  const todayEntries: TodayMealEntry[] = mealPlan.map((entry) => {
    let name = '—'
    let calories = 0

    if (entry.dish_id) {
      const dish = dishes.find((d) => d.id === entry.dish_id)
      if (dish) {
        name = dish.name
        const full = calcDishKBJU(dish.dish_ingredients)
        const totalWeight = dish.dish_ingredients.reduce((s, di) => s + di.amount_g, 0)
        const ratio = totalWeight > 0 && entry.amount_g ? entry.amount_g / totalWeight : 1
        calories = Math.round(full.calories * ratio)
      }
    } else if (entry.ingredient_id) {
      const ing = ingredients.find((i) => i.id === entry.ingredient_id)
      if (ing) {
        name = ing.name
        calories = Math.round(ing.calories_per_100g * (entry.amount_g ?? 100) / 100)
      }
    }

    return {
      id: entry.id,
      name,
      amount_g: entry.amount_g ?? 0,
      calories,
      eaten: entry.eaten ?? false,
    }
  })

  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0)
  const userName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Помощник" />
      <ChatClient
        todayEntries={todayEntries}
        todayCalories={todayCalories}
        dailyLimit={dailyLimit}
        userName={userName}
      />
    </div>
  )
}
