/**
 * @emisso/talk — Talk with your software
 *
 * Code navigation engine powered by Claude Code + Vercel Sandbox.
 * Point it at your repo, ask questions, get answers from the actual source code.
 */

// Core types
export type {
  TalkConfig,
  TalkRequest,
  TalkResult,
  CodeSnippet,
  TokenUsage,
  QueryCategory,
  QueryComplexity,
  QueryClassification,
  ExtractedEntities,
  ModelPricing,
  SandboxHandle,
  SandboxCommandResult,
} from "./types";

export { talkConfigSchema, CATEGORY_COMPLEXITY, MODEL_PRICING } from "./types";

// Main orchestrator
export { navigate } from "./navigate";

// Classifier (for advanced usage)
export { classifyQuery } from "./classifier/query-classifier";

// Sandbox utilities (for advanced usage)
export { createSandbox, cloneRepo, WORKSPACE_DIR } from "./sandbox/sandbox-service";
export { formatAnswer, extractCodeSnippets, extractFilesExplored } from "./sandbox/output-parser";

// Provider (for advanced usage)
export { installClaudeCode, executeClaudeCode } from "./providers/claude-provider";
