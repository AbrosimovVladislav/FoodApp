import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'
import { Toaster } from 'sonner'
import type { Settings } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) throw new Error(error.message)

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex flex-col flex-1 px-4 pt-6 pb-6">
        <h1 className="text-2xl mb-6">Настройки</h1>
        <SettingsForm settings={settings as Settings} />
      </div>
    </>
  )
}
