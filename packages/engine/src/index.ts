/**
 * @emisso/talk — Talk with your software
 *
 * Code navigation engine powered by Claude Code + Vercel Sandbox.
 * Point it at your repo, ask questions, get answers from the actual source code.
 */

export type {
  TalkConfig,
  TalkRequest,
  TalkResult,
  CodeSnippet,
  TokenUsage,
  QueryCategory,
  QueryClassification,
  ExtractedEntities,
  ModelPricing,
  SandboxHandle,
  SandboxCommandResult,
} from "./types";

export {
  talkConfigSchema,
  DEFAULT_MODEL,
  QUERY_CATEGORIES,
  MODEL_PRICING,
  estimateCost,
} from "./types";

export { navigate } from "./navigate";

export { classifyQuery } from "./classifier/query-classifier";

export { createSandbox, cloneRepo, WORKSPACE_DIR } from "./sandbox/sandbox-service";

export {
  installClaudeCode,
  executeClaudeCode,
  buildSystemPrompt,
  buildRunnerScript,
  parseClaudeOutput,
} from "./providers/claude-provider";
