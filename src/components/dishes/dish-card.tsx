'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
    <div className={cn(
      'flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-3',
      deleting && 'opacity-50'
    )}>
      {/* Main tap area → edit */}
      <button className="flex-1 min-w-0 text-left" onClick={() => onEdit(dish)}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate flex-1">{dish.name}</span>
          <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
            {kbju.calories} ккал
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal shrink-0">
            {MEAL_TYPE_LABELS[dish.meal_type] ?? dish.meal_type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Б {kbju.protein} · Ж {kbju.fat} · У {kbju.carbs}
          </span>
        </div>
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
