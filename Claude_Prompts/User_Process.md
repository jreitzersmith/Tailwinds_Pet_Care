# TailwindsPetCare — User Session Guide

## Starting a session

Your first message should include:
1. The item list (e.g., FR#1, FR#2, FR#7)
2. One-sentence done criterion per item
3. Any known dependencies
4. Any context not already in the project files

Then stop. Let Claude do session setup (Phase 1) before continuing.

---

## Key reminders

**Vite build target:** Always `/tmp/tailwinds-build` — never the FUSE mount path.
```bash
npx vite build --outDir /tmp/tailwinds-build --emptyOutDir
```

**File edits:** Never use Cowork Edit tool. See `File_Editing_Rules.md`.

**Secrets:** Never commit `.env`. It's in `.gitignore`. Fill Supabase keys from:
`https://supabase.com/dashboard/project/_/settings/api`

**Google Maps key:** Restrict to `tailwindspetcare.com` in GCP console before going live.

**Square/PayPal:** Phase 3 only — use `VITE_SQUARE_ENV=sandbox` for all testing.

---

## Service account email

`api@tailwindspetcare.com` — used for third-party service registrations (Supabase, Square, Google Cloud, etc.)

---

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Marketing site (FR#1–FR#8) | ✅ Complete |
| 2 | Auth + Booking (FR#9–FR#13) | ⏸ Deferred |
| 3 | Payments (FR#14–FR#16) | ⏸ Deferred |