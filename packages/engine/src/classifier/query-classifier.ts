import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { QUERY_CATEGORIES, DEFAULT_MODEL, type QueryClassification } from "../types";

const classificationSchema = z.object({
  category: z.enum(QUERY_CATEGORIES),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  entities: z.object({
    featureName: z.string().optional(),
    fileName: z.string().optional(),
    functionName: z.string().optional(),
  }),
});

const SYSTEM_PROMPT = `You are a query classifier for a codebase exploration tool. Classify the user's question into exactly one category.

Categories:
- code_lookup: Direct questions about specific code — "Where is X defined?", "Show me the function Y", "What file contains Z?"
- capability_check: Questions about whether the codebase supports something — "Does the app support SSO?", "Can users export to CSV?"
- architecture: Questions about system design, structure, or how components relate — "How is the database structured?", "What's the tech stack?"
- implementation_how: Questions about how a specific feature is implemented — "How does authentication work?", "How are payments processed?"
- flow_trace: Questions that require tracing execution across multiple files/layers — "What happens when a user clicks submit?", "Trace the request from API to DB"
- troubleshoot: Questions about bugs, errors, or debugging — "Why might X fail?", "What could cause this error?"
- general_product: High-level product questions not about code — "What does this product do?", "Who is the target user?"

Also extract any entities mentioned: feature names, file names, or function names.`;

/**
 * Classifies a user query into a category using Claude Haiku.
 * Falls back to "architecture" on timeout or error.
 */
export async function classifyQuery(
  query: string,
  anthropicApiKey: string,
): Promise<QueryClassification> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const anthropic = createAnthropic({ apiKey: anthropicApiKey });

    const { object } = await generateObject({
      model: anthropic(DEFAULT_MODEL),
      schema: classificationSchema,
      system: SYSTEM_PROMPT,
      prompt: query,
      temperature: 0.1,
      maxTokens: 200,
      abortSignal: controller.signal,
    });

    return {
      category: object.category,
      confidence: object.confidence,
      reasoning: object.reasoning,
      entities: {
        featureName: object.entities.featureName,
        fileName: object.entities.fileName,
        functionName: object.entities.functionName,
      },
    };
  } catch {
    return {
      category: "architecture",
      confidence: 0,
      reasoning: "Classification failed — falling back to architecture",
      entities: {},
    };
  } finally {
    clearTimeout(timeout);
  }
}
