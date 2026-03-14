import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { images } = await req.json() as {
    images: { base64: string; mimeType: string }[]
  }

  if (!images?.length) {
    return NextResponse.json({ error: 'Нет изображений' }, { status: 400 })
  }

  const imageBlocks = images.map((img) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
  }))

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Ты эксперт по нутрициологии. Определи продукт питания по фото (этикетка, упаковка или сам продукт).
Верни КБЖУ на 100г. Если на фото видна этикетка — используй данные с неё. Иначе — используй свои знания о продукте.
Верни JSON строго в формате:
{
  "name": string (название продукта по-русски),
  "calories": number,
  "protein": number,
  "fat": number,
  "carbs": number,
  "category": одно из ["мясо и рыба", "молочные", "крупы и злаки", "овощи", "фрукты", "орехи и семена", "масла и жиры", "специи", "напитки", "прочее"],
  "unit": "г" или "мл"
}
Все числа округляй до одного знака после запятой. Только JSON, без пояснений.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Определи продукт на фото и верни его КБЖУ на 100г.' },
          ...imageBlocks,
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0.1,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  try {
    const data = JSON.parse(raw) as {
      name: string
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
