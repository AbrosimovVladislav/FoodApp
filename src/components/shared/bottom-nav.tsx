'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, CalendarDays, UtensilsCrossed, Refrigerator, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/chat', label: 'Чат', icon: MessageCircle, also: [] },
  { href: '/planner', label: 'План', icon: CalendarDays, also: [] },
  { href: '/dishes', label: 'Блюда', icon: UtensilsCrossed, also: ['/ingredients'] },
  { href: '/pantry', label: 'Запасы', icon: Refrigerator, also: [] },
  { href: '/settings', label: 'Настройки', icon: Settings, also: [] },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border">
      <div className="mx-auto max-w-md flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon, also }) => {
          const active =
            pathname === href ||
            pathname.startsWith(href + '/') ||
            also.some((p) => pathname === p || pathname.startsWith(p + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 gap-0.5 min-h-[56px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
