// Schema Converter - Converts JSON Schema to Zod schemas
// This allows gradual migration - existing tools stored as JSON Schema in DB can be converted at runtime

import { z, ZodTypeAny } from 'zod'

/**
 * Convert a JSON Schema object to a Zod schema
 * Supports common JSON Schema constructs used in tool definitions
 */
export function jsonSchemaToZod(schema: Record<string, unknown>): ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.unknown()
  }

  const type = schema.type as string | string[] | undefined
  const required = (schema.required as string[]) || []

  // Handle union types (e.g., ["string", "null"])
  if (Array.isArray(type)) {
    const types = type.filter(t => t !== 'null')
    const isNullable = type.includes('null')

    if (types.length === 1) {
      const baseSchema = jsonSchemaToZod({ ...schema, type: types[0] })
      return isNullable ? baseSchema.nullable() : baseSchema
    }

    // Multiple non-null types - use union
    const schemas = types.map(t => jsonSchemaToZod({ ...schema, type: t }))
    const union = z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])
    return isNullable ? union.nullable() : union
  }

  switch (type) {
    case 'string':
      return buildStringSchema(schema)

    case 'number':
    case 'integer':
      return buildNumberSchema(schema, type === 'integer')

    case 'boolean':
      return z.boolean()

    case 'array':
      return buildArraySchema(schema)

    case 'object':
      return buildObjectSchema(schema, required)

    case 'null':
      return z.null()

    default:
      // No type specified - try to infer from other properties
      if (schema.properties) {
        return buildObjectSchema(schema, required)
      }
      if (schema.items) {
        return buildArraySchema(schema)
      }
      if (schema.enum) {
        return buildEnumSchema(schema)
      }
      return z.unknown()
  }
}

/**
 * Build a Zod string schema with validation
 */
function buildStringSchema(schema: Record<string, unknown>): ZodTypeAny {
  let zodSchema = z.string()

  // Handle enum
  if (schema.enum && Array.isArray(schema.enum)) {
    const values = schema.enum as string[]
    if (values.length > 0) {
      return z.enum(values as [string, ...string[]])
    }
  }

  // Apply string constraints
  if (typeof schema.minLength === 'number') {
    zodSchema = zodSchema.min(schema.minLength)
  }
  if (typeof schema.maxLength === 'number') {
    zodSchema = zodSchema.max(schema.maxLength)
  }
  if (typeof schema.pattern === 'string') {
    zodSchema = zodSchema.regex(new RegExp(schema.pattern))
  }

  // Handle format
  const format = schema.format as string | undefined
  if (format === 'email') {
    zodSchema = zodSchema.email()
  } else if (format === 'uri' || format === 'url') {
    zodSchema = zodSchema.url()
  } else if (format === 'uuid') {
    zodSchema = zodSchema.uuid()
  } else if (format === 'date-time') {
    zodSchema = zodSchema.datetime()
  }

  // Add description if present
  if (typeof schema.description === 'string') {
    zodSchema = zodSchema.describe(schema.description)
  }

  return zodSchema
}

/**
 * Build a Zod number schema with validation
 */
function buildNumberSchema(schema: Record<string, unknown>, isInteger: boolean): ZodTypeAny {
  let zodSchema = isInteger ? z.number().int() : z.number()

  if (typeof schema.minimum === 'number') {
    zodSchema = zodSchema.min(schema.minimum)
  }
  if (typeof schema.maximum === 'number') {
    zodSchema = zodSchema.max(schema.maximum)
  }
  if (typeof schema.exclusiveMinimum === 'number') {
    zodSchema = zodSchema.gt(schema.exclusiveMinimum)
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    zodSchema = zodSchema.lt(schema.exclusiveMaximum)
  }

  if (typeof schema.description === 'string') {
    zodSchema = zodSchema.describe(schema.description)
  }

  return zodSchema
}

/**
 * Build a Zod array schema
 */
function buildArraySchema(schema: Record<string, unknown>): ZodTypeAny {
  const items = schema.items as Record<string, unknown> | undefined
  const itemSchema = items ? jsonSchemaToZod(items) : z.unknown()
  let zodSchema = z.array(itemSchema)

  if (typeof schema.minItems === 'number') {
    zodSchema = zodSchema.min(schema.minItems)
  }
  if (typeof schema.maxItems === 'number') {
    zodSchema = zodSchema.max(schema.maxItems)
  }

  if (typeof schema.description === 'string') {
    zodSchema = zodSchema.describe(schema.description)
  }

  return zodSchema
}

/**
 * Build a Zod object schema
 */
function buildObjectSchema(schema: Record<string, unknown>, required: string[]): ZodTypeAny {
  const properties = (schema.properties as Record<string, Record<string, unknown>>) || {}
  const additionalProperties = schema.additionalProperties

  const shape: Record<string, ZodTypeAny> = {}

  for (const [key, propSchema] of Object.entries(properties)) {
    let propZod = jsonSchemaToZod(propSchema)

    // Make optional if not in required array
    if (!required.includes(key)) {
      propZod = propZod.optional()
    }

    shape[key] = propZod
  }

  const baseSchema = z.object(shape)

  // Handle additionalProperties - return directly to avoid type narrowing issues
  if (additionalProperties === false) {
    const strictSchema = baseSchema.strict()
    return typeof schema.description === 'string'
      ? strictSchema.describe(schema.description)
      : strictSchema
  } else if (additionalProperties && typeof additionalProperties === 'object') {
    const catchallSchema = baseSchema.catchall(jsonSchemaToZod(additionalProperties as Record<string, unknown>))
    return typeof schema.description === 'string'
      ? catchallSchema.describe(schema.description)
      : catchallSchema
  } else {
    // Default: allow additional properties (passthrough)
    const passthroughSchema = baseSchema.passthrough()
    return typeof schema.description === 'string'
      ? passthroughSchema.describe(schema.description)
      : passthroughSchema
  }
}

/**
 * Build a Zod enum schema from JSON Schema enum
 */
function buildEnumSchema(schema: Record<string, unknown>): ZodTypeAny {
  const enumValues = schema.enum as unknown[]

  if (!enumValues || enumValues.length === 0) {
    return z.unknown()
  }

  // Check if all values are strings
  if (enumValues.every(v => typeof v === 'string')) {
    return z.enum(enumValues as [string, ...string[]])
  }

  // Mixed types - use literal union
  // Need at least 2 items for z.union, otherwise use z.literal
  if (enumValues.length === 1) {
    return z.literal(enumValues[0] as string | number | boolean)
  }

  const [first, second, ...rest] = enumValues.map(v => z.literal(v as string | number | boolean))
  return z.union([first, second, ...rest])
}

/**
 * Convert an object schema specifically designed for tool input_schema format
 * This is the primary entry point for converting tool definitions
 */
export function toolSchemaToZod(inputSchema: Record<string, unknown>): ZodTypeAny {
  // Tool input schemas are always objects at the top level
  const schema = {
    type: 'object',
    ...inputSchema
  }
  return jsonSchemaToZod(schema)
}
