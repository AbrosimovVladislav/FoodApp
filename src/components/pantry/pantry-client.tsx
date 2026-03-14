'use client'

import { useState, useTransition, useRef } from 'react'
import {
  Plus, Trash2, ShoppingCart, Refrigerator,
  Mic, Square, Loader2, ChevronRight,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import {
  addPantryItem, updatePantryAmount, removePantryItem, bulkUpdatePantry, buyIngredient,
} from '@/app/(app)/pantry/actions'
import type { PantryItemWithIngredient } from '@/app/(app)/pantry/page'
import type { Ingredient } from '@/types/database'

function formatAmount(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.0', '')} кг`
  return `${Math.round(g)} г`
}

interface PantryClientProps {
  pantry: PantryItemWithIngredient[]
  allIngredients: Ingredient[]
  defaultTab: string
  plannedConsumption: Record<string, number>
  missingIngredients: { ingredient: Ingredient; neededG: number }[]
  shortageItems: { ingredient: Ingredient; inPantryG: number; needMoreG: number }[]
}

export function PantryClient({
  pantry,
  allIngredients,
  defaultTab,
  plannedConsumption,
  missingIngredients,
  shortageItems,
}: PantryClientProps) {
  const [, startTransition] = useTransition()

  // Pantry add sheet
  const [pantrySheetOpen, setPantrySheetOpen] = useState(false)
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [amount, setAmount] = useState('100')
  const [saving, setSaving] = useState(false)

  // Edit amount sheet
  const [editItem, setEditItem] = useState<PantryItemWithIngredient | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Voice state (pantry tab)
  type VoiceState = 'idle' | 'recording' | 'processing'
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Voice state (shopping tab)
  const [shopVoiceState, setShopVoiceState] = useState<VoiceState>('idle')
  const shopMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const shopChunksRef = useRef<Blob[]>([])

  // Buy sheet (shopping tab)
  type BuyItem = { ingredient: Ingredient; neededG: number; inPantryG?: number }
  const [buyItem, setBuyItem] = useState<BuyItem | null>(null)
  const [buyAmount, setBuyAmount] = useState('')
  const [buyingSaving, setBuyingSaving] = useState(false)

  const pantryIngredientIds = new Set(pantry.map((p) => p.ingredient_id))
  const availableIngredients = allIngredients.filter((i) => !pantryIngredientIds.has(i.id))

  // Combined deficit list for shopping tab
  const deficitItems: BuyItem[] = [
    ...missingIngredients.map((m) => ({ ingredient: m.ingredient, neededG: m.neededG })),
    ...shortageItems.map((s) => ({ ingredient: s.ingredient, neededG: s.needMoreG, inPantryG: s.inPantryG })),
  ].sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'ru'))

  const shortageCount = deficitItems.length

  // Pantry actions
  async function handleRemovePantry(id: string) {
    const result = await removePantryItem(id)
    if (!result.success) toast.error(result.error ?? 'Ошибка')
    else toast.success('Удалено')
  }

  async function handleAddPantry() {
    if (!selectedIngredientId) return
    setSaving(true)
    const result = await addPantryItem(selectedIngredientId, Number(amount) || 100)
    setSaving(false)
    if (!result.success) {
      toast.error(result.error ?? 'Ошибка')
    } else {
      toast.success('Добавлено')
      setPantrySheetOpen(false)
      setSelectedIngredientId('')
      setAmount('100')
    }
  }

  function openEdit(item: PantryItemWithIngredient) {
    setEditItem(item)
    setEditAmount(String(item.amount_g))
  }

  async function handleEditSave() {
    if (!editItem) return
    const newAmount = Number(editAmount)
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('Введите корректное количество')
      return
    }
    setEditSaving(true)
    const result = await updatePantryAmount(editItem.id, newAmount)
    setEditSaving(false)
    if (!result.success) {
      toast.error(result.error ?? 'Ошибка')
    } else {
      setEditItem(null)
    }
  }

  // Buy actions
  function openBuySheet(item: BuyItem) {
    setBuyItem(item)
    setBuyAmount(String(item.neededG))
  }

  async function handleBuy() {
    if (!buyItem) return
    const amount = Number(buyAmount)
    if (!amount || amount <= 0) return
    setBuyingSaving(true)
    const result = await buyIngredient(buyItem.ingredient.id, amount)
    setBuyingSaving(false)
    if (!result.success) {
      toast.error(result.error ?? 'Ошибка')
    } else {
      toast.success(`${buyItem.ingredient.name}: +${formatAmount(amount)} в холодильник`)
      setBuyItem(null)
    }
  }

  // Shopping voice handlers
  async function startShopVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      shopMediaRecorderRef.current = mediaRecorder
      shopChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) shopChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setShopVoiceState('processing')
        const blob = new Blob(shopChunksRef.current, { type: 'audio/webm' })
        await processShopVoiceAudio(blob)
      }

      mediaRecorder.start()
      setShopVoiceState('recording')
    } catch {
      toast.error('Нет доступа к микрофону')
    }
  }

  function stopShopVoiceRecording() {
    shopMediaRecorderRef.current?.stop()
  }

  async function processShopVoiceAudio(blob: Blob) {
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

      const results = await Promise.all(
        data.purchased.map((p) => buyIngredient(p.ingredient_id, p.amount_g))
      )
      const failed = results.filter((r) => !r.success)
      if (failed.length) {
        toast.error('Ошибка обновления')
      } else {
        const names = data.purchased.map((p) => p.ingredient_name).join(', ')
        toast.success(`В холодильник: ${names}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось распознать')
    } finally {
      setShopVoiceState('idle')
    }
  }

  // Pantry voice handlers
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
      const res = await fetch('/api/voice-pantry', { method: 'POST', body: fd })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error ?? 'Ошибка сервера')
      }
      const data = await res.json() as {
        transcript: string
        updates: { ingredient_id: string; ingredient_name: string; action: 'set' | 'add'; amount_g: number }[]
      }

      if (!data.updates.length) {
        toast.info(`Распознано: «${data.transcript}»\nПродукты не найдены`)
        return
      }

      startTransition(async () => {
        const result = await bulkUpdatePantry(data.updates)
        if (!result.success) {
          toast.error('Ошибка обновления')
        } else {
          const summary = data.updates
            .map((u) => `${u.ingredient_name}: ${u.action === 'set' ? '' : '+'}${u.amount_g}г`)
            .join(', ')
          toast.success(`Обновлено: ${summary}`)
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось распознать')
    } finally {
      setVoiceState('idle')
    }
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="flex flex-col flex-1">
        <PageHeader title="Запасы" />

        <Tabs defaultValue={defaultTab} className="flex flex-col flex-1">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="pantry" className="flex-1 gap-1.5">
              <Refrigerator className="w-4 h-4" />
              Холодильник
            </TabsTrigger>
            <TabsTrigger value="shopping" className="flex-1 gap-1.5 relative">
              <ShoppingCart className="w-4 h-4" />
              Покупки
              {shortageCount > 0 && (
                <span className="absolute -top-0.5 right-2 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {shortageCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Pantry tab */}
          <TabsContent value="pantry" className="flex-1 px-4 pb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={voiceState === 'recording' ? stopVoiceRecording : startVoiceRecording}
                disabled={voiceState === 'processing'}
                className={cn(
                  'flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-colors',
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
                {voiceState === 'processing' ? 'Распознаю...' : voiceState === 'recording' ? 'Стоп' : 'Голос'}
              </button>

              <Button size="sm" className="h-10 gap-1.5" onClick={() => setPantrySheetOpen(true)}>
                <Plus className="w-4 h-4" />
                Добавить
              </Button>
            </div>

            {voiceState === 'recording' && (
              <p className="text-xs text-destructive text-center mb-3 animate-pulse">
                Говорите... Например: «Осталось 300г гречки, молоко кончилось»
              </p>
            )}

            {pantry.length === 0 && missingIngredients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Refrigerator className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Холодильник пуст</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pantry.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {pantry.map((item) => (
                      <PantryItemRow
                        key={item.id}
                        item={item}
                        consumption={plannedConsumption[item.ingredient_id]}
                        onTap={openEdit}
                      />
                    ))}
                  </div>
                )}

                {missingIngredients.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-semibold text-destructive uppercase tracking-widest px-1">
                      Нет в холодильнике
                    </p>
                    {missingIngredients.map(({ ingredient, neededG }) => (
                      <div
                        key={ingredient.id}
                        className="relative flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-xl px-3.5 py-3 overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-destructive rounded-l-xl" />
                        <p className="font-medium text-sm pl-1">{ingredient.name}</p>
                        <span className="text-xs font-semibold text-destructive tabular-nums">
                          нужно {formatAmount(neededG)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Shopping tab — live deficit list */}
          <TabsContent value="shopping" className="flex-1 flex flex-col px-4 pb-6">
            {/* Voice button */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={shopVoiceState === 'recording' ? stopShopVoiceRecording : startShopVoiceRecording}
                disabled={shopVoiceState === 'processing'}
                className={cn(
                  'flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-colors',
                  shopVoiceState === 'recording'
                    ? 'border-destructive text-destructive bg-destructive/5'
                    : shopVoiceState === 'processing'
                    ? 'border-border text-muted-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                )}
              >
                {shopVoiceState === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : shopVoiceState === 'recording' ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {shopVoiceState === 'processing'
                  ? 'Распознаю...'
                  : shopVoiceState === 'recording'
                  ? 'Стоп'
                  : 'Голос — что купил'}
              </button>
            </div>
            {shopVoiceState === 'recording' && (
              <p className="text-xs text-destructive text-center mb-3 animate-pulse">
                Говорите... Например: «Купил молоко 1 кг и яйца»
              </p>
            )}

            {deficitItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Всё есть — холодильник закрывает план питания
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {deficitItems.map((item) => (
                  <button
                    key={item.ingredient.id}
                    onClick={() => openBuySheet(item)}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3 w-full text-left transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.ingredient.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.inPantryG !== undefined
                          ? `есть ${item.inPantryG}г, нужно ещё ${item.neededG}г`
                          : `нужно ${item.neededG}г`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Pantry add sheet */}
      <Sheet open={pantrySheetOpen} onOpenChange={setPantrySheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-6">
            <SheetTitle>Добавить в холодильник</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Ингредиент</Label>
              <select value={selectedIngredientId} onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Выберите ингредиент</option>
                {availableIngredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Количество (г)</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button onClick={handleAddPantry} disabled={!selectedIngredientId || saving} className="h-12 mt-1">
              Добавить
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit amount sheet */}
      <Sheet open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-5">
            <SheetTitle>{editItem?.ingredients.name}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Количество (г)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave() }}
                className="h-14 text-xl text-center"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setEditAmount(String(v))}
                  className="h-10 rounded-lg border border-border text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                >
                  {v}г
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-muted-foreground hover:text-destructive shrink-0"
                onClick={async () => {
                  if (!editItem) return
                  setEditItem(null)
                  await handleRemovePantry(editItem.id)
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="flex-1 h-12" onClick={() => setEditItem(null)}>
                Отмена
              </Button>
              <Button className="flex-1 h-12" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Buy sheet */}
      <Sheet open={!!buyItem} onOpenChange={(open) => { if (!open) setBuyItem(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-5">
            <SheetTitle>{buyItem?.ingredient.name}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              По плану нужно:{' '}
              <span className="text-foreground font-medium">
                {buyItem ? formatAmount(buyItem.neededG) : ''}
              </span>
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>Сколько купили (г)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBuy() }}
                className="h-14 text-xl text-center"
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-1">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setBuyItem(null)}>
                Отмена
              </Button>
              <Button
                className="flex-1 h-12"
                onClick={handleBuy}
                disabled={buyingSaving || !buyAmount || Number(buyAmount) <= 0}
              >
                {buyingSaving ? 'Сохранение...' : 'В холодильник'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function PantryItemRow({
  item,
  consumption,
  onTap,
}: {
  item: PantryItemWithIngredient
  consumption: number | undefined
  onTap: (item: PantryItemWithIngredient) => void
}) {
  const low = item.amount_g < 100
  const planned = consumption && consumption > 0 ? Math.round(consumption) : null
  const remaining = planned !== null ? Math.round(item.amount_g - planned) : null
  const shortage = remaining !== null && remaining < 0

  return (
    <button
      onClick={() => onTap(item)}
      className={cn(
        'flex items-center gap-3 bg-card border rounded-xl px-3.5 py-3 w-full text-left transition-colors hover:bg-secondary/30 overflow-hidden relative',
        shortage
          ? 'border-destructive/30'
          : low
          ? 'border-orange-300/60'
          : 'border-border'
      )}
    >
      {/* Left accent bar */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl',
        shortage ? 'bg-destructive' : low ? 'bg-orange-400' : 'bg-transparent'
      )} />

      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-medium text-sm truncate">{item.ingredients.name}</p>
          <span className={cn(
            'text-sm font-semibold tabular-nums shrink-0',
            shortage ? 'text-destructive' : low ? 'text-orange-500' : 'text-foreground'
          )}>
            {formatAmount(item.amount_g)}
          </span>
        </div>
        {(planned !== null && remaining !== null) ? (
          <p className={cn('text-[11px] mt-0.5 leading-tight', shortage ? 'text-destructive' : 'text-muted-foreground')}>
            {shortage
              ? `⚠ не хватает ${formatAmount(Math.abs(remaining))} по плану`
              : `по плану −${formatAmount(planned)} → останется ${formatAmount(remaining)}`}
          </p>
        ) : low ? (
          <p className="text-[11px] text-orange-500 mt-0.5">заканчивается</p>
        ) : null}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
    </button>
  )
}
