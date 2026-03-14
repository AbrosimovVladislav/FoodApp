import { z } from 'zod'

export const dishIngredientSchema = z.object({
  ingredient_id: z.string().min(1, 'Выберите ингредиент'),
  amount_g: z.number({ error: 'Введите количество' }).min(1, 'Минимум 1г'),
})

export const dishSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  meal_type: z.enum(['breakfast', 'main', 'side', 'dessert', 'snack']),
  ingredients: z
    .array(dishIngredientSchema)
    .min(1, 'Добавьте хотя бы один ингредиент'),
})

export type DishFormValues = z.infer<typeof dishSchema>

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  main: 'Основное',
  side: 'Гарнир',
  dessert: 'Десерт',
  snack: 'Перекус',
}
