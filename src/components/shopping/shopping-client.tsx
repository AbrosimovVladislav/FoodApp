'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Trash2, RefreshCw, ChevronLeft, ChevronRight, Search, Mic, Square, Loader2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  generateShoppingList,
  markPurchased,
  unmarkPurchased,
  addManualShoppingItem,
  removeShoppingItem,
  markPurchasedByIngredientIds,
} from '@/app/(app)/shopping/actions'
import type { Ingredient, ShoppingList } from '@/types/database'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatWeek(weekStartStr: string): string {
  const start = new Date(weekStartStr + 'T00:00:00')
  const end = new Date(weekStartStr + 'T00:00:00')
  end.setDate(end.getDate() + 5)
  const startFmt = start.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
  const endFmt = end.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startFmt} — ${endFmt}`
}

function formatAmount(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.0', '')} кг`
  return `${Math.round(g)} г`
}

function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const CATEGORY_LABELS: Record<string, string> = {
  meat: 'Мясо и птица',
  fish: 'Рыба и морепродукты',
  dairy: 'Молочное',
  eggs: 'Яйца',
  vegetables: 'Овощи',
  fruits: 'Фрукты',
  grains: 'Крупы и злаки',
  legumes: 'Бобовые',
  nuts: 'Орехи и семена',
  oils: 'Масла',
  sauces: 'Соусы и специи',
  bakery: 'Выпечка',
  frozen: 'Замороженное',
  drinks: 'Напитки',
  other: 'Прочее',
}

interface ShoppingClientProps {
  items: ShoppingList[]
  ingredients: Ingredient[]
  weekStartStr: string
}

export function ShoppingClient({ items, ingredients, weekStartStr }: ShoppingClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [addOpen, setAddOpen] = useState(false)
  const [manualSearch, setManualSearch] = useState('')
  const [manualAmount, setManualAmount] = useState(100)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)

  // Voice
  type VoiceState = 'idle' | 'recording' | 'processing'
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const isCurrentWeek = weekStartStr === getCurrentWeekStart()

  const activeItems = items.filter((i) => !i.purchased)
  const purchasedItems = items.filter((i) => i.purchased)

  // Group active items by category
  const grouped = new Map<string, (ShoppingList & { ingredient: Ingredient | undefined })[]>()
  for (const item of activeItems) {
    const ing = ingredients.find((i) => i.id === item.ingredient_id)
    const cat = ing?.category ?? 'other'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push({ ...item, ingredient: ing })
  }
  const sortedCategories = [...grouped.keys()].sort()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateShoppingList(weekStartStr)
      if (!result.success) {
        toast.error(result.error ?? 'Ошибка генерации')
      } else {
        toast.success(
          result.count === 0
            ? 'Всё есть в холодильнике!'
            : `Список обновлён: ${result.count} позиций`
        )
      }
    })
  }

  function handleCheck(item: ShoppingList) {
    startTransition(async () => {
      const result = item.purchased
        ? await unmarkPurchased(item.id)
        : await markPurchased(item.id)
      if (!result.success) toast.error(result.error ?? 'Ошибка')
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeShoppingItem(id)
      if (!result.success) toast.error(result.error ?? 'Ошибка')
    })
  }

  function handleAddManual() {
    if (!selectedIngredient || manualAmount <= 0) return
    setAddOpen(false)
    startTransition(async () => {
      const result = await addManualShoppingItem(
        selectedIngredient.id,
        manualAmount,
        weekStartStr
      )
      if (!result.success) toast.error(result.error ?? 'Ошибка')
      else toast.success(`${selectedIngredient.name} добавлен`)
    })
    setSelectedIngredient(null)
    setManualAmount(100)
    setManualSearch('')
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setVoiceState('processing')
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processVoiceAudio(blob)
      }

      mediaRecorder.start()
      setVoiceState('recording')
    } catch {
      toast.error('Нет доступа к микрофону')
    }
  }

  function stopVoiceRecording() {
    mediaRecorderRef.current?.stop()
  }

  async function processVoiceAudio(blob: Blob) {
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/voice-shopping', { method: 'POST', body: fd })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error ?? 'Ошибка сервера')
      }
      const data = await res.json() as {
        transcript: string
        purchased: { ingredient_id: string; ingredient_name: string; amount_g: number }[]
      }

      if (!data.purchased.length) {
        toast.info(`«${data.transcript}» — продукты не распознаны`)
        return
      }

      startTransition(async () => {
        const result = await markPurchasedByIngredientIds(
          data.purchased.map((p) => ({ ingredient_id: p.ingredient_id, amount_g: p.amount_g })),
          weekStartStr
        )
        if (!result.success) {
          toast.error('Ошибка обновления')
        } else {
          const names = data.purchased.map((p) => p.ingredient_name).join(', ')
          toast.success(`Куплено: ${names}`)
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось распознать')
    } finally {
      setVoiceState('idle')
    }
  }

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(manualSearch.toLowerCase())
  )

  return (
    <>
      <Toaster position="top-center" />

      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl">Покупки</h1>
            {!isCurrentWeek && (
              <button
                onClick={() => router.push('/shopping')}
                className="text-xs text-primary font-medium"
              >
                Эта неделя
              </button>
            )}
          </div>

          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => router.push(`/shopping?week=${addDays(weekStartStr, -7)}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              {formatWeek(weekStartStr)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => router.push(`/shopping?week=${addDays(weekStartStr, 7)}`)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11 gap-2"
              onClick={handleGenerate}
              disabled={isPending}
            >
              <RefreshCw className={cn('w-4 h-4', isPending && 'animate-spin')} />
              {items.length === 0 ? 'Сгенерировать' : 'Пересчитать'}
            </Button>
            <button
              onClick={voiceState === 'recording' ? stopVoiceRecording : startVoiceRecording}
              disabled={voiceState === 'processing'}
              className={cn(
                'flex items-center gap-1.5 h-11 px-3 rounded-lg border text-sm font-medium transition-colors shrink-0',
                voiceState === 'recording'
                  ? 'border-destructive text-destructive bg-destructive/5'
                  : voiceState === 'processing'
                  ? 'border-border text-muted-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              )}
            >
              {voiceState === 'processing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : voiceState === 'recording' ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            <Button
              className="h-11 gap-2 shrink-0"
              onClick={() => {
                setManualSearch('')
                setSelectedIngredient(null)
                setManualAmount(100)
                setAddOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {voiceState === 'recording' && (
            <p className="text-xs text-destructive text-center mt-2 animate-pulse">
              Говорите... Например: «Купил молоко 1 кг и яйца»
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 px-4 pb-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                Список пуст.{'\n'}Нажмите «Сгенерировать» — список автоматически составится по плану питания.
              </p>
            </div>
          ) : (
            <>
              {/* Active items grouped by category */}
              {activeItems.length > 0 && (
                <div className="flex flex-col gap-3">
                  {sortedCategories.map((cat) => {
                    const catItems = grouped.get(cat)!
                    return (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {catItems.map((item) => (
                            <ShoppingRow
                              key={item.id}
                              item={item}
                              name={item.ingredient?.name ?? '—'}
                              isPending={isPending}
                              onCheck={() => handleCheck(item)}
                              onRemove={() => handleRemove(item.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Divider if both active and purchased */}
              {activeItems.length > 0 && purchasedItems.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    Куплено {purchasedItems.length}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Purchased items */}
              {purchasedItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {purchasedItems.map((item) => {
                    const ing = ingredients.find((i) => i.id === item.ingredient_id)
                    return (
                      <ShoppingRow
                        key={item.id}
                        item={item}
                        name={ing?.name ?? '—'}
                        isPending={isPending}
                        onCheck={() => handleCheck(item)}
                        onRemove={() => handleRemove(item.id)}
                        purchased
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual add sheet */}
      <Sheet
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setSelectedIngredient(null)
            setManualSearch('')
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle>Добавить в список</SheetTitle>
          </SheetHeader>

          {!selectedIngredient ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск ингредиента..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-col gap-2">
                {filteredIngredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>
                ) : (
                  filteredIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      className="flex items-center justify-between bg-secondary hover:bg-secondary/70 rounded-xl px-4 py-3 text-left transition-colors"
                      onClick={() => setSelectedIngredient(ing)}
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">{ing.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {CATEGORY_LABELS[ing.category] ?? ing.category}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIngredient(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Назад
                </button>
                <span className="text-sm font-medium text-foreground">{selectedIngredient.name}</span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Количество (г)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={manualAmount || ''}
                  onChange={(e) => setManualAmount(Number(e.target.value))}
                  className="h-12 text-base"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => {
                    setAddOpen(false)
                    setSelectedIngredient(null)
                  }}
                >
                  Отмена
                </Button>
                <Button
                  className="flex-1 h-12"
                  onClick={handleAddManual}
                  disabled={manualAmount <= 0}
                >
                  Добавить
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

interface ShoppingRowProps {
  item: ShoppingList
  name: string
  isPending: boolean
  onCheck: () => void
  onRemove: () => void
  purchased?: boolean
}

function ShoppingRow({ item, name, isPending, onCheck, onRemove, purchased }: ShoppingRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 transition-opacity',
        purchased && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onCheck}
        disabled={isPending}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          purchased
            ? 'border-primary bg-primary'
            : 'border-border hover:border-primary/60'
        )}
      >
        {purchased && (
          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Name + amount */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-foreground', purchased && 'line-through')}>
          {name}
        </p>
        <p className="text-xs text-muted-foreground">{formatAmount(item.amount_g)}</p>
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        disabled={isPending}
        className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
