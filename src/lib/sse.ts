// Server-Sent Events (SSE) response helper for streaming

import type { StreamEvent } from '@/types/streaming'

/**
 * Creates a Response object that streams SSE events from an async generator
 *
 * @param stream - Async generator that yields StreamEvent objects
 * @returns Response configured for SSE streaming
 */
export function createSSEResponse(stream: AsyncGenerator<StreamEvent>): Response {
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          // Format as SSE: data: {json}\n\n
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))

          // Stop streaming on terminal events
          if (event.type === 'done' || event.type === 'error') {
            break
          }
        }
      } catch (error) {
        // Send error event if something goes wrong
        const errorEvent: StreamEvent = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Stream failed',
          timestamp: new Date().toISOString()
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
      } finally {
        controller.close()
      }
    },

    cancel() {
      // Stream was cancelled by the client
      // The generator will be garbage collected
    }
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    }
  })
}

/**
 * Utility to create a timestamp for stream events
 */
export function now(): string {
  return new Date().toISOString()
}

/**
 * Parse SSE data from a text chunk
 * Handles the "data: {...}\n\n" format
 *
 * @param chunk - Raw SSE text chunk
 * @returns Parsed StreamEvent or null if not a valid event
 */
export function parseSSEEvent(chunk: string): StreamEvent | null {
  const trimmed = chunk.trim()

  // SSE format is "data: {...}"
  if (!trimmed.startsWith('data: ')) {
    return null
  }

  const jsonStr = trimmed.slice(6) // Remove "data: " prefix

  try {
    return JSON.parse(jsonStr) as StreamEvent
  } catch {
    return null
  }
}

/**
 * Creates an SSE reader that parses events from a ReadableStream
 *
 * @param reader - ReadableStream reader from fetch response
 * @returns Async generator that yields parsed StreamEvent objects
 */
export async function* createSSEReader(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by double newlines
      const events = buffer.split('\n\n')
      // Keep the last potentially incomplete event in the buffer
      buffer = events.pop() || ''

      for (const eventStr of events) {
        const event = parseSSEEvent(eventStr)
        if (event) {
          yield event
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const event = parseSSEEvent(buffer)
      if (event) {
        yield event
      }
    }
  } finally {
    reader.releaseLock()
  }
}
