'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Сколько калорий в гречке с фаршем?',
  'Что можно приготовить из моих ингредиентов?',
  'Составь план питания на день на 2000 ккал',
]

export function ChatClient() {
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
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState onSuggest={send} />
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
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

function EmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-6 pt-4 px-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display font-semibold text-foreground leading-tight">Помощник по питанию</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Знаю твой холодильник и базу блюд
          </p>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Suggestions */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 px-1">
          Попробуй спросить
        </p>
        {SUGGESTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="group flex items-center gap-3 text-sm text-left px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/20 transition-colors"
          >
            <span className="text-xs font-mono text-muted-foreground/40 tabular-nums w-4 shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex-1 text-foreground">{s}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )
}
