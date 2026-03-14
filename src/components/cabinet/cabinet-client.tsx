'use client'

import Link from 'next/link'
import { CalendarDays, TrendingUp, Award } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SettingsForm } from '@/components/settings/settings-form'
import { cn } from '@/lib/utils'
import { LiveClock } from '@/components/shared/live-clock'
import type { Settings } from '@/types/database'
import type { DayStats, TopDish } from '@/app/(app)/cabinet/page'

interface CabinetClientProps {
  settings: Settings
  last14: DayStats[]
  weeklyAvg: { calories: number; protein: number; fat: number; carbs: number } | null
  topDishes: TopDish[]
  calorieLimit: number
  userName: string | null
  userEmail: string | null
  userAvatarUrl: string | null
}

function BarChart({ days, limit }: { days: DayStats[]; limit: number }) {
  const maxCal = Math.max(...days.map((d) => d.calories), limit, 1)

  const dayLabels = days.map((d) => {
    const date = new Date(d.date + 'T00:00:00')
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' }).replace('.', '/')
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1 h-28">
        {days.map((day, i) => {
          const height = day.calories > 0 ? Math.max(4, (day.calories / maxCal) * 100) : 2
          const isOver = day.calories > limit
          const isToday = i === days.length - 1
          return (
            <div key={day.date} className="flex flex-col items-center flex-1 gap-0.5 h-full justify-end">
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all',
                  day.calories === 0 && 'bg-border',
                  day.calories > 0 && !isOver && 'bg-primary/70',
                  isOver && 'bg-destructive/70',
                  isToday && day.calories > 0 && !isOver && 'bg-primary',
                  isToday && isOver && 'bg-destructive'
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1">
        {days.map((day, i) => {
          const isToday = i === days.length - 1
          return (
            <div key={day.date} className="flex-1 text-center">
              <span
                className={cn(
                  'text-[8px] text-muted-foreground',
                  isToday && 'text-primary font-bold'
                )}
              >
                {dayLabels[i]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function CabinetClient({
  settings,
  last14,
  weeklyAvg,
  topDishes,
  calorieLimit,
  userName,
  userEmail,
  userAvatarUrl,
}: CabinetClientProps) {
  const todayStats = last14[last14.length - 1]

  return (
    <div className="flex flex-col flex-1 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          {userAvatarUrl && (
            <img
              src={userAvatarUrl}
              alt={userName ?? 'Avatar'}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl font-display font-semibold">Кабинет</h1>
            {userName && (
              <p className="text-sm text-muted-foreground mt-0.5">{userName}</p>
            )}
          </div>
        </div>
        <LiveClock />
      </div>

      <Tabs defaultValue="stats" className="flex flex-col flex-1">
        <TabsList className="mx-4 mb-1 w-full">
          <TabsTrigger value="stats">Статистика</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        {/* ───────── СТАТИСТИКА ───────── */}
        <TabsContent value="stats" className="flex flex-col gap-4 px-4 pt-2 pb-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Сегодня"
              value={`${todayStats.calories} ккал`}
              sub={`из ${calorieLimit} лимита`}
            />
            {weeklyAvg ? (
              <StatCard
                label="Среднее за 7 дней"
                value={`${weeklyAvg.calories} ккал`}
                sub={`Б${weeklyAvg.protein} Ж${weeklyAvg.fat} У${weeklyAvg.carbs}`}
              />
            ) : (
              <StatCard label="Среднее за 7 дней" value="—" sub="Нет данных" />
            )}
          </div>

          {weeklyAvg && (
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Белок (ср.)" value={`${weeklyAvg.protein}г`} />
              <StatCard label="Жиры (ср.)" value={`${weeklyAvg.fat}г`} />
              <StatCard label="Углеводы (ср.)" value={`${weeklyAvg.carbs}г`} />
            </div>
          )}

          {/* Bar chart */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Ккал за 14 дней</p>
            </div>
            <BarChart days={last14} limit={calorieLimit} />
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-primary inline-block" />
                В норме
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-destructive inline-block" />
                Превышение
              </span>
            </div>
          </div>

          {/* Top dishes */}
          {topDishes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">Топ-5 блюд за 30 дней</p>
              </div>
              <div className="flex flex-col gap-2">
                {topDishes.map((dish, i) => (
                  <div key={dish.dishId} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <div className="flex-1 relative h-7 rounded-lg bg-muted overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/20 rounded-lg"
                        style={{
                          width: `${(dish.count / (topDishes[0]?.count ?? 1)) * 100}%`,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                        {dish.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">
                      ×{dish.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to log */}
          <Link
            href="/log"
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground active:bg-accent"
          >
            <CalendarDays className="w-4 h-4 text-primary" />
            Дневной лог
            <span className="ml-auto text-muted-foreground text-xs">→</span>
          </Link>
        </TabsContent>

        {/* ───────── НАСТРОЙКИ ───────── */}
        <TabsContent value="settings" className="px-4 pt-2">
          <SettingsForm settings={settings} userEmail={userEmail} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
