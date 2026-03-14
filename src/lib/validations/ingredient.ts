import { z } from 'zod'

export const CATEGORIES = [
  'крупы',
  'мясо',
  'молочное',
  'рыба',
  'овощи',
  'фрукты',
  'яйца',
  'прочее',
] as const

export const ingredientSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  category: z.enum(CATEGORIES),
  calories_per_100g: z.number({ error: 'Обязательно' }).min(0),
  protein_per_100g: z.number({ error: 'Обязательно' }).min(0),
  fat_per_100g: z.number({ error: 'Обязательно' }).min(0),
  carbs_per_100g: z.number({ error: 'Обязательно' }).min(0),
  unit: z.string(),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>

export const CATEGORY_LABELS: Record<string, string> = {
  крупы: 'Крупы',
  мясо: 'Мясо',
  молочное: 'Молочное',
  рыба: 'Рыба',
  овощи: 'Овощи',
  фрукты: 'Фрукты',
  яйца: 'Яйца',
  прочее: 'Прочее',
}
