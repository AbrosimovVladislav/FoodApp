-- FoodApp — User Data Isolation
-- Migration 002
-- Adds user_id to all data tables, enables RLS, adds per-user policies

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add user_id columns (nullable to allow safe migration of existing data)
-- ─────────────────────────────────────────────────────────────────────────────

alter table ingredients
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table dishes
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table meal_plan
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table pantry
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table shopping_list
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table food_log
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Restructure settings: drop singleton constraint, add user_id
-- ─────────────────────────────────────────────────────────────────────────────

alter table settings drop constraint if exists settings_single_row;

alter table settings
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table settings
  add constraint if not exists settings_per_user unique(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fix unique constraints to be scoped per user
-- ─────────────────────────────────────────────────────────────────────────────

-- pantry: ingredient_id was globally unique, now unique per user
alter table pantry drop constraint if exists pantry_ingredient_id_key;
alter table pantry
  add constraint if not exists pantry_ingredient_user_key unique(ingredient_id, user_id);

-- meal_plan: (date, slot) was globally unique, now unique per user
alter table meal_plan drop constraint if exists meal_plan_date_slot_key;
alter table meal_plan
  add constraint if not exists meal_plan_date_slot_user_key unique(date, slot, user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Enable Row Level Security on all tables
-- ─────────────────────────────────────────────────────────────────────────────

alter table ingredients      enable row level security;
alter table dishes           enable row level security;
alter table dish_ingredients enable row level security;
alter table meal_plan        enable row level security;
alter table pantry           enable row level security;
alter table shopping_list    enable row level security;
alter table food_log         enable row level security;
alter table settings         enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS Policies — each user sees only their own rows
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "user_isolation" on ingredients;
create policy "user_isolation" on ingredients
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_isolation" on dishes;
create policy "user_isolation" on dishes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- dish_ingredients has no user_id; access is controlled via parent dish
drop policy if exists "user_isolation" on dish_ingredients;
create policy "user_isolation" on dish_ingredients
  for all
  using (
    dish_id in (select id from dishes where user_id = auth.uid())
  )
  with check (
    dish_id in (select id from dishes where user_id = auth.uid())
  );

drop policy if exists "user_isolation" on meal_plan;
create policy "user_isolation" on meal_plan
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_isolation" on pantry;
create policy "user_isolation" on pantry
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_isolation" on shopping_list;
create policy "user_isolation" on shopping_list
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_isolation" on food_log;
create policy "user_isolation" on food_log
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_isolation" on settings;
create policy "user_isolation" on settings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Performance indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists ingredients_user_id_idx      on ingredients(user_id);
create index if not exists dishes_user_id_idx           on dishes(user_id);
create index if not exists meal_plan_user_date_idx      on meal_plan(user_id, date);
create index if not exists pantry_user_id_idx           on pantry(user_id);
create index if not exists shopping_list_user_week_idx  on shopping_list(user_id, week_start_date);
create index if not exists food_log_user_date_idx       on food_log(user_id, date);
create index if not exists settings_user_id_idx         on settings(user_id);
