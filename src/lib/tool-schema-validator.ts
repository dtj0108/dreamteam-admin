// Tool Schema Validator
// Validates agent tools against JSON Schema standards and Anthropic API requirements

import type {
  AgentTool,
  ValidationIssue,
  ValidationWarning,
  ToolValidationResult,
  ProductionTestResult
} from '@/types/agents'

// Valid JSON Schema types
const VALID_JSON_SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null']

// Tool name regex: 1-64 chars, alphanumeric + underscores, can't start with number
const TOOL_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/

/**
 * Validates a single tool's schema against JSON Schema standards and Anthropic API requirements
 */
export function validateToolSchema(tool: AgentTool): ToolValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationWarning[] = []

  // Validate tool name
  if (!tool.name || tool.name.length === 0) {
    errors.push({
      code: 'MISSING_NAME',
      field: 'name',
      message: 'Tool name is required'
    })
  } else if (!TOOL_NAME_REGEX.test(tool.name)) {
    if (tool.name.length > 64) {
      errors.push({
        code: 'NAME_TOO_LONG',
        field: 'name',
        message: `Tool name must be 64 characters or less (currently ${tool.name.length})`
      })
    } else if (/^[0-9]/.test(tool.name)) {
      errors.push({
        code: 'NAME_STARTS_WITH_NUMBER',
        field: 'name',
        message: 'Tool name cannot start with a number'
      })
    } else {
      errors.push({
        code: 'INVALID_NAME_FORMAT',
        field: 'name',
        message: 'Tool name must contain only alphanumeric characters and underscores'
      })
    }
  }

  // Validate tool description
  if (!tool.description || tool.description.trim().length === 0) {
    warnings.push({
      code: 'MISSING_DESCRIPTION',
      field: 'description',
      message: 'Tool description is missing or empty',
      recommendation: 'Add a description to help Claude understand when and how to use this tool'
    })
  }

  // Validate input schema
  const schema = tool.input_schema
  if (!schema || typeof schema !== 'object') {
    errors.push({
      code: 'MISSING_SCHEMA',
      field: 'input_schema',
      message: 'Tool input_schema is required and must be an object'
    })
  } else {
    // Check for type: "object"
    if (schema.type !== 'object') {
      if (!schema.type) {
        warnings.push({
          code: 'MISSING_TYPE_OBJECT',
          field: 'input_schema.type',
          message: 'Schema is missing type: "object"',
          recommendation: 'Add type: "object" to follow JSON Schema standard and Anthropic API requirements'
        })
      } else {
        errors.push({
          code: 'INVALID_ROOT_TYPE',
          field: 'input_schema.type',
          message: `Root schema type must be "object", found "${schema.type}"`
        })
      }
    }

    // Check for properties field
    const properties = schema.properties as Record<string, unknown> | undefined
    if (!properties || typeof properties !== 'object') {
      // This could be an old format schema or a simplified schema
      if (schema.type === 'object' && !properties) {
        warnings.push({
          code: 'MISSING_PROPERTIES',
          field: 'input_schema.properties',
          message: 'Schema is missing properties field',
          recommendation: 'Add a properties field to define the tool\'s parameters'
        })
      } else if (!schema.type && !properties) {
        warnings.push({
          code: 'OLD_FORMAT_SCHEMA',
          field: 'input_schema',
          message: 'Schema appears to use a simplified or old format',
          recommendation: 'Consider migrating to standard JSON Schema format with type: "object" and properties'
        })
      }
    } else {
      // Validate each property
      for (const [propName, propValue] of Object.entries(properties)) {
        if (typeof propValue !== 'object' || propValue === null) {
          errors.push({
            code: 'INVALID_PROPERTY_DEFINITION',
            field: `input_schema.properties.${propName}`,
            message: `Property "${propName}" must be an object with a type definition`
          })
          continue
        }

        const propObj = propValue as Record<string, unknown>
        const propType = propObj.type

        // Check if type is specified
        if (!propType) {
          warnings.push({
            code: 'MISSING_PROPERTY_TYPE',
            field: `input_schema.properties.${propName}`,
            message: `Property "${propName}" is missing a type`,
            recommendation: 'Add a type to improve schema validation'
          })
        } else if (typeof propType === 'string') {
          // Validate single type
          if (!VALID_JSON_SCHEMA_TYPES.includes(propType)) {
            errors.push({
              code: 'INVALID_PROPERTY_TYPE',
              field: `input_schema.properties.${propName}.type`,
              message: `Property "${propName}" has invalid type "${propType}". Must be one of: ${VALID_JSON_SCHEMA_TYPES.join(', ')}`
            })
          }

          // If it's an array, check for items definition
          if (propType === 'array' && !propObj.items) {
            warnings.push({
              code: 'ARRAY_MISSING_ITEMS',
              field: `input_schema.properties.${propName}`,
              message: `Array property "${propName}" is missing items definition`,
              recommendation: 'Add an items field to specify the type of array elements'
            })
          }
        } else if (Array.isArray(propType)) {
          // Validate array of types (union types)
          for (const t of propType) {
            if (typeof t !== 'string' || !VALID_JSON_SCHEMA_TYPES.includes(t)) {
              errors.push({
                code: 'INVALID_PROPERTY_TYPE',
                field: `input_schema.properties.${propName}.type`,
                message: `Property "${propName}" has invalid type in union: "${t}". Must be one of: ${VALID_JSON_SCHEMA_TYPES.join(', ')}`
              })
            }
          }
        }

        // Check for missing descriptions on properties
        if (!propObj.description) {
          warnings.push({
            code: 'MISSING_PROPERTY_DESCRIPTION',
            field: `input_schema.properties.${propName}`,
            message: `Property "${propName}" is missing a description`,
            recommendation: 'Add descriptions to help Claude understand parameter usage'
          })
        }
      }
    }

    // Validate required field
    const required = schema.required
    if (required !== undefined) {
      if (!Array.isArray(required)) {
        errors.push({
          code: 'REQUIRED_NOT_ARRAY',
          field: 'input_schema.required',
          message: '"required" must be an array of strings'
        })
      } else {
        // Check that each required field exists in properties
        const propNames = properties ? Object.keys(properties) : []
        for (const reqField of required) {
          if (typeof reqField !== 'string') {
            errors.push({
              code: 'REQUIRED_NOT_STRING',
              field: 'input_schema.required',
              message: `Required array contains non-string value: ${JSON.stringify(reqField)}`
            })
          } else if (!propNames.includes(reqField)) {
            errors.push({
              code: 'REQUIRED_FIELD_NOT_IN_PROPERTIES',
              field: 'input_schema.required',
              message: `Required field "${reqField}" is not defined in properties`
            })
          }
        }
      }
    }
  }

  return {
    toolId: tool.id,
    toolName: tool.name,
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates multiple tools' schemas
 */
export function validateToolSchemas(tools: AgentTool[]): ToolValidationResult[] {
  return tools.map(validateToolSchema)
}

/**
 * Returns a summary of validation results
 */
export function getValidationSummary(results: ToolValidationResult[]): {
  total: number
  passed: number
  withWarnings: number
  failed: number
} {
  const passed = results.filter(r => r.isValid && r.warnings.length === 0).length
  const withWarnings = results.filter(r => r.isValid && r.warnings.length > 0).length
  const failed = results.filter(r => !r.isValid).length

  return {
    total: results.length,
    passed,
    withWarnings,
    failed
  }
}

// ============================================
// PRODUCTION TEST FUNCTIONS
// ============================================

/**
 * Validates that tool input matches the tool's input_schema
 */
export function validateInputAgainstSchema(
  input: Record<string, unknown>,
  schema: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required fields
  const required = schema.required as string[] | undefined
  if (required && Array.isArray(required)) {
    for (const field of required) {
      if (!(field in input)) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  // Check property types
  const properties = schema.properties as Record<string, { type?: string | string[] }> | undefined
  if (properties && typeof input === 'object' && input !== null) {
    for (const [key, value] of Object.entries(input)) {
      const propSchema = properties[key]
      if (!propSchema) {
        // Unknown property - not necessarily an error
        continue
      }

      const expectedType = propSchema.type
      if (expectedType) {
        const actualType = getJsonSchemaType(value)
        const expectedTypes = Array.isArray(expectedType) ? expectedType : [expectedType]

        if (!expectedTypes.includes(actualType) && actualType !== 'null') {
          errors.push(`Field "${key}" expected type ${expectedTypes.join('|')}, got ${actualType}`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Gets the JSON Schema type of a JavaScript value
 */
function getJsonSchemaType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number'
  }
  return typeof value
}

/**
 * Transforms a legacy flat schema format to proper JSON Schema format for Anthropic API
 * Legacy format: { param_name: { type: "string", required: true }, ... }
 * JSON Schema format: { type: "object", properties: { param_name: { type: "string" } }, required: ["param_name"] }
 */
function transformToJsonSchema(inputSchema: Record<string, unknown>): {
  type: 'object'
  properties: Record<string, unknown>
  required: string[]
} {
  // If already in proper format (has type: "object" and properties), return as-is with normalization
  if (inputSchema.type === 'object' && inputSchema.properties) {
    return {
      type: 'object',
      properties: inputSchema.properties as Record<string, unknown>,
      required: Array.isArray(inputSchema.required) ? inputSchema.required as string[] : []
    }
  }

  // Transform legacy flat format to proper JSON Schema
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(inputSchema)) {
    // Skip if it's the 'type' or 'properties' or 'required' keys (schema-level fields)
    if (key === 'type' || key === 'properties' || key === 'required') {
      continue
    }

    if (typeof value === 'object' && value !== null) {
      const propDef = value as Record<string, unknown>
      // Extract the property definition, removing the legacy 'required' field
      const { required: isRequired, ...cleanPropDef } = propDef
      properties[key] = cleanPropDef

      // If this property was marked as required, add to required array
      if (isRequired === true) {
        required.push(key)
      }
    } else {
      // If value is not an object, include it as-is (shouldn't happen but be safe)
      properties[key] = value
    }
  }

  return {
    type: 'object',
    properties,
    required
  }
}

/**
 * Runs a production readiness test for a single tool
 * Sends the tool to Claude and verifies it returns a valid tool_use block
 */
export async function runProductionTest(
  tool: AgentTool,
  apiKey: string
): Promise<ProductionTestResult> {
  const startTime = Date.now()

  try {
    // Transform the schema to proper JSON Schema format for Anthropic API
    const normalizedSchema = transformToJsonSchema(tool.input_schema)

    // Build the Anthropic API request with just this single tool
    const anthropicTool = {
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      input_schema: normalizedSchema
    }


    const requestBody = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [anthropicTool],
      messages: [
        {
          role: 'user',
          content: `Demonstrate using the ${tool.name} tool. Call it with appropriate sample values. You must use the tool.`
        }
      ]
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        toolId: tool.id,
        toolName: tool.name,
        success: false,
        toolUseReturned: false,
        inputValid: false,
        latencyMs,
        error: `API error ${response.status}: ${errorData.error?.message || response.statusText}`
      }
    }

    const data = await response.json()

    // Check if Claude returned a tool_use block
    const toolUseBlock = data.content?.find(
      (block: { type: string }) => block.type === 'tool_use'
    )

    if (!toolUseBlock) {
      return {
        toolId: tool.id,
        toolName: tool.name,
        success: false,
        toolUseReturned: false,
        inputValid: false,
        latencyMs,
        error: 'No tool_use block returned by Claude'
      }
    }

    // Validate the input matches the schema
    const toolInput = toolUseBlock.input as Record<string, unknown>
    const validation = validateInputAgainstSchema(toolInput, tool.input_schema)

    return {
      toolId: tool.id,
      toolName: tool.name,
      success: validation.valid,
      toolUseReturned: true,
      inputValid: validation.valid,
      latencyMs,
      toolInput,
      error: validation.errors.length > 0
        ? `Input validation: ${validation.errors.join('; ')}`
        : undefined
    }

  } catch (err) {
    const latencyMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    return {
      toolId: tool.id,
      toolName: tool.name,
      success: false,
      toolUseReturned: false,
      inputValid: false,
      latencyMs,
      error: errorMessage.includes('timeout')
        ? 'Request timed out (10s)'
        : errorMessage
    }
  }
}

/**
 * Runs production tests for multiple tools sequentially
 * Returns results as they complete and calls onProgress for UI updates
 */
export async function runProductionTests(
  tools: AgentTool[],
  apiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<ProductionTestResult[]> {
  const results: ProductionTestResult[] = []

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i]
    const result = await runProductionTest(tool, apiKey)
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, tools.length)
    }

    // Brief delay between calls to avoid rate limiting
    if (i < tools.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Returns a summary of production test results
 */
export function getProductionTestSummary(results: ProductionTestResult[]): {
  total: number
  passed: number
  failed: number
} {
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    total: results.length,
    passed,
    failed
  }
}

// ============================================
// MCP EXECUTION TEST FUNCTIONS
// ============================================

import type { MCPTestResult } from '@/types/agents'

/**
 * Returns a summary of MCP execution test results
 */
export function getMCPTestSummary(results: MCPTestResult[]): {
  total: number
  passed: number
  failed: number
} {
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    total: results.length,
    passed,
    failed
  }
}
