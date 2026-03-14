import { createClient } from '@/lib/supabase/server'
import { PantryClient } from '@/components/pantry/pantry-client'
import type { Ingredient } from '@/types/database'

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

export type PantryItemWithIngredient = {
  id: string
  amount_g: number
  ingredient_id: string
  updated_at: string | null
  ingredients: Pick<Ingredient, 'name' | 'category' | 'unit'>
}

export default async function PantryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const today = toDateStr(new Date())

  const supabase = await createClient()

  // Use Monday of current week so today's and earlier-this-week entries are included
  const weekStart = toDateStr(getMonday(new Date()))

  const [pantryRes, ingredientsRes, mealPlanRes] = await Promise.all([
    supabase
      .from('pantry')
      .select('id, amount_g, ingredient_id, updated_at, ingredients(name, category, unit)'),
    supabase.from('ingredients').select('*').order('name'),
    // All meal plan entries from start of current week onward
    supabase
      .from('meal_plan')
      .select('date, dish_id, ingredient_id, amount_g')
      .gte('date', weekStart)
      .order('date', { ascending: true }),
  ])

  if (pantryRes.error) throw new Error(pantryRes.error.message)
  if (ingredientsRes.error) throw new Error(ingredientsRes.error.message)
  if (mealPlanRes.error) throw new Error(mealPlanRes.error.message)

  // Resolve dish ingredients for all planned dishes
  const futureDishIds = [
    ...new Set(
      (mealPlanRes.data ?? [])
        .filter((e) => e.dish_id)
        .map((e) => e.dish_id as string)
    ),
  ]

  const dishIngredientsRes =
    futureDishIds.length > 0
      ? await supabase.from('dish_ingredients').select('*').in('dish_id', futureDishIds)
      : { data: [] }

  // Total planned consumption per ingredient across all future dates
  const plannedConsumption: Record<string, number> = {}
  for (const entry of mealPlanRes.data ?? []) {
    if (entry.dish_id && entry.amount_g) {
      const dis = (dishIngredientsRes.data ?? []).filter((di) => di.dish_id === entry.dish_id)
      const totalDishWeight = dis.reduce((s, di) => s + di.amount_g, 0)
      const ratio = totalDishWeight > 0 ? entry.amount_g / totalDishWeight : 1
      for (const di of dis) {
        plannedConsumption[di.ingredient_id] =
          (plannedConsumption[di.ingredient_id] ?? 0) + di.amount_g * ratio
      }
    } else if (entry.ingredient_id && entry.amount_g) {
      plannedConsumption[entry.ingredient_id] =
        (plannedConsumption[entry.ingredient_id] ?? 0) + entry.amount_g
    }
  }

  const pantry = (pantryRes.data ?? []) as PantryItemWithIngredient[]
  const sorted = [...pantry].sort((a, b) =>
    a.ingredients.name.localeCompare(b.ingredients.name, 'ru')
  )

  const allIngredients = ingredientsRes.data as Ingredient[]
  const pantryIngIds = new Set(pantry.map((p) => p.ingredient_id))

  // Ingredients needed by plan but completely absent from pantry
  const missingIngredients = Object.entries(plannedConsumption)
    .filter(([id]) => !pantryIngIds.has(id))
    .map(([id, neededG]) => ({
      ingredient: allIngredients.find((i) => i.id === id)!,
      neededG: Math.round(neededG),
    }))
    .filter((m) => m.ingredient)
    .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'ru'))

  // Ingredients in pantry but with insufficient amount for the plan
  const shortageItems = pantry
    .filter((item) => {
      const needed = plannedConsumption[item.ingredient_id] ?? 0
      return needed > 0 && item.amount_g < needed
    })
    .map((item) => ({
      ingredient: allIngredients.find((i) => i.id === item.ingredient_id)!,
      inPantryG: item.amount_g,
      needMoreG: Math.round((plannedConsumption[item.ingredient_id] ?? 0) - item.amount_g),
    }))
    .filter((s) => s.ingredient)
    .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'ru'))

  return (
    <PantryClient
      pantry={sorted}
      allIngredients={allIngredients}
      defaultTab={params.tab ?? 'pantry'}
      plannedConsumption={plannedConsumption}
      missingIngredients={missingIngredients}
      shortageItems={shortageItems}
    />
  )
}
