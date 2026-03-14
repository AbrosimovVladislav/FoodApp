import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ParsedIngredient {
  name: string
  amount_g: number
}

interface ParsedDish {
  name: string
  meal_type: 'breakfast' | 'main' | 'side' | 'dessert' | 'snack'
  description?: string
  ingredients: ParsedIngredient[]
}

interface KBJUResult {
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  category: string
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio')

    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: 'Аудио не найдено' }, { status: 400 })
    }

    // 1. Transcribe audio
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

    // 2. Parse dish from transcription
    const parseResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Ты помощник для планирования питания. Распарси описание блюда и верни JSON:
{
  "name": "название блюда",
  "meal_type": "breakfast|main|side|dessert|snack",
  "description": "краткое описание (необязательно)",
  "ingredients": [{ "name": "название ингредиента", "amount_g": 150 }]
}
Количество в граммах. Если не указано — используй типичную порцию. Отвечай только JSON.`,
        },
        { role: 'user', content: text },
      ],
    })

    const parsed = JSON.parse(
      parseResponse.choices[0].message.content ?? '{}'
    ) as ParsedDish

    if (!parsed.name || !parsed.ingredients?.length) {
      return NextResponse.json({ error: 'Не удалось распарсить блюдо' }, { status: 422 })
    }

    // 3. Match ingredients to DB, find unknowns
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingIngredients } = await supabase
      .from('ingredients')
      .select('id, name')

    const existing = existingIngredients ?? []

    const matchedIngredients: { ingredient_id: string; amount_g: number }[] = []
    const unknownNames: string[] = []
    const nameToId: Record<string, string> = {}

    for (const parsed_ing of parsed.ingredients) {
      const normalizedName = parsed_ing.name.toLowerCase().trim()
      const match = existing.find(
        (e) => e.name.toLowerCase().trim() === normalizedName
      )
      if (match) {
        matchedIngredients.push({ ingredient_id: match.id, amount_g: parsed_ing.amount_g })
      } else {
        unknownNames.push(parsed_ing.name)
      }
    }

    // 4. For unknown ingredients — get KBJU from OpenAI and save
    const newIngredients: { id: string; name: string }[] = []

    if (unknownNames.length > 0) {
      const kbjuResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Верни КБЖУ на 100г для каждого продукта в JSON:
{
  "results": [
    {
      "name": "название",
      "calories_per_100g": 120,
      "protein_per_100g": 5.2,
      "fat_per_100g": 3.1,
      "carbs_per_100g": 18.4,
      "category": "овощи|мясо|молочное|крупы|рыба|фрукты|прочее"
    }
  ]
}
Отвечай только JSON.`,
          },
          { role: 'user', content: `Продукты: ${unknownNames.join(', ')}` },
        ],
      })

      const kbjuData = JSON.parse(
        kbjuResponse.choices[0].message.content ?? '{"results":[]}'
      ) as { results: (KBJUResult & { name: string })[] }

      for (const item of kbjuData.results) {
        const { data: newIng } = await supabase
          .from('ingredients')
          .insert({
            name: item.name,
            calories_per_100g: item.calories_per_100g,
            protein_per_100g: item.protein_per_100g,
            fat_per_100g: item.fat_per_100g,
            carbs_per_100g: item.carbs_per_100g,
            category: item.category ?? 'прочее',
            unit: 'г',
            user_id: user.id,
          })
          .select('id, name')
          .single()

        if (newIng) {
          nameToId[item.name.toLowerCase().trim()] = newIng.id
          newIngredients.push({ id: newIng.id, name: newIng.name })
        }
      }

      // Match unknown parsed ingredients to newly created ones
      for (const parsed_ing of parsed.ingredients) {
        const key = parsed_ing.name.toLowerCase().trim()
        if (nameToId[key]) {
          matchedIngredients.push({
            ingredient_id: nameToId[key],
            amount_g: parsed_ing.amount_g,
          })
        }
      }
    }

    return NextResponse.json({
      name: parsed.name,
      meal_type: parsed.meal_type ?? 'main',
      description: parsed.description ?? '',
      ingredients: matchedIngredients,
      newIngredients,
    })
  } catch (err) {
    console.error('[voice-parse]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
