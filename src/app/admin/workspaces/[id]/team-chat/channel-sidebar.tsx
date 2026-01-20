'use client'

import { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Hash, Bot, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AgentChannel {
  id: string
  workspace_id: string
  name: string
  description: string | null
  is_agent_channel: boolean
  linked_agent_id: string | null
  created_at: string
  updated_at: string
  agent_name: string | null
  agent_avatar_url: string | null
  agent_slug: string | null
}

interface ChannelSidebarProps {
  workspaceId: string
  selectedChannelId: string | null
  onChannelSelect: (channel: AgentChannel) => void
}

export function ChannelSidebar({ workspaceId, selectedChannelId, onChannelSelect }: ChannelSidebarProps) {
  const [channels, setChannels] = useState<AgentChannel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/agent-channels`)
      if (res.ok) {
        const data = await res.json()
        setChannels(data.channels || [])

        // Auto-select first channel if none selected
        if (!selectedChannelId && data.channels?.length > 0) {
          onChannelSelect(data.channels[0])
        }
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, selectedChannelId, onChannelSelect])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  if (loading) {
    return (
      <div className="w-64 border-r bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Agent Channels</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchChannels}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Channel list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No agent channels found
            </div>
          ) : (
            channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                  selectedChannelId === channel.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={channel.agent_avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {channel.name}
                    </span>
                  </div>
                  {channel.agent_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {channel.agent_name}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
