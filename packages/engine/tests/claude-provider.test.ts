import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildSystemPrompt,
  buildRunnerScript,
  parseClaudeOutput,
  installClaudeCode,
  executeClaudeCode,
} from "../src/providers/claude-provider";
import { QUERY_CATEGORIES, type TalkConfig } from "../src/types";
import { createMockSandbox, createMockCommandResult } from "./helpers/mock-sandbox";

// ---------------------------------------------------------------------------
// parseClaudeOutput
// ---------------------------------------------------------------------------

describe("parseClaudeOutput", () => {
  it("valid JSON with result → extracts answer", () => {
    const raw = JSON.stringify({ result: "The function is in src/auth.ts" });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    expect(out.answer).toBe("The function is in src/auth.ts");
  });

  it("valid JSON with usage → extracts tokenUsage", () => {
    const raw = JSON.stringify({
      result: "answer",
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    expect(out.tokenUsage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: undefined,
      cacheCreationTokens: undefined,
    });
  });

  it("answer with code blocks → extracts codeSnippets", () => {
    const raw = JSON.stringify({
      result: "Here is the code:\n```ts\nconst x = 1;\n```\nDone.",
    });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    expect(out.codeSnippets.length).toBe(1);
    expect(out.codeSnippets[0]!.content).toBe("const x = 1;");
  });

  it("answer with file paths → extracts filesExplored", () => {
    const raw = JSON.stringify({
      result: "Found in src/auth/login.ts and ./utils/helpers.ts and packages/core/index.ts",
    });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    expect(out.filesExplored).toContain("src/auth/login.ts");
    expect(out.filesExplored).toContain("./utils/helpers.ts");
    expect(out.filesExplored).toContain("packages/core/index.ts");
  });

  it("duplicate file paths → deduplicated", () => {
    const raw = JSON.stringify({
      result: "See src/foo.ts and also src/foo.ts again",
    });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    const fooCount = out.filesExplored.filter((f) => f === "src/foo.ts").length;
    expect(fooCount).toBe(1);
  });

  it("invalid JSON → uses raw string as answer", () => {
    const out = parseClaudeOutput("not json at all", "claude-haiku-4-5-20251001");
    expect(out.answer).toBe("not json at all");
    expect(out.codeSnippets).toEqual([]);
    expect(out.filesExplored).toEqual([]);
    expect(out.costUsd).toBe(0);
  });

  it("empty string → graceful", () => {
    const out = parseClaudeOutput("", "claude-haiku-4-5-20251001");
    expect(out.answer).toBe("");
    expect(out.costUsd).toBe(0);
  });

  it("JSON without result field → uses raw JSON string", () => {
    const raw = JSON.stringify({ something: "else" });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    expect(out.answer).toBe(raw);
  });

  it("cost calculated from usage", () => {
    const raw = JSON.stringify({
      result: "ok",
      usage: { input_tokens: 1000, output_tokens: 500 },
    });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    expect(out.costUsd).toBeGreaterThan(0);
  });

  it("no usage → cost = 0", () => {
    const raw = JSON.stringify({ result: "ok" });
    const out = parseClaudeOutput(raw, "claude-haiku-4-5-20251001");
    expect(out.costUsd).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildSystemPrompt
// ---------------------------------------------------------------------------

describe("buildSystemPrompt", () => {
  it("with category code_lookup → includes lookup guidance", () => {
    const prompt = buildSystemPrompt("code_lookup", undefined);
    expect(prompt).toContain("Find the exact file");
  });

  it("with category troubleshoot → includes troubleshoot guidance", () => {
    const prompt = buildSystemPrompt("troubleshoot", undefined);
    expect(prompt).toContain("Investigate potential causes");
  });

  it("with customSystemPrompt → includes it", () => {
    const prompt = buildSystemPrompt(undefined, "Be concise and direct");
    expect(prompt).toContain("Be concise and direct");
  });

  it("with both category + custom → includes both", () => {
    const prompt = buildSystemPrompt("architecture", "Extra instructions");
    expect(prompt).toContain("Analyze the project structure");
    expect(prompt).toContain("Extra instructions");
  });

  it("with neither → includes INVESTIGATE_FIRST fallback", () => {
    const prompt = buildSystemPrompt(undefined, undefined);
    expect(prompt).toContain("IMPORTANT: You MUST search");
  });

  it("every category produces non-empty string", () => {
    for (const category of QUERY_CATEGORIES) {
      const prompt = buildSystemPrompt(category, undefined);
      expect(prompt.length, `${category} should produce prompt`).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// buildRunnerScript
// ---------------------------------------------------------------------------

describe("buildRunnerScript", () => {
  it("contains the query text", () => {
    const script = buildRunnerScript("How does auth work?", "model", 20, "system", "/app");
    expect(script).toContain("How does auth work?");
  });

  it("contains the model name", () => {
    const script = buildRunnerScript("q", "claude-haiku-4-5", 20, "sys", "/app");
    expect(script).toContain("claude-haiku-4-5");
  });

  it("contains maxTurns as string", () => {
    const script = buildRunnerScript("q", "m", 30, "sys", "/app");
    expect(script).toContain("30");
  });

  it("query with backticks and template literals → safely escaped in JSON string", () => {
    const evil = "test `${process.exit(1)}` injection";
    const script = buildRunnerScript(evil, "m", 10, "sys", "/app");
    // JSON.stringify wraps the query in double quotes, so backtick templates are inert strings
    // The dangerous pattern would be if the query appeared in a template literal context
    expect(script).toContain(JSON.stringify(evil));
  });

  it("query with newlines → properly embedded", () => {
    const script = buildRunnerScript("line1\nline2\nline3", "m", 10, "sys", "/app");
    // Should be in a JSON string, not raw newlines breaking syntax
    expect(script).toContain("\\n");
  });

  it("includes --dangerously-skip-permissions", () => {
    const script = buildRunnerScript("q", "m", 10, "sys", "/app");
    expect(script).toContain("--dangerously-skip-permissions");
  });

  it("includes --allowedTools", () => {
    const script = buildRunnerScript("q", "m", 10, "sys", "/app");
    expect(script).toContain("--allowedTools");
  });
});

// ---------------------------------------------------------------------------
// installClaudeCode (mock sandbox)
// ---------------------------------------------------------------------------

describe("installClaudeCode", () => {
  it("calls npm install with sudo", async () => {
    const sandbox = createMockSandbox();
    await installClaudeCode(sandbox);
    expect(sandbox.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        cmd: "npm",
        args: expect.arrayContaining(["install", "-g", "@anthropic-ai/claude-code"]),
        sudo: true,
      }),
    );
  });

  it("exitCode 0 → resolves", async () => {
    const sandbox = createMockSandbox();
    await expect(installClaudeCode(sandbox)).resolves.toBeUndefined();
  });

  it("exitCode 1 → throws with stderr", async () => {
    const sandbox = createMockSandbox({
      runCommand: vi.fn().mockResolvedValue(
        createMockCommandResult({ exitCode: 1, stderr: "npm ERR! not found" }),
      ),
    });
    await expect(installClaudeCode(sandbox)).rejects.toThrow("npm ERR! not found");
  });
});

// ---------------------------------------------------------------------------
// executeClaudeCode (mock sandbox)
// ---------------------------------------------------------------------------

describe("executeClaudeCode", () => {
  const config: TalkConfig = {
    anthropicApiKey: "sk-test",
    repo: "test/repo",
    githubToken: "ghp_test",
    model: "claude-haiku-4-5-20251001",
    maxTurns: 20,
    timeoutMs: 120_000,
    vcpus: 2,
  };

  it("writes runner.mjs to sandbox", async () => {
    const sandbox = createMockSandbox({
      runCommand: vi.fn().mockResolvedValue(
        createMockCommandResult({ stdout: JSON.stringify({ result: "ok" }) }),
      ),
    });
    await executeClaudeCode(sandbox, config, "test query", "/app");
    expect(sandbox.writeFiles).toHaveBeenCalled();
    const writeCall = vi.mocked(sandbox.writeFiles).mock.calls;
    const allFiles = writeCall.flatMap((c) => c[0]);
    expect(allFiles.some((f) => f.path === "/vercel/sandbox/runner.mjs")).toBe(true);
  });

  it("writes CLAUDE.md when instructionFileContent set", async () => {
    const configWithInstructions = { ...config, instructionFileContent: "# My Project" };
    const sandbox = createMockSandbox({
      runCommand: vi.fn().mockResolvedValue(
        createMockCommandResult({ stdout: JSON.stringify({ result: "ok" }) }),
      ),
    });
    await executeClaudeCode(sandbox, configWithInstructions, "q", "/app");
    const writeCall = vi.mocked(sandbox.writeFiles).mock.calls;
    const allFiles = writeCall.flatMap((c) => c[0]);
    expect(allFiles.some((f) => f.path === "/app/CLAUDE.md")).toBe(true);
  });

  it("does NOT write CLAUDE.md when instructionFileContent undefined", async () => {
    const sandbox = createMockSandbox({
      runCommand: vi.fn().mockResolvedValue(
        createMockCommandResult({ stdout: JSON.stringify({ result: "ok" }) }),
      ),
    });
    await executeClaudeCode(sandbox, config, "q", "/app");
    const writeCall = vi.mocked(sandbox.writeFiles).mock.calls;
    const allFiles = writeCall.flatMap((c) => c[0]);
    expect(allFiles.some((f) => f.path.endsWith("CLAUDE.md"))).toBe(false);
  });

  it("sets ANTHROPIC_API_KEY in env", async () => {
    const sandbox = createMockSandbox({
      runCommand: vi.fn().mockResolvedValue(
        createMockCommandResult({ stdout: JSON.stringify({ result: "ok" }) }),
      ),
    });
    await executeClaudeCode(sandbox, config, "q", "/app");
    expect(sandbox.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({ ANTHROPIC_API_KEY: "sk-test" }),
      }),
    );
  });

  it("successful run → returns success TalkResult", async () => {
    const sandbox = createMockSandbox({
      runCommand: vi.fn().mockResolvedValue(
        createMockCommandResult({
          stdout: JSON.stringify({ result: "The answer", usage: { input_tokens: 50, output_tokens: 20 } }),
        }),
      ),
    });
    const result = await executeClaudeCode(sandbox, config, "q", "/app");
    expect(result.success).toBe(true);
    expect(result.answer).toBe("The answer");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("failed run → returns error TalkResult", async () => {
    const sandbox = createMockSandbox({
      runCommand: vi.fn().mockResolvedValue(
        createMockCommandResult({ exitCode: 1, stderr: "Agent crashed" }),
      ),
    });
    const result = await executeClaudeCode(sandbox, config, "q", "/app");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("CLAUDE_EXECUTION_FAILED");
    expect(result.error?.details).toContain("Agent crashed");
  });
});
