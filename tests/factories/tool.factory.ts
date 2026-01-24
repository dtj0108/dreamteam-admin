import type { AgentTool } from '@/types/agents'

let toolCounter = 0

export function createTool(overrides: Partial<AgentTool> = {}): AgentTool {
  toolCounter++

  return {
    id: overrides.id ?? `tool-${toolCounter}`,
    name: overrides.name ?? `test_tool_${toolCounter}`,
    description: overrides.description ?? `Description for test tool ${toolCounter}`,
    category: overrides.category ?? 'projects',
    input_schema: overrides.input_schema ?? {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query parameter',
        },
      },
      required: ['query'],
    },
    is_builtin: overrides.is_builtin ?? false,
    is_enabled: overrides.is_enabled ?? true,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  }
}

// Create a tool with an invalid schema
export function createInvalidTool(issue: 'no_name' | 'bad_name' | 'no_schema' | 'bad_type' | 'bad_required'): AgentTool {
  const base = createTool()

  switch (issue) {
    case 'no_name':
      return { ...base, name: '' }
    case 'bad_name':
      return { ...base, name: '123_invalid' }
    case 'no_schema':
      return { ...base, input_schema: null as unknown as Record<string, unknown> }
    case 'bad_type':
      return {
        ...base,
        input_schema: {
          type: 'array', // Should be 'object'
          items: { type: 'string' },
        },
      }
    case 'bad_required':
      return {
        ...base,
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['nonexistent'], // Required field not in properties
        },
      }
    default:
      return base
  }
}

// Create a tool with a complex nested schema
export function createComplexTool(): AgentTool {
  return createTool({
    name: 'complex_tool',
    description: 'A tool with complex nested schema',
    input_schema: {
      type: 'object',
      properties: {
        simple_string: {
          type: 'string',
          description: 'A simple string parameter',
        },
        optional_number: {
          type: 'number',
          description: 'An optional number',
        },
        string_array: {
          type: 'array',
          items: { type: 'string' },
          description: 'An array of strings',
        },
        nested_object: {
          type: 'object',
          properties: {
            inner_field: { type: 'string' },
          },
          description: 'A nested object',
        },
        union_type: {
          type: ['string', 'null'],
          description: 'A nullable string',
        },
      },
      required: ['simple_string'],
    },
  })
}

export function createToolList(count: number, overrides: Partial<AgentTool> = {}): AgentTool[] {
  return Array.from({ length: count }, () => createTool(overrides))
}

export function resetToolCounter() {
  toolCounter = 0
}
