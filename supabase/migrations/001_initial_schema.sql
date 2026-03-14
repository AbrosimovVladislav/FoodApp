-- FoodApp — Initial Schema
-- Migration 001

-- Ingredients reference table
create table if not exists ingredients (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  unit             text not null default 'г',
  calories_per_100g numeric not null default 0,
  protein_per_100g  numeric not null default 0,
  fat_per_100g      numeric not null default 0,
  carbs_per_100g    numeric not null default 0,
  category          text not null default 'прочее',
  created_at        timestamptz default now()
);

-- Dishes reference table
create table if not exists dishes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  meal_type   text not null check (meal_type in ('main', 'side', 'dessert')),
  created_at  timestamptz default now()
);

-- Junction: dish ↔ ingredients with amount
create table if not exists dish_ingredients (
  id            uuid primary key default gen_random_uuid(),
  dish_id       uuid not null references dishes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  amount_g      numeric not null
);

-- Weekly meal plan (Mon–Sat, 3 slots per day)
create table if not exists meal_plan (
  id      uuid primary key default gen_random_uuid(),
  date    date not null,
  slot    text not null check (slot in ('meal1', 'meal2', 'meal3')),
  dish_id uuid not null references dishes(id) on delete cascade,
  unique (date, slot)
);

-- Pantry — current fridge inventory
create table if not exists pantry (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null unique references ingredients(id) on delete cascade,
  amount_g      numeric not null default 0,
  updated_at    timestamptz default now()
);

-- Shopping list — auto-generated per week
create table if not exists shopping_list (
  id              uuid primary key default gen_random_uuid(),
  ingredient_id   uuid not null references ingredients(id) on delete cascade,
  week_start_date date not null,
  amount_g        numeric not null,
  purchased       boolean not null default false,
  created_at      timestamptz default now()
);

-- Food log — daily nutrition records
create table if not exists food_log (
  id             uuid primary key default gen_random_uuid(),
  date           date not null,
  dish_id        uuid references dishes(id) on delete set null,
  custom_note    text,
  total_calories numeric not null default 0,
  total_protein  numeric not null default 0,
  total_fat      numeric not null default 0,
  total_carbs    numeric not null default 0,
  created_at     timestamptz default now()
);

-- Settings — single row, id = 1
create table if not exists settings (
  id                  integer primary key default 1,
  daily_calorie_limit numeric not null default 2000,
  daily_protein_goal  numeric not null default 120,
  updated_at          timestamptz default now(),
  constraint settings_single_row check (id = 1)
);

-- Seed default settings row
insert into settings (id, daily_calorie_limit, daily_protein_goal)
values (1, 2000, 120)
on conflict (id) do nothing;
