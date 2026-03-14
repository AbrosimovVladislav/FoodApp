'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center gap-4">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-foreground">Что-то пошло не так</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button onClick={reset} variant="outline" className="h-11 mt-2">
        Попробовать снова
      </Button>
    </div>
  )
}
