'use client'

import { useState } from 'react'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DishCard, type DishWithIngredients } from '@/components/dishes/dish-card'
import { DishForm } from '@/components/dishes/dish-form'
import type { Ingredient } from '@/types/database'

interface DishesPageClientProps {
  dishes: DishWithIngredients[]
  ingredients: Ingredient[]
}

export function DishesPageClient({ dishes, ingredients }: DishesPageClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<DishWithIngredients | null>(null)

  function openAdd() {
    setEditingDish(null)
    setSheetOpen(true)
  }

  function openEdit(dish: DishWithIngredients) {
    setEditingDish(dish)
    setSheetOpen(true)
  }

  function handleSuccess() {
    setSheetOpen(false)
    setEditingDish(null)
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4">
          <h1 className="text-2xl">Блюда</h1>
          <Button size="sm" onClick={openAdd} className="h-10 gap-1.5">
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 px-4 pb-6">
          {dishes.length === 0 ? (
            <EmptyState onAdd={openAdd} />
          ) : (
            <div className="flex flex-col gap-3">
              {dishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} onEdit={openEdit} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingDish ? 'Редактировать блюдо' : 'Новое блюдо'}</SheetTitle>
          </SheetHeader>
          <DishForm
            ingredients={ingredients}
            editingDish={editingDish}
            onSuccess={handleSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
        <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground">Блюд пока нет</p>
        <p className="text-sm text-muted-foreground">
          Добавьте первое блюдо вручную или через голос
        </p>
      </div>
      <Button onClick={onAdd} className="h-11 px-6">
        <Plus className="w-4 h-4 mr-2" />
        Добавить блюдо
      </Button>
    </div>
  )
}
