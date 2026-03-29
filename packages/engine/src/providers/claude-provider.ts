import type {
  SandboxHandle,
  TalkConfig,
  TalkResult,
  QueryCategory,
  TokenUsage,
  CodeSnippet,
} from "../types";
import { DEFAULT_MODEL, estimateCost } from "../types";
import { getSkillFilesForCategory } from "../skills/index";

const INVESTIGATE_FIRST =
  "IMPORTANT: You MUST search and read the actual source code before answering. " +
  "Never answer from memory or the instruction file alone. " +
  "Use Grep, Glob, and Read tools to find the relevant code, then base your answer on what you find.";

const CATEGORY_GUIDANCE: Record<QueryCategory, string> = {
  code_lookup: `${INVESTIGATE_FIRST}
Find the exact file, function, or definition the user is asking about.
Return the precise file path and relevant code snippet.
For the full methodology, read .skills/find-usages.md`,

  capability_check: `${INVESTIGATE_FIRST}
Determine whether the codebase supports the capability in question.
Search for relevant keywords, feature flags, config, and implementations.
Provide a definitive YES/PARTIAL/NO verdict with evidence.
For the full methodology, read .skills/capability-check.md`,

  architecture: `${INVESTIGATE_FIRST}
Analyze the project structure, dependencies, and how components connect.
Examine package.json, config files, directory layout, and key modules.
Describe the architecture with references to specific files and patterns.
For the full methodology, read .skills/explain-code.md`,

  implementation_how: `${INVESTIGATE_FIRST}
Trace how a specific feature is implemented across the codebase.
Follow the code path from entry point through business logic to data layer.
Reference specific files, functions, and types involved.
For the full methodology, read .skills/explain-code.md`,

  flow_trace: `${INVESTIGATE_FIRST}
Trace the complete execution flow across multiple files and layers.
Start from the entry point and follow every call, handler, and data transformation.
Map out the full chain with file paths and function names at each step.
For the full methodology, read .skills/explain-code.md`,

  troubleshoot: `${INVESTIGATE_FIRST}
Investigate potential causes for the bug, error, or unexpected behavior.
Search for error handling, edge cases, and related code paths.
Suggest specific fixes with file paths and line references.
For the full methodology, read .skills/troubleshoot.md`,

  general_product: `${INVESTIGATE_FIRST}
Answer high-level product questions by examining README, docs, and config files.
Look at package.json, landing pages, and onboarding flows for product context.
Ground every claim in actual code or documentation found in the repo.
For the full methodology, read .skills/product-usage.md`,
};

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
    parts.push(INVESTIGATE_FIRST);
  }

  return parts.join("\n\n");
}

/**
 * Build the runner.mjs script that executes Claude Code in the sandbox.
 * Uses JSON.stringify for safe string embedding (no template literal injection).
 */
function buildRunnerScript(
  query: string,
  model: string,
  maxTurns: number,
  systemPrompt: string,
  cwd: string,
): string {
  return `import { execFileSync } from "node:child_process";

const query = ${JSON.stringify(query)};
const systemPrompt = ${JSON.stringify(systemPrompt)};

try {
  const result = execFileSync("claude", [
    "--print",
    "--output-format", "json",
    "--model", ${JSON.stringify(model)},
    "--max-turns", ${JSON.stringify(String(maxTurns))},
    "--dangerously-skip-permissions",
    "--allowedTools", ${JSON.stringify(ALLOWED_TOOLS)},
    "--system-prompt", systemPrompt,
    query,
  ], {
    cwd: ${JSON.stringify(cwd)},
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

function parseClaudeOutput(raw: string, model: string): {
  answer: string;
  codeSnippets: CodeSnippet[];
  filesExplored: string[];
  tokenUsage?: TokenUsage;
  costUsd: number;
} {
  try {
    const parsed = JSON.parse(raw);

    const answer = typeof parsed.result === "string" ? parsed.result : raw;

    const tokenUsage: TokenUsage | undefined = parsed.usage
      ? {
          inputTokens: parsed.usage.input_tokens ?? 0,
          outputTokens: parsed.usage.output_tokens ?? 0,
          cacheReadTokens: parsed.usage.cache_read_input_tokens,
          cacheCreationTokens: parsed.usage.cache_creation_input_tokens,
        }
      : undefined;

    const filePathPattern = /(?:^|\s)((?:\/|\.\/|src\/|packages\/)[^\s:]+\.[a-zA-Z]{1,6})/gm;
    const filesExplored: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = filePathPattern.exec(answer)) !== null) {
      const fp = match[1].trim();
      if (!filesExplored.includes(fp)) {
        filesExplored.push(fp);
      }
    }

    const codeSnippets: CodeSnippet[] = [];
    const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g;
    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = codeBlockPattern.exec(answer)) !== null) {
      codeSnippets.push({
        filePath: "inline",
        content: blockMatch[1].trim(),
      });
    }

    const costUsd = tokenUsage ? estimateCost(model, tokenUsage) : 0;

    return { answer, codeSnippets, filesExplored, tokenUsage, costUsd };
  } catch {
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
  const model = config.model ?? DEFAULT_MODEL;
  const maxTurns = config.maxTurns ?? 20;

  // Write instruction file (CLAUDE.md) if provided
  if (config.instructionFileContent) {
    await sandbox.writeFiles([
      {
        path: `${cwd}/CLAUDE.md`,
        content: Buffer.from(config.instructionFileContent, "utf-8"),
      },
    ]);
  }

  // Write skill files for the query category
  if (queryCategory) {
    const skillFiles = getSkillFilesForCategory(queryCategory).map((f) => ({
      path: `${cwd}/${f.path}`,
      content: f.content,
    }));
    if (skillFiles.length > 0) {
      await sandbox.writeFiles(skillFiles);
    }
  }

  const systemPrompt = buildSystemPrompt(queryCategory, config.systemPrompt);

  const runnerScript = buildRunnerScript(query, model, maxTurns, systemPrompt, cwd);
  await sandbox.writeFiles([
    {
      path: "/vercel/sandbox/runner.mjs",
      content: Buffer.from(runnerScript, "utf-8"),
    },
  ]);

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
  const parsed = parseClaudeOutput(stdout, model);

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
