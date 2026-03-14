# CLAUDE.md — Web Projects Setup

## Overview

This file defines the rules, patterns, and conventions Claude must follow for all web projects in this workspace. Read this file fully before starting any task.

---

## Tech Stack

- **Framework**: Next.js 16.1 (App Router) — актуальная стабильная версия на март 2026; Turbopack стабилен по умолчанию, React Compiler поддерживается
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS v4.2 + CSS-first конфигурация через `@theme` в globals.css (без `tailwind.config.js`)
- **UI Components**: shadcn/ui CLI v4 — с поддержкой shadcn/skills, Design System Presets, Radix UI и Base UI
- **Database & Auth**: Supabase — `@supabase/supabase-js` v2.99, `@supabase/ssr` v0.9
- **State Management**: Zustand для глобального состояния, TanStack Query v5 для серверного
- **Forms**: React Hook Form v7 + Zod v3
- **Icons**: Lucide React

---

## Project Structure

```
/app                    # Next.js App Router pages & layouts
  /(marketing)          # Public-facing pages (landing, about, pricing)
  /(dashboard)          # Auth-protected internal pages
  /api                  # API route handlers
/components
  /ui                   # shadcn/ui primitives (auto-generated, don't edit manually)
  /shared               # Reusable components used across the app
  /[feature]            # Feature-specific components grouped by domain
/lib
  /supabase             # Supabase client, server, middleware helpers
  /utils.ts             # cn(), formatters, helpers
  /validations          # Zod schemas
/hooks                  # Custom React hooks
/types                  # Global TypeScript types and interfaces
/public                 # Static assets
```

---

## Code Style Rules

### General

- Always prefer **Server Components** unless the component requires interactivity (hooks, event handlers, browser APIs)
- Mark client components explicitly with `"use client"` at the top
- Use `cn()` from `lib/utils` for all conditional Tailwind class merging
- File names: **kebab-case** (`user-profile-card.tsx`)
- Component names: **PascalCase** (`UserProfileCard`)
- Never use `any` — use `unknown` and narrow the type

### TypeScript

```typescript
// ✅ Good
interface UserCardProps {
  user: Pick<User, 'id' | 'name' | 'email'>
  onSelect?: (id: string) => void
}

// ❌ Bad
const UserCard = (props: any) => { ... }
```

### Imports order

1. React / Next.js
2. Third-party libraries
3. Internal components (`@/components/...`)
4. Internal lib/hooks/types (`@/lib/...`, `@/hooks/...`, `@/types/...`)
5. Styles

---

## Design System

### Philosophy

Every UI must have a **clear aesthetic point-of-view**. Avoid generic AI-looking interfaces. Before building any component or page, commit to a specific visual direction.

Refer to the **frontend-design skill** (`~/.claude/skills/frontend-design/SKILL.md`) before creating any UI component, page, or landing section.

### Aesthetic Directions by Project Type

| Project Type | Default Direction                             |
| ------------ | --------------------------------------------- |
| Landing page | Editorial / Magazine or Luxury / Refined      |
| Dashboard    | Industrial / Utilitarian or Minimal / Precise |
| SaaS app     | Modern Minimal or Soft / Structured           |
| E-commerce   | Bold product-focused, high contrast           |

### Typography Rules

- **Never use**: Inter, Roboto, Arial, system fonts as primary typeface
- **Prefer**: Distinctive display fonts paired with refined body fonts
- Load via `next/font` (Google Fonts or local)
- Example pairs: `Playfair Display` + `DM Sans`, `Clash Display` + `Instrument Sans`

### Color Rules

- В Tailwind v4 все токены объявляются через `@theme` прямо в CSS — **без** `tailwind.config.js`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0a0a;
  --color-surface: #141414;
  --color-border: #222222;
  --color-accent: #e8ff47;
  --color-text-primary: #f5f5f5;
  --color-text-muted: #888888;

  --font-display: "Playfair Display", serif;
  --font-body: "DM Sans", sans-serif;
}
```

- Используй dominant color + **резкий акцент** — избегай равномерно распределённой палитры
- Токены определяются один раз в `globals.css` и доступны как utility-классы Tailwind автоматически

### Spacing & Layout

- Используй spacing scale Tailwind последовательно
- Маркетинговые страницы: **асимметричные лейауты** и щедрое негативное пространство
- Дашборды: **контролируемая плотность** с чёткой визуальной иерархией
- Не повторять card-grid-card-grid паттерн без намеренного отступления от него

---

## Supabase Patterns

### Client Setup

```typescript
// lib/supabase/client.ts — browser client
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/server.ts — server component client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createClient = () => { ... }
```

### Data Fetching Pattern

```typescript
// ✅ Always type your queries
const { data, error } = await supabase
  .from("products")
  .select("id, name, price, created_at")
  .eq("is_active", true)
  .order("created_at", { ascending: false });

if (error) throw new Error(error.message);
```

### Auth Guard Pattern

```typescript
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <>{children}</>
}
```

---

## MCP Servers

### Figma MCP

**When to use:**

- Before building any page or component that has a Figma design file → read tokens, colors, and layout via MCP first
- To generate wireframes or mockups before coding
- To extract exact spacing, typography, and component structure

**Workflow:**

1. If Figma file exists → use MCP to read design tokens and component structure
2. Map Figma tokens to CSS variables in `globals.css`
3. Only then write the component code

**Rule**: Never "guess" a design from a description if a Figma file is available. Always read it first.

### Supabase MCP

**When to use:**

- Before writing any DB query → introspect the schema via MCP
- When creating migrations or new tables
- To generate TypeScript types from the schema

**Workflow:**

1. Use MCP to list tables and columns before writing queries
2. Never invent column names — always verify against actual schema
3. Use `supabase gen types` for TypeScript types

---

## Common Patterns

### Form with Validation

```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});

const onSubmit = async (data: z.infer<typeof schema>) => {
  // handle submit
};
```

### Server Action Pattern

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProduct(formData: FormData) {
  const supabase = createClient()
  const { error } = await supabase.from('products').insert({ ... })
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/products')
  return { success: true }
}
```

### Loading & Error States

- Always handle `loading`, `error`, and `empty` states for any data-fetching component
- Use `Suspense` + `loading.tsx` for page-level loading
- Use `error.tsx` for page-level error boundary

---

## Performance Rules

- Images: always use `next/image` with explicit `width` / `height` or `fill`
- Fonts: always load via `next/font` — never `<link>` in HTML
- Dynamic imports: use `next/dynamic` for heavy components (charts, editors, maps)
- Bundle: avoid importing entire icon libraries — import named icons only

---

## Environment Variables

```bash
# Required for every project
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only, never expose to client
```

Never access `SUPABASE_SERVICE_ROLE_KEY` in client components or expose it in any public context.

---

## Skills Reference

| Task                                    | Skill to load first      |
| --------------------------------------- | ------------------------ |
| Any UI component, page, landing section | `frontend-design`        |
| Word document export                    | `docx`                   |
| PDF generation or manipulation          | `pdf`                    |
| Excel / spreadsheet export              | `xlsx`                   |
| Anthropic API usage in app              | `product-self-knowledge` |

**Rule**: Always read the relevant skill file before starting the task it covers.

---

## What Claude Should NOT Do

- ❌ Use `any` type
- ❌ Use generic fonts (Inter, Roboto, Arial)
- ❌ Invent Supabase column names without checking schema
- ❌ Use client components when a server component works
- ❌ Skip loading/error states in data-fetching components
- ❌ Copy-paste the same card-grid layout for every page
- ❌ Build UI without reading `frontend-design` skill first
- ❌ Ignore Figma file if one is available
