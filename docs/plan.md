# FoodApp — Plan

## Context

Влад ест хаотично, не контролирует КБЖУ, хочет готовить дома по плану. Приложение решает:

- Планирование блюд на неделю (6 дней, воскресенье — выходной)
- Автоматический расчёт КБЖУ на день / неделю
- Управление холодильником и списком покупок (2 похода в магазин в неделю)
- Голосовой ввод блюд через Claude API
- База блюд и ингредиентов в Supabase (AI вызывается только для новых неизвестных продуктов)
- Аналитика питания (ретроспектива по дням)

**Решения:**

- Auth: нет (single-user, без логина)
- AI: OpenAI — `gpt-4o-mini` для парсинга голоса и поиска КБЖУ новых продуктов (через `openai` npm SDK)
- Figma: Untitled UI — FREE Figma UI kit and design system v2.0

---

## Шаги реализации

---

### Шаг 1 — Инфраструктура и дизайн-система ✅ ВЫПОЛНЕН

**Результат:** чистая база, готовая к разработке

- ✅ **globals.css** — `@theme` с токенами, типографика (h1–h4, p), тёмная тема
  - Фон: тёплый крем `#F8F6F1`, акцент: глубокий зелёный `#2D6A4F`
- ✅ **Шрифты** — Instrument Serif (display) + Plus Jakarta Sans (body) через `next/font`
- ✅ **layout.tsx** — шрифты применены, базовый фон
- ✅ **shadcn/ui** — 12 компонентов: button, badge, card, dialog, input, label, progress, separator, sheet, skeleton, sonner, tabs
- ✅ **Supabase** — проект создан, `.env.local` настроен
- ✅ **Supabase schema** — 8 таблиц созданы в облаке, миграция: `supabase/migrations/001_initial_schema.sql`
- ✅ **TypeScript types** — сгенерированы в `src/types/database.ts`
- ✅ **lib/supabase/** — `client.ts` и `server.ts`
- ✅ **Структура папок** — `hooks/`, `components/shared/`, `lib/validations/`

---

### Шаг 2 — База блюд и ингредиентов (Dish Library) ✅ ВЫПОЛНЕН

- ✅ **Роут** `app/(app)/dishes/page.tsx` — список всех блюд (server component, parallel fetches)
- ✅ **`DishCard`** — название, тип, КБЖУ на порцию через `calcDishKBJU`
- ✅ **Форма** `dish-form.tsx` — React Hook Form + Zod, динамические поля ингредиентов, grouped by category
- ✅ **Голосовой ввод** `voice-input-button.tsx` — MediaRecorder → blob → API route
- ✅ **API route** `app/api/voice-parse/route.ts` — Whisper (ru) → GPT-4o-mini → JSON, автосоздание новых ингредиентов с КБЖУ
- ✅ **`lib/calc-kbju.ts`** — `calcDishKBJU()` + `roundKBJU()`
- ✅ **Server Actions** — `createDish`, `updateDish`, `deleteDish`
- ✅ **Страница ингредиентов** `app/(app)/ingredients/page.tsx` — CRUD, поиск, группировка по категории
- ✅ **`bottom-nav.tsx`** — 5 пунктов навигации
- ✅ **`app/(app)/layout.tsx`** — max-w-md, fixed bottom nav

---

### Шаг 3 — Холодильник (Pantry) ✅ ВЫПОЛНЕН

- ✅ **Роут** `app/(app)/pantry/page.tsx` — список ингредиентов с количеством (г)
- ✅ **`PantryItem`** — название, остаток (г), кнопки ±50г (быстрая корректировка)
- ✅ **Форма** — добавить/обновить позицию (upsert на conflict по ingredient_id)
- ✅ **Server Actions** — `addPantryItem`, `updatePantryAmount`, `removePantryItem`
- ✅ **Сортировка** — < 100г показывает предупреждение
- ✅ **Таб "Покупки"** в `pantry-client.tsx` — placeholder, готов к интеграции с Шагом 5

---

### Шаг 3.1 — AI-заполнение ингредиентов ✅ ВЫПОЛНЕН

- ✅ **Кнопка Sparkles** в форме ингредиента — ввести название → AI (gpt-4o-mini) заполняет КБЖУ + категорию
- ✅ **Кнопка ImagePlus** — выбрать фото из галереи (multiple) → AI (gpt-4o, detail: high) читает этикетку и заполняет все поля включая название
- ✅ **API route** `app/api/ingredient-lookup/route.ts` — КБЖУ по названию
- ✅ **API route** `app/api/ingredient-photo/route.ts` — OCR этикетки через gpt-4o vision
- ✅ Сжатие изображений на клиенте (canvas, 2048px max, JPEG 0.8)

→ **Переходим к Шагу 4**

---

### Шаг 4 — Планировщик питания (Weekly Meal Planner) ✅ ВЫПОЛНЕН

- ✅ **Роут** `app/(app)/planner/page.tsx` — server component, загружает meal_plan / dishes / ingredients / settings параллельно
- ✅ **`PlannerPageClient`** — недельный вид Пн–Сб (6 дней), карточка на каждый день
- ✅ **Добавление приёма** — Sheet снизу: поиск по блюдам и продуктам (табы), ввод граммовки, превью КБЖУ
- ✅ **Удаление приёма** — кнопка × на каждой записи
- ✅ **КБЖУ сводка по дню** — суммарные ккал / белок / жир / углеводы, прогресс-бар
- ✅ **Алерт превышения калорий** — прогресс-бар краснеет + ⚠ при превышении лимита
- ✅ **Настройки** `app/(app)/settings/page.tsx` — "Дневной лимит ккал" + "Целевой белок (г)"
- ✅ **Server Actions** — `addMealPlanEntry`, `removeMealPlanEntry`, `updateSettings`
- ✅ **Навигация по неделям** — кнопки ← / →, кнопка "Эта неделя" при отклонении
- ✅ **Подсветка сегодня** — текущий день выделен рамкой и badge "Сегодня"

---

### Шаг 5 — Список покупок (Shopping List) ✅ ВЫПОЛНЕН

**Два уровня покупок:**

**Таб «Покупки» в `/pantry`** (основной, используется стоя на кухне):
- ✅ Показывает дефицит: что нужно по плану но нет/недостаточно в холодильнике
- ✅ Кнопка «Купил» → Sheet с граммовкой → `buyIngredient` добавляет в pantry
- ✅ Голосовой ввод «что купил» → `/api/voice-shopping` → автоматически добавляет в pantry

**Страница `/shopping`** (расширенный список с генерацией):
- ✅ **`ShoppingClient`** — чекбокс-список с группировкой по категории
- ✅ **Генерация** `generateShoppingList(weekStartStr)` — суммирует ингредиенты из meal_plan, вычитает pantry
- ✅ **Пересчёт**, **отметить/снять** купленным, **ручное добавление**, **удаление**
- ✅ **Навигация по неделям** — кнопки ← / →
- ✅ **Голосовой ввод** — кнопка Mic: Whisper → GPT-4o-mini → `markPurchasedByIngredientIds`

---

### Шаг 6 — Дневной лог и аналитика

**Цель:** ретроспектива питания и дополнительные записи вне плана

1. **Роут** `app/(app)/log/page.tsx` — лог по дням (date picker или недельный вид)
2. **Дневная карточка** — план по КБЖУ vs факт, список блюд дня
3. **"Съел вне плана"** — форма: ввести продукт / блюдо голосом или текстом
  - Если продукт новый → OpenAI запрос → КБЖУ → сохранить в `ingredients`
  - Добавить запись в `food_log`
4. **Аналитика** `app/(app)/analytics/page.tsx`:
  - График ккал по дням (последние 30 дней)
  - Среднее КБЖУ за неделю / месяц
  - Топ-5 самых частых блюд
5. **Закрытие дня** — кнопка "Подтвердить день" → фиксирует plan → log

**Проверка:**

- Отметить день как завершённый → данные зафиксированы в `food_log`
- Добавить внеплановый продукт голосом → КБЖУ добавилось к дню
- Аналитика показывает корректные данные за последние дни

---

### Шаг 7 — Навигация и полировка UI 🔄 В ПРОЦЕССЕ

1. **Layout** `app/(app)/layout.tsx` — bottom nav (mobile-first):
  - ✅ Чат / План / Запасы / Блюда / Настройки
  - ✅ **LiveClock** — дата и время в правом верхнем углу (все страницы)
2. **Главный экран** `app/page.tsx` → redirect на `/planner`
3. **Mobile-first** — все экраны работают на телефоне (стоя на кухне)
4. **Skeleton loaders** — для всех data-fetching компонентов
5. **Toast уведомления** — shadcn/ui Sonner (везде)

**Осталось:**
- Skeleton loaders для страниц
- Error states

**Проверка:**

- Навигация работает на мобильном
- Все экраны имеют skeleton и error state

---

## Архитектурные решения


| Аспект        | Решение                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| Auth          | Нет — single-user                                                                |
| AI            | OpenAI `gpt-4o-mini` — голос + КБЖУ новых продуктов                              |
| Голос → текст | Browser `MediaRecorder` → API route → OpenAI                                     |
| КБЖУ расчёт   | Локально из БД (`lib/calc-kbju.ts`), AI только для новых                         |
| State         | TanStack Query для server data, Zustand для UI state                             |
| Routing       | `/planner`, `/dishes`, `/pantry`, `/shopping`, `/log`, `/analytics`, `/settings` |
| Design        | Untitled UI (Figma) → токены в `globals.css` через `@theme`                      |


## Критические файлы

- `src/app/globals.css` — дизайн-токены
- `src/lib/supabase/client.ts` + `server.ts`
- `src/lib/calc-kbju.ts` — расчёт КБЖУ
- `src/app/api/voice-parse/route.ts` — голосовой ввод + Claude
- `src/types/database.ts` — сгенерированные Supabase типы
- `supabase/migrations/001_initial_schema.sql`

