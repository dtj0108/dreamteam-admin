import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateToolSchema,
  validateToolSchemas,
  getValidationSummary,
  validateInputAgainstSchema,
} from '@/lib/tool-schema-validator'
import { createTool, createInvalidTool, createComplexTool, resetToolCounter } from '../../factories/tool.factory'

describe('tool-schema-validator', () => {
  beforeEach(() => {
    resetToolCounter()
  })

  describe('validateToolSchema - Name validation', () => {
    it('reports error for empty name', () => {
      const tool = createTool({ name: '' })
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_NAME',
          field: 'name',
        })
      )
    })

    it('reports error for name starting with number', () => {
      const tool = createTool({ name: '123_tool' })
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'NAME_STARTS_WITH_NUMBER',
        })
      )
    })

    it('reports error for name over 64 characters', () => {
      const tool = createTool({ name: 'a'.repeat(65) })
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'NAME_TOO_LONG',
        })
      )
    })

    it('reports error for invalid characters in name', () => {
      const tool = createTool({ name: 'tool-with-dashes' })
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_NAME_FORMAT',
        })
      )
    })

    it('accepts valid snake_case names', () => {
      const validNames = ['get_user', 'CREATE_ORDER', 'fetch_data_v2', '_private_tool', 'Tool123']

      for (const name of validNames) {
        const tool = createTool({ name })
        const result = validateToolSchema(tool)
        expect(result.errors.filter(e => e.field === 'name')).toHaveLength(0)
      }
    })
  })

  describe('validateToolSchema - Schema validation', () => {
    it('reports error for missing schema', () => {
      const tool = createTool({ input_schema: null as unknown as Record<string, unknown> })
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_SCHEMA',
        })
      )
    })

    it('reports error for non-object root type', () => {
      const tool = createInvalidTool('bad_type')
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_ROOT_TYPE',
        })
      )
    })

    it('reports warning for missing type field', () => {
      const tool = createTool({
        input_schema: {
          properties: {
            query: { type: 'string' },
          },
        },
      })
      const result = validateToolSchema(tool)

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_TYPE_OBJECT',
        })
      )
    })

    it('reports error for invalid property types', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            invalid_prop: { type: 'invalid_type' },
          },
        },
      })
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_PROPERTY_TYPE',
        })
      )
    })

    it('accepts all valid JSON Schema types', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            str: { type: 'string', description: 'A string' },
            num: { type: 'number', description: 'A number' },
            int: { type: 'integer', description: 'An integer' },
            bool: { type: 'boolean', description: 'A boolean' },
            arr: { type: 'array', items: { type: 'string' }, description: 'An array' },
            obj: { type: 'object', description: 'An object' },
            nullable: { type: 'null', description: 'A null' },
          },
        },
      })
      const result = validateToolSchema(tool)

      expect(result.errors.filter(e => e.code === 'INVALID_PROPERTY_TYPE')).toHaveLength(0)
    })
  })

  describe('validateToolSchema - Required fields', () => {
    it('reports error for required not in properties', () => {
      const tool = createInvalidTool('bad_required')
      const result = validateToolSchema(tool)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'REQUIRED_FIELD_NOT_IN_PROPERTIES',
        })
      )
    })

    it('accepts valid required array', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Query' },
            count: { type: 'number', description: 'Count' },
          },
          required: ['query', 'count'],
        },
      })
      const result = validateToolSchema(tool)

      expect(result.errors.filter(e => e.field === 'input_schema.required')).toHaveLength(0)
    })

    it('reports error for non-array required field', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: 'query' as unknown as string[],
        },
      })
      const result = validateToolSchema(tool)

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'REQUIRED_NOT_ARRAY',
        })
      )
    })
  })

  describe('validateToolSchema - Warnings', () => {
    it('warns for array without items definition', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            tags: { type: 'array', description: 'Tags without items' },
          },
        },
      })
      const result = validateToolSchema(tool)

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'ARRAY_MISSING_ITEMS',
        })
      )
    })

    it('warns for missing property descriptions', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' }, // Missing description
          },
        },
      })
      const result = validateToolSchema(tool)

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_PROPERTY_DESCRIPTION',
        })
      )
    })

    it('warns for missing tool description', () => {
      const tool = createTool({ description: '' })
      const result = validateToolSchema(tool)

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_DESCRIPTION',
        })
      )
    })
  })

  describe('validateInputAgainstSchema', () => {
    it('validates required fields', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      }

      const result1 = validateInputAgainstSchema({ name: 'John' }, schema)
      expect(result1.valid).toBe(false)
      expect(result1.errors).toContain('Missing required field: age')

      const result2 = validateInputAgainstSchema({ name: 'John', age: 30 }, schema)
      expect(result2.valid).toBe(true)
    })

    it('validates type mismatches', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' },
          active: { type: 'boolean' },
        },
      }

      const result = validateInputAgainstSchema({ count: '123', active: 'yes' }, schema)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('handles nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      }

      const result = validateInputAgainstSchema({ user: { name: 'John' } }, schema)
      expect(result.valid).toBe(true)
    })

    it('allows unknown properties (additionalProperties not strict)', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      }

      const result = validateInputAgainstSchema({ name: 'John', extra: 'field' }, schema)
      expect(result.valid).toBe(true)
    })

    it('handles null values for nullable types', () => {
      const schema = {
        type: 'object',
        properties: {
          value: { type: ['string', 'null'] },
        },
      }

      const result = validateInputAgainstSchema({ value: null }, schema)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateToolSchemas', () => {
    it('validates multiple tools', () => {
      const tools = [
        createTool({ name: 'valid_tool_1' }),
        createTool({ name: '' }), // Invalid
        createTool({ name: 'valid_tool_2' }),
      ]

      const results = validateToolSchemas(tools)

      expect(results).toHaveLength(3)
      expect(results[0].isValid).toBe(true)
      expect(results[1].isValid).toBe(false)
      expect(results[2].isValid).toBe(true)
    })
  })

  describe('getValidationSummary', () => {
    it('calculates correct summary statistics', () => {
      const results = [
        { toolId: '1', toolName: 'a', isValid: true, errors: [], warnings: [] },
        { toolId: '2', toolName: 'b', isValid: true, errors: [], warnings: [{ code: 'W1', field: '', message: '', recommendation: '' }] },
        { toolId: '3', toolName: 'c', isValid: false, errors: [{ code: 'E1', field: '', message: '' }], warnings: [] },
      ]

      const summary = getValidationSummary(results)

      expect(summary.total).toBe(3)
      expect(summary.passed).toBe(1) // Valid with no warnings
      expect(summary.withWarnings).toBe(1) // Valid with warnings
      expect(summary.failed).toBe(1) // Invalid
    })
  })

  describe('complex schema validation', () => {
    it('validates complex nested tool schema', () => {
      const tool = createComplexTool()
      const result = validateToolSchema(tool)

      // Complex tool should pass validation
      expect(result.isValid).toBe(true)
    })

    it('handles union types in properties', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            value: {
              type: ['string', 'number'],
              description: 'Can be string or number',
            },
          },
        },
      })
      const result = validateToolSchema(tool)

      expect(result.errors.filter(e => e.code === 'INVALID_PROPERTY_TYPE')).toHaveLength(0)
    })

    it('reports error for invalid union types', () => {
      const tool = createTool({
        input_schema: {
          type: 'object',
          properties: {
            value: {
              type: ['string', 'invalid_type'],
              description: 'Invalid union',
            },
          },
        },
      })
      const result = validateToolSchema(tool)

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_PROPERTY_TYPE',
        })
      )
    })
  })
})
