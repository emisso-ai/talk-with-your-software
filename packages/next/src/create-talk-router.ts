/**
 * Next.js App Router adapter for @emisso/talk
 *
 * Creates a POST handler that receives chat queries, runs code navigation
 * via Vercel Sandbox + Claude Code, and streams the response back.
 *
 * Usage:
 *   // app/api/talk/route.ts
 *   import { createTalkRouter } from '@emisso/talk-next'
 *
 *   export const { POST } = createTalkRouter({
 *     anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
 *     repo: 'owner/my-app',
 *     githubToken: process.env.GITHUB_TOKEN!,
 *   })
 */

import { navigate, talkConfigSchema, type TalkConfig, type TalkResult, type TalkRequest } from "@emisso/talk";

// ============================================================================
// CONFIG
// ============================================================================

export interface TalkRouterConfig {
  /** Anthropic API key for Claude Code execution. */
  anthropicApiKey: string;

  /** GitHub repository to navigate: "owner/repo". */
  repo: string;

  /** GitHub personal access token for cloning. */
  githubToken: string;

  /** Claude model. Defaults to Haiku. */
  model?: string;

  /** Maximum CLI agent turns per query. */
  maxTurns?: number;

  /** Execution timeout in milliseconds. */
  timeoutMs?: number;

  /** Number of vCPUs for the sandbox. */
  vcpus?: number;

  /** Optional branch/tag/commit to check out. */
  revision?: string;

  /** Optional system prompt prepended to every query. */
  systemPrompt?: string;

  /** Optional CLAUDE.md instruction file content. */
  instructionFileContent?: string;

  /** Allowed network domains for the sandbox. */
  allowedDomains?: string[];

  /**
   * Optional middleware to run before processing.
   * Return a Response to short-circuit, or void to continue.
   */
  onRequest?: (req: Request) => Promise<Response | void>;
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export function createTalkRouter(routerConfig: TalkRouterConfig) {
  // Validate config at startup
  const config: TalkConfig = talkConfigSchema.parse({
    anthropicApiKey: routerConfig.anthropicApiKey,
    repo: routerConfig.repo,
    githubToken: routerConfig.githubToken,
    model: routerConfig.model,
    maxTurns: routerConfig.maxTurns,
    timeoutMs: routerConfig.timeoutMs,
    vcpus: routerConfig.vcpus,
    revision: routerConfig.revision,
    systemPrompt: routerConfig.systemPrompt,
    instructionFileContent: routerConfig.instructionFileContent,
    allowedDomains: routerConfig.allowedDomains,
  });

  async function POST(req: Request): Promise<Response> {
    try {
      // Run middleware if provided
      if (routerConfig.onRequest) {
        const middlewareResponse = await routerConfig.onRequest(req);
        if (middlewareResponse) return middlewareResponse;
      }

      // Parse request body
      const body = (await req.json()) as Record<string, unknown>;
      const query = body.query;

      if (!query || typeof query !== "string") {
        return Response.json(
          { error: "Missing required field: query" },
          { status: 400 },
        );
      }

      const conversationId = body.conversationId as string | undefined;
      const queryCategory = body.queryCategory as TalkRequest["queryCategory"];

      // Execute navigation
      const result: TalkResult = await navigate(config, {
        query,
        conversationId,
        queryCategory,
      });

      // Stream the response
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          if (result.success) {
            // Send the answer as a stream of chunks
            const chunks = splitIntoChunks(result.answer, 100);
            for (const chunk of chunks) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`
                )
              );
            }

            // Send metadata
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "metadata",
                  codeSnippets: result.codeSnippets,
                  filesExplored: result.filesExplored,
                  costUsd: result.costUsd,
                  durationMs: result.durationMs,
                  model: result.model,
                  queryCategory: result.queryCategory,
                })}\n\n`
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: result.error,
                })}\n\n`
              )
            );
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error("[TalkRouter] Error:", error);

      return Response.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  return { POST };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Split text into chunks for streaming.
 * Splits on word boundaries to avoid mid-word breaks.
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= chunkSize) {
      chunks.push(remaining);
      break;
    }

    // Find the last space within the chunk size
    let splitAt = remaining.lastIndexOf(" ", chunkSize);
    if (splitAt === -1 || splitAt === 0) {
      splitAt = chunkSize;
    }

    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }

  return chunks;
}
