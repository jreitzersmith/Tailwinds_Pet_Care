-- ============================================================
-- Phase 2.2 — Pet Photos & Profile Images
-- Adds profile_image_url to pets.
-- Creates pet_photos table for sitter-uploaded visit photos.
-- Storage bucket 'pet-photos' created separately via API.
-- ============================================================

-- pets: profile image URL (public Supabase Storage URL)
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS profile_image_url text;

-- pet_photos: photos uploaded during visits (by sitter)
CREATE TABLE IF NOT EXISTS public.pet_photos (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets(id) on delete cascade,
  booking_id   uuid references public.bookings(id) on delete set null,
  storage_path text not null,
  url          text not null,
  caption      text,
  uploaded_at  timestamptz not null default now()
);

ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;

-- Customers can read photos for their own pets
CREATE POLICY "pet_photos: select own" ON public.pet_photos
  FOR SELECT USING (
    pet_id IN (SELECT id FROM public.pets WHERE customer_id = auth.uid())
  );

-- Customers can insert photos for their own pets (for profile images)
CREATE POLICY "pet_photos: insert own" ON public.pet_photos
  FOR INSERT WITH CHECK (
    pet_id IN (SELECT id FROM public.pets WHERE customer_id = auth.uid())
  );

-- Customers can delete their own pet photos
CREATE POLICY "pet_photos: delete own" ON public.pet_photos
  FOR DELETE USING (
    pet_id IN (SELECT id FROM public.pets WHERE customer_id = auth.uid())
  );

-- Storage object policies for 'pet-photos' bucket:
-- Path convention: {user_id}/{pet_id}/profile.{ext}   (profile images)
--                  {user_id}/{pet_id}/{timestamp}.{ext} (visit photos)
-- These are applied after bucket creation via Supabase dashboard or SQL below.

INSERT INTO storage.buckets (id, name, public)
  VALUES ('pet-photos', 'pet-photos', true)
  ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload into their own folder
CREATE POLICY IF NOT EXISTS "pet-photos: upload own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pet-photos' AND
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Allow authenticated users to overwrite/update their own folder
CREATE POLICY IF NOT EXISTS "pet-photos: update own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pet-photos' AND
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete from their own folder
CREATE POLICY IF NOT EXISTS "pet-photos: delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pet-photos' AND
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );
