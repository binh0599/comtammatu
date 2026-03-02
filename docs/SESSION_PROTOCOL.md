# SESSION_PROTOCOL.md — Claude Code Session Management

> Adapted from production experience: context decay starts at ~45 min or 15-20 turns.
> Short sessions + clean checkpoints > long sessions with degraded output.

---

## CORE PRINCIPLE

**One task = one session.** Commit before. Commit after. Kill the session.

Context accumulates noise over time. A fresh session with a clear contract outperforms a long session carrying 45 minutes of context. This is not a limitation to work around — it's a workflow to design for.

---

## SESSION LIFECYCLE

### Before Starting a Session

```bash
# 1. Pull latest
git pull origin main

# 2. Verify clean state
git status  # must be clean before starting

# 3. Create checkpoint commit (safety net)
git add -p
git commit -m "checkpoint: before [task name]"

# 4. Open new Claude session — paste the Task Contract (docs/TASK_TEMPLATES.md)
```

### During the Session

- Stay scoped to the contract's Adjacent Code list
- If you discover new files need touching → surface to user, don't silently expand scope
- After 15 exchanges or 45 minutes → finish current step, commit partial, kill session, open new one
- Never ask Claude to "continue where we left off" in the same session after context decay

### Ending a Session

```bash
# 1. Verify the task
pnpm typecheck    # must pass
pnpm lint         # must pass
pnpm build        # must pass (catches RSC/Edge boundary issues)

# 2. Commit
git add [only the files from the contract]
git commit -m "feat: [task name]

- [what changed]
- [why]"

# 3. Kill the session — do not continue in the same session
```

---

## ERROR RECOVERY PROTOCOL

When Claude produces a bug or broken build:

```
1. STOP — do not ask Claude to fix it in the same session
2. git checkout . — revert to last clean commit
3. Kill the session
4. Open a NEW session with this prompt:
```

**Error Recovery Prompt Template:**
```
Task: Fix [specific error]

Error:
[paste exact error message]

Affected file: [path/to/specific/file.ts]

Constraints:
- ONLY modify [path/to/specific/file.ts]
- Do NOT touch any other files
- Do NOT refactor unrelated code
- Root cause only — no defensive rewrites

Context:
[paste 5-10 lines around the error location]
```

**Why a new session?** The session that produced the bug has already formed wrong assumptions. A fresh session has no attachment to the broken approach and will find root cause faster.

---

## WHAT NOT TO DO (Based on Production Experience)

| Practice | Why it fails in production |
| -------- | ------------------------- |
| "think hard" on every task | Wastes tokens on simple tasks. Use only for complex architectural decisions. |
| Multi-task in one session | Context from task A pollutes task B. One task = one session. |
| Let Claude self-review | Claude reviews against its own assumptions. You review against requirements. |
| Personality instructions in CLAUDE.md | Zero effect on output quality. Wastes context window. |
| Let Claude fix its own bugs in-session | It defends the broken approach. Fresh session finds root cause faster. |
| Skip checkpoint commit | No safety net. One bad session destroys hours of clean work. |
| Long CLAUDE.md | Claude ignores most of it after 847+ lines. Keep it under 150 lines. |

---

## SESSION SIZE GUIDE

| Task type | Expected turns | Expected time |
| --------- | -------------- | ------------- |
| New admin tab (simple CRUD) | 8-12 turns | 20-30 min |
| New admin tab (with migration) | 12-18 turns | 30-45 min |
| Order flow change | 10-15 turns | 25-40 min |
| Schema migration + type regen | 6-10 turns | 15-25 min |
| Error recovery (single file) | 4-8 turns | 10-20 min |
| Full new route (RSC + actions + client) | 15-20 turns → split into 2 sessions | 2 × 30 min |

If a task exceeds the expected range, checkpoint commit and open a new session with only the remaining work.

---

## PARALLEL SESSIONS (When Appropriate)

Use parallel Claude sessions for **independent modules** (different routes, different files).

```
Rule: Modules are independent if they don't share new files being created.

Example — safe to parallelize:
  Session A: Add /admin/reports route
  Session B: Add customer PWA feedback improvements
  (different route groups, different Server Actions, no shared new files)

Example — do NOT parallelize:
  Session A: Modify @comtammatu/shared constants
  Session B: Add new admin tab that uses those constants
  (Session B depends on Session A's output)
```

Pattern:
1. Run shared package changes first (one session)
2. Then run consumer module sessions in parallel
3. Merge: typecheck + lint + build on combined output

---

## CHECKPOINT COMMIT MESSAGES

Format: keep them mechanical, not artistic. The point is recovery speed.

```bash
# Before starting:
git commit -m "checkpoint: before add-reports-tab"

# After completing a sub-step:
git commit -m "feat(reports): add Server Actions for revenue queries"

# After completing the full task:
git commit -m "feat: add /admin/reports — daily/weekly/monthly revenue breakdown"
```

Ugly git log beats a beautiful log you can't navigate. Every commit is a potential `git revert` target.

---

## WHEN TO INVOKE WHICH SKILL

**Before starting a session**, identify which skills to invoke. Doing it during the session breaks flow.

| Task involves | Invoke skill first |
| ------------- | ------------------ |
| New SQL / migration / RLS | `supabase-postgres-best-practices` |
| Next.js routes / RSC / Server Actions | `next-best-practices` |
| Auth / middleware / sessions | `nextjs-supabase-auth` |
| Any code writing | `clean-code` |
| Complex types / Zod inference | `javascript-typescript:typescript-advanced-types` |
| Bug investigation | `engineering:code-review` |
| Architecture decision | `engineering:system-design` |
