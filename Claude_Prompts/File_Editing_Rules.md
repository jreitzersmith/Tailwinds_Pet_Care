# File Editing Rules — Windows FUSE Mount

Never use the Cowork Edit tool for files in this project. It consistently injects null bytes and truncates files.

## Root cause

The workspace mount is **virtiofs FUSE**. The FUSE page cache does NOT auto-invalidate when Windows-side processes (git commit/checkout, PowerShell, rebase) modify a file. Subsequent reads from the bash sandbox return a stale cached version — truncated at the size of the last sandbox write.

Two distinct failure modes:
1. **Cowork Edit tool** — always broken on this mount. Injects null bytes and corrupts offsets. Never use it.
2. **Stale FUSE read** — Python or the Read tool reads a file that Windows/git modified since the last sandbox write.

---

## Preferred method — by file type

### .md files

**Always use PowerShell `WriteAllText` via `mcp__desktop-commander__start_process`.**

```powershell
$content = [System.IO.File]::ReadAllText("C:\path\to\file.md", [System.Text.Encoding]::UTF8)
$content = $content.Replace($old, $new)
[System.IO.File]::WriteAllText("C:\path\to\file.md", $content, [System.Text.Encoding]::UTF8)
```

Verify after every write: `(Get-Item 'C:\path\to\file.md').Length`

### Source files (.js, .jsx, .ts, .tsx, .py, .ps1, .sh, .conf, .yaml)

- **New files:** `mcp__desktop-commander__write_file` in chunks of ≤30 lines
- **Edits:** Python `str.replace()` via bash sandbox, write via `open(path, 'w')` — safe when content does not shrink
- **Never** use the Cowork Edit or Write tools
- **Never** use `mcp__desktop-commander__edit_block`
- **After any write:** verify with `wc -c`

---

## Quick reference

| File type | New files | Edits |
|---|---|---|
| `.md` | `mcp__desktop-commander__write_file` | PowerShell `WriteAllText` |
| `.js/.jsx/.ts/.tsx` | `mcp__desktop-commander__write_file` | Python `str.replace()` + `open(w)` |
| `.yaml/.conf/.sh` | `mcp__desktop-commander__write_file` | Python `str.replace()` + `open(w)` |
| Any file | **Never** Cowork Edit/Write | **Never** Cowork Edit |

## Vite build

**Always build to `/tmp/tailwinds-build` — never to the FUSE mount path.**

```bash
npx vite build --outDir /tmp/tailwinds-build --emptyOutDir
```

Building to `mnt/` fails with EPERM on the unlink syscall (Windows mount layer restriction).
