import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface PantryUpdate {
  ingredient_name: string
  action: 'set' | 'add'
  amount_g: number
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio')

    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: 'Аудио не найдено' }, { status: 400 })
    }

    // 1. Transcribe
    const audioFile = new File([audio], 'recording.webm', { type: audio.type })
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ru',
    })

    const text = transcription.text.trim()
    if (!text) {
      return NextResponse.json({ error: 'Не удалось распознать речь' }, { status: 422 })
    }

    // 2. Load known ingredients
    const supabase = await createClient()
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('id, name')

    const knownNames = (ingredients ?? []).map((i) => i.name).join(', ')

    // 3. Parse pantry updates from speech
    const parseResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Ты помощник для управления запасами продуктов. Пользователь говорит о своих запасах.
Известные продукты: ${knownNames}

Распарси речь и верни JSON:
{
  "updates": [
    { "ingredient_name": "точное название из списка", "action": "set", "amount_g": 200 }
  ]
}

Правила:
- "осталось X г/кг", "есть X г/кг" → action: "set"
- "купил X г/кг", "добавил X г/кг" → action: "add"
- "кончилось", "закончилось", "нет" → action: "set", amount_g: 0
- Используй ТОЛЬКО названия продуктов из известного списка
- Преобразуй кг в граммы (1 кг = 1000 г)
- Если продукт не найден в списке — пропусти
- Возвращай только те продукты, о которых явно сказал пользователь

Отвечай только JSON.`,
        },
        { role: 'user', content: text },
      ],
    })

    const parsed = JSON.parse(
      parseResponse.choices[0].message.content ?? '{"updates":[]}'
    ) as { updates: PantryUpdate[] }

    // 4. Match names to IDs
    const matched = []
    for (const update of parsed.updates ?? []) {
      const ing = (ingredients ?? []).find(
        (i) => i.name.toLowerCase().trim() === update.ingredient_name.toLowerCase().trim()
      )
      if (ing) {
        matched.push({
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          action: update.action,
          amount_g: Math.max(0, Math.round(update.amount_g)),
        })
      }
    }

    return NextResponse.json({ transcript: text, updates: matched })
  } catch (err) {
    console.error('[voice-pantry]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
