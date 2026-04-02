import { describe, it, expect, vi, beforeEach } from "vitest";
import { cloneRepo, createSandbox, WORKSPACE_DIR } from "../src/sandbox/sandbox-service";
import { createMockSandbox, createMockCommandResult } from "./helpers/mock-sandbox";
import type { TalkConfig } from "../src/types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WORKSPACE_DIR", () => {
  it("is a string path", () => {
    expect(typeof WORKSPACE_DIR).toBe("string");
    expect(WORKSPACE_DIR.length).toBeGreaterThan(0);
  });
});

describe("createSandbox", () => {
  it("throws when @vercel/sandbox is not installed", async () => {
    const config: TalkConfig = {
      anthropicApiKey: "sk-test",
      repo: "owner/repo",
      githubToken: "ghp_test",
      model: "claude-haiku-4-5-20251001",
      maxTurns: 20,
      timeoutMs: 120_000,
      vcpus: 2,
    };
    await expect(createSandbox(config)).rejects.toThrow("@vercel/sandbox");
  });
});

describe("cloneRepo", () => {
  it("creates workspace directory", async () => {
    const sandbox = createMockSandbox();
    await cloneRepo(sandbox, "owner/my-app", "ghp_token123");
    const calls = vi.mocked(sandbox.runCommand).mock.calls;
    expect(calls[0]![0]).toEqual(
      expect.objectContaining({ cmd: "mkdir", args: expect.arrayContaining(["-p", WORKSPACE_DIR]) }),
    );
  });

  it("clones with depth 1 and token URL", async () => {
    const sandbox = createMockSandbox();
    await cloneRepo(sandbox, "owner/my-app", "ghp_secret");
    const calls = vi.mocked(sandbox.runCommand).mock.calls;
    const cloneCall = calls[1]![0] as { cmd: string; args: string[] };
    expect(cloneCall.cmd).toBe("git");
    expect(cloneCall.args).toContain("clone");
    expect(cloneCall.args).toContain("--depth");
    expect(cloneCall.args).toContain("1");
    expect(cloneCall.args.some((a: string) => a.includes("ghp_secret"))).toBe(true);
  });

  it("returns correct cwd path", async () => {
    const sandbox = createMockSandbox();
    const cwd = await cloneRepo(sandbox, "owner/my-app", "ghp_token");
    expect(cwd).toBe(`${WORKSPACE_DIR}/my-app`);
  });

  it("with revision → includes --branch flag", async () => {
    const sandbox = createMockSandbox();
    await cloneRepo(sandbox, "owner/repo", "ghp_token", "v2.0");
    const calls = vi.mocked(sandbox.runCommand).mock.calls;
    const cloneCall = calls[1]![0] as { args: string[] };
    expect(cloneCall.args).toContain("--branch");
    expect(cloneCall.args).toContain("v2.0");
  });

  it("without revision → no --branch flag", async () => {
    const sandbox = createMockSandbox();
    await cloneRepo(sandbox, "owner/repo", "ghp_token");
    const calls = vi.mocked(sandbox.runCommand).mock.calls;
    const cloneCall = calls[1]![0] as { args: string[] };
    expect(cloneCall.args).not.toContain("--branch");
  });

  it("clone failure → throws", async () => {
    const sandbox = createMockSandbox({
      runCommand: vi
        .fn()
        .mockResolvedValueOnce(createMockCommandResult()) // mkdir OK
        .mockResolvedValueOnce(
          createMockCommandResult({
            exitCode: 128,
            stderr: "fatal: repository 'https://x-access-token:ghp_SECRETTOKEN@github.com/owner/repo.git' not found",
          }),
        ),
    });
    await expect(cloneRepo(sandbox, "owner/repo", "ghp_SECRETTOKEN")).rejects.toThrow();
  });

  it("SECURITY: thrown error does NOT contain the github token", async () => {
    const token = "ghp_SUPERSECRETTOKEN123";
    const sandbox = createMockSandbox({
      runCommand: vi
        .fn()
        .mockResolvedValueOnce(createMockCommandResult()) // mkdir
        .mockResolvedValueOnce(
          createMockCommandResult({
            exitCode: 128,
            stderr: `fatal: repository 'https://x-access-token:${token}@github.com/o/r.git' not found`,
          }),
        ),
    });
    try {
      await cloneRepo(sandbox, "o/r", token);
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as Error).message).not.toContain(token);
      expect((err as Error).message).toContain("x-access-token:***@");
    }
  });

  it("sets GIT_TERMINAL_PROMPT=0", async () => {
    const sandbox = createMockSandbox();
    await cloneRepo(sandbox, "owner/repo", "ghp_token");
    const calls = vi.mocked(sandbox.runCommand).mock.calls;
    const cloneCall = calls[1]![0] as { env: Record<string, string> };
    expect(cloneCall.env).toEqual(expect.objectContaining({ GIT_TERMINAL_PROMPT: "0" }));
  });

  it("extracts repo name correctly", async () => {
    const sandbox = createMockSandbox();
    const cwd = await cloneRepo(sandbox, "emisso-ai/emisso-app", "ghp_token");
    expect(cwd).toContain("emisso-app");
  });
});
