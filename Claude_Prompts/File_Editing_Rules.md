# File Editing Rules — Tailswinds Pet Care

**Never use the Cowork Edit tool** (also enforced in CLAUDE.md constraint #6). Never use the Cowork Write tool on files already in the FUSE mount.

---

## Preferred Method (2026-07-21): `desktop-commander`, not the FUSE bridge

If the `mcp__remote-devices__desktop-commander__*` tools are available (the Claude desktop app is connected), **use them instead of everything below.** They run real processes directly on the Windows machine against the actual disk — not through the virtiofs FUSE mount that `device_bash` and the Cowork Edit/Write tools go through. Confirmed working: `git fetch`/`add`/`commit`/`merge`/`push`, `npm run build`, and `ssh`/`scp` to the Lightsail server (real outbound internet — unlike `device_bash`, which has none, and unlike the cloud sandbox's Bash tool, which is network-allowlisted and times out on port 22 to arbitrary IPs like the Lightsail box).

This eliminates essentially every workaround in this document:
- No stale page-cache reads → no need for the Read-tool-only rule or the write-to-`/tmp`-then-rename dance. Use `desktop-commander__read_file` / `write_file` / `edit_block` directly on the real path, or `start_process` running `git`/`npm`/PowerShell.
- No `/tmp` ownership carryover between sessions (there's no `/tmp` involved at all — it's native Windows).
- No EPERM on `.git/index.lock` → `git commit` and `git push` work directly. The GitHub-API-PUT workaround is no longer needed when desktop-commander is available.
- No stale build-output directory → build straight to the project's normal `dist/` with `npm run build`, no fresh-`/tmp`-dir-per-session needed.
- No rsync-skips-`index.html` issue → that was specifically the cloud sandbox reading a stale FUSE-cached copy to compute the rsync checksum. A native `npm run build` + `scp` from the real `dist/` doesn't have this problem.

Only fall back to the rules below when desktop-commander isn't available — e.g. no Claude desktop app connected this session, or you're working purely from the cloud sandbox side via `device_bash`/the connected-folder bridge.

Practical pattern: `mcp__remote-devices__desktop-commander__start_process` with `command: "powershell -Command \"cd 'C:\\Programming_Projects\\Tailswinds_Pet_Care'; <your commands>\""`. For a commit message with newlines, write it to a scratch file first (e.g. `write_file` to `.git\COMMIT_EDITMSG_SCRATCH`), then `git commit -F .git\COMMIT_EDITMSG_SCRATCH`, then delete the scratch file — avoids PowerShell multi-line quoting pain.

---

## Root Cause

The project folder is mounted via **virtiofs FUSE**. The kernel page cache does not invalidate when Windows-side processes (git, PowerShell, VS Code) modify files. This causes three distinct failure modes:

1. **Stale reads** — The sandbox reads a truncated/old version of a file that Windows modified. Any edit based on that stale content writes corruption back.
2. **Edit tool corruption** — The Cowork Edit tool computes byte offsets against the stale cached size, injecting null bytes and corrupting files. Always broken on this mount.
3. **`/tmp` permission carryover** — Files written to `/tmp` in a prior session are owned by a previous sandbox user (`nobody:nogroup`). They cannot be read or deleted by the current session. Build output directories from prior sessions fall into this trap.

---

## Writing / Editing Source Files (.jsx, .js)

**Always use the write-to-tmp-then-rename pattern:**

```python
# Step 1 — write full correct content to /tmp
with open('/tmp/FileName.jsx.new', 'w', encoding='utf-8') as f:
    f.write(content)

# Step 2 — copy into FUSE, then atomic rename
import shutil, os
dest = '/sessions/<session-id>/mnt/Tailswinds_Pet_Care/src/path/FileName.jsx'
shutil.copy2('/tmp/FileName.jsx.new', dest + '.tmp_new')
os.rename(dest + '.tmp_new', dest)
```

**For files > 300 lines**, write to `/tmp` using a bash heredoc (`cat > /tmp/file.new << 'EOF'`), then rename into FUSE via the Python snippet above. Never build large file content in a single Python string — use the heredoc approach for readability.

**Reading files before editing:** Always use the **Read tool**, not `open(path, 'r')` in bash. The Read tool bypasses the FUSE page cache. Never base edits on content read via bash `cat` or Python `open()` — that returns the stale cached version.

**After every write:** verify with `wc -l` or check the line count. If the file is shorter than expected, the write failed or the rename didn't take.

---

## Build

Scan for stale files before every build:

```python
import os
base = '/sessions/<session-id>/mnt/Tailswinds_Pet_Care/src'
for root, dirs, files in os.walk(base):
    for f in files:
        if not f.endswith(('.jsx', '.js')): continue
        path = os.path.join(root, f)
        with open(path, 'rb') as fh:
            content = fh.read()
        lines = content.decode('utf-8', errors='replace').splitlines()
        last = lines[-1].strip() if lines else ''
        if len(lines) > 50 and not any(last.endswith(e) for e in ['}', ';', "'", '"', '`']):
            print(f"STALE ({len(lines)} lines, ends: {repr(last[-60:])}): {path}")
```

**Build output directory:** `/tmp` directories from prior sessions cannot be deleted (`rm` fails with `Permission denied`). Use a **fresh directory name** each session — pick one that doesn't already exist:

```bash
# Check if the dir exists and is from a prior session (unremovable)
ls -la /tmp/twbuild 2>/dev/null
# If it exists and can't be rm'd, pick a new name:
mkdir -p /tmp/twbuild_new
cd /sessions/<session-id>/mnt/Tailswinds_Pet_Care
npx vite build --outDir /tmp/twbuild_new --emptyOutDir
```

---

## Deploy

The build must target `/tmp` (not the FUSE mount). Then deploy in three steps:

```bash
KEY=/tmp/tw_deploy.pem

# 1 — sync assets (exclude index.html — rsync silently skips it from FUSE)
rsync -az --delete --exclude='index.html' \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY" \
  /tmp/twbuild_new/ ubuntu@3.134.160.32:/var/www/tailwindspetcare/

# 2 — SCP index.html separately (rsync FUSE issue)
scp -o StrictHostKeyChecking=no -i $KEY \
  /tmp/twbuild_new/index.html ubuntu@3.134.160.32:/var/www/tailwindspetcare/index.html

# 3 — fix permissions + reload nginx
ssh -o StrictHostKeyChecking=no -i $KEY ubuntu@3.134.160.32 \
  "sudo find /var/www/tailwindspetcare -type d -exec chmod 755 {} + && \
   sudo find /var/www/tailwindspetcare -type f -exec chmod 644 {} + && \
   sudo nginx -s reload"
```

---

## SSH Deploy Key

The key is **not stored in this repo**. Each session, mount the SecurityKeys folder and copy it:

```
Key file:  C:\Programming_Projects\SecurityKeys\GTDWorkflow.pem
Bash path: /sessions/<session-id>/mnt/SecurityKeys/GTDWorkflow.pem
```

```bash
cp /sessions/<session-id>/mnt/SecurityKeys/GTDWorkflow.pem /tmp/tw_deploy.pem
chmod 600 /tmp/tw_deploy.pem
```

Do not try to read `/tmp/deploy_key.pem` left over from a prior session — it is owned by `nobody:nogroup` and will return `Permission denied`.

**Note (2026-07-21):** the cloud sandbox's own Bash tool cannot SSH to the Lightsail box at all — outbound port 22 to arbitrary IPs times out (network allowlist), confirmed by testing. Plain HTTPS from the cloud sandbox works fine for read-only checks (curl to tailwindspetcare.com). For actual ssh/scp, use desktop-commander (see "Preferred Method" above) — it has real outbound access from the user's machine.

---

## Git — Commit and Push

`git commit` fails on this FUSE mount because git cannot create `.git/index.lock` (EPERM). **Use the GitHub API instead:**

```python
import base64, json, urllib.request

TOKEN = "<GITHUB_TOKEN from .env>"
REPO  = "jreitzersmith/Tailwinds_Pet_Care"

def github_put(api_path, local_path, sha=None):
    with open(local_path, 'rb') as f:
        content = base64.b64encode(f.read()).decode()
    payload = {"message": f"Update {api_path.split('/')[-1]}", "content": content}
    if sha:
        payload["sha"] = sha
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/contents/{api_path}",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="PUT")
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

# Get current SHA for existing files:
# GET https://api.github.com/repos/<repo>/contents/<path>?ref=main  →  .sha
# New files: omit sha entirely.
```

Workflow: get SHA for each changed file → call `github_put` for each → done.

**This whole section is a FUSE-bridge fallback.** With desktop-commander available, just run `git add` / `git commit` / `git push` natively — no EPERM, no per-file API calls needed. Reserve the GitHub API approach for sessions where desktop-commander isn't connected.

---

## Stale Git Lock Files

If any git command fails with a lock error, the lock file is a FUSE artifact. `rm` will also fail via `device_bash`/the FUSE bridge. Use `os.rename()`:

```python
import os, glob
git_dir = '/sessions/<session-id>/mnt/Tailswinds_Pet_Care/.git'
for lock in glob.glob(git_dir + '/**/*.lock', recursive=True) + glob.glob(git_dir + '/*.lock'):
    try:
        os.rename(lock, lock + '.bak')
        print(f"Cleared: {lock}")
    except Exception as e:
        print(f"Failed: {lock} — {e}")
```

**Important (2026-07-21):** the `.lock.bak` files this creates are never actually removed, and they pile up. A stray `refs/remotes/origin/main.lock.bak` and `.git/index.lock(.bak)` left over from this exact rename trick (dated ~7/5) later broke `git fetch` outright (`fatal: bad object refs/remotes/origin/main.lock.bak`) and `git add` (`Unable to create .git/index.lock: File exists`) in a later session. **If desktop-commander is available, delete them for real instead:**

```powershell
Get-ChildItem .git -Filter '*.lock*' -Recurse -Force | Remove-Item -Force
```

Only use the rename-to-`.bak` trick when working through the FUSE bridge where `rm`/`Remove-Item` genuinely can't delete the file — and if you do, periodically clean up the accumulated `.bak` files from a desktop-commander session so they don't cause this failure again.

---

## Summary Cheatsheet

**Everything in this table is the FUSE-bridge fallback.** If desktop-commander is available this session, use it directly (native git/build/ssh — see "Preferred Method" above) instead of the methods below.

| Task | Method |
|---|---|
| Read a file for editing | **Read tool** (never bash `cat`) |
| Write/edit a .jsx or .js file | Write to `/tmp`, then `shutil.copy2` + `os.rename` into FUSE |
| Edit tool | **Never** |
| Build output dir | Fresh `/tmp/twbuildN` each session (prior session dirs are unremovable) |
| Deploy assets | rsync to server (exclude index.html) |
| Deploy index.html | scp separately |
| SSH key | Copy from SecurityKeys each session → `/tmp/tw_deploy.pem` |
| Git push | GitHub API (`PUT /contents/<path>`), not `git commit` |
| Stuck lock files | `os.rename(lock, lock + '.bak')` — never `rm` (and clean up the `.bak` files periodically) |
