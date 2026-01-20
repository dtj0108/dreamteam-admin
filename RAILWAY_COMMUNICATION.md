# Railway Communication Architecture

This document explains how the codebase communicates with Railway for AI agent functionality.

> **Related Documentation:**
> - [AGENTS_IMPLEMENTATION.md](./AGENTS_IMPLEMENTATION.md) - Complete agent system implementation guide (database schema, API reference, frontend integration)

## Overview

The application uses **Railway** to host a dedicated Express server (`agent-server`) that handles AI agent chat requests. This architectural decision exists because:

1. **Claude Agent SDK requires subprocess spawning** - The SDK launches Claude Code CLI and MCP servers as child processes
2. **Vercel serverless doesn't support subprocesses** - Serverless functions are stateless and can't spawn persistent child processes
3. **Streaming SSE responses** - Long-running AI conversations need Server-Sent Events (SSE), which work better on a persistent server

## Architecture Diagram

```
┌─────────────────┐      ┌─────────────────────────┐      ┌──────────────────────────────┐
│                 │      │                         │      │     Railway Express          │
│   Client App    │─────▶│   Vercel (Next.js)      │─────▶│     (agent-server)           │
│   (Browser/     │      │                         │      │                              │
│    Mobile)      │      │   /api/agent-chat       │      │   /agent-chat                │
│                 │      │   ────────────────      │      │   ─────────────              │
└─────────────────┘      │   Rewrite to Railway    │      │   Claude Agent SDK           │
                         │                         │      │         │                    │
                         └─────────────────────────┘      │         ▼                    │
                                                          │   ┌─────────────┐            │
                                                          │   │ Claude Code │            │
                                                          │   │    CLI      │            │
                                                          │   └──────┬──────┘            │
                                                          │          │                   │
                                                          │          ▼                   │
                                                          │   ┌─────────────┐            │
                                                          │   │ MCP Server  │───▶ Supabase
                                                          │   │ (291 tools) │            │
                                                          │   └─────────────┘            │
                                                          └──────────────────────────────┘
```

## Request Flow

### 1. Client Makes Request
The client (web or mobile) sends a POST request to `/api/agent-chat` on the Vercel-hosted Next.js app:

```typescript
POST /api/agent-chat
{
  "message": "What are my expenses this month?",
  "agentId": "uuid-of-agent",
  "workspaceId": "uuid-of-workspace",
  "conversationId": "optional-existing-conversation-id"
}
```

### 2. Next.js Rewrites to Railway
The request never hits a Next.js API route. Instead, `next.config.ts` intercepts it with a rewrite:

```typescript
// apps/finance/next.config.ts
async rewrites() {
  return {
    beforeFiles: [
      {
        source: "/api/agent-chat",
        destination: "https://agent-server-production-580f.up.railway.app/agent-chat",
      },
    ],
    // ...
  };
}
```

The `beforeFiles` placement ensures the rewrite happens before filesystem routing or middleware.

### 3. Railway Express Server Handles Request
The request arrives at the Express server running on Railway:

```typescript
// apps/agent-server/src/index.ts
app.post("/agent-chat", agentChatHandler)
```

### 4. Claude Agent SDK Processes Message
The `agentChatHandler` (`apps/agent-server/src/agent-chat.ts:54`) orchestrates:

1. **Authentication** - Validates session via Supabase (supports cookies for web, Bearer tokens for mobile)
2. **Agent Configuration** - Loads from workspace's deployed team config (see [Deployed Team Loading](#deployed-team-loading))
3. **MCP Server Setup** - Configures the MCP server with workspace context:
   ```typescript
   const mcpServerConfig: McpStdioServerConfig = {
     type: "stdio",
     command: "node",
     args: [mcpServerPath],
     env: {
       SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
       SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
       WORKSPACE_ID: workspaceId,
       USER_ID: session.id,
     },
   }
   ```
4. **Query Execution** - Runs the Claude Agent SDK query with streaming

### 5. Response Streams Back via SSE
The handler sets up Server-Sent Events and streams responses:

```typescript
res.setHeader("Content-Type", "text/event-stream")
res.setHeader("Cache-Control", "no-cache")
res.setHeader("Connection", "keep-alive")

// Stream events to client
sendEvent("text", { type: "text", content: "...", isComplete: false })
sendEvent("tool_start", { type: "tool_start", toolName: "...", ... })
sendEvent("tool_result", { type: "tool_result", ... })
sendEvent("done", { type: "done", usage: { ... } })
```

## Configuration Files

### `railway.toml`
Railway deployment configuration at the repo root:

```toml
[build]
dockerfilePath = "apps/agent-server/Dockerfile"
watchPatterns = ["apps/agent-server/**", "packages/mcp-server/**", "packages/database/**"]

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

Key points:
- **`dockerfilePath`** - Points to the Dockerfile for the agent-server
- **`watchPatterns`** - Railway rebuilds when these paths change
- **`healthcheckPath`** - Railway calls `/health` to verify the server is running

### `apps/agent-server/Dockerfile`
Multi-stage Docker build optimized for Railway:

```dockerfile
FROM node:20

# Create non-root user (Claude Code CLI requirement)
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install dependencies and build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# ... copy workspace packages ...
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@repo/mcp-server build
RUN pnpm --filter=@repo/agent-server build

# Run as non-root user
USER appuser
ENV HOME=/home/appuser
EXPOSE 3002
CMD ["node", "dist/index.js"]
```

Important details:
- Uses **full `node:20` image** (not alpine) for Claude Code CLI compatibility
- **Non-root user** is required - Claude Code CLI refuses `--dangerously-skip-permissions` when running as root
- Builds both **MCP server** and **agent-server** (MCP is spawned at runtime)

### `apps/finance/next.config.ts`
Contains the rewrite rule that proxies requests to Railway:

```typescript
async rewrites() {
  return {
    beforeFiles: [
      {
        source: "/api/agent-chat",
        destination: "https://agent-server-production-580f.up.railway.app/agent-chat",
      },
    ],
  };
}
```

## Environment Variables

### Railway (agent-server)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (Railway sets this automatically, defaults to 3002) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Agent SDK |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) |

### Vercel (Next.js app)

The Next.js app doesn't need Railway-specific variables since requests are rewritten, not proxied with credentials.

## Deployment Process

### Automatic Deployment (Recommended)

1. **Push to `main` branch** - Railway auto-deploys from the connected GitHub repo
2. Railway detects changes in `watchPatterns` and triggers a build
3. Docker image is built using `apps/agent-server/Dockerfile`
4. Health check verifies `/health` endpoint responds
5. Traffic is routed to the new deployment

### Manual Deployment

```bash
# From repo root
railway up
```

### Monitoring

- **Railway Dashboard**: View logs, metrics, and deployment status
- **Health Check**: `GET https://agent-server-production-580f.up.railway.app/health`
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0"
  }
  ```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check for Railway |
| `/agent-chat` | POST | Main AI agent chat endpoint |
| `/agent-chat` | OPTIONS | CORS preflight handler |

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that the request includes valid authentication (cookie or Bearer token)
   - Verify Supabase credentials are set in Railway environment

2. **Agent not found (404)**
   - Verify the `agentId` exists and `is_active = true` in the database

3. **Claude Code CLI errors**
   - Ensure the Docker container runs as non-root user
   - Check `ANTHROPIC_API_KEY` is set correctly

4. **Rate limit errors (429)**
   - The Task tool is disabled to prevent subagent spawning which can cause rate limits
   - If still occurring, check Anthropic API usage limits

### Debug Logging

The agent-server includes comprehensive debug logging:
```
[Agent Chat DEBUG] ========== NEW REQUEST ==========
[Agent Chat DEBUG] Origin: https://yourapp.vercel.app
[Agent Chat DEBUG] Auth header: Bearer sk-ant...
[Agent Chat DEBUG] Session: user=uuid-here
[Claude Code STDERR] ... (subprocess output)
```

## Security Considerations

- **CORS is open** (`origin: "*"`) - acceptable since authentication is verified per-request
- **Service role key** is used for database access - grants admin privileges
- **Non-root Docker user** - required for Claude Code CLI security model
- **Streaming responses** - use SSE which maintains connection state

## Deployed Team Loading

The agent-server loads agent configuration from the workspace's **deployed team config** rather than directly from the `ai_agents` table. This enables multi-agent teams with delegation.

### Request Flow (Team-Based)

```
POST /agent-chat { workspaceId, message }
         ↓
Load workspace_deployed_teams.active_config
         ↓
Find head agent from config.team.head_agent_id
         ↓
Head agent runs with delegate_to_agent tool
         ↓
Delegation → internal call to team member agent
         ↓
Response flows back to user
```

### Loading Deployed Config

```typescript
async function loadDeployedConfig(workspaceId: string) {
  const { data } = await supabase
    .from('workspace_deployed_teams')
    .select('active_config')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single()

  return data?.active_config as DeployedTeamConfig
}
```

### Config Structure

The `active_config` JSONB contains everything needed at runtime:

```typescript
interface DeployedTeamConfig {
  team: {
    id: string
    name: string
    slug: string
    head_agent_id: string | null
  }
  agents: Array<{
    id: string
    slug: string
    name: string
    system_prompt: string
    model: 'sonnet' | 'opus' | 'haiku'
    is_enabled: boolean
    tools: Tool[]
    skills: Skill[]
    mind: Mind[]
    rules: Rule[]
  }>
  delegations: Array<{
    from_agent_slug: string
    to_agent_slug: string
    condition: string | null
    context_template: string | null
    is_enabled: boolean
  }>
  team_mind: Mind[]
}
```

### The `delegate_to_agent` Tool

Injected into the head agent's tool list at runtime:

```typescript
const delegateTool = {
  name: "delegate_to_agent",
  description: `Delegate a task to a specialist agent. Available: ${
    config.delegations.map(d => d.to_agent_slug).join(', ')
  }`,
  input_schema: {
    type: "object",
    properties: {
      agent_slug: { type: "string", enum: [...slugs] },
      task: { type: "string" },
      context: { type: "string" }
    },
    required: ["agent_slug", "task"]
  }
}
```

### Delegation Handler

When the head agent calls `delegate_to_agent`:

```typescript
async function handleDelegation(toolInput, deployedConfig, workspaceId, userId) {
  // 1. Find target agent in deployed config
  const targetAgent = deployedConfig.agents.find(a => a.slug === toolInput.agent_slug)

  // 2. Build context from delegation rule
  const delegation = deployedConfig.delegations.find(d => d.to_agent_slug === toolInput.agent_slug)
  let context = toolInput.context || ''
  if (delegation?.context_template) {
    context = delegation.context_template.replace('{{context}}', context)
  }

  // 3. Run query with target agent (no further delegation allowed)
  const response = await runAgentQuery({
    agent: targetAgent,
    message: `${context}\n\nTask: ${toolInput.task}`,
    workspaceId,
    userId,
    allowDelegation: false  // Prevent infinite chains
  })

  return { agent: targetAgent.name, response: response.text }
}
```

### Fallback: Single Agent Mode

If no deployed team exists, fall back to loading a single agent by ID:

```typescript
// Check for deployed team first
const deployedConfig = await loadDeployedConfig(workspaceId)
if (deployedConfig) {
  // Team mode: use head agent + delegation
  return runTeamChat(deployedConfig, message)
} else if (agentId) {
  // Legacy mode: single agent by ID
  return runSingleAgentChat(agentId, message)
} else {
  throw new Error('No agent or team configured for workspace')
}
```

## Related Files

- `apps/agent-server/src/index.ts` - Express server entry point
- `apps/agent-server/src/agent-chat.ts` - Main chat handler with Claude Agent SDK
- `apps/agent-server/src/lib/supabase.ts` - Authentication helpers
- `apps/agent-server/src/lib/agent-session.ts` - Session persistence
- `packages/mcp-server/` - MCP server with 291 tools for database operations

---

## Agent Communication via Channels

This section describes the agent-to-agent communication system using dedicated channels.

### Overview

When agents need to collaborate, they communicate via channels visible to users:

```
User → Head Agent → posts to #agent-research
                  → Research Agent sees message (via webhook)
                  → Research Agent responds in channel
                  → Head Agent receives response
                  → Head Agent synthesizes for user

Users can view #agent-research to see the collaboration
```

### Key Concepts

1. **Direct Agent Access**: Users talk directly to the agent they click (not forced through head agent)
2. **Agent Channels**: Dedicated channels for collaboration (e.g., `#agent-research`)
3. **Fully Visible**: All agent communication is visible to workspace members
4. **Synchronous Waiting**: Head agent waits for specialist response before continuing

### Database Schema

The following schema changes support agent channels (Migration `078_agent_channels.sql`):

```sql
-- Agent channel support
ALTER TABLE channels ADD COLUMN is_agent_channel BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN linked_agent_id UUID;

-- Agent profile support
ALTER TABLE profiles ADD COLUMN is_agent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN agent_slug VARCHAR(100);
ALTER TABLE profiles ADD COLUMN linked_agent_id UUID;
ALTER TABLE profiles ADD COLUMN agent_workspace_id UUID;

-- Agent message tracking
ALTER TABLE messages ADD COLUMN is_agent_request BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN agent_request_id UUID;
ALTER TABLE messages ADD COLUMN agent_response_status VARCHAR(50);
```

### Agent Routing Fix

**Problem**: Current logic always uses head agent when team is deployed, ignoring which agent user clicked.

**Solution in `agent-chat.ts`**:

```typescript
if (deployedConfig && agentId) {
  // User clicked specific agent - find it in deployed config
  const clickedAgent = deployedConfig.agents.find(a => a.id === agentId && a.is_enabled)
  if (clickedAgent) {
    // Use the agent they clicked
    agent = clickedAgent
  } else {
    // Agent not in deployed team, fall back to head
    agent = getHeadAgent(deployedConfig)
  }
} else if (deployedConfig) {
  // No agentId provided - use head agent as entry point
  agent = getHeadAgent(deployedConfig)
} else if (agentId) {
  // No team deployed - legacy single agent mode
  agent = await loadAgentById(agentId)
}
```

**Add helper to `team-config.ts`**:

```typescript
export function getAgentById(config: DeployedTeamConfig, agentId: string): DeployedAgent | null {
  return config.agents.find(a => a.id === agentId && a.is_enabled) || null
}
```

### Agent-Server Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/agent-profile.ts` | Create | Agent profile CRUD operations |
| `src/lib/agent-channel.ts` | Create | Channel operations (post, read) |
| `src/lib/channel-subscription.ts` | Create | Real-time response waiting |
| `src/lib/delegation-handler.ts` | Modify | Use channels instead of inline |
| `src/agent-channel-handler.ts` | Create | Webhook endpoint handler |
| `src/index.ts` | Modify | Add `/agent-channel-message` route |

### New File: `src/lib/agent-profile.ts`

```typescript
import { createServiceClient } from './supabase'

/**
 * Get or create an agent profile for sending messages.
 */
export async function ensureAgentProfile(
  workspaceId: string,
  agentSlug: string
): Promise<string> {
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('agent_workspace_id', workspaceId)
    .eq('agent_slug', agentSlug)
    .eq('is_agent', true)
    .single()

  if (profile) return profile.id

  throw new Error(`Agent profile not found: ${agentSlug} in workspace ${workspaceId}`)
}
```

### New File: `src/lib/agent-channel.ts`

```typescript
import { createServiceClient } from './supabase'

/**
 * Get agent channel ID for a workspace.
 */
export async function getAgentChannel(
  workspaceId: string,
  agentSlug: string
): Promise<{ id: string } | null> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('channels')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', `agent-${agentSlug}`)
    .eq('is_agent_channel', true)
    .single()

  return data
}

/**
 * Post a message to an agent channel.
 */
export async function postToAgentChannel(
  channelId: string,
  senderProfileId: string,
  content: string,
  requestId?: string
): Promise<void> {
  const supabase = createServiceClient()

  await supabase.from('messages').insert({
    channel_id: channelId,
    profile_id: senderProfileId,
    content,
    is_agent_request: !!requestId,
    agent_request_id: requestId || null,
    agent_response_status: requestId ? 'pending' : null,
  })
}
```

### New File: `src/lib/channel-subscription.ts`

```typescript
import { createServiceClient } from './supabase'

/**
 * Wait for an agent response by subscribing to the channel.
 */
export async function waitForAgentResponse(
  channelId: string,
  requestId: string,
  timeoutMs: number = 60000
): Promise<{ content: string; status: string }> {
  const supabase = createServiceClient()

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      reject(new Error('Agent response timeout'))
    }, timeoutMs)

    const subscription = supabase
      .channel(`agent-response-${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        const message = payload.new as any
        if (message.agent_request_id === requestId && !message.is_agent_request) {
          clearTimeout(timeout)
          subscription.unsubscribe()
          resolve({
            content: message.content,
            status: message.agent_response_status || 'completed',
          })
        }
      })
      .subscribe()
  })
}
```

### Modified: `src/lib/delegation-handler.ts`

```typescript
import { getAgentChannel, postToAgentChannel } from './agent-channel'
import { ensureAgentProfile } from './agent-profile'
import { waitForAgentResponse } from './channel-subscription'

async function handleDelegation(input, config, options) {
  const { workspaceId } = options

  // 1. Get agent's channel and head agent's profile
  const channel = await getAgentChannel(workspaceId, input.agent_slug)
  if (!channel) {
    throw new Error(`Agent channel not found: ${input.agent_slug}`)
  }

  const headAgentSlug = config.agents.find(a => a.id === config.team.head_agent_id)?.slug
  if (!headAgentSlug) {
    throw new Error('Head agent not found in config')
  }

  const headProfile = await ensureAgentProfile(workspaceId, headAgentSlug)

  // 2. Post request to specialist's channel
  const requestId = crypto.randomUUID()
  await postToAgentChannel(channel.id, headProfile, input.task, requestId)

  // 3. Wait for response (real-time subscription)
  try {
    const response = await waitForAgentResponse(channel.id, requestId, 60000)
    return { success: true, response: response.content }
  } catch (error) {
    return { success: false, error: 'Agent response timeout' }
  }
}
```

### New Endpoint: `/agent-channel-message`

Triggered by Supabase webhook on message INSERT to agent channels:

```typescript
// src/agent-channel-handler.ts
import { runAgentQuery } from './agent-query'

export async function agentChannelMessageHandler(req, res) {
  const { record } = req.body

  // Only process delegation requests (head agent → specialist)
  if (!record.is_agent_request || !record.agent_request_id) {
    return res.json({ skipped: true })
  }

  // Get the channel to find which agent should respond
  const channel = await getChannelById(record.channel_id)
  if (!channel.is_agent_channel || !channel.linked_agent_id) {
    return res.json({ skipped: true })
  }

  // Load deployed config and find the specialist agent
  const deployment = await getDeploymentByWorkspace(channel.workspace_id)
  const specialist = deployment.active_config.agents.find(
    a => a.id === channel.linked_agent_id
  )

  if (!specialist) {
    return res.status(404).json({ error: 'Specialist agent not found' })
  }

  // Run specialist agent
  const result = await runAgentQuery({
    agent: specialist,
    message: record.content,
    workspaceId: channel.workspace_id,
    allowDelegation: false,
  })

  // Post response to same channel
  await postToAgentChannel(
    record.channel_id,
    await ensureAgentProfile(channel.workspace_id, specialist.slug),
    result.text,
    record.agent_request_id // Same request ID to correlate
  )

  // Mark response status
  await updateMessageStatus(record.agent_request_id, 'completed')

  return res.json({ success: true })
}
```

### Supabase Webhook Configuration

Configure in Supabase Dashboard → Database → Webhooks:

```json
{
  "name": "agent_channel_message_webhook",
  "table": "messages",
  "events": ["INSERT"],
  "url": "https://agent-server-production-580f.up.railway.app/agent-channel-message",
  "headers": {
    "Authorization": "Bearer ${WEBHOOK_SECRET}"
  },
  "method": "POST",
  "enabled_trigger": "is_agent_channel = true"
}
```

### Deployment Integration

When deploying a team to a workspace (via admin panel), the `deployTeamWithAgentResources` function:

1. Creates agent profile for each team member
2. Adds agent profiles to `workspace_members`
3. Creates `#agent-{slug}` channel for each agent
4. Adds all profiles to each agent channel

See `src/lib/deployment.ts` in the admin panel for implementation.

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Response timeout | Mark `agent_response_status: 'timeout'`, head agent informs user |
| Specialist error | Post error to channel, mark status `'error'` |
| Channel not found | Fall back to inline delegation |
| Webhook fails | Retry with exponential backoff |

### Verification Steps

1. Deploy a team to workspace from admin panel
2. Verify agent channels created (e.g., `#agent-research`)
3. Verify agent profiles created in workspace members
4. Send message that triggers delegation
5. Observe delegation message appear in agent channel
6. Observe specialist response appear in channel
7. Verify head agent incorporates response
8. Test timeout handling (60s default)
