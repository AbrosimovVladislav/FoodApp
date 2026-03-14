import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Ты эксперт по нутрициологии. Дай точные значения КБЖУ на 100г продукта в сыром/необработанном виде (если не указано иное).
Верни JSON строго в формате:
{
  "calories": number,
  "protein": number,
  "fat": number,
  "carbs": number,
  "category": одно из ["мясо и рыба", "молочные", "крупы и злаки", "овощи", "фрукты", "орехи и семена", "масла и жиры", "специи", "напитки", "прочее"],
  "unit": "г" или "мл"
}
Все числа округляй до одного знака после запятой. Отвечай только JSON, без пояснений.`,
      },
      {
        role: 'user',
        content: name.trim(),
      },
    ],
    max_tokens: 200,
    temperature: 0.1,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  try {
    const data = JSON.parse(raw) as {
      calories: number
      protein: number
      fat: number
      carbs: number
      category: string
      unit: string
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Не удалось распарсить ответ AI' }, { status: 500 })
  }
}
