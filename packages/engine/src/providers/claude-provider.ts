import type {
  SandboxHandle,
  TalkConfig,
  TalkResult,
  QueryCategory,
  TokenUsage,
  CodeSnippet,
} from "../types";

// ============================================================================
// CATEGORY GUIDANCE
// ============================================================================

const CATEGORY_GUIDANCE: Record<QueryCategory, string> = {
  code_lookup: `INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.
Find the exact file, function, or definition the user is asking about.
Use Glob to locate files by name, Grep to search content, and Read to show the code.
Return the precise file path and relevant code snippet.
If a skill file is present at /vercel/sandbox/skill.md, follow its instructions.`,

  capability_check: `INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.
Determine whether the codebase supports the capability in question.
Search for relevant keywords, feature flags, config, and implementations.
Provide a definitive yes/no with evidence from the code.
If a skill file is present at /vercel/sandbox/skill.md, follow its instructions.`,

  architecture: `INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.
Analyze the project structure, dependencies, and how components connect.
Examine package.json, config files, directory layout, and key modules.
Describe the architecture with references to specific files and patterns.
If a skill file is present at /vercel/sandbox/skill.md, follow its instructions.`,

  implementation_how: `INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.
Trace how a specific feature is implemented across the codebase.
Follow the code path from entry point through business logic to data layer.
Reference specific files, functions, and types involved.
If a skill file is present at /vercel/sandbox/skill.md, follow its instructions.`,

  flow_trace: `INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.
Trace the complete execution flow across multiple files and layers.
Start from the entry point and follow every call, handler, and data transformation.
Map out the full chain with file paths and function names at each step.
If a skill file is present at /vercel/sandbox/skill.md, follow its instructions.`,

  troubleshoot: `INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.
Investigate potential causes for the bug, error, or unexpected behavior.
Search for error handling, edge cases, and related code paths.
Suggest specific fixes with file paths and line references.
If a skill file is present at /vercel/sandbox/skill.md, follow its instructions.`,

  general_product: `INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.
Answer high-level product questions by examining README, docs, and config files.
Look at package.json, landing pages, and onboarding flows for product context.
Ground every claim in actual code or documentation found in the repo.
If a skill file is present at /vercel/sandbox/skill.md, follow its instructions.`,
};

// ============================================================================
// INSTALL
// ============================================================================

export async function installClaudeCode(sandbox: SandboxHandle): Promise<void> {
  const result = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", "@anthropic-ai/claude-code"],
    sudo: true,
  });

  if (result.exitCode !== 0) {
    const stderr = await result.stderr();
    throw new Error(`Failed to install Claude Code: ${stderr.substring(0, 500)}`);
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

const ALLOWED_TOOLS = [
  "Read",
  "Glob",
  "Grep",
  "Bash(git log:git blame:git show:git diff:find:tree)",
  "Task",
].join(",");

function buildSystemPrompt(
  category: QueryCategory | undefined,
  customSystemPrompt: string | undefined,
): string {
  const parts: string[] = [];

  if (category && CATEGORY_GUIDANCE[category]) {
    parts.push(CATEGORY_GUIDANCE[category]);
  }

  if (customSystemPrompt) {
    parts.push(customSystemPrompt);
  }

  if (parts.length === 0) {
    parts.push(
      "INVESTIGATE FIRST: Always search the codebase before answering. Never answer from memory.",
    );
  }

  return parts.join("\n\n");
}

function buildRunnerScript(
  query: string,
  model: string,
  maxTurns: number,
  systemPrompt: string,
  cwd: string,
): string {
  // Escape backticks and backslashes for template literal embedding
  const escapedQuery = query.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
  const escapedSystem = systemPrompt
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  return `import { execFileSync } from "node:child_process";

const query = \`${escapedQuery}\`;
const systemPrompt = \`${escapedSystem}\`;

try {
  const result = execFileSync("claude", [
    "--print",
    "--output-format", "json",
    "--model", "${model}",
    "--max-turns", "${maxTurns}",
    "--dangerously-skip-permissions",
    "--allowedTools", "${ALLOWED_TOOLS}",
    "--system-prompt", systemPrompt,
    query,
  ], {
    cwd: "${cwd}",
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300_000,
    env: { ...process.env },
  });

  process.stdout.write(result);
} catch (err) {
  const output = err.stdout || err.stderr || err.message;
  process.stderr.write(String(output).substring(0, 5000));
  process.exit(1);
}
`;
}

function parseClaudeOutput(raw: string): {
  answer: string;
  codeSnippets: CodeSnippet[];
  filesExplored: string[];
  tokenUsage?: TokenUsage;
  costUsd: number;
} {
  try {
    const parsed = JSON.parse(raw);

    // Claude --output-format json returns { result, usage, ... }
    const answer = typeof parsed.result === "string" ? parsed.result : raw;

    const tokenUsage: TokenUsage | undefined = parsed.usage
      ? {
          inputTokens: parsed.usage.input_tokens ?? 0,
          outputTokens: parsed.usage.output_tokens ?? 0,
          cacheReadTokens: parsed.usage.cache_read_input_tokens,
          cacheCreationTokens: parsed.usage.cache_creation_input_tokens,
        }
      : undefined;

    // Extract file paths from the answer (lines that look like file paths)
    const filePathPattern = /(?:^|\s)((?:\/|\.\/|src\/|packages\/)[^\s:]+\.[a-zA-Z]{1,6})/gm;
    const filesExplored: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = filePathPattern.exec(answer)) !== null) {
      const fp = match[1].trim();
      if (!filesExplored.includes(fp)) {
        filesExplored.push(fp);
      }
    }

    // Extract code snippets from markdown code blocks
    const codeSnippets: CodeSnippet[] = [];
    const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g;
    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = codeBlockPattern.exec(answer)) !== null) {
      codeSnippets.push({
        filePath: "inline",
        content: blockMatch[1].trim(),
      });
    }

    // Estimate cost from token usage
    let costUsd = 0;
    if (tokenUsage) {
      // Use Haiku pricing as default estimate
      costUsd =
        (tokenUsage.inputTokens * 0.8) / 1_000_000 +
        (tokenUsage.outputTokens * 4.0) / 1_000_000;
    }

    return { answer, codeSnippets, filesExplored, tokenUsage, costUsd };
  } catch {
    // If not valid JSON, treat the raw output as the answer
    return {
      answer: raw,
      codeSnippets: [],
      filesExplored: [],
      costUsd: 0,
    };
  }
}

export async function executeClaudeCode(
  sandbox: SandboxHandle,
  config: TalkConfig,
  query: string,
  cwd: string,
  queryCategory?: QueryCategory,
): Promise<TalkResult> {
  const startTime = Date.now();
  const model = config.model ?? "claude-haiku-4-5-20251001";
  const maxTurns = config.maxTurns ?? 20;

  // 1. Write instruction file (CLAUDE.md) if provided
  if (config.instructionFileContent) {
    await sandbox.writeFiles([
      {
        path: `${cwd}/CLAUDE.md`,
        content: Buffer.from(config.instructionFileContent, "utf-8"),
      },
    ]);
  }

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(queryCategory, config.systemPrompt);

  // 3. Build and write runner script
  const runnerScript = buildRunnerScript(query, model, maxTurns, systemPrompt, cwd);
  await sandbox.writeFiles([
    {
      path: "/vercel/sandbox/runner.mjs",
      content: Buffer.from(runnerScript, "utf-8"),
    },
  ]);

  // 4. Execute runner
  const result = await sandbox.runCommand({
    cmd: "node",
    args: ["/vercel/sandbox/runner.mjs"],
    env: {
      ANTHROPIC_API_KEY: config.anthropicApiKey,
      HOME: "/root",
      PATH: "/usr/local/bin:/usr/bin:/bin",
    },
  });

  const durationMs = Date.now() - startTime;

  if (result.exitCode !== 0) {
    const stderr = await result.stderr();
    return {
      success: false,
      answer: "",
      codeSnippets: [],
      filesExplored: [],
      costUsd: 0,
      durationMs,
      model,
      queryCategory,
      error: {
        code: "CLAUDE_EXECUTION_FAILED",
        message: `Claude Code exited with code ${result.exitCode}`,
        details: stderr.substring(0, 2000),
      },
    };
  }

  const stdout = await result.stdout();
  const parsed = parseClaudeOutput(stdout);

  return {
    success: true,
    answer: parsed.answer,
    codeSnippets: parsed.codeSnippets,
    filesExplored: parsed.filesExplored,
    costUsd: parsed.costUsd,
    durationMs,
    model,
    tokenUsage: parsed.tokenUsage,
    queryCategory,
  };
}
