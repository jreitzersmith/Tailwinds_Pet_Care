# TailwindsPetCare — Backlog

<!-- Last used numbers: Issue#0 · FR#16 · CQ#0 -->

## Categories

| Category | Number format | Use when |
|---|---|---|
| Known Issues | `Issue#x` | Bug or broken behaviour |
| Code quality | `CQ#x` | Component size, test coverage, architecture |
| Feature requests | `FR#x` | New capability or enhancement |

## Format

On new entry: file a GitHub issue immediately. Record GH# and date:
```
- [ ] Issue#1 [GH#N] (YYYY-MM-DD) — description
```

---

## Known Issues

<!-- Active bugs — delete line when resolved; append row to Changelog.md -->

---

## Feature Requests / Enhancements

### Phase 1 — Marketing Site

- [ ] FR#1 (2026-06-18) — Vite project init: scaffold React/Vite, install deps, configure vite.config.js
- [ ] FR#2 (2026-06-18) — Home/Hero section: logo, tagline, CTA, social links (Facebook, Instagram)
- [ ] FR#3 (2026-06-18) — Services page: list all service types, descriptions, base pricing
- [ ] FR#4 (2026-06-18) — About page: company story, owner bio, pets served, target market
- [ ] FR#5 (2026-06-18) — Contact section: phone, address, inquiry form
- [ ] FR#6 (2026-06-18) — Service Area map: Google Maps with pricing zones by distance from 2500 South Blvd
- [ ] FR#7 (2026-06-18) — Global nav, footer, responsive layout, brand styling throughout
- [ ] FR#8 (2026-06-18) — Infrastructure: nginx vhost + DNS A records + Let's Encrypt cert for tailwindspetcare.com

### Phase 2 — Auth + Booking (deferred)

- [ ] FR#9 (2026-06-18) — Supabase schema: customers, bookings, services, pets tables with RLS
- [ ] FR#10 (2026-06-18) — Customer auth: signup, login, logout, password reset
- [ ] FR#11 (2026-06-18) — Booking flow: service selection, date/time, pet details, confirmation
- [ ] FR#12 (2026-06-18) — Customer portal: view/cancel bookings, history
- [ ] FR#13 (2026-06-18) — Distance-based pricing auto-calculation from 2500 South Blvd

### Phase 3 — Payments (deferred)

- [ ] FR#14 (2026-06-18) — Square embedded checkout
- [ ] FR#15 (2026-06-18) — PayPal checkout
- [ ] FR#16 (2026-06-18) — Google Pay

---

## Code Quality

<!-- Refactoring and standards work -->

---

## Deferred Testing Scenarios

<!-- Items submitted as Skip during testing — include the condition needed to test -->
