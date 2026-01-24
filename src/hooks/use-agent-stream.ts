'use client'

import { useState, useCallback, useRef } from 'react'
import { createSSEReader } from '@/lib/sse'
import type {
  StreamEvent,
  AgentStreamState,
  StartStreamOptions
} from '@/types/streaming'

const initialState: AgentStreamState = {
  isStreaming: false,
  text: '',
  reasoning: '',
  toolCalls: [],
  todos: [],
  usage: null,
  error: null
}

/**
 * React hook for consuming agent streams with real-time updates
 *
 * @returns Stream state and control functions
 */
export function useAgentStream() {
  const [state, setState] = useState<AgentStreamState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  /**
   * Stop the current stream
   */
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState(prev => ({ ...prev, isStreaming: false }))
  }, [])

  /**
   * Start streaming agent response
   */
  const startStream = useCallback(async (
    agentId: string,
    sessionId: string,
    content: string,
    options?: StartStreamOptions
  ) => {
    // Cancel any existing stream
    stopStream()

    // Reset state but keep isStreaming
    setState({
      ...initialState,
      isStreaming: true
    })

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch(
        `/api/admin/agents/${agentId}/test/${sessionId}/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            enableReasoning: options?.enableReasoning ?? false,
            reasoningBudgetTokens: options?.reasoningBudgetTokens ?? 10000
          }),
          signal: abortController.signal
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()

      // Process SSE events
      for await (const event of createSSEReader(reader)) {
        if (abortController.signal.aborted) break

        processEvent(event, setState)
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Stream was cancelled - this is expected
        return
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Stream failed'
      }))
    }
  }, [stopStream])

  return {
    ...state,
    startStream,
    stopStream,
    reset
  }
}

/**
 * Process a stream event and update state
 */
function processEvent(
  event: StreamEvent,
  setState: React.Dispatch<React.SetStateAction<AgentStreamState>>
) {
  switch (event.type) {
    case 'text_delta':
      setState(prev => ({
        ...prev,
        text: prev.text + event.content
      }))
      break

    case 'reasoning_delta':
      setState(prev => ({
        ...prev,
        reasoning: prev.reasoning + event.content
      }))
      break

    case 'tool_call_start':
      setState(prev => ({
        ...prev,
        toolCalls: [
          ...prev.toolCalls,
          {
            id: event.toolCallId,
            name: event.toolName,
            input: {},
            status: 'pending' as const
          }
        ]
      }))
      break

    case 'tool_call_end':
      setState(prev => ({
        ...prev,
        toolCalls: prev.toolCalls.map(tc =>
          tc.id === event.toolCallId
            ? { ...tc, input: event.input, status: 'executing' as const }
            : tc
        )
      }))
      break

    case 'tool_result':
      setState(prev => ({
        ...prev,
        toolCalls: prev.toolCalls.map(tc =>
          tc.id === event.toolCallId
            ? {
                ...tc,
                result: event.result,
                status: event.success ? 'completed' as const : 'error' as const
              }
            : tc
        )
      }))
      break

    case 'todo_update':
      setState(prev => ({
        ...prev,
        todos: event.todos
      }))
      break

    case 'error':
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: event.error
      }))
      break

    case 'done':
      setState(prev => ({
        ...prev,
        isStreaming: false,
        text: event.result || prev.text,
        usage: {
          inputTokens: event.usage.inputTokens,
          outputTokens: event.usage.outputTokens,
          totalCost: event.usage.totalCost
        }
      }))
      break
  }
}
