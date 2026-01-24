'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Bot,
  User,
  Send,
  Loader2,
  Play,
  Square,
  Wrench,
  Clock,
  Zap,
  DollarSign,
  Building2,
  Brain,
  ChevronDown,
  ChevronRight,
  StopCircle
} from 'lucide-react'
import { useAgentStream } from '@/hooks/use-agent-stream'
import type { Agent, AgentTestSession, AgentTestMessage, TestToolMode } from '@/types/agents'

interface Workspace {
  id: string
  name: string
}

interface AgentTestSandboxProps {
  agents: Agent[]
  workspaces: Workspace[]
  loading?: boolean
}

export function AgentTestSandbox({ agents, workspaces, loading }: AgentTestSandboxProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('none')
  const [toolMode, setToolMode] = useState<TestToolMode>('mock')

  const [session, setSession] = useState<AgentTestSession | null>(null)
  const [messages, setMessages] = useState<AgentTestMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)

  // Streaming mode state
  const [useStreaming, setUseStreaming] = useState(true)
  const [showReasoning, setShowReasoning] = useState(false)
  const [reasoningOpen, setReasoningOpen] = useState(true)

  // Use the streaming hook
  const stream = useAgentStream()

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, stream.text, stream.reasoning])

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  async function startSession() {
    if (!selectedAgentId) return

    setStarting(true)
    try {
      const res = await fetch(`/api/admin/agents/${selectedAgentId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_mode: toolMode,
          workspace_id: selectedWorkspaceId === 'none' ? undefined : selectedWorkspaceId
        })
      })

      if (!res.ok) throw new Error('Failed to start session')

      const data = await res.json()
      setSession(data.session)
      setMessages([])
    } catch (err) {
      console.error('Start session error:', err)
    } finally {
      setStarting(false)
    }
  }

  async function endSession() {
    if (!session || !selectedAgentId) return

    setEnding(true)
    try {
      await fetch(`/api/admin/agents/${selectedAgentId}/test/${session.id}`, {
        method: 'DELETE'
      })
      setSession(null)
      setMessages([])
    } catch (err) {
      console.error('End session error:', err)
    } finally {
      setEnding(false)
    }
  }

  async function sendMessage() {
    if (!session || !input.trim() || !selectedAgentId) return

    const messageContent = input
    setInput('')

    // Add user message immediately
    const userMessage: AgentTestMessage = {
      id: `temp-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content: messageContent,
      tool_name: null,
      tool_input: null,
      tool_output: null,
      tool_use_id: null,
      latency_ms: null,
      tokens_input: null,
      tokens_output: null,
      sequence_number: messages.length + 1,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    if (useStreaming) {
      // Use streaming mode
      stream.reset()
      await stream.startStream(
        selectedAgentId,
        session.id,
        messageContent,
        { enableReasoning: showReasoning }
      )

      // After stream completes, add the assistant message to history
      // This is done via effect watching stream.isStreaming
    } else {
      // Use non-streaming mode (original behavior)
      setSending(true)
      try {
        const res = await fetch(`/api/admin/agents/${selectedAgentId}/test/${session.id}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageContent })
        })

        if (!res.ok) throw new Error('Failed to send message')

        const data = await res.json()
        const newMessages: AgentTestMessage[] = []

        if (data.toolCalls) newMessages.push(...data.toolCalls)
        if (data.assistantMessage) newMessages.push(data.assistantMessage)

        setMessages(prev => [...prev, ...newMessages])
      } catch (err) {
        console.error('Send message error:', err)
      } finally {
        setSending(false)
      }
    }
  }

  // When streaming completes, add the response to message history
  useEffect(() => {
    if (!stream.isStreaming && stream.text && session) {
      const assistantMessage: AgentTestMessage = {
        id: `stream-${Date.now()}`,
        session_id: session.id,
        role: 'assistant',
        content: stream.text,
        tool_name: null,
        tool_input: null,
        tool_output: null,
        tool_use_id: null,
        latency_ms: null,
        tokens_input: stream.usage?.inputTokens ?? null,
        tokens_output: stream.usage?.outputTokens ?? null,
        sequence_number: messages.length + 1,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
      stream.reset()
    }
  }, [stream.isStreaming, stream.text, session, messages.length, stream])

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Select an agent and configure the test environment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
                disabled={!!session}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tool Mode</label>
              <Select
                value={toolMode}
                onValueChange={(v) => setToolMode(v as TestToolMode)}
                disabled={!!session}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock (No API calls)</SelectItem>
                  <SelectItem value="simulate">Simulate (Fake data)</SelectItem>
                  <SelectItem value="live">Live (Real execution)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace</label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
                disabled={!!session}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No workspace</span>
                  </SelectItem>
                  {workspaces.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {ws.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              {session ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={endSession}
                  disabled={ending}
                >
                  {ending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="mr-2 h-4 w-4" />
                  )}
                  End Session
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={startSession}
                  disabled={!selectedAgentId || starting}
                >
                  {starting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Start Session
                </Button>
              )}
            </div>
          </div>

          {/* Streaming Options */}
          <div className="flex items-center gap-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch
                id="streaming"
                checked={useStreaming}
                onCheckedChange={setUseStreaming}
                disabled={!!session && stream.isStreaming}
              />
              <Label htmlFor="streaming" className="text-sm">
                Stream responses
              </Label>
            </div>

            {useStreaming && (
              <div className="flex items-center gap-2">
                <Switch
                  id="reasoning"
                  checked={showReasoning}
                  onCheckedChange={setShowReasoning}
                  disabled={stream.isStreaming}
                />
                <Label htmlFor="reasoning" className="text-sm flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Show reasoning
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Chat</CardTitle>
            {session && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Version {session.version}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {session.total_turns} turns
                </span>
                {session.total_cost_usd > 0 && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${session.total_cost_usd.toFixed(4)}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {session ? (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] border rounded-lg p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                  ))}

                  {/* Show streaming reasoning */}
                  {stream.isStreaming && showReasoning && stream.reasoning && (
                    <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen}>
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                          {reasoningOpen ? (
                            <ChevronDown className="h-4 w-4 text-amber-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-amber-600" />
                          )}
                          <Brain className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Thinking...
                          </span>
                          <Loader2 className="h-3 w-3 animate-spin text-amber-600 ml-auto" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                            {stream.reasoning}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {/* Show streaming tool calls */}
                  {stream.isStreaming && stream.toolCalls.length > 0 && (
                    <div className="space-y-2">
                      {stream.toolCalls.map((tc) => (
                        <div key={tc.id} className="flex justify-center">
                          <div className="bg-muted rounded-lg px-4 py-2 max-w-md">
                            <div className="flex items-center gap-2 text-sm">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{tc.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {tc.status === 'executing' ? (
                                  <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    running
                                  </span>
                                ) : tc.status === 'completed' ? (
                                  'done'
                                ) : tc.status === 'error' ? (
                                  'error'
                                ) : (
                                  'pending'
                                )}
                              </Badge>
                            </div>
                            {Object.keys(tc.input).length > 0 && (
                              <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
                                {JSON.stringify(tc.input, null, 2)}
                              </pre>
                            )}
                            {tc.result !== undefined && (
                              <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
                                {JSON.stringify(tc.result, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show streaming text response */}
                  {stream.isStreaming && stream.text && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2 max-w-[80%]">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-lg px-4 py-2 bg-muted">
                          <p className="text-sm whitespace-pre-wrap">{stream.text}</p>
                          <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            streaming...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show streaming usage when done */}
                  {!stream.isStreaming && stream.usage && (
                    <div className="flex justify-center">
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>{stream.usage.inputTokens} in / {stream.usage.outputTokens} out</span>
                        {stream.usage.totalCost !== undefined && (
                          <span>${stream.usage.totalCost.toFixed(4)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show streaming error */}
                  {stream.error && (
                    <div className="flex justify-center">
                      <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2">
                        <p className="text-sm">{stream.error}</p>
                      </div>
                    </div>
                  )}

                  {messages.length === 0 && !stream.isStreaming && (
                    <div className="text-center text-muted-foreground py-8">
                      Send a message to start testing
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={sending || stream.isStreaming}
                />
                {stream.isStreaming ? (
                  <Button variant="outline" onClick={stream.stopStream}>
                    <StopCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={sendMessage} disabled={sending || !input.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Active Session</p>
              <p className="text-sm">Select an agent and start a test session to begin chatting</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MessageBubble({ message }: { message: AgentTestMessage }) {
  const isUser = message.role === 'user'
  const isToolUse = message.role === 'tool_use'
  const isToolResult = message.role === 'tool_result'

  if (isToolUse || isToolResult) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted rounded-lg px-4 py-2 max-w-md">
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{message.tool_name}</span>
            <Badge variant="outline" className="text-xs">
              {isToolUse ? 'call' : 'result'}
            </Badge>
          </div>
          {message.tool_input && (
            <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
              {JSON.stringify(message.tool_input, null, 2)}
            </pre>
          )}
          {message.tool_output && (
            <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
              {JSON.stringify(message.tool_output, null, 2)}
            </pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <div className={`rounded-lg px-4 py-2 ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {message.latency_ms && (
            <p className={`text-xs mt-1 ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {message.latency_ms}ms
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
