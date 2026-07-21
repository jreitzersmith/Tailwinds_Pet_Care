# Work Order — Mobile Responsiveness Pass
**Date:** 2026-07-21
**Scope:** Review-only pass across the full site (marketing pages, booking flow, customer portal, auth, admin panel) to catalog mobile-responsiveness issues before any fixes are applied.
**GitHub Issue:** [#1](https://github.com/jreitzersmith/Tailwinds_Pet_Care/issues/1)

## Method

Reviewed `index.html`, `src/index.css`, and all `.jsx` files under `src/components/` and `src/features/` (49 files staged and read in full). Confirmed the project uses hand-written plain CSS + inline `style={{}}` objects — **not** the Tailwind CSS utility framework (the company name "Tailwinds" is a coincidence). `index.html`'s viewport meta tag is correct (`width=device-width, initial-scale=1.0`, no `user-scalable=no`).

`src/index.css` defines exactly **one** breakpoint sitewide: `@media (max-width: 700px)`, applied to only three things — `.nav-links`, `.footer-grid`, `.contact-layout`. Every other layout in the app (booking flow, portal, admin, most of Home/About/Services) is built from inline styles with **zero** responsive treatment — no media queries, no `clamp()`, no container queries. That's the root cause behind most findings below.

## Findings by severity

### Critical — blocks a customer from completing a core task on a phone

| ID | File / Location | Issue | Fix |
|----|------------------|-------|-----|
| MR-1 | `src/features/booking/TutorialOverlay.jsx:73-112` | Fixed `bottom:1.5rem; right:1.5rem; width:270px; zIndex:900` panel sits directly over every step's primary Continue/Confirm button (`ScheduleStep.jsx:63`, `ServiceStep.jsx:878`, `PetStep.jsx:650`, `ConfirmStep.jsx:378` are all right-aligned in the footer). A customer running the tutorial on a phone can be physically unable to tap Continue without first finding and dismissing the overlay. | Reposition/collapse the panel below ~480px width (anchor to top, or shrink to a small dismissible chip), or reserve bottom padding on the step footer equal to the panel's height so it never overlaps the CTA. |
| MR-2 | `src/features/booking/steps/ServiceStep.jsx:894` (`chk`) and `:886` (`sg.thAll`) | Day/shift-selection checkboxes are ~15px, "select all" ~28px — the core interaction of the booking flow is nearly untappable on a touchscreen. | Wrap each checkbox in a padded `<label>` for a ≥44×44px hit area; keep the visual checkbox small if desired but pad the container. |
| MR-3 | `src/features/portal/PortalPage.jsx:107-114` (`styles.tabs`) | Plain `display:flex` row of 5 tab labels (Upcoming / Past Bookings / My Pets / Invoices / Account) with no `flexWrap` or `overflowX`. On a phone this either overflows or wraps mid-word — this is the primary nav for the entire logged-in portal. | `overflowX:'auto'` + `whiteSpace:'nowrap'` per tab (scrollable strip), or collapse to a `<select>`/hamburger under ~480px. |
| MR-4 | `src/features/portal/PetManager.jsx:1184-1188` (`expandedWrap`, 2-col) and `:1284`/`833`/`976`/`1089` (`row3`, 3-col) | Photos/Visits/Documents/Weight-Log sections and Allergy/Vaccination/Walk entry rows use fixed 2- and 3-column grids. At ~375px width columns shrink to 90–150px — too narrow for date pickers and text fields; rows overlap/clip. This is the core "manage a pet" workflow. | Collapse to 1 column under ~480-600px (CSS class + media query, since these are currently inline styles). |
| MR-5 | `src/components/Nav.jsx:52-60` (hamburger) | No explicit width/height/padding on the hamburger button — actual hit area ~26×30px, below the 44×44px minimum, on the one control mobile users need to open navigation. | Add explicit `padding`/`minWidth`/`minHeight: '44px'`. |

### High

| ID | File / Location | Issue | Fix |
|----|------------------|-------|-----|
| MR-6 | `src/components/Nav.jsx:62-89` | Mobile menu `<li>` is `width:100%` but the `NavLink`/button inside isn't `display:block; width:100%` — only the text registers taps, not the full visual row. | Add `display:block; width:100%` to the link/button style. |
| MR-7 | `src/features/booking/steps/ServiceStep.jsx:884-888` | Multi-day schedule table needs horizontal scroll (correctly wrapped in `overflowX:auto`) but combined with MR-2's tiny checkboxes, it's a poor mobile experience. | On narrow viewports, consider a stacked per-date accordion instead of a wide table. |
| MR-8 | `src/features/portal/InvoicesList.jsx:138-169` (`LineItemsTable`) | Real `<table>` with no `overflowX:auto` wrapper — long service descriptions + 3 numeric columns can force the whole invoice card into horizontal scroll on the pay screen. | Wrap in `overflowX:auto`, or stack description/amount as rows below a breakpoint. |
| MR-9 | `src/features/about/AboutPage.jsx:85-93` (`insuranceRowStyle`) | Inline `gridTemplateColumns:'1fr 1fr'` with no media query at all (unlike Contact's grid, which at least has a class hook). At 375px, labels/values get crushed into a 2-column mess. | Give it a class name; add `@media (max-width:700px){grid-template-columns:1fr}` to `index.css`. |
| MR-10 | `src/features/contact/ContactPage.jsx:222,236` | Two nested inline 2-col grids (Email/Phone, Pet Type/Service) are **not** covered by the existing `.contact-layout` media rule that fixes the outer split. | Add a class + collapse to 1fr under 700px alongside the existing rule. |

### Medium

| ID | File / Location | Issue | Fix |
|----|------------------|-------|-----|
| MR-11 | `src/features/serviceArea/ServiceAreaPage.jsx:163-173` | Map container fixed `height:480px` regardless of viewport height — forces excess scroll on short mobile viewports. | Use a responsive height (`clamp()` or a smaller fixed height under a breakpoint). |
| MR-12 | `ServiceAreaPage.jsx` (`toggleBtnStyle` ~200-211) | Legend/toggle buttons ~27px tall. | Increase padding to reach ~44px. |
| MR-13 | `src/features/services/ServiceCard.jsx:91-104` | Lightbox close button and prev/next chevrons ~25.6px. | Increase to ≥44px hit area (padding, not just glyph size). |
| MR-14 | `src/features/home/HeroSection.jsx` | Fixed `logoStyle.height:140px` + `minHeight:90vh`, no `clamp()`/media query (unlike surrounding text). Can push CTAs below the fold on short mobile viewports. | Use `clamp()` for logo height as done elsewhere on the page. |
| MR-15 | `src/components/Footer.jsx:23-29` | Stacked footer links ~24px clickable height. | Add vertical padding to reach ~44px. |
| MR-16 | `src/features/booking/steps/PetStep.jsx:612` (`row2`) | Fixed 2-col grid for every field pair (Name/Species, Breed/Age, Weight/Notes, all diet/walk/med sub-entries) with no breakpoint. | Collapse to 1 column under ~420px. |
| MR-17 | `src/features/booking/steps/ScheduleStep.jsx:81` | Date row (`flex`, no `flexWrap`) squeezes two native date inputs to ~130px each at 375px. | Add `flexWrap:'wrap'`. |
| MR-18 | `src/features/payments/PayNowButton.jsx:259` (`methodBtn`) | Card/Google Pay/PayPal selector buttons ~28px tall — a core payment-flow control. | Increase to ≥44px. |
| MR-19 | `src/features/portal/AccountSettings.jsx:317` | Fixed 2-col grid for Contact Info, Preferred Vet, Emergency Vet, Emergency Contact — cramped at 375px. | Collapse to 1 column under a breakpoint. |
| MR-20 | `src/features/portal/PetManager.jsx:1287` (`dayBtn`) | 7 walking-schedule day-toggle buttons in a row, ~24px tall each. | Increase padding; consider wrapping to 2 rows on narrow screens. |
| MR-21 | `src/features/portal/GuidedSetup.jsx:224-230` (`choiceRow`) | Two onboarding choice cards side-by-side get cramped (~110-130px each) at 320-375px, though they don't overflow. | Stack vertically under ~400px. |
| MR-22 | `src/features/auth/LoginPage.jsx:148-157`, `SignupPage.jsx:138-143` (`oauthBtn`) | OAuth buttons ~38px tall — under the 44px minimum. | Bump padding or set `minHeight:44px`. |
| MR-23 | `LoginPage.jsx`/`SignupPage.jsx` (`oauthRow`) | 3-across Google/Facebook/Apple buttons get tight (~80px each) at 320px (iPhone SE) — risk of text wrap/clipping. | Stack vertically below ~360px, or shrink font/padding responsively. |

### Low / Polish

| ID | File / Location | Issue |
|----|------------------|-------|
| MR-24 | `LoginPage.jsx`/`SignupPage.jsx` `primaryBtn` | ~43px height, just under the 44px guideline — minor. |
| MR-25 | Admin: `AdminBookingsPanel.jsx` `LineItemsTable` (~169), `InvoiceReviewModal.jsx` (30/60), `AdminInvoicesPanel.jsx` (114), `AdminSettingsPanel.jsx` (377) | Plain `<table>`s with no `overflowX:auto` wrapper. Owner-facing, lower priority, but flagged in case the owner checks invoices from a phone. |
| MR-26 | `AdminCalendarPanel.jsx:708,737` | 7-column calendar grid (`repeat(7,1fr)`) shrinks but becomes unusably tiny at phone widths; no agenda/list fallback. |
| MR-27 | `AdminCustomersPanel.jsx:266`, `AdminBookingsPanel.jsx:686` | Fixed 130-140px label-column grids crowd the value column on narrow screens. |

## What's already working well (no action needed)

- `index.html` viewport meta tag is correct.
- Auth page cards (`Login/Signup/Reset/UpdatePassword`) use `width:100%, maxWidth:420px` — scale correctly, no overflow.
- Auth inputs use 16px font, avoiding the iOS Safari input-focus auto-zoom bug.
- `Nav.jsx` already has genuine hamburger-toggle infrastructure at the 700px breakpoint — it just needs the tap-target fixes above (MR-5, MR-6), not a rebuild.
- `ServicesPage.jsx` grid uses `repeat(auto-fill, minmax(280px,1fr))` — properly responsive.
- `AddressSearch.jsx` form uses `flexWrap` — reflows correctly.
- `ConfirmStep.jsx` summary is a flex layout, not a fixed table — reflows fine.
- `AdminBookingsPanel.jsx`'s `VisitScheduleTable` (~line 120) is correctly wrapped in `overflowX:auto` — a good pattern worth replicating on the other admin tables (MR-25).
- No hover-only interactions found anywhere — all controls use `onClick`, which works on touch.

## Recommended approach for the fix pass

1. **Add a second breakpoint** (~480px, for small phones) to `src/index.css` alongside the existing 700px one — most inline-grid fixes just need `grid-template-columns:1fr` under that width.
2. Since the codebase's convention is inline `style={{}}` objects rather than CSS classes, the cleanest fix for grids that need to respond is either (a) give them a class name that hooks into `index.css` media queries, matching the existing `.contact-layout`/`.nav-links`/`.footer-grid` pattern, or (b) add a small shared `useMediaQuery` hook if more components need conditional inline styles. Recommend (a) for consistency with what's already there.
3. Define a shared `TAP_TARGET_MIN = '44px'`-style constant in `constants.jsx` for reuse across the many undersized-button fixes (MR-5, MR-13, MR-15, MR-18, MR-20, MR-22, MR-24).
4. Fix order suggestion, in three work orders:
   - **WO-A (Critical nav/booking blockers):** MR-1 through MR-8 — these can actively prevent a phone user from completing a booking or navigating the portal.
   - **WO-B (Portal & forms):** MR-9, MR-10, MR-16, MR-17, MR-19, MR-21, MR-22, MR-23 — cramped forms and grids across Contact/About/PetStep/AccountSettings/GuidedSetup/auth.
   - **WO-C (Polish + admin):** MR-11 through MR-15, MR-18, MR-20, MR-24 through MR-27 — tap-target sizing, map/logo sizing, and admin-panel scroll wrappers.

Each work order should follow the normal Phase 3/4 process (exact old/new strings, build + `npx vitest run`, manual mobile testing checklist) before commit.
