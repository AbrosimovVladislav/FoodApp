'use client'

import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { updateSettings } from '@/app/(app)/settings/actions'
import { createClient } from '@/lib/supabase/client'
import type { Settings } from '@/types/database'

const schema = z.object({
  daily_calorie_limit: z.number().int().min(500).max(10000),
  daily_protein_goal: z.number().int().min(10).max(500),
})

type FormValues = z.infer<typeof schema>

export function SettingsForm({ settings, userEmail }: { settings: Settings; userEmail: string | null }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      daily_calorie_limit: settings.daily_calorie_limit,
      daily_protein_goal: settings.daily_protein_goal,
    },
  })

  async function onSubmit(data: FormValues) {
    const result = await updateSettings(data)
    if (!result.success) {
      toast.error(result.error ?? 'Ошибка сохранения')
    } else {
      toast.success('Настройки сохранены')
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="daily_calorie_limit">Дневной лимит ккал</Label>
        <Input
          id="daily_calorie_limit"
          type="number"
          inputMode="numeric"
          {...register('daily_calorie_limit', { valueAsNumber: true })}
          className="h-12 text-base"
        />
        {errors.daily_calorie_limit && (
          <p className="text-xs text-destructive">{errors.daily_calorie_limit.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Если сумма ккал за день превышает лимит — появится предупреждение
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="daily_protein_goal">Целевой белок (г)</Label>
        <Input
          id="daily_protein_goal"
          type="number"
          inputMode="numeric"
          {...register('daily_protein_goal', { valueAsNumber: true })}
          className="h-12 text-base"
        />
        {errors.daily_protein_goal && (
          <p className="text-xs text-destructive">{errors.daily_protein_goal.message}</p>
        )}
      </div>

      <Button type="submit" className="h-12" disabled={isSubmitting}>
        {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
      </Button>

      <Separator className="my-2" />

      {/* Account section */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Аккаунт</p>
        {userEmail && (
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-12 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="w-4 h-4" />
          {signingOut ? 'Выходим...' : 'Выйти'}
        </Button>
      </div>
    </form>
  )
}
