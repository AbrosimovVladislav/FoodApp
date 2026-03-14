import { createClient } from '@/lib/supabase/server'
import { PantryClient } from '@/components/pantry/pantry-client'
import type { Ingredient } from '@/types/database'

export type PantryItemWithIngredient = {
  id: string
  amount_g: number
  ingredient_id: string
  updated_at: string | null
  ingredients: Pick<Ingredient, 'name' | 'category' | 'unit'>
}

export default async function PantryPage() {
  const supabase = await createClient()

  const [pantryRes, ingredientsRes] = await Promise.all([
    supabase
      .from('pantry')
      .select('id, amount_g, ingredient_id, updated_at, ingredients(name, category, unit)'),
    supabase.from('ingredients').select('id, name, category').order('name'),
  ])

  if (pantryRes.error) throw new Error(pantryRes.error.message)
  if (ingredientsRes.error) throw new Error(ingredientsRes.error.message)

  const pantry = (pantryRes.data ?? []) as PantryItemWithIngredient[]
  const sorted = [...pantry].sort((a, b) =>
    a.ingredients.name.localeCompare(b.ingredients.name, 'ru')
  )

  return (
    <PantryClient
      pantry={sorted}
      allIngredients={ingredientsRes.data as Pick<Ingredient, 'id' | 'name' | 'category'>[]}
    />
  )
}
