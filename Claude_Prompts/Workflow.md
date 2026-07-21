# TailwindsPetCare — AI Pair Programming Workflow

**Project:** `C:\Programming_Projects\Tailswinds_Pet_Care`

Read `CLAUDE.md` at session start. Read `Claude_Prompts/Code_Standards.md` before writing or reviewing any code. Read the memory index and any `feedback_*.md` files listed there before starting any session.

---

## Phase 1 — Session Setup

At the start of every session, before any planning or execution:

1. Check whether `mcp__remote-devices__desktop-commander__*` tools are available (the Claude desktop app is connected this session). If so, **prefer them for all git/build/deploy operations this session** — they run natively on the user's Windows machine with real internet access, avoiding the FUSE mount entirely. See `Claude_Prompts/File_Editing_Rules.md`'s "Preferred Method" section. Only fall back to the FUSE-bridge workarounds elsewhere in that document if desktop-commander isn't available.
2. Read `Claude_Prompts/Backlog.md`.
3. Read `Claude_Prompts/Changelog.md` (tail is sufficient if long).
4. Read `CLAUDE.md`.
5. Read any `feedback_*.md` files listed in the memory index.
6. Check for `vite.config.js.timestamp-*.mjs` in the project root. If 5 or more exist, delete them:
   ```
   Remove-Item "C:\Programming_Projects\Tailswinds_Pet_Care\vite.config.js.timestamp-*.mjs" -Force
   ```

Do not read source files yet. Source files are read during the planning turn.

---

## Phase 2 — Triage and Scoping

**Risk classification:**
- **Low** — doc edits, config value tweaks, isolated utility changes with test coverage
- **Medium** — new functions/components, edits touching multiple files, any shared config
- **High** — core flow changes, auth changes, schema changes, edits in uncovered regions

**React-specific risk flags:**

| Region | Risk | Reason |
|---|---|---|
| App.jsx edits in uncovered regions | High | str.replace failures are silent |
| constants.jsx or supabase.js changes | Medium-High | Shared by all components |
| New useEffect with dependency array | Medium | Infinite loops / stale closures |
| Component above 400–600 lines | Medium | Should be split before adding |
| Any auth flow changes | High | Session loss affects all users |
| Schema changes (Supabase) | High | Requires migration + field mapper updates |

State dependencies explicitly. Ask one clarifying question if scope is ambiguous.

---

## Phase 3 — Planning Turn

Read all relevant source files in this turn. Capture exact replacement strings now.

Produce the plan in a single response containing:
- For each item: what changes, in which files, with exact old/new strings
- Dependencies: which items must land before others
- Risk flags and HALT conditions
- Manual testing checklist per item
- Commit message template per item

**Work order variant:** If scope is 3+ well-defined independent items, save as `Claude_Prompts/WorkOrder_YYYY-MM-DD.md`.

---

## Phase 4 — Execution

Apply changes in dependency order. For each item:

1. Apply the change.
2. **If `constants.jsx` (or equivalent) was touched, syntax-check first:**
   ```bash
   node -e "require('./src/constants.jsx')" 2>&1 | grep -i "syntaxerror" && echo "SYNTAX ERROR" || echo "OK"
   ```
   If SYNTAX ERROR: stop and fix before building.
3. **Run the Vite build:**
   - **With desktop-commander (preferred):** build straight to the normal output dir — `npm run build` (outputs to `dist/`). No `/tmp` workaround needed; there's no FUSE mount in the way when running natively.
   - **FUSE-bridge fallback only** (desktop-commander unavailable):
     ```bash
     npx vite build --outDir /tmp/tailwinds-build --emptyOutDir
     ```
     **Important:** in this fallback mode, always build to `/tmp/` — never the FUSE mount path (EPERM on unlink).
4. Do not proceed to the next item until the build is green.
5. After all items: `npx vitest run`. Do not commit until both build and tests pass.

**Build failure:** diagnose, one fix attempt, rebuild. If still failing, stop and report.

**str.replace failure:** stop immediately, log which replacement failed, do not proceed in the same file.

---

## Phase 5 — Testing Guidance

After all changes, provide a specific manual testing checklist. Always render as a widget using `mcp__visualize__show_widget`.

**React-specific checklist items:**
- Component renders without crashing
- State changes update UI (data flows down, events up)
- API calls succeed and show response (or meaningful error)
- Loading/error/empty states all render correctly
- List items render with correct data and stable keys (no React key warnings)
- Navigation/routing works: back/forward, direct URL
- No unhandled promise rejections in console
- No "each child should have a unique key" React warnings

**Widget requirements:**
- State button per item cycling: `—` → Pass → Fail → Skip → Note
- Per-item notes textarea for Fail/Skip/Note states
- Overall notes textarea below all items
- Right-aligned Submit button calling `sendPrompt()` with all states and notes
- Build UI with `document.createElement` (not innerHTML) to prevent textarea value loss

---

## Phase 6 — Feedback and Iteration

1. Read the failure report.
2. Diagnose only failed items.
3. Propose one specific fix per failure.
4. Get explicit approval before applying.
5. Apply, re-validate, provide targeted re-test steps for that failure only.
6. Passing validation after a fix is not sufficient — explicit re-confirmation required.
7. Do not commit until all checklist items confirmed passing (or accepted as Skip/Note).

---

## Phase 7 — Commit

**With desktop-commander (preferred):** run `git add` / `git commit` / `git push` directly via `start_process` (native — no FUSE `.git/index.lock` EPERM issue). The GitHub-API-PUT workaround in `File_Editing_Rules.md` is only needed as a FUSE-bridge fallback when desktop-commander isn't available.

Use `mcp__git__git_commit`:

```
feat: short description

- Bullet explaining change 1
- Bullet explaining change 2
- Closes Issue#N [GH#N]
```

After committing:
1. Delete resolved item from `Backlog.md`.
2. Append row to `Changelog.md` (date · type · # · GH# · name · commit hash).
3. Post test results to GitHub issue via `mcp__github__add_issue_comment`.
4. Close issue via `mcp__github__update_issue` with `state: closed`.
5. Confirm Last used numbers line in `Backlog.md` is current.
6. Move Skip items to Deferred Testing Scenarios in `Backlog.md`.
7. Push (if not already pushed in the commit step above): `git -C "C:\Programming_Projects\Tailswinds_Pet_Care" push origin main`

---

## Phase 8 — Documentation

Update `CLAUDE.md` if:
- Tech stack changed (new dependency, new service)
- New file type or directory added
- A new important convention was established
- Any feature a user would notice as new or changed

Do not update docs speculatively.

---

## Session behavior

- Do not ask for confirmation on individual steps covered in an approved plan.
- Ask for go-ahead only when: scope changed unexpectedly, a HALT condition triggered, or a decision requires user judgment.
- If you can proceed with a reasonable assumption, state it and proceed.
- Produce the complete plan in a single response.
- Read all relevant source files once at the start of planning. Do not re-read mid-session unless a file was edited.