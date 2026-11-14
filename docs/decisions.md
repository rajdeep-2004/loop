# Decision Log

Every non-trivial decision made while building this project, with the reasoning behind it.
Written so that someone reading it after the project is finished can understand **what** was built,
**why** it was built that way, and **how** the logic works.

Rules:
- Append new entries at the bottom. Never delete an entry; if a decision changes, add a new entry
  and mark the old one `Superseded by D-###`.
- Log as you go. After every gstack step (/office-hours, /plan-ceo-review, /autoplan, /review,
  /cso, /qa, /ship, /retro) add an entry with its conclusions: what was decided, what was rejected, why.
- Small choices: fill Context, Decision, Why, Files. Architectural or tricky ones: fill everything.

## Index
| ID | Date | Step / milestone | Title | Status |
|---|---|---|---|---|
| D-001 | 2026-11-15 | /office-hours | Campus: full V1 scope, mobile app, lean architecture | Active |
| D-002 | 2026-11-15 | Delivery setup | Local-only delivery, unit + integration tests, no Docker or CI | Active |
| D-003 | 2026-11-15 | Design | Neo-brutalist visual direction | Active |
| D-004 | 2026-11-15 | Workflow | Unattended overnight build: phases merged to main without approval stops | Active |
| D-005 | 2026-11-15 | M1 | Refresh tokens stored hashed and rotated | Active |
| D-006 | 2026-11-15 | M1 | M1 build notes: workspace, name search field, upload checks, mobile test setup | Active |

---

## Entry template (copy below the last entry)

### D-### — <Short title>
- **Date:** YYYY-MM-DD
- **Step / milestone:** e.g. /plan-ceo-review, or M2 — <milestone name>
- **Status:** Active | Superseded by D-### | Reverted
- **Type:** stack | architecture | data | api | algorithm | edge-case | tooling | assumption

**Context**
What problem or question came up, and what constraints mattered.

**Decision**
What was chosen, in one or two sentences.

**Alternatives considered**
| Option | Why not chosen |
|---|---|
| | |

**Why**
The reasoning. What made this the right choice for this project at this stage.

**How it works**
Walk through the logic step by step in plain language, as if teaching it. Include a small code
snippet or pseudo-code if it helps. Mention the edge cases it handles.

**Files touched**
- `path/to/file.ts` — what changed

**Concepts worth learning**
Terms, patterns or ideas this decision relies on (e.g. "optimistic concurrency", "idempotency key"),
each with one line explaining it.

**Revisit if**
The conditions under which this decision should be reconsidered.

---

<!-- Entries start below -->

### D-001 — Campus: full V1 scope, mobile app, lean architecture
- **Date:** 2026-11-15
- **Step / milestone:** /office-hours
- **Status:** Active
- **Type:** stack | architecture

**Context**
The capstone idea (`chat-app-idea.md`, brainstormed with ChatGPT) describes a university chat app with 13 V1 features. The office-hours session had to settle what gets built, on what platform, and with how much infrastructure, for one builder in about 6 to 8 weeks.

**Decision**
Build every feature in the idea doc's V1 list as a mobile app: Expo (React Native) client, one Fastify + Socket.IO server, MongoDB, TanStack Query on the client. No Redis, no Next.js, no background worker. The work is split into 8 milestones (see prd.md §9). The full design is in `docs/designs/campus-v1.md`.

**Alternatives considered**
| Option | Why not chosen |
|---|---|
| Cut scope to one hero flow (targeted announcements) | Claude recommended it; the builder chose the full app as described |
| Responsive web app | The builder stated the product is a mobile app |
| Full architecture with Redis, worker, object storage | The builder wants a prototype to showcase, not a scalable service |
| Next.js API routes + hosted realtime vendor | Next.js adds nothing as an API host for a mobile client, and the vendor would own the main engineering |
| Plain fetch instead of TanStack Query | Briefly chosen when the builder asked to drop it, then reversed by the builder |

**Why**
The builder's goal is a capstone demo. A single process removes the need for shared state between servers, which is the only reason Redis would be required. The independent spec review (3 rounds, final 8/10, no blocking findings) changed several details: announcement targeting is AND across dimensions, club announcements are public outreach, sockets use one personal room per user, the DM uniqueness index is partial, and people search is a prefix match.

**How it works**
See "How the main pieces work" in the design doc.

**Files touched**
- `docs/designs/campus-v1.md`, `docs/prd.md`, `docs/architecture.md`

**Concepts worth learning**
- Partial unique index: a uniqueness rule that applies only to documents matching a filter, so documents without the field do not collide.
- Idempotency key (`clientMessageId`): a client-generated id that lets the server recognize a retry and return the first result instead of creating a duplicate.
- Personal socket room: each user's sockets join `user:<id>`; the server delivers by looking up members, so membership changes need no room bookkeeping.

**Revisit if**
The API ever needs more than one process (then add Redis for presence and the Socket.IO adapter), or real students start using it.

---

### D-002 — Local-only delivery, unit + integration tests, no Docker or CI
- **Date:** 2026-11-15
- **Step / milestone:** Delivery setup
- **Status:** Active
- **Type:** tooling | assumption

**Context**
The global rules require four Delivery setup answers before any code. The builder went to sleep and asked for an unattended build, so Claude chose defaults that fit "minimal prototype".

**Decision**
Testing: Vitest for API unit and integration tests against the local MongoDB and a live Socket.IO test server; Jest with React Native Testing Library for mobile components and hooks; an Expo bundle export as a compile check. No deployment, no Docker, no CI.

**Alternatives considered**
| Option | Why not chosen |
|---|---|
| Device E2E tests (Maestro, Detox) | No iOS simulator or Android emulator is installed on the build machine |
| In-memory MongoDB for tests | A real MongoDB 7 is already running locally and behaves exactly like production |
| GitHub Actions | Not asked for; adds setup time to a prototype |

**Why**
These are the cheapest choices that still test the backend end to end. The gap is honest: the mobile UI is verified by component tests and a successful bundle, not on a phone.

**Concepts worth learning**
- Integration test: a test that runs the real HTTP handler against a real database, as opposed to a unit test of one function.
- `fastify.inject`: sends a fake HTTP request straight into the server without opening a network port, which keeps API tests fast.
- React Native Testing Library: renders a component in a test and lets the test press buttons and read text the way a user would.

**Revisit if**
The builder sets up an emulator (add a device smoke test) or wants a hosted backend for demo day.

---

### D-003 — Neo-brutalist visual direction
- **Date:** 2026-11-15
- **Step / milestone:** Design
- **Status:** Active
- **Type:** assumption

**Context**
The builder asked for a UI that is "really interesting and sexy", not generic, and named "Bootlegism", which Claude read as brutalism. `/design-consultation` could not run interactively overnight.

**Decision**
Neo-brutalism, defined in `DESIGN.md`: thick black outlines, hard offset shadows, flat saturated colors, heavy type, one color per school. Built as a small design system in `apps/mobile/src/ui` before any screen.

**Why**
It is the opposite of the default rounded, soft-shadow chat app look, it is cheap to implement consistently in React Native (borders and offset blocks, no blur), and the per-school color makes the university structure visible.

**Revisit if**
The builder meant a different style. All tokens live in one theme file, so a restyle does not touch screens.

---

### D-004 — Unattended overnight build: phases merged to main without approval stops
- **Date:** 2026-11-15
- **Step / milestone:** Workflow
- **Status:** Active
- **Type:** tooling

**Context**
The global workflow says: `/plan-ceo-review` and `/autoplan` before building, one session per milestone, stop after each milestone and wait for "ship it". The builder asked instead for the whole app to be built overnight in phases, each tested, with a branch per phase, a commit per task, and a merge to `main` after tests pass.

**Decision**
Follow the builder's overnight instruction. Each milestone gets a branch `milestone/m<n>-<slug>`, one commit per task, full lint + typecheck + tests, then a merge commit into `main` and a push. `/plan-ceo-review`, `/autoplan`, `/review`, `/qa` and the approval stop are skipped for this run. Tests are committed with the code; "do not push that test" was read as "do not push untested code".

**Why**
An explicit instruction for this run outranks the standing default. The risk is that nobody reviews between phases, so the test suite is the only gate; it is kept strict for that reason.

**Revisit if**
The builder wants reviews back: run `/review` and `/cso` on `main` after the build.

---

### D-005 — Refresh tokens stored hashed and rotated
- **Date:** 2026-11-15
- **Step / milestone:** M1
- **Status:** Active
- **Type:** architecture

**Context**
The spec review noted that logout could not invalidate a refresh token because nothing stored it.

**Decision**
A `sessions` collection stores a SHA-256 hash of each refresh token with its user id and expiry. Refresh checks the hash, deletes the session and issues a new pair (rotation). Logout deletes the session. Access tokens are JWTs valid for 15 minutes.

**Why**
Storing only a hash means a database leak does not leak usable tokens. Rotation means a stolen refresh token stops working after the real user refreshes once.

**Files touched**
- `apps/api/src/modules/auth/*`

**Concepts worth learning**
- Access vs refresh token: a short-lived token sent on every request, and a long-lived one used only to get a new access token.
- Token rotation: every use of a refresh token replaces it with a new one.

**Revisit if**
Multiple devices per user need a "log out everywhere" button (add a delete-all-sessions endpoint).

---

### D-006 — M1 build notes: workspace, name search field, upload checks, mobile test setup
- **Date:** 2026-11-15
- **Step / milestone:** M1 — Foundation and identity
- **Status:** Active
- **Type:** tooling | data | edge-case

**Context**
M1 delivered the repo layout, the design system, signup, login, onboarding, profiles, image upload and the seed script. Several small choices were made on the way.

**Decision**
1. pnpm workspace with `node-linker=hoisted`. React Native's bundler (Metro) expects one flat `node_modules`; pnpm's default symlinked layout causes duplicate or unresolved packages.
2. `packages/shared` is consumed as TypeScript source (no build step). The API runs through `tsx` and Metro compiles it for the app, so one edit is visible to both sides immediately.
3. Users store `nameWords`, the lowercase words of the name, in an indexed array. A prefix search can then match the start of any word ("sharma" finds "Rajdeep Sharma"), which the spec review flagged as missing.
4. Uploaded images are identified by their first bytes (magic numbers), not by the content type or filename the client sends. The stored name is a random UUID. A fake `.png` containing a script is rejected.
5. Public images (avatars, banners) are served only to signed-in users, so the app sends the access token as a header when it loads an image (`RemoteImage`).
6. The API URL defaults to the computer running the Expo dev server, port 4000, so a phone on the same Wi-Fi needs no configuration.
7. Mobile lint runs `eslint .` directly. `expo lint` refuses to run on Node 20 (it asks for Node 22.13+), while the rest of Expo SDK 58 works on Node 20.
8. Tabs have no icons. The tab bar is typographic (uppercase labels in bordered cells), which fits the brutalist direction and avoids an icon dependency.

**Why**
Each is the smallest choice that satisfies the engineering standards (validated input, no trust in the client, indexed queries) without adding infrastructure.

**How it works**
Tests run against a real local MongoDB database named `campus_test`. Each test file builds the Fastify app once and empties every collection before each test. Requests are sent with `fastify.inject`, which calls the server in-process. Mobile tests render components with React Native Testing Library; the API client is tested by replacing `fetch` with a scripted fake.

**Files touched**
- `pnpm-workspace.yaml`, `.npmrc`, `packages/shared/*`, `apps/api/*`, `apps/mobile/*`, `DESIGN.md`

**Concepts worth learning**
- Magic numbers: fixed byte sequences at the start of a file format (PNG starts with `89 50 4E 47`), used to detect the real type.
- Single-flight refresh: when many requests fail with 401 at once, they all wait on one shared refresh call instead of each starting their own.
- Route guard (`Stack.Protected`): Expo Router shows a group of screens only while a condition is true and redirects away when it turns false.

**Revisit if**
Node is upgraded to 22+ (switch the mobile lint script back to `expo lint`).
