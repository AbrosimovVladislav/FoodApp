'use client'

import { useState } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, Refrigerator } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { addPantryItem, updatePantryAmount, removePantryItem } from '@/app/(app)/pantry/actions'
import type { PantryItemWithIngredient } from '@/app/(app)/pantry/page'
import type { Ingredient } from '@/types/database'

interface PantryClientProps {
  pantry: PantryItemWithIngredient[]
  allIngredients: Pick<Ingredient, 'id' | 'name' | 'category'>[]
}

export function PantryClient({ pantry, allIngredients }: PantryClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [amount, setAmount] = useState('100')
  const [saving, setSaving] = useState(false)

  const pantryIngredientIds = new Set(pantry.map((p) => p.ingredient_id))
  const availableIngredients = allIngredients.filter((i) => !pantryIngredientIds.has(i.id))

  async function handleAdjust(item: PantryItemWithIngredient, delta: number) {
    const newAmount = Math.max(0, item.amount_g + delta)
    const result = await updatePantryAmount(item.id, newAmount)
    if (!result.success) toast.error(result.error ?? 'Ошибка')
  }

  async function handleRemove(id: string) {
    const result = await removePantryItem(id)
    if (!result.success) toast.error(result.error ?? 'Ошибка')
    else toast.success('Удалено')
  }

  async function handleAdd() {
    if (!selectedIngredientId) return
    setSaving(true)
    const result = await addPantryItem(selectedIngredientId, Number(amount) || 100)
    setSaving(false)
    if (!result.success) {
      toast.error(result.error ?? 'Ошибка')
    } else {
      toast.success('Добавлено')
      setSheetOpen(false)
      setSelectedIngredientId('')
      setAmount('100')
    }
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="flex flex-col flex-1">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl">Запасы</h1>
        </div>

        <Tabs defaultValue="pantry" className="flex flex-col flex-1">
          <TabsList className="mx-4 mb-4">
            <TabsTrigger value="pantry" className="flex-1 gap-1.5">
              <Refrigerator className="w-4 h-4" />
              Холодильник
            </TabsTrigger>
            <TabsTrigger value="shopping" className="flex-1 gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              Покупки
            </TabsTrigger>
          </TabsList>

          {/* Pantry tab */}
          <TabsContent value="pantry" className="flex-1 px-4 pb-6">
            <div className="flex justify-end mb-4">
              <Button size="sm" className="h-10 gap-1.5" onClick={() => setSheetOpen(true)}>
                <Plus className="w-4 h-4" />
                Добавить
              </Button>
            </div>

            {pantry.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Refrigerator className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Холодильник пуст</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pantry.map((item) => (
                  <PantryItemRow
                    key={item.id}
                    item={item}
                    onAdjust={handleAdjust}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shopping tab */}
          <TabsContent value="shopping" className="flex-1 px-4 pb-6">
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              <p className="font-medium text-sm">Список покупок</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Автоматическая генерация появится после добавления планировщика питания
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add pantry item sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-6">
            <SheetTitle>Добавить в холодильник</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Ингредиент</Label>
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Выберите ингредиент</option>
                {availableIngredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Количество (г)</Label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!selectedIngredientId || saving}
              className="h-12 mt-1"
            >
              Добавить
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function PantryItemRow({
  item,
  onAdjust,
  onRemove,
}: {
  item: PantryItemWithIngredient
  onAdjust: (item: PantryItemWithIngredient, delta: number) => void
  onRemove: (id: string) => void
}) {
  const low = item.amount_g < 100

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.ingredients.name}</p>
        <p className={`text-xs mt-0.5 ${low ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          {item.amount_g}г{low ? ' — заканчивается' : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onAdjust(item, -50)}
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onAdjust(item, 50)}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive ml-1"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
