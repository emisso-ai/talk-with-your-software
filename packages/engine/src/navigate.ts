import { DEFAULT_MODEL, type TalkConfig, type TalkRequest, type TalkResult } from "./types";
import { classifyQuery } from "./classifier/query-classifier";
import { createSandbox, cloneRepo } from "./sandbox/sandbox-service";
import { installClaudeCode, executeClaudeCode } from "./providers/claude-provider";

export async function navigate(config: TalkConfig, request: TalkRequest): Promise<TalkResult> {
  const startTime = Date.now();
  let sandbox;

  try {
    // Run classification and sandbox creation in parallel (they are independent)
    const [classification, createdSandbox] = await Promise.all([
      request.queryCategory
        ? Promise.resolve({ category: request.queryCategory, confidence: 1, reasoning: "manual", entities: {} })
        : classifyQuery(request.query, config.anthropicApiKey),
      createSandbox(config),
    ]);

    sandbox = createdSandbox;

    const cwd = await cloneRepo(sandbox, config.repo, config.githubToken, config.revision);
    await installClaudeCode(sandbox);
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
      model: config.model ?? DEFAULT_MODEL,
      sandboxId: sandbox?.sandboxId,
      error: {
        code: "NAVIGATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : undefined,
      },
    };
  } finally {
    if (sandbox) {
      await sandbox.stop().catch(() => {});
    }
  }
}
