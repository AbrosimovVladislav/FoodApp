'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { IngredientCard } from '@/components/ingredients/ingredient-card'
import { IngredientForm } from '@/components/ingredients/ingredient-form'
import type { Ingredient } from '@/types/database'

interface IngredientsPageClientProps {
  ingredients: Ingredient[]
}

export function IngredientsPageClient({ ingredients }: IngredientsPageClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [search, setSearch] = useState('')

  const filtered = search
    ? ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients

  const grouped: Record<string, Ingredient[]> = {}
  for (const ing of filtered) {
    const cat = ing.category || 'прочее'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ing)
  }

  function openAdd() {
    setEditingIngredient(null)
    setSheetOpen(true)
  }

  function openEdit(ingredient: Ingredient) {
    setEditingIngredient(ingredient)
    setSheetOpen(true)
  }

  function handleSuccess() {
    setSheetOpen(false)
    setEditingIngredient(null)
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4">
          <h1 className="text-2xl">Ингредиенты</h1>
          <Button size="sm" onClick={openAdd} className="h-10 gap-1.5">
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 px-4 pb-6">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16 text-sm">
              {search ? 'Ничего не найдено' : 'Нет ингредиентов'}
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b, 'ru'))
                .map(([cat, ings]) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {cat}
                    </p>
                    <div className="flex flex-col gap-2">
                      {ings.map((ing) => (
                        <IngredientCard key={ing.id} ingredient={ing} onEdit={openEdit} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl px-4 pb-8"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>
              {editingIngredient ? 'Редактировать ингредиент' : 'Новый ингредиент'}
            </SheetTitle>
          </SheetHeader>
          <IngredientForm editingIngredient={editingIngredient} onSuccess={handleSuccess} />
        </SheetContent>
      </Sheet>
    </>
  )
}
