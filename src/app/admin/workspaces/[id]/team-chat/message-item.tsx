'use client'

import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bot, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { AgentResponseStatus } from '@/types/teams'

interface MessageProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  is_agent: boolean
  agent_slug: string | null
}

export interface Message {
  id: string
  channel_id: string
  profile_id: string
  content: string
  is_agent_request: boolean
  agent_request_id: string | null
  agent_response_status: AgentResponseStatus | null
  created_at: string
  profile: MessageProfile
}

interface MessageItemProps {
  message: Message
}

function getStatusBadge(status: AgentResponseStatus | null) {
  if (!status) return null

  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Pending
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      )
    case 'timeout':
      return (
        <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
          <Clock className="h-3 w-3" />
          Timeout
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      )
    default:
      return null
  }
}

function getInitials(name: string | null): string {
  if (!name) return '??'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function MessageItem({ message }: MessageItemProps) {
  const profile = message.profile
  const isAgent = profile?.is_agent

  return (
    <div className="flex gap-3 py-3 px-4 hover:bg-muted/50 transition-colors">
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className={isAgent ? 'bg-primary/10 text-primary' : ''}>
          {isAgent ? <Bot className="h-4 w-4" /> : getInitials(profile?.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {profile?.full_name || 'Unknown'}
          </span>
          {isAgent && profile?.agent_slug && (
            <span className="text-xs text-muted-foreground">
              @{profile.agent_slug}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {message.is_agent_request && getStatusBadge(message.agent_response_status)}
        </div>

        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  )
}
