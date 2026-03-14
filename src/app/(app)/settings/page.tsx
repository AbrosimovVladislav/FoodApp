import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'
import { Toaster } from 'sonner'
import type { Settings } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const [settingsResult, { data: { user } }] = await Promise.all([
    supabase.from('settings').select('*').maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (settingsResult.error) throw new Error(settingsResult.error.message)

  const settings = (settingsResult.data ?? { daily_calorie_limit: 2000, daily_protein_goal: 120 }) as Settings

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex flex-col flex-1 px-4 pt-6 pb-6">
        <h1 className="text-2xl mb-6">Настройки</h1>
        <SettingsForm settings={settings} userEmail={user?.email ?? null} />
      </div>
    </>
  )
}
