import { createClient } from '@/lib/supabase/server'
import { ShoppingClient } from '@/components/shopping/shopping-client'
import type { Ingredient, ShoppingList } from '@/types/database'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const weekStart = params.week ? new Date(params.week + 'T00:00:00') : getMonday(new Date())
  const weekStartStr = toDateStr(weekStart)

  const supabase = await createClient()

  const [shoppingResult, ingredientsResult] = await Promise.all([
    supabase
      .from('shopping_list')
      .select('*')
      .eq('week_start_date', weekStartStr)
      .order('created_at', { ascending: true }),
    supabase.from('ingredients').select('*').order('name', { ascending: true }),
  ])

  if (shoppingResult.error) throw new Error(shoppingResult.error.message)
  if (ingredientsResult.error) throw new Error(ingredientsResult.error.message)

  return (
    <ShoppingClient
      items={shoppingResult.data as ShoppingList[]}
      ingredients={ingredientsResult.data as Ingredient[]}
      weekStartStr={weekStartStr}
    />
  )
}
