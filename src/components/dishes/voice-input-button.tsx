'use client'

import { useState, useRef } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DishFormValues } from '@/lib/validations/dish'

interface VoiceInputButtonProps {
  onResult: (values: Partial<DishFormValues> & { newIngredients?: { id: string; name: string }[] }) => void
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording' | 'processing'

export function VoiceInputButton({ onResult, disabled }: VoiceInputButtonProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processAudio(blob)
      }

      mediaRecorder.start()
      setState('recording')
    } catch {
      toast.error('Нет доступа к микрофону')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setState('processing')
  }

  async function processAudio(blob: Blob) {
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')

    try {
      const res = await fetch('/api/voice-parse', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error ?? 'Ошибка сервера')
      }

      const data = await res.json() as Partial<DishFormValues> & { newIngredients?: { id: string; name: string }[] }
      onResult(data)
      toast.success('Блюдо распознано')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось распознать')
    } finally {
      setState('idle')
    }
  }

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isProcessing}
      className={cn(
        'h-10 gap-2 transition-colors',
        isRecording && 'border-destructive text-destructive hover:text-destructive'
      )}
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isRecording ? (
        <Square className="w-4 h-4 fill-current" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
      {isProcessing ? 'Распознаю...' : isRecording ? 'Стоп' : 'Голос'}
    </Button>
  )
}
