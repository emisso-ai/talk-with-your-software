import { vi } from "vitest";
import type { SandboxHandle, SandboxCommandResult } from "../../src/types";

export function createMockCommandResult(
  overrides?: Partial<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>,
): SandboxCommandResult {
  return {
    exitCode: overrides?.exitCode ?? 0,
    stdout: vi.fn().mockResolvedValue(overrides?.stdout ?? ""),
    stderr: vi.fn().mockResolvedValue(overrides?.stderr ?? ""),
  };
}

export function createMockSandbox(
  overrides?: Partial<SandboxHandle>,
): SandboxHandle {
  return {
    sandboxId: "test-sandbox-123",
    stop: vi.fn().mockResolvedValue(undefined),
    writeFiles: vi.fn().mockResolvedValue(undefined),
    runCommand: vi.fn().mockResolvedValue(createMockCommandResult()),
    snapshot: vi.fn().mockResolvedValue({ snapshotId: "snap-test" }),
    ...overrides,
  };
}
