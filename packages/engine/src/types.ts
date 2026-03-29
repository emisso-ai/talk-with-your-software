/**
 * Core types for @emisso/talk
 *
 * Zod schemas at boundaries, plain TypeScript types internally.
 */

import { z } from "zod";

// ============================================================================
// QUERY CATEGORIES
// ============================================================================

export type QueryCategory =
  | "code_lookup"
  | "capability_check"
  | "architecture"
  | "implementation_how"
  | "flow_trace"
  | "troubleshoot"
  | "general_product";

export type QueryComplexity = "simple" | "moderate" | "complex";

export const CATEGORY_COMPLEXITY: Record<QueryCategory, QueryComplexity> = {
  code_lookup: "simple",
  capability_check: "moderate",
  architecture: "moderate",
  implementation_how: "moderate",
  flow_trace: "complex",
  troubleshoot: "moderate",
  general_product: "moderate",
};

// ============================================================================
// CONFIGURATION
// ============================================================================

export const talkConfigSchema = z.object({
  /** Anthropic API key for Claude Code execution. */
  anthropicApiKey: z.string().min(1),

  /** GitHub repository to navigate: "owner/repo". */
  repo: z.string().regex(/^[^/]+\/[^/]+$/),

  /** GitHub personal access token for cloning the repo. */
  githubToken: z.string().min(1),

  /** Claude model to use. Defaults to Haiku for cost efficiency. */
  model: z.string().default("claude-haiku-4-5-20251001"),

  /** Maximum CLI agent turns per query. Higher = deeper exploration + more cost. */
  maxTurns: z.number().int().min(1).max(100).default(20),

  /** Execution timeout in milliseconds. */
  timeoutMs: z.number().int().min(10_000).max(300_000).default(120_000),

  /** Number of vCPUs for the sandbox (1-8). */
  vcpus: z.number().int().min(1).max(8).default(2),

  /** Optional branch/tag/commit to check out. */
  revision: z.string().optional(),

  /** Optional system prompt prepended to every query. */
  systemPrompt: z.string().optional(),

  /** Optional instruction file content (CLAUDE.md) written to the sandbox. */
  instructionFileContent: z.string().optional(),

  /**
   * Allowed network domains for the sandbox.
   * Defaults to GitHub + Anthropic API + npm.
   */
  allowedDomains: z.array(z.string()).optional(),
});

export type TalkConfig = z.infer<typeof talkConfigSchema>;

// ============================================================================
// REQUEST / RESPONSE
// ============================================================================

export interface TalkRequest {
  /** The natural-language question to answer. */
  query: string;

  /** Optional conversation ID for session reuse (sandbox continuity). */
  conversationId?: string;

  /** Optional query category override (skips classification). */
  queryCategory?: QueryCategory;
}

export interface CodeSnippet {
  filePath: string;
  startLine?: number;
  endLine?: number;
  content: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface TalkResult {
  /** Whether the query completed successfully. */
  success: boolean;

  /** Natural-language answer from the CLI agent. */
  answer: string;

  /** Structured code snippets referenced in the answer. */
  codeSnippets: CodeSnippet[];

  /** File paths explored during execution. */
  filesExplored: string[];

  /** Estimated cost in USD for this query. */
  costUsd: number;

  /** Wall-clock duration in milliseconds. */
  durationMs: number;

  /** Which model was used. */
  model: string;

  /** Token usage (if reported by the CLI). */
  tokenUsage?: TokenUsage;

  /** Classified query category. */
  queryCategory?: QueryCategory;

  /** Sandbox ID for debugging. */
  sandboxId?: string;

  /** Error details if success is false. */
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

// ============================================================================
// QUERY CLASSIFICATION
// ============================================================================

export interface ExtractedEntities {
  featureName?: string;
  fileName?: string;
  functionName?: string;
}

export interface QueryClassification {
  category: QueryCategory;
  confidence: number;
  reasoning: string;
  entities: ExtractedEntities;
}

// ============================================================================
// SANDBOX ABSTRACTION
// ============================================================================

/** Result of a completed sandbox command. */
export interface SandboxCommandResult {
  exitCode: number;
  stdout(): Promise<string>;
  stderr(): Promise<string>;
}

/** Minimal sandbox handle interface (matches @vercel/sandbox subset). */
export interface SandboxHandle {
  sandboxId: string;
  stop(opts?: { signal?: AbortSignal }): Promise<void>;
  writeFiles(
    files: Array<{ path: string; content: Buffer }>,
    opts?: { signal?: AbortSignal },
  ): Promise<void>;
  runCommand(params: {
    cmd: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    sudo?: boolean;
    signal?: AbortSignal;
  }): Promise<SandboxCommandResult>;
  snapshot(opts?: { signal?: AbortSignal }): Promise<{ snapshotId: string }>;
}

// ============================================================================
// PRICING
// ============================================================================

export interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  cacheReadPerMillionTokens?: number;
  cacheCreationPerMillionTokens?: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-6": {
    inputPerMillionTokens: 15.0,
    outputPerMillionTokens: 75.0,
    cacheReadPerMillionTokens: 1.5,
    cacheCreationPerMillionTokens: 18.75,
  },
  "claude-sonnet-4-6": {
    inputPerMillionTokens: 3.0,
    outputPerMillionTokens: 15.0,
    cacheReadPerMillionTokens: 0.3,
    cacheCreationPerMillionTokens: 3.75,
  },
  "claude-haiku-4-5-20251001": {
    inputPerMillionTokens: 0.8,
    outputPerMillionTokens: 4.0,
    cacheReadPerMillionTokens: 0.08,
    cacheCreationPerMillionTokens: 1.0,
  },
  "claude-haiku-4-5": {
    inputPerMillionTokens: 0.8,
    outputPerMillionTokens: 4.0,
    cacheReadPerMillionTokens: 0.08,
    cacheCreationPerMillionTokens: 1.0,
  },
};
