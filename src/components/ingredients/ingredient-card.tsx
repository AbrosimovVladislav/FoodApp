'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{ingredient.name}</p>
        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>{ingredient.calories_per_100g} ккал</span>
          <span>Б {ingredient.protein_per_100g}г</span>
          <span>Ж {ingredient.fat_per_100g}г</span>
          <span>У {ingredient.carbs_per_100g}г</span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={() => onEdit(ingredient)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
