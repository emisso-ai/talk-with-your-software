# CLAUDE.md

## Project

`@emisso/talk` — Talk with your Software SDK. Open-source monorepo with three packages:

- `packages/engine` (`@emisso/talk`) — Core: sandbox lifecycle, Claude provider, query classifier, skills
- `packages/react` (`@emisso/talk-react`) — React chat widget with Framer Motion animations
- `packages/next` (`@emisso/talk-next`) — Next.js App Router adapter (`createTalkRouter`)

## Commands

```bash
pnpm install             # Install all dependencies
pnpm -r build            # Build all packages
pnpm -r test             # Run tests
pnpm -r lint             # TypeScript check (tsc --noEmit)
```

## Structure

```
packages/engine/src/
  types.ts               # Zod schemas + TS types
  navigate.ts            # Main orchestrator
  classifier/            # Query classification (Haiku)
  sandbox/               # Vercel Sandbox lifecycle + output parsing
  providers/             # Claude Code execution
  skills/                # Methodology files for each query type

packages/react/src/
  talk-widget.tsx         # Top-level <TalkWidget /> component
  components/             # Chat UI components
  hooks/                  # useTalk() hook
  context/                # React context for widget state
  styles/                 # CSS variables + animations

packages/next/src/
  create-talk-router.ts   # createTalkRouter() → { POST }
```

## Conventions

- TypeScript strict mode, Zod at boundaries
- Dual CJS + ESM build via tsup
- MIT license
- Conventional Commits
- Changesets for versioning
- No Effect TS — plain TypeScript for OSS simplicity
