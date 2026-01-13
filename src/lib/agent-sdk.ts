// Agent SDK Config Generation
// Generates Anthropic Claude Agent SDK-compatible configurations

import type {
  AgentSDKConfig,
  AgentWithRelations,
  SDKModelName,
  SDKTool,
  SDKSkill,
  SDKRule,
  SDKPromptSection,
  SDKDelegation,
  AgentModel,
  RuleType,
  PromptSectionType
} from '@/types/agents'

// Model name mapping
const MODEL_MAP: Record<AgentModel, SDKModelName> = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514'
}

/**
 * Generate a complete Agent SDK config from an agent with relations
 */
export function generateAgentSDKConfig(agent: AgentWithRelations): AgentSDKConfig {
  // Map tools to SDK format
  const tools: SDKTool[] = (agent.tools || [])
    .filter(t => t.tool && t.tool.is_builtin !== false)
    .map(t => ({
      name: t.tool!.name,
      description: t.tool!.description || '',
      input_schema: t.tool!.input_schema || {}
    }))

  // Map skills to SDK format
  const skills: SDKSkill[] = (agent.skills || [])
    .filter(s => s.skill)
    .map(s => ({
      name: s.skill!.name,
      description: s.skill!.description || undefined,
      content: s.skill!.skill_content || '',
      triggers: parseTriggers(s.skill!.triggers)
    }))

  // Map rules to SDK format
  const rules: SDKRule[] = (agent.rules || [])
    .filter(r => r.is_enabled)
    .map(r => ({
      type: r.rule_type as RuleType,
      content: r.rule_content,
      condition: r.condition || undefined,
      priority: r.priority
    }))

  // Map prompt sections to SDK format
  const promptSections: SDKPromptSection[] = (agent.prompt_sections || [])
    .filter(ps => ps.is_enabled)
    .sort((a, b) => a.position - b.position)
    .map(ps => ({
      type: ps.section_type as PromptSectionType,
      title: ps.section_title,
      content: ps.section_content,
      position: ps.position
    }))

  // Map delegations to SDK format
  const delegations: SDKDelegation[] = (agent.delegations || [])
    .filter(d => d.to_agent)
    .map(d => ({
      toAgent: d.to_agent!.name,
      toAgentId: d.to_agent_id,
      condition: d.condition || undefined,
      contextTemplate: d.context_template || undefined
    }))

  // Compile the full system prompt
  const compiledPrompt = compileSystemPrompt(
    agent.system_prompt,
    promptSections,
    skills,
    rules
  )

  return {
    name: agent.name,
    slug: agent.slug || undefined,
    description: agent.description || undefined,
    model: MODEL_MAP[agent.model as AgentModel] || MODEL_MAP.sonnet,
    systemPrompt: compiledPrompt,
    maxTurns: agent.max_turns,
    permissionMode: agent.permission_mode,
    tools,
    skills: skills.length > 0 ? skills : undefined,
    rules: rules.length > 0 ? rules : undefined,
    promptSections: promptSections.length > 0 ? promptSections : undefined,
    delegations: delegations.length > 0 ? delegations : undefined,
    isHead: agent.is_head || undefined,
    departmentId: agent.department_id || undefined
  }
}

/**
 * Compile the full system prompt from sections, skills, and rules
 */
function compileSystemPrompt(
  basePrompt: string,
  sections: SDKPromptSection[],
  skills: SDKSkill[],
  rules: SDKRule[]
): string {
  const parts: string[] = []

  // If there are prompt sections, use them instead of base prompt
  if (sections.length > 0) {
    for (const section of sections) {
      parts.push(`## ${section.title}\n${section.content}`)
    }
  } else if (basePrompt) {
    parts.push(basePrompt)
  }

  // Add skills as instructions
  if (skills.length > 0) {
    parts.push('\n## Available Skills')
    for (const skill of skills) {
      parts.push(`### ${skill.name}`)
      if (skill.description) {
        parts.push(skill.description)
      }
      parts.push(skill.content)
    }
  }

  // Add rules as behavioral constraints
  if (rules.length > 0) {
    const alwaysRules = rules.filter(r => r.type === 'always')
    const neverRules = rules.filter(r => r.type === 'never')
    const whenRules = rules.filter(r => r.type === 'when')
    const respondRules = rules.filter(r => r.type === 'respond_with')

    if (alwaysRules.length > 0) {
      parts.push('\n## Always')
      for (const rule of alwaysRules) {
        parts.push(`- ${rule.content}`)
      }
    }

    if (neverRules.length > 0) {
      parts.push('\n## Never')
      for (const rule of neverRules) {
        parts.push(`- ${rule.content}`)
      }
    }

    if (whenRules.length > 0) {
      parts.push('\n## Conditional Behaviors')
      for (const rule of whenRules) {
        parts.push(`- When ${rule.condition}: ${rule.content}`)
      }
    }

    if (respondRules.length > 0) {
      parts.push('\n## Standard Responses')
      for (const rule of respondRules) {
        if (rule.condition) {
          parts.push(`- When ${rule.condition}: ${rule.content}`)
        } else {
          parts.push(`- ${rule.content}`)
        }
      }
    }
  }

  return parts.join('\n\n')
}

/**
 * Parse triggers from various formats (JSON array, string array, etc.)
 */
function parseTriggers(triggers: unknown): string[] | undefined {
  if (!triggers) return undefined

  if (Array.isArray(triggers)) {
    return triggers.filter(t => typeof t === 'string') as string[]
  }

  if (typeof triggers === 'string') {
    try {
      const parsed = JSON.parse(triggers)
      if (Array.isArray(parsed)) {
        return parsed.filter(t => typeof t === 'string')
      }
    } catch {
      // If it's a plain string, treat it as a single trigger
      return [triggers]
    }
  }

  return undefined
}

/**
 * Generate a TypeScript/JavaScript code snippet for the agent config
 */
export function generateAgentCodeSnippet(config: AgentSDKConfig): string {
  const toolsCode = config.tools.length > 0
    ? `tools: [\n${config.tools.map(t => `    { name: "${t.name}", description: "${t.description}" }`).join(',\n')}\n  ]`
    : 'tools: []'

  return `import Agent from "@anthropic-ai/claude-agent-sdk";

const agent = new Agent({
  name: "${config.name}",
  model: "${config.model}",
  ${toolsCode},
  system: \`${config.systemPrompt.replace(/`/g, '\\`')}\`,
  maxTurns: ${config.maxTurns},
});

// Run the agent
const result = await agent.run({ content: "Your prompt here" });
console.log(result);`
}

/**
 * Validate an agent config against SDK requirements
 */
export function validateAgentConfig(config: Partial<AgentSDKConfig>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!config.name || config.name.trim() === '') {
    errors.push('Agent name is required')
  }

  if (!config.model) {
    errors.push('Model is required')
  }

  if (!config.systemPrompt || config.systemPrompt.trim() === '') {
    errors.push('System prompt is required')
  }

  if (config.maxTurns !== undefined && (config.maxTurns < 1 || config.maxTurns > 100)) {
    errors.push('Max turns must be between 1 and 100')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Calculate approximate token count for the system prompt
 */
export function estimatePromptTokens(config: AgentSDKConfig): number {
  // Rough estimate: ~4 characters per token
  const promptLength = config.systemPrompt.length
  return Math.ceil(promptLength / 4)
}

/**
 * Export config as JSON for external use
 */
export function exportConfigAsJSON(config: AgentSDKConfig): string {
  return JSON.stringify(config, null, 2)
}
