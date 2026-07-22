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

## 2026-07-21 — Mobile responsiveness WO-A (critical nav/booking blockers)

Implements MR-1 through MR-8 from `WorkOrder_2026-07-21.md` / Issue#1 [GH#1]. New breakpoint system in `index.css`: phone tier `max-width: 480px` (Galaxy S23 Ultra portrait = 412px CSS width, plus headroom) and tablet tier `max-width: 834px` (iPad Pro 11" portrait = 834px CSS width exactly) — chosen from the owner's own devices per explicit request. Viewport-relative elements (fixed overlays) use the tablet tier; elements inside the 760px-capped portal container only need the phone tier, since the container already caps width below 834px.

- `index.css`: `.nav-hamburger` gets a 44×44px min tap target; `.nav-links li a/button` become full-width/full-height block elements in the mobile menu instead of just the inline text (MR-5, MR-6). New `.tutorial-panel`/`.tutorial-minbtn` rules relocate the booking tutorial overlay to bottom-left on tablet/phone widths so it never sits on top of a step's right-aligned Continue/Confirm button (MR-1). New `.pm-expanded-wrap`/`.pm-row3` rules collapse PetManager's 2/3-column grids to 1 column at phone width (MR-4).
- `TutorialOverlay.jsx`: added `tutorial-panel`/`tutorial-minbtn` classNames; now defaults to minimized on phone-width screens on mount so it never opens directly over a CTA (MR-1).
- `ServiceStep.jsx`: `SlotGrid` checkboxes enlarged 15px → 22px with more cell padding — day/shift selection was nearly untappable on a phone (MR-2, partial MR-7; the table + horizontal-scroll structure itself is unchanged, a full stacked-accordion redesign is deferred as out of scope for a critical-fix pass).
- `PortalPage.jsx`: tab bar (`styles.tabs`) scrolls horizontally instead of overflowing/wrapping when all 5 tabs don't fit a phone screen (MR-3).
- `PetManager.jsx`: added `pm-expanded-wrap`/`pm-row3` classNames at the 4 usage sites (expanded pet card; allergy, vaccination, and walk-entry rows) (MR-4).
- `InvoicesList.jsx`: `LineItemsTable` wrapped in a scrollable div (new `lineTableScroll` style) so a long invoice scrolls horizontally inside its card instead of breaking page layout (MR-8).
- Build verified green (`npm run build`, 2.72s, no errors). `npx vitest run` reports no test files — pre-existing repo state (see Backlog CQ-3), not a regression from this change.
- Manual mobile test still pending — see Backlog `MR-T1` / Issue#1 [GH#1]; testing checklist widget provided to the user for Galaxy S23 Ultra and iPad Pro 11" viewport widths.

## 2026-07-21/22 — Mobile responsiveness follow-up fixes (post WO-A)

Four user-reported/self-identified follow-ups to WO-A, same root-cause bug class: browsers give grid/flex items a default `min-width: auto`, letting a `<select>`/`<input>` refuse to shrink below its content's intrinsic width and overflow its column instead of scrolling/wrapping. Fix pattern used throughout: `minWidth: 0` on the shared label/wrapper style + `width: 100%, minWidth: 0, boxSizing: border-box` on the shared input/select style (root-cause fix), plus a dedicated `!important` CSS class hooked into the phone-width (`max-width: 480px`) 1-column collapse rule in `index.css` (UX improvement).

- `33c75e6` — **PetManager.jsx "Edit Pet" overflow**: `formGrid` (Name/Species/Breed/Weight/Age/Microchip/Notes) had the same bug WO-A's `pm-expanded-wrap`/`pm-row3` fixed elsewhere in the file but this usage site was missed by the original audit. Added `minWidth: 0`/`width: 100%` to shared `st.label`/`st.input`, plus new `pm-form-grid` collapse class.
- `fec411a` — **AccountSettings.jsx overflow + rename**: same bug in `s.grid` (Contact Info, Preferred Vet, Emergency Vet, Emergency Contact sections) — added `minWidth: 0`/`width: 100%` to shared `s.label`/`s.input`/`s.select`, plus new `acct-grid` collapse class. Also renamed the portal tab label from "Account" to "My Info" (`PortalPage.jsx` `TABS` array) per user request.
- `0d51c89` — **GuidedSetup.jsx fix + PetStep.jsx audit**: proactive codebase-wide grep for `gridTemplateColumns` after finding the AccountSettings bug surfaced `GuidedSetup.jsx`'s `s.row2` (Species/Breed pair in the new-customer wizard) with the same bug — fixed with the same two-part pattern + new `guided-row2` class. `PetStep.jsx` was also audited and found to already be correctly built (`fieldGroup` already had `minWidth: 0`, inputs already had `width: 100%`/`boxSizing: border-box`) — only added a `petstep-row2` collapse class across all 11 `row2` usages for cosmetic phone-width stacking (maps to pre-existing backlog MR-16, not a bug fix). `PetPassportPage.jsx`'s `vetGrid` was also checked and found not affected — it renders read-only text, not form inputs.
- `06d9cde` — **Portal tab reorder**: `PortalPage.jsx` `TABS` array and content render block reordered from (Upcoming, Past Bookings, My Pets, Invoices, My Info) to **My Info, My Pets, Upcoming, Past Bookings, Invoices** per user request. `PetManager.jsx`'s `goToBooking()` (the "View" link on a pet's past-visit row) had hardcoded tab indices that had to move in lockstep — updated `onSelectTab(isPast ? 1 : 0)` → `onSelectTab(isPast ? 3 : 2)` with a comment documenting the mapping.
- Build verified green after each commit. `npx vitest run` still reports no test files — pre-existing repo state (Backlog CQ-3), not a regression.
- Manual mobile test of WO-A + all 4 follow-ups still pending — Backlog `MR-T1` / Issue#1 [GH#1] remain open.
