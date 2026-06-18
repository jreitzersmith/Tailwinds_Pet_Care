# TailwindsPetCare — Project Brief

**Project path:** `C:\Programming_Projects\Tailswinds_Pet_Care\tailwindspetcare.com`
**Domain:** tailwindspetcare.com
**Business:** Tailwinds Pet Care, L.L.C — pet sitting and walking services targeting airline employees (Southwest, American Airlines) in the DFW area.
**Owner:** John Reitzer-Smith
**Address:** 2500 South Blvd, Dallas, TX 75215
**EIN:** 42-3224280
**Start date:** 06/19/2026

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Auth / DB | Supabase (PostgreSQL + RLS + Auth) |
| Maps | Google Maps JavaScript API |
| Payments | Square + PayPal + Google Pay (Phase 3) |
| Hosting | nginx reverse proxy on AWS Lightsail (3.134.160.32) |
| TLS | Let's Encrypt HTTP-01 (certbot) |
| CI/CD | Local edit → validate → git push → SSH git pull + nginx -s reload |

---

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Marketing site: Home/Hero, Services, About, Contact, Service Area map, social links | 🔲 Not started |
| 2 | Auth + Booking: Supabase schema, customer login, booking flow, customer portal, distance pricing | ⏸ Deferred |
| 3 | Payments: Square, PayPal, Google Pay | ⏸ Deferred |

---

## Brand

**Colors** (always reference `COLORS` from `src/constants.jsx` — never hardcode hex):
| Name | Hex |
|---|---|
| Blue | #68AFE6 |
| Red | #E20016 |
| Black | #000000 |
| Light Blue | #A0AFC5 |

**Fonts:** Lucida Bright (headers), Lucida Sans Unicode (body), Lucida Calligraphy (accent), Arial (fallback)

**Logo:** `C:\Programming_Projects\Tailswinds_Pet_Care\Brand\Logos\Tailwinds_Logo.png` / `.svg`

**Social:** Facebook, Instagram — include in Footer and Hero/CTA

---

## Email accounts

| Address | Purpose |
|---|---|
| petsitter@tailwindspetcare.com | Primary business contact |
| webmaster@tailwindspetcare.com | Site/technical issues |
| api@tailwindspetcare.com | Service account for third-party integrations (Supabase, Square, GCP, etc.) |

---

## File structure

```
TailwindsPetCare/
├── CLAUDE.md                    ← this file
├── .env                         ← secrets (gitignored)
├── .env.example                 ← template (committed)
├── .gitignore
├── package.json                 ← created by FR#1
├── vite.config.js               ← created by FR#1
├── index.html                   ← created by FR#1
├── Claude_Prompts/
│   ├── Workflow.md
│   ├── Code_Standards.md
│   ├── Backlog.md
│   ├── Changelog.md
│   ├── Work_Order.md
│   ├── User_Process.md
│   ├── Senior_Code_Reviewer.md
│   └── File_Editing_Rules.md
├── public/
│   └── assets/                  ← logo, favicon, images
└── src/
    ├── constants.jsx            ← COLORS, FONTS, SOCIAL_LINKS, config
    ├── App.jsx
    ├── main.jsx
    ├── components/              ← shared/reusable UI
    ├── features/
    │   ├── home/
    │   ├── services/
    │   ├── about/
    │   ├── contact/
    │   ├── serviceArea/
    │   ├── auth/                ← Phase 2
    │   ├── booking/             ← Phase 2
    │   └── payments/            ← Phase 3
    ├── hooks/                   ← shared custom hooks
    └── utils/                   ← pure utility functions
```


---

## Service Zones

Travel fee pricing by distance from South Dallas base. Zone 9 is legend-only (no map circle).
Update `src/features/serviceArea/serviceAreaData.js` when fees change.

| Zone   | Distance       | Travel Fee          |
|--------|---------------|---------------------|
| Zone 1 | 0–5 miles     | None                |
| Zone 2 | 5–10 miles    | +$5                 |
| Zone 3 | 10–15 miles   | +$10                |
| Zone 4 | 15–20 miles   | +$12                |
| Zone 5 | 20–25 miles   | +$15                |
| Zone 6 | 25–30 miles   | +$17.50             |
| Zone 7 | 30–35 miles   | +$20                |
| Zone 8 | 35–40 miles   | +$25                |
| Zone 9 | 40–100 miles  | Location dependent  |
---

## Infrastructure

**Server:** AWS Lightsail, Ubuntu 24.04, IP 3.134.160.32
**Vhost path:** `/var/www/tailwindspetcare`
**Proposal:** `C:\Programming_Projects\Infrastructure\proposals\tailwinds-pet-care.yaml`

**DNS (tailwindspetcare.com — Squarespace):**
| Type | Host | Value |
|---|---|---|
| A | @ | 3.134.160.32 |
| A | www | 3.134.160.32 |

**Cert:** HTTP-01 via certbot for `tailwindspetcare.com` and `www.tailwindspetcare.com`

**Deploy:** `npx vite build --outDir /tmp/tailwinds-build --emptyOutDir` → `rsync` to server → `nginx -s reload`

---

## Critical constraints

1. **Vite build MUST target `/tmp/tailwinds-build`** — building to the FUSE mount path fails with EPERM on unlink.
2. **No secrets in repo** — `.env` is gitignored. Never commit Supabase keys, API keys, or tokens.
3. **Supabase RLS on every table** — no exceptions. Auth-gated routes must verify via Supabase RLS, not client-side only.
4. **Anon key only in frontend** — `VITE_SUPABASE_ANON_KEY`. Never expose service role key in browser code.
5. **Colors from `constants.jsx` only** — never hardcode hex values in components.
6. **Never use Cowork Edit tool** — see `Claude_Prompts/File_Editing_Rules.md`.
7. **Do NOT touch MX/SPF/DKIM/DMARC records** on reitzersmith.com.
8. **Square/PayPal in sandbox mode** (`VITE_SQUARE_ENV=sandbox`) until Phase 3 is fully tested.

---

## Supabase pattern

Same pattern as GTDWorkflowApp (`C:\Programming_Projects\GTDWorkflowApp`). Reference that project for auth flow, RLS policy examples, and client setup.

```js
// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
export default supabase
```
