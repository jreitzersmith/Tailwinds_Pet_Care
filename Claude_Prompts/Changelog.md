# Changelog

Append a row here after every committed work order.
Format: `| Date | ID | Description | Commit |`

---

| Date       | ID    | Description                                                                                                          | Commit |
|------------|-------|----------------------------------------------------------------------------------------------------------------------|--------|
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
