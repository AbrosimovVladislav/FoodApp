'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, UtensilsCrossed, Refrigerator, Carrot, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/chat', label: 'Чат', icon: MessageCircle },
  { href: '/dishes', label: 'Блюда', icon: UtensilsCrossed },
  { href: '/ingredients', label: 'Ингредиенты', icon: Carrot },
  { href: '/pantry', label: 'Запасы', icon: Refrigerator },
  { href: '/analytics', label: 'Аналитика', icon: BarChart2 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border">
      <div className="mx-auto max-w-md flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
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
