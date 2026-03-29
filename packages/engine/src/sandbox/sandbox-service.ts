import type { SandboxHandle, TalkConfig } from "../types";

export const WORKSPACE_DIR = "/vercel/sandbox/workspace";

const DEFAULT_ALLOWED_DOMAINS = [
  "github.com",
  "*.github.com",
  "api.anthropic.com",
  "registry.npmjs.org",
  "*.npmjs.org",
];

export async function createSandbox(config: TalkConfig): Promise<SandboxHandle> {
  // Dynamic import to avoid requiring @vercel/sandbox at module load time.
  // The module name is constructed to prevent TypeScript from resolving it at build time.
  const moduleName = ["@vercel", "sandbox"].join("/");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let SandboxModule: any;
  try {
    SandboxModule = await (Function("m", "return import(m)")(moduleName) as Promise<any>);
  } catch {
    throw new Error(
      "@vercel/sandbox is required but not installed. Run: pnpm add @vercel/sandbox",
    );
  }

  const sandbox = await SandboxModule.Sandbox.create({
    timeoutMs: config.timeoutMs ?? 120_000,
    vcpus: config.vcpus ?? 2,
    allowedHosts: config.allowedDomains ?? DEFAULT_ALLOWED_DOMAINS,
  });

  return sandbox as SandboxHandle;
}

export async function cloneRepo(
  sandbox: SandboxHandle,
  repo: string,
  githubToken: string,
  revision?: string,
): Promise<string> {
  // Clone URL with token for private repos
  const cloneUrl = `https://x-access-token:${githubToken}@github.com/${repo}.git`;
  const repoName = repo.split("/")[1];
  const cwd = `${WORKSPACE_DIR}/${repoName}`;

  // Create workspace dir
  await sandbox.runCommand({ cmd: "mkdir", args: ["-p", WORKSPACE_DIR] });

  // Clone
  const cloneResult = await sandbox.runCommand({
    cmd: "git",
    args: ["clone", "--depth", "1", ...(revision ? ["--branch", revision] : []), cloneUrl, cwd],
    env: { GIT_TERMINAL_PROMPT: "0" },
  });

  if (cloneResult.exitCode !== 0) {
    const stderr = await cloneResult.stderr();
    // Redact token from error output to prevent leaking credentials
    const safeStderr = stderr.substring(0, 500).replace(/x-access-token:[^@]+@/g, "x-access-token:***@");
    throw new Error(`Clone failed for ${repo}: ${safeStderr}`);
  }

  return cwd;
}
