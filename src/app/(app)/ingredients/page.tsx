import { createClient } from '@/lib/supabase/server'
import { IngredientsPageClient } from '@/components/ingredients/ingredients-page-client'
import type { Ingredient } from '@/types/database'

export default async function IngredientsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return <IngredientsPageClient ingredients={data as Ingredient[]} />
}
