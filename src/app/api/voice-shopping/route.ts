import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

    // 3. Parse purchased items from speech
    const parseResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Ты помощник для списка покупок. Пользователь говорит что купил.
Известные продукты: ${knownNames}

Распарси речь и верни JSON:
{
  "purchased": [
    { "ingredient_name": "точное название из списка", "amount_g": 200 }
  ]
}

Правила:
- "купил", "взял", "есть", "достал" — всё это покупки
- Используй ТОЛЬКО названия продуктов из известного списка
- Преобразуй кг в граммы (1 кг = 1000 г)
- "штука", "шт" → 100г по умолчанию
- Если продукт не найден в списке — пропусти
- Возвращай только те продукты, о которых явно сказал пользователь

Отвечай только JSON.`,
        },
        { role: 'user', content: text },
      ],
    })

    const parsed = JSON.parse(
      parseResponse.choices[0].message.content ?? '{"purchased":[]}'
    ) as { purchased: { ingredient_name: string; amount_g: number }[] }

    // 4. Match names to IDs
    const matched = []
    for (const item of parsed.purchased ?? []) {
      const ing = (ingredients ?? []).find(
        (i) => i.name.toLowerCase().trim() === item.ingredient_name.toLowerCase().trim()
      )
      if (ing) {
        matched.push({
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          amount_g: Math.max(1, Math.round(item.amount_g ?? 100)),
        })
      }
    }

    return NextResponse.json({ transcript: text, purchased: matched })
  } catch (err) {
    console.error('[voice-shopping]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
