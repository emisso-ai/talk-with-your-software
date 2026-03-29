# @emisso/talk — Talk with your Software

> Embeddable AI chatbox that answers questions about your software by exploring your actual source code with Claude Code in Vercel Sandbox.

## Overview

@emisso/talk is an open-source SDK that adds a chat widget to any app. Users ask natural-language questions ("How do I set up SSO?", "Where do I add a new user?") and get accurate answers powered by Claude Haiku exploring the real codebase — no RAG, no embeddings, no vector database.

## Architecture

```
User question → Query classifier (Haiku) → Vercel Sandbox μVM created →
Repo cloned → Claude Code explores with Read/Grep/Glob/Bash →
Structured answer returned → Widget displays it
```

Monorepo with three packages:

- **`packages/engine`** (`@emisso/talk`) — Core engine. Sandbox lifecycle, Claude Code provider, query classifier, skill methodology files, cost estimation.
- **`packages/react`** (`@emisso/talk-react`) — React chat widget. Floating launcher, animated chat panel (Framer Motion), message rendering with code blocks.
- **`packages/next`** (`@emisso/talk-next`) — Next.js App Router adapter. `createTalkRouter()` returns `{ POST }`.

## Getting Started

```bash
pnpm add @emisso/talk-next @emisso/talk-react @ai-sdk/anthropic ai
```

```typescript
// app/api/talk/route.ts
import { createTalkRouter } from '@emisso/talk-next'

export const { POST } = createTalkRouter({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  repo: 'owner/my-app',
  githubToken: process.env.GITHUB_TOKEN!,
})
```

```tsx
// app/page.tsx
import { TalkWidget } from '@emisso/talk-react'

<TalkWidget endpoint="/api/talk" appName="My App" primaryColor="#10b981" />
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/engine/src/index.ts` | Public API — all engine exports |
| `packages/engine/src/types.ts` | Zod schemas, TypeScript types, DEFAULT_MODEL, MODEL_PRICING |
| `packages/engine/src/navigate.ts` | Main orchestrator (classify → sandbox → clone → execute → return) |
| `packages/engine/src/classifier/query-classifier.ts` | LLM-based query classification (Haiku) |
| `packages/engine/src/providers/claude-provider.ts` | Claude Code execution in sandbox, runner script builder, output parser |
| `packages/engine/src/sandbox/sandbox-service.ts` | Vercel Sandbox lifecycle (create, clone) |
| `packages/engine/src/skills/index.ts` | Skill methodology files per query category |
| `packages/react/src/talk-widget.tsx` | Top-level `<TalkWidget />` component |
| `packages/react/src/context/talk-context.tsx` | Chat state management (messages, streaming, retry) |
| `packages/react/src/components/` | UI components (launcher, header, messages, input, typing indicator) |
| `packages/next/src/create-talk-router.ts` | `createTalkRouter()` — validates config, handles POST |

## Query Categories

The classifier routes each question to a category that selects the right exploration skill:

| Category | Skill | Example |
|----------|-------|---------|
| `code_lookup` | find-usages | "Show me the auth middleware" |
| `architecture` | explain-code | "How does billing work?" |
| `flow_trace` | explain-code | "What happens when a user logs in?" |
| `capability_check` | capability-check | "Do we support SSO?" |
| `implementation_how` | explain-code | "How are payments processed?" |
| `troubleshoot` | troubleshoot | "Why is webhook delivery failing?" |
| `general_product` | product-usage | "What fields are required to create an event?" |

## Development

```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages (tsup, CJS + ESM)
pnpm test:run             # Run tests (vitest)
pnpm lint                 # Typecheck (tsc --noEmit)
pnpm changeset            # Create a changeset for publishing
```

## Code Conventions

- TypeScript strict mode, Zod at boundaries
- No Effect TS — plain TypeScript for OSS simplicity
- Dual CJS + ESM build via tsup
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Changesets for versioning and npm publishing
- MIT license
