# Claude Agent SDK - Complete Reference

## Overview

Build production AI agents with Claude Code as a library. The Agent SDK gives you the same tools, agent loop, and context management that power Claude Code, programmable in Python and TypeScript.

**Model Family**: Claude Sonnet 4.5 and Claude Haiku 4.5
- Sonnet: `claude-sonnet-4-5-20250929` (smartest, efficient for everyday use)
- Haiku: `claude-haiku-4-5-20251001`

## Quick Start

### Installation

**1. Install Claude Code**
```bash
# macOS/Linux/WSL
curl -fsSL https://claude.ai/install.sh | bash

# Homebrew
brew install --cask claude-code

# WinGet
winget install Anthropic.ClaudeCode
```

**2. Install SDK**
```bash
# TypeScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

**3. Set API Key**
```bash
export ANTHROPIC_API_KEY=your-api-key
```

**Alternative Authentication**:
- Amazon Bedrock: `CLAUDE_CODE_USE_BEDROCK=1`
- Google Vertex AI: `CLAUDE_CODE_USE_VERTEX=1`
- Microsoft Foundry: `CLAUDE_CODE_USE_FOUNDRY=1`

**4. First Agent**

Python:
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="What files are in this directory?",
        options=ClaudeAgentOptions(allowed_tools=["Bash", "Glob"])
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What files are in this directory?",
  options: { allowedTools: ["Bash", "Glob"] },
})) {
  if ("result" in message) console.log(message.result);
}
```

## Table of Contents

- [Input Modes](#input-modes)
- [Core Capabilities](#core-capabilities)
  - [Built-in Tools](#built-in-tools)
  - [Structured Outputs](#structured-outputs)
  - [Hooks](#hooks)
  - [Subagents](#subagents)
  - [MCP](#mcp-model-context-protocol)
- [System Prompts](#system-prompts)
- [Session Management](#session-management)
- [File Checkpointing](#file-checkpointing)
- [Permissions & Control](#permissions--control)
- [Security & Deployment](#security--deployment)
- [Claude Code Features](#claude-code-features)
- [Tracking Costs and Usage](#tracking-costs-and-usage)
- [Todo Lists](#todo-lists)
- [Comparisons](#comparisons)
- [Resources](#resources)

## Input Modes

The Claude Agent SDK supports two distinct input modes for interacting with agents.

### Streaming Input Mode (Default & Recommended)

**The preferred way to use the Agent SDK.** Provides a persistent, interactive session that allows the agent to operate as a long-lived process.

**Benefits:**
- ✅ Image uploads - Attach images directly to messages
- ✅ Queued messages - Send multiple messages that process sequentially
- ✅ Tool integration - Full access to all tools and custom MCP servers
- ✅ Hooks support - Use lifecycle hooks to customize behavior
- ✅ Real-time feedback - See responses as they're generated
- ✅ Context persistence - Maintain conversation context naturally
- ✅ Interruption handling - Cancel or modify in-flight requests

**Example: Streaming with Image Upload**

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";

async function* generateMessages() {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Analyze this codebase for security issues"
    }
  };

  await new Promise(resolve => setTimeout(resolve, 2000));

  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: [
        { type: "text", text: "Review this architecture diagram" },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: readFileSync("diagram.png", "base64")
          }
        }
      ]
    }
  };
}

for await (const message of query({
  prompt: generateMessages(),
  options: { maxTurns: 10, allowedTools: ["Read", "Grep"] }
})) {
  if (message.type === "result") console.log(message.result);
}
```

Python:
```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions
import asyncio
import base64

async def streaming_analysis():
    async def message_generator():
        yield {
            "type": "user",
            "message": {
                "role": "user",
                "content": "Analyze this codebase for security issues"
            }
        }

        await asyncio.sleep(2)

        with open("diagram.png", "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        yield {
            "type": "user",
            "message": {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Review this architecture diagram"},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_data
                        }
                    }
                ]
            }
        }

    options = ClaudeAgentOptions(max_turns=10, allowed_tools=["Read", "Grep"])
    async with ClaudeSDKClient(options) as client:
        await client.query(message_generator())
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)

asyncio.run(streaming_analysis())
```

### Single Message Input

Simpler but more limited. One-shot queries that use session state and resuming.

**When to Use:**
- One-shot responses
- No need for image attachments, hooks, etc.
- Stateless environments (lambda functions)

**Limitations:**
- ❌ No direct image attachments in messages
- ❌ No dynamic message queueing
- ❌ No real-time interruption
- ❌ No hook integration
- ❌ No natural multi-turn conversations

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Explain the authentication flow",
  options: { maxTurns: 1, allowedTools: ["Read", "Grep"] }
})) {
  if (message.type === "result") console.log(message.result);
}
```

Python:
```python
from claude_agent_sdk import query, ClaudeAgentOptions

async for message in query(
    prompt="Explain the authentication flow",
    options=ClaudeAgentOptions(max_turns=1, allowed_tools=["Read", "Grep"])
):
    if isinstance(message, ResultMessage):
        print(message.result)
```

## Core Capabilities

### Built-in Tools

| Tool | What it does |
|------|--------------|
| **Read** | Read any file in the working directory |
| **Write** | Create new files |
| **Edit** | Make precise edits to existing files |
| **Bash** | Run terminal commands, scripts, git operations |
| **Glob** | Find files by pattern (`**/*.ts`, `src/**/*.py`) |
| **Grep** | Search file contents with regex |
| **WebSearch** | Search the web for current information |
| **WebFetch** | Fetch and parse web page content |
| **AskUserQuestion** | Ask clarifying questions with multiple choice options |
| **Task** | Invoke subagents (required for subagent architecture) |

### Structured Outputs

Get structured, validated JSON from agent workflows.

**When to use:**
- ✅ Need validated JSON after agent completes workflow with tools
- ✅ Want type-safe integration with your application
- ✅ Multi-turn workflows (file searches, commands, web research)

TypeScript with Zod:
```typescript
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const AnalysisResult = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string(),
    file: z.string()
  })),
  score: z.number().min(0).max(100)
})

const schema = zodToJsonSchema(AnalysisResult, { $refStrategy: 'root' })

for await (const message of query({
  prompt: 'Analyze the codebase for security issues',
  options: {
    outputFormat: { type: 'json_schema', schema: schema }
  }
})) {
  if (message.type === 'result' && message.structured_output) {
    const parsed = AnalysisResult.safeParse(message.structured_output)
    if (parsed.success) {
      console.log(`Score: ${parsed.data.score}`)
    }
  }
}
```

Python with Pydantic:
```python
from pydantic import BaseModel

class Issue(BaseModel):
    severity: str
    description: str
    file: str

class AnalysisResult(BaseModel):
    summary: str
    issues: list[Issue]
    score: int

async for message in query(
    prompt="Analyze the codebase for security issues",
    options={
        "output_format": {
            "type": "json_schema",
            "schema": AnalysisResult.model_json_schema()
        }
    }
):
    if hasattr(message, 'structured_output'):
        result = AnalysisResult.model_validate(message.structured_output)
        print(f"Score: {result.score}")
```

### Hooks

Intercept agent execution at key points.

**What you can do:**
- 🛡️ Block dangerous operations before execution
- 📝 Log and audit every tool call
- 🔄 Transform inputs and outputs
- ✋ Require human approval for sensitive actions

Python example:
```python
async def protect_env_files(input_data, tool_use_id, context):
    file_path = input_data['tool_input'].get('file_path', '')
    if file_path.split('/')[-1] == '.env':
        return {
            'hookSpecificOutput': {
                'hookEventName': input_data['hook_event_name'],
                'permissionDecision': 'deny',
                'permissionDecisionReason': 'Cannot modify .env files'
            }
        }
    return {}

async for message in query(
    prompt="Update the database configuration",
    options=ClaudeAgentOptions(
        hooks={'PreToolUse': [HookMatcher(matcher='Write|Edit', hooks=[protect_env_files])]}
    )
):
    print(message)
```

#### Available Hooks

| Hook | Python | TypeScript | Trigger |
|------|--------|------------|---------|
| `PreToolUse` | ✅ | ✅ | Tool call request |
| `PostToolUse` | ✅ | ✅ | Tool execution result |
| `PostToolUseFailure` | ❌ | ✅ | Tool execution failure |
| `UserPromptSubmit` | ✅ | ✅ | User prompt submission |
| `Stop` | ✅ | ✅ | Agent execution stop |
| `SubagentStart` | ❌ | ✅ | Subagent initialization |
| `SubagentStop` | ✅ | ✅ | Subagent completion |
| `PreCompact` | ✅ | ✅ | Conversation compaction |
| `PermissionRequest` | ❌ | ✅ | Permission dialog |
| `SessionStart` | ❌ | ✅ | Session initialization |
| `SessionEnd` | ❌ | ✅ | Session termination |
| `Notification` | ❌ | ✅ | Agent status messages |

### Subagents in the SDK

Define and invoke subagents to isolate context, run tasks in parallel, and apply specialized instructions in your Claude Agent SDK applications.

Subagents are separate agent instances that your main agent can spawn to handle focused subtasks.
Use subagents to isolate context for focused subtasks, run multiple analyses in parallel, and apply specialized instructions without bloating the main agent's prompt.

#### Overview

You can create subagents in three ways:

- **Programmatically**: use the `agents` parameter in your `query()` options (recommended for SDK applications)
- **Filesystem-based**: define agents as markdown files in `.claude/agents/` directories (see the [Claude Code documentation](https://code.claude.com/docs/en/sub-agents))
- **Built-in general-purpose**: Claude can invoke the built-in `general-purpose` subagent at any time via the Task tool without you defining anything

This guide focuses on the programmatic approach, which is recommended for SDK applications.

When you define subagents, Claude decides whether to invoke them based on each subagent's `description` field. Write clear descriptions that explain when the subagent should be used, and Claude will automatically delegate appropriate tasks. You can also explicitly request a subagent by name in your prompt (e.g., "Use the code-reviewer agent to...").

#### Benefits of using subagents

**Context management**

Subagents maintain separate context from the main agent, preventing information overload and keeping interactions focused. This isolation ensures that specialized tasks don't pollute the main conversation context with irrelevant details.

Example: a `research-assistant` subagent can explore dozens of files and documentation pages without cluttering the main conversation with all the intermediate search results, returning only the relevant findings.

**Parallelization**

Multiple subagents can run concurrently, dramatically speeding up complex workflows.

Example: during a code review, you can run `style-checker`, `security-scanner`, and `test-coverage` subagents simultaneously, reducing review time from minutes to seconds.

**Specialized instructions and knowledge**

Each subagent can have tailored system prompts with specific expertise, best practices, and constraints.

Example: a `database-migration` subagent can have detailed knowledge about SQL best practices, rollback strategies, and data integrity checks that would be unnecessary noise in the main agent's instructions.

**Tool restrictions**

Subagents can be limited to specific tools, reducing the risk of unintended actions.

Example: a `doc-reviewer` subagent might only have access to Read and Grep tools, ensuring it can analyze but never accidentally modify your documentation files.

#### Creating subagents

**Programmatic definition (recommended)**

Define subagents directly in your code using the `agents` parameter. This example creates two subagents: a code reviewer with read-only access and a test runner that can execute commands. The `Task` tool must be included in `allowedTools` since Claude invokes subagents through the Task tool.

Python:
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="Review the authentication module for security issues",
        options=ClaudeAgentOptions(
            # Task tool is required for subagent invocation
            allowed_tools=["Read", "Grep", "Glob", "Task"],
            agents={
                "code-reviewer": AgentDefinition(
                    # description tells Claude when to use this subagent
                    description="Expert code review specialist. Use for quality, security, and maintainability reviews.",
                    # prompt defines the subagent's behavior and expertise
                    prompt="""You are a code review specialist with expertise in security, performance, and best practices.

When reviewing code:
- Identify security vulnerabilities
- Check for performance issues
- Verify adherence to coding standards
- Suggest specific improvements

Be thorough but concise in your feedback.""",
                    # tools restricts what the subagent can do (read-only here)
                    tools=["Read", "Grep", "Glob"],
                    # model overrides the default model for this subagent
                    model="sonnet"
                ),
                "test-runner": AgentDefinition(
                    description="Runs and analyzes test suites. Use for test execution and coverage analysis.",
                    prompt="""You are a test execution specialist. Run tests and provide clear analysis of results.

Focus on:
- Running test commands
- Analyzing test output
- Identifying failing tests
- Suggesting fixes for failures""",
                    # Bash access lets this subagent run test commands
                    tools=["Bash", "Read", "Grep"]
                )
            }
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

TypeScript:
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: "Review the authentication module for security issues",
  options: {
    // Task tool is required for subagent invocation
    allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
    agents: {
      'code-reviewer': {
        // description tells Claude when to use this subagent
        description: 'Expert code review specialist. Use for quality, security, and maintainability reviews.',
        // prompt defines the subagent's behavior and expertise
        prompt: `You are a code review specialist with expertise in security, performance, and best practices.

When reviewing code:
- Identify security vulnerabilities
- Check for performance issues
- Verify adherence to coding standards
- Suggest specific improvements

Be thorough but concise in your feedback.`,
        // tools restricts what the subagent can do (read-only here)
        tools: ['Read', 'Grep', 'Glob'],
        // model overrides the default model for this subagent
        model: 'sonnet'
      },
      'test-runner': {
        description: 'Runs and analyzes test suites. Use for test execution and coverage analysis.',
        prompt: `You are a test execution specialist. Run tests and provide clear analysis of results.

Focus on:
- Running test commands
- Analyzing test output
- Identifying failing tests
- Suggesting fixes for failures`,
        // Bash access lets this subagent run test commands
        tools: ['Bash', 'Read', 'Grep'],
      }
    }
  }
})) {
  if ('result' in message) console.log(message.result);
}
```

**AgentDefinition configuration**

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `description` | `string` | Yes | Natural language description of when to use this agent |
| `prompt` | `string` | Yes | The agent's system prompt defining its role and behavior |
| `tools` | `string[]` | No | Array of allowed tool names. If omitted, inherits all tools |
| `model` | `'sonnet' \| 'opus' \| 'haiku' \| 'inherit'` | No | Model override for this agent. Defaults to main model if omitted |

**Note:** Subagents cannot spawn their own subagents. Don't include `Task` in a subagent's `tools` array.

**Filesystem-based definition (alternative)**

You can also define subagents as markdown files in `.claude/agents/` directories. See the [Claude Code subagents documentation](https://code.claude.com/docs/en/sub-agents) for details on this approach. Programmatically defined agents take precedence over filesystem-based agents with the same name.

**Note:** Even without defining custom subagents, Claude can spawn the built-in `general-purpose` subagent when `Task` is in your `allowedTools`. This is useful for delegating research or exploration tasks without creating specialized agents.

#### Invoking subagents

**Automatic invocation**

Claude automatically decides when to invoke subagents based on the task and each subagent's `description`. For example, if you define a `performance-optimizer` subagent with the description "Performance optimization specialist for query tuning", Claude will invoke it when your prompt mentions optimizing queries.

Write clear, specific descriptions so Claude can match tasks to the right subagent.

**Explicit invocation**

To guarantee Claude uses a specific subagent, mention it by name in your prompt:

```
"Use the code-reviewer agent to check the authentication module"
```

This bypasses automatic matching and directly invokes the named subagent.

**Dynamic agent configuration**

You can create agent definitions dynamically based on runtime conditions. This example creates a security reviewer with different strictness levels, using a more powerful model for strict reviews.

Python:
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

# Factory function that returns an AgentDefinition
# This pattern lets you customize agents based on runtime conditions
def create_security_agent(security_level: str) -> AgentDefinition:
    is_strict = security_level == "strict"
    return AgentDefinition(
        description="Security code reviewer",
        # Customize the prompt based on strictness level
        prompt=f"You are a {'strict' if is_strict else 'balanced'} security reviewer...",
        tools=["Read", "Grep", "Glob"],
        # Key insight: use a more capable model for high-stakes reviews
        model="opus" if is_strict else "sonnet"
    )

async def main():
    # The agent is created at query time, so each request can use different settings
    async for message in query(
        prompt="Review this PR for security issues",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Task"],
            agents={
                # Call the factory with your desired configuration
                "security-reviewer": create_security_agent("strict")
            }
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

TypeScript:
```typescript
import { query, type AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

// Factory function that returns an AgentDefinition
// This pattern lets you customize agents based on runtime conditions
function createSecurityAgent(securityLevel: 'basic' | 'strict'): AgentDefinition {
  const isStrict = securityLevel === 'strict';
  return {
    description: 'Security code reviewer',
    // Customize the prompt based on strictness level
    prompt: `You are a ${isStrict ? 'strict' : 'balanced'} security reviewer...`,
    tools: ['Read', 'Grep', 'Glob'],
    // Key insight: use a more capable model for high-stakes reviews
    model: isStrict ? 'opus' : 'sonnet'
  };
}

// The agent is created at query time, so each request can use different settings
for await (const message of query({
  prompt: "Review this PR for security issues",
  options: {
    allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
    agents: {
      // Call the factory with your desired configuration
      'security-reviewer': createSecurityAgent('strict')
    }
  }
})) {
  if ('result' in message) console.log(message.result);
}
```

#### Detecting subagent invocation

Subagents are invoked via the Task tool. To detect when a subagent is invoked, check for `tool_use` blocks with `name: "Task"`. Messages from within a subagent's context include a `parent_tool_use_id` field.

This example iterates through streamed messages, logging when a subagent is invoked and when subsequent messages originate from within that subagent's execution context.

**Note:** The message structure differs between SDKs. In Python, content blocks are accessed directly via `message.content`. In TypeScript, `SDKAssistantMessage` wraps the Anthropic API message, so content is accessed via `message.message.content`.

Python:
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="Use the code-reviewer agent to review this codebase",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Grep", "Task"],
            agents={
                "code-reviewer": AgentDefinition(
                    description="Expert code reviewer.",
                    prompt="Analyze code quality and suggest improvements.",
                    tools=["Read", "Glob", "Grep"]
                )
            }
        )
    ):
        # Check for subagent invocation in message content
        if hasattr(message, 'content') and message.content:
            for block in message.content:
                if getattr(block, 'type', None) == 'tool_use' and block.name == 'Task':
                    print(f"Subagent invoked: {block.input.get('subagent_type')}")

        # Check if this message is from within a subagent's context
        if hasattr(message, 'parent_tool_use_id') and message.parent_tool_use_id:
            print("  (running inside subagent)")

        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Use the code-reviewer agent to review this codebase",
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Task"],
    agents: {
      "code-reviewer": {
        description: "Expert code reviewer.",
        prompt: "Analyze code quality and suggest improvements.",
        tools: ["Read", "Glob", "Grep"]
      }
    }
  }
})) {
  const msg = message as any;

  // Check for subagent invocation in message content
  for (const block of msg.message?.content ?? []) {
    if (block.type === "tool_use" && block.name === "Task") {
      console.log(`Subagent invoked: ${block.input.subagent_type}`);
    }
  }

  // Check if this message is from within a subagent's context
  if (msg.parent_tool_use_id) {
    console.log("  (running inside subagent)");
  }

  if ("result" in message) {
    console.log(message.result);
  }
}
```

#### Tool restrictions

Subagents can have restricted tool access via the `tools` field:

- **Omit the field**: agent inherits all available tools (default)
- **Specify tools**: agent can only use listed tools

This example creates a read-only analysis agent that can examine code but cannot modify files or run commands.

Python:
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="Analyze the architecture of this codebase",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Task"],
            agents={
                "code-analyzer": AgentDefinition(
                    description="Static code analysis and architecture review",
                    prompt="""You are a code architecture analyst. Analyze code structure,
identify patterns, and suggest improvements without making changes.""",
                    # Read-only tools: no Edit, Write, or Bash access
                    tools=["Read", "Grep", "Glob"]
                )
            }
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

TypeScript:
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: "Analyze the architecture of this codebase",
  options: {
    allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
    agents: {
      'code-analyzer': {
        description: 'Static code analysis and architecture review',
        prompt: `You are a code architecture analyst. Analyze code structure,
identify patterns, and suggest improvements without making changes.`,
        // Read-only tools: no Edit, Write, or Bash access
        tools: ['Read', 'Grep', 'Glob']
      }
    }
  }
})) {
  if ('result' in message) console.log(message.result);
}
```

**Common tool combinations**

| Use case | Tools | Description |
|:---------|:------|:------------|
| Read-only analysis | `Read`, `Grep`, `Glob` | Can examine code but not modify or execute |
| Test execution | `Bash`, `Read`, `Grep` | Can run commands and analyze output |
| Code modification | `Read`, `Edit`, `Write`, `Grep`, `Glob` | Full read/write access without command execution |
| Full access | All tools | Inherits all tools from parent (omit `tools` field) |

#### Troubleshooting

**Claude not delegating to subagents**

If Claude completes tasks directly instead of delegating to your subagent:

1. **Include the Task tool**: subagents are invoked via the Task tool, so it must be in `allowedTools`
2. **Use explicit prompting**: mention the subagent by name in your prompt (e.g., "Use the code-reviewer agent to...")
3. **Write a clear description**: explain exactly when the subagent should be used so Claude can match tasks appropriately

**Filesystem-based agents not loading**

Agents defined in `.claude/agents/` are loaded at startup only. If you create a new agent file while Claude Code is running, restart the session to load it.

**Windows: long prompt failures**

On Windows, subagents with very long prompts may fail due to command line length limits (8191 chars). Keep prompts concise or use filesystem-based agents for complex instructions.

### Slash Commands in the SDK

Learn how to use slash commands to control Claude Code sessions through the SDK.

Slash commands provide a way to control Claude Code sessions with special commands that start with `/`. These commands can be sent through the SDK to perform actions like clearing conversation history, compacting messages, or getting help.

#### Discovering Available Slash Commands

The Claude Agent SDK provides information about available slash commands in the system initialization message. Access this information when your session starts:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Hello Claude",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("Available slash commands:", message.slash_commands);
    // Example output: ["/compact", "/clear", "/help"]
  }
}
```

Python:
```python
import asyncio
from claude_agent_sdk import query

async def main():
    async for message in query(
        prompt="Hello Claude",
        options={"max_turns": 1}
    ):
        if message.type == "system" and message.subtype == "init":
            print("Available slash commands:", message.slash_commands)
            # Example output: ["/compact", "/clear", "/help"]

asyncio.run(main())
```

#### Sending Slash Commands

Send slash commands by including them in your prompt string, just like regular text:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Send a slash command
for await (const message of query({
  prompt: "/compact",
  options: { maxTurns: 1 }
})) {
  if (message.type === "result") {
    console.log("Command executed:", message.result);
  }
}
```

Python:
```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Send a slash command
    async for message in query(
        prompt="/compact",
        options={"max_turns": 1}
    ):
        if message.type == "result":
            print("Command executed:", message.result)

asyncio.run(main())
```

#### Common Slash Commands

**`/compact` - Compact Conversation History**

The `/compact` command reduces the size of your conversation history by summarizing older messages while preserving important context:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "/compact",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "compact_boundary") {
    console.log("Compaction completed");
    console.log("Pre-compaction tokens:", message.compact_metadata.pre_tokens);
    console.log("Trigger:", message.compact_metadata.trigger);
  }
}
```

Python:
```python
import asyncio
from claude_agent_sdk import query

async def main():
    async for message in query(
        prompt="/compact",
        options={"max_turns": 1}
    ):
        if (message.type == "system" and
            message.subtype == "compact_boundary"):
            print("Compaction completed")
            print("Pre-compaction tokens:",
                  message.compact_metadata.pre_tokens)
            print("Trigger:", message.compact_metadata.trigger)

asyncio.run(main())
```

**`/clear` - Clear Conversation**

The `/clear` command starts a fresh conversation by clearing all previous history:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Clear conversation and start fresh
for await (const message of query({
  prompt: "/clear",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("Conversation cleared, new session started");
    console.log("Session ID:", message.session_id);
  }
}
```

Python:
```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Clear conversation and start fresh
    async for message in query(
        prompt="/clear",
        options={"max_turns": 1}
    ):
        if message.type == "system" and message.subtype == "init":
            print("Conversation cleared, new session started")
            print("Session ID:", message.session_id)

asyncio.run(main())
```

#### Creating Custom Slash Commands

In addition to using built-in slash commands, you can create your own custom commands that are available through the SDK. Custom commands are defined as markdown files in specific directories, similar to how subagents are configured.

**File Locations**

Custom slash commands are stored in designated directories based on their scope:

- **Project commands**: `.claude/commands/` - Available only in the current project
- **Personal commands**: `~/.claude/commands/` - Available across all your projects

**File Format**

Each custom command is a markdown file where:
- The filename (without `.md` extension) becomes the command name
- The file content defines what the command does
- Optional YAML frontmatter provides configuration

**Basic Example**

Create `.claude/commands/refactor.md`:

```markdown
Refactor the selected code to improve readability and maintainability.
Focus on clean code principles and best practices.
```

This creates the `/refactor` command that you can use through the SDK.

**With Frontmatter**

Create `.claude/commands/security-check.md`:

```markdown
---
allowed-tools: Read, Grep, Glob
description: Run security vulnerability scan
model: claude-sonnet-4-5-20250929
---

Analyze the codebase for security vulnerabilities including:
- SQL injection risks
- XSS vulnerabilities
- Exposed credentials
- Insecure configurations
```

#### Using Custom Commands in the SDK

Once defined in the filesystem, custom commands are automatically available through the SDK:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Use a custom command
for await (const message of query({
  prompt: "/refactor src/auth/login.ts",
  options: { maxTurns: 3 }
})) {
  if (message.type === "assistant") {
    console.log("Refactoring suggestions:", message.message);
  }
}

// Custom commands appear in the slash_commands list
for await (const message of query({
  prompt: "Hello",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "init") {
    // Will include both built-in and custom commands
    console.log("Available commands:", message.slash_commands);
    // Example: ["/compact", "/clear", "/help", "/refactor", "/security-check"]
  }
}
```

Python:
```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Use a custom command
    async for message in query(
        prompt="/refactor src/auth/login.py",
        options={"max_turns": 3}
    ):
        if message.type == "assistant":
            print("Refactoring suggestions:", message.message)

    # Custom commands appear in the slash_commands list
    async for message in query(
        prompt="Hello",
        options={"max_turns": 1}
    ):
        if message.type == "system" and message.subtype == "init":
            # Will include both built-in and custom commands
            print("Available commands:", message.slash_commands)
            # Example: ["/compact", "/clear", "/help", "/refactor", "/security-check"]

asyncio.run(main())
```

#### Advanced Features

**Arguments and Placeholders**

Custom commands support dynamic arguments using placeholders:

Create `.claude/commands/fix-issue.md`:

```markdown
---
argument-hint: [issue-number] [priority]
description: Fix a GitHub issue
---

Fix issue #$1 with priority $2.
Check the issue description and implement the necessary changes.
```

Use in SDK:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Pass arguments to custom command
for await (const message of query({
  prompt: "/fix-issue 123 high",
  options: { maxTurns: 5 }
})) {
  // Command will process with $1="123" and $2="high"
  if (message.type === "result") {
    console.log("Issue fixed:", message.result);
  }
}
```

Python:
```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Pass arguments to custom command
    async for message in query(
        prompt="/fix-issue 123 high",
        options={"max_turns": 5}
    ):
        # Command will process with $1="123" and $2="high"
        if message.type == "result":
            print("Issue fixed:", message.result)

asyncio.run(main())
```

**Bash Command Execution**

Custom commands can execute bash commands and include their output:

Create `.claude/commands/git-commit.md`:

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
---

## Context

- Current status: !`git status`
- Current diff: !`git diff HEAD`

## Task

Create a git commit with appropriate message based on the changes.
```

**File References**

Include file contents using the `@` prefix:

Create `.claude/commands/review-config.md`:

```markdown
---
description: Review configuration files
---

Review the following configuration files for issues:
- Package config: @package.json
- TypeScript config: @tsconfig.json
- Environment config: @.env

Check for security issues, outdated dependencies, and misconfigurations.
```

#### Organization with Namespacing

Organize commands in subdirectories for better structure:

```
.claude/commands/
├── frontend/
│   ├── component.md      # Creates /component (project:frontend)
│   └── style-check.md     # Creates /style-check (project:frontend)
├── backend/
│   ├── api-test.md        # Creates /api-test (project:backend)
│   └── db-migrate.md      # Creates /db-migrate (project:backend)
└── review.md              # Creates /review (project)
```

The subdirectory appears in the command description but doesn't affect the command name itself.

#### Practical Examples

**Code Review Command**

Create `.claude/commands/code-review.md`:

```markdown
---
allowed-tools: Read, Grep, Glob, Bash(git diff:*)
description: Comprehensive code review
---

## Changed Files
!`git diff --name-only HEAD~1`

## Detailed Changes
!`git diff HEAD~1`

## Review Checklist

Review the above changes for:
1. Code quality and readability
2. Security vulnerabilities
3. Performance implications
4. Test coverage
5. Documentation completeness

Provide specific, actionable feedback organized by priority.
```

**Test Runner Command**

Create `.claude/commands/test.md`:

```markdown
---
allowed-tools: Bash, Read, Edit
argument-hint: [test-pattern]
description: Run tests with optional pattern
---

Run tests matching pattern: $ARGUMENTS

1. Detect the test framework (Jest, pytest, etc.)
2. Run tests with the provided pattern
3. If tests fail, analyze and fix them
4. Re-run to verify fixes
```

Use these commands through the SDK:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Run code review
for await (const message of query({
  prompt: "/code-review",
  options: { maxTurns: 3 }
})) {
  // Process review feedback
}

// Run specific tests
for await (const message of query({
  prompt: "/test auth",
  options: { maxTurns: 5 }
})) {
  // Handle test results
}
```

Python:
```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Run code review
    async for message in query(
        prompt="/code-review",
        options={"max_turns": 3}
    ):
        # Process review feedback
        pass

    # Run specific tests
    async for message in query(
        prompt="/test auth",
        options={"max_turns": 5}
    ):
        # Handle test results
        pass

asyncio.run(main())
```

### Agent Skills in the SDK

Extend Claude with specialized capabilities using Agent Skills in the Claude Agent SDK.

Agent Skills extend Claude with specialized capabilities that Claude autonomously invokes when relevant. Skills are packaged as `SKILL.md` files containing instructions, descriptions, and optional supporting resources.

For comprehensive information about Skills, including benefits, architecture, and authoring guidelines, see the [Agent Skills overview](/docs/en/agents-and-tools/agent-skills/overview).

#### How Skills Work with the SDK

When using the Claude Agent SDK, Skills are:

1. **Defined as filesystem artifacts**: Created as `SKILL.md` files in specific directories (`.claude/skills/`)
2. **Loaded from filesystem**: Skills are loaded from configured filesystem locations. You must specify `settingSources` (TypeScript) or `setting_sources` (Python) to load Skills from the filesystem
3. **Automatically discovered**: Once filesystem settings are loaded, Skill metadata is discovered at startup from user and project directories; full content loaded when triggered
4. **Model-invoked**: Claude autonomously chooses when to use them based on context
5. **Enabled via allowed_tools**: Add `"Skill"` to your `allowed_tools` to enable Skills

Unlike subagents (which can be defined programmatically), Skills must be created as filesystem artifacts. The SDK does not provide a programmatic API for registering Skills.

**Note:** By default, the SDK does not load any filesystem settings. To use Skills, you must explicitly configure `settingSources: ['user', 'project']` (TypeScript) or `setting_sources=["user", "project"]` (Python) in your options.

#### Using Skills with the SDK

To use Skills with the SDK, you need to:

1. Include `"Skill"` in your `allowed_tools` configuration
2. Configure `settingSources`/`setting_sources` to load Skills from the filesystem

Once configured, Claude automatically discovers Skills from the specified directories and invokes them when relevant to the user's request.

Python:
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    options = ClaudeAgentOptions(
        cwd="/path/to/project",  # Project with .claude/skills/
        setting_sources=["user", "project"],  # Load Skills from filesystem
        allowed_tools=["Skill", "Read", "Write", "Bash"]  # Enable Skill tool
    )

    async for message in query(
        prompt="Help me process this PDF document",
        options=options
    ):
        print(message)

asyncio.run(main())
```

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Help me process this PDF document",
  options: {
    cwd: "/path/to/project",  // Project with .claude/skills/
    settingSources: ["user", "project"],  // Load Skills from filesystem
    allowedTools: ["Skill", "Read", "Write", "Bash"]  // Enable Skill tool
  }
})) {
  console.log(message);
}
```

#### Skill Locations

Skills are loaded from filesystem directories based on your `settingSources`/`setting_sources` configuration:

- **Project Skills** (`.claude/skills/`): Shared with your team via git - loaded when `setting_sources` includes `"project"`
- **User Skills** (`~/.claude/skills/`): Personal Skills across all projects - loaded when `setting_sources` includes `"user"`
- **Plugin Skills**: Bundled with installed Claude Code plugins

#### Creating Skills

Skills are defined as directories containing a `SKILL.md` file with YAML frontmatter and Markdown content. The `description` field determines when Claude invokes your Skill.

Example directory structure:
```
.claude/skills/processing-pdfs/
└── SKILL.md
```

For complete guidance on creating Skills, including SKILL.md structure, multi-file Skills, and examples, see:
- [Agent Skills in Claude Code](https://code.claude.com/docs/en/skills): Complete Skills guide with creation, examples, and troubleshooting
- [Agent Skills Best Practices](/docs/en/agents-and-tools/agent-skills/best-practices): Authoring guidelines and naming conventions

#### Tool Restrictions

**Note:** The `allowed-tools` frontmatter field in SKILL.md is only supported when using Claude Code CLI directly. **It does not apply when using Skills through the SDK**.

When using the SDK, control tool access through the main `allowedTools` option in your query configuration.

To restrict tools for Skills in SDK applications, use the `allowedTools` option:

Python:
```python
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],  # Load Skills from filesystem
    allowed_tools=["Skill", "Read", "Grep", "Glob"]  # Restricted toolset
)

async for message in query(
    prompt="Analyze the codebase structure",
    options=options
):
    print(message)
```

TypeScript:
```typescript
// Skills can only use Read, Grep, and Glob tools
for await (const message of query({
  prompt: "Analyze the codebase structure",
  options: {
    settingSources: ["user", "project"],  // Load Skills from filesystem
    allowedTools: ["Skill", "Read", "Grep", "Glob"]  // Restricted toolset
  }
})) {
  console.log(message);
}
```

#### Discovering Available Skills

To see which Skills are available in your SDK application, simply ask Claude:

Python:
```python
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],  # Load Skills from filesystem
    allowed_tools=["Skill"]
)

async for message in query(
    prompt="What Skills are available?",
    options=options
):
    print(message)
```

TypeScript:
```typescript
for await (const message of query({
  prompt: "What Skills are available?",
  options: {
    settingSources: ["user", "project"],  // Load Skills from filesystem
    allowedTools: ["Skill"]
  }
})) {
  console.log(message);
}
```

Claude will list the available Skills based on your current working directory and installed plugins.

#### Testing Skills

Test Skills by asking questions that match their descriptions:

Python:
```python
options = ClaudeAgentOptions(
    cwd="/path/to/project",
    setting_sources=["user", "project"],  # Load Skills from filesystem
    allowed_tools=["Skill", "Read", "Bash"]
)

async for message in query(
    prompt="Extract text from invoice.pdf",
    options=options
):
    print(message)
```

TypeScript:
```typescript
for await (const message of query({
  prompt: "Extract text from invoice.pdf",
  options: {
    cwd: "/path/to/project",
    settingSources: ["user", "project"],  // Load Skills from filesystem
    allowedTools: ["Skill", "Read", "Bash"]
  }
})) {
  console.log(message);
}
```

Claude automatically invokes the relevant Skill if the description matches your request.

#### Troubleshooting

**Skills Not Found**

Check `settingSources` configuration: Skills are only loaded when you explicitly configure `settingSources`/`setting_sources`. This is the most common issue:

Python:
```python
# Wrong - Skills won't be loaded
options = ClaudeAgentOptions(
    allowed_tools=["Skill"]
)

# Correct - Skills will be loaded
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],  # Required to load Skills
    allowed_tools=["Skill"]
)
```

TypeScript:
```typescript
// Wrong - Skills won't be loaded
const options = {
  allowedTools: ["Skill"]
};

// Correct - Skills will be loaded
const options = {
  settingSources: ["user", "project"],  // Required to load Skills
  allowedTools: ["Skill"]
};
```

**Check working directory**: The SDK loads Skills relative to the `cwd` option. Ensure it points to a directory containing `.claude/skills/`:

Python:
```python
# Ensure your cwd points to the directory containing .claude/skills/
options = ClaudeAgentOptions(
    cwd="/path/to/project",  # Must contain .claude/skills/
    setting_sources=["user", "project"],  # Required to load Skills
    allowed_tools=["Skill"]
)
```

TypeScript:
```typescript
// Ensure your cwd points to the directory containing .claude/skills/
const options = {
  cwd: "/path/to/project",  // Must contain .claude/skills/
  settingSources: ["user", "project"],  // Required to load Skills
  allowedTools: ["Skill"]
};
```

**Verify filesystem location**:
```bash
# Check project Skills
ls .claude/skills/*/SKILL.md

# Check personal Skills
ls ~/.claude/skills/*/SKILL.md
```

**Skill Not Being Used**

- **Check the Skill tool is enabled**: Confirm `"Skill"` is in your `allowedTools`.
- **Check the description**: Ensure it's specific and includes relevant keywords. See [Agent Skills Best Practices](/docs/en/agents-and-tools/agent-skills/best-practices#writing-effective-descriptions) for guidance on writing effective descriptions.

**Additional Troubleshooting**

For general Skills troubleshooting (YAML syntax, debugging, etc.), see the [Claude Code Skills troubleshooting section](https://code.claude.com/docs/en/skills#troubleshooting).

#### Related Documentation

**Skills Guides**
- [Agent Skills in Claude Code](https://code.claude.com/docs/en/skills): Complete Skills guide with creation, examples, and troubleshooting
- [Agent Skills Overview](/docs/en/agents-and-tools/agent-skills/overview): Conceptual overview, benefits, and architecture
- [Agent Skills Best Practices](/docs/en/agents-and-tools/agent-skills/best-practices): Authoring guidelines for effective Skills
- [Agent Skills Cookbook](https://platform.claude.com/cookbook/skills-notebooks-01-skills-introduction): Example Skills and templates

**SDK Resources**
- [Subagents in the SDK](/docs/en/agent-sdk/subagents): Similar filesystem-based agents with programmatic options
- [Slash Commands in the SDK](/docs/en/agent-sdk/slash-commands): User-invoked commands
- [SDK Overview](/docs/en/agent-sdk/overview): General SDK concepts
- [TypeScript SDK Reference](/docs/en/agent-sdk/typescript): Complete API documentation
- [Python SDK Reference](/docs/en/agent-sdk/python): Complete API documentation

### MCP (Model Context Protocol)

Extend Claude with custom tools via MCP servers. Connect to databases, browsers, APIs, and more.

**Configuration in `.mcp.json`:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem"],
      "env": { "ALLOWED_PATHS": "/Users/me/projects" }
    }
  }
}
```

**Usage in SDK:**

TypeScript:
```typescript
for await (const message of query({
  prompt: "List files in my project",
  options: {
    mcpServers: {
      "filesystem": {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem"],
        env: { ALLOWED_PATHS: "/Users/me/projects" }
      }
    },
    allowedTools: ["mcp__filesystem__list_files"]
  }
})) {
  console.log(message.result);
}
```

**Transport Types:**
- **stdio**: External processes via stdin/stdout
- **HTTP/SSE**: Remote servers with network communication
- **SDK servers**: In-process servers within your application

**Authentication:**
```json
{
  "mcpServers": {
    "secure-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "X-API-Key": "${API_KEY:-default-key}"
      }
    }
  }
}
```

## System Prompts

Customize Claude's behavior with four approaches.

### Method 1: CLAUDE.md Files

Project-specific context automatically read by SDK.

**Location:**
- Project: `CLAUDE.md` or `.claude/CLAUDE.md`
- User: `~/.claude/CLAUDE.md`

**⚠️ Important:** Must set `settingSources: ['project']` or `setting_sources=["project"]`
```markdown
# Project Guidelines

## Code Style
- Use TypeScript strict mode
- Prefer functional components in React

## Commands
- Build: `npm run build`
- Test: `npm test`
```

TypeScript:
```typescript
for await (const message of query({
  prompt: "Add a new React component",
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" },
    settingSources: ["project"]  // Required
  }
})) { }
```

### Method 2: Output Styles

Persistent configurations stored as markdown files.

TypeScript:
```typescript
import { writeFile } from "fs/promises";
import { join } from "path";

await writeFile(
  join(process.env.HOME, ".claude/output-styles/code-reviewer.md"),
  `---
name: Code Reviewer
description: Thorough code review assistant
---

You are an expert code reviewer.
1. Check for bugs and security issues
2. Evaluate performance
3. Rate code quality (1-10)`
);
```

Activate via CLI: `/output-style code-reviewer`

### Method 3: systemPrompt with Append

Add custom instructions while preserving Claude Code defaults.

TypeScript:
```typescript
for await (const message of query({
  prompt: "Write a Python function",
  options: {
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: "Always include detailed docstrings and type hints."
    }
  }
})) { }
```

### Method 4: Custom System Prompts

Complete control over behavior.

Python:
```python
custom_prompt = """You are a Python coding specialist.
- Write clean, well-documented code
- Use type hints for all functions
- Explain your code choices"""

async for message in query(
    prompt="Create a data processing pipeline",
    options=ClaudeAgentOptions(system_prompt=custom_prompt)
):
    print(message)
```

## Session Management

Continue conversations across interactions with full context.

### Getting Session ID

TypeScript:
```typescript
let sessionId: string | undefined

const response = query({
  prompt: "Help me build a web application",
  options: { model: "claude-sonnet-4-5" }
})

for await (const message of response) {
  if (message.type === 'system' && message.subtype === 'init') {
    sessionId = message.session_id
    console.log(`Session: ${sessionId}`)
  }
}
```

### Resuming Sessions

TypeScript:
```typescript
const response = query({
  prompt: "Continue implementing authentication",
  options: {
    resume: "session-xyz",
    model: "claude-sonnet-4-5"
  }
})
```

### Forking Sessions

Create new branch from existing session.

| Behavior | `forkSession: false` | `forkSession: true` |
|----------|---------------------|---------------------|
| Session ID | Same as original | New ID generated |
| History | Appends to original | Creates new branch |
| Original | Modified | Preserved |

TypeScript:
```typescript
const forkedResponse = query({
  prompt: "Now let's try GraphQL instead",
  options: {
    resume: sessionId,
    forkSession: true,  // Creates new branch
    model: "claude-sonnet-4-5"
  }
})
```

## File Checkpointing

Track file modifications and restore to any previous state.

**⚠️ Important:** Only tracks Write, Edit, NotebookEdit tools. NOT Bash commands.

### Setup

**1. Set environment variable:**
```bash
export CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING=1
```

**2. Enable checkpointing:**

Python:
```python
import os

options = ClaudeAgentOptions(
    enable_file_checkpointing=True,
    permission_mode="acceptEdits",
    extra_args={"replay-user-messages": None},  # Required for UUIDs
    env={**os.environ, "CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING": "1"}
)
```

**3. Capture checkpoint UUID:**

Python:
```python
checkpoint_id = None
session_id = None

async for message in client.receive_response():
    if isinstance(message, UserMessage) and message.uuid:
        checkpoint_id = message.uuid
    if isinstance(message, ResultMessage):
        session_id = message.session_id
```

**4. Rewind files:**

Python:
```python
async with ClaudeSDKClient(ClaudeAgentOptions(
    enable_file_checkpointing=True,
    resume=session_id
)) as client:
    await client.query("")  # Empty prompt
    async for message in client.receive_response():
        await client.rewind_files(checkpoint_id)
        break
```

### Common Patterns

**Checkpoint before risky operations:**
```python
safe_checkpoint = None

async for message in client.receive_response():
    if isinstance(message, UserMessage) and message.uuid:
        safe_checkpoint = message.uuid

    if your_revert_condition and safe_checkpoint:
        await client.rewind_files(safe_checkpoint)
        break
```

## Permissions & Control

### Permission Evaluation Flow

1. **Hooks** - Run first, can allow/deny/continue
2. **Permission rules** - Check declarative rules in `settings.json`
3. **Permission mode** - Apply active mode
4. **canUseTool callback** - If not resolved, call callback

### Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | No auto-approvals |
| `acceptEdits` | Auto-approve file edits + filesystem commands |
| `dontAsk` | Auto-deny unless explicitly allowed |
| `bypassPermissions` | Auto-approve all (⚠️ caution) |

Python:
```python
async for message in query(
    prompt="Help me refactor this code",
    options=ClaudeAgentOptions(permission_mode="acceptEdits")
):
    print(message.result)
```

**Dynamic change:**
```python
q = query(prompt="...", options=ClaudeAgentOptions(permission_mode="default"))
await q.set_permission_mode("acceptEdits")
```

## Security & Deployment

### What We're Protecting Against

**Prompt injection**: Instructions embedded in content (files, webpages)
**Model error**: Unexpected behavior

Defense in depth is good practice even though Claude is designed to resist these.

### Built-in Security Features

| Feature | Description |
|---------|-------------|
| **Permissions system** | Configurable allow/block/prompt rules |
| **Static analysis** | Flags risky bash commands |
| **Web search summarization** | Reduces prompt injection risk |
| **Sandbox mode** | Restricts filesystem/network access |

### Security Principles

**1. Security Boundaries**
- Place sensitive resources outside agent's boundary
- Use proxy pattern for credential injection

**2. Least Privilege**
- Mount only needed directories (read-only preferred)
- Restrict network to specific endpoints
- Drop Linux capabilities in containers

**3. Defense in Depth**
- Layer multiple controls
- Container isolation + network restrictions + filesystem controls

### Isolation Technologies

| Technology | Isolation | Overhead | Complexity |
|------------|-----------|----------|------------|
| Sandbox runtime | Good | Very low | Low |
| Docker | Setup dependent | Low | Medium |
| gVisor | Excellent | Medium/High | Medium |
| VMs (Firecracker) | Excellent | High | Medium/High |

#### Docker Security-Hardened
```bash
docker run \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --network none \
  --memory 2g \
  --cpus 2 \
  --pids-limit 100 \
  --user 1000:1000 \
  -v /path/to/code:/workspace:ro \
  -v /var/run/proxy.sock:/var/run/proxy.sock:ro \
  agent-image
```

**Unix Socket Architecture:**
- No network interfaces in container
- All communication through mounted Unix socket
- Proxy on host enforces allowlists, injects credentials

### Credential Management

**The Proxy Pattern (Recommended)**

Benefits:
1. Agent never sees credentials
2. Enforce endpoint allowlists
3. Log all requests
4. Centralized credential storage

**Configure proxy:**
```bash
export ANTHROPIC_BASE_URL="http://localhost:8080"
# OR
export HTTP_PROXY="http://localhost:8080"
export HTTPS_PROXY="http://localhost:8080"
```

**Proxy options:**
- Envoy Proxy (with `credential_injector`)
- mitmproxy (TLS-terminating)
- Squid (caching + ACLs)
- LiteLLM (LLM gateway)

### Filesystem Configuration

**Read-only mounting:**
```bash
docker run -v /path/to/code:/workspace:ro agent-image
```

**⚠️ Files to exclude:**
- `.env`, `.env.local`
- `~/.git-credentials`
- `~/.aws/credentials`
- `~/.docker/config.json`
- `*.pem`, `*.key`

## Claude Code Features

Enable with `setting_sources=["project"]` or `settingSources: ['project']`

| Feature | Location |
|---------|----------|
| **Skills** | `.claude/skills/SKILL.md` |
| **Slash commands** | `.claude/commands/*.md` |
| **Memory** | `CLAUDE.md` or `.claude/CLAUDE.md` |
| **Plugins** | Programmatic via `plugins` option |

## Tracking Costs and Usage

Understand and track token usage for billing in the Claude Agent SDK.

The Claude Agent SDK provides detailed token usage information for each interaction with Claude. This guide explains how to properly track costs and understand usage reporting, especially when dealing with parallel tool uses and multi-step conversations.

For complete API documentation, see the [TypeScript SDK reference](/docs/en/agent-sdk/typescript).

### Understanding Token Usage

When Claude processes requests, it reports token usage at the message level. This usage data is essential for tracking costs and billing users appropriately.

**Key Concepts**

1. **Steps**: A step is a single request/response pair between your application and Claude
2. **Messages**: Individual messages within a step (text, tool uses, tool results)
3. **Usage**: Token consumption data attached to assistant messages

### Usage Reporting Structure

**Single vs Parallel Tool Use**

When Claude executes tools, the usage reporting differs based on whether tools are executed sequentially or in parallel:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Example: Tracking usage in a conversation
const result = await query({
  prompt: "Analyze this codebase and run tests",
  options: {
    onMessage: (message) => {
      if (message.type === 'assistant' && message.usage) {
        console.log(`Message ID: ${message.id}`);
        console.log(`Usage:`, message.usage);
      }
    }
  }
});
```

Python:
```python
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage
import asyncio

# Example: Tracking usage in a conversation
async def track_usage():
    # Process messages as they arrive
    async for message in query(
        prompt="Analyze this codebase and run tests"
    ):
        if isinstance(message, AssistantMessage) and hasattr(message, 'usage'):
            print(f"Message ID: {message.id}")
            print(f"Usage: {message.usage}")

asyncio.run(track_usage())
```

**Message Flow Example**

Here's how messages and usage are reported in a typical multi-step conversation:

```
Step 1: Initial request with parallel tool uses
assistant (text)      { id: "msg_1", usage: { output_tokens: 100, ... } }
assistant (tool_use)  { id: "msg_1", usage: { output_tokens: 100, ... } }
assistant (tool_use)  { id: "msg_1", usage: { output_tokens: 100, ... } }
assistant (tool_use)  { id: "msg_1", usage: { output_tokens: 100, ... } }
user (tool_result)
user (tool_result)
user (tool_result)

Step 2: Follow-up response
assistant (text)      { id: "msg_2", usage: { output_tokens: 98, ... } }
```

### Important Usage Rules

**1. Same ID = Same Usage**

All messages with the same `id` field report identical usage. When Claude sends multiple messages in the same turn (e.g., text + tool uses), they share the same message ID and usage data.

```typescript
// All these messages have the same ID and usage
const messages = [
  { type: 'assistant', id: 'msg_123', usage: { output_tokens: 100 } },
  { type: 'assistant', id: 'msg_123', usage: { output_tokens: 100 } },
  { type: 'assistant', id: 'msg_123', usage: { output_tokens: 100 } }
];

// Charge only once per unique message ID
const uniqueUsage = messages[0].usage; // Same for all messages with this ID
```

**2. Charge Once Per Step**

You should only charge users once per step, not for each individual message. When you see multiple assistant messages with the same ID, use the usage from any one of them.

**3. Result Message Contains Cumulative Usage**

The final `result` message contains the total cumulative usage from all steps in the conversation:

```typescript
// Final result includes total usage
const result = await query({
  prompt: "Multi-step task",
  options: { /* ... */ }
});

console.log("Total usage:", result.usage);
console.log("Total cost:", result.usage.total_cost_usd);
```

**4. Per-Model Usage Breakdown**

The result message also includes `modelUsage`, which provides authoritative per-model usage data. Like `total_cost_usd`, this field is accurate and suitable for billing purposes. This is especially useful when using multiple models (e.g., Haiku for subagents, Opus for the main agent).

```typescript
// modelUsage provides per-model breakdown
type ModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  webSearchRequests: number
  costUSD: number
  contextWindow: number
}

// Access from result message
const result = await query({ prompt: "..." });

// result.modelUsage is a map of model name to ModelUsage
for (const [modelName, usage] of Object.entries(result.modelUsage)) {
  console.log(`${modelName}: ${usage.costUSD.toFixed(4)}`);
  console.log(`  Input tokens: ${usage.inputTokens}`);
  console.log(`  Output tokens: ${usage.outputTokens}`);
}
```

For the complete type definitions, see the [TypeScript SDK reference](/docs/en/agent-sdk/typescript).

### Implementation: Cost Tracking System

Here's a complete example of implementing a cost tracking system:

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

class CostTracker {
  private processedMessageIds = new Set<string>();
  private stepUsages: Array<any> = [];

  async trackConversation(prompt: string) {
    const result = await query({
      prompt,
      options: {
        onMessage: (message) => {
          this.processMessage(message);
        }
      }
    });

    return {
      result,
      stepUsages: this.stepUsages,
      totalCost: result.usage?.total_cost_usd || 0
    };
  }

  private processMessage(message: any) {
    // Only process assistant messages with usage
    if (message.type !== 'assistant' || !message.usage) {
      return;
    }

    // Skip if we've already processed this message ID
    if (this.processedMessageIds.has(message.id)) {
      return;
    }

    // Mark as processed and record usage
    this.processedMessageIds.add(message.id);
    this.stepUsages.push({
      messageId: message.id,
      timestamp: new Date().toISOString(),
      usage: message.usage,
      costUSD: this.calculateCost(message.usage)
    });
  }

  private calculateCost(usage: any): number {
    // Implement your pricing calculation here
    const inputCost = usage.input_tokens * 0.00003;
    const outputCost = usage.output_tokens * 0.00015;
    const cacheReadCost = (usage.cache_read_input_tokens || 0) * 0.0000075;

    return inputCost + outputCost + cacheReadCost;
  }
}

// Usage
const tracker = new CostTracker();
const { result, stepUsages, totalCost } = await tracker.trackConversation(
  "Analyze and refactor this code"
);

console.log(`Steps processed: ${stepUsages.length}`);
console.log(`Total cost: ${totalCost.toFixed(4)}`);
```

Python:
```python
from claude_agent_sdk import query, AssistantMessage, ResultMessage
from datetime import datetime
import asyncio

class CostTracker:
    def __init__(self):
        self.processed_message_ids = set()
        self.step_usages = []

    async def track_conversation(self, prompt):
        result = None

        # Process messages as they arrive
        async for message in query(prompt=prompt):
            self.process_message(message)

            # Capture the final result message
            if isinstance(message, ResultMessage):
                result = message

        return {
            "result": result,
            "step_usages": self.step_usages,
            "total_cost": result.total_cost_usd if result else 0
        }

    def process_message(self, message):
        # Only process assistant messages with usage
        if not isinstance(message, AssistantMessage) or not hasattr(message, 'usage'):
            return

        # Skip if already processed this message ID
        message_id = getattr(message, 'id', None)
        if not message_id or message_id in self.processed_message_ids:
            return

        # Mark as processed and record usage
        self.processed_message_ids.add(message_id)
        self.step_usages.append({
            "message_id": message_id,
            "timestamp": datetime.now().isoformat(),
            "usage": message.usage,
            "cost_usd": self.calculate_cost(message.usage)
        })

    def calculate_cost(self, usage):
        # Implement your pricing calculation
        input_cost = usage.get("input_tokens", 0) * 0.00003
        output_cost = usage.get("output_tokens", 0) * 0.00015
        cache_read_cost = usage.get("cache_read_input_tokens", 0) * 0.0000075

        return input_cost + output_cost + cache_read_cost

# Usage
async def main():
    tracker = CostTracker()
    result = await tracker.track_conversation("Analyze and refactor this code")

    print(f"Steps processed: {len(result['step_usages'])}")
    print(f"Total cost: ${result['total_cost']:.4f}")

asyncio.run(main())
```

### Handling Edge Cases

**Output Token Discrepancies**

In rare cases, you might observe different `output_tokens` values for messages with the same ID. When this occurs:

1. **Use the highest value** - The final message in a group typically contains the accurate total
2. **Verify against total cost** - The `total_cost_usd` in the result message is authoritative
3. **Report inconsistencies** - File issues at the [Claude Code GitHub repository](https://github.com/anthropics/claude-code/issues)

**Cache Token Tracking**

When using prompt caching, track these token types separately:

```typescript
interface CacheUsage {
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  cache_creation: {
    ephemeral_5m_input_tokens: number;
    ephemeral_1h_input_tokens: number;
  };
}
```

### Best Practices

1. **Use Message IDs for Deduplication**: Always track processed message IDs to avoid double-charging
2. **Monitor the Result Message**: The final result contains authoritative cumulative usage
3. **Implement Logging**: Log all usage data for auditing and debugging
4. **Handle Failures Gracefully**: Track partial usage even if a conversation fails
5. **Consider Streaming**: For streaming responses, accumulate usage as messages arrive

### Usage Fields Reference

Each usage object contains:

- `input_tokens`: Base input tokens processed
- `output_tokens`: Tokens generated in the response
- `cache_creation_input_tokens`: Tokens used to create cache entries
- `cache_read_input_tokens`: Tokens read from cache
- `service_tier`: The service tier used (e.g., "standard")
- `total_cost_usd`: Total cost in USD (only in result message)

### Example: Building a Billing Dashboard

Here's how to aggregate usage data for a billing dashboard:

```typescript
class BillingAggregator {
  private userUsage = new Map<string, {
    totalTokens: number;
    totalCost: number;
    conversations: number;
  }>();

  async processUserRequest(userId: string, prompt: string) {
    const tracker = new CostTracker();
    const { result, stepUsages, totalCost } = await tracker.trackConversation(prompt);

    // Update user totals
    const current = this.userUsage.get(userId) || {
      totalTokens: 0,
      totalCost: 0,
      conversations: 0
    };

    const totalTokens = stepUsages.reduce((sum, step) =>
      sum + step.usage.input_tokens + step.usage.output_tokens, 0
    );

    this.userUsage.set(userId, {
      totalTokens: current.totalTokens + totalTokens,
      totalCost: current.totalCost + totalCost,
      conversations: current.conversations + 1
    });

    return result;
  }

  getUserBilling(userId: string) {
    return this.userUsage.get(userId) || {
      totalTokens: 0,
      totalCost: 0,
      conversations: 0
    };
  }
}
```

### Related Documentation

- [TypeScript SDK Reference](/docs/en/agent-sdk/typescript) - Complete API documentation
- [SDK Overview](/docs/en/agent-sdk/overview) - Getting started with the SDK
- [Permissions & Control](#permissions--control) - Managing tool permissions

## Todo Lists

Track and display todos using the Claude Agent SDK for organized task management.

Todo tracking provides a structured way to manage tasks and display progress to users. The Claude Agent SDK includes built-in todo functionality that helps organize complex workflows and keep users informed about task progression.

### Todo Lifecycle

Todos follow a predictable lifecycle:
1. **Created** as `pending` when tasks are identified
2. **Activated** to `in_progress` when work begins
3. **Completed** when the task finishes successfully
4. **Removed** when all tasks in a group are completed

### When Todos Are Used

The SDK automatically creates todos for:
- **Complex multi-step tasks** requiring 3 or more distinct actions
- **User-provided task lists** when multiple items are mentioned
- **Non-trivial operations** that benefit from progress tracking
- **Explicit requests** when users ask for todo organization

### Examples

**Monitoring Todo Changes**

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Optimize my React app performance and track progress with todos",
  options: { maxTurns: 15 }
})) {
  // Todo updates are reflected in the message stream
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "tool_use" && block.name === "TodoWrite") {
        const todos = block.input.todos;

        console.log("Todo Status Update:");
        todos.forEach((todo, index) => {
          const status = todo.status === "completed" ? "✅" :
                        todo.status === "in_progress" ? "🔧" : "❌";
          console.log(`${index + 1}. ${status} ${todo.content}`);
        });
      }
    }
  }
}
```

Python:
```python
from claude_agent_sdk import query, AssistantMessage, ToolUseBlock

async for message in query(
    prompt="Optimize my React app performance and track progress with todos",
    options={"max_turns": 15}
):
    # Todo updates are reflected in the message stream
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, ToolUseBlock) and block.name == "TodoWrite":
                todos = block.input["todos"]

                print("Todo Status Update:")
                for i, todo in enumerate(todos):
                    status = "✅" if todo["status"] == "completed" else \
                            "🔧" if todo["status"] == "in_progress" else "❌"
                    print(f"{i + 1}. {status} {todo['content']}")
```

**Real-time Progress Display**

TypeScript:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

class TodoTracker {
  private todos: any[] = [];

  displayProgress() {
    if (this.todos.length === 0) return;

    const completed = this.todos.filter(t => t.status === "completed").length;
    const inProgress = this.todos.filter(t => t.status === "in_progress").length;
    const total = this.todos.length;

    console.log(`\nProgress: ${completed}/${total} completed`);
    console.log(`Currently working on: ${inProgress} task(s)\n`);

    this.todos.forEach((todo, index) => {
      const icon = todo.status === "completed" ? "✅" :
                  todo.status === "in_progress" ? "🔧" : "❌";
      const text = todo.status === "in_progress" ? todo.activeForm : todo.content;
      console.log(`${index + 1}. ${icon} ${text}`);
    });
  }

  async trackQuery(prompt: string) {
    for await (const message of query({
      prompt,
      options: { maxTurns: 20 }
    })) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "tool_use" && block.name === "TodoWrite") {
            this.todos = block.input.todos;
            this.displayProgress();
          }
        }
      }
    }
  }
}

// Usage
const tracker = new TodoTracker();
await tracker.trackQuery("Build a complete authentication system with todos");
```

Python:
```python
from claude_agent_sdk import query, AssistantMessage, ToolUseBlock
from typing import List, Dict

class TodoTracker:
    def __init__(self):
        self.todos: List[Dict] = []

    def display_progress(self):
        if not self.todos:
            return

        completed = len([t for t in self.todos if t["status"] == "completed"])
        in_progress = len([t for t in self.todos if t["status"] == "in_progress"])
        total = len(self.todos)

        print(f"\nProgress: {completed}/{total} completed")
        print(f"Currently working on: {in_progress} task(s)\n")

        for i, todo in enumerate(self.todos):
            icon = "✅" if todo["status"] == "completed" else \
                  "🔧" if todo["status"] == "in_progress" else "❌"
            text = todo["activeForm"] if todo["status"] == "in_progress" else todo["content"]
            print(f"{i + 1}. {icon} {text}")

    async def track_query(self, prompt: str):
        async for message in query(
            prompt=prompt,
            options={"max_turns": 20}
        ):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock) and block.name == "TodoWrite":
                        self.todos = block.input["todos"]
                        self.display_progress()

# Usage
tracker = TodoTracker()
await tracker.track_query("Build a complete authentication system with todos")
```

### Related Documentation

- [TypeScript SDK Reference](/docs/en/agent-sdk/typescript) - Complete API documentation
- [Python SDK Reference](/docs/en/agent-sdk/python) - Complete API documentation
- [SDK Overview](/docs/en/agent-sdk/overview) - Getting started with the SDK
- [Session Management](#session-management) - Managing long-running conversations with todos

## Comparisons

### Agent SDK vs Client SDK

**Client SDK**: Manual tool execution loop
**Agent SDK**: Built-in tool execution
```python
# Client SDK: Manual
response = client.messages.create(...)
while response.stop_reason == "tool_use":
    result = your_tool_executor(response.tool_use)
    response = client.messages.create(tool_result=result, ...)

# Agent SDK: Autonomous
async for message in query(prompt="Fix the bug"):
    print(message)
```

### Agent SDK vs Claude Code CLI

| Use case | Best choice |
|----------|-------------|
| Interactive development | CLI |
| CI/CD pipelines | SDK |
| Custom applications | SDK |
| Production automation | SDK |

## Resources

- [TypeScript Changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md)
- [Python Changelog](https://github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md)
- [Example Agents](https://github.com/anthropics/claude-agent-sdk-demos)
- [JSON Schema Docs](https://json-schema.org/)
- [MCP Server Implementations](https://github.com/modelcontextprotocol/servers)
- [Security Documentation](https://code.claude.com/docs/en/security)
- [Custom Tools Guide](/docs/en/agent-sdk/custom-tools)
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)

---

*Comprehensive Claude Agent SDK Reference - Last Updated: January 2026*
