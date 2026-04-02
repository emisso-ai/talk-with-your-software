import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn()),
}));

import { classifyQuery } from "../src/classifier/query-classifier";
import { generateObject } from "ai";

const mockedGenerateObject = vi.mocked(generateObject);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("classifyQuery", () => {
  it("successful classification → returns correct structure", async () => {
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        category: "code_lookup",
        confidence: 0.95,
        reasoning: "User wants to find a function",
        entities: { functionName: "authenticate" },
      },
    } as any);

    const result = await classifyQuery("Where is the authenticate function?", "sk-test");
    expect(result.category).toBe("code_lookup");
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBe("User wants to find a function");
    expect(result.entities.functionName).toBe("authenticate");
  });

  it("API error → falls back to architecture with confidence 0", async () => {
    mockedGenerateObject.mockRejectedValueOnce(new Error("API unavailable"));

    const result = await classifyQuery("How does auth work?", "sk-test");
    expect(result.category).toBe("architecture");
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toContain("failed");
  });

  it("returns all entity fields (nullable)", async () => {
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        category: "architecture",
        confidence: 0.8,
        reasoning: "General question",
        entities: {},
      },
    } as any);

    const result = await classifyQuery("How is the project structured?", "sk-test");
    expect(result.entities).toBeDefined();
    expect(result.entities.featureName).toBeUndefined();
    expect(result.entities.fileName).toBeUndefined();
    expect(result.entities.functionName).toBeUndefined();
  });

  it("calls generateObject with anthropic provider", async () => {
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        category: "general_product",
        confidence: 0.7,
        reasoning: "Product question",
        entities: {},
      },
    } as any);

    await classifyQuery("What does this app do?", "sk-test-key");
    expect(mockedGenerateObject).toHaveBeenCalledTimes(1);
  });
});
