// MCP Client - Executes tools via the MCP server
// This module handles communication with the financebro-1 MCP server

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3002'

export interface MCPToolCallRequest {
  toolName: string
  toolInput: Record<string, unknown>
  workspaceId: string
  userId?: string
}

export interface MCPToolCallResponse {
  toolName: string
  success: boolean
  result?: unknown
  error?: string
  latencyMs: number
}

/**
 * Execute a tool via the MCP server
 */
export async function executeToolViaMCP(request: MCPToolCallRequest): Promise<MCPToolCallResponse> {
  const startTime = Date.now()

  try {
    const response = await fetch(`${AGENT_SERVER_URL}/tools/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: request.toolName,
        toolInput: request.toolInput,
        workspaceId: request.workspaceId,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    })

    if (!response.ok) {
      return {
        toolName: request.toolName,
        success: false,
        error: `MCP server returned ${response.status}: ${response.statusText}`,
        latencyMs: Date.now() - startTime,
      }
    }

    const data = await response.json()
    return {
      toolName: request.toolName,
      success: data.success,
      result: data.result,
      error: data.error,
      latencyMs: data.latencyMs || (Date.now() - startTime),
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'MCP server unreachable'
    console.error('MCP tool execution error:', {
      toolName: request.toolName,
      workspaceId: request.workspaceId,
      error: errorMessage,
    })

    return {
      toolName: request.toolName,
      success: false,
      error: errorMessage,
      latencyMs: Date.now() - startTime,
    }
  }
}
