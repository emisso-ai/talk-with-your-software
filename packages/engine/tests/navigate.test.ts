import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/classifier/query-classifier", () => ({
  classifyQuery: vi.fn(),
}));
vi.mock("../src/sandbox/sandbox-service", () => ({
  createSandbox: vi.fn(),
  cloneRepo: vi.fn(),
}));
vi.mock("../src/providers/claude-provider", () => ({
  installClaudeCode: vi.fn(),
  executeClaudeCode: vi.fn(),
}));

import { navigate } from "../src/navigate";
import { classifyQuery } from "../src/classifier/query-classifier";
import { createSandbox, cloneRepo } from "../src/sandbox/sandbox-service";
import { installClaudeCode, executeClaudeCode } from "../src/providers/claude-provider";
import type { TalkConfig, TalkResult } from "../src/types";

const mockedClassify = vi.mocked(classifyQuery);
const mockedCreateSandbox = vi.mocked(createSandbox);
const mockedCloneRepo = vi.mocked(cloneRepo);
const mockedInstall = vi.mocked(installClaudeCode);
const mockedExecute = vi.mocked(executeClaudeCode);

const config: TalkConfig = {
  anthropicApiKey: "sk-test",
  repo: "test-org/test-repo",
  githubToken: "ghp_test123",
  model: "claude-haiku-4-5-20251001",
  maxTurns: 20,
  timeoutMs: 120_000,
  vcpus: 2,
};

const mockSandbox = {
  sandboxId: "sb-test-123",
  stop: vi.fn().mockResolvedValue(undefined),
  writeFiles: vi.fn().mockResolvedValue(undefined),
  runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: vi.fn(), stderr: vi.fn() }),
  snapshot: vi.fn().mockResolvedValue({ snapshotId: "snap" }),
};

const successResult: TalkResult = {
  success: true,
  answer: "The auth module is in src/auth.ts",
  codeSnippets: [],
  filesExplored: ["src/auth.ts"],
  costUsd: 0.003,
  durationMs: 5000,
  model: "claude-haiku-4-5-20251001",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedClassify.mockResolvedValue({
    category: "code_lookup",
    confidence: 0.9,
    reasoning: "Looking for code",
    entities: {},
  });
  mockedCreateSandbox.mockResolvedValue(mockSandbox as any);
  mockedCloneRepo.mockResolvedValue("/workspace/test-repo");
  mockedInstall.mockResolvedValue(undefined);
  mockedExecute.mockResolvedValue(successResult);
});

describe("navigate", () => {
  it("successful flow → returns TalkResult with success=true", async () => {
    const result = await navigate(config, { query: "Where is auth?" });
    expect(result.success).toBe(true);
    expect(result.answer).toBe("The auth module is in src/auth.ts");
  });

  it("includes queryCategory from classification", async () => {
    const result = await navigate(config, { query: "Where is auth?" });
    expect(result.queryCategory).toBe("code_lookup");
  });

  it("includes sandboxId", async () => {
    const result = await navigate(config, { query: "q" });
    expect(result.sandboxId).toBe("sb-test-123");
  });

  it("manual queryCategory → skips classifyQuery", async () => {
    await navigate(config, { query: "q", queryCategory: "troubleshoot" });
    expect(mockedClassify).not.toHaveBeenCalled();
  });

  it("without manual queryCategory → calls classifyQuery", async () => {
    await navigate(config, { query: "How does auth work?" });
    expect(mockedClassify).toHaveBeenCalledWith("How does auth work?", "sk-test");
  });

  it("sandbox creation throws → returns error result", async () => {
    mockedCreateSandbox.mockRejectedValueOnce(new Error("Sandbox quota exceeded"));
    const result = await navigate(config, { query: "q" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NAVIGATION_FAILED");
    expect(result.error?.message).toContain("Sandbox quota exceeded");
  });

  it("clone throws → returns error result", async () => {
    mockedCloneRepo.mockRejectedValueOnce(new Error("Clone failed"));
    const result = await navigate(config, { query: "q" });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Clone failed");
  });

  it("sandbox.stop() is called even on error", async () => {
    mockedCloneRepo.mockRejectedValueOnce(new Error("fail"));
    await navigate(config, { query: "q" });
    expect(mockSandbox.stop).toHaveBeenCalled();
  });

  it("sandbox.stop() failure is swallowed", async () => {
    mockSandbox.stop.mockRejectedValueOnce(new Error("stop failed"));
    const result = await navigate(config, { query: "q" });
    // Should not throw, should return success
    expect(result.success).toBe(true);
  });

  it("error result includes stack trace in details", async () => {
    const err = new Error("Something broke");
    mockedCloneRepo.mockRejectedValueOnce(err);
    const result = await navigate(config, { query: "q" });
    expect(result.error?.details).toContain("Error: Something broke");
  });

  it("durationMs is set", async () => {
    const result = await navigate(config, { query: "q" });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("calls both installClaudeCode and executeClaudeCode", async () => {
    await navigate(config, { query: "q" });
    expect(mockedInstall).toHaveBeenCalledTimes(1);
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });
});
