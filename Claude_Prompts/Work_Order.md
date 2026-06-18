# Work Order Process

Work orders are used for batches of 3+ well-defined, independent items, or when changes need to be documented before execution begins.

Saved as `Claude_Prompts/WorkOrder_YYYY-MM-DD.md`.

---

## Work Order Format

```markdown
# Work Order — YYYY-MM-DD

## Items

### Item 1: [FR#/Issue#/CQ#] — Short title
**Risk:** Low / Medium / High
**Dependencies:** None / Item 2 must land first
**Files:** path/to/file.ext

**Change:**
File: path/to/file.ext
Old:
```
exact string to replace (with enough surrounding context lines to be unique)
```
New:
```
exact replacement string
```

**Validation:**
- node -e "require('./src/constants.jsx')" 2>&1 | grep -i "syntaxerror" && echo "SYNTAX ERROR" || echo "OK"
- npx vite build --outDir /tmp/tailwinds-build --emptyOutDir
- HALT if validation fails

**Commit message:**
```
feat: short description

- Bullet explaining change
- Closes Issue#N [GH#N]
```

**Post-commit:** Delete Issue#N from Backlog.md; append row to Changelog.md; close GH#N
```

---

## HALT Conditions (global)
- Any str.replace that finds no match: log and skip remaining edits in that file; continue to next independent item
- Any validation failure: log and stop remaining items in the same dependency group; continue to independent items
- Any test regression (previously passing tests now fail): halt entire batch, log, do not commit

A work order is valid for execution only if:
- Every edit includes the exact surrounding context lines (not just the changed lines)
- Every item has an explicit HALT condition
- No item says "implement X" without specifying exact file, function, and replacement strings
