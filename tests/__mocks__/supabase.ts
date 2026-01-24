import { vi } from 'vitest'

// Chainable mock builder for Supabase queries
export function createMockQueryBuilder<T = unknown>(defaultData: T[] = []) {
  const state = {
    data: defaultData as T[] | T | null,
    error: null as { message: string } | null,
    selectCalled: false,
    filters: [] as string[],
  }

  const builder = {
    select: vi.fn().mockImplementation(() => builder),
    insert: vi.fn().mockImplementation(() => builder),
    update: vi.fn().mockImplementation(() => builder),
    delete: vi.fn().mockImplementation(() => builder),
    upsert: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    neq: vi.fn().mockImplementation(() => builder),
    gt: vi.fn().mockImplementation(() => builder),
    gte: vi.fn().mockImplementation(() => builder),
    lt: vi.fn().mockImplementation(() => builder),
    lte: vi.fn().mockImplementation(() => builder),
    like: vi.fn().mockImplementation(() => builder),
    ilike: vi.fn().mockImplementation(() => builder),
    is: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    contains: vi.fn().mockImplementation(() => builder),
    containedBy: vi.fn().mockImplementation(() => builder),
    range: vi.fn().mockImplementation(() => builder),
    textSearch: vi.fn().mockImplementation(() => builder),
    match: vi.fn().mockImplementation(() => builder),
    not: vi.fn().mockImplementation(() => builder),
    or: vi.fn().mockImplementation(() => builder),
    filter: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockImplementation(() => builder),
    offset: vi.fn().mockImplementation(() => builder),
    single: vi.fn().mockImplementation(() =>
      Promise.resolve({
        data: Array.isArray(state.data) ? state.data[0] ?? null : state.data,
        error: state.error
      })
    ),
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve({
        data: Array.isArray(state.data) ? state.data[0] ?? null : state.data,
        error: state.error
      })
    ),
    then: (resolve: (value: { data: T[] | T | null; error: typeof state.error }) => void) => {
      resolve({ data: state.data, error: state.error })
    },

    // Test helpers
    _setData: (data: T[] | T | null) => {
      state.data = data
      return builder
    },
    _setError: (error: { message: string } | null) => {
      state.error = error
      return builder
    },
  }

  return builder
}

// Create a mock Supabase client
export function createMockSupabaseClient() {
  const tableQueryBuilders = new Map<string, ReturnType<typeof createMockQueryBuilder>>()

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (!tableQueryBuilders.has(table)) {
        tableQueryBuilders.set(table, createMockQueryBuilder())
      }
      return tableQueryBuilders.get(table)!
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },

    // Test helpers
    _getTableBuilder: (table: string) => tableQueryBuilders.get(table),
    _setTableData: (table: string, data: unknown[]) => {
      const builder = tableQueryBuilders.get(table) ?? createMockQueryBuilder()
      builder._setData(data)
      tableQueryBuilders.set(table, builder)
      return client
    },
  }

  return client
}

// Mock for createClient (server-side)
export const mockCreateClient = vi.fn(() => createMockSupabaseClient())

// Mock for createAdminClient
export const mockCreateAdminClient = vi.fn(() => createMockSupabaseClient())

// Mock session helper
export function mockSuperadminSession(userId: string, profile: { id: string; email: string; is_superadmin: boolean }) {
  const client = createMockSupabaseClient()

  client.auth.getSession.mockResolvedValue({
    data: {
      session: {
        user: { id: userId, email: profile.email },
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
      },
    },
    error: null,
  })

  client.auth.getUser.mockResolvedValue({
    data: {
      user: { id: userId, email: profile.email },
    },
    error: null,
  })

  client._setTableData('profiles', [profile])

  return client
}

// Mock unauthenticated session
export function mockUnauthenticatedSession() {
  const client = createMockSupabaseClient()

  client.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  })

  client.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  })

  return client
}
