# <Project Name>

<!-- One or two sentences: what this is and who it's for. Details live in docs/prd.md. -->

Delivery setup: `docs/architecture.md` §0. Engineering standards and workflow: `~/.claude/CLAUDE.md`.

## Stack
- Frontend: <e.g. Next.js (App Router), TypeScript, Tailwind>
- Backend: <e.g. Node.js + Express, TypeScript, Zod>
- Database: <e.g. MongoDB + Mongoose>
- Other: <e.g. Redis, SSE, auth provider>
- Testing: <e.g. Vitest (unit + integration), Supertest (API), Playwright (E2E)>
- Infra: <match Delivery setup in docs/architecture.md>
- Package manager: <npm | pnpm | bun>

## Commands
```bash
<pm> install              # install deps
<pm> run dev              # start dev server(s)
docker compose up         # only if Docker was chosen
<pm> run lint             # lint + typecheck
<pm> test                 # unit + integration tests
<pm> run test:coverage    # only if a coverage target was chosen
<pm> run test:e2e         # only if E2E was chosen
<pm> run build            # production build
```

## Codebase layout
```
<fill from docs/architecture.md — top 2 levels only>
```

## Docs
Read at session start: `docs/prd.md` (milestones + status), `docs/architecture.md`, and the latest
entries in `docs/decisions.md`. Backlog: `TODOS.md`. What shipped: `CHANGELOG.md`.

## Project-specific rules
<!-- Only rules that differ from or add to ~/.claude/CLAUDE.md. Keep this short. Examples:
- All API input validated with Zod schemas in src/schemas/.
- Never call the DB from route handlers; go through src/services/.
- Env vars are documented in .env.example; never read process.env outside src/config/. -->

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. Route only to skills in the session's available-skills list; answer directly for quick questions or small scoped edits.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /autoplan
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → fix them directly: one read-only check of the cause, or a focused failing test first when the cause is unclear; then fix it and run that test
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Building UI → once it renders, invoke /design-review --build <preview url> (opt-in)
- Ship/deploy/PR → invoke /ship (merge + deploy: the user types /land-and-deploy)
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
