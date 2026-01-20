import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { upgradeWorkspaceDeployment, getWorkspaceDeployedTeam } from '@/lib/deployment'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/admin/workspaces/[id]/deployed-team/upgrade - Upgrade to latest template version
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

    const oldVersion = existing.source_version
    const deployment = await upgradeWorkspaceDeployment(workspaceId, user!.id)

    await logAdminAction(
      user!.id,
      'workspace_team_upgraded',
      'workspace',
      workspaceId,
      {
        team_id: existing.source_team_id,
        old_version: oldVersion,
        new_version: deployment.source_version,
      },
      request
    )

    return NextResponse.json({
      success: true,
      deployment,
      upgraded: deployment.source_version > oldVersion,
      old_version: oldVersion,
      new_version: deployment.source_version,
    })
  } catch (err) {
    console.error('Workspace deployed-team upgrade error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
