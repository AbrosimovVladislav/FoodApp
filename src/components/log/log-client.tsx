'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCheck, Plus, Trash2, Loader2, X } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { calcEntryKBJU, roundKBJU, type KBJU } from '@/lib/calc-kbju'
import { closeDayLog, addExtraLog, removeExtraLog } from '@/app/(app)/log/actions'
import type { DishWithIngredients } from '@/components/dishes/dish-card'
import type { Ingredient, MealPlan, FoodLog, Settings } from '@/types/database'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
}

function sumKBJU(entries: KBJU[]): KBJU {
  return entries.reduce(
    (acc, k) => ({
      calories: acc.calories + k.calories,
      protein: acc.protein + k.protein,
      fat: acc.fat + k.fat,
      carbs: acc.carbs + k.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}

interface LogClientProps {
  date: string
  mealPlan: MealPlan[]
  foodLog: FoodLog[]
  dishes: DishWithIngredients[]
  ingredients: Ingredient[]
  settings: Settings
}

export function LogClient({ date, mealPlan, foodLog, dishes, ingredients, settings }: LogClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Extra food form state
  const [extraName, setExtraName] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookedUpKBJU, setLookedUpKBJU] = useState<KBJU | null>(null)
  const [lookedUpPer100, setLookedUpPer100] = useState<KBJU | null>(null)

  const todayStr = toDateStr(new Date())
  const isToday = date === todayStr

  // Compute КБЖУ for each meal plan entry
  const planEntries = mealPlan.map((entry) => {
    const kbju = roundKBJU(calcEntryKBJU(entry, dishes, ingredients))
    const label = entry.dish_id
      ? dishes.find((d) => d.id === entry.dish_id)?.name ?? '—'
      : ingredients.find((i) => i.id === entry.ingredient_id)?.name ?? '—'
    return { entry, kbju, label }
  })

  const planTotal = roundKBJU(sumKBJU(planEntries.map((e) => e.kbju)))
  const logTotal = roundKBJU(
    sumKBJU(
      foodLog.map((l) => ({
        calories: l.total_calories,
        protein: l.total_protein,
        fat: l.total_fat,
        carbs: l.total_carbs,
      }))
    )
  )

  const grandTotal = roundKBJU(sumKBJU([planTotal, logTotal]))
  const calorieLimit = settings.daily_calorie_limit
  const calorieProgress = Math.min(100, (grandTotal.calories / calorieLimit) * 100)
  const isOver = grandTotal.calories > calorieLimit

  const isDayClosed = foodLog.some((l) => l.dish_id !== null)

  function navigate(days: number) {
    router.push(`/log?date=${shiftDate(date, days)}`)
  }

  async function handleLookup() {
    if (!extraName.trim()) return
    // Check local ingredients first
    const found = ingredients.find(
      (i) => i.name.toLowerCase() === extraName.trim().toLowerCase()
    )
    if (found) {
      const per100: KBJU = {
        calories: found.calories_per_100g,
        protein: found.protein_per_100g,
        fat: found.fat_per_100g,
        carbs: found.carbs_per_100g,
      }
      setLookedUpPer100(per100)
      if (extraAmount) {
        const factor = parseFloat(extraAmount) / 100
        setLookedUpKBJU({
          calories: Math.round(per100.calories * factor),
          protein: Math.round(per100.protein * factor * 10) / 10,
          fat: Math.round(per100.fat * factor * 10) / 10,
          carbs: Math.round(per100.carbs * factor * 10) / 10,
        })
      }
      return
    }
    setLookupLoading(true)
    try {
      const res = await fetch('/api/ingredient-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: extraName.trim() }),
      })
      const json = await res.json()
      if (json.calories_per_100g !== undefined) {
        const per100: KBJU = {
          calories: json.calories_per_100g,
          protein: json.protein_per_100g,
          fat: json.fat_per_100g,
          carbs: json.carbs_per_100g,
        }
        setLookedUpPer100(per100)
        if (extraAmount) {
          const factor = parseFloat(extraAmount) / 100
          setLookedUpKBJU({
            calories: Math.round(per100.calories * factor),
            protein: Math.round(per100.protein * factor * 10) / 10,
            fat: Math.round(per100.fat * factor * 10) / 10,
            carbs: Math.round(per100.carbs * factor * 10) / 10,
          })
        }
      } else {
        toast.error('Не удалось найти КБЖУ')
      }
    } catch {
      toast.error('Ошибка запроса')
    } finally {
      setLookupLoading(false)
    }
  }

  function handleAmountChange(val: string) {
    setExtraAmount(val)
    if (lookedUpPer100 && val) {
      const factor = parseFloat(val) / 100
      if (!isNaN(factor) && factor > 0) {
        setLookedUpKBJU({
          calories: Math.round(lookedUpPer100.calories * factor),
          protein: Math.round(lookedUpPer100.protein * factor * 10) / 10,
          fat: Math.round(lookedUpPer100.fat * factor * 10) / 10,
          carbs: Math.round(lookedUpPer100.carbs * factor * 10) / 10,
        })
      }
    }
  }

  async function handleAddExtra() {
    if (!extraName.trim() || !lookedUpKBJU) {
      toast.error('Сначала найдите КБЖУ')
      return
    }
    startTransition(async () => {
      const res = await addExtraLog({
        date,
        note: `${extraName.trim()}${extraAmount ? ` ${extraAmount}г` : ''}`,
        calories: lookedUpKBJU.calories,
        protein: lookedUpKBJU.protein,
        fat: lookedUpKBJU.fat,
        carbs: lookedUpKBJU.carbs,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Ошибка')
      } else {
        toast.success('Добавлено')
        setSheetOpen(false)
        setExtraName('')
        setExtraAmount('')
        setLookedUpKBJU(null)
        setLookedUpPer100(null)
        router.refresh()
      }
    })
  }

  async function handleCloseDay() {
    startTransition(async () => {
      const res = await closeDayLog(date, mealPlan, dishes, ingredients)
      if (!res.success) {
        toast.error(res.error ?? 'Ошибка закрытия дня')
      } else {
        toast.success('День закрыт — КБЖУ зафиксированы')
        router.refresh()
      }
    })
  }

  async function handleRemoveExtra(id: string) {
    startTransition(async () => {
      const res = await removeExtraLog(id)
      if (!res.success) toast.error(res.error ?? 'Ошибка')
      else router.refresh()
    })
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold capitalize">{formatDate(date)}</p>
            {isToday && (
              <Badge variant="outline" className="text-[10px] border-primary text-primary mt-0.5">
                Сегодня
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* КБЖУ Summary */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Итого за день</span>
            <span className={cn('text-sm font-bold', isOver ? 'text-destructive' : 'text-primary')}>
              {grandTotal.calories} / {calorieLimit} ккал
            </span>
          </div>
          <Progress
            value={calorieProgress}
            className={cn('h-2', isOver && '[&>div]:bg-destructive')}
          />
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Белки</p>
              <p className="font-semibold">{grandTotal.protein}г</p>
            </div>
            <div>
              <p className="text-muted-foreground">Жиры</p>
              <p className="font-semibold">{grandTotal.fat}г</p>
            </div>
            <div>
              <p className="text-muted-foreground">Углеводы</p>
              <p className="font-semibold">{grandTotal.carbs}г</p>
            </div>
          </div>
        </div>

        {/* Planned meals */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            По плану ({planEntries.length})
          </p>
          {planEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Ничего не запланировано</p>
          ) : (
            planEntries.map(({ entry, kbju, label }) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  {entry.amount_g && (
                    <p className="text-xs text-muted-foreground">{entry.amount_g}г</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">{kbju.calories} ккал</p>
                  <p className="text-[10px] text-muted-foreground">
                    Б{kbju.protein} Ж{kbju.fat} У{kbju.carbs}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Extra log entries */}
        {foodLog.filter((l) => l.custom_note).length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Вне плана
            </p>
            {foodLog
              .filter((l) => l.custom_note)
              .map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <p className="text-sm font-medium">{log.custom_note}</p>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{log.total_calories} ккал</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => handleRemoveExtra(log.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-auto pt-2">
          <Button
            variant="outline"
            className="h-11 gap-2"
            onClick={() => setSheetOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Съел вне плана
          </Button>

          <Button
            className="h-11 gap-2"
            disabled={isPending || mealPlan.length === 0}
            onClick={handleCloseDay}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            {isDayClosed ? 'Перезакрыть день' : 'Закрыть день'}
          </Button>
          {isDayClosed && (
            <p className="text-xs text-center text-primary">День уже закрыт — данные зафиксированы</p>
          )}
        </div>
      </div>

      {/* Extra food sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-w-md mx-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle>Съел вне плана</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                placeholder="Название продукта или блюда"
                value={extraName}
                onChange={(e) => {
                  setExtraName(e.target.value)
                  setLookedUpKBJU(null)
                  setLookedUpPer100(null)
                }}
                className="h-11 flex-1"
              />
              <Button
                variant="outline"
                className="h-11 shrink-0"
                onClick={handleLookup}
                disabled={lookupLoading || !extraName.trim()}
              >
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Найти'}
              </Button>
            </div>

            {lookedUpPer100 && (
              <>
                <p className="text-xs text-muted-foreground">
                  На 100г: {lookedUpPer100.calories} ккал · Б{lookedUpPer100.protein} Ж{lookedUpPer100.fat} У{lookedUpPer100.carbs}
                </p>
                <Input
                  placeholder="Граммовка (г)"
                  type="number"
                  inputMode="decimal"
                  value={extraAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="h-11"
                />
              </>
            )}

            {lookedUpKBJU && (
              <div className="rounded-lg bg-accent/40 p-3 text-center">
                <p className="text-lg font-bold text-primary">{lookedUpKBJU.calories} ккал</p>
                <p className="text-xs text-muted-foreground">
                  Б{lookedUpKBJU.protein} Ж{lookedUpKBJU.fat} У{lookedUpKBJU.carbs}
                </p>
              </div>
            )}

            <Button
              className="h-12 mt-1"
              disabled={!lookedUpKBJU || isPending}
              onClick={handleAddExtra}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
