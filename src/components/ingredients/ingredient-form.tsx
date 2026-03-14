'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Loader2, Sparkles } from 'lucide-react'
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
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  const nameValue = watch('name')

  async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const maxSize = 1024
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context unavailable')); return }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        const base64 = dataUrl.split(',')[1]
        resolve({ base64, mimeType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = url
    })
  }

  async function fillFromPhoto(files: FileList) {
    if (!files.length) return
    setIsCapturing(true)
    try {
      const compressed = await Promise.all(Array.from(files).map(compressImage))
      const res = await fetch('/api/ingredient-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: compressed }),
      })
      const data = await res.json() as {
        name?: string
        calories?: number
        protein?: number
        fat?: number
        carbs?: number
        category?: string
        unit?: string
        error?: string
      }

      if (!res.ok || data.error) {
        toast.error(data.error ?? 'Не удалось определить продукт')
        return
      }

      if (data.name) setValue('name', data.name)
      if (data.calories !== undefined) setValue('calories_per_100g', data.calories)
      if (data.protein !== undefined) setValue('protein_per_100g', data.protein)
      if (data.fat !== undefined) setValue('fat_per_100g', data.fat)
      if (data.carbs !== undefined) setValue('carbs_per_100g', data.carbs)
      if (data.category) setValue('category', data.category as IngredientFormValues['category'])
      if (data.unit) setValue('unit', data.unit)

      toast.success('Продукт определён')
    } catch {
      toast.error('Ошибка обработки фото')
    } finally {
      setIsCapturing(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function fillWithAI() {
    const name = nameValue?.trim()
    if (!name) return

    setIsLookingUp(true)
    try {
      const res = await fetch('/api/ingredient-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json() as {
        calories?: number
        protein?: number
        fat?: number
        carbs?: number
        category?: string
        unit?: string
        error?: string
      }

      if (!res.ok || data.error) {
        toast.error(data.error ?? 'Не удалось получить данные')
        return
      }

      if (data.calories !== undefined) setValue('calories_per_100g', data.calories)
      if (data.protein !== undefined) setValue('protein_per_100g', data.protein)
      if (data.fat !== undefined) setValue('fat_per_100g', data.fat)
      if (data.carbs !== undefined) setValue('carbs_per_100g', data.carbs)
      if (data.category) setValue('category', data.category as IngredientFormValues['category'])
      if (data.unit) setValue('unit', data.unit)

      toast.success('КБЖУ заполнено')
    } catch {
      toast.error('Ошибка запроса')
    } finally {
      setIsLookingUp(false)
    }
  }

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
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) fillFromPhoto(e.target.files) }}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Название</Label>
        <div className="flex gap-2">
          <Input id="name" placeholder="Гречка" {...register('name')} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={isCapturing || isLookingUp}
            onClick={() => photoInputRef.current?.click()}
            title="Определить продукт по фото"
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={!nameValue?.trim() || isLookingUp || isCapturing}
            onClick={fillWithAI}
            title="Заполнить КБЖУ через AI по названию"
          >
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </Button>
        </div>
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
