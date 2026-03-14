'use client'

import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteIngredient } from '@/app/(app)/ingredients/actions'
import type { Ingredient } from '@/types/database'

interface IngredientCardProps {
  ingredient: Ingredient
  onEdit: (ingredient: Ingredient) => void
}

export function IngredientCard({ ingredient, onEdit }: IngredientCardProps) {
  async function handleDelete() {
    const result = await deleteIngredient(ingredient.id)
    if (!result.success) {
      toast.error(result.error ?? 'Ошибка удаления')
    } else {
      toast.success('Удалено')
    }
  }

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-3">
      {/* Tap → edit */}
      <button className="flex-1 min-w-0 text-left" onClick={() => onEdit(ingredient)}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm text-foreground truncate">{ingredient.name}</p>
          <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
            {ingredient.calories_per_100g} ккал
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Б {ingredient.protein_per_100g} · Ж {ingredient.fat_per_100g} · У {ingredient.carbs_per_100g}{' '}
          <span className="opacity-50">/ 100г</span>
        </p>
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
