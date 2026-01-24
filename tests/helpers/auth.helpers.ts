import { vi } from 'vitest'

export interface MockProfile {
  id: string
  email: string
  is_superadmin: boolean
  full_name?: string
}

// Create a mock superadmin profile
export function createSuperadminProfile(overrides: Partial<MockProfile> = {}): MockProfile {
  return {
    id: overrides.id ?? 'superadmin-user-id',
    email: overrides.email ?? 'admin@test.com',
    is_superadmin: true,
    full_name: overrides.full_name ?? 'Test Admin',
    ...overrides,
  }
}

// Create a mock regular user profile
export function createRegularUserProfile(overrides: Partial<MockProfile> = {}): MockProfile {
  return {
    id: overrides.id ?? 'regular-user-id',
    email: overrides.email ?? 'user@test.com',
    is_superadmin: false,
    full_name: overrides.full_name ?? 'Test User',
    ...overrides,
  }
}

// Mock session data for authenticated user
export function createMockSession(userId: string, email: string) {
  return {
    user: { id: userId, email },
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000,
    expires_in: 3600,
    token_type: 'bearer',
  }
}

// Helper to setup mocks for requireSuperadmin
export function setupAuthMocks(
  mockCreateClient: ReturnType<typeof vi.fn>,
  mockCreateAdminClient: ReturnType<typeof vi.fn>,
  options: {
    hasSession: boolean
    isSuperadmin: boolean
    userId?: string
    email?: string
  }
) {
  const { hasSession, isSuperadmin, userId = 'test-user-id', email = 'test@test.com' } = options

  const mockSession = hasSession ? createMockSession(userId, email) : null
  const mockProfile = hasSession
    ? isSuperadmin
      ? createSuperadminProfile({ id: userId, email })
      : createRegularUserProfile({ id: userId, email })
    : null

  // Mock createClient (for getSession)
  const clientMock = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      }),
    },
  }
  mockCreateClient.mockResolvedValue(clientMock)

  // Mock createAdminClient (for profile lookup)
  const adminClientMock = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    }),
  }
  mockCreateAdminClient.mockReturnValue(adminClientMock)

  return { clientMock, adminClientMock, mockSession, mockProfile }
}
