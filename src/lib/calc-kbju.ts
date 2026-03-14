import type { Ingredient, DishIngredient } from '@/types/database'

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

export function roundKBJU(kbju: KBJU): KBJU {
  return {
    calories: Math.round(kbju.calories),
    protein: Math.round(kbju.protein * 10) / 10,
    fat: Math.round(kbju.fat * 10) / 10,
    carbs: Math.round(kbju.carbs * 10) / 10,
  }
}
