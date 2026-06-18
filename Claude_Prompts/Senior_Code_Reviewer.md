# TailwindsPetCare — Senior Code Review Prompt

## Before you begin

1. Read `CLAUDE.md` for the project brief, tech stack, and branching model.
2. Read `Claude_Prompts/Code_Standards.md` for coding standards.
3. Run: `npx vitest run` — record test count and pass/fail state.

---

## Known project conventions — do not flag these

- **Inline styles throughout** — if the project uses inline styles by design, do not flag absence of CSS as an issue.
- **No TypeScript** — flag missing PropTypes but do not flag absence of TypeScript.
- **Feature-based structure** — code organized under `src/features/<feature>/` is intentional.
- **Functional components and hooks only** — flag any class component as a violation.
- **Colors from COLORS constant** — hardcoded hex values ARE a violation; reference to `COLORS` from `constants.jsx` is correct.

---

## Universal criteria (score 1–5 each)

### 1. Readability
- Semantic naming? Consistent formatting? Comments explain *why*?

### 2. Single responsibility
- Each function/component does exactly one thing? Describable without "and"?

### 3. DRY
- Repeated logic extracted? Constants defined once and referenced everywhere?

### 4. Error handling
- All error paths handled? No silent failures?

### 5. Code hygiene
- No commented-out code, unresolved TODOs, unused vars/imports, or console.logs?

### 6. Documentation
- Non-obvious decisions explained? Public functions have comment-based help?

### 7. Security
- No credentials in source? No unsanitized user input? Anon key only in frontend?

### 8. Project health
- Linter/analyzer result; test suite result (`npx vitest run`); stale files?

---

## React-specific criteria (score 1–5 each)

### R1. Component design
- Components focused and under 400–600 lines? Clear presentational/container separation?
- Props minimal, purposeful, and validated with PropTypes? No class components?

### R2. Hooks usage
- Stateful logic extracted into named custom hooks?
- `useEffect` dependency arrays complete and accurate?
- State kept as local as possible?

### R3. Performance
- All list renderings use stable, unique key props?
- `useMemo` / `useCallback` used appropriately?
- Large components lazy-loaded via `React.lazy` / `Suspense`?

### R4. Data flow
- Data flowing down via props, events up via callbacks?
- Prop drilling beyond 2–3 levels avoided?
- Side effects inside `useEffect` or custom hooks — never in the render body?

### R5. Error handling
- Major UI sections wrapped in Error Boundaries?
- Async operations explicitly handle loading, success, and error states?
- Meaningful fallback UIs?

### R6. Test coverage
- New pure functions and custom hooks tested?
- Tests co-located in the feature folder?
- `npx vitest run` passes with no regressions?
- Report: `N tests passing, M failing` (or "no tests exist")

---

## Output format

| # | Criterion | Score |
|---|---|---|
| 1 | Readability | N/5 |
| 2 | Single responsibility | N/5 |
| 3 | DRY | N/5 |
| 4 | Error handling | N/5 |
| 5 | Code hygiene | N/5 |
| 6 | Documentation | N/5 |
| 7 | Security | N/5 |
| 8 | Project health | N/5 |
| R1 | Component design | N/5 |
| R2 | Hooks usage | N/5 |
| R3 | Performance | N/5 |
| R4 | Data flow | N/5 |
| R5 | Error handling (React) | N/5 |
| R6 | Test coverage | N/5 |

**OVERALL: NN/70** (14 criteria × 5)

### Top 3 priorities

```
- [ ] CQ#N — <file/area> — <specific finding and recommended fix>
- [ ] CQ#N — <file/area> — <specific finding and recommended fix>
- [ ] CQ#N — <file/area> — <specific finding and recommended fix>
```
