'use client'

import { cn } from '@/lib/utils'
import { LiveClock } from './live-clock'

interface PageHeaderProps {
  title: string
  right?: React.ReactNode
  className?: string
}

export function PageHeader({ title, right, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between px-4 pt-5 pb-3 shrink-0', className)}>
      <h1 className="text-2xl">{title}</h1>
      <div className="flex items-center gap-3 shrink-0">
        {right}
        <LiveClock />
      </div>
    </div>
  )
}
