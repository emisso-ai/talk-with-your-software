# @emisso/talk — Talk with your Software

An open-source SDK that adds an AI chatbox to your app where users can ask questions about your software. Powered by **Claude Code** running in **Vercel Sandbox** against your actual source code.

> "How do I set up SSO?" "Where do I add a new user?" "How does billing work?"

Your users ask questions. Claude Haiku explores your codebase. They get accurate, up-to-date answers.

## How it works

```
User asks a question
       ↓
Query classified (code_lookup, architecture, troubleshoot, etc.)
       ↓
Vercel Sandbox microVM created
       ↓
Your repo cloned into the sandbox
       ↓
Claude Code (Haiku) explores the code with Read, Grep, Glob, Bash
       ↓
Structured answer streamed back to the widget
```

No RAG. No embeddings. No vector database. Claude reads your actual code every time.

## Quick Start

### 1. Install

```bash
pnpm add @emisso/talk-next @emisso/talk-react @ai-sdk/anthropic ai
```

### 2. Create the API route

```ts
// app/api/talk/route.ts
import { createTalkRouter } from '@emisso/talk-next'

export const { POST } = createTalkRouter({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  repo: 'your-org/your-app',
  githubToken: process.env.GITHUB_TOKEN!,
})
```

### 3. Add the widget

```tsx
// app/page.tsx
import { TalkWidget } from '@emisso/talk-react'

export default function Page() {
  return (
    <>
      <YourApp />
      <TalkWidget
        endpoint="/api/talk"
        appName="My App"
        primaryColor="#10b981"
      />
    </>
  )
}
```

That's it. Your users can now ask questions about your software.

## Packages

| Package | Description |
|---------|-------------|
| `@emisso/talk` | Core engine — sandbox, Claude provider, query classifier, skills |
| `@emisso/talk-react` | React chat widget — floating chatbox with animations |
| `@emisso/talk-next` | Next.js adapter — `createTalkRouter()` for App Router |

## Configuration

### `createTalkRouter` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `anthropicApiKey` | `string` | required | Your Anthropic API key |
| `repo` | `string` | required | GitHub repo (`owner/name`) |
| `githubToken` | `string` | required | GitHub PAT for cloning |
| `model` | `string` | `claude-haiku-4-5-20251001` | Claude model ID |
| `maxTurns` | `number` | `20` | Max CLI agent turns per query |
| `timeoutMs` | `number` | `120000` | Execution timeout (ms) |
| `vcpus` | `number` | `2` | Sandbox vCPUs (1-8) |
| `revision` | `string` | `undefined` | Branch/tag/commit |
| `systemPrompt` | `string` | `undefined` | Custom system prompt |
| `instructionFileContent` | `string` | `undefined` | CLAUDE.md content |
| `onRequest` | `function` | `undefined` | Middleware (auth, rate limit) |

### `<TalkWidget>` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | `string` | required | API route URL |
| `appName` | `string` | `"Assistant"` | Name shown in header |
| `position` | `string` | `"bottom-right"` | `bottom-right` or `bottom-left` |
| `primaryColor` | `string` | `"#10b981"` | Accent color |
| `greeting` | `string` | `"Ask me anything!"` | Welcome message |
| `placeholder` | `string` | `"Type a question..."` | Input placeholder |
| `launcherIcon` | `string` | `"chat"` | `chat`, `help`, or `question` |
| `onOpen` | `function` | `undefined` | Called when widget opens |
| `onClose` | `function` | `undefined` | Called when widget closes |

### Programmatic API

```tsx
const talkRef = useRef<TalkWidgetRef>(null)

talkRef.current?.open()
talkRef.current?.close()
talkRef.current?.toggle()
```

## Query Categories

The engine classifies each question and selects the right exploration strategy:

| Category | Description | Example |
|----------|-------------|---------|
| `code_lookup` | Find specific code | "Show me the auth middleware" |
| `architecture` | Explain system structure | "How does billing work?" |
| `flow_trace` | Trace execution paths | "What happens when a user logs in?" |
| `capability_check` | Does feature X exist? | "Do we support SSO?" |
| `implementation_how` | How to implement X | "How would I add webhooks?" |
| `troubleshoot` | Debug a problem | "Why is webhook delivery failing?" |
| `general_product` | Product usage | "What fields are required to create an event?" |

## Advanced Usage

### Custom instruction file

Write a `CLAUDE.md` for your repo to give the agent context:

```ts
export const { POST } = createTalkRouter({
  // ...
  instructionFileContent: `
# My App

## Tech Stack
Next.js, Prisma, PostgreSQL, Stripe

## Key Patterns
- All API routes use middleware chain in src/middleware/
- Database models in src/db/schema/
- Business logic in src/services/
  `,
})
```

### Auth middleware

```ts
export const { POST } = createTalkRouter({
  // ...
  onRequest: async (req) => {
    const token = req.headers.get('Authorization')
    if (!token || !isValidToken(token)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  },
})
```

### Using the engine directly

```ts
import { navigate } from '@emisso/talk'

const result = await navigate(
  {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    repo: 'owner/repo',
    githubToken: process.env.GITHUB_TOKEN!,
    model: 'claude-haiku-4-5-20251001',
  },
  { query: 'How does authentication work?' }
)

console.log(result.answer)
console.log(result.codeSnippets)
console.log(`Cost: $${result.costUsd}`)
```

## Requirements

- Node.js >= 18
- Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
- GitHub personal access token (for repo cloning)
- Vercel deployment (for Vercel Sandbox microVMs)

## Cost

Claude Haiku is very affordable:
- **Input**: $0.80 / million tokens
- **Output**: $4.00 / million tokens
- A typical question costs **$0.01 - $0.05**

## License

MIT

## Contributing

Built by [Emisso](https://emisso.ai). PRs welcome.
