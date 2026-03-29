import type { TalkConfig, TalkRequest, TalkResult } from "./types";
import { classifyQuery } from "./classifier/query-classifier";
import { createSandbox, cloneRepo } from "./sandbox/sandbox-service";
import { installClaudeCode, executeClaudeCode } from "./providers/claude-provider";

export async function navigate(config: TalkConfig, request: TalkRequest): Promise<TalkResult> {
  const startTime = Date.now();
  let sandbox;

  try {
    // 1. Classify query (unless category provided)
    const classification = request.queryCategory
      ? { category: request.queryCategory, confidence: 1, reasoning: "manual", entities: {} }
      : await classifyQuery(request.query, config.anthropicApiKey);

    // 2. Create sandbox
    sandbox = await createSandbox(config);

    // 3. Clone repo
    const cwd = await cloneRepo(sandbox, config.repo, config.githubToken, config.revision);

    // 4. Install Claude Code
    await installClaudeCode(sandbox);

    // 5. Execute
    const result = await executeClaudeCode(sandbox, config, request.query, cwd, classification.category);

    return {
      ...result,
      queryCategory: classification.category,
      sandboxId: sandbox.sandboxId,
    };
  } catch (error) {
    return {
      success: false,
      answer: "",
      codeSnippets: [],
      filesExplored: [],
      costUsd: 0,
      durationMs: Date.now() - startTime,
      model: config.model ?? "claude-haiku-4-5-20251001",
      sandboxId: sandbox?.sandboxId,
      error: {
        code: "NAVIGATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : undefined,
      },
    };
  } finally {
    // Always stop sandbox
    if (sandbox) {
      await sandbox.stop().catch(() => {});
    }
  }
}
