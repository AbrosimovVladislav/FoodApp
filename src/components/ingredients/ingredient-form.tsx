'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ingredientSchema,
  CATEGORIES,
  CATEGORY_LABELS,
  type IngredientFormValues,
} from '@/lib/validations/ingredient'
import { createIngredient, updateIngredient } from '@/app/(app)/ingredients/actions'
import type { Ingredient } from '@/types/database'

interface IngredientFormProps {
  editingIngredient?: Ingredient | null
  onSuccess: () => void
}

export function IngredientForm({ editingIngredient, onSuccess }: IngredientFormProps) {
  const isEditing = !!editingIngredient

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      category: 'прочее',
      calories_per_100g: 0,
      protein_per_100g: 0,
      fat_per_100g: 0,
      carbs_per_100g: 0,
      unit: 'г',
    },
  })

  useEffect(() => {
    if (editingIngredient) {
      reset({
        name: editingIngredient.name,
        category: editingIngredient.category as IngredientFormValues['category'],
        calories_per_100g: editingIngredient.calories_per_100g,
        protein_per_100g: editingIngredient.protein_per_100g,
        fat_per_100g: editingIngredient.fat_per_100g,
        carbs_per_100g: editingIngredient.carbs_per_100g,
        unit: editingIngredient.unit,
      })
    } else {
      reset({
        name: '',
        category: 'прочее',
        calories_per_100g: 0,
        protein_per_100g: 0,
        fat_per_100g: 0,
        carbs_per_100g: 0,
        unit: 'г',
      })
    }
  }, [editingIngredient, reset])

  async function onSubmit(values: IngredientFormValues) {
    const result = isEditing
      ? await updateIngredient(editingIngredient!.id, values)
      : await createIngredient(values)

    if (!result.success) {
      toast.error(result.error ?? 'Ошибка сохранения')
      return
    }

    toast.success(isEditing ? 'Сохранено' : 'Добавлено')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Название</Label>
        <Input id="name" placeholder="Гречка" {...register('name')} />
        {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Категория</Label>
        <select
          id="category"
          {...register('category')}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <Label>КБЖУ на 100г</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="calories" className="text-xs text-muted-foreground">
              Калории (ккал)
            </Label>
            <Input
              id="calories"
              type="number"
              step="0.1"
              min="0"
              {...register('calories_per_100g', { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="protein" className="text-xs text-muted-foreground">
              Белки (г)
            </Label>
            <Input
              id="protein"
              type="number"
              step="0.1"
              min="0"
              {...register('protein_per_100g', { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="fat" className="text-xs text-muted-foreground">
              Жиры (г)
            </Label>
            <Input
              id="fat"
              type="number"
              step="0.1"
              min="0"
              {...register('fat_per_100g', { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="carbs" className="text-xs text-muted-foreground">
              Углеводы (г)
            </Label>
            <Input
              id="carbs"
              type="number"
              step="0.1"
              min="0"
              {...register('carbs_per_100g', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-12 mt-2">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {isEditing ? 'Сохранить' : 'Добавить'}
      </Button>
    </form>
  )
}
