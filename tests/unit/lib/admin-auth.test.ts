import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the supabase modules before importing admin-auth
const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
const mockProfileSelect = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockProfileSelect,
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockProfileSelect,
            }),
          }),
        }
      }
      if (table === 'admin_audit_logs') {
        return {
          insert: mockInsert,
        }
      }
      return {}
    }),
  }),
}))

describe('admin-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireSuperadmin', () => {
    it('returns 401 when no session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const { requireSuperadmin } = await import('@/lib/admin-auth')
      const { error, user } = await requireSuperadmin()

      expect(error).not.toBeNull()
      expect(error?.status).toBe(401)
      expect(user).toBeNull()
    })

    it('returns 401 when session has no user id', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: {} } },
        error: null,
      })

      const { requireSuperadmin } = await import('@/lib/admin-auth')
      const { error, user } = await requireSuperadmin()

      expect(error).not.toBeNull()
      expect(error?.status).toBe(401)
      expect(user).toBeNull()
    })

    it('returns 403 when user is not superadmin', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'user@test.com' },
          },
        },
        error: null,
      })

      mockProfileSelect.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          is_superadmin: false,
        },
        error: null,
      })

      const { requireSuperadmin } = await import('@/lib/admin-auth')
      const { error, user } = await requireSuperadmin()

      expect(error).not.toBeNull()
      expect(error?.status).toBe(403)
      expect(user).toBeNull()
    })

    it('returns 403 when profile is not found', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'user@test.com' },
          },
        },
        error: null,
      })

      mockProfileSelect.mockResolvedValue({
        data: null,
        error: null,
      })

      const { requireSuperadmin } = await import('@/lib/admin-auth')
      const { error, user } = await requireSuperadmin()

      expect(error).not.toBeNull()
      expect(error?.status).toBe(403)
      expect(user).toBeNull()
    })

    it('returns user when superadmin is authenticated', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@test.com',
        is_superadmin: true,
      }

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: mockUser.id, email: mockUser.email },
          },
        },
        error: null,
      })

      mockProfileSelect.mockResolvedValue({
        data: mockUser,
        error: null,
      })

      const { requireSuperadmin } = await import('@/lib/admin-auth')
      const { error, user } = await requireSuperadmin()

      expect(error).toBeNull()
      expect(user).toEqual(mockUser)
    })
  })

  describe('getCurrentUser', () => {
    it('returns null when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { getCurrentUser } = await import('@/lib/admin-auth')
      const user = await getCurrentUser()

      expect(user).toBeNull()
    })

    it('returns profile when authenticated', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'user@test.com',
        full_name: 'Test User',
        is_superadmin: false,
      }

      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockProfileSelect.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const { getCurrentUser } = await import('@/lib/admin-auth')
      const user = await getCurrentUser()

      expect(user).toEqual(mockProfile)
    })
  })

  describe('logAdminAction', () => {
    it('logs admin action with all required fields', async () => {
      mockInsert.mockResolvedValue({ error: null })

      const { logAdminAction } = await import('@/lib/admin-auth')
      await logAdminAction(
        'admin-123',
        'CREATE',
        'user',
        'user-456',
        { note: 'Created new user' }
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: 'admin-123',
          action: 'CREATE',
          target_type: 'user',
          target_id: 'user-456',
          details: { note: 'Created new user' },
        })
      )
    })

    it('logs admin action with IP and user agent from request', async () => {
      mockInsert.mockResolvedValue({ error: null })

      const mockRequest = {
        headers: {
          get: vi.fn().mockImplementation((name: string) => {
            if (name === 'x-forwarded-for') return '192.168.1.1'
            if (name === 'user-agent') return 'Mozilla/5.0 Test'
            return null
          }),
        },
      } as unknown as Request

      const { logAdminAction } = await import('@/lib/admin-auth')
      await logAdminAction(
        'admin-123',
        'UPDATE',
        'agent',
        'agent-789',
        {},
        mockRequest
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 Test',
        })
      )
    })

    it('handles null target_id', async () => {
      mockInsert.mockResolvedValue({ error: null })

      const { logAdminAction } = await import('@/lib/admin-auth')
      await logAdminAction('admin-123', 'LIST', 'users', null)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          target_id: null,
        })
      )
    })

    it('defaults to empty details object', async () => {
      mockInsert.mockResolvedValue({ error: null })

      const { logAdminAction } = await import('@/lib/admin-auth')
      await logAdminAction('admin-123', 'DELETE', 'tool', 'tool-123')

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {},
        })
      )
    })
  })

  describe('getSession', () => {
    it('returns session when authenticated', async () => {
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token',
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const { getSession } = await import('@/lib/admin-auth')
      const session = await getSession()

      expect(session).toEqual(mockSession)
    })

    it('returns null when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const { getSession } = await import('@/lib/admin-auth')
      const session = await getSession()

      expect(session).toBeNull()
    })
  })
})
