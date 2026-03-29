/**
 * Skills module for @emisso/talk
 *
 * Skills are markdown methodology files that guide Claude Code's exploration
 * strategy for different query types. Each skill is a self-contained set of
 * instructions that the agent follows to produce structured, high-quality answers.
 */

import type { QueryCategory } from "../types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CliSkillName =
  | "explain-code"
  | "find-usages"
  | "capability-check"
  | "troubleshoot"
  | "product-usage";

export interface CliSkillDefinition {
  name: CliSkillName;
  description: string;
  content: string;
}

// ============================================================================
// CATEGORY → SKILLS MAPPING
// ============================================================================

export const CATEGORY_SKILLS: Record<QueryCategory, CliSkillName[]> = {
  flow_trace: ["explain-code"],
  architecture: ["explain-code"],
  implementation_how: ["explain-code"],
  code_lookup: ["find-usages"],
  capability_check: ["capability-check"],
  troubleshoot: ["troubleshoot"],
  general_product: ["product-usage"],
};

// ============================================================================
// SKILL DEFINITIONS
// ============================================================================

export const SKILL_DEFINITIONS: Record<CliSkillName, CliSkillDefinition> = {
  "explain-code": {
    name: "explain-code",
    description:
      "Methodology for explaining how code works — flow traces and system explanations.",
    content: `# Skill: Explain Code

## Purpose
Explain how code works. Operates in two modes based on the query:

- **Flow Trace** — The user asks "what happens when X?" → trace the sequential chain of steps.
- **System Explanation** — The user asks "how does X work?" → map the components and their relationships.

## Step 1: Determine Mode

| Signal | Mode |
|--------|------|
| "what happens when…", "trace the flow of…", "walk me through…" | Flow Trace |
| "how does X work?", "explain the architecture of…", "what is X?" | System Explanation |
| Ambiguous | Default to System Explanation |

## Step 2: Investigation

### Identify Entry Points
- Search for the primary function, route handler, event listener, or component mentioned in the query.
- If the query names a feature (not a symbol), search for the feature module directory first.

### Map Components
- Read the entry point file completely.
- Identify all internal imports and follow them one level deep.
- For Flow Trace: follow the call chain sequentially — read each function that gets called in order.
- For System Explanation: identify the key modules, their responsibilities, and how they connect.

### Build the Explanation
- Read source code carefully. Do NOT guess what code does — read it.
- Note the exact file paths and line numbers for every claim you make.
- Identify patterns: middleware chains, event emitters, pub/sub, Effect layers, React component trees.

## Step 3: Audience-Aware Output

Adapt depth to the question's complexity:
- **Technical** — Include file paths, function signatures, type details, and edge cases.
- **Semi-technical** — Include file paths and high-level logic, skip type internals.
- **Non-technical** — Describe behavior in plain language, use analogies.

## Step 4: Output Format

### Flow Trace Output
1. **Trigger** — What initiates the flow (HTTP request, user action, cron, event).
2. **Steps** — Numbered list. Each step includes:
   - File path and function name
   - What it does (1-2 sentences)
   - What it passes to the next step
3. **Result** — What the user/system sees at the end.
4. **Key files** — Bulleted list of all files involved.

### System Explanation Output
1. **Overview** — One paragraph: what the system/feature does.
2. **Components** — For each component:
   - Name and file path
   - Responsibility (1-2 sentences)
   - Key interfaces (inputs/outputs)
3. **How they connect** — Data flow between components.
4. **Key files** — Bulleted list of all files involved.

## Pitfalls
- Do NOT describe what you think code does — read and verify.
- Do NOT skip intermediate steps in a flow trace — every function call matters.
- Do NOT confuse similar-named functions in different modules.
- Always verify imports resolve to the file you think they do.
- If you hit a dynamic dispatch (event emitter, plugin system), say so explicitly.
`,
  },

  "find-usages": {
    name: "find-usages",
    description:
      "Locate where a symbol is defined and find all meaningful usages.",
    content: `# Skill: Find Usages

## Purpose
Locate where a symbol (function, type, component, constant, class) is defined and find every meaningful usage across the codebase.

## Step 1: Identify the Symbol
- Extract the exact symbol name from the query.
- Determine the symbol type: function, type/interface, component, constant, class, or variable.
- Note any aliases the user might mean (e.g., "the user table" could be a schema, a type, or a component).

## Step 2: Find the Definition
- Search for the symbol using exact name matching first.
- If not found, try case-insensitive or partial matches.
- Read the definition file completely to understand:
  - The symbol's signature / shape
  - What it exports (named, default, re-export)
  - The module it belongs to

## Step 3: Search for All References

### Import Search
- Search for import statements that reference the symbol by name.
- Search for import statements that reference the file where it is defined.
- Check for re-exports from barrel files (index.ts).

### Direct Reference Search
- Search for the symbol name across the entire codebase.
- Filter out false positives: comments, strings that happen to contain the name, different symbols with the same name in other modules.

### Indirect Reference Search
- Check if the symbol is re-exported under a different name.
- Check if it is accessed via a namespace import (e.g., \`module.symbolName\`).
- Check if it is passed as a parameter and used under a different local name.

## Step 4: Categorize Usages
Group every confirmed usage into these categories:

| Category | Description |
|----------|-------------|
| **Imports** | Files that import the symbol |
| **Invocations** | Call sites where the function/component is actually used |
| **Type Usage** | Places using the symbol as a type annotation |
| **Re-exports** | Barrel files or wrappers that re-export it |
| **Tests** | Test files that reference the symbol |

## Step 5: Output Format

### Definition
- File path and line number
- Signature or shape (abbreviated if long)

### Usages
For each category that has results, list:
- File path and line number
- Brief context (the line of code or a 1-sentence description)

### Summary
- Total usage count
- Which features/modules depend on this symbol
- Note if the symbol appears unused (potential dead code)
`,
  },

  "capability-check": {
    name: "capability-check",
    description:
      "Determine whether a feature or capability exists in the codebase.",
    content: `# Skill: Capability Check

## Purpose
Determine whether a specific feature or capability exists. Two modes:

- **Single-target** — "Does the app support X?" → YES / PARTIAL / NO verdict.
- **Multi-target** — "Which of these does it support?" → verdict matrix.

## Step 1: Expand Search Terms
- From the user's question, extract the capability/feature being asked about.
- Generate 3-5 search terms: the feature name, synonyms, related technical terms, and likely file/folder names.
- Example: "Does it support dark mode?" → search for: "dark mode", "theme", "color-scheme", "darkMode", "ThemeProvider".

## Step 2: Identify Targets
- **Single-target**: one capability to verify.
- **Multi-target**: list each capability separately; each gets its own investigation.

## Step 3: Broad Search Pass
For each target:
1. Search file names for relevant terms.
2. Search file contents for relevant terms.
3. Look for configuration files, feature flags, or environment variables related to the capability.
4. Check documentation or comments that mention the capability.

## Step 4: Read and Classify Evidence
For each search hit, read the surrounding code and classify:

| Evidence Type | Meaning |
|---------------|---------|
| **Working implementation** | Feature is built and functional |
| **Partial implementation** | Code exists but is incomplete, behind a flag, or has TODOs |
| **Configuration only** | Setting exists but no implementation found |
| **Comments/docs only** | Mentioned in docs but no code |
| **No evidence** | Nothing found |

## Step 5: Verify User Access Channels
If the feature exists in code, check if users can actually access it:
- Is there a UI for it? (component, page, button)
- Is there an API endpoint for it?
- Is it behind a feature flag or permission check?
- Is it only available to certain roles/plans?

## Step 6: Determine Verdict

| Verdict | Criteria |
|---------|----------|
| **YES** | Working implementation + accessible to users |
| **PARTIAL** | Implementation exists but incomplete, restricted, or not user-facing |
| **NO** | No implementation found |

## Step 7: Assess Addability (if NO or PARTIAL)
Briefly note:
- How hard would it be to add/complete? (trivial / moderate / significant)
- What existing infrastructure could be leveraged?
- Are there any blockers?

## Output Format

### Single-Target
1. **Verdict**: YES / PARTIAL / NO
2. **Evidence**: What was found (file paths, code references)
3. **Access**: How users reach this feature (or why they cannot)
4. **If PARTIAL/NO**: Addability assessment

### Multi-Target
Table with columns: Capability | Verdict | Key Evidence | Notes
`,
  },

  troubleshoot: {
    name: "troubleshoot",
    description:
      "Diagnose a problem and provide actionable guidance.",
    content: `# Skill: Troubleshoot

## Purpose
The user has a problem — an error, unexpected behavior, or something not working. Diagnose the root cause and provide actionable guidance.

## Step 1: Understand the Scenario
Extract from the user's query:
- **What they expected** to happen
- **What actually happened** (error message, wrong behavior, nothing happened)
- **Context**: which feature, page, API endpoint, or flow is involved
- **Any error messages or codes** mentioned

## Step 2: Identify Boundaries
Classify the problem area:

| Boundary | Examples |
|----------|----------|
| **Your code** | Bug in application logic, missing handler, wrong query |
| **External service** | Third-party API down, changed response format, rate limit |
| **Configuration** | Wrong env var, missing secret, incorrect setting |
| **Infrastructure** | Database connection, deployment issue, DNS |
| **User error** | Wrong input, misunderstanding of feature, missing permissions |

## Step 3: Trace the Code Path
1. Find the entry point for the reported feature/flow.
2. Trace the execution path that would be triggered by the user's action.
3. Look for:
   - Error handling: try/catch blocks, Effect error channels, error boundaries
   - Validation: input validation that might reject the request
   - Conditional logic: branches that might lead to unexpected behavior
   - External calls: API calls, database queries that might fail
4. Read error messages in the code and match against what the user reported.

## Step 4: Determine Root Cause Category

| Category | Description |
|----------|-------------|
| **Product bug** | Code has a defect — logic error, missing case, race condition |
| **Product limitation** | Feature intentionally does not support this use case |
| **Configuration issue** | Misconfigured setting, missing env var, wrong credentials |
| **External dependency** | Third-party service issue, API change, version mismatch |
| **User error** | User is doing something incorrectly or misunderstanding the feature |
| **Infrastructure** | Server, database, network, or deployment issue |

## Step 5: Provide Actionable Guidance

### For Product Bugs
- Identify the exact file and line where the bug is.
- Explain what the code does wrong.
- Suggest a fix (code change or approach).

### For Configuration Issues
- Identify which setting is wrong or missing.
- Provide the correct value or format.
- Note where the setting should be configured.

### For User Errors
- Explain what the user should do differently.
- Provide step-by-step correct usage.

### For External Dependencies
- Identify which external service is involved.
- Suggest diagnostic steps (check status page, test API directly).
- Suggest workarounds if available.

## Output Format

1. **Diagnosis** — What is going wrong and why (2-3 sentences).
2. **Root Cause** — Category + specific cause with file paths and evidence.
3. **Fix / Workaround** — Concrete steps to resolve the issue.
4. **What to tell the customer** — A plain-language explanation suitable for a non-technical user or customer support reply. Keep it empathetic and solution-focused.
`,
  },

  "product-usage": {
    name: "product-usage",
    description:
      "Answer product usage questions — requirements, how-to guides, and general product info.",
    content: `# Skill: Product Usage

## Purpose
Answer product-related questions. Three modes based on the query:

- **Requirements Query** — "What do I need to set up X?" → input requirements table.
- **Usage Guide** — "How do I do X?" → step-by-step guide.
- **General Product** — "What is X?" or "Tell me about X" → feature overview.

## Step 1: Determine Mode

| Signal | Mode |
|--------|------|
| "what do I need…", "what are the requirements…", "what fields…" | Requirements Query |
| "how do I…", "how to…", "steps to…", "guide for…" | Usage Guide |
| "what is…", "tell me about…", "explain…", "does X do…" | General Product |

## Step 2: Find the Feature
- Search for the feature by name in the codebase.
- Look in UI components, API routes, database schemas, and configuration files.
- Read the feature module to understand its scope and behavior.

## Step 3: Find Input Requirements (Requirements Query & Usage Guide)
- Look at form components: what fields are required vs optional?
- Look at API validation schemas (Zod): what does the endpoint expect?
- Look at database schemas: what columns are NOT NULL?
- Check for conditional requirements (field X required only when Y is true).

## Step 4: Check Variations
- Are there different flows for different user roles?
- Are there different modes or configurations?
- Are there prerequisites (another feature must be set up first)?
- Are there plan/tier restrictions?

## Step 5: Build the Answer

### Requirements Query Output
1. **Feature overview** — One sentence: what this feature does.
2. **Requirements table**:

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| Name  | Yes      | Text | Max 100 chars |

3. **Prerequisites** — Other features or configurations needed first.
4. **Gotchas** — Common mistakes or non-obvious requirements.

### Usage Guide Output
1. **Overview** — One sentence: what the user will accomplish.
2. **Prerequisites** — What must be set up before starting.
3. **Steps** — Numbered list. Each step:
   - What to do (action)
   - Where to do it (page/section/button)
   - What to expect (confirmation, redirect, etc.)
4. **Troubleshooting** — Common issues and how to resolve them.

### General Product Output
1. **What it is** — 2-3 sentences explaining the feature.
2. **Key capabilities** — Bulleted list of what it can do.
3. **How it works** — Brief technical overview (where data lives, what triggers what).
4. **Limitations** — What it cannot do or known constraints.
5. **Related features** — Other features that work with this one.
`,
  },
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns skill files for a given query category, ready for sandbox.writeFiles().
 *
 * Each file is placed at `.talk/skills/<skill-name>.md` inside the sandbox.
 */
export function getSkillFilesForCategory(
  category: QueryCategory,
): Array<{ path: string; content: Buffer }> {
  const skillNames = CATEGORY_SKILLS[category];

  return skillNames.map((name) => {
    const skill = SKILL_DEFINITIONS[name];
    return {
      path: `.talk/skills/${name}.md`,
      content: Buffer.from(skill.content, "utf-8"),
    };
  });
}
