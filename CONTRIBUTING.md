# Contributing to @emisso/talk

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/emisso-ai/talk-with-your-software.git
cd talk-with-your-software

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test:run

# Typecheck
pnpm lint
```

## Project Structure

```
packages/
  engine/   @emisso/talk        — Core: sandbox, Claude provider, classifier, skills
  react/    @emisso/talk-react  — React chat widget (Framer Motion)
  next/     @emisso/talk-next   — Next.js App Router adapter
examples/
  nextjs-app/                   — Working demo app
```

## Development Workflow

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** — follow the conventions below.
3. **Add a changeset** if your change affects published packages:
   ```bash
   pnpm changeset
   ```
4. **Verify** everything passes:
   ```bash
   pnpm build && pnpm lint && pnpm test:run
   ```
5. **Open a PR** against `main`.

## Conventions

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(engine): add support for custom providers
fix(react): prevent scroll jump on message send
docs: update README quick start
chore: bump dependencies
```

### Code Style

- **TypeScript strict mode** — no `any` unless absolutely necessary.
- **Zod at boundaries** — validate external input, use plain types internally.
- **No Effect TS** — plain TypeScript for OSS simplicity.
- **Minimal dependencies** — think twice before adding a new dependency.

### Testing

- Tests use **Vitest**.
- Run `pnpm test:run` for CI mode (single pass).
- Run `pnpm test` for watch mode during development.

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

After making changes that affect the published packages, run:

```bash
pnpm changeset
```

Choose the affected packages and the semver bump type:
- `patch` — bug fixes, minor improvements
- `minor` — new features, non-breaking changes
- `major` — breaking changes

## What to Contribute

### Good first issues

Look for issues labeled [`good first issue`](https://github.com/emisso-ai/talk-with-your-software/labels/good%20first%20issue).

### Ideas welcome

- New query classification categories
- Alternative providers (Gemini, Codex)
- Widget themes and customization options
- Framework adapters beyond Next.js (Express, Fastify, SvelteKit)
- Performance improvements
- Documentation and examples

## Reporting Issues

- **Bugs**: Include steps to reproduce, expected vs actual behavior, and your environment (Node version, OS).
- **Feature requests**: Describe the use case and why it matters.
- **Security issues**: Email hello@emisso.ai instead of opening a public issue.

## Code of Conduct

Be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
