import type { Ingredient, DishIngredient, MealPlan } from '@/types/database'

export interface KBJU {
  calories: number
  protein: number
  fat: number
  carbs: number
}

export type DishIngredientWithIngredient = DishIngredient & {
  ingredients: Ingredient
}

export function calcDishKBJU(dishIngredients: DishIngredientWithIngredient[]): KBJU {
  return dishIngredients.reduce<KBJU>(
    (acc, di) => {
      const factor = di.amount_g / 100
      return {
        calories: acc.calories + di.ingredients.calories_per_100g * factor,
        protein: acc.protein + di.ingredients.protein_per_100g * factor,
        fat: acc.fat + di.ingredients.fat_per_100g * factor,
        carbs: acc.carbs + di.ingredients.carbs_per_100g * factor,
      }
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}

export interface DishForCalc {
  id: string
  dish_ingredients: Array<{
    amount_g: number
    ingredients: Pick<Ingredient, 'calories_per_100g' | 'protein_per_100g' | 'fat_per_100g' | 'carbs_per_100g'>
  }>
}

export interface IngredientForCalc {
  id: string
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
}

export function calcEntryKBJU(
  entry: Pick<MealPlan, 'dish_id' | 'ingredient_id' | 'amount_g'>,
  dishes: DishForCalc[],
  ingredients: IngredientForCalc[]
): KBJU {
  if (entry.dish_id) {
    const dish = dishes.find((d) => d.id === entry.dish_id)
    if (!dish) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    const full = calcDishKBJU(dish.dish_ingredients as DishIngredientWithIngredient[])
    if (entry.amount_g && entry.amount_g > 0) {
      const totalWeight = dish.dish_ingredients.reduce((s, di) => s + di.amount_g, 0)
      if (totalWeight > 0) {
        const ratio = entry.amount_g / totalWeight
        return {
          calories: full.calories * ratio,
          protein: full.protein * ratio,
          fat: full.fat * ratio,
          carbs: full.carbs * ratio,
        }
      }
    }
    return full
  }
  if (entry.ingredient_id && entry.amount_g) {
    const ing = ingredients.find((i) => i.id === entry.ingredient_id)
    if (!ing) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    const factor = entry.amount_g / 100
    return {
      calories: ing.calories_per_100g * factor,
      protein: ing.protein_per_100g * factor,
      fat: ing.fat_per_100g * factor,
      carbs: ing.carbs_per_100g * factor,
    }
  }
  return { calories: 0, protein: 0, fat: 0, carbs: 0 }
}

export function roundKBJU(kbju: KBJU): KBJU {
  return {
    calories: Math.round(kbju.calories),
    protein: Math.round(kbju.protein * 10) / 10,
    fat: Math.round(kbju.fat * 10) / 10,
    carbs: Math.round(kbju.carbs * 10) / 10,
  }
}
