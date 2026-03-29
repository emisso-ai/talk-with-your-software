/**
 * Next.js App Router adapter for @emisso/talk
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

import {
  navigate,
  talkConfigSchema,
  QUERY_CATEGORIES,
  type TalkConfig,
  type TalkResult,
  type QueryCategory,
} from "@emisso/talk";

export type TalkRouterConfig = TalkConfig & {
  /**
   * Optional middleware to run before processing.
   * Return a Response to short-circuit, or void to continue.
   */
  onRequest?: (req: Request) => Promise<Response | void>;
};

const validCategories = new Set<string>(QUERY_CATEGORIES);

export function createTalkRouter(routerConfig: TalkRouterConfig) {
  const { onRequest, ...configInput } = routerConfig;
  const config: TalkConfig = talkConfigSchema.parse(configInput);

  async function POST(req: Request): Promise<Response> {
    try {
      if (onRequest) {
        const middlewareResponse = await onRequest(req);
        if (middlewareResponse) return middlewareResponse;
      }

      const body = (await req.json()) as Record<string, unknown>;
      const query = body.query;

      if (!query || typeof query !== "string") {
        return Response.json(
          { error: "Missing required field: query" },
          { status: 400 },
        );
      }

      const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
      const rawCategory = typeof body.queryCategory === "string" ? body.queryCategory : undefined;
      const queryCategory = rawCategory && validCategories.has(rawCategory)
        ? (rawCategory as QueryCategory)
        : undefined;

      const result: TalkResult = await navigate(config, {
        query,
        conversationId,
        queryCategory,
      });

      // Return as JSON (navigate is not streaming — the full result is available)
      return Response.json(result);
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
