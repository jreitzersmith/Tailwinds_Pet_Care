-- ============================================================
-- Migration 015: Pet Document Vault
-- General document storage per pet (medical records, insurance,
-- microchip papers, etc.) -- distinct from the vaccination-specific
-- attachment already embedded in pets.vaccinations.
-- pet_id is nullable: SMS/email intake that can't confidently match
-- a pet lands here as "unsorted" for the customer to assign later.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pet_documents (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  pet_id        uuid references public.pets(id) on delete cascade,
  doc_type      text not null default 'other'
                  check (doc_type in ('vaccination','medical_record','insurance','microchip','other')),
  title         text,
  storage_path  text not null,
  url           text not null,
  expires_on    date,
  source        text not null default 'portal' check (source in ('portal','sms','email')),
  source_ref    text,
  uploaded_at   timestamptz not null default now()
);

ALTER TABLE public.pet_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_documents: select own" ON public.pet_documents;
CREATE POLICY "pet_documents: select own" ON public.pet_documents
  FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "pet_documents: insert own" ON public.pet_documents;
CREATE POLICY "pet_documents: insert own" ON public.pet_documents
  FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "pet_documents: update own" ON public.pet_documents;
CREATE POLICY "pet_documents: update own" ON public.pet_documents
  FOR UPDATE USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "pet_documents: delete own" ON public.pet_documents;
CREATE POLICY "pet_documents: delete own" ON public.pet_documents
  FOR DELETE USING (customer_id = auth.uid());

CREATE INDEX IF NOT EXISTS pet_documents_customer_idx ON public.pet_documents(customer_id);
CREATE INDEX IF NOT EXISTS pet_documents_pet_idx      ON public.pet_documents(pet_id);

-- Storage bucket (public, same convention as pet-photos: path-based
-- access control rather than signed URLs).
INSERT INTO storage.buckets (id, name, public)
  VALUES ('pet-documents', 'pet-documents', true)
  ON CONFLICT (id) DO NOTHING;

-- Path convention: {customer_id}/{pet_id_or_unsorted}/{timestamp}.{ext}
DROP POLICY IF EXISTS "pet-documents: upload own" ON storage.objects;
CREATE POLICY "pet-documents: upload own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pet-documents' AND
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "pet-documents: read own" ON storage.objects;
CREATE POLICY "pet-documents: read own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-documents' AND
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "pet-documents: update own" ON storage.objects;
CREATE POLICY "pet-documents: update own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pet-documents' AND
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "pet-documents: delete own" ON storage.objects;
CREATE POLICY "pet-documents: delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pet-documents' AND
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );
