'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MessageItem, type Message } from './message-item'
import { Loader2, RefreshCw } from 'lucide-react'

interface MessageFeedProps {
  workspaceId: string
  channelId: string | null
  channelName: string | null
}

export function MessageFeed({ workspaceId, channelId, channelName }: MessageFeedProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchMessages = useCallback(async (before?: string) => {
    if (!channelId) return

    const isLoadingMore = !!before
    if (isLoadingMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams({ limit: '50' })
      if (before) params.append('before', before)

      const res = await fetch(
        `/api/admin/workspaces/${workspaceId}/agent-channels/${channelId}/messages?${params}`
      )
      if (res.ok) {
        const data = await res.json()
        if (isLoadingMore) {
          // Prepend older messages
          setMessages(prev => [...data.messages, ...prev])
        } else {
          setMessages(data.messages || [])
        }
        setHasMore(data.has_more || false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [workspaceId, channelId])

  const fetchSingleMessage = useCallback(async (messageId: string): Promise<Message | null> => {
    if (!channelId) return null

    try {
      const res = await fetch(
        `/api/admin/workspaces/${workspaceId}/agent-channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: messageId }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        return data.message
      }
    } catch (error) {
      console.error('Failed to fetch message:', error)
    }
    return null
  }, [workspaceId, channelId])

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load initial messages when channel changes
  useEffect(() => {
    if (channelId) {
      setMessages([])
      fetchMessages()
    }
  }, [channelId, fetchMessages])

  // Scroll to bottom after initial load
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom()
    }
  }, [loading, messages.length, scrollToBottom])

  // Set up real-time subscription
  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`agent-channel-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the full message with profile data
          const newMessage = await fetchSingleMessage(payload.new.id as string)
          if (newMessage) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
            scrollToBottom()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          // Update message status (e.g., pending → completed)
          setMessages(prev =>
            prev.map(m =>
              m.id === payload.new.id
                ? { ...m, agent_response_status: payload.new.agent_response_status }
                : m
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, supabase, fetchSingleMessage, scrollToBottom])

  // Load more messages
  const handleLoadMore = () => {
    if (messages.length > 0 && hasMore && !loadingMore) {
      fetchMessages(messages[0].created_at)
    }
  }

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a channel to view messages
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Channel header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">#{channelName || 'channel'}</h2>
          <p className="text-xs text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => fetchMessages()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="py-2">
          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Load older messages
              </Button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No messages in this channel yet
            </div>
          ) : (
            messages.map(message => (
              <MessageItem key={message.id} message={message} />
            ))
          )}

          {/* Anchor for scrolling to bottom */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
