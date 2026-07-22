# Backlog

Items grouped by category and priority (P1 = next up, P2 = soon, P3 = deferred).
Delete a row when its work order is committed. Append new items at the bottom of the relevant section.

---

## Business

| ID    | Priority | Title                                 | Notes                                                                                     |
|-------|----------|----------------------------------------|--------------------------------------------------------------------------------------------|
| BIZ-1 | P1       | Confirm SoS filing "Processed"        | SOSDirect doc 1598115070003 shows "Received" — verify it advanced to "Processed"          |
| BIZ-2 | P1       | Open business bank account            | EIN 42-3224280 ready; use exact legal name "Tailwinds Pet Care, L.L.C"                   |
| BIZ-3 | P2       | File annual Texas Franchise Tax report| Informational only; $0 owed below ~$2.47M; first report due May 2027                     |
| BIZ-4 | P3       | Trademark search (USPTO + Texas)      | Deferred until business generates revenue                                                 |

---

## Website — Build & Deploy

| ID    | Priority | Title                                     | Notes                                                                                                                          |
|-------|----------|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| DEP-1 | P1       | Deploy `send-invoice-email` edge function | `supabase functions deploy send-invoice-email`; reuses existing GMAIL_APP_PASSWORD secret — status unconfirmed as of 2026-07-21, verify it's actually live before assuming so |
| DEP-2 | P1       | Fix Square payment config                 | `VITE_SQUARE_LOCATION_ID_*` currently holds an access token, not a Location ID — need the real Location ID + move the access token to a server-side secret before leaving sandbox mode |
| DEP-3 | P2       | Get a Twilio phone number                 | Needed to activate SMS vaccination reminders (`reminder-vaccinations` / `sms-webhook` edge functions, built 2026-07-12) — code is ready, just needs the number |

---

## Website — Phase 1 (Marketing)

| ID   | Priority | Title                                  | Notes                                                                                    |
|------|----------|------------------------------------------|--------------------------------------------------------------------------------------------|
| FR-4 | P1       | HomePage: add sections below Hero      | Currently only renders HeroSection — add services preview and trust/social-proof section |
| FR-5 | P2       | Contact form: confirm submission target| useContactForm.js exists; verify submissions reach petsitter@tailwindspetcare.com         |
| FR-6 | P2       | Verify ServiceArea map in production   | Google Maps API key must be set in server .env; test zone lookup end-to-end              |

---

## Website — Phase 2 (Auth / Booking / Portal)

| ID   | Priority | Title                                  | Notes                                                                                    |
|------|----------|------------------------------------------|--------------------------------------------------------------------------------------------|
| FR-7 | P1       | Booking flow smoke test                | Login → /book → all 4 steps → confirm write to Supabase                                  |
| FR-8 | P1       | Portal smoke test                      | PortalPage, BookingsList, PetManager — test against live Supabase                        |
| FR-9 | P1       | FR#17-21 smoke test                    | Account tab, GuidedSetup, enhanced pet form, tutorial overlay (?tutorial=true)              |

---

## Website — Mobile Responsiveness

**GitHub Issue:** [#1](https://github.com/jreitzersmith/Tailwinds_Pet_Care/issues/1) — full findings in `Claude_Prompts/WorkOrder_2026-07-21.md`. Codebase has exactly one CSS breakpoint sitewide (700px, index.css); nearly everything else is inline styles with no responsive treatment.

| ID    | Priority | Title                                                  | Notes                                                                                                    |
|-------|----------|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| MR-T1 | P1       | Manual mobile test — WO-A + follow-up fixes            | Implemented + committed 2026-07-21/22 (build green, no regressions). Verify on Galaxy S23 Ultra (412px) + iPad Pro 11" (834px) widths: nav hamburger/link tap targets, booking tutorial overlay position (all 4 steps), ServiceStep day/shift checkboxes, portal tab-bar scroll + new tab order (My Info, My Pets, Upcoming, Past Bookings, Invoices), PetManager expanded-card + allergy/vaccination/walk grids + Edit Pet form grid, AccountSettings form grid, GuidedSetup wizard grid, invoice line-items table scroll. Close Issue#1 [GH#1] once confirmed passing. |
| MR-B  | P2       | WO-B — Portal & forms mobile fixes (MR-9, 10, 17, 19, 21, 22, 23) | AboutPage/ContactPage grids, auth OAuth button sizing, PetManager row2/row4 (diet/medication sub-fields — same min-width:auto bug as other WO-A/follow-up fixes). Note: PetStep/AccountSettings/GuidedSetup layout (MR-16 and the overflow bug) already resolved ahead of schedule as part of the WO-A follow-up fixes.            |
| MR-C  | P3       | WO-C — Polish + admin mobile fixes (MR-11–15, 18, 20, 24–27) | Map/logo sizing, tap-target padding across Footer/ServiceCard/PayNowButton/PetManager day buttons, admin table/grid scroll wrappers |

---

## Code Quality

| ID   | Priority | Title                                  | Notes                                                                                    |
|------|----------|------------------------------------------|---------------------------------------------------------------------------------------------|
| CQ-1 | P2       | PropTypes audit — all components       | Code_Standards requires PropTypes on every component; grep for missing declarations      |
| CQ-2 | P2       | Add Error Boundaries to major sections | Wrap BookingPage, PortalPage, ServiceAreaPage at minimum                                 |
| CQ-3 | P2       | Unit tests for custom hooks            | useBookingForm, useContactForm, useZoneLookup, useLoadGoogleMaps                         |
| CQ-4 | P3       | Full senior code review                | Use Senior_Code_Reviewer.md rubric across all Phase 1 + Phase 2 components              |

---

## Phase 3 (Deferred)

| ID   | Priority | Title                                  | Notes                                                                                    |
|------|----------|------------------------------------------|---------------------------------------------------------------------------------------------|
| FR-9 | P2       | Payments: Square + PayPal + Google Pay | **Substantially built as of 2026-07-09** (PayNowButton.jsx, charge-invoice + paypal-order edge functions, admin invoice status badges) — still `VITE_SQUARE_ENV=sandbox`. Remaining before this can leave Deferred: fix Square config (see DEP-2 above) and do a full sandbox-to-production test pass. |

---

## Phase 4 — Pet Document Management

Secondary service: centralized vet record storage and tracking for pet owners, with expiration alerts. High value for airline-employee customers who travel with pets and need documentation on short notice.

**Status update (2026-07-21):** substantial groundwork shipped 2026-07-12 — general document vault (`pet_documents` table, migration 015, with `doc_type`, `expires_on`, SMS/email-intake support), pet weight logs (migration 014), and a customer-facing `PetPassportPage.jsx` (migration 016). None of that was built against these specific DM items one-for-one, so check current scope in code before assuming any item below is complete or before starting new work that might duplicate it.

### Document Types

| ID     | Priority | Title                                   | Notes                                                                                                      |
|--------|----------|--------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| DM-1   | P1       | USDA Health Certificates                | Form 7001; required for air travel; expire in 10 days — track issue date + expiration, alert before trips. The general document vault (migration 015) can store the file under `doc_type='other'`, but has no USDA-specific expiration/alert logic yet. |
| DM-2   | P1       | Expiration dashboard                    | Single view of everything expiring soon (certs, vaccines, licenses, titer tests); killer feature for frequent flyers. `pet_documents.expires_on` + the migration 018 scheduled-jobs system give the data/infra pieces, but no unified dashboard UI has been confirmed built. |
| DM-3   | P1       | Rabies Titer Tests                      | Required for intl destinations (Hawaii, UK, EU, Japan); track result date + destination applicability. Not a distinct `doc_type` yet (vault enum is vaccination/medical_record/insurance/microchip/other) — would need a schema tweak. |
| DM-5   | P2       | Airline-specific pet approvals          | Track which carriers have approved the pet, approval date, any restrictions                                |
| DM-6   | P2       | Annual wellness exam reports            | Upload PDF; AI extracts weight, vet notes, findings; track weight trend over time. **Partially built:** weight trend tracking now exists (migration 014, pet_weight_logs, 2026-07-12) — AI PDF extraction of wellness exam reports is not yet implemented. |
| DM-7   | P2       | Lab / bloodwork results                 | Upload and store; AI extracts key values + reference ranges for trend tracking                             |
| DM-8   | P2       | Dental records                          | Cleaning dates, procedure notes                                                                             |
| DM-9   | P2       | Surgical / procedure records            | Upload with discharge instructions; AI extracts procedure name and follow-up dates                        |
| DM-10  | P2       | Allergy testing results                 | Known allergens, test date, recommending vet. Structured `allergies` JSONB now exists on `pets` (migration 013, 2026-07-12: allergen/severity/notes) — this may already cover the core of this item; verify before treating as separate work. |
| DM-11  | P2       | Prescription history                    | Historical log separate from active medication list; drug name, dose, prescribing vet, date range         |
| DM-12  | P2       | Pet insurance policy + claims           | Policy number, carrier, coverage summary, claims history upload                                            |
| DM-13  | P3       | City / county license                   | License number, renewal date, issuing jurisdiction                                                         |
| DM-14  | P3       | Breed documentation                     | For restricted breeds requiring proof; jurisdiction-specific                                               |
| DM-15  | P3       | Emergency care authorization            | Who can authorize treatment while owner is traveling — critical for airline-employee customers. Emergency vet + emergency human contact fields now exist on `customers` (migration 013, 2026-07-12) — verify this satisfies the intent of this item before treating as separate work. |

**Done, removed from this list (2026-07-12):**
- ~~DM-4 — Microchip registration~~ — `pets.microchip_number` + `pets.microchip_registry` added in migration 013; the general document vault's `microchip` doc_type covers storing the papers.

### Infrastructure needed
- ~~New Supabase table: `pet_documents`~~ — ✅ built (migration 015), though as `(id, customer_id, pet_id nullable, doc_type enum, title, storage_path, url, expires_on, source, source_ref, uploaded_at)` rather than the originally-proposed `(pet_id, type, title, storage_path, url, issued_date, expires_date, metadata JSONB, created_at)` shape — no `metadata JSONB`, `pet_id` is nullable for unsorted SMS/email intake.
- Storage path — built as `{customer_id}/{pet_id_or_unsorted}/{timestamp}.{ext}` in the `pet-documents` bucket, not the originally-proposed `{user_id}/{pet_id}/docs/{type}/{filename}` — same purpose, different convention.
- Edge function `extract-pet-document` (generalized AI extraction) — **not built.** What exists instead: `email-intake`, `reminder-vaccinations`, `sms-webhook` (all 2026-07-12), plus the pre-existing `extract-vacc-record`. None of these are a generalized document-type extractor yet.
- Expiration alert system — **partially built:** migration 018 (`scheduled_jobs`) + `reminder-vaccinations` edge function cover vaccination reminders specifically. The general "anything expiring soon" alerting described here is not yet implemented — this is effectively DM-2's expiration dashboard, still open.
