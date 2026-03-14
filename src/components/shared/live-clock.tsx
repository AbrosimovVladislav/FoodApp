'use client'

import { useEffect, useState } from 'react'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const date = now.toLocaleDateString('ru', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="text-right leading-none">
      <p className="text-base font-semibold tabular-nums text-foreground">{time}</p>
      <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{date}</p>
    </div>
  )
}
