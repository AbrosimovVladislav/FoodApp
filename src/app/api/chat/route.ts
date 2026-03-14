import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { calcDishKBJU } from '@/lib/calc-kbju'
import type { DishIngredientWithIngredient } from '@/lib/calc-kbju'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[]
    }

    const supabase = await createClient()

    const [dishesRes, ingredientsRes, pantryRes] = await Promise.all([
      supabase.from('dishes').select('*, dish_ingredients(*, ingredients(*))'),
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('pantry').select('amount_g, ingredients(name, unit)'),
    ])

    const dishes = dishesRes.data ?? []
    const ingredients = ingredientsRes.data ?? []
    const pantry = pantryRes.data ?? []

    const dishContext = dishes.length > 0
      ? dishes.map((dish) => {
          const kbju = calcDishKBJU(dish.dish_ingredients as DishIngredientWithIngredient[])
          return `- ${dish.name} (${dish.meal_type}): ${Math.round(kbju.calories)} ккал | Б ${kbju.protein.toFixed(1)}г | Ж ${kbju.fat.toFixed(1)}г | У ${kbju.carbs.toFixed(1)}г`
        }).join('\n')
      : 'Блюд нет'

    const ingredientContext = ingredients.length > 0
      ? ingredients.map((i) =>
          `- ${i.name} [${i.category}]: ${i.calories_per_100g} ккал/100г, Б ${i.protein_per_100g}г, Ж ${i.fat_per_100g}г, У ${i.carbs_per_100g}г`
        ).join('\n')
      : 'Ингредиентов нет'

    const pantryContext = pantry.length > 0
      ? pantry.map((p) => {
          const ing = p.ingredients as { name: string; unit: string } | null
          return `- ${ing?.name ?? '?'}: ${p.amount_g}г`
        }).join('\n')
      : 'Холодильник пуст'

    const systemPrompt = `Ты персональный помощник по питанию для Влада. Помогаешь планировать рацион, считать КБЖУ, отвечать на вопросы о питании и кулинарии.

Правила:
- Отвечай только по теме питания, здоровья, кулинарии и планирования рациона
- Будь конкретным и кратким
- Используй данные из базы при ответах на вопросы о блюдах и ингредиентах

БАЗА ДАННЫХ ВЛАДА:

Блюда:
${dishContext}

Ингредиенты:
${ingredientContext}

Холодильник (pantry):
${pantryContext}`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 800,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('[chat]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
