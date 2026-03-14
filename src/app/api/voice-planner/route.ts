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

    // 2. Load known dishes and ingredients
    const supabase = await createClient()
    const [dishesResult, ingredientsResult] = await Promise.all([
      supabase.from('dishes').select('id, name'),
      supabase.from('ingredients').select('id, name'),
    ])

    const dishes = dishesResult.data ?? []
    const ingredients = ingredientsResult.data ?? []

    const today = new Date()
    function toLocalDateStr(d: Date): string {
      const y = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${mo}-${day}`
    }

    const todayStr = toLocalDateStr(today)
    // Build day map for this week (Mon to Sun)
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const dayMap: Record<string, string> = {}
    const dayNames = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
    const dayNamesAlt = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dStr = toLocalDateStr(d)
      dayMap[dayNames[i]] = dStr
      dayMap[dayNamesAlt[i]] = dStr
      const dayNum = d.getDate()
      const monthNames = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
      dayMap[`${dayNum} ${monthNames[d.getMonth()]}`] = dStr
    }
    dayMap['сегодня'] = todayStr
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    dayMap['вчера'] = toLocalDateStr(yesterday)

    const dishNames = dishes.map((d) => d.name).join(', ')
    const ingredientNames = ingredients.map((i) => i.name).join(', ')

    // 3. Parse entries from speech
    const parseResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Ты помощник для планирования питания. Пользователь голосом добавляет еду в план.
Сегодня: ${todayStr} (${dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]})

Известные блюда: ${dishNames || 'нет'}
Известные продукты: ${ingredientNames || 'нет'}

Распарси речь и верни JSON:
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "type": "dish" | "ingredient",
      "name": "точное название из списков",
      "amount_g": 100
    }
  ]
}

Правила:
- Определи дату из контекста (сегодня, вчера, понедельник, пятница, "13 марта" и т.д.)
- Если дата не указана — используй сегодняшнюю (${todayStr})
- Ищи совпадение сначала в блюдах, затем в продуктах (используй ТОЛЬКО точные названия из списков)
- Если продукт/блюдо не найдено в списках — пропусти
- amount_g: количество в граммах (преобразуй "кг" → граммы, "штука"/"шт" → 100г по умолчанию)
- Можно добавить несколько позиций за раз

Отвечай только JSON.`,
        },
        { role: 'user', content: text },
      ],
    })

    const parsed = JSON.parse(
      parseResponse.choices[0].message.content ?? '{"entries":[]}'
    ) as { entries: { date: string; type: string; name: string; amount_g: number }[] }

    // 4. Match names to IDs
    const matched = []
    for (const e of parsed.entries ?? []) {
      const name = e.name?.toLowerCase().trim()
      if (!name) continue

      if (e.type === 'dish') {
        const dish = dishes.find((d) => d.name.toLowerCase().trim() === name)
        if (dish) {
          matched.push({
            date: e.date,
            dish_id: dish.id,
            name: dish.name,
            amount_g: Math.max(1, Math.round(e.amount_g ?? 100)),
          })
        }
      } else {
        const ing = ingredients.find((i) => i.name.toLowerCase().trim() === name)
        if (ing) {
          matched.push({
            date: e.date,
            ingredient_id: ing.id,
            name: ing.name,
            amount_g: Math.max(1, Math.round(e.amount_g ?? 100)),
          })
        }
      }
    }

    return NextResponse.json({ transcript: text, entries: matched })
  } catch (err) {
    console.error('[voice-planner]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
