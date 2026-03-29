import type { CodeSnippet } from "../types";

// ----------------------------------------------------------------------------
// Claude Code JSON output types
// ----------------------------------------------------------------------------

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: string; text?: string }>;
}

type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface Message {
  role: string;
  content: ContentBlock[];
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function parseMessages(rawOutput: string): Message[] | null {
  try {
    const parsed = JSON.parse(rawOutput);
    if (Array.isArray(parsed)) return parsed as Message[];
    return null;
  } catch {
    return null;
  }
}

function extractToolResultContent(block: ToolResultBlock): string {
  if (typeof block.content === "string") return block.content;
  if (Array.isArray(block.content)) {
    return block.content
      .filter((c) => c.text)
      .map((c) => c.text!)
      .join("\n");
  }
  return "";
}

// ----------------------------------------------------------------------------
// formatAnswer
// ----------------------------------------------------------------------------

/**
 * Extracts the final natural-language answer from Claude Code JSON output.
 * Returns the text of the last text block in the last assistant message.
 * Falls back to returning raw output as-is if it is not valid JSON.
 */
export function formatAnswer(rawOutput: string): string {
  const messages = parseMessages(rawOutput);
  if (!messages) return rawOutput;

  // Walk messages in reverse to find the last assistant message with a text block
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    if (!Array.isArray(msg.content)) continue;

    // Find the last text block in this message
    for (let j = msg.content.length - 1; j >= 0; j--) {
      const block = msg.content[j];
      if (block.type === "text" && block.text) {
        return block.text;
      }
    }
  }

  return rawOutput;
}

// ----------------------------------------------------------------------------
// extractCodeSnippets
// ----------------------------------------------------------------------------

/**
 * Matches Read tool_use blocks with their corresponding tool_result blocks
 * to extract code snippets. Deduplicates by file path.
 */
export function extractCodeSnippets(rawOutput: string): CodeSnippet[] {
  const messages = parseMessages(rawOutput);
  if (!messages) return [];

  // Collect all tool_use (Read) and tool_result blocks across all messages
  const readCalls = new Map<string, { filePath: string }>();
  const toolResults = new Map<string, string>();

  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type === "tool_use" && block.name === "Read" && block.input.file_path) {
        readCalls.set(block.id, {
          filePath: block.input.file_path as string,
        });
      }
      if (block.type === "tool_result") {
        toolResults.set(block.tool_use_id, extractToolResultContent(block));
      }
    }
  }

  // Match and deduplicate
  const seen = new Set<string>();
  const snippets: CodeSnippet[] = [];

  for (const [toolId, call] of readCalls) {
    if (seen.has(call.filePath)) continue;
    seen.add(call.filePath);

    const content = toolResults.get(toolId);
    if (content) {
      snippets.push({
        filePath: call.filePath,
        content,
      });
    }
  }

  return snippets;
}

// ----------------------------------------------------------------------------
// extractFilesExplored
// ----------------------------------------------------------------------------

/**
 * Scans all tool_use blocks for Read, Grep, and Glob invocations
 * and collects the unique file/directory paths explored.
 * Paths are normalized by stripping the workspace prefix and sorted.
 */
export function extractFilesExplored(rawOutput: string): string[] {
  const messages = parseMessages(rawOutput);
  if (!messages) return [];

  const paths = new Set<string>();

  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;

      switch (block.name) {
        case "Read":
          if (block.input.file_path) {
            paths.add(block.input.file_path as string);
          }
          break;
        case "Grep":
          if (block.input.path) {
            paths.add(block.input.path as string);
          }
          break;
        case "Glob":
          if (block.input.pattern) {
            paths.add(block.input.pattern as string);
          }
          break;
      }
    }
  }

  // Normalize: strip common workspace prefixes like /workspace/ or /home/user/
  const normalized = [...paths].map((p) =>
    p.replace(/^\/(?:workspace|home\/\w+)\//, ""),
  );

  return [...new Set(normalized)].sort();
}
