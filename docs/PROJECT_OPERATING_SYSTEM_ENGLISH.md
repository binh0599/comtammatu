# 🧠 PROJECT OPERATING SYSTEM — Project Operating Rules

> This document is the "boot file" — loaded at the start of every session, shaping all behavior and decisions in the project.
> Synthesized from: AGENTS.md (workflow) + Compass Artifact (meta-learning) + Skills & Tools ecosystem.

---

## I. CORE PRINCIPLES (Constitutional — Never expire)

### 1. Simplicity First

- Every change must be as simple as possible. Only touch the code that's necessary.
- No temporary fixes. Find root cause. Senior developer standards.
- If a fix feels hacky → stop and ask "knowing everything I know now, what's the most elegant solution?"

### 2. Plan Before Build

- Any task with ≥3 steps or architectural decisions → enter Plan Mode first.
- Write plan to `tasks/todo.md` with checklist items.
- If off-track → STOP and re-plan immediately. Don't keep pushing.

### 3. Verify Before Done

- Never mark a task complete without proving it works.
- Run tests, check logs, demo correctness.
- Ask yourself: "Would a staff engineer approve this?"

### 4. Learning Compounds

- Every failure → a new rule. Every session → better than the last.
- Optimize ACROSS sessions, not just WITHIN a session.
- "A moderately capable agent with good learning loops surpasses a smarter agent without them within weeks."

---

## II. WORKFLOW ORCHESTRATION

### Phase 1: Receive Task

```
1. Read & understand the requirement
2. Check tasks/lessons.md — any relevant lessons?
3. Check tasks/regressions.md — any rules to follow?
4. Assess complexity → Simple (execute directly) | Complex (Plan Mode)
```

### Phase 2: Plan Mode (for complex tasks)

```
1. Write detailed plan to tasks/todo.md
2. Confirm plan with user before starting
3. Break into independent sub-tasks if needed
4. Write prediction: "I predict X will happen" (Prediction Log)
```

### Phase 3: Build

```
1. Execute step by step, mark complete in todo.md
2. Each step → explain high-level changes
3. If contradiction with previous instruction → log in Friction Log, surface to user
4. If bug found → self-fix, no hand-holding
```

### Phase 4: Verify & Deliver

```
1. Run tests / demo correctness
2. Diff before-after behavior if relevant
3. Compare prediction vs actual outcome → log Delta & Lesson
4. Update tasks/todo.md with review section
```

### Phase 5: Learn

```
1. Correction from user? → Update tasks/lessons.md
2. Failure occurred? → Add rule to tasks/regressions.md
3. Write rule to prevent the same mistake in the future
```

---

## III. META-LEARNING LOOPS (Adapted from Compass Framework)

### Loop 1 — Regressions List (Boot File) ⚡ Priority #1

**File:** `tasks/regressions.md`

- Every serious failure → a single one-line rule
- Format: `[DATE] [RULE NAME] — short description`
- Loaded at the start of every session
- Cost: a few tokens per line. Payoff: permanent prevention.

### Loop 2 — Memory Tiers 📚 Priority #2

Classify knowledge by decay rate:
| Tier | Type | Refresh | Example |
|------|------|---------|---------|
| Constitutional | Never expires | Never | Security rules, core constraints |
| Strategic | Quarterly | Every quarter | Project direction, goals, architecture |
| Tactical | Weekly/Daily | Frequently | Task details, current sprint |

### Loop 3 — Friction Log 🔥 Priority #3

**File:** `tasks/friction.md`

- When a new instruction contradicts a previous one → LOG IT, don't silently comply
- Surface to user at the next natural break point
- Prevents architectural drift

### Loop 4 — Prediction Log 🎯 Priority #4

**File:** `tasks/predictions.md`

- Before important decisions: write prediction
- After completion: log Delta (deviation) + Lesson
- After ~1 month: calibration patterns become visible

### Loop 5 — Lessons Learned 📝 Continuous

**File:** `tasks/lessons.md`

- After EVERY correction from user: update
- Format: Pattern → Rule → Prevention
- Review at the start of each relevant session

### Loop 6 — Epistemic Tagging 🏷️ Cognitive

When making important claims, tag clearly:

- `[consensus]` — Common knowledge, confirmed
- `[observed]` — Directly observed from data/tests
- `[inferred]` — Logically reasoned from evidence
- `[speculative]` — Guesswork, needs verification
- `[contrarian]` — Against mainstream, requires extra caution

### Loop 7 — Recursive Refinement 🔄 Cognitive

- Hard stop rule: STOP after 3 iterations with <5% improvement
- Turns "make it better" into a measurable decision point
- Prevents useless looping

---

## IV. TOOLBOX & SKILLS MAP

### 🎨 Frontend & Design

| Need                   | Skill                 | Path                                                  |
| ---------------------- | --------------------- | ----------------------------------------------------- |
| Beautiful UI/Component | frontend-design       | `/mnt/skills/public/frontend-design/SKILL.md`         |
| Complex React app      | web-artifacts-builder | `/mnt/skills/examples/web-artifacts-builder/SKILL.md` |
| Canvas/Visual design   | canvas-design         | `/mnt/skills/examples/canvas-design/SKILL.md`         |
| Theme system           | theme-factory         | `/mnt/skills/examples/theme-factory/SKILL.md`         |
| Algorithmic art        | algorithmic-art       | `/mnt/skills/examples/algorithmic-art/SKILL.md`       |

### 🔌 Integration & Automation

| Need       | Skill         | Path                                          |
| ---------- | ------------- | --------------------------------------------- |
| MCP Server | mcp-builder   | `/mnt/skills/examples/mcp-builder/SKILL.md`   |
| New Skill  | skill-creator | `/mnt/skills/examples/skill-creator/SKILL.md` |

### 🌐 Connected Services (MCP Servers)

| Service  | Status       | Use case           |
| -------- | ------------ | ------------------ |
| Gmail    | ✅ Connected | Email              |
| Figma    | ✅ Connected | Design files       |
| Supabase | ✅ Connected | Database & backend |
| Vercel   | ✅ Connected | Deploy & hosting   |

### 🔍 Research & Information

- **Web Search** — Real-time information lookup
- **Image Search** — Find illustrative images
- **Past Chats** — Find context from previous conversations

### 💻 Computer & Code

- **Bash** — Run commands, install packages, run scripts
- **File Create/Edit/View** — Create, edit, read files
- **Present Files** — Share files with user

---

## V. QUALITY GATES

### Before delivering:

- [ ] Does the code run? (test/demo)
- [ ] Is it as simple as possible? (simplicity check)
- [ ] Would a staff engineer approve? (quality check)
- [ ] Does it violate any rule in regressions.md? (regression check)
- [ ] Does prediction match reality? If not, log lesson (learning check)

### Before creating output files:

- [ ] Read the corresponding SKILL.md? (ALWAYS read before creating)
- [ ] File copied to `/mnt/user-data/outputs/`?
- [ ] Used `present_files` to share with user?

---

## VI. ANTI-PATTERNS (Things to NEVER do)

1. **Don't build without planning** — Complex task but jumping straight into code
2. **Don't silently swallow contradictions** — Log in friction log instead of silent compliance
3. **Don't mark done without verifying** — Must prove it works
4. **Don't repeat past mistakes** — Always check regressions.md first
5. **Don't over-engineer simple fixes** — Elegance for complex, simplicity for simple
6. **Don't patch the surface** — Find root cause, no temporary patches
7. **Don't ask user what you can self-fix** — Bug report → self-investigate → self-fix
8. **Don't skip reading SKILL.md** — Always read the corresponding skill BEFORE creating documents/files
9. **Don't confuse RAG with learning** — Retrieval ≠ behavior change. Rules must live in the boot file.
10. **Don't build loops that never close** — A log nobody reads = doesn't exist

---

## VII. SESSION BOOT SEQUENCE

```
At the start of every new task:
1. ✅ Load this ruleset (PROJECT_OPERATING_SYSTEM.md)
2. ✅ Check tasks/regressions.md — any applicable rules?
3. ✅ Check tasks/lessons.md — any relevant lessons?
4. ✅ Check tasks/friction.md — any unresolved contradictions?
5. ✅ Assess task complexity → choose appropriate workflow
6. ✅ Begin execution
```

---

## VIII. PROJECT FILE STRUCTURE

```
project/
├── tasks/
│   ├── todo.md              # Current task plan & progress
│   ├── regressions.md       # Boot file — named failure rules
│   ├── lessons.md           # Pattern → Rule → Prevention
│   ├── friction.md          # Contradiction log
│   └── predictions.md       # Prediction → Delta → Lesson
├── docs/                    # Project documentation
└── src/                     # Source code
```

---

_This is a living document. It will be updated when new lessons, new regressions, or any loop discovers a needed improvement._
