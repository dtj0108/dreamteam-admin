'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, MessageSquare, Rocket } from 'lucide-react'
import { ChannelSidebar, type AgentChannel } from './channel-sidebar'
import { MessageFeed } from './message-feed'

interface Workspace {
  id: string
  name: string
  slug: string
}

export default function TeamChatPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [hasDeployedTeam, setHasDeployedTeam] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedChannel, setSelectedChannel] = useState<AgentChannel | null>(null)

  // Fetch workspace info and check if team is deployed
  useEffect(() => {
    async function loadData() {
      setLoading(true)

      // Fetch workspace
      const workspaceRes = await fetch(`/api/admin/workspaces/${workspaceId}`)
      if (workspaceRes.ok) {
        const data = await workspaceRes.json()
        setWorkspace(data.workspace)
      }

      // Check for deployed team
      const deployedTeamRes = await fetch(`/api/admin/workspaces/${workspaceId}/deployed-team`)
      if (deployedTeamRes.ok) {
        const data = await deployedTeamRes.json()
        setHasDeployedTeam(!!data.deployment)
      } else {
        setHasDeployedTeam(false)
      }

      setLoading(false)
    }
    loadData()
  }, [workspaceId])

  const handleChannelSelect = (channel: AgentChannel) => {
    setSelectedChannel(channel)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workspace not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/workspaces">Back to Workspaces</Link>
        </Button>
      </div>
    )
  }

  // Show message if no team is deployed
  if (hasDeployedTeam === false) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/workspaces/${workspaceId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Team Chat</h1>
            <p className="text-muted-foreground">{workspace.name}</p>
          </div>
        </div>

        <Card className="p-12 text-center">
          <Rocket className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground mb-2">No team deployed to this workspace</p>
          <p className="text-sm text-muted-foreground mb-4">
            Deploy a team to enable agent channels and see team collaboration.
          </p>
          <Button onClick={() => router.push(`/admin/workspaces/${workspaceId}?tab=team`)}>
            Go to Team Settings
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/workspaces/${workspaceId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Team Chat</h1>
            <p className="text-muted-foreground">{workspace.name}</p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="h-[calc(100vh-220px)] min-h-[500px] flex overflow-hidden">
        {/* Channel Sidebar */}
        <ChannelSidebar
          workspaceId={workspaceId}
          selectedChannelId={selectedChannel?.id || null}
          onChannelSelect={handleChannelSelect}
        />

        {/* Message Feed */}
        <MessageFeed
          workspaceId={workspaceId}
          channelId={selectedChannel?.id || null}
          channelName={selectedChannel?.name || null}
        />
      </Card>
    </div>
  )
}
