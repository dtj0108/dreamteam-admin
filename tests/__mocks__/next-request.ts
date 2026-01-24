import { vi } from 'vitest'

interface MockRequestOptions {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
  searchParams?: Record<string, string>
}

// Create a mock NextRequest
export function createMockRequest(options: MockRequestOptions = {}): Request {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body = null,
    headers = {},
    searchParams = {},
  } = options

  const urlWithParams = new URL(url)
  Object.entries(searchParams).forEach(([key, value]) => {
    urlWithParams.searchParams.set(key, value)
  })

  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  }

  if (body && method !== 'GET' && method !== 'HEAD') {
    requestInit.body = JSON.stringify(body)
  }

  return new Request(urlWithParams.toString(), requestInit)
}

// Create a mock NextResponse-like object for testing
export function createMockResponse(data: unknown, status = 200) {
  return {
    json: () => Promise.resolve(data),
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({ 'Content-Type': 'application/json' }),
  }
}

// Mock params object for dynamic route handlers
export function createMockParams(params: Record<string, string>) {
  return Promise.resolve(params)
}

// Helper to call an API route handler and parse the response
export async function callApiRoute<T>(
  handler: (req: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response>,
  options: MockRequestOptions & { params?: Record<string, string> } = {}
): Promise<{ data: T; status: number; ok: boolean }> {
  const { params, ...requestOptions } = options
  const request = createMockRequest(requestOptions)

  const response = await handler(
    request,
    params ? { params: createMockParams(params) } : undefined
  )

  let data: T
  try {
    data = await response.json()
  } catch {
    data = null as T
  }

  return {
    data,
    status: response.status,
    ok: response.ok,
  }
}
