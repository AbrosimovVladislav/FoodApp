'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronLeft, ChevronRight, X, Search, ChevronRight as ArrowRight } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { calcDishKBJU, roundKBJU, type KBJU } from '@/lib/calc-kbju'
import { addMealPlanEntry, removeMealPlanEntry } from '@/app/(app)/planner/actions'
import type { DishWithIngredients } from '@/components/dishes/dish-card'
import type { Ingredient, MealPlan, Settings } from '@/types/database'

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

type PickerMode =
  | { step: 'list' }
  | { step: 'amount'; kind: 'dish'; dish: DishWithIngredients; amount: number }
  | { step: 'amount'; kind: 'ingredient'; ingredient: Ingredient; amount: number }

function getWeekDates(weekStartStr: string): Date[] {
  const start = new Date(weekStartStr + 'T00:00:00')
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

function calcEntryKBJU(
  entry: MealPlan,
  dishes: DishWithIngredients[],
  ingredients: Ingredient[]
): KBJU {
  if (entry.dish_id) {
    const dish = dishes.find((d) => d.id === entry.dish_id)
    if (!dish) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    const full = calcDishKBJU(dish.dish_ingredients)
    if (entry.amount_g && entry.amount_g > 0) {
      const totalWeight = dish.dish_ingredients.reduce((s, di) => s + di.amount_g, 0)
      if (totalWeight > 0) {
        const ratio = entry.amount_g / totalWeight
        return {
          calories: full.calories * ratio,
          protein: full.protein * ratio,
          fat: full.fat * ratio,
          carbs: full.carbs * ratio,
        }
      }
    }
    return full
  }
  if (entry.ingredient_id && entry.amount_g) {
    const ing = ingredients.find((i) => i.id === entry.ingredient_id)
    if (!ing) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    const factor = entry.amount_g / 100
    return {
      calories: ing.calories_per_100g * factor,
      protein: ing.protein_per_100g * factor,
      fat: ing.fat_per_100g * factor,
      carbs: ing.carbs_per_100g * factor,
    }
  }
  return { calories: 0, protein: 0, fat: 0, carbs: 0 }
}

function getEntryLabel(
  entry: MealPlan,
  dishes: DishWithIngredients[],
  ingredients: Ingredient[]
): string {
  if (entry.dish_id) return dishes.find((d) => d.id === entry.dish_id)?.name ?? '—'
  return ingredients.find((i) => i.id === entry.ingredient_id)?.name ?? '—'
}

interface PlannerPageClientProps {
  mealPlan: MealPlan[]
  dishes: DishWithIngredients[]
  ingredients: Ingredient[]
  settings: Settings
  weekStartStr: string
}

export function PlannerPageClient({
  mealPlan,
  dishes,
  ingredients,
  settings,
  weekStartStr,
}: PlannerPageClientProps) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [pickerMode, setPickerMode] = useState<PickerMode>({ step: 'list' })
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const weekDates = getWeekDates(weekStartStr)
  const today = toDateStr(new Date())
  const isCurrentWeek = weekDates.some((d) => toDateStr(d) === today)

  function openPicker(date: string) {
    setPickerDate(date)
    setSearch('')
    setPickerMode({ step: 'list' })
    setPickerOpen(true)
  }

  function selectDish(dish: DishWithIngredients) {
    const totalWeight = dish.dish_ingredients.reduce((s, di) => s + di.amount_g, 0)
    setPickerMode({ step: 'amount', kind: 'dish', dish, amount: totalWeight || 100 })
  }

  function selectIngredient(ingredient: Ingredient) {
    setPickerMode({ step: 'amount', kind: 'ingredient', ingredient, amount: 100 })
  }

  function handleConfirmAmount() {
    if (!pickerDate || pickerMode.step !== 'amount') return
    setPickerOpen(false)
    const params =
      pickerMode.kind === 'dish'
        ? { date: pickerDate, dishId: pickerMode.dish.id, amount_g: pickerMode.amount }
        : { date: pickerDate, ingredientId: pickerMode.ingredient.id, amount_g: pickerMode.amount }
    startTransition(async () => {
      const result = await addMealPlanEntry(params)
      if (!result.success) toast.error(result.error ?? 'Ошибка')
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeMealPlanEntry(id)
      if (!result.success) toast.error(result.error ?? 'Ошибка')
    })
  }

  const filteredDishes = dishes.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Toaster position="top-center" />

      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl">Планировщик</h1>
            {!isCurrentWeek && (
              <button
                onClick={() => router.push('/planner')}
                className="text-xs text-primary font-medium"
              >
                Эта неделя
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => router.push(`/planner?week=${addDays(weekStartStr, -7)}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              {weekDates[0].toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
              {' — '}
              {weekDates[5].toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => router.push(`/planner?week=${addDays(weekStartStr, 7)}`)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Day cards */}
        <div className="flex flex-col gap-3 px-4 pb-6">
          {weekDates.map((date, dayIndex) => {
            const dateStr = toDateStr(date)
            const isToday = dateStr === today
            const dayEntries = mealPlan.filter((e) => e.date === dateStr)

            let totCal = 0, totProt = 0, totFat = 0, totCarbs = 0
            dayEntries.forEach((entry) => {
              const k = calcEntryKBJU(entry, dishes, ingredients)
              totCal += k.calories
              totProt += k.protein
              totFat += k.fat
              totCarbs += k.carbs
            })
            const rounded = roundKBJU({ calories: totCal, protein: totProt, fat: totFat, carbs: totCarbs })
            const caloriePercent = Math.min(100, (rounded.calories / settings.daily_calorie_limit) * 100)
            const isOverLimit = rounded.calories > settings.daily_calorie_limit

            return (
              <div
                key={dateStr}
                className={cn('bg-card border border-border rounded-xl p-4', isToday && 'border-primary/40')}
              >
                {/* Day header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('font-semibold text-sm', isToday ? 'text-primary' : 'text-foreground')}>
                    {DAY_LABELS[dayIndex]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {date.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                  </span>
                  {isToday && (
                    <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      Сегодня
                    </span>
                  )}
                </div>

                {/* Entries */}
                {dayEntries.length > 0 && (
                  <div className="flex flex-col gap-2 mb-2">
                    {dayEntries.map((entry, idx) => {
                      const kbju = roundKBJU(calcEntryKBJU(entry, dishes, ingredients))
                      const name = getEntryLabel(entry, dishes, ingredients)
                      const isIngredient = !!entry.ingredient_id
                      return (
                        <div key={entry.id} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {idx + 1}
                              </span>
                              {isIngredient && (
                                <span className="text-[10px] text-muted-foreground bg-border px-1.5 py-0.5 rounded">
                                  продукт
                                </span>
                              )}
                              {entry.amount_g && (
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {entry.amount_g} г
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate text-foreground leading-tight">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {kbju.calories} ккал · Б{kbju.protein} Ж{kbju.fat} У{kbju.carbs}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(entry.id)}
                            disabled={isPending}
                            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add button */}
                <button
                  className="w-full flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2.5 hover:border-primary/40 hover:bg-secondary/40 transition-colors"
                  onClick={() => openPicker(dateStr)}
                >
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Добавить</span>
                </button>

                {/* КБЖУ */}
                {rounded.calories > 0 && (
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs font-medium', isOverLimit ? 'text-destructive' : 'text-muted-foreground')}>
                        {rounded.calories} / {settings.daily_calorie_limit} ккал{isOverLimit && ' ⚠'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Б{rounded.protein} Ж{rounded.fat} У{rounded.carbs}
                      </span>
                    </div>
                    <Progress
                      value={caloriePercent}
                      className={cn('h-1.5', isOverLimit && '[&>div]:bg-destructive')}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Picker Sheet */}
      <Sheet
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open)
          if (!open) setPickerMode({ step: 'list' })
        }}
      >
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          {pickerMode.step === 'list' ? (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>Добавить в план</SheetTitle>
              </SheetHeader>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs defaultValue="dishes">
                <TabsList className="w-full mb-3">
                  <TabsTrigger value="dishes" className="flex-1">Блюда</TabsTrigger>
                  <TabsTrigger value="ingredients" className="flex-1">Продукты</TabsTrigger>
                </TabsList>

                <TabsContent value="dishes">
                  <div className="flex flex-col gap-2">
                    {filteredDishes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>
                    ) : (
                      filteredDishes.map((dish) => {
                        const kbju = roundKBJU(calcDishKBJU(dish.dish_ingredients))
                        const totalWeight = dish.dish_ingredients.reduce((s, di) => s + di.amount_g, 0)
                        return (
                          <button
                            key={dish.id}
                            className="flex items-center justify-between bg-secondary hover:bg-secondary/70 rounded-xl px-4 py-3 text-left transition-colors"
                            onClick={() => selectDish(dish)}
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{dish.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {kbju.calories} ккал · {totalWeight > 0 ? `${totalWeight} г` : 'без веса'}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                          </button>
                        )
                      })
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="ingredients">
                  <div className="flex flex-col gap-2">
                    {filteredIngredients.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>
                    ) : (
                      filteredIngredients.map((ing) => (
                        <button
                          key={ing.id}
                          className="flex items-center justify-between bg-secondary hover:bg-secondary/70 rounded-xl px-4 py-3 text-left transition-colors"
                          onClick={() => selectIngredient(ing)}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{ing.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ing.calories_per_100g} ккал / 100 г
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                        </button>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>
                  {pickerMode.kind === 'dish' ? pickerMode.dish.name : pickerMode.ingredient.name}
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Граммовка</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={pickerMode.amount || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (pickerMode.kind === 'dish') {
                        setPickerMode({ step: 'amount', kind: 'dish', dish: pickerMode.dish, amount: val })
                      } else {
                        setPickerMode({ step: 'amount', kind: 'ingredient', ingredient: pickerMode.ingredient, amount: val })
                      }
                    }}
                    className="h-12 text-base"
                  />
                  {pickerMode.kind === 'dish' && (
                    <p className="text-xs text-muted-foreground">
                      Полное блюдо: {pickerMode.dish.dish_ingredients.reduce((s, di) => s + di.amount_g, 0)} г
                    </p>
                  )}
                </div>

                {/* КБЖУ preview */}
                {pickerMode.amount > 0 && (() => {
                  let preview: ReturnType<typeof roundKBJU>
                  if (pickerMode.kind === 'dish') {
                    const full = calcDishKBJU(pickerMode.dish.dish_ingredients)
                    const totalWeight = pickerMode.dish.dish_ingredients.reduce((s, di) => s + di.amount_g, 0)
                    const ratio = totalWeight > 0 ? pickerMode.amount / totalWeight : 1
                    preview = roundKBJU({
                      calories: full.calories * ratio,
                      protein: full.protein * ratio,
                      fat: full.fat * ratio,
                      carbs: full.carbs * ratio,
                    })
                  } else {
                    const ing = pickerMode.ingredient
                    const factor = pickerMode.amount / 100
                    preview = roundKBJU({
                      calories: ing.calories_per_100g * factor,
                      protein: ing.protein_per_100g * factor,
                      fat: ing.fat_per_100g * factor,
                      carbs: ing.carbs_per_100g * factor,
                    })
                  }
                  return (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'ккал', value: preview.calories, accent: true },
                        { label: 'белки', value: preview.protein, accent: false },
                        { label: 'жиры', value: preview.fat, accent: false },
                        { label: 'углеводы', value: preview.carbs, accent: false },
                      ].map(({ label, value, accent }) => (
                        <div key={label} className="flex flex-col items-center bg-secondary rounded-lg py-2 px-1">
                          <span className={cn('text-sm font-semibold', accent ? 'text-primary' : 'text-foreground')}>
                            {value}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setPickerMode({ step: 'list' })}
                  >
                    Назад
                  </Button>
                  <Button
                    className="flex-1 h-12"
                    onClick={handleConfirmAmount}
                    disabled={pickerMode.amount <= 0}
                  >
                    Добавить
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
