# PROJECT OPERATING SYSTEM — Cơm tấm Má Tư

> Agent behavioral rules. Loaded via CLAUDE.md reference.
> Synthesized from: Compass Framework (meta-learning) + gstack (workflow) + production lessons.

---

## I. CORE PRINCIPLES (Constitutional — Never expire)

### 1. Simplicity First

- Every change must be as simple as possible. Only touch the code that's necessary.
- No temporary fixes. Find root cause. Senior developer standards.
- If a fix feels hacky → stop and ask "knowing everything I know now, what's the most elegant solution?"

### 2. Plan Before Build

- Any task with ≥3 steps or architectural decisions → write Task Contract (CLAUDE.md §V) first.
- If off-track → STOP and re-plan immediately. Don't keep pushing.

### 3. Verify Before Done

- Never mark a task complete without proving it works.
- Run `pnpm typecheck && pnpm lint && pnpm build`. Demo correctness.
- Ask yourself: "Would a staff engineer approve this?"

### 4. Learning Compounds

- Every failure → a new rule in `tasks/regressions.md`.
- Every correction from user → a lesson in `tasks/lessons.md`.
- Optimize ACROSS sessions, not just WITHIN a session.

---

## II. WORKFLOW ORCHESTRATION

### Phase 1: Receive Task

1. Read & understand the requirement
2. Check `tasks/regressions.md` — any applicable rules?
3. Check `tasks/lessons.md` — any relevant lessons?
4. Assess complexity → Simple (execute directly) | Complex (Task Contract)

### Phase 2: Plan (for complex tasks)

1. Write Task Contract (CLAUDE.md §V) with adjacent code, constraints, failure conditions
2. Confirm plan with user before starting
3. Break into independent sub-tasks if parallel agents are appropriate

### Phase 3: Build

1. Execute step by step, checkpoint commits at milestones
2. Each step → explain high-level changes
3. If contradiction with previous instruction → log in `tasks/friction.md`, surface to user
4. If bug found → self-investigate → self-fix. Don't ask user what you can solve.

### Phase 4: Verify & Deliver

1. `pnpm typecheck && pnpm lint && pnpm build` — all must pass
2. Diff before-after behavior if relevant
3. Update `tasks/todo.md` with completion status

### Phase 5: Learn

1. Correction from user? → Update `tasks/lessons.md` (Pattern → Rule → Prevention)
2. Failure occurred? → Add rule to `tasks/regressions.md` (one-line)
3. Contradiction found? → Log in `tasks/friction.md`

---

## III. META-LEARNING LOOPS

### Loop 1 — Regressions List (Priority #1)

**File:** `tasks/regressions.md`
- Every serious failure → a single one-line rule
- Format: `[DATE] [RULE NAME] — short description`
- Loaded at the start of every session
- Currently: 15 named rules from production experience

### Loop 2 — Lessons Learned (Priority #2)

**File:** `tasks/lessons.md`
- After EVERY correction from user: update
- Format: Pattern → Rule → Prevention
- Currently: 25+ lessons from 6+ weeks of development

### Loop 3 — Friction Log (Priority #3)

**File:** `tasks/friction.md`
- When a new instruction contradicts a previous one → LOG IT, don't silently comply
- Surface to user at the next natural break point
- Prevents architectural drift

### Loop 4 — Prediction Log (Priority #4)

**File:** `tasks/predictions.md`
- Before important decisions: write prediction
- After completion: log Delta (deviation) + Lesson
- Historical accuracy: improved from ~60% → ~95% over 8 weeks

### Loop 5 — Epistemic Tagging (Cognitive)

When making important claims, tag clearly:
- `[consensus]` — Common knowledge, confirmed
- `[observed]` — Directly observed from data/tests
- `[inferred]` — Logically reasoned from evidence
- `[speculative]` — Guesswork, needs verification

### Loop 6 — Recursive Refinement (Cognitive)

- Hard stop rule: STOP after 3 iterations with <5% improvement
- Prevents useless looping on diminishing returns

---

## IV. ANTI-PATTERNS (Things to NEVER do)

1. **Don't build without planning** — Complex task → Task Contract first
2. **Don't silently swallow contradictions** — Log in friction log, surface to user
3. **Don't mark done without verifying** — Must prove it works (`pnpm build`)
4. **Don't repeat past mistakes** — Always check `tasks/regressions.md`
5. **Don't over-engineer simple fixes** — Elegance for complex, simplicity for simple
6. **Don't patch the surface** — Find root cause, no temporary patches
7. **Don't ask user what you can self-fix** — Self-investigate → self-fix
8. **Don't confuse RAG with learning** — Rules must live in boot/task files
9. **Don't build loops that never close** — A log nobody reads = doesn't exist
10. **Don't expand scope silently** — If discovering new files need changes, surface to user first

---

## V. QUALITY GATES

### Before delivering any code:

- [ ] Does `pnpm typecheck` pass?
- [ ] Does `pnpm lint` pass?
- [ ] Does `pnpm build` pass?
- [ ] Is it as simple as possible? (no over-engineering)
- [ ] Does it violate any rule in `tasks/regressions.md`?
- [ ] Would a staff engineer approve?
- [ ] Hard boundaries (CLAUDE.md §III) respected?

### Before creating documents/files:

- [ ] Read the corresponding SKILL.md first?
- [ ] File saved to appropriate location?
- [ ] Shared with user via link?

---

_This is a living document. Updated when new lessons, regressions, or workflow improvements are discovered._
