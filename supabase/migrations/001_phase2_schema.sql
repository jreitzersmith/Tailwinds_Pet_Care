-- ============================================================
-- Phase 2 Schema Migration — Tailwinds Pet Care
-- Run once in the Supabase SQL editor (as postgres role).
-- ============================================================

-- -------------------------------------------------------
-- 1. customers
--    id mirrors auth.users.id — one row per registered user.
--    The handle_new_user trigger auto-inserts on signup.
-- -------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  address     text,
  airline     text check (airline in ('Southwest', 'American', 'Other', null)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "customers: select own" on public.customers
  for select using (auth.uid() = id);

create policy "customers: update own" on public.customers
  for update using (auth.uid() = id);

-- Trigger: auto-create customer profile row on auth.users INSERT
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------
-- 2. pets
-- -------------------------------------------------------
create table if not exists public.pets (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name        text not null,
  species     text not null check (species in ('Dog','Cat','Bird','Reptile','Fish','Small Mammal','Other')),
  breed       text,
  age_years   numeric(4,1),
  weight_lbs  numeric(5,1),
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.pets enable row level security;

create policy "pets: select own" on public.pets
  for select using (customer_id = auth.uid());

create policy "pets: insert own" on public.pets
  for insert with check (customer_id = auth.uid());

create policy "pets: update own" on public.pets
  for update using (customer_id = auth.uid());

create policy "pets: delete own" on public.pets
  for delete using (customer_id = auth.uid());

-- -------------------------------------------------------
-- 3. services  (populated via Supabase dashboard or seed below)
--    Customers have read-only access; no customer inserts.
-- -------------------------------------------------------
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  category         text not null,
  name             text not null,
  description      text,
  base_price       numeric(7,2) not null default 0,
  duration_minutes int,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "services: select authenticated" on public.services
  for select using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- 4. bookings
-- -------------------------------------------------------
create table if not exists public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  customer_id          uuid not null references public.customers(id) on delete cascade,
  pet_id               uuid references public.pets(id) on delete set null,
  service_id           uuid not null references public.services(id),
  booking_date         date not null,
  booking_time         time,
  status               text not null default 'pending'
                         check (status in ('pending','confirmed','in_progress','completed','cancelled')),
  zone                 int check (zone between 1 and 9),
  travel_fee           numeric(7,2) not null default 0,
  base_price           numeric(7,2) not null,
  total_price          numeric(7,2) not null,
  special_instructions text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "bookings: select own" on public.bookings
  for select using (customer_id = auth.uid());

create policy "bookings: insert own" on public.bookings
  for insert with check (customer_id = auth.uid());

-- Customers may only flip their own booking to 'cancelled'
create policy "bookings: cancel own" on public.bookings
  for update using (customer_id = auth.uid())
  with check (status = 'cancelled');

-- -------------------------------------------------------
-- 5. updated_at auto-stamp trigger (customers + bookings)
-- -------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_updated_at before update on public.customers
  for each row execute procedure public.set_updated_at();

create trigger bookings_updated_at before update on public.bookings
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------
-- 6. Seed services
--    TODO: Update base_price values before go-live.
--    Edit prices in Supabase dashboard: Table Editor → services.
-- -------------------------------------------------------
insert into public.services (category, name, description, base_price) values
  ('Sitting & Visits',   'Pet Sitting (In-Home)',
   'We come to your home and care for your pet in their familiar environment. Ideal for airline crew on short or long trips.', 35),
  ('Sitting & Visits',   'Drop-In Visits',
   'Quick scheduled check-ins for feeding, fresh water, playtime, and a potty break — perfect when you just need a midday stop.', 25),
  ('Sitting & Visits',   'Overnight Stays',
   'Your pet sitter stays at your home overnight, giving your pet company and a consistent routine while you are away.', 40),
  ('Sitting & Visits',   'Extended Care Packages',
   'Bundled daily visits tailored for multi-day trips. Discounted rates for Southwest and American Airlines crew on extended layovers.', 30),
  ('Dog Services',       'Dog Walking',
   'On-leash neighborhood walks with updates and photos sent after every outing.', 25),
  ('Dog Services',       'Outdoor Fecal Collection',
   'We clean up your yard so it is fresh and ready when you get home. Available as a standalone service or add-on.', 20),
  ('Specialized Pet Care', 'Exotic Pet Care',
   'Experienced care for reptiles, birds, small mammals, chickens, and other non-traditional pets — not just dogs and cats.', 35),
  ('Specialized Pet Care', 'Aquarium Maintenance',
   'Feeding, water testing, partial water changes, and general upkeep for freshwater and saltwater tanks.', 30),
  ('Specialized Pet Care', 'Senior Pet Care',
   'Gentle, attentive visits for elderly or special-needs pets, including mobility assistance and comfort checks.', 30),
  ('Specialized Pet Care', 'Puppy & Kitten Visits',
   'More frequent check-ins and extra attention for young animals that need closer supervision and socialization.', 25),
  ('Specialized Pet Care', 'Medication Administration',
   'Pills, injections, eye drops, and other prescribed treatments administered on schedule with a logged record per visit.', 35),
  ('Specialized Pet Care', 'Custom Pet Food',
   'Freshly prepared, custom pet food made to order for your pet''s dietary needs, preferences, and health requirements.', 28),
  ('Transportation',     'Pet Transport (Within DFW)',
   'Safe, comfortable transport to vet appointments, grooming, or anywhere else your pet needs to go within the DFW metroplex.', 40),
  ('Add-On Services',    'Mail & Package Retrieval',
   'We collect your mail and packages during pet care visits so nothing sits outside while you are away.', 20),
  ('Add-On Services',    'Plant Watering',
   'We water your indoor plants during visits — one less thing to worry about on a long trip.', 20),
  ('Custom Construction','Outdoor Dog Runs',
   'Custom-built secure dog runs designed for your yard and your dog''s size and energy level.', 40),
  ('Custom Construction','Custom Dog Houses',
   'Handcrafted dog houses built to your specifications — weatherproofed and sized to fit your pet.', 38),
  ('Custom Construction','Custom Cat Trees & Cat Walks',
   'Built-to-order cat trees, wall-mounted cat walks, and climbing structures designed to match your home.', 35)
on conflict do nothing;
