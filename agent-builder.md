# Agent Builder

## The Concept

Build the factory that builds the robots.

Instead of hardcoding 38 agents, we build a configuration engine that outputs Agent SDK-compatible definitions. New agents get deployed through UI, not code.

---

## How It Works

```
Admin UI (React)
       ↓
Agent Config (JSON in DB)
       ↓
Config Compiler
       ↓
Claude Agent SDK Runtime
```

User fills out forms → system generates the agent definition → agent is live.

---

## What Gets Configured

**Identity**
- Name, description, department
- Model selection (Sonnet/Opus/Haiku)
- Avatar for UI

**System Prompt**
- Role definition
- Expertise areas
- Behavioral constraints
- Output preferences
- Department templates as starting points

**Tools**
- Built-in: Read, Write, Bash, Web Search
- MCP integrations (CRM, email, databases)
- Custom tools (define name, description, input schema)

**Skills**
- Assign from skill library
- Skills = packaged workflows the agent loads on demand

**Permissions**
- Permission mode (default / acceptEdits / bypass)
- Which actions need human approval
- Data access boundaries

**Delegation**
- Which agents can this one call
- Under what conditions
- What context gets passed

**Hooks**
- Pre/post tool execution triggers
- Validation logic
- Logging and audit

**Triggers**
- When does this agent activate
- Routing rules for incoming work

---

## Agent Communication

**Within Department (Vertical)**
- Department Head directly calls team members as subagents
- Fast, parallel, context stays contained

**Cross-Department (Horizontal)**
- Routes through Orchestrator
- Maintains audit trail
- Orchestrator holds global task state

**Handoff Format**
```json
{
  "handoff_id": "uuid",
  "from_agent": "sales_head",
  "to_agent": "legal_head",
  "task": "Review proposal for compliance",
  "context": {},
  "artifacts": [],
  "priority": "high",
  "callback": "sales_head"
}
```

---

## Database Schema

```
agents
├── id
├── name
├── department_id
├── system_prompt
├── model
├── tools[]
├── mcp_servers[]
├── skills[]
├── delegatable_agents[]
├── permission_mode
├── hooks{}
├── triggers{}
└── timestamps

departments
├── id
├── name
├── default_tools[]
├── default_skills[]
└── head_agent_id

skills
├── id
├── name
├── description
├── skill_md_content
├── supporting_files[]
└── department_id

mcp_integrations
├── id
├── name
├── type (stdio/sse/sdk)
├── config{}
└── auth_config{}
```

---

## What This Enables

**For us**
- Client needs custom agent → 20 min in builder, done
- Test ideas fast, kill or iterate without deploys
- Stack agents in new combinations

**For sales**
- Custom solutions = checkbox exercise
- "You need manufacturing? Let me add that agent real quick"
- Tiered pricing: 10 agents / 30 agents / unlimited + builder access

**For enterprise clients**
- Build their own agents
- Their processes become agents without our team
- Massive stickiness

---

## The Point

The 38 agents are the demo. The builder is the product.

We're selling infrastructure, not chatbots.
