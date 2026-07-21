# Changelog

Append a row here after every committed work order.
Format: `| Date | ID | Description | Commit |`

---

| Date       | ID    | Description                                                                                                          | Commit |
|------------|-------|------------------------------------------------------------------------------------------------------------------------|--------|
| 2026-06-17 | BIZ-0 | Entity: SoS name availability confirmed; Certificate of Formation filed (doc 1598115070003); EIN 42-3224280 obtained | —      |
| 2026-06-19 | BIZ-0 | Insurance: PSA policy activated — includes animal bailee/CCC and surety bond coverage                        | —      |
| 2026-06-19 | FR-0  | Scaffold: Vite + React 18; package.json; vite.config.js; index.html; constants.jsx; App.jsx routing; Layout/Nav/Footer| —      |
| 2026-06-19 | FR-0  | Phase 1 pages: HeroSection, HomePage, ServicesPage/ServiceCard/servicesData, AboutPage, ContactPage/useContactForm   | —      |
| 2026-06-19 | FR-0  | Phase 1 pages: ServiceAreaPage, AddressSearch, serviceAreaData, useLoadGoogleMaps, useZoneLookup                     | —      |
| 2026-06-19 | FR-0  | Phase 2 auth: AuthContext, LoginPage, SignupPage, ResetPasswordPage, UpdatePasswordPage, ProtectedRoute              | —      |
| 2026-06-19 | FR-0  | Phase 2 booking: BookingPage, ServiceStep, PetStep, ScheduleStep, ConfirmStep, useBookingForm                        | —      |
| 2026-06-19 | FR-0  | Phase 2 portal: PortalPage, BookingsList, BookingCard, PetManager                                                   | —      |
| 2026-06-19 | FR-0  | Supabase: supabase/migrations/001_phase2_schema.sql written; supabase.js client utility                              | —      |
| 2026-07-01 | FR-1  | Build: `npx vite build --outDir C:\tmp\tailwinds-build`; rsync via WSL to ubuntu@3.134.160.32:/var/www/tailwindspetcare/; site live at tailwindspetcare.com | —      |
| 2026-07-01 | FR-3  | Updated CLAUDE.md phase table: Phase 1 ✅ Complete, Phase 2 ✅ Complete, Phase 3 ⏸ Deferred                                                                 | —      |
| 2026-07-02 | FR-2  | Supabase migration applied via Management API: customers, pets, services (18 rows seeded), bookings tables + RLS + triggers | —      |
| 2026-07-02 | FR-2  | Rebuilt and redeployed with live Supabase credentials baked into bundle                                                     | —      |

## 2026-07-02 — FR#17-21: Account settings, enhanced pets, guided setup, tutorial

### FR#17 — DB migration (002_enhanced_schema.sql)
- ALTER customers: added preferred_vet_name, preferred_vet_clinic, preferred_vet_phone, preferred_vet_address, setup_completed boolean
- ALTER pets: added diet JSONB, walking_schedule JSONB, medications JSONB (default []), vaccinations JSONB (default [])
- Applied via Supabase Management API

### FR#18 — AccountSettings.jsx (new)
- src/features/portal/AccountSettings.jsx
- Service address with Google Places Autocomplete (DFW_BOUNDS bias, useLoadGoogleMaps)
- Preferred vet section: name, clinic, phone, address — saves to customers table

### FR#19 — PetManager.jsx (full rewrite)
- Form state moved into PetForm; PetManager passes onSave(formData) callback
- Required fields unchanged: name, species, breed, weight_lbs, age_years, notes
- New optional collapsible sections: Diet (type/meals/amount), Walking Schedule (days/time/duration), Medications (multi-entry list), Vaccinations (multi-entry list)
- PetCard shows diet summary + medication/vaccination count badges

### FR#20 — GuidedSetup.jsx (new)
- src/features/portal/GuidedSetup.jsx
- Modal overlay on first login when customers.setup_completed = false
- Step 0: service address (Places Autocomplete), Step 1: first pet, Step 2: booking choice
- Sets setup_completed = true in DB on completion or skip
- PortalPage.jsx: added setup_completed check, GuidedSetup render, Account tab (index 3)

### FR#21 — TutorialOverlay.jsx (new)
- src/features/booking/TutorialOverlay.jsx
- Fixed bottom-right panel with per-step guidance text for all 4 booking steps
- Minimizable; dismiss via X or Finish Tutorial button
- BookingPage.jsx: useSearchParams reads ?tutorial=true; passes currentStep to overlay

## 2026-07-02 — Bug fixes + enhanced pet form (diet schedule, walk schedule, profile image, visit links)

### Migration 003 — pet_photos.sql
- ALTER pets: added profile_image_url text
- CREATE TABLE pet_photos: id, pet_id, booking_id (nullable), storage_path, url, caption, uploaded_at
- RLS: customers can select/insert/delete photos for their own pets
- Supabase Storage: created 'pet-photos' public bucket with owner-scoped upload/update/delete policies
- Storage path convention: {user_id}/{pet_id}/profile.{ext} (profile), {user_id}/{pet_id}/{ts}.{ext} (visits)

### GuidedSetup.jsx — layout fix
- Replaced 3-column Species/Breed/Weight grid with 2-column (Species + Breed) + full-width Weight
- Fields no longer overflow the 480px modal on standard viewports

### ConfirmStep.jsx — pre-populate service address
- On mount, fetches customers.address from Supabase if booking form address is empty
- Shows "Using your saved service address" italic note when pre-populated
- Auto-triggers travel fee price resolution after prefill

### PetManager.jsx — full rewrite
- Diet: changed from single object to array of feeding entries (label / type / time / amount / notes)
  * New types: Treat, Bone/Rawhide; Other type shows notes explanation field
  * + Add Feeding button; each entry removable
- Walking: changed from single object to array of walk entries (label / days / time / duration)
  * + Add Walk button (Morning, Evening, etc.); each entry removable
  * Day checkboxes per walk entry
- Profile image upload (edit mode only): uploads to pet-photos bucket at {user}/{pet}/profile.ext, updates pets.profile_image_url
- PetCard: shows profile thumbnail (or paw icon), badge counts for diet/walk/med/vacc, expand toggle
- Expanded PetCard: photo album shell (display only — upload deferred to future sitter admin view), past visits list
- Past visits: queries bookings for pet_id, shows date/service/status, View link switches portal to correct tab
- PortalPage: passes onSelectTab={setTab} into PetManager so PetCard can navigate to Bookings tab
- toArr() helper normalizes legacy single-object diet/walking_schedule to array for backward compat

## 2026-07-02 — Free-fed / vaccination AI extraction / Phase 4 backlog

- feat: free-fed allows additional entries, vacc AI extraction via edge function (`extract-vacc-record`)
- feat: collapsible diet/walk sections, free-fed checkbox, vacc record upload, payment methods placeholder
- fix(PetManager): DietEntry 2x2 grid layout + always-visible notes field
- backlog: added Phase 4 pet document management (DM-1 through DM-15)

## 2026-07-04 — Admin panel (bookings/invoices) + FUSE stale-file fixes

- fix: modal overflow, medication frequency UI, edit-mode pricing bug
- New admin panel: AdminBookingsPanel, AdminInvoicesPanel, AdminRoute guard, `is_admin` auth check, InvoicesList portal tab
- Fixed FUSE-stale-file corruption across ServiceStep, PetManager, BookingsList, BookingPage, ConfirmStep, PetStep, useBookingForm, BookingCard; fixed AuthContext `adminReady` race condition

## 2026-07-05 — Admin panel refinements + File_Editing_Rules.md

- AdminBookingsPanel, AdminInvoicesPanel, AdminCustomersPanel (new), AdminPage updates
- Added `Claude_Prompts/File_Editing_Rules.md` documenting FUSE virtiofs workarounds

## 2026-07-06 — Invoice approval workflow

- Migration 009: `invoice_approved` status; migration 010: invoice_approved email template; migration 011: bookings edit RLS policy
- InvoiceReviewModal (new), send-invoice-email edge function, portal deep-link to invoice
- Itemized service/add-on list on admin invoice rows + customer-selected services shown to customer
- Pay button on approved invoices (portal) + service schedule grid on admin invoice rows
- Fixed booking edit slots bug; collapsible upcoming booking cards with itemized breakdown
- Fixed itemized qty×price display; synced parent/addon slot grid checkboxes (parent uncheck cascades down, addon check propagates up); fixed addon names showing as "Add-On" in confirm step during edit/copy flows

## 2026-07-09 — Booking/invoice slot-model rewrite + Square/PayPal payments

**Migration 012** (`012_booking_slot_model.sql`): `visitModel.js` becomes the source of truth for per-visit line items, replacing the old single-price-per-booking model.

- Rewrote for the slot model: `visitModel.js` (new), `useBookingForm.js`, `BookingPage.jsx`, `ConfirmStep.jsx`, `PetStep.jsx`, `ServiceStep.jsx`, `BookingsList.jsx`, `BookingCard.jsx`, `InvoicesList.jsx`, `AdminBookingsPanel.jsx`, `AdminInvoicesPanel.jsx`, `AdminInvoiceEditor.jsx`, `InvoiceReviewModal.jsx`, `AdminCalendarPanel.jsx` (new), `AdminSettingsPanel.jsx` (new — email template editor + service pricing editor), edge functions (charge-invoice / paypal-order `index.ts`)
- New payments feature: `PayNowButton.jsx` (Square + PayPal + Google Pay), `charge-invoice` and `paypal-order` edge functions
- Admin invoice status badges; invoice link + payment error surfacing across BookingsList/BookingCard/InvoicesList/PortalPage/PayNowButton
- Square fixes: idempotency_key must be ≤45 chars (switched to UUID); auto-derive location + app-mismatch diagnostics — see `reference_square_config` gotcha in project memory: `VITE_SQUARE_LOCATION_ID_*` currently holds an access token, not a location ID (still needs a real Location ID + server-side secret)
- Visit count / phone format fixes (AccountSettings.jsx, AdminBookingsPanel.jsx)

## 2026-07-12 — Pet medical records + Pet Passport (migrations 013–019)

- Extended pet medical fields: structured allergies + microchip number/registry (pets), emergency vet + emergency human contact (customers) — migration 013
- Pet document vault: `pet_documents` table with `doc_type` (vaccination/medical_record/insurance/microchip/other), `expires_on`, and SMS/email-intake support for unsorted docs — migration 015
- Pet weight log tracking — migration 014
- Pet Passport customer-facing page (`src/features/passport/PetPassportPage.jsx`) — migration 016
- Vaccination reminder email template + scheduled reminder job — migrations 017 (template), 018 (scheduled_jobs)
- Document ↔ record linking — migration 019
- New edge functions: `email-intake`, `reminder-vaccinations`, `sms-webhook`
- SMS notifications are live in code but **waiting on a Twilio phone number** before fully active — see Backlog DEP-3
- Note: this work sat uncommitted on local disk (never pushed to GitHub, never in Changelog) until the 2026-07-21 reconciliation below — production was nonetheless already running it (deployed directly around this date)

## 2026-07-21 — Local / GitHub / Lightsail reconciliation

- Local working tree had ~5 weeks of uncommitted work (everything in the 2026-07-12 entry above, plus service catalog + custom item photo updates, admin settings tweaks, and a geo zone coverage data refresh) sitting on disk since a FUSE-related `git commit` failure — committed as `041b55f`
- Merged in 5 commits GitHub had gained via the GitHub-API-push workaround that the local checkout had never fetched (`3835eb0` → `bc3138b`); 2 real conflicts (`AdminSettingsPanel.jsx`, `AccountSettings.jsx`), both resolved by keeping the local superset version
- Pushed to `origin/main`; confirmed a fresh build's asset hashes exactly match what's already live on tailwindspetcare.com — production needed no redeploy, it was already serving this code
- Discovered `mcp__remote-devices__desktop-commander__*` tools run natively on the user's Windows machine (real git/network, no FUSE) — now the preferred path for git/build/deploy; see `File_Editing_Rules.md`'s "Preferred Method" section
- Found and fixed stale `.git/*.lock(.bak)` files (from an earlier session's rename-instead-of-delete lock workaround) that were silently breaking `git fetch`/`git add`
- Updated `Workflow.md`, `File_Editing_Rules.md`, this file, and `Backlog.md` to reflect the desktop-commander discovery and to catch up on unlogged shipped work
- **Note:** none of the work in this changelog since 2026-07-04 was tracked as a GitHub Issue — the Workflow.md issue-based process (create issue → work → comment → close, `Closes Issue#N [GH#N]` in commit messages) has not actually been in use; Changelog.md has been the only record, and even it had fallen behind
