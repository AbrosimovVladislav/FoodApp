'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, CheckCheck, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { TodayMealEntry } from '@/app/(app)/chat/page'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatClientProps {
  todayEntries: TodayMealEntry[]
  todayCalories: number
  dailyLimit: number
  userName: string | null
}

export function ChatClient({ todayEntries, todayCalories, dailyLimit, userName }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Ошибка. Попробуйте ещё раз.',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <TodayPlan
            entries={todayEntries}
            todayCalories={todayCalories}
            dailyLimit={dailyLimit}
            userName={userName}
          />
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3 pb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите что-нибудь..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border rounded-bl-sm'
        }`}
      >
        {message.content || <span className="opacity-40">...</span>}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  )
}

function TodayPlan({
  entries,
  todayCalories,
  dailyLimit,
  userName,
}: {
  entries: TodayMealEntry[]
  todayCalories: number
  dailyLimit: number
  userName: string | null
}) {
  const eatenCalories = entries.filter((e) => e.eaten).reduce((s, e) => s + e.calories, 0)
  const caloriePercent = Math.min(100, (eatenCalories / dailyLimit) * 100)

  return (
    <div className="flex flex-col gap-4 pt-2 px-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display font-semibold text-foreground leading-tight">
            {userName ? `Привет, ${userName}!` : 'Помощник по питанию'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Знаю твой холодильник и базу блюд
          </p>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Today's plan */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            План на сегодня
          </p>
          {entries.length > 0 && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {eatenCalories} / {dailyLimit} ккал
            </p>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">Сегодня ещё ничего не запланировано</p>
            <p className="text-xs text-muted-foreground/60">Добавьте блюда в планировщике</p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  eatenCalories > dailyLimit ? 'bg-destructive' : 'bg-primary'
                )}
                style={{ width: `${caloriePercent}%` }}
              />
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5',
                    entry.eaten
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-card border border-border'
                  )}
                >
                  <div className="shrink-0">
                    {entry.eaten ? (
                      <CheckCheck className="w-4 h-4 text-primary" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      entry.eaten ? 'text-primary' : 'text-foreground'
                    )}>
                      {entry.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.amount_g}г · {entry.calories} ккал
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
