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
    image_url: {
      url: `data:${img.mimeType};base64,${img.base64}`,
      detail: 'high' as const,
    },
  }))

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Ты эксперт по нутрициологии и OCR.

ЗАДАЧА: Определи продукт питания по фото.

ПРАВИЛА:
1. Если на фото есть этикетка с таблицей пищевой ценности — ЧИТАЙ ТОЧНЫЕ ЧИСЛА С ЭТИКЕТКИ. Не угадывай, не усредняй.
2. Если этикетки нет — используй свои знания о продукте.
3. Все значения — на 100г (или 100мл для жидкостей).
4. Если на этикетке указано "на порцию", пересчитай на 100г.

Верни JSON строго в формате:
{
  "name": string (название продукта по-русски, кратко),
  "calories": number,
  "protein": number,
  "fat": number,
  "carbs": number,
  "category": одно из ["крупы", "мясо", "молочное", "рыба", "овощи", "фрукты", "яйца", "прочее"],
  "unit": "г" или "мл"
}
Числа округляй до одного знака после запятой. Только JSON, без пояснений.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Определи продукт и его КБЖУ на 100г. Если видишь этикетку — читай числа с неё точно.',
          },
          ...imageBlocks,
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0,
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
