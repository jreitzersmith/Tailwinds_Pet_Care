-- ============================================================
-- Migration 019: Multi-Pet Document Links
-- Replaces pet_documents.pet_id (single, nullable) with a proper
-- many-to-many join table, so one document (e.g. a shared vet visit
-- receipt or household insurance policy) can cover multiple pets.
-- pet_documents table had 0 rows in production at the time of this
-- migration, so no backfill is needed.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pet_document_links (
  document_id uuid NOT NULL REFERENCES public.pet_documents(id) ON DELETE CASCADE,
  pet_id      uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  linked_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, pet_id)
);

ALTER TABLE public.pet_document_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_document_links: select own" ON public.pet_document_links;
CREATE POLICY "pet_document_links: select own" ON public.pet_document_links
  FOR SELECT USING (
    document_id IN (SELECT id FROM public.pet_documents WHERE customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "pet_document_links: insert own" ON public.pet_document_links;
CREATE POLICY "pet_document_links: insert own" ON public.pet_document_links
  FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM public.pet_documents WHERE customer_id = auth.uid())
    AND pet_id IN (SELECT id FROM public.pets WHERE customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "pet_document_links: delete own" ON public.pet_document_links;
CREATE POLICY "pet_document_links: delete own" ON public.pet_document_links
  FOR DELETE USING (
    document_id IN (SELECT id FROM public.pet_documents WHERE customer_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS pet_document_links_pet_idx ON public.pet_document_links(pet_id);

-- Drop the now-superseded single-pet column.
ALTER TABLE public.pet_documents DROP COLUMN IF EXISTS pet_id;
