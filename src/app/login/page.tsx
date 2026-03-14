import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginButton } from './login-button'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/planner')

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-1">
            <span className="text-3xl">🥗</span>
          </div>
          <h1 className="font-display text-3xl text-foreground">FoodApp</h1>
          <p className="text-sm text-muted-foreground">Персональный планировщик питания</p>
        </div>

        {/* Auth */}
        <div className="w-full flex flex-col gap-3">
          <LoginButton />
        </div>
      </div>
    </div>
  )
}
