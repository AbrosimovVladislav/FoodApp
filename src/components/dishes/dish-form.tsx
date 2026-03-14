'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { VoiceInputButton } from '@/components/dishes/voice-input-button'
import { dishSchema, MEAL_TYPE_LABELS, type DishFormValues } from '@/lib/validations/dish'
import { createDish, updateDish } from '@/app/(app)/dishes/actions'
import type { Ingredient } from '@/types/database'
import type { DishWithIngredients } from '@/components/dishes/dish-card'

interface DishFormProps {
  ingredients: Ingredient[]
  editingDish?: DishWithIngredients | null
  onSuccess: () => void
}

const ingredientsByCategory = (ingredients: Ingredient[]) => {
  const grouped: Record<string, Ingredient[]> = {}
  for (const ing of ingredients) {
    const cat = ing.category || 'Прочее'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ing)
  }
  return grouped
}

export function DishForm({ ingredients, editingDish, onSuccess }: DishFormProps) {
  const isEditing = !!editingDish

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DishFormValues>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      name: '',
      description: '',
      meal_type: 'main',
      ingredients: [{ ingredient_id: '', amount_g: 100 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

  useEffect(() => {
    if (editingDish) {
      reset({
        name: editingDish.name,
        description: editingDish.description ?? '',
        meal_type: editingDish.meal_type as DishFormValues['meal_type'],
        ingredients: editingDish.dish_ingredients.map((di) => ({
          ingredient_id: di.ingredient_id,
          amount_g: di.amount_g,
        })),
      })
    } else {
      reset({
        name: '',
        description: '',
        meal_type: 'main',
        ingredients: [{ ingredient_id: '', amount_g: 100 }],
      })
    }
  }, [editingDish, reset])

  async function onSubmit(values: DishFormValues) {
    const result = isEditing
      ? await updateDish(editingDish!.id, values)
      : await createDish(values)

    if (!result.success) {
      toast.error(result.error ?? 'Ошибка сохранения')
      return
    }

    toast.success(isEditing ? 'Блюдо обновлено' : 'Блюдо добавлено')
    onSuccess()
  }

  function handleVoiceResult(
    data: Partial<DishFormValues> & { newIngredients?: { id: string; name: string }[] }
  ) {
    if (data.name) setValue('name', data.name)
    if (data.meal_type) setValue('meal_type', data.meal_type)
    if (data.description) setValue('description', data.description)
    if (data.ingredients && data.ingredients.length > 0) {
      // Replace ingredient fields with voice result
      const valid = data.ingredients.filter((i) => i.ingredient_id && i.amount_g > 0)
      if (valid.length > 0) {
        reset((prev) => ({ ...prev, ingredients: valid }))
      }
    }
  }

  const grouped = ingredientsByCategory(ingredients)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Name + voice */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            placeholder="Гречка с курицей"
            {...register('name')}
          />
          {errors.name && (
            <span className="text-xs text-destructive">{errors.name.message}</span>
          )}
        </div>
        <VoiceInputButton onResult={handleVoiceResult} disabled={isSubmitting} />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Описание (необязательно)</Label>
        <Input
          id="description"
          placeholder="Простое и сытное блюдо"
          {...register('description')}
        />
      </div>

      {/* Meal type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="meal_type">Тип блюда</Label>
        <select
          id="meal_type"
          {...register('meal_type')}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.meal_type && (
          <span className="text-xs text-destructive">{errors.meal_type.message}</span>
        )}
      </div>

      <Separator />

      {/* Ingredients */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Ингредиенты</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ingredient_id: '', amount_g: 100 })}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Добавить
          </Button>
        </div>

        {errors.ingredients?.root && (
          <span className="text-xs text-destructive">{errors.ingredients.root.message}</span>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1 flex flex-col gap-1">
              <select
                {...register(`ingredients.${index}.ingredient_id`)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Выберите ингредиент</option>
                {Object.entries(grouped).map(([cat, ings]) => (
                  <optgroup key={cat} label={cat}>
                    {ings.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.ingredients?.[index]?.ingredient_id && (
                <span className="text-xs text-destructive">
                  {errors.ingredients[index].ingredient_id?.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1 w-24">
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  className="pr-6"
                  {...register(`ingredients.${index}.amount_g`, { valueAsNumber: true })}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  г
                </span>
              </div>
              {errors.ingredients?.[index]?.amount_g && (
                <span className="text-xs text-destructive">
                  {errors.ingredients[index].amount_g?.message}
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-12 mt-2">
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {isEditing ? 'Сохранить изменения' : 'Добавить блюдо'}
      </Button>
    </form>
  )
}
