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
| D-007 | 2026-11-15 | M2 | Direct messaging: delivery, unread counts, read markers, outbox | Active |

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

---

### D-007 — Direct messaging: delivery, unread counts, read markers, outbox
- **Date:** 2026-11-15
- **Step / milestone:** M2 — Direct messaging
- **Status:** Active
- **Type:** architecture | data | edge-case

**Context**
M2 delivered one-to-one chat: conversation list, realtime text, history paging, sent/read status, presence and typing. People search was pulled forward from M7 because a student needs a way to find someone to message.

**Decision**
1. **One DM per pair.** `dmKey` is the two user ids sorted and joined. A partial unique index (only where `type` is `dm`) lets one insert win when both students open the chat at the same moment; the loser reads the winner's row. Member rows are upserts, so a half-finished attempt repairs itself.
2. **Idempotent sends.** The app generates a `clientMessageId`. A unique index on (sender, clientMessageId) turns a retry into "return the message already saved". Tested with three identical sends fired at once: one message, unread count 1.
3. **Delivery through personal rooms.** Each socket joins `user:<id>`. To deliver, the server reads the conversation's members and emits to their rooms. A student who was already connected receives the first message of a brand-new DM with no reconnect.
4. **Unread counts are stored, not counted.** Each member row has `unreadCount`, raised with an atomic `$inc` for everyone except the sender. The chat list reads it directly. Marking as read moves the marker forward only (a conditional update) and then recounts messages after the marker, so a message that arrives during the call stays unread.
5. **Empty DMs are hidden.** Opening a profile and tapping Message creates the DM, but it appears in both chat lists only after the first message (its sort date starts at 1970).
6. **Outbox on the phone.** A message being sent lives in a small local store, not in the server cache, and is shown as "Sending". On failure it turns red with "Tap to retry", and the retry reuses the same `clientMessageId`. The socket is tried first with an 8 second acknowledgement timeout, then plain HTTP.
7. **Presence** goes to students who share a DM with the person, and is also included in API responses. It is counted per user across devices, so closing one of two phones does not show the person offline.
8. **Typing** is sent at most once every 3 seconds per chat and expires on the receiver after 5 seconds if no "stopped" arrives. The server limits typing and message events per user per 10 seconds.
9. **Socket tokens** are checked at the handshake only. An expired token is refused with `auth_expired`; the app refreshes and reconnects.

**Alternatives considered**
| Option | Why not chosen |
|---|---|
| Socket.IO room per conversation | Rooms would have to be kept in step with joins and leaves; the spec review showed this breaks the "join a club then chat" flow |
| Count unread messages with a query per chat | One count query per row of the chat list |
| Optimistic message inside the React Query cache | A refetch would wipe unsent messages |

**How it works**
Send: app adds the message to the outbox, emits `message:send`, server checks membership, inserts, updates the conversation preview and unread counters, emits `message:new` to every member, and acknowledges the sender. The app's realtime provider puts `message:new` into the message cache; the outbox entry disappears because a confirmed message with the same `clientMessageId` now exists.

**Files touched**
- `apps/api/src/modules/conversations/*`, `apps/api/src/modules/messages/*`, `apps/api/src/realtime/*`
- `apps/mobile/src/features/chat/*`, `apps/mobile/src/features/realtime/*`, `apps/mobile/src/lib/socket.ts`

**Concepts worth learning**
- Atomic update (`$inc`): the database changes the number itself, so two simultaneous messages cannot overwrite each other's count.
- Acknowledgement: a Socket.IO callback the server calls to confirm it handled an event.
- `useSyncExternalStore`: React's hook for reading state that lives outside React, used here for the outbox, typing and presence.

**Revisit if**
Group chats grow large (the per-message member lookup and `updateMany` become the first bottleneck), or the API runs as more than one process (presence and rate limits must move to Redis).

---

### D-008 — Message actions: edit, delete, reactions and reply rules
- **Date:** 2026-11-15
- **Step / milestone:** M3 — Message actions
- **Status:** Active
- **Type:** product | architecture | edge-case

**Context**
F-04 says a sender can edit and delete their own messages and any member can reply and react. The design doc gave one line for this ("only the sender edits or deletes; delete is a soft delete that leaves a placeholder; a reaction is one emoji per user per message, toggled") and the spec review (R2-18) listed four cases it did not answer. Reply (`replyToId`) was already built and tested in M2, so M3 adds the three write actions on the server and the whole interaction on the phone. The rules below were chosen by Claude without asking, because each has an obvious default; change any of them and log it.

**Decision**
1. **Four endpoints, each safe to repeat.** `PATCH /messages/:id` (edit), `DELETE /messages/:id` (delete), `PUT /messages/:id/reaction` (set my reaction), `DELETE /messages/:id/reaction` (remove my reaction). All return the message in its new state and push `message:updated` to every member.
2. **Reactions are "set" and "clear", not "toggle", on the server.** The app decides what a tap means (tap my current emoji = clear, tap another = set). A toggle endpoint does the opposite thing when a request is retried or a button is tapped twice; "set" and "clear" give the same result however often they run.
3. **One reaction per member per message, from a fixed set of six** (`REACTION_EMOJIS` in `packages/shared`). Picking a second emoji replaces the first. A fixed set means the picker is one row, there is no emoji-keyboard dependency, and the server can validate the input against a list.
4. **A reaction change is one atomic database statement.** It is an update pipeline: remove me from every group, drop groups that became empty, then add me to the chosen group (creating it if needed). Because MongoDB applies a pipeline update to a document in one step, two students reacting at the same moment cannot overwrite each other, and one student sending two different emoji at once still ends with exactly one.
5. **No time limit on editing.** A message can be edited at any time and shows "Edited". Editing to the same text is a no-op and does not mark it edited. Only the text can change.
6. **Delete erases the content.** The row stays (so the chat keeps its shape and replies still have something to point at) but the text and reactions are removed from the database, not only hidden by the API. A deleted message cannot be edited or reacted to (`409 message_deleted`). Deleting twice returns the same result.
7. **A reply to a deleted message keeps its quote box**, which reads "Message deleted". **A deleted thread root** keeps its thread: the root shows the placeholder and the replies stay readable.
8. **Who may do what.** Edit and delete: the sender only (`403` for another member). React: any member. A student outside the conversation gets `404` for every action, so the API does not reveal that the message exists.
9. **The chat list preview follows the newest message.** If the newest message is edited or deleted, the preview text is rewritten ("Message deleted" for a delete) and members get `conversation:changed`. Older messages do not touch the preview.

**Alternatives considered**
| Option | Why not chosen |
|---|---|
| One `POST /reactions` toggle endpoint | Not safe to retry: a repeated request undoes the first |
| `$pull` then `$addToSet` as two updates | Two requests from the same student can interleave and leave two reactions |
| Any emoji allowed | Needs a picker library and length/shape validation of arbitrary unicode |
| Several reactions per member (Slack style) | The design doc says one; one is also simpler to show |
| Edit window (for example 15 minutes) | Adds a rule and a failure state with no benefit for a campus demo |
| Keep the deleted text in the database | "Delete" that keeps the content is a privacy surprise |

**How it works**
Every action starts with `requireMessage`, which loads the message and checks that the caller is a member of its conversation. Edit and delete then check the sender. The write itself repeats the important condition in its filter (`deletedAt: null`), so a delete that lands between the check and the write wins and the edit is refused instead of bringing the text back. The preview update uses the same idea: it only matches the conversation while `lastMessageAt` still equals this message's creation time, so it can never overwrite the preview of a newer message.

**On the phone**
- A long press on a message opens a bottom sheet (`MessageActionSheet`): a row of the six reactions, Reply, and for my own messages Edit and Delete. Delete asks once more inside the same sheet ("Delete this message for everyone?") and shows a spinner while the request runs, so it cannot be sent twice. The sheet stays open if the delete fails.
- Reply and edit reuse the composer. A yellow banner above the input says "Replying to …" or "Editing message" and has a cancel button. In edit mode the input starts with the old text, the button reads "Save", and the text is kept if saving fails.
- Reaction chips under a bubble are tappable: tap someone's reaction to add the same one, tap your own (yellow) to remove it.
- **Reactions are optimistic, edit and delete are not.** A reaction shows the moment it is tapped and is undone with an alert if the server refuses. Edit and delete wait for the server, because showing a message as deleted and then bringing it back would be worse than a short spinner.
- `ChatRoom` now holds the message list, composer and sheet together, so group and club chats (M4, M5) get message actions by rendering the same component.
- Failures are shown with the system alert (`Alert.alert`). The app has no toast component yet and one was not worth adding for this.

**Files touched**
- `packages/shared/src/chat.ts` (`REACTION_EMOJIS`, `reactInput`)
- `apps/api/src/modules/messages/messageActions.service.ts`, `messages.routes.ts`, `messages.service.ts`, `apps/api/src/app.ts`
- `apps/api/tests/messageActions.test.ts`
- `apps/mobile/src/features/chat/ChatRoom.tsx`, `MessageActionSheet.tsx`, `useMessageActions.ts`, `cache.ts`, `Composer.tsx`, `MessageBubble.tsx`, `ChatScreen.tsx`
- `apps/mobile/src/app/chat/[id].tsx`, `apps/mobile/src/lib/api.ts`, `apps/mobile/src/__tests__/messageActions.test.tsx`

**Concepts worth learning**
- Idempotent: an operation that gives the same result whether it runs once or many times. `PUT` and `DELETE` are meant to be idempotent; a toggle is not.
- Update pipeline: an update written as aggregation stages, which can compute the new value from the old one inside the database, in one atomic step.
- Guarded write: putting the condition you checked into the update's filter, so the check and the write cannot be separated by another request.
- Soft delete: marking a record as deleted instead of removing it, so things that refer to it keep working.
- Optimistic update: showing the result of an action before the server confirms it, and undoing it if the server says no.

**Revisit if**
Attachments ship (M8): deleting a message must also remove its files from disk. Threads ship (M8): confirm the deleted-root behaviour in the thread screen.
