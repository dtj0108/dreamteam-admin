import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('ENCRYPTION_KEY', '0'.repeat(64))
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key')
vi.stubEnv('XAI_API_KEY', 'test-xai-key')

// Reset mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})

// Global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    createMockSupabaseClient: () => MockSupabaseClient
  }
}

interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>
  auth: {
    getUser: ReturnType<typeof vi.fn>
    getSession: ReturnType<typeof vi.fn>
  }
  rpc: ReturnType<typeof vi.fn>
}

function createMockSupabaseClient(): MockSupabaseClient {
  const mockSelect = vi.fn().mockReturnThis()
  const mockInsert = vi.fn().mockReturnThis()
  const mockUpdate = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockSingle = vi.fn()
  const mockOrder = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockReturnThis()
  const mockIn = vi.fn().mockReturnThis()
  const mockIs = vi.fn().mockReturnThis()
  const mockMatch = vi.fn().mockReturnThis()
  const mockMaybeSingle = vi.fn()

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    limit: mockLimit,
    in: mockIn,
    is: mockIs,
    match: mockMatch,
    maybeSingle: mockMaybeSingle
  })

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn()
    },
    rpc: vi.fn()
  }
}

globalThis.testUtils = {
  createMockSupabaseClient
}
