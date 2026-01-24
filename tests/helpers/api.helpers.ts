import { expect } from 'vitest'
import { createMockRequest, callApiRoute } from '../__mocks__/next-request'

export { createMockRequest, callApiRoute }

// Common test assertions for API responses
export function expectUnauthorized(response: { status: number; data: unknown }) {
  expect(response.status).toBe(401)
  expect(response.data).toEqual({ error: 'Unauthorized' })
}

export function expectForbidden(response: { status: number; data: unknown }) {
  expect(response.status).toBe(403)
  expect(response.data).toEqual({ error: 'Forbidden' })
}

export function expectBadRequest(response: { status: number; data: { error?: string } }, errorContains?: string) {
  expect(response.status).toBe(400)
  expect(response.data).toHaveProperty('error')
  if (errorContains) {
    expect(response.data.error).toContain(errorContains)
  }
}

export function expectNotFound(response: { status: number; data: { error?: string } }, errorContains?: string) {
  expect(response.status).toBe(404)
  expect(response.data).toHaveProperty('error')
  if (errorContains) {
    expect(response.data.error).toContain(errorContains)
  }
}

export function expectSuccess(response: { status: number; ok: boolean }) {
  expect(response.ok).toBe(true)
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
}

// Helper to test all HTTP methods return 401 for an API route
export async function testUnauthorizedAccess(
  handler: (req: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response>,
  url: string,
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[] = ['GET', 'POST', 'PUT', 'DELETE'],
  params?: Record<string, string>
) {
  for (const method of methods) {
    const response = await callApiRoute(handler, { method, url, params })
    expectUnauthorized(response)
  }
}

// Helper to create request with JSON body
export function createJsonRequest(
  url: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return createMockRequest({
    url,
    method,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

// Helper to create request with auth headers
export function createAuthenticatedRequest(
  url: string,
  method: string,
  options: {
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
) {
  return createMockRequest({
    url,
    method,
    body: options.body,
    searchParams: options.searchParams,
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}
