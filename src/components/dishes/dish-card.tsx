'use client'

import { useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { calcDishKBJU, roundKBJU } from '@/lib/calc-kbju'
import { MEAL_TYPE_LABELS } from '@/lib/validations/dish'
import { deleteDish } from '@/app/(app)/dishes/actions'
import type { Dish, Ingredient, DishIngredient } from '@/types/database'

export type DishWithIngredients = Dish & {
  dish_ingredients: (DishIngredient & { ingredients: Ingredient })[]
}

interface DishCardProps {
  dish: DishWithIngredients
  onEdit: (dish: DishWithIngredients) => void
}

export function DishCard({ dish, onEdit }: DishCardProps) {
  const [deleting, setDeleting] = useState(false)
  const kbju = roundKBJU(calcDishKBJU(dish.dish_ingredients))

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteDish(dish.id)
    if (!result.success) {
      toast.error(result.error ?? 'Ошибка удаления')
      setDeleting(false)
    } else {
      toast.success('Блюдо удалено')
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-medium text-foreground truncate">{dish.name}</span>
          {dish.description && (
            <span className="text-xs text-muted-foreground line-clamp-2">
              {dish.description}
            </span>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {MEAL_TYPE_LABELS[dish.meal_type] ?? dish.meal_type}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <KBJUStat label="ккал" value={kbju.calories} accent />
        <KBJUStat label="белки" value={kbju.protein} unit="г" />
        <KBJUStat label="жиры" value={kbju.fat} unit="г" />
        <KBJUStat label="углеводы" value={kbju.carbs} unit="г" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-10"
          onClick={() => onEdit(dish)}
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Изменить
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-10 px-3 text-destructive hover:text-destructive', deleting && 'opacity-50')}
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function KBJUStat({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: number
  unit?: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col items-center bg-secondary rounded-lg py-2 px-1">
      <span
        className={cn(
          'text-sm font-semibold',
          accent ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
        {unit}
      </span>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    </div>
  )
}
