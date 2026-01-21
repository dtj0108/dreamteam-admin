import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { refreshAllDeployments } from '@/lib/deployment'

// POST /api/admin/deployments/refresh - Refresh all active deployments
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const result = await refreshAllDeployments(user!.id)

    await logAdminAction(
      user!.id,
      'deployments_refreshed',
      'deployment',
      null,
      { refreshed: result.success, failed: result.failed },
      request
    )

    return NextResponse.json({
      success: true,
      refreshed: result.success,
      failed: result.failed,
    })
  } catch (err) {
    console.error('Deployments refresh error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
