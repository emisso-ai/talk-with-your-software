import { describe, it, expect } from "vitest";
import {
  estimateCost,
  talkConfigSchema,
  MODEL_PRICING,
  DEFAULT_MODEL,
  QUERY_CATEGORIES,
} from "../src/types";

describe("estimateCost", () => {
  it("haiku with known tokens → hand-verified cost", () => {
    // (1000/1e6)*0.8 + (500/1e6)*4.0 = 0.0008 + 0.002 = 0.0028
    expect(estimateCost("claude-haiku-4-5-20251001", { inputTokens: 1000, outputTokens: 500 })).toBe(0.0028);
  });

  it("sonnet with known tokens", () => {
    // (10000/1e6)*3.0 + (2000/1e6)*15.0 = 0.03 + 0.03 = 0.06
    expect(estimateCost("claude-sonnet-4-6", { inputTokens: 10000, outputTokens: 2000 })).toBe(0.06);
  });

  it("opus with known tokens", () => {
    // (5000/1e6)*15.0 + (1000/1e6)*75.0 = 0.075 + 0.075 = 0.15
    expect(estimateCost("claude-opus-4-6", { inputTokens: 5000, outputTokens: 1000 })).toBe(0.15);
  });

  it("unknown model falls back to DEFAULT_MODEL pricing", () => {
    const result = estimateCost("nonexistent-model", { inputTokens: 1000, outputTokens: 500 });
    const expected = estimateCost(DEFAULT_MODEL, { inputTokens: 1000, outputTokens: 500 });
    expect(result).toBe(expected);
  });

  it("zero tokens → 0", () => {
    expect(estimateCost("claude-haiku-4-5-20251001", { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it("rounds to 6 decimal places", () => {
    const result = estimateCost("claude-haiku-4-5-20251001", { inputTokens: 1, outputTokens: 1 });
    const decimals = result.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(6);
  });
});

describe("talkConfigSchema", () => {
  const validConfig = {
    anthropicApiKey: "sk-test-key-123456",
    repo: "owner/repo",
    githubToken: "ghp_test123",
  };

  it("minimal valid config parses correctly", () => {
    const parsed = talkConfigSchema.parse(validConfig);
    expect(parsed.anthropicApiKey).toBe("sk-test-key-123456");
    expect(parsed.repo).toBe("owner/repo");
    expect(parsed.githubToken).toBe("ghp_test123");
  });

  it("applies defaults: model, maxTurns, timeoutMs, vcpus", () => {
    const parsed = talkConfigSchema.parse(validConfig);
    expect(parsed.model).toBe(DEFAULT_MODEL);
    expect(parsed.maxTurns).toBe(20);
    expect(parsed.timeoutMs).toBe(120_000);
    expect(parsed.vcpus).toBe(2);
  });

  it("missing anthropicApiKey → throws", () => {
    expect(() => talkConfigSchema.parse({ repo: "a/b", githubToken: "t" })).toThrow();
  });

  it("missing repo → throws", () => {
    expect(() => talkConfigSchema.parse({ anthropicApiKey: "k", githubToken: "t" })).toThrow();
  });

  it("missing githubToken → throws", () => {
    expect(() => talkConfigSchema.parse({ anthropicApiKey: "k", repo: "a/b" })).toThrow();
  });

  it("invalid repo format (no slash) → throws", () => {
    expect(() => talkConfigSchema.parse({ ...validConfig, repo: "noslash" })).toThrow();
  });

  it("empty apiKey → throws", () => {
    expect(() => talkConfigSchema.parse({ ...validConfig, anthropicApiKey: "" })).toThrow();
  });

  it("maxTurns 0 → throws (min 1)", () => {
    expect(() => talkConfigSchema.parse({ ...validConfig, maxTurns: 0 })).toThrow();
  });

  it("maxTurns 101 → throws (max 100)", () => {
    expect(() => talkConfigSchema.parse({ ...validConfig, maxTurns: 101 })).toThrow();
  });

  it("timeoutMs 5000 → throws (min 10000)", () => {
    expect(() => talkConfigSchema.parse({ ...validConfig, timeoutMs: 5000 })).toThrow();
  });

  it("optional fields accepted", () => {
    const parsed = talkConfigSchema.parse({
      ...validConfig,
      revision: "v1.0",
      systemPrompt: "Be concise",
      instructionFileContent: "# Project",
      allowedDomains: ["example.com"],
    });
    expect(parsed.revision).toBe("v1.0");
    expect(parsed.systemPrompt).toBe("Be concise");
    expect(parsed.instructionFileContent).toBe("# Project");
    expect(parsed.allowedDomains).toEqual(["example.com"]);
  });
});

describe("MODEL_PRICING", () => {
  it("has entries for all expected models", () => {
    expect(MODEL_PRICING).toHaveProperty("claude-opus-4-6");
    expect(MODEL_PRICING).toHaveProperty("claude-sonnet-4-6");
    expect(MODEL_PRICING).toHaveProperty("claude-haiku-4-5-20251001");
    expect(MODEL_PRICING).toHaveProperty("claude-haiku-4-5");
  });

  it("haiku is cheapest, opus is most expensive", () => {
    const haiku = MODEL_PRICING["claude-haiku-4-5-20251001"]!;
    const sonnet = MODEL_PRICING["claude-sonnet-4-6"]!;
    const opus = MODEL_PRICING["claude-opus-4-6"]!;
    expect(haiku.inputPerMillionTokens).toBeLessThan(sonnet.inputPerMillionTokens);
    expect(sonnet.inputPerMillionTokens).toBeLessThan(opus.inputPerMillionTokens);
  });
});

describe("QUERY_CATEGORIES", () => {
  it("has 7 categories", () => {
    expect(QUERY_CATEGORIES).toHaveLength(7);
  });

  it("includes expected categories", () => {
    expect(QUERY_CATEGORIES).toContain("code_lookup");
    expect(QUERY_CATEGORIES).toContain("architecture");
    expect(QUERY_CATEGORIES).toContain("troubleshoot");
  });
});
