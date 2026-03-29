import { createTalkRouter } from "@emisso/talk-next";

export const { POST } = createTalkRouter({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  repo: process.env.GITHUB_REPO ?? "emisso-ai/talk-with-your-software",
  githubToken: process.env.GITHUB_TOKEN!,
  model: "claude-haiku-4-5-20251001",
});
