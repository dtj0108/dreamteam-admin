import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { resetWorkspaceCustomizations, getWorkspaceDeployedTeam } from '@/lib/deployment'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/admin/workspaces/[id]/deployed-team/reset - Reset customizations to template
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id: workspaceId } = await context.params

    // Verify there's an active deployment
    const existing = await getWorkspaceDeployedTeam(workspaceId)
    if (!existing) {
      return NextResponse.json(
        { error: 'No active deployment found for this workspace' },
        { status: 404 }
      )
    }

    const deployment = await resetWorkspaceCustomizations(workspaceId, user!.id)

    await logAdminAction(
      user!.id,
      'workspace_team_customizations_reset',
      'workspace',
      workspaceId,
      { team_id: existing.source_team_id },
      request
    )

    return NextResponse.json({
      success: true,
      deployment,
    })
  } catch (err) {
    console.error('Workspace deployed-team reset error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
