# TailwindsPetCare — Code Standards

## General principles

- Name variables, functions, and components semantically — never `data`, `item`, `comp`, `thing`
- Consistent formatting: 2-space indentation, single quotes, semicolons
- Comments explain *why*, never *what*
- Every function and component does exactly one thing
- Prefer pure functions: same input → same output
- Never mix business logic with rendering logic
- Never duplicate logic — extract into utility functions or custom hooks

---

## React-specific rules

**Components**
- Keep components short — above 400–600 lines, split
- Separate presentational components (UI only) from container components (data, state, logic)
- Props: minimal, purposeful; no more than 4–5 per component
- No class components — functional components and hooks only
- PropTypes required on all components

**Hooks**
- Extract reusable stateful logic into named custom hooks (`useFetchUser`, `useFormValidation`)
- Complete and accurate dependency arrays in `useEffect` — never suppress `exhaustive-deps`
- State as local as possible; only lift when genuinely necessary
- No global state for data only one component needs

**Performance**
- Stable, unique key prop on every list rendering — never array index on dynamic lists
- `useMemo` for expensive computations
- `useCallback` for functions passed as props to child components
- Lazy-load non-initial components via `React.lazy` and `Suspense`

**Data flow**
- Unidirectional: data down via props, events up via callbacks
- Never mutate props or external state directly
- Prop drilling beyond 2–3 levels: introduce Context or restructure
- All side effects in `useEffect` or a custom hook — never in the render body

**Error handling**
- Wrap major UI sections in an Error Boundary
- Every async operation: handle loading, success, and error
- Meaningful fallback UI for error and loading states

---

## Supabase conventions

- **Anon key only** in frontend code (`VITE_SUPABASE_ANON_KEY`) — never expose service role key
- **RLS on every table** — no exceptions; auth-gated routes must verify via Supabase RLS, not client-side only
- **snake_case** for DB column names; **camelCase** for JS variable names — map at the data layer
- All DB operations wrapped in try/catch with user-facing error states
- Service account: `api@tailwindspetcare.com`

---

## Brand styling

- **Colors from `constants.jsx` only** — never hardcode hex values in components

```js
// src/constants.jsx — the single source of truth for brand values
export const COLORS = {
  blue:      '#68AFE6',
  red:       '#E20016',
  black:     '#000000',
  lightBlue: '#A0AFC5',
};
```

- Font stack: Lucida Bright (headers), Lucida Sans Unicode (body), Lucida Calligraphy (accent), Arial (fallback)
- Social links: Facebook, Instagram (include in Footer and Hero/CTA)

---

## File and folder structure

```
src/features/
  home/
    HeroSection.jsx
    HeroSection.test.jsx
  services/
    ServicesPage.jsx
  about/
    AboutPage.jsx
  contact/
    ContactForm.jsx
    useContactForm.js
  serviceArea/
    ServiceAreaMap.jsx
    useServiceArea.js
  auth/          (Phase 2)
  booking/       (Phase 2)
  payments/      (Phase 3)
src/components/  — shared/reusable UI only
src/hooks/       — shared custom hooks
src/utils/       — pure utility functions
```

---

## Code hygiene

- No commented-out code in final output
- No unresolved TODO comments
- Remove unused variables, imports, and dependencies before delivery
- All async functions handle errors with try/catch or `.catch()`
- No `console.log` in production code

---

## Pre-delivery checklist

- [ ] Every component has a single, describable responsibility
- [ ] No logic is duplicated
- [ ] All hooks have correct dependency arrays
- [ ] All lists have stable key props
- [ ] All async operations handle loading/success/error
- [ ] No commented-out code or stale TODOs
- [ ] Colors reference `COLORS` from `constants.jsx` — no hardcoded hex
- [ ] Props are documented with PropTypes
- [ ] No console.logs
- [ ] New pure functions and hooks have test candidates identified
