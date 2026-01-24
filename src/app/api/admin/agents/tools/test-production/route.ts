import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3002'

export interface MCPTestResult {
  toolId: string
  toolName: string
  success: boolean
  result?: unknown
  error?: string
  latencyMs: number
}

// Real data context fetched from the workspace
interface WorkspaceTestContext {
  workspaceId: string
  userId: string
  projectId?: string
  taskId?: string
  departmentId?: string
  milestoneId?: string
  goalId?: string
  kpiId?: string
  profileId?: string
}

// Fetch real data from the workspace for testing
async function fetchWorkspaceTestContext(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string
): Promise<WorkspaceTestContext> {
  const context: WorkspaceTestContext = {
    workspaceId,
    userId: '', // Will be populated
  }

  // Fetch a real user from the workspace
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .limit(1)
  
  if (members && members.length > 0) {
    context.userId = members[0].user_id
    context.profileId = members[0].user_id // profile_id is often the same as user_id
  }

  // Fetch a real project
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)
  
  if (projects && projects.length > 0) {
    context.projectId = projects[0].id
  }

  // Fetch a real task
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)
  
  if (tasks && tasks.length > 0) {
    context.taskId = tasks[0].id
  }

  // Fetch a real department
  const { data: departments } = await supabase
    .from('departments')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)
  
  if (departments && departments.length > 0) {
    context.departmentId = departments[0].id
  }

  // Fetch a real milestone
  const { data: milestones } = await supabase
    .from('milestones')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)
  
  if (milestones && milestones.length > 0) {
    context.milestoneId = milestones[0].id
  }

  // Fetch a real goal (if exists)
  const { data: goals } = await supabase
    .from('goals')
    .select('id')
    .limit(1)
  
  if (goals && goals.length > 0) {
    context.goalId = goals[0].id
  }

  // Fetch a real KPI (if exists)
  const { data: kpis } = await supabase
    .from('kpis')
    .select('id')
    .limit(1)
  
  if (kpis && kpis.length > 0) {
    context.kpiId = kpis[0].id
  }

  return context
}

// POST /api/admin/agents/tools/test-production - Run tools via MCP server
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  const { tool_ids, workspace_id } = body as { tool_ids: string[]; workspace_id: string }

  if (!Array.isArray(tool_ids) || tool_ids.length === 0) {
    return NextResponse.json(
      { error: 'tool_ids must be a non-empty array' },
      { status: 400 }
    )
  }

  if (!workspace_id) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400 }
    )
  }

  // Fetch the tools from the database
  const supabase = createAdminClient()
  const { data: tools, error: dbError } = await supabase
    .from('agent_tools')
    .select('id, name, description, category, input_schema, is_builtin, is_enabled')
    .in('id', tool_ids)

  if (dbError) {
    console.error('Fetch tools error:', dbError)
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    )
  }

  if (!tools || tools.length === 0) {
    return NextResponse.json(
      { error: 'No tools found with the provided IDs' },
      { status: 404 }
    )
  }

  // Fetch real data from the workspace for testing
  const testContext = await fetchWorkspaceTestContext(supabase, workspace_id)

  // Get auth token for agent-server (use service role for admin access)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const results: MCPTestResult[] = []

  for (const tool of tools) {
    // Generate sample input from schema using real workspace data
    const sampleInput = generateSampleInput(tool.input_schema, testContext)

    try {
      const response = await fetch(`${AGENT_SERVER_URL}/tools/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          toolName: tool.name,
          toolInput: sampleInput,
          workspaceId: workspace_id,
          userId: testContext.userId // Pass real user ID for auth context
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout per tool
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        results.push({
          toolId: tool.id,
          toolName: tool.name,
          success: false,
          error: `Agent server error ${response.status}: ${errorData.error || response.statusText}`,
          latencyMs: 0
        })
        continue
      }

      const result = await response.json()
      results.push({
        toolId: tool.id,
        toolName: tool.name,
        success: result.success ?? false,
        result: result.result,
        error: result.error,
        latencyMs: result.latencyMs ?? 0
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      results.push({
        toolId: tool.id,
        toolName: tool.name,
        success: false,
        error: errorMessage.includes('timeout')
          ? 'Request timed out (30s)'
          : errorMessage.includes('ECONNREFUSED')
            ? 'Agent server not reachable'
            : errorMessage,
        latencyMs: 0
      })
    }
  }

  return NextResponse.json({ results })
}

interface PropertySchema {
  type?: string
  enum?: string[]
  description?: string
  required?: boolean
}

function generateSampleInput(
  schema: Record<string, unknown>,
  context: WorkspaceTestContext
): Record<string, unknown> {
  const input: Record<string, unknown> = {}

  // Check if schema is in standard JSON Schema format or legacy flat format
  const isStandardFormat = schema.type === 'object' && schema.properties

  if (isStandardFormat) {
    // Standard JSON Schema format
    const properties = schema.properties as Record<string, PropertySchema> || {}
    const required = schema.required as string[] || []

    for (const [key, propSchema] of Object.entries(properties)) {
      // Always include required fields, and also include optional ID fields if we have real data
      const isRequired = required.includes(key)
      const isIdField = key.endsWith('_id') || key === 'id'
      
      if (isRequired || isIdField) {
        input[key] = getSampleValue(propSchema, key, context)
      }
    }
  } else {
    // Legacy flat format: { field_name: { type: "string", required: true } }
    for (const [key, propSchema] of Object.entries(schema)) {
      // Skip non-object entries (like 'type', 'properties' if partially standard)
      if (typeof propSchema !== 'object' || propSchema === null) continue

      const prop = propSchema as PropertySchema
      const isIdField = key.endsWith('_id') || key === 'id'

      // Include required fields and ID fields
      if (prop.required === true || isIdField) {
        input[key] = getSampleValue(prop, key, context)
      }
    }
  }

  return input
}

// Fallback test UUID when no real data exists
const FALLBACK_UUID = '00000000-0000-0000-0000-000000000001'

// Common enum values for known field patterns
const KNOWN_ENUMS: Record<string, string[]> = {
  status: ['todo', 'in_progress', 'pending', 'active', 'done', 'completed'],
  task_status: ['todo', 'in_progress', 'review', 'done'],
  priority: ['low', 'medium', 'high', 'urgent'],
  visibility: ['public', 'private', 'workspace'],
  role: ['member', 'admin', 'owner', 'viewer', 'editor'],
  type: ['task', 'milestone', 'project', 'goal'],
}

function getSampleValue(
  propSchema: PropertySchema, 
  fieldName: string,
  context: WorkspaceTestContext
): unknown {
  const type = propSchema.type
  const enumValues = propSchema.enum
  const lowerName = fieldName.toLowerCase()

  // If schema has enum values, use the first one
  if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
    return enumValues[0]
  }

  // Map field names to real context data
  const contextMapping: Record<string, string | undefined> = {
    'workspace_id': context.workspaceId,
    'user_id': context.userId,
    'profile_id': context.profileId || context.userId,
    'project_id': context.projectId,
    'task_id': context.taskId,
    'department_id': context.departmentId,
    'milestone_id': context.milestoneId,
    'goal_id': context.goalId,
    'kpi_id': context.kpiId,
    'assignee_id': context.userId,
    'member_id': context.userId,
    'owner_id': context.userId,
    'created_by': context.userId,
    'updated_by': context.userId,
    'depends_on_id': context.taskId, // For task dependencies
    'parent_id': context.taskId, // For subtasks
  }

  // Check if we have real data for this field
  if (contextMapping[lowerName]) {
    return contextMapping[lowerName]
  }

  // For generic ID fields, try to infer from field name
  if (lowerName.endsWith('_id') || lowerName === 'id') {
    // Try to match partial names
    if (lowerName.includes('project')) return context.projectId || FALLBACK_UUID
    if (lowerName.includes('task')) return context.taskId || FALLBACK_UUID
    if (lowerName.includes('department')) return context.departmentId || FALLBACK_UUID
    if (lowerName.includes('milestone')) return context.milestoneId || FALLBACK_UUID
    if (lowerName.includes('goal')) return context.goalId || FALLBACK_UUID
    if (lowerName.includes('kpi')) return context.kpiId || FALLBACK_UUID
    if (lowerName.includes('user') || lowerName.includes('member') || lowerName.includes('assignee')) {
      return context.userId || FALLBACK_UUID
    }
    // Default to fallback UUID
    return FALLBACK_UUID
  }

  // Check for known enum patterns by field name
  for (const [pattern, values] of Object.entries(KNOWN_ENUMS)) {
    if (lowerName === pattern || lowerName.endsWith(`_${pattern}`)) {
      return values[0]
    }
  }

  // Common field name patterns
  if (lowerName.includes('name')) return 'Test Name'
  if (lowerName.includes('title')) return 'Test Title'
  if (lowerName.includes('email')) return 'test@example.com'
  if (lowerName.includes('date')) return new Date().toISOString().split('T')[0]
  if (lowerName.includes('content') || lowerName.includes('description')) return 'Test content for MCP testing'
  if (lowerName.includes('limit')) return 10
  if (lowerName.includes('offset')) return 0
  if (lowerName.includes('amount') || lowerName.includes('value')) return 100
  if (lowerName.includes('count') || lowerName.includes('quantity')) return 1
  if (lowerName.includes('label')) return 'test-label'
  if (lowerName.includes('comment') || lowerName.includes('message')) return 'Test comment for MCP testing'
  if (lowerName.includes('url') || lowerName.includes('link')) return 'https://example.com'

  switch (type) {
    case 'string': return 'test_value'
    case 'number': case 'integer': return 1
    case 'boolean': return true
    case 'array': return []
    case 'object': return {}
    default: return null
  }
}
