# Prompt caching

---

Prompt caching is a powerful feature that optimizes your API usage by allowing resuming from specific prefixes in your prompts. This approach significantly reduces processing time and costs for repetitive tasks or prompts with consistent elements.

Here's an example of how to implement prompt caching with the Messages API using a `cache_control` block:

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "system": [
      {
        "type": "text",
        "text": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"
      },
      {
        "type": "text",
        "text": "<the entire contents of Pride and Prejudice>",
        "cache_control": {"type": "ephemeral"}
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "Analyze the major themes in Pride and Prejudice."
      }
    ]
  }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    system=[
      {
        "type": "text",
        "text": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n",
      },
      {
        "type": "text",
        "text": "<the entire contents of 'Pride and Prejudice'>",
        "cache_control": {"type": "ephemeral"}
      }
    ],
    messages=[{"role": "user", "content": "Analyze the major themes in 'Pride and Prejudice'."}],
)
print(response.usage.model_dump_json())
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n",
    },
    {
      type: "text",
      text: "<the entire contents of 'Pride and Prejudice'>",
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [
    {
      role: "user",
      content: "Analyze the major themes in 'Pride and Prejudice'."
    }
  ]
});
console.log(response.usage);
```

**Java:**
```java
import java.util.List;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.CacheControlEphemeral;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.TextBlockParam;

public class PromptCachingExample {

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        MessageCreateParams params = MessageCreateParams.builder()
                .model(Model.CLAUDE_OPUS_4_20250514)
                .maxTokens(1024)
                .systemOfTextBlockParams(List.of(
                        TextBlockParam.builder()
                                .text("You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n")
                                .build(),
                        TextBlockParam.builder()
                                .text("<the entire contents of 'Pride and Prejudice'>")
                                .cacheControl(CacheControlEphemeral.builder().build())
                                .build()
                ))
                .addUserMessage("Analyze the major themes in 'Pride and Prejudice'.")
                .build();

        Message message = client.messages().create(params);
        System.out.println(message.usage());
    }
}
```

**Response:**
```json
{"cache_creation_input_tokens":188086,"cache_read_input_tokens":0,"input_tokens":21,"output_tokens":393}
{"cache_creation_input_tokens":0,"cache_read_input_tokens":188086,"input_tokens":21,"output_tokens":393}
```

In this example, the entire text of "Pride and Prejudice" is cached using the `cache_control` parameter. This enables reuse of this large text across multiple API calls without reprocessing it each time. Changing only the user message allows you to ask various questions about the book while utilizing the cached content, leading to faster responses and improved efficiency.

---

## How prompt caching works

When you send a request with prompt caching enabled:

1. The system checks if a prompt prefix, up to a specified cache breakpoint, is already cached from a recent query.
2. If found, it uses the cached version, reducing processing time and costs.
3. Otherwise, it processes the full prompt and caches the prefix once the response begins.

This is especially useful for:
- Prompts with many examples
- Large amounts of context or background information
- Repetitive tasks with consistent instructions
- Long multi-turn conversations

By default, the cache has a 5-minute lifetime. The cache is refreshed for no additional cost each time the cached content is used.

**Note:** If you find that 5 minutes is too short, Anthropic also offers a 1-hour cache duration at additional cost.

**Tip:** Prompt caching caches the full prefix - `tools`, `system`, and `messages` (in that order) up to and including the block designated with `cache_control`.

---

## Pricing

Prompt caching introduces a new pricing structure. The table below shows the price per million tokens for each supported model:

| Model | Base Input Tokens | 5m Cache Writes | 1h Cache Writes | Cache Hits & Refreshes | Output Tokens |
|-------|-------------------|-----------------|-----------------|----------------------|---------------|
| Claude Opus 4.5 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |
| Claude Opus 4.1 | $15 / MTok | $18.75 / MTok | $30 / MTok | $1.50 / MTok | $75 / MTok |
| Claude Opus 4 | $15 / MTok | $18.75 / MTok | $30 / MTok | $1.50 / MTok | $75 / MTok |
| Claude Sonnet 4.5 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |
| Claude Sonnet 4 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |
| Claude Sonnet 3.7 (deprecated) | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |
| Claude Haiku 4.5 | $1 / MTok | $1.25 / MTok | $2 / MTok | $0.10 / MTok | $5 / MTok |
| Claude Haiku 3.5 (deprecated) | $0.80 / MTok | $1 / MTok | $1.6 / MTok | $0.08 / MTok | $4 / MTok |
| Claude Opus 3 (deprecated) | $15 / MTok | $18.75 / MTok | $30 / MTok | $1.50 / MTok | $75 / MTok |
| Claude Haiku 3 | $0.25 / MTok | $0.30 / MTok | $0.50 / MTok | $0.03 / MTok | $1.25 / MTok |

**Note:** The table above reflects the following pricing multipliers for prompt caching:
- 5-minute cache write tokens are 1.25 times the base input tokens price
- 1-hour cache write tokens are 2 times the base input tokens price
- Cache read tokens are 0.1 times the base input tokens price

---

## How to implement prompt caching

### Supported models

Prompt caching is currently supported on:
- Claude Opus 4.5
- Claude Opus 4.1
- Claude Opus 4
- Claude Sonnet 4.5
- Claude Sonnet 4
- Claude Sonnet 3.7 (deprecated)
- Claude Haiku 4.5
- Claude Haiku 3.5 (deprecated)
- Claude Haiku 3

### Structuring your prompt

Place static content (tool definitions, system instructions, context, examples) at the beginning of your prompt. Mark the end of the reusable content for caching using the `cache_control` parameter.

Cache prefixes are created in the following order: `tools`, `system`, then `messages`. This order forms a hierarchy where each level builds upon the previous ones.

#### How automatic prefix checking works

You can use just one cache breakpoint at the end of your static content, and the system will automatically find the longest matching sequence of cached blocks. Understanding how this works helps you optimize your caching strategy.

**Three core principles:**

1. **Cache keys are cumulative**: When you explicitly cache a block with `cache_control`, the cache hash key is generated by hashing all previous blocks in the conversation sequentially. This means the cache for each block depends on all content that came before it.

2. **Backward sequential checking**: The system checks for cache hits by working backwards from your explicit breakpoint, checking each previous block in reverse order. This ensures you get the longest possible cache hit.

3. **20-block lookback window**: The system only checks up to 20 blocks before each explicit `cache_control` breakpoint. After checking 20 blocks without a match, it stops checking and moves to the next explicit breakpoint (if any).

**Example: Understanding the lookback window**

Consider a conversation with 30 content blocks where you set `cache_control` only on block 30:

- **If you send block 31 with no changes to previous blocks**: The system checks block 30 (match!). You get a cache hit at block 30, and only block 31 needs processing.

- **If you modify block 25 and send block 31**: The system checks backwards from block 30 → 29 → 28... → 25 (no match) → 24 (match!). Since block 24 hasn't changed, you get a cache hit at block 24, and only blocks 25-30 need reprocessing.

- **If you modify block 5 and send block 31**: The system checks backwards from block 30 → 29 → 28... → 11 (check #20). After 20 checks without finding a match, it stops looking. Since block 5 is beyond the 20-block window, no cache hit occurs and all blocks need reprocessing. However, if you had set an explicit `cache_control` breakpoint on block 5, the system would continue checking from that breakpoint: block 5 (no match) → block 4 (match!). This allows a cache hit at block 4, demonstrating why you should place breakpoints before editable content.

**Key takeaway**: Always set an explicit cache breakpoint at the end of your conversation to maximize your chances of cache hits. Additionally, set breakpoints just before content blocks that might be editable to ensure those sections can be cached independently.

#### When to use multiple breakpoints

You can define up to 4 cache breakpoints if you want to:
- Cache different sections that change at different frequencies (e.g., tools rarely change, but context updates daily)
- Have more control over exactly what gets cached
- Ensure caching for content more than 20 blocks before your final breakpoint
- Place breakpoints before editable content to guarantee cache hits even when changes occur beyond the 20-block window

**Important limitation**: If your prompt has more than 20 content blocks before your cache breakpoint, and you modify content earlier than those 20 blocks, you won't get a cache hit unless you add additional explicit breakpoints closer to that content.

### Cache limitations

The minimum cacheable prompt length is:
- 4096 tokens for Claude Opus 4.5
- 1024 tokens for Claude Opus 4.1, Claude Opus 4, Claude Sonnet 4.5, Claude Sonnet 4, and Claude Sonnet 3.7 (deprecated)
- 4096 tokens for Claude Haiku 4.5
- 2048 tokens for Claude Haiku 3.5 (deprecated) and Claude Haiku 3

Shorter prompts cannot be cached, even if marked with `cache_control`. Any requests to cache fewer than this number of tokens will be processed without caching. To see if a prompt was cached, see the response usage fields.

For concurrent requests, note that a cache entry only becomes available after the first response begins. If you need cache hits for parallel requests, wait for the first response before sending subsequent requests.

Currently, "ephemeral" is the only supported cache type, which by default has a 5-minute lifetime.

### Understanding cache breakpoint costs

**Cache breakpoints themselves don't add any cost.** You are only charged for:
- **Cache writes**: When new content is written to the cache (25% more than base input tokens for 5-minute TTL)
- **Cache reads**: When cached content is used (10% of base input token price)
- **Regular input tokens**: For any uncached content

Adding more `cache_control` breakpoints doesn't increase your costs - you still pay the same amount based on what content is actually cached and read. The breakpoints simply give you control over what sections can be cached independently.

### What can be cached

Most blocks in the request can be designated for caching with `cache_control`. This includes:

- Tools: Tool definitions in the `tools` array
- System messages: Content blocks in the `system` array
- Text messages: Content blocks in the `messages.content` array, for both user and assistant turns
- Images & Documents: Content blocks in the `messages.content` array, in user turns
- Tool use and tool results: Content blocks in the `messages.content` array, in both user and assistant turns

Each of these elements can be marked with `cache_control` to enable caching for that portion of the request.

### What cannot be cached

While most request blocks can be cached, there are some exceptions:

- Thinking blocks cannot be cached directly with `cache_control`. However, thinking blocks CAN be cached alongside other content when they appear in previous assistant turns. When cached this way, they DO count as input tokens when read from cache.
- Sub-content blocks (like citations) themselves cannot be cached directly. Instead, cache the top-level block.
- Empty text blocks cannot be cached.

### What invalidates the cache

Modifications to cached content can invalidate some or all of the cache.

As described in the prompt structuring section, the cache follows the hierarchy: `tools` → `system` → `messages`. Changes at each level invalidate that level and all subsequent levels.

The following table shows which parts of the cache are invalidated by different types of changes. ✘ indicates that the cache is invalidated, while ✓ indicates that the cache remains valid.

| What changes | Tools cache | System cache | Messages cache | Impact |
|------------|------------------|---------------|----------------|-------------|
| **Tool definitions** | ✘ | ✘ | ✘ | Modifying tool definitions invalidates the entire cache |
| **Web search toggle** | ✓ | ✘ | ✘ | Enabling/disabling web search modifies the system prompt |
| **Citations toggle** | ✓ | ✘ | ✘ | Enabling/disabling citations modifies the system prompt |
| **Tool choice** | ✓ | ✓ | ✘ | Changes to `tool_choice` parameter only affect message blocks |
| **Images** | ✓ | ✓ | ✘ | Adding/removing images anywhere in the prompt affects message blocks |
| **Thinking parameters** | ✓ | ✓ | ✘ | Changes to extended thinking settings affect message blocks |

### Tracking cache performance

Monitor cache performance using these API response fields, within `usage` in the response:

- `cache_creation_input_tokens`: Number of tokens written to the cache when creating a new entry.
- `cache_read_input_tokens`: Number of tokens retrieved from the cache for this request.
- `input_tokens`: Number of input tokens which were not read from or used to create a cache (i.e., tokens after the last cache breakpoint).

**Understanding the token breakdown:**

The `input_tokens` field represents only the tokens that come **after the last cache breakpoint** in your request - not all the input tokens you sent.

To calculate total input tokens:
```
total_input_tokens = cache_read_input_tokens + cache_creation_input_tokens + input_tokens
```

**Spatial explanation:**
- `cache_read_input_tokens` = tokens before breakpoint already cached (reads)
- `cache_creation_input_tokens` = tokens before breakpoint being cached now (writes)
- `input_tokens` = tokens after your last breakpoint (not eligible for cache)

**Example:** If you have a request with 100,000 tokens of cached content (read from cache), 0 tokens of new content being cached, and 50 tokens in your user message (after the cache breakpoint):
- `cache_read_input_tokens`: 100,000
- `cache_creation_input_tokens`: 0
- `input_tokens`: 50
- **Total input tokens processed**: 100,050 tokens

This is important for understanding both costs and rate limits.

### Best practices for effective caching

To optimize prompt caching performance:

- Cache stable, reusable content like system instructions, background information, large contexts, or frequent tool definitions.
- Place cached content at the prompt's beginning for best performance.
- Use cache breakpoints strategically to separate different cacheable prefix sections.
- Set cache breakpoints at the end of conversations and just before editable content to maximize cache hit rates.
- Regularly analyze cache hit rates and adjust your strategy as needed.

### Optimizing for different use cases

Tailor your prompt caching strategy to your scenario:

- **Conversational agents**: Reduce cost and latency for extended conversations with long instructions or uploaded documents.
- **Coding assistants**: Improve autocomplete and codebase Q&A by keeping relevant sections in the prompt.
- **Large document processing**: Incorporate complete long-form material including images without increasing response latency.
- **Detailed instruction sets**: Share extensive lists of instructions and examples to fine-tune Claude's responses.
- **Agentic tool use**: Enhance performance for scenarios involving multiple tool calls and iterative code changes.
- **Knowledge base**: Bring documentation, papers, transcripts, and other longform content alive by embedding entire documents in the prompt.

### Troubleshooting common issues

If experiencing unexpected behavior:

- Ensure cached sections are identical and marked with cache_control in the same locations across calls
- Check that calls are made within the cache lifetime (5 minutes by default)
- Verify that `tool_choice` and image usage remain consistent between calls
- Validate that you are caching at least the minimum number of tokens
- For prompts with more than 20 content blocks, you may need additional `cache_control` parameters earlier in the prompt to ensure all content can be cached
- Verify that the keys in your `tool_use` content blocks have stable ordering

**Note:** Changes to `tool_choice` or the presence/absence of images anywhere in the prompt will invalidate the cache. See the cache invalidation section for more details.

### Caching with thinking blocks

When using extended thinking with prompt caching, thinking blocks have special behavior:

**Automatic caching alongside other content**: While thinking blocks cannot be explicitly marked with `cache_control`, they get cached as part of the request content when you make subsequent API calls with tool results.

**Input token counting**: When thinking blocks are read from cache, they count as input tokens in your usage metrics.

**Cache invalidation patterns**:
- Cache remains valid when only tool results are provided as user messages
- Cache gets invalidated when non-tool-result user content is added, causing all previous thinking blocks to be stripped
- This caching behavior occurs even without explicit `cache_control` markers

**Example with tool use**: When you include tool results in a request, previous thinking blocks get cached alongside other content. Non-tool-result user messages cause thinking blocks to be removed from context.

---

## Cache storage and sharing

- **Organization Isolation**: Caches are isolated between organizations. Different organizations never share caches, even if they use identical prompts.

- **Exact Matching**: Cache hits require 100% identical prompt segments, including all text and images up to and including the block marked with cache control.

- **Output Token Generation**: Prompt caching has no effect on output token generation. The response you receive will be identical to what you would get if prompt caching was not used.

---

## 1-hour cache duration

If you find that 5 minutes is too short, Anthropic also offers a 1-hour cache duration at additional cost.

To use the extended cache, include `ttl` in the `cache_control` definition like this:
```json
"cache_control": {
    "type": "ephemeral",
    "ttl": "5m" | "1h"
}
```

The response will include detailed cache information showing creation for both TTL durations:

```json
{
    "usage": {
        "input_tokens": ...,
        "cache_read_input_tokens": ...,
        "cache_creation_input_tokens": ...,
        "output_tokens": ...,
        "cache_creation": {
            "ephemeral_5m_input_tokens": 456,
            "ephemeral_1h_input_tokens": 100,
        }
    }
}
```

### When to use the 1-hour cache

The 1-hour cache is best used in the following scenarios:
- When you have prompts that are likely used less frequently than 5 minutes, but more frequently than every hour
- When an agentic side-agent will take longer than 5 minutes
- When storing a long chat conversation where users may not respond in the next 5 minutes
- When latency is important and follow-up prompts may be sent beyond 5 minutes
- When you want to improve your rate limit utilization, since cache hits are not deducted against your rate limit

**Note:** The 5-minute and 1-hour cache behave the same with respect to latency.

### Mixing different TTLs

You can use both 1-hour and 5-minute cache controls in the same request, but with an important constraint: Cache entries with longer TTL must appear before shorter TTLs.

When mixing TTLs, we determine three billing locations in your prompt:
1. Position `A`: The token count at the highest cache hit (or 0 if no hits).
2. Position `B`: The token count at the highest 1-hour `cache_control` block after `A` (or equals `A` if none exist).
3. Position `C`: The token count at the last `cache_control` block.

You'll be charged for:
1. Cache read tokens for `A`.
2. 1-hour cache write tokens for `(B - A)`.
3. 5-minute cache write tokens for `(C - B)`.

---

## FAQ

**Do I need multiple cache breakpoints or is one at the end sufficient?**

In most cases, a single cache breakpoint at the end of your static content is sufficient. The system automatically checks for cache hits at all previous content block boundaries (up to 20 blocks before your breakpoint) and uses the longest matching sequence of cached blocks.

You only need multiple breakpoints if:
- You have more than 20 content blocks before your desired cache point
- You want to cache sections that update at different frequencies independently
- You need explicit control over what gets cached for cost optimization

**Do cache breakpoints add extra cost?**

No, cache breakpoints themselves are free. You only pay for:
- Writing content to cache (25% more than base input tokens for 5-minute TTL)
- Reading from cache (10% of base input token price)
- Regular input tokens for uncached content

**How do I calculate total input tokens from the usage fields?**

```
total_input_tokens = cache_read_input_tokens + cache_creation_input_tokens + input_tokens
```

- `cache_read_input_tokens`: Tokens retrieved from cache (everything before cache breakpoints that was cached)
- `cache_creation_input_tokens`: New tokens being written to cache (at cache breakpoints)
- `input_tokens`: Tokens after the last cache breakpoint that aren't cached

**What is the cache lifetime?**

The cache's default minimum lifetime (TTL) is 5 minutes. This lifetime is refreshed each time the cached content is used. A 1-hour cache TTL is also available at additional cost.

**How many cache breakpoints can I use?**

You can define up to 4 cache breakpoints in your prompt.

**Is prompt caching available for all models?**

No, prompt caching is currently only available for Claude Opus 4.5, Claude Opus 4.1, Claude Opus 4, Claude Sonnet 4.5, Claude Sonnet 4, Claude Sonnet 3.7 (deprecated), Claude Haiku 4.5, Claude Haiku 3.5 (deprecated), and Claude Haiku 3.

**How do I enable prompt caching?**

To enable prompt caching, include at least one `cache_control` breakpoint in your API request.

**Can I use prompt caching with other API features?**

Yes, prompt caching can be used alongside other API features like tool use and vision capabilities. However, changing whether there are images in a prompt or modifying tool use settings will break the cache.

**Can I manually clear the cache?**

Currently, there's no way to manually clear the cache. Cached prefixes automatically expire after a minimum of 5 minutes of inactivity.

**Can I use prompt caching with the Batches API?**

Yes, it is possible to use prompt caching with Batches API requests. However, because asynchronous batch requests can be processed concurrently and in any order, cache hits are provided on a best-effort basis. The 1-hour cache can help improve cache hits in this scenario.

---

# Context editing

Automatically manage conversation context as it grows with context editing.

---

## Overview

Context editing allows you to automatically manage conversation context as it grows, helping you optimize costs and stay within context window limits. You can use server-side API strategies, client-side SDK features, or both together.

| Approach | Where it runs | Strategies | How it works |
|----------|---------------|------------|--------------|
| **Server-side** | API | Tool result clearing (`clear_tool_uses_20250919`)<br/>Thinking block clearing (`clear_thinking_20251015`) | Applied before the prompt reaches Claude. Clears specific content from conversation history. Each strategy can be configured independently. |
| **Client-side** | SDK | Compaction | Available in [Python and TypeScript SDKs](/docs/en/api/client-sdks) when using [`tool_runner`](/docs/en/agents-and-tools/tool-use/implement-tool-use#tool-runner-beta). Generates a summary and replaces full conversation history. See [Compaction](#client-side-compaction-sdk) below. |

## Server-side strategies

Context editing is currently in beta with support for tool result clearing and thinking block clearing. To enable it, use the beta header `context-management-2025-06-27` in your API requests.

### Tool result clearing

The `clear_tool_uses_20250919` strategy clears tool results when conversation context grows beyond your configured threshold. When activated, the API automatically clears the oldest tool results in chronological order, replacing them with placeholder text to let Claude know the tool result was removed. By default, only tool results are cleared. You can optionally clear both tool results and tool calls (the tool use parameters) by setting `clear_tool_inputs` to true.

### Thinking block clearing

The `clear_thinking_20251015` strategy manages `thinking` blocks in conversations when extended thinking is enabled. This strategy automatically clears older thinking blocks from previous turns.

**Default behavior**: When extended thinking is enabled without configuring the `clear_thinking_20251015` strategy, the API automatically keeps only the thinking blocks from the last assistant turn (equivalent to `keep: {type: "thinking_turns", value: 1}`).

To maximize cache hits, preserve all thinking blocks by setting `keep: "all"`.

## Supported models

Context editing is available on:

- Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- Claude Opus 4.1 (`claude-opus-4-1-20250805`)
- Claude Opus 4 (`claude-opus-4-20250514`)
- Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)

## Tool result clearing usage

The simplest way to enable tool result clearing is to specify only the strategy type, as all other configuration options will use their default values:

**Python:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": "Search for recent developments in AI"
        }
    ],
    tools=[
        {
            "type": "web_search_20250305",
            "name": "web_search"
        }
    ],
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {"type": "clear_tool_uses_20250919"}
        ]
    }
)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: "Search for recent developments in AI"
    }
  ],
  tools: [
    {
      type: "web_search_20250305",
      name: "web_search"
    }
  ],
  context_management: {
    edits: [
      { type: "clear_tool_uses_20250919" }
    ]
  },
  betas: ["context-management-2025-06-27"]
});
```

### Advanced configuration

You can customize the tool result clearing behavior with additional parameters:

**Python:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": "Create a simple command line calculator app using Python"
        }
    ],
    tools=[
        {
            "type": "text_editor_20250728",
            "name": "str_replace_based_edit_tool",
            "max_characters": 10000
        },
        {
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 3
        }
    ],
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {
                "type": "clear_tool_uses_20250919",
                # Trigger clearing when threshold is exceeded
                "trigger": {
                    "type": "input_tokens",
                    "value": 30000
                },
                # Number of tool uses to keep after clearing
                "keep": {
                    "type": "tool_uses",
                    "value": 3
                },
                # Optional: Clear at least this many tokens
                "clear_at_least": {
                    "type": "input_tokens",
                    "value": 5000
                },
                # Exclude these tools from being cleared
                "exclude_tools": ["web_search"]
            }
        ]
    }
)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: "Create a simple command line calculator app using Python"
    }
  ],
  tools: [
    {
      type: "text_editor_20250728",
      name: "str_replace_based_edit_tool",
      max_characters: 10000
    },
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 3
    }
  ],
  betas: ["context-management-2025-06-27"],
  context_management: {
    edits: [
      {
        type: "clear_tool_uses_20250919",
        // Trigger clearing when threshold is exceeded
        trigger: {
          type: "input_tokens",
          value: 30000
        },
        // Number of tool uses to keep after clearing
        keep: {
          type: "tool_uses",
          value: 3
        },
        // Optional: Clear at least this many tokens
        clear_at_least: {
          type: "input_tokens",
          value: 5000
        },
        // Exclude these tools from being cleared
        exclude_tools: ["web_search"]
      }
    ]
  }
});
```

## Thinking block clearing usage

Enable thinking block clearing to manage context and prompt caching effectively when extended thinking is enabled:

**Python:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[...],
    thinking={
        "type": "enabled",
        "budget_tokens": 10000
    },
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {
                "type": "clear_thinking_20251015",
                "keep": {
                    "type": "thinking_turns",
                    "value": 2
                }
            }
        ]
    }
)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [...],
  thinking: {
    type: "enabled",
    budget_tokens: 10000
  },
  betas: ["context-management-2025-06-27"],
  context_management: {
    edits: [
      {
        type: "clear_thinking_20251015",
        keep: {
          type: "thinking_turns",
          value: 2
        }
      }
    ]
  }
});
```

### Configuration options for thinking block clearing

| Configuration option | Default | Description |
|---------------------|---------|-------------|
| `keep` | `{type: "thinking_turns", value: 1}` | Defines how many recent assistant turns with thinking blocks to preserve. Use `{type: "thinking_turns", value: N}` where N must be > 0 to keep the last N turns, or `"all"` to keep all thinking blocks. |

### Combining strategies

You can use both thinking block clearing and tool result clearing together. When using multiple strategies, the `clear_thinking_20251015` strategy must be listed first in the `edits` array.

**Python:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[...],
    thinking={
        "type": "enabled",
        "budget_tokens": 10000
    },
    tools=[...],
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {
                "type": "clear_thinking_20251015",
                "keep": {
                    "type": "thinking_turns",
                    "value": 2
                }
            },
            {
                "type": "clear_tool_uses_20250919",
                "trigger": {
                    "type": "input_tokens",
                    "value": 50000
                },
                "keep": {
                    "type": "tool_uses",
                    "value": 5
                }
            }
        ]
    }
)
```

**TypeScript:**
```typescript
const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [...],
  thinking: {
    type: "enabled",
    budget_tokens: 10000
  },
  tools: [...],
  betas: ["context-management-2025-06-27"],
  context_management: {
    edits: [
      {
        type: "clear_thinking_20251015",
        keep: {
          type: "thinking_turns",
          value: 2
        }
      },
      {
        type: "clear_tool_uses_20250919",
        trigger: {
          type: "input_tokens",
          value: 50000
        },
        keep: {
          type: "tool_uses",
          value: 5
        }
      }
    ]
  }
});
```

## Configuration options for tool result clearing

| Configuration option | Default | Description |
|---------------------|---------|-------------|
| `trigger` | 100,000 input tokens | Defines when the context editing strategy activates. Once the prompt exceeds this threshold, clearing will begin. You can specify this value in either `input_tokens` or `tool_uses`. |
| `keep` | 3 tool uses | Defines how many recent tool use/result pairs to keep after clearing occurs. The API removes the oldest tool interactions first, preserving the most recent ones. |
| `clear_at_least` | None | Ensures a minimum number of tokens is cleared each time the strategy activates. If the API can't clear at least the specified amount, the strategy will not be applied. This helps determine if context clearing is worth breaking your prompt cache. |
| `exclude_tools` | None | List of tool names whose tool uses and results should never be cleared. Useful for preserving important context. |
| `clear_tool_inputs` | `false` | Controls whether the tool call parameters are cleared along with the tool results. By default, only the tool results are cleared while keeping Claude's original tool calls visible. |

## Context editing response

You can see which context edits were applied to your request using the `context_management` response field, along with helpful statistics about the content and input tokens cleared.

```json
{
    "id": "msg_013Zva2CMHLNnXjNJJKqJ2EF",
    "type": "message",
    "role": "assistant",
    "content": [...],
    "usage": {...},
    "context_management": {
        "applied_edits": [
            // When using `clear_thinking_20251015`
            {
                "type": "clear_thinking_20251015",
                "cleared_thinking_turns": 3,
                "cleared_input_tokens": 15000
            },
            // When using `clear_tool_uses_20250919`
            {
                "type": "clear_tool_uses_20250919",
                "cleared_tool_uses": 8,
                "cleared_input_tokens": 50000
            }
        ]
    }
}
```

For streaming responses, the context edits will be included in the final `message_delta` event.

## Token counting

The token counting endpoint supports context management, allowing you to preview how many tokens your prompt will use after context editing is applied.

**Python:**
```python
response = client.beta.messages.count_tokens(
    model="claude-sonnet-4-5",
    messages=[
        {
            "role": "user",
            "content": "Continue our conversation..."
        }
    ],
    tools=[...],  # Your tool definitions
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {
                "type": "clear_tool_uses_20250919",
                "trigger": {
                    "type": "input_tokens",
                    "value": 30000
                },
                "keep": {
                    "type": "tool_uses",
                    "value": 5
                }
            }
        ]
    }
)

print(f"Original tokens: {response.context_management['original_input_tokens']}")
print(f"After clearing: {response.input_tokens}")
print(f"Savings: {response.context_management['original_input_tokens'] - response.input_tokens} tokens")
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.beta.messages.countTokens({
  model: "claude-sonnet-4-5",
  messages: [
    {
      role: "user",
      content: "Continue our conversation..."
    }
  ],
  tools: [...],  // Your tool definitions
  betas: ["context-management-2025-06-27"],
  context_management: {
    edits: [
      {
        type: "clear_tool_uses_20250919",
        trigger: {
          type: "input_tokens",
          value: 30000
        },
        keep: {
          type: "tool_uses",
          value: 5
        }
      }
    ]
  }
});

console.log(`Original tokens: ${response.context_management?.original_input_tokens}`);
console.log(`After clearing: ${response.input_tokens}`);
console.log(`Savings: ${(response.context_management?.original_input_tokens || 0) - response.input_tokens} tokens`);
```

The response shows both the final token count after context management is applied (`input_tokens`) and the original token count before any clearing occurred (`original_input_tokens`).

## Using with the Memory Tool

Context editing can be combined with the memory tool. When your conversation context approaches the configured clearing threshold, Claude receives an automatic warning to preserve important information. This enables Claude to save tool results or context to its memory files before they're cleared from the conversation history.

This combination allows you to:

- **Preserve important context**: Claude can write essential information from tool results to memory files before those results are cleared
- **Maintain long-running workflows**: Enable agentic workflows that would otherwise exceed context limits by offloading information to persistent storage
- **Access information on demand**: Claude can look up previously cleared information from memory files when needed, rather than keeping everything in the active context window

To use both features together, enable them in your API request:

**Python:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=4096,
    messages=[...],
    tools=[
        {
            "type": "memory_20250818",
            "name": "memory"
        },
        # Your other tools
    ],
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {"type": "clear_tool_uses_20250919"}
        ]
    }
)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  messages: [...],
  tools: [
    {
      type: "memory_20250818",
      name: "memory"
    },
    // Your other tools
  ],
  betas: ["context-management-2025-06-27"],
  context_management: {
    edits: [
      { type: "clear_tool_uses_20250919" }
    ]
  }
});
```

## Client-side compaction (SDK)

Compaction is an SDK feature available in Python and TypeScript SDKs when using the `tool_runner` method. It automatically manages conversation context by generating summaries when token usage grows too large. Unlike server-side context editing strategies that clear content, compaction instructs Claude to summarize the conversation history, then replaces the full history with that summary. This allows Claude to continue working on long-running tasks that would otherwise exceed the context window.

### How compaction works

When compaction is enabled, the SDK monitors token usage after each model response:

1. **Threshold check**: The SDK calculates total tokens as `input_tokens + cache_creation_input_tokens + cache_read_input_tokens + output_tokens`
2. **Summary generation**: When the threshold is exceeded, a summary prompt is injected as a user turn, and Claude generates a structured summary wrapped in `<summary></summary>` tags
3. **Context replacement**: The SDK extracts the summary and replaces the entire message history with it
4. **Continuation**: The conversation resumes from the summary, with Claude picking up where it left off

### Using compaction

Add `compaction_control` to your `tool_runner` call:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

runner = client.beta.messages.tool_runner(
    model="claude-sonnet-4-5",
    max_tokens=4096,
    tools=[...],
    messages=[
        {
            "role": "user",
            "content": "Analyze all the files in this directory and write a summary report."
        }
    ],
    compaction_control={
        "enabled": True,
        "context_token_threshold": 100000
    }
)

for message in runner:
    print(f"Tokens used: {message.usage.input_tokens}")

final = runner.until_done()
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const runner = client.beta.messages.toolRunner({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    tools: [...],
    messages: [
        {
            role: 'user',
            content: 'Analyze all the files in this directory and write a summary report.'
        }
    ],
    compactionControl: {
        enabled: true,
        contextTokenThreshold: 100000
    }
});

for await (const message of runner) {
    console.log('Tokens used:', message.usage.input_tokens);
}

const finalMessage = await runner.runUntilDone();
```

### Configuration options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | - | Whether to enable automatic compaction |
| `context_token_threshold` | number | No | 100,000 | Token count at which compaction triggers |
| `model` | string | No | Same as main model | Model to use for generating summaries |
| `summary_prompt` | string | No | See below | Custom prompt for summary generation |

### Choosing a token threshold

The threshold determines when compaction occurs. A lower threshold means more frequent compactions with smaller context windows. A higher threshold allows more context but risks hitting limits.

**Python:**
```python
# More frequent compaction for memory-constrained scenarios
compaction_control={
    "enabled": True,
    "context_token_threshold": 50000
}

# Less frequent compaction when you need more context
compaction_control={
    "enabled": True,
    "context_token_threshold": 150000
}
```

**TypeScript:**
```typescript
// More frequent compaction for memory-constrained scenarios
compactionControl: {
    enabled: true,
    contextTokenThreshold: 50000
}

// Less frequent compaction when you need more context
compactionControl: {
    enabled: true,
    contextTokenThreshold: 150000
}
```

### Using a different model for summaries

You can use a faster or cheaper model for generating summaries:

**Python:**
```python
compaction_control={
    "enabled": True,
    "context_token_threshold": 100000,
    "model": "claude-haiku-4-5"
}
```

**TypeScript:**
```typescript
compactionControl: {
    enabled: true,
    contextTokenThreshold: 100000,
    model: 'claude-haiku-4-5'
}
```

### Custom summary prompts

You can provide a custom prompt for domain-specific needs. Your prompt should instruct Claude to wrap its summary in `<summary></summary>` tags.

**Python:**
```python
compaction_control={
    "enabled": True,
    "context_token_threshold": 100000,
    "summary_prompt": """Summarize the research conducted so far, including:
- Sources consulted and key findings
- Questions answered and remaining unknowns
- Recommended next steps

Wrap your summary in <summary></summary> tags."""
}
```

**TypeScript:**
```typescript
compactionControl: {
    enabled: true,
    contextTokenThreshold: 100000,
    summaryPrompt: `Summarize the research conducted so far, including:
- Sources consulted and key findings
- Questions answered and remaining unknowns
- Recommended next steps

Wrap your summary in <summary></summary> tags.`
}
```

### Limitations

When using server-side tools such as web search or web fetch, the SDK may incorrectly calculate token usage, causing compaction to trigger at the wrong time.

For example, after a web search operation, the API response might show `cache_read_input_tokens` includes accumulated reads from multiple internal API calls made by the server-side tool, not your actual conversation context.

**Workarounds:**
- Use the token counting endpoint to get accurate context length
- Avoid compaction when using server-side tools extensively

When compaction is triggered while a tool use response is pending, the SDK removes the tool use block from the message history before generating the summary. Claude will re-issue the tool call after resuming from the summary if still needed.

### When to use compaction

**Good use cases:**
- Long-running agent tasks that process many files or data sources
- Research workflows that accumulate large amounts of information
- Multi-step tasks with clear, measurable progress
- Tasks that produce artifacts (files, reports) that persist outside the conversation

**Less ideal use cases:**
- Tasks requiring precise recall of early conversation details
- Workflows using server-side tools extensively
- Tasks that need to maintain exact state across many variables

---

# Building with extended thinking

Extended thinking gives Claude enhanced reasoning capabilities for complex tasks, while providing varying levels of transparency into its step-by-step thought process before it delivers its final answer.

## Supported models

Extended thinking is supported in the following models:

- Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- Claude Opus 4.1 (`claude-opus-4-1-20250805`)
- Claude Opus 4 (`claude-opus-4-20250514`)

## How extended thinking works

When extended thinking is turned on, Claude creates `thinking` content blocks where it outputs its internal reasoning. Claude incorporates insights from this reasoning before crafting a final response.

The API response will include `thinking` content blocks, followed by `text` content blocks.

Here's an example of the default response format:

```json
{
  "content": [
    {
      "type": "thinking",
      "thinking": "Let me analyze this step by step...",
      "signature": "WaUjzkypQ2mUEVM36O2TxuC06KN8xyfbJwyem2dw3URve/op91XWHOEBLLqIOMfFG/UvLEczmEsUjavL...."
    },
    {
      "type": "text",
      "text": "Based on my analysis..."
    }
  ]
}
```

## How to use extended thinking

Here is an example of using extended thinking in the Messages API:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000
    },
    messages=[{
        "role": "user",
        "content": "Are there an infinite number of prime numbers such that n mod 4 == 3?"
    }]
)

# The response will contain summarized thinking blocks and text blocks
for block in response.content:
    if block.type == "thinking":
        print(f"\nThinking summary: {block.thinking}")
    elif block.type == "text":
        print(f"\nResponse: {block.text}")
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 16000,
  thinking: {
    type: "enabled",
    budget_tokens: 10000
  },
  messages: [{
    role: "user",
    content: "Are there an infinite number of prime numbers such that n mod 4 == 3?"
  }]
});

// The response will contain summarized thinking blocks and text blocks
for (const block of response.content) {
  if (block.type === "thinking") {
    console.log(`\nThinking summary: ${block.thinking}`);
  } else if (block.type === "text") {
    console.log(`\nResponse: ${block.text}`);
  }
}
```

To turn on extended thinking, add a `thinking` object, with the `type` parameter set to `enabled` and the `budget_tokens` to a specified token budget for extended thinking.

The `budget_tokens` parameter determines the maximum number of tokens Claude is allowed to use for its internal reasoning process. Larger budgets can improve response quality by enabling more thorough analysis for complex problems.

`budget_tokens` must be set to a value less than `max_tokens`. However, when using interleaved thinking with tools, you can exceed this limit as the token limit becomes your entire context window.

### Summarized thinking

With extended thinking enabled, the Messages API for Claude 4 models returns a summary of Claude's full thinking process. Summarized thinking provides the full intelligence benefits of extended thinking, while preventing misuse.

Here are some important considerations for summarized thinking:

- You're charged for the full thinking tokens generated by the original request, not the summary tokens.
- The billed output token count will **not match** the count of tokens you see in the response.
- The first few lines of thinking output are more verbose, providing detailed reasoning that's particularly helpful for prompt engineering purposes.
- Summarization preserves the key ideas of Claude's thinking process with minimal added latency.

## Streaming thinking

You can stream extended thinking responses using server-sent events (SSE).

When streaming is enabled for extended thinking, you receive thinking content via `thinking_delta` events.

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[{"role": "user", "content": "What is 27 * 453?"}],
) as stream:
    thinking_started = False
    response_started = False

    for event in stream:
        if event.type == "content_block_start":
            print(f"\nStarting {event.content_block.type} block...")
            thinking_started = False
            response_started = False
        elif event.type == "content_block_delta":
            if event.delta.type == "thinking_delta":
                if not thinking_started:
                    print("Thinking: ", end="", flush=True)
                    thinking_started = True
                print(event.delta.thinking, end="", flush=True)
            elif event.delta.type == "text_delta":
                if not response_started:
                    print("Response: ", end="", flush=True)
                    response_started = True
                print(event.delta.text, end="", flush=True)
        elif event.type == "content_block_stop":
            print("\nBlock complete.")
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const stream = await client.messages.stream({
  model: "claude-sonnet-4-5",
  max_tokens: 16000,
  thinking: {
    type: "enabled",
    budget_tokens: 10000
  },
  messages: [{
    role: "user",
    content: "What is 27 * 453?"
  }]
});

let thinkingStarted = false;
let responseStarted = false;

for await (const event of stream) {
  if (event.type === 'content_block_start') {
    console.log(`\nStarting ${event.content_block.type} block...`);
    thinkingStarted = false;
    responseStarted = false;
  } else if (event.type === 'content_block_delta') {
    if (event.delta.type === 'thinking_delta') {
      if (!thinkingStarted) {
        process.stdout.write('Thinking: ');
        thinkingStarted = true;
      }
      process.stdout.write(event.delta.thinking);
    } else if (event.delta.type === 'text_delta') {
      if (!responseStarted) {
        process.stdout.write('Response: ');
        responseStarted = true;
      }
      process.stdout.write(event.delta.text);
    }
  } else if (event.type === 'content_block_stop') {
    console.log('\nBlock complete.');
  }
}
```

## Extended thinking with tool use

Extended thinking can be used alongside tool use, allowing Claude to reason through tool selection and results processing.

When using extended thinking with tool use, be aware of the following limitations:

1. **Tool choice limitation**: Tool use with thinking only supports `tool_choice: {"type": "auto"}` (the default) or `tool_choice: {"type": "none"}`. Using `tool_choice: {"type": "any"}` or `tool_choice: {"type": "tool", "name": "..."}` will result in an error.

2. **Preserving thinking blocks**: During tool use, you must pass `thinking` blocks back to the API for the last assistant message. Include the complete unmodified block back to the API to maintain reasoning continuity.

### Toggling thinking modes in conversations

You cannot toggle thinking in the middle of an assistant turn, including during tool use loops. The entire assistant turn must operate in a single thinking mode.

### Interleaved thinking

Extended thinking with tool use in Claude 4 models supports interleaved thinking, which enables Claude to think between tool calls and make more sophisticated reasoning after receiving tool results.

With interleaved thinking, Claude can:
- Reason about the results of a tool call before deciding what to do next
- Chain multiple tool calls with reasoning steps in between
- Make more nuanced decisions based on intermediate results

To enable interleaved thinking, add the beta header `interleaved-thinking-2025-05-14` to your API request.

Important considerations for interleaved thinking:
- The `budget_tokens` can exceed the `max_tokens` parameter, as it represents the total budget across all thinking blocks within one assistant turn.
- Interleaved thinking is only supported for tools used via the Messages API.
- Interleaved thinking is supported for Claude 4 models only, with the beta header `interleaved-thinking-2025-05-14`.

## Extended thinking with prompt caching

Prompt caching with thinking has several important considerations:

**Thinking block context removal**
- Thinking blocks from previous turns are removed from context, which can affect cache breakpoints
- When continuing conversations with tool use, thinking blocks are cached and count as input tokens when read from cache
- If thinking becomes disabled, requests will fail if you pass thinking content in the current tool use turn

**Cache invalidation patterns**
- Changes to thinking parameters (enabled/disabled or budget allocation) invalidate message cache breakpoints
- Interleaved thinking amplifies cache invalidation, as thinking blocks can occur between multiple tool calls
- System prompts and tools remain cached despite thinking parameter changes

### Understanding thinking block caching behavior

When using extended thinking with tool use, thinking blocks exhibit specific caching behavior that affects token counting:

**How it works:**

1. Caching only occurs when you make a subsequent request that includes tool results
2. When the subsequent request is made, the previous conversation history (including thinking blocks) can be cached
3. These cached thinking blocks count as input tokens in your usage metrics when read from the cache
4. When a non-tool-result user block is included, all previous thinking blocks are ignored and stripped from context

## Max tokens and context window size with extended thinking

With Claude 3.7 and 4 models, `max_tokens` (which includes your thinking budget when thinking is enabled) is enforced as a strict limit. The system will return a validation error if prompt tokens + `max_tokens` exceeds the context window size.

### The context window with extended thinking

When calculating context window usage with thinking enabled:

- Thinking blocks from previous turns are stripped and not counted towards your context window
- Current turn thinking counts towards your `max_tokens` limit for that turn

The effective context window is calculated as:

```
context window =
  (current input tokens - previous thinking tokens) +
  (thinking tokens + encrypted thinking tokens + text output tokens)
```

### The context window with extended thinking and tool use

When using extended thinking with tool use, thinking blocks must be explicitly preserved and returned with the tool results.

The effective context window calculation for extended thinking with tool use becomes:

```
context window =
  (current input tokens + previous thinking tokens + tool use tokens) +
  (thinking tokens + encrypted thinking tokens + text output tokens)
```

## Thinking encryption and redaction

Full thinking content is encrypted and returned in the `signature` field. This field is used to verify that thinking blocks were generated by Claude when passed back to the API.

Occasionally Claude's internal reasoning will be flagged by our safety systems. When this occurs, we encrypt some or all of the `thinking` block and return it to you as a `redacted_thinking` block. `redacted_thinking` blocks are decrypted when passed back to the API, allowing Claude to continue its response without losing context.

When building customer-facing applications that use extended thinking:

- Be aware that redacted thinking blocks contain encrypted content that isn't human-readable
- Consider providing a simple explanation like: "Some of Claude's internal reasoning has been automatically encrypted for safety reasons."
- If showing thinking blocks to users, you can filter out redacted blocks while preserving normal thinking blocks
- Be transparent that using extended thinking features may occasionally result in some reasoning being encrypted
- Implement appropriate error handling to gracefully manage redacted thinking without breaking your UI

## Differences in thinking across model versions

The Messages API handles thinking differently across Claude Sonnet 3.7 and Claude 4 models:

| Feature | Claude Sonnet 3.7 | Claude 4 Models | Claude Opus 4.5+ |
|---------|------------------|-----------------|------------------|
| **Thinking Output** | Returns full thinking output | Returns summarized thinking | Returns summarized thinking |
| **Interleaved Thinking** | Not supported | Supported with beta header | Supported with beta header |
| **Thinking Block Preservation** | Not preserved across turns | Not preserved across turns | **Preserved by default** |

### Thinking block preservation in Claude Opus 4.5

Claude Opus 4.5 introduces a new default behavior: **thinking blocks from previous assistant turns are preserved in model context by default**. This differs from earlier models, which remove thinking blocks from prior turns.

**Benefits of thinking block preservation:**

- **Cache optimization**: When using tool use, preserved thinking blocks enable cache hits as they are passed back with tool results
- **No intelligence impact**: Preserving thinking blocks has no negative effect on model performance

## Best practices for extended thinking

### Working with thinking budgets

- **Budget optimization**: Start at the minimum (1,024 tokens) and increase incrementally to find optimal range for your use case.
- **Starting points**: For complex tasks, start with 16k+ token budgets and adjust based on needs.
- **Large budgets**: For thinking budgets above 32k, use batch processing to avoid networking issues.
- **Token usage tracking**: Monitor thinking token usage to optimize costs and performance.

### Performance considerations

- **Response times**: Be prepared for potentially longer response times due to additional processing required.
- **Streaming requirements**: Streaming is required when `max_tokens` is greater than 21,333.

### Feature compatibility

- Thinking isn't compatible with `temperature` or `top_k` modifications or forced tool use.
- When thinking is enabled, you can set `top_p` to values between 1 and 0.95.
- You cannot pre-fill responses when thinking is enabled.
- Changes to the thinking budget invalidate cached prompt prefixes that include messages.

### Usage guidelines

- **Task selection**: Use extended thinking for complex tasks that benefit from step-by-step reasoning like math, coding, and analysis.
- **Context handling**: The Claude API automatically ignores thinking blocks from previous turns.
- **Prompt engineering**: Review extended thinking prompting tips to maximize Claude's thinking capabilities.

---

# Effort

Control how many tokens Claude uses when responding with the effort parameter, trading off between response thoroughness and token efficiency.

## Overview

The effort parameter allows you to control how eager Claude is about spending tokens when responding to requests. This gives you the ability to trade off between response thoroughness and token efficiency, all with a single model.

The effort parameter is currently in beta and only supported by Claude Opus 4.5. You must include the beta header `effort-2025-11-24` when using this feature.

## How effort works

By default, Claude uses maximum effort—spending as many tokens as needed for the best possible outcome. By lowering the effort level, you can instruct Claude to be more conservative with token usage, optimizing for speed and cost while accepting some reduction in capability.

Setting `effort` to `"high"` produces exactly the same behavior as omitting the `effort` parameter entirely.

The effort parameter affects **all tokens** in the response, including:

- Text responses and explanations
- Tool calls and function arguments
- Extended thinking (when enabled)

This approach has two major advantages:

1. It doesn't require thinking to be enabled in order to use it.
2. It can affect all token spend including tool calls. For example, lower effort would mean Claude makes fewer tool calls.

### Effort levels

| Level    | Description                                                                                                                      | Typical use case                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `high`   | Maximum capability. Claude uses as many tokens as needed for the best possible outcome. Equivalent to not setting the parameter.  | Complex reasoning, difficult coding problems, agentic tasks                           |
| `medium` | Balanced approach with moderate token savings. | Agentic tasks that require a balance of speed, cost, and performance                                                         |
| `low`    | Most efficient. Significant token savings with some capability reduction. | Simpler tasks that need the best speed and lowest costs, such as subagents                     |

## Basic usage

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-opus-4-5-20251101",
    betas=["effort-2025-11-24"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Analyze the trade-offs between microservices and monolithic architectures"
    }],
    output_config={
        "effort": "medium"
    }
)

print(response.content[0].text)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.beta.messages.create({
  model: "claude-opus-4-5-20251101",
  betas: ["effort-2025-11-24"],
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: "Analyze the trade-offs between microservices and monolithic architectures"
  }],
  output_config: {
    effort: "medium"
  }
});

console.log(response.content[0].text);
```

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "anthropic-version: 2023-06-01" \
    --header "anthropic-beta: effort-2025-11-24" \
    --header "content-type: application/json" \
    --data '{
        "model": "claude-opus-4-5-20251101",
        "max_tokens": 4096,
        "messages": [{
            "role": "user",
            "content": "Analyze the trade-offs between microservices and monolithic architectures"
        }],
        "output_config": {
            "effort": "medium"
        }
    }'
```

## When to adjust the effort parameter

- Use **high effort** (the default) when you need Claude's best work—complex reasoning, nuanced analysis, difficult coding problems, or any task where quality is the top priority.
- Use **medium effort** as a balanced option when you want solid performance without the full token expenditure of high effort.
- Use **low effort** when you're optimizing for speed (because Claude answers with fewer tokens) or cost—for example, simple classification tasks, quick lookups, or high-volume use cases where marginal quality improvements don't justify additional latency or spend.

## Effort with tool use

When using tools, the effort parameter affects both the explanations around tool calls and the tool calls themselves. Lower effort levels tend to:

- Combine multiple operations into fewer tool calls
- Make fewer tool calls
- Proceed directly to action without preamble
- Use terse confirmation messages after completion

Higher effort levels may:

- Make more tool calls
- Explain the plan before taking action
- Provide detailed summaries of changes
- Include more comprehensive code comments

## Effort with extended thinking

The effort parameter works alongside the thinking token budget when extended thinking is enabled. These two controls serve different purposes:

- **Effort parameter**: Controls how Claude spends all tokens—including thinking tokens, text responses, and tool calls
- **Thinking token budget**: Sets a maximum limit on thinking tokens specifically

The effort parameter can be used with or without extended thinking enabled. When both are configured:

1. First determine the effort level appropriate for your task
2. Then set the thinking token budget based on task complexity

For best performance on complex reasoning tasks, use high effort (the default) with a high thinking token budget. This allows Claude to think thoroughly and provide comprehensive responses.

## Best practices

1. **Start with high**: Use lower effort levels to trade off performance for token efficiency.
2. **Use low for speed-sensitive or simple tasks**: When latency matters or tasks are straightforward, low effort can significantly reduce response times and costs.
3. **Test your use case**: The impact of effort levels varies by task type. Evaluate performance on your specific use cases before deploying.
4. **Consider dynamic effort**: Adjust effort based on task complexity. Simple queries may warrant low effort while agentic coding and complex reasoning benefit from high effort.

---

# Streaming Messages

When creating a Message, you can set `"stream": true` to incrementally stream the response using server-sent events (SSE).

## Streaming with SDKs

The Python and TypeScript SDKs offer multiple ways of streaming. The Python SDK allows both sync and async streams.

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
    model="claude-sonnet-4-5",
) as stream:
  for text in stream.text_stream:
      print(text, end="", flush=True)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

await client.messages.stream({
    messages: [{role: 'user', content: "Hello"}],
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
}).on('text', (text) => {
    console.log(text);
});
```

## Event types

Each server-sent event includes a named event type and associated JSON data. Each event will use an SSE event name (e.g. `event: message_stop`), and include the matching event `type` in its data.

Each stream uses the following event flow:

1. `message_start`: contains a Message object with empty `content`.
2. A series of content blocks, each of which have a `content_block_start`, one or more `content_block_delta` events, and a `content_block_stop` event.
3. One or more `message_delta` events, indicating top-level changes to the final Message object.
4. A final `message_stop` event.

The token counts shown in the `usage` field of the `message_delta` event are **cumulative**.

### Ping events

Event streams may also include any number of `ping` events.

### Error events

Errors may occasionally be sent in the event stream. For example, during periods of high usage, you may receive an `overloaded_error`:

```json
event: error
data: {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}
```

## Content block delta types

Each `content_block_delta` event contains a `delta` that updates the `content` block at a given `index`.

### Text delta

A `text` content block delta looks like:

```json
event: content_block_delta
data: {"type": "content_block_delta","index": 0,"delta": {"type": "text_delta", "text": "ello frien"}}
```

### Input JSON delta

The deltas for `tool_use` content blocks correspond to updates for the `input` field. The deltas are **partial JSON strings**, whereas the final `tool_use.input` is always an **object**.

You can accumulate the string deltas and parse the JSON once you receive a `content_block_stop` event.

A `tool_use` content block delta looks like:

```json
event: content_block_delta
data: {"type": "content_block_delta","index": 1,"delta": {"type": "input_json_delta","partial_json": "{\"location\": \"San Fra"}}
```

### Thinking delta

When using extended thinking with streaming enabled, you'll receive thinking content via `thinking_delta` events. These deltas correspond to the `thinking` field of the `thinking` content blocks.

For thinking content, a special `signature_delta` event is sent just before the `content_block_stop` event.

A typical thinking delta looks like:

```json
event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "Let me solve this step by step:\n\n1. First break down 27 * 453"}}
```

## Basic streaming request

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --data \
'{
  "model": "claude-sonnet-4-5",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 256,
  "stream": true
}'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=256,
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

### Response example

```json
event: message_start
data: {"type": "message_start", "message": {"id": "msg_1nZdL29xx5MUA1yADyHTEsnR8uuvGzszyY", "type": "message", "role": "assistant", "content": [], "model": "claude-sonnet-4-5-20250929", "stop_reason": null, "stop_sequence": null, "usage": {"input_tokens": 25, "output_tokens": 1}}}

event: content_block_start
data: {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}

event: ping
data: {"type": "ping"}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "!"}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 0}

event: message_delta
data: {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence":null}, "usage": {"output_tokens": 15}}

event: message_stop
data: {"type": "message_stop"}
```

## Streaming with tool use

In this request, Claude uses a tool to provide information:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA"
                }
            },
            "required": ["location"]
        }
    }
]

with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "any"},
    messages=[
        {
            "role": "user",
            "content": "What is the weather like in San Francisco?"
        }
    ],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

The streaming response includes both text and tool_use content blocks:

```json
event: message_start
data: {"type":"message_start","message":{"id":"msg_014p7gG3wDgGV9EUtLvnow3U","type":"message","role":"assistant","model":"claude-sonnet-4-5-20250929","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Let me check the weather for San Francisco:"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_01T1x1fJ34qAmk2tNTrN7Up6","name":"get_weather","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"location\": \"San Francisco, CA\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}

event: message_stop
data: {"type":"message_stop"}
```

## Streaming with extended thinking

When extended thinking is enabled, you'll receive thinking blocks streamed as separate content:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=20000,
    thinking={
        "type": "enabled",
        "budget_tokens": 16000
    },
    messages=[
        {
            "role": "user",
            "content": "What is 27 * 453?"
        }
    ],
) as stream:
    for event in stream:
        if event.type == "content_block_delta":
            if event.delta.type == "thinking_delta":
                print(event.delta.thinking, end="", flush=True)
            elif event.delta.type == "text_delta":
                print(event.delta.text, end="", flush=True)
```

### Response example

```json
event: message_start
data: {"type": "message_start", "message": {"id": "msg_01...", "type": "message", "role": "assistant", "content": []}}

event: content_block_start
data: {"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": ""}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "Let me solve this step by step:\n\n1. First break down 27 * 453"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "\n2. 453 = 400 + 50 + 3"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "\n3. 27 * 400 = 10,800"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "EqQBCgIYAhIM1gbcDa9GJwZA2b3hGgxBdjrkzLoky3dl1pkiMOYds..."}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 0}

event: content_block_start
data: {"type": "content_block_start", "index": 1, "content_block": {"type": "text", "text": ""}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "27 * 453 = 12,231"}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 1}

event: message_delta
data: {"type": "message_delta", "delta": {"stop_reason": "end_turn"}}

event: message_stop
data: {"type": "message_stop"}
```

## Error recovery

When a streaming request is interrupted due to network issues, timeouts, or other errors, you can recover by resuming from where the stream was interrupted.

The basic recovery strategy involves:

1. **Capture the partial response**: Save all content that was successfully received before the error occurred
2. **Construct a continuation request**: Create a new API request that includes the partial assistant response as the beginning of a new assistant message
3. **Resume streaming**: Continue receiving the rest of the response from where it was interrupted

### Error recovery best practices

1. **Use SDK features**: Leverage the SDK's built-in message accumulation and error handling capabilities
2. **Handle content types**: Be aware that messages can contain multiple content blocks (`text`, `tool_use`, `thinking`). Tool use and extended thinking blocks cannot be partially recovered. You can resume streaming from the most recent text block.

---

# Batch processing

Batch processing is a powerful approach for handling large volumes of requests efficiently. Instead of processing requests one at a time with immediate responses, batch processing allows you to submit multiple requests together for asynchronous processing. This pattern is particularly useful when:

- You need to process large volumes of data
- Immediate responses are not required
- You want to optimize for cost efficiency
- You're running large-scale evaluations or analyses

The Message Batches API is our first implementation of this pattern.

---

# Message Batches API

The Message Batches API is a powerful, cost-effective way to asynchronously process large volumes of [Messages](/docs/en/api/messages) requests. This approach is well-suited to tasks that do not require immediate responses, with most batches finishing in less than 1 hour while reducing costs by 50% and increasing throughput.

## How the Message Batches API works

When you send a request to the Message Batches API:

1. The system creates a new Message Batch with the provided Messages requests.
2. The batch is then processed asynchronously, with each request handled independently.
3. You can poll for the status of the batch and retrieve results when processing has ended for all requests.

This is especially useful for bulk operations that don't require immediate results, such as:
- Large-scale evaluations: Process thousands of test cases efficiently.
- Content moderation: Analyze large volumes of user-generated content asynchronously.
- Data analysis: Generate insights or summaries for large datasets.
- Bulk content generation: Create large amounts of text for various purposes (e.g., product descriptions, article summaries).

### Batch limitations
- A Message Batch is limited to either 100,000 Message requests or 256 MB in size, whichever is reached first.
- We process each batch as fast as possible, with most batches completing within 1 hour. You will be able to access batch results when all messages have completed or after 24 hours, whichever comes first. Batches will expire if processing does not complete within 24 hours.
- Batch results are available for 29 days after creation. After that, you may still view the Batch, but its results will no longer be available for download.
- Batches are scoped to a [Workspace](/settings/workspaces). You may view all batches—and their results—that were created within the Workspace that your API key belongs to.
- Rate limits apply to both Batches API HTTP requests and the number of requests within a batch waiting to be processed. See [Message Batches API rate limits](/docs/en/api/rate-limits#message-batches-api). Additionally, we may slow down processing based on current demand and your request volume. In that case, you may see more requests expiring after 24 hours.
- Due to high throughput and concurrent processing, batches may go slightly over your Workspace's configured [spend limit](/settings/limits).

### Supported models

All [active models](/docs/en/about-claude/models/overview) support the Message Batches API.

### What can be batched
Any request that you can make to the Messages API can be included in a batch. This includes:

- Vision
- Tool use
- System messages
- Multi-turn conversations
- Any beta features

Since each request in the batch is processed independently, you can mix different types of requests within a single batch.

---
## Pricing

The Batches API offers significant cost savings. All usage is charged at 50% of the standard API prices.

| Model             | Batch input      | Batch output    |
|-------------------|------------------|-----------------|
| Claude Opus 4.5     | $2.50 / MTok     | $12.50 / MTok   |
| Claude Opus 4.1     | $7.50 / MTok     | $37.50 / MTok   |
| Claude Opus 4     | $7.50 / MTok     | $37.50 / MTok   |
| Claude Sonnet 4.5   | $1.50 / MTok     | $7.50 / MTok    |
| Claude Sonnet 4   | $1.50 / MTok     | $7.50 / MTok    |
| Claude Sonnet 3.7 (deprecated) | $1.50 / MTok     | $7.50 / MTok    |
| Claude Haiku 4.5  | $0.50 / MTok     | $2.50 / MTok    |
| Claude Haiku 3.5  | $0.40 / MTok     | $2 / MTok       |
| Claude Opus 3 (deprecated)  | $7.50 / MTok     | $37.50 / MTok   |
| Claude Haiku 3    | $0.125 / MTok    | $0.625 / MTok   |

---
## How to use the Message Batches API

### Prepare and create your batch

A Message Batch is composed of a list of requests to create a Message. The shape of an individual request is comprised of:
- A unique `custom_id` for identifying the Messages request
- A `params` object with the standard [Messages API](/docs/en/api/messages) parameters

You can [create a batch](/docs/en/api/creating-message-batches) by passing this list into the `requests` parameter:

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages/batches \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "requests": [
        {
            "custom_id": "my-first-request",
            "params": {
                "model": "claude-sonnet-4-5",
                "max_tokens": 1024,
                "messages": [
                    {"role": "user", "content": "Hello, world"}
                ]
            }
        },
        {
            "custom_id": "my-second-request",
            "params": {
                "model": "claude-sonnet-4-5",
                "max_tokens": 1024,
                "messages": [
                    {"role": "user", "content": "Hi again, friend"}
                ]
            }
        }
    ]
}'
```

**Python:**
```python
import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

client = anthropic.Anthropic()

message_batch = client.messages.batches.create(
    requests=[
        Request(
            custom_id="my-first-request",
            params=MessageCreateParamsNonStreaming(
                model="claude-sonnet-4-5",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": "Hello, world",
                }]
            )
        ),
        Request(
            custom_id="my-second-request",
            params=MessageCreateParamsNonStreaming(
                model="claude-sonnet-4-5",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": "Hi again, friend",
                }]
            )
        )
    ]
)

print(message_batch)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const messageBatch = await anthropic.messages.batches.create({
  requests: [{
    custom_id: "my-first-request",
    params: {
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {"role": "user", "content": "Hello, world"}
      ]
    }
  }, {
    custom_id: "my-second-request",
    params: {
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {"role": "user", "content": "Hi again, friend"}
      ]
    }
  }]
});

console.log(messageBatch)
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.batches.*;

public class BatchExample {
    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        BatchCreateParams params = BatchCreateParams.builder()
            .addRequest(BatchCreateParams.Request.builder()
                .customId("my-first-request")
                .params(BatchCreateParams.Request.Params.builder()
                    .model(Model.CLAUDE_OPUS_4_0)
                    .maxTokens(1024)
                    .addUserMessage("Hello, world")
                    .build())
                .build())
            .addRequest(BatchCreateParams.Request.builder()
                .customId("my-second-request")
                .params(BatchCreateParams.Request.Params.builder()
                    .model(Model.CLAUDE_OPUS_4_0)
                    .maxTokens(1024)
                    .addUserMessage("Hi again, friend")
                    .build())
                .build())
            .build();

        MessageBatch messageBatch = client.messages().batches().create(params);

        System.out.println(messageBatch);
    }
}
```

In this example, two separate requests are batched together for asynchronous processing. Each request has a unique `custom_id` and contains the standard parameters you'd use for a Messages API call.

When a batch is first created, the response will have a processing status of `in_progress`.

```json
{
  "id": "msgbatch_01HkcTjaV5uDC8jWR4ZsDV8d",
  "type": "message_batch",
  "processing_status": "in_progress",
  "request_counts": {
    "processing": 2,
    "succeeded": 0,
    "errored": 0,
    "canceled": 0,
    "expired": 0
  },
  "ended_at": null,
  "created_at": "2024-09-24T18:37:24.100435Z",
  "expires_at": "2024-09-25T18:37:24.100435Z",
  "cancel_initiated_at": null,
  "results_url": null
}
```

### Tracking your batch

The Message Batch's `processing_status` field indicates the stage of processing the batch is in. It starts as `in_progress`, then updates to `ended` once all the requests in the batch have finished processing, and results are ready. You can monitor the state of your batch by visiting the [Console](/settings/workspaces/default/batches), or using the [retrieval endpoint](/docs/en/api/retrieving-message-batches).

#### Polling for Message Batch completion

To poll a Message Batch, you'll need its `id`, which is provided in the response when creating a batch or by listing batches. You can implement a polling loop that checks the batch status periodically until processing has ended:

**Python:**
```python
import anthropic
import time

client = anthropic.Anthropic()

message_batch = None
while True:
    message_batch = client.messages.batches.retrieve(
        MESSAGE_BATCH_ID
    )
    if message_batch.processing_status == "ended":
        break

    print(f"Batch {MESSAGE_BATCH_ID} is still processing...")
    time.sleep(60)
print(message_batch)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

let messageBatch;
while (true) {
  messageBatch = await anthropic.messages.batches.retrieve(
    MESSAGE_BATCH_ID
  );
  if (messageBatch.processing_status === 'ended') {
    break;
  }

  console.log(`Batch ${messageBatch} is still processing... waiting`);
  await new Promise(resolve => setTimeout(resolve, 60_000));
}
console.log(messageBatch);
```

**Shell:**
```bash
#!/bin/sh

until [[ $(curl -s "https://api.anthropic.com/v1/messages/batches/$MESSAGE_BATCH_ID" \
          --header "x-api-key: $ANTHROPIC_API_KEY" \
          --header "anthropic-version: 2023-06-01" \
          | grep -o '"processing_status":[[:space:]]*"[^"]*"' \
          | cut -d'"' -f4) == "ended" ]]; do
    echo "Batch $MESSAGE_BATCH_ID is still processing..."
    sleep 60
done

echo "Batch $MESSAGE_BATCH_ID has finished processing"
```

### Listing all Message Batches

You can list all Message Batches in your Workspace using the [list endpoint](/docs/en/api/listing-message-batches). The API supports pagination, automatically fetching additional pages as needed:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

# Automatically fetches more pages as needed.
for message_batch in client.messages.batches.list(
    limit=20
):
    print(message_batch)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Automatically fetches more pages as needed.
for await (const messageBatch of anthropic.messages.batches.list({
  limit: 20
})) {
  console.log(messageBatch);
}
```

**Shell:**
```bash
#!/bin/sh

if ! command -v jq &> /dev/null; then
    echo "Error: This script requires jq. Please install it first."
    exit 1
fi

BASE_URL="https://api.anthropic.com/v1/messages/batches"

has_more=true
after_id=""

while [ "$has_more" = true ]; do
    # Construct URL with after_id if it exists
    if [ -n "$after_id" ]; then
        url="${BASE_URL}?limit=20&after_id=${after_id}"
    else
        url="$BASE_URL?limit=20"
    fi

    response=$(curl -s "$url" \
              --header "x-api-key: $ANTHROPIC_API_KEY" \
              --header "anthropic-version: 2023-06-01")

    # Extract values using jq
    has_more=$(echo "$response" | jq -r '.has_more')
    after_id=$(echo "$response" | jq -r '.last_id')

    # Process and print each entry in the data array
    echo "$response" | jq -c '.data[]' | while read -r entry; do
        echo "$entry" | jq '.'
    done
done
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.batches.*;

public class BatchListExample {
    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        // Automatically fetches more pages as needed
        for (MessageBatch messageBatch : client.messages().batches().list(
                BatchListParams.builder()
                        .limit(20)
                        .build()
        )) {
            System.out.println(messageBatch);
        }
    }
}
```

### Retrieving batch results

Once batch processing has ended, each Messages request in the batch will have a result. There are 4 result types:

| Result Type | Description |
|-------------|-------------|
| `succeeded` | Request was successful. Includes the message result. |
| `errored`   | Request encountered an error and a message was not created. Possible errors include invalid requests and internal server errors. You will not be billed for these requests. |
| `canceled`  | User canceled the batch before this request could be sent to the model. You will not be billed for these requests. |
| `expired`   | Batch reached its 24 hour expiration before this request could be sent to the model. You will not be billed for these requests. |

You will see an overview of your results with the batch's `request_counts`, which shows how many requests reached each of these four states.

Results of the batch are available for download at the `results_url` property on the Message Batch, and if the organization permission allows, in the Console. Because of the potentially large size of the results, it's recommended to [stream results](/docs/en/api/retrieving-message-batch-results) back rather than download them all at once.

**Shell:**
```bash
#!/bin/sh
curl "https://api.anthropic.com/v1/messages/batches/msgbatch_01HkcTjaV5uDC8jWR4ZsDV8d" \
  --header "anthropic-version: 2023-06-01" \
  --header "x-api-key: $ANTHROPIC_API_KEY" \
  | grep -o '"results_url":[[:space:]]*"[^"]*"' \
  | cut -d'"' -f4 \
  | while read -r url; do
    curl -s "$url" \
      --header "anthropic-version: 2023-06-01" \
      --header "x-api-key: $ANTHROPIC_API_KEY" \
      | sed 's/}{/}\n{/g' \
      | while IFS= read -r line
    do
      result_type=$(echo "$line" | sed -n 's/.*"result":[[:space:]]*{[[:space:]]*"type":[[:space:]]*"\([^"]*\)".*/\1/p')
      custom_id=$(echo "$line" | sed -n 's/.*"custom_id":[[:space:]]*"\([^"]*\)".*/\1/p')
      error_type=$(echo "$line" | sed -n 's/.*"error":[[:space:]]*{[[:space:]]*"type":[[:space:]]*"\([^"]*\)".*/\1/p')

      case "$result_type" in
        "succeeded")
          echo "Success! $custom_id"
          ;;
        "errored")
          if [ "$error_type" = "invalid_request" ]; then
            # Request body must be fixed before re-sending request
            echo "Validation error: $custom_id"
          else
            # Request can be retried directly
            echo "Server error: $custom_id"
          fi
          ;;
        "expired")
          echo "Expired: $line"
          ;;
      esac
    done
  done
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

# Stream results file in memory-efficient chunks, processing one at a time
for result in client.messages.batches.results(
    "msgbatch_01HkcTjaV5uDC8jWR4ZsDV8d",
):
    match result.result.type:
        case "succeeded":
            print(f"Success! {result.custom_id}")
        case "errored":
            if result.result.error.type == "invalid_request":
                # Request body must be fixed before re-sending request
                print(f"Validation error {result.custom_id}")
            else:
                # Request can be retried directly
                print(f"Server error {result.custom_id}")
        case "expired":
            print(f"Request expired {result.custom_id}")
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Stream results file in memory-efficient chunks, processing one at a time
for await (const result of await anthropic.messages.batches.results(
    "msgbatch_01HkcTjaV5uDC8jWR4ZsDV8d"
)) {
  switch (result.result.type) {
    case 'succeeded':
      console.log(`Success! ${result.custom_id}`);
      break;
    case 'errored':
      if (result.result.error.type == "invalid_request") {
        // Request body must be fixed before re-sending request
        console.log(`Validation error: ${result.custom_id}`);
      } else {
        // Request can be retried directly
        console.log(`Server error: ${result.custom_id}`);
      }
      break;
    case 'expired':
      console.log(`Request expired: ${result.custom_id}`);
      break;
  }
}
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.http.StreamResponse;
import com.anthropic.models.messages.batches.MessageBatchIndividualResponse;
import com.anthropic.models.messages.batches.BatchResultsParams;

public class BatchResultsExample {

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        // Stream results file in memory-efficient chunks, processing one at a time
        try (StreamResponse<MessageBatchIndividualResponse> streamResponse = client.messages()
                .batches()
                .resultsStreaming(
                        BatchResultsParams.builder()
                                .messageBatchId("msgbatch_01HkcTjaV5uDC8jWR4ZsDV8d")
                                .build())) {

            streamResponse.stream().forEach(result -> {
                if (result.result().isSucceeded()) {
                    System.out.println("Success! " + result.customId());
                } else if (result.result().isErrored()) {
                    if (result.result().asErrored().error().error().isInvalidRequestError()) {
                        // Request body must be fixed before re-sending request
                        System.out.println("Validation error: " + result.customId());
                    } else {
                        // Request can be retried directly
                        System.out.println("Server error: " + result.customId());
                    }
                } else if (result.result().isExpired()) {
                    System.out.println("Request expired: " + result.customId());
                }
            });
        }
    }
}
```

The results will be in `.jsonl` format, where each line is a valid JSON object representing the result of a single request in the Message Batch. For each streamed result, you can do something different depending on its `custom_id` and result type. Here is an example set of results:

```json
{"custom_id":"my-second-request","result":{"type":"succeeded","message":{"id":"msg_014VwiXbi91y3JMjcpyGBHX5","type":"message","role":"assistant","model":"claude-sonnet-4-5-20250929","content":[{"type":"text","text":"Hello again! It's nice to see you. How can I assist you today? Is there anything specific you'd like to chat about or any questions you have?"}],"stop_reason":"end_turn","stop_sequence":null,"usage":{"input_tokens":11,"output_tokens":36}}}}
{"custom_id":"my-first-request","result":{"type":"succeeded","message":{"id":"msg_01FqfsLoHwgeFbguDgpz48m7","type":"message","role":"assistant","model":"claude-sonnet-4-5-20250929","content":[{"type":"text","text":"Hello! How can I assist you today? Feel free to ask me any questions or let me know if there's anything you'd like to chat about."}],"stop_reason":"end_turn","stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":34}}}}
```

If your result has an error, its `result.error` will be set to our standard [error shape](/docs/en/api/errors#error-shapes).

### Canceling a Message Batch

You can cancel a Message Batch that is currently processing using the [cancel endpoint](/docs/en/api/canceling-message-batches). Immediately after cancellation, a batch's `processing_status` will be `canceling`. You can use the same polling technique described above to wait until cancellation is finalized. Canceled batches end up with a status of `ended` and may contain partial results for requests that were processed before cancellation.

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

message_batch = client.messages.batches.cancel(
    MESSAGE_BATCH_ID,
)
print(message_batch)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const messageBatch = await anthropic.messages.batches.cancel(
    MESSAGE_BATCH_ID
);
console.log(messageBatch);
```

**Shell:**
```bash
#!/bin/sh
curl --request POST https://api.anthropic.com/v1/messages/batches/$MESSAGE_BATCH_ID/cancel \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "anthropic-version: 2023-06-01"
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.batches.*;

public class BatchCancelExample {
    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        MessageBatch messageBatch = client.messages().batches().cancel(
                BatchCancelParams.builder()
                        .messageBatchId(MESSAGE_BATCH_ID)
                        .build()
        );
        System.out.println(messageBatch);
    }
}
```

The response will show the batch in a `canceling` state:

```json
{
  "id": "msgbatch_013Zva2CMHLNnXjNJJKqJ2EF",
  "type": "message_batch",
  "processing_status": "canceling",
  "request_counts": {
    "processing": 2,
    "succeeded": 0,
    "errored": 0,
    "canceled": 0,
    "expired": 0
  },
  "ended_at": null,
  "created_at": "2024-09-24T18:37:24.100435Z",
  "expires_at": "2024-09-25T18:37:24.100435Z",
  "cancel_initiated_at": "2024-09-24T18:39:03.114875Z",
  "results_url": null
}
```

### Using prompt caching with Message Batches

The Message Batches API supports prompt caching, allowing you to potentially reduce costs and processing time for batch requests. The pricing discounts from prompt caching and Message Batches can stack, providing even greater cost savings when both features are used together. However, since batch requests are processed asynchronously and concurrently, cache hits are provided on a best-effort basis. Users typically experience cache hit rates ranging from 30% to 98%, depending on their traffic patterns.

To maximize the likelihood of cache hits in your batch requests:

1. Include identical `cache_control` blocks in every Message request within your batch
2. Maintain a steady stream of requests to prevent cache entries from expiring after their 5-minute lifetime
3. Structure your requests to share as much cached content as possible

Example of implementing prompt caching in a batch:

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages/batches \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "requests": [
        {
            "custom_id": "my-first-request",
            "params": {
                "model": "claude-sonnet-4-5",
                "max_tokens": 1024,
                "system": [
                    {
                        "type": "text",
                        "text": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"
                    },
                    {
                        "type": "text",
                        "text": "<the entire contents of Pride and Prejudice>",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                "messages": [
                    {"role": "user", "content": "Analyze the major themes in Pride and Prejudice."}
                ]
            }
        },
        {
            "custom_id": "my-second-request",
            "params": {
                "model": "claude-sonnet-4-5",
                "max_tokens": 1024,
                "system": [
                    {
                        "type": "text",
                        "text": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"
                    },
                    {
                        "type": "text",
                        "text": "<the entire contents of Pride and Prejudice>",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                "messages": [
                    {"role": "user", "content": "Write a summary of Pride and Prejudice."}
                ]
            }
        }
    ]
}'
```

**Python:**
```python
import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

client = anthropic.Anthropic()

message_batch = client.messages.batches.create(
    requests=[
        Request(
            custom_id="my-first-request",
            params=MessageCreateParamsNonStreaming(
                model="claude-sonnet-4-5",
                max_tokens=1024,
                system=[
                    {
                        "type": "text",
                        "text": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"
                    },
                    {
                        "type": "text",
                        "text": "<the entire contents of Pride and Prejudice>",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                messages=[{
                    "role": "user",
                    "content": "Analyze the major themes in Pride and Prejudice."
                }]
            )
        ),
        Request(
            custom_id="my-second-request",
            params=MessageCreateParamsNonStreaming(
                model="claude-sonnet-4-5",
                max_tokens=1024,
                system=[
                    {
                        "type": "text",
                        "text": "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"
                    },
                    {
                        "type": "text",
                        "text": "<the entire contents of Pride and Prejudice>",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                messages=[{
                    "role": "user",
                    "content": "Write a summary of Pride and Prejudice."
                }]
            )
        )
    ]
)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const messageBatch = await anthropic.messages.batches.create({
  requests: [{
    custom_id: "my-first-request",
    params: {
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"
        },
        {
          type: "text",
          text: "<the entire contents of Pride and Prejudice>",
          cache_control: {type: "ephemeral"}
        }
      ],
      messages: [
        {"role": "user", "content": "Analyze the major themes in Pride and Prejudice."}
      ]
    }
  }, {
    custom_id: "my-second-request",
    params: {
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: "You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n"
        },
        {
          type: "text",
          text: "<the entire contents of Pride and Prejudice>",
          cache_control: {type: "ephemeral"}
        }
      ],
      messages: [
        {"role": "user", "content": "Write a summary of Pride and Prejudice."}
      ]
    }
  }]
});
```

**Java:**
```java
import java.util.List;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.CacheControlEphemeral;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.TextBlockParam;
import com.anthropic.models.messages.batches.*;

public class BatchExample {

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        BatchCreateParams createParams = BatchCreateParams.builder()
                .addRequest(BatchCreateParams.Request.builder()
                        .customId("my-first-request")
                        .params(BatchCreateParams.Request.Params.builder()
                                .model(Model.CLAUDE_OPUS_4_0)
                                .maxTokens(1024)
                                .systemOfTextBlockParams(List.of(
                                        TextBlockParam.builder()
                                                .text("You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n")
                                                .build(),
                                        TextBlockParam.builder()
                                                .text("<the entire contents of Pride and Prejudice>")
                                                .cacheControl(CacheControlEphemeral.builder().build())
                                                .build()
                                ))
                                .addUserMessage("Analyze the major themes in Pride and Prejudice.")
                                .build())
                        .build())
                .addRequest(BatchCreateParams.Request.builder()
                        .customId("my-second-request")
                        .params(BatchCreateParams.Request.Params.builder()
                                .model(Model.CLAUDE_OPUS_4_0)
                                .maxTokens(1024)
                                .systemOfTextBlockParams(List.of(
                                        TextBlockParam.builder()
                                                .text("You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.\n")
                                                .build(),
                                        TextBlockParam.builder()
                                                .text("<the entire contents of Pride and Prejudice>")
                                                .cacheControl(CacheControlEphemeral.builder().build())
                                                .build()
                                ))
                                .addUserMessage("Write a summary of Pride and Prejudice.")
                                .build())
                        .build())
                .build();

        MessageBatch messageBatch = client.messages().batches().create(createParams);
    }
}
```

In this example, both requests in the batch include identical system messages and the full text of Pride and Prejudice marked with `cache_control` to increase the likelihood of cache hits.

### Best practices for effective batching

To get the most out of the Batches API:

- Monitor batch processing status regularly and implement appropriate retry logic for failed requests.
- Use meaningful `custom_id` values to easily match results with requests, since order is not guaranteed.
- Consider breaking very large datasets into multiple batches for better manageability.
- Dry run a single request shape with the Messages API to avoid validation errors.

### Troubleshooting common issues

If experiencing unexpected behavior:

- Verify that the total batch request size doesn't exceed 256 MB. If the request size is too large, you may get a 413 `request_too_large` error.
- Check that you're using [supported models](#supported-models) for all requests in the batch.
- Ensure each request in the batch has a unique `custom_id`.
- Ensure that it has been less than 29 days since batch `created_at` (not processing `ended_at`) time. If over 29 days have passed, results will no longer be viewable.
- Confirm that the batch has not been canceled.

Note that the failure of one request in a batch does not affect the processing of other requests.

---

## Batch storage and privacy

- **Workspace isolation**: Batches are isolated within the Workspace they are created in. They can only be accessed by API keys associated with that Workspace, or users with permission to view Workspace batches in the Console.

- **Result availability**: Batch results are available for 29 days after the batch is created, allowing ample time for retrieval and processing.

---

## FAQ

<section title="How long does it take for a batch to process?">

Batches may take up to 24 hours for processing, but many will finish sooner. Actual processing time depends on the size of the batch, current demand, and your request volume. It is possible for a batch to expire and not complete within 24 hours.

</section>

<section title="Is the Batches API available for all models?">

See [above](#supported-models) for the list of supported models.

</section>

<section title="Can I use the Message Batches API with other API features?">

Yes, the Message Batches API supports all features available in the Messages API, including beta features. However, streaming is not supported for batch requests.

</section>

<section title="How does the Message Batches API affect pricing?">

The Message Batches API offers a 50% discount on all usage compared to standard API prices. This applies to input tokens, output tokens, and any special tokens. For more on pricing, visit our [pricing page](https://claude.com/pricing#anthropic-api).

</section>

<section title="Can I update a batch after it's been submitted?">

No, once a batch has been submitted, it cannot be modified. If you need to make changes, you should cancel the current batch and submit a new one. Note that cancellation may not take immediate effect.

</section>

<section title="Are there Message Batches API rate limits and do they interact with the Messages API rate limits?">

The Message Batches API has HTTP requests-based rate limits in addition to limits on the number of requests in need of processing. See [Message Batches API rate limits](/docs/en/api/rate-limits#message-batches-api). Usage of the Batches API does not affect rate limits in the Messages API.

</section>

<section title="How do I handle errors in my batch requests?">

When you retrieve the results, each request will have a `result` field indicating whether it `succeeded`, `errored`, was `canceled`, or `expired`. For `errored` results, additional error information will be provided. View the error response object in the [API reference](/docs/en/api/creating-message-batches).

</section>

<section title="How does the Message Batches API handle privacy and data separation?">

The Message Batches API is designed with strong privacy and data separation measures:

1. Batches and their results are isolated within the Workspace in which they were created. This means they can only be accessed by API keys from that same Workspace.
2. Each request within a batch is processed independently, with no data leakage between requests.
3. Results are only available for a limited time (29 days), and follow our [data retention policy](https://support.claude.com/en/articles/7996866-how-long-do-you-store-personal-data).
4. Downloading batch results in the Console can be disabled on the organization-level or on a per-workspace basis.

</section>

<section title="Can I use prompt caching in the Message Batches API?">

Yes, it is possible to use prompt caching with Message Batches API. However, because asynchronous batch requests can be processed concurrently and in any order, cache hits are provided on a best-effort basis.

</section>

---

# Citations

Claude is capable of providing detailed citations when answering questions about documents, helping you track and verify information sources in responses.

All active models support citations, with the exception of Haiku 3.

## Warning: Citations with Claude Sonnet 3.7

Claude Sonnet 3.7 may be less likely to make citations compared to other Claude models without more explicit instructions from the user. When using citations with Claude Sonnet 3.7, we recommend including additional instructions in the user turn, like `"Use citations to back up your answer."` for example.

We've also observed that when the model is asked to structure its response, it is unlikely to use citations unless explicitly told to use citations within that format. For example, if the model is asked to use `<result>` tags in its response, you should add something like `"Always use citations in your answer, even within <result> tags."`

## Basic Usage

Here's an example of how to use citations with the Messages API:

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "document",
            "source": {
              "type": "text",
              "media_type": "text/plain",
              "data": "The grass is green. The sky is blue."
            },
            "title": "My Document",
            "context": "This is a trustworthy document.",
            "citations": {"enabled": true}
          },
          {
            "type": "text",
            "text": "What color is the grass and sky?"
          }
        ]
      }
    ]
  }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "text",
                        "media_type": "text/plain",
                        "data": "The grass is green. The sky is blue."
                    },
                    "title": "My Document",
                    "context": "This is a trustworthy document.",
                    "citations": {"enabled": True}
                },
                {
                    "type": "text",
                    "text": "What color is the grass and sky?"
                }
            ]
        }
    ]
)
print(response)
```

**Java:**
```java
import java.util.List;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;

public class DocumentExample {

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        PlainTextSource source = PlainTextSource.builder()
                .data("The grass is green. The sky is blue.")
                .build();

        DocumentBlockParam documentParam = DocumentBlockParam.builder()
                .source(source)
                .title("My Document")
                .context("This is a trustworthy document.")
                .citations(CitationsConfigParam.builder().enabled(true).build())
                .build();

        TextBlockParam textBlockParam = TextBlockParam.builder()
                .text("What color is the grass and sky?")
                .build();

        MessageCreateParams params = MessageCreateParams.builder()
                .model(Model.CLAUDE_SONNET_4_20250514)
                .maxTokens(1024)
                .addUserMessageOfBlockParams(List.of(ContentBlockParam.ofDocument(documentParam), ContentBlockParam.ofText(textBlockParam)))
                .build();

        Message message = client.messages().create(params);
        System.out.println(message);
    }
}
```

## Comparison with Prompt-Based Approaches

In comparison with prompt-based citations solutions, the citations feature has the following advantages:

- **Cost savings**: If your prompt-based approach asks Claude to output direct quotes, you may see cost savings due to the fact that `cited_text` does not count towards your output tokens.
- **Better citation reliability**: Because we parse citations into the respective response formats and extract `cited_text`, citations are guaranteed to contain valid pointers to the provided documents.
- **Improved citation quality**: In evaluations, the citations feature is significantly more likely to cite the most relevant quotes from documents as compared to purely prompt-based approaches.

---

## How Citations Work

Integrate citations with Claude in these steps:

### Step 1: Provide document(s) and enable citations

- Include documents in any of the supported formats: PDFs, plain text, or custom content documents
- Set `citations.enabled=true` on each of your documents. Currently, citations must be enabled on all or none of the documents within a request.
- Note that only text citations are currently supported and image citations are not yet possible.

### Step 2: Documents get processed

- Document contents are "chunked" in order to define the minimum granularity of possible citations.
  - **For PDFs**: Text is extracted and content is chunked into sentences. Citing images from PDFs is not currently supported.
  - **For plain text documents**: Content is chunked into sentences that can be cited from.
  - **For custom content documents**: Your provided content blocks are used as-is and no further chunking is done.

### Step 3: Claude provides cited response

- Responses may now include multiple text blocks where each text block can contain a claim that Claude is making and a list of citations that support the claim.
- Citations reference specific locations in source documents. The format of these citations are dependent on the type of document being cited from.
  - **For PDFs**: citations will include the page number range (1-indexed).
  - **For plain text documents**: Citations will include the character index range (0-indexed).
  - **For custom content documents**: Citations will include the content block index range (0-indexed) corresponding to the original content list provided.
- Document indices are provided to indicate the reference source and are 0-indexed according to the list of all documents in your original request.

## Citation Mechanics

### Citable vs non-citable content

- Text found within a document's `source` content can be cited from.
- `title` and `context` are optional fields that will be passed to the model but not used towards cited content.
- `title` is limited in length so you may find the `context` field to be useful in storing any document metadata as text or stringified JSON.

### Citation indices

- Document indices are 0-indexed from the list of all document content blocks in the request (spanning across all messages).
- Character indices are 0-indexed with exclusive end indices.
- Page numbers are 1-indexed with exclusive end page numbers.
- Content block indices are 0-indexed with exclusive end indices from the `content` list provided in the custom content document.

### Token costs

- Enabling citations incurs a slight increase in input tokens due to system prompt additions and document chunking.
- However, the citations feature is very efficient with output tokens. Under the hood, the model is outputting citations in a standardized format that are then parsed into cited text and document location indices. The `cited_text` field is provided for convenience and does not count towards output tokens.
- When passed back in subsequent conversation turns, `cited_text` is also not counted towards input tokens.

### Feature compatibility

Citations works in conjunction with other API features including prompt caching, token counting and batch processing.

#### Citations and Structured Outputs are incompatible

Citations cannot be used together with Structured Outputs. If you enable citations on any user-provided document (Document blocks or RequestSearchResultBlock) and also include the `output_format` parameter, the API will return a 400 error.

This is because citations require interleaving citation blocks with text output, which is incompatible with the strict JSON schema constraints of structured outputs.

## Using Prompt Caching with Citations

Citations and prompt caching can be used together effectively.

The citation blocks generated in responses cannot be cached directly, but the source documents they reference can be cached. To optimize performance, apply `cache_control` to your top-level document content blocks.

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

# Long document content (e.g., technical documentation)
long_document = "This is a very long document with thousands of words..." + " ... " * 1000  # Minimum cacheable length

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "text",
                        "media_type": "text/plain",
                        "data": long_document
                    },
                    "citations": {"enabled": True},
                    "cache_control": {"type": "ephemeral"}  # Cache the document content
                },
                {
                    "type": "text",
                    "text": "What does this document say about API features?"
                }
            ]
        }
    ]
)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Long document content (e.g., technical documentation)
const longDocument = "This is a very long document with thousands of words..." + " ... ".repeat(1000);  // Minimum cacheable length

const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "text",
            media_type: "text/plain",
            data: longDocument
          },
          citations: { enabled: true },
          cache_control: { type: "ephemeral" }  // Cache the document content
        },
        {
          type: "text",
          text: "What does this document say about API features?"
        }
      ]
    }
  ]
});
```

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "text",
                        "media_type": "text/plain",
                        "data": "This is a very long document with thousands of words..."
                    },
                    "citations": {"enabled": true},
                    "cache_control": {"type": "ephemeral"}
                },
                {
                    "type": "text",
                    "text": "What does this document say about API features?"
                }
            ]
        }
    ]
}'
```

In this example:
- The document content is cached using `cache_control` on the document block
- Citations are enabled on the document
- Claude can generate responses with citations while benefiting from cached document content
- Subsequent requests using the same document will benefit from the cached content

---

## Document Types

### Choosing a document type

We support three document types for citations. Documents can be provided directly in the message (base64, text, or URL) or uploaded via the Files API and referenced by `file_id`:

| Type | Best for | Chunking | Citation format |
| :--- | :--- | :--- | :--- |
| Plain text | Simple text documents, prose | Sentence | Character indices (0-indexed) |
| PDF | PDF files with text content | Sentence | Page numbers (1-indexed) |
| Custom content | Lists, transcripts, special formatting, more granular citations | No additional chunking | Block indices (0-indexed) |

### Plain Text Documents

Plain text documents are automatically chunked into sentences. You can provide them inline or by reference with their `file_id`:

**Inline text:**
```python
{
    "type": "document",
    "source": {
        "type": "text",
        "media_type": "text/plain",
        "data": "Plain text content..."
    },
    "title": "Document Title", # optional
    "context": "Context about the document that will not be cited from", # optional
    "citations": {"enabled": True}
}
```

**Files API:**
```python
{
    "type": "document",
    "source": {
        "type": "file",
        "file_id": "file_011CNvxoj286tYUAZFiZMf1U"
    },
    "title": "Document Title", # optional
    "context": "Context about the document that will not be cited from", # optional
    "citations": {"enabled": True}
}
```

**Example plain text citation:**
```python
{
    "type": "char_location",
    "cited_text": "The exact text being cited", # not counted towards output tokens
    "document_index": 0,
    "document_title": "Document Title",
    "start_char_index": 0,    # 0-indexed
    "end_char_index": 50      # exclusive
}
```

### PDF Documents

PDF documents can be provided as base64-encoded data or by `file_id`. PDF text is extracted and chunked into sentences. As image citations are not yet supported, PDFs that are scans of documents and do not contain extractable text will not be citable.

**Base64:**
```python
{
    "type": "document",
    "source": {
        "type": "base64",
        "media_type": "application/pdf",
        "data": base64_encoded_pdf_data
    },
    "title": "Document Title", # optional
    "context": "Context about the document that will not be cited from", # optional
    "citations": {"enabled": True}
}
```

**Files API:**
```python
{
    "type": "document",
    "source": {
        "type": "file",
        "file_id": "file_011CNvxoj286tYUAZFiZMf1U"
    },
    "title": "Document Title", # optional
    "context": "Context about the document that will not be cited from", # optional
    "citations": {"enabled": True}
}
```

**Example PDF citation:**
```python
{
    "type": "page_location",
    "cited_text": "The exact text being cited", # not counted towards output tokens
    "document_index": 0,
    "document_title": "Document Title",
    "start_page_number": 1,  # 1-indexed
    "end_page_number": 2     # exclusive
}
```

### Custom Content Documents

Custom content documents give you control over citation granularity. No additional chunking is done and chunks are provided to the model according to the content blocks provided.

```python
{
    "type": "document",
    "source": {
        "type": "content",
        "content": [
            {"type": "text", "text": "First chunk"},
            {"type": "text", "text": "Second chunk"}
        ]
    },
    "title": "Document Title", # optional
    "context": "Context about the document that will not be cited from", # optional
    "citations": {"enabled": True}
}
```

**Example citation:**
```python
{
    "type": "content_block_location",
    "cited_text": "The exact text being cited", # not counted towards output tokens
    "document_index": 0,
    "document_title": "Document Title",
    "start_block_index": 0,   # 0-indexed
    "end_block_index": 1      # exclusive
}
```

---

## Response Structure

When citations are enabled, responses include multiple text blocks with citations:

```python
{
    "content": [
        {
            "type": "text",
            "text": "According to the document, "
        },
        {
            "type": "text",
            "text": "the grass is green",
            "citations": [{
                "type": "char_location",
                "cited_text": "The grass is green.",
                "document_index": 0,
                "document_title": "Example Document",
                "start_char_index": 0,
                "end_char_index": 20
            }]
        },
        {
            "type": "text",
            "text": " and "
        },
        {
            "type": "text",
            "text": "the sky is blue",
            "citations": [{
                "type": "char_location",
                "cited_text": "The sky is blue.",
                "document_index": 0,
                "document_title": "Example Document",
                "start_char_index": 20,
                "end_char_index": 36
            }]
        },
        {
            "type": "text",
            "text": ". Information from page 5 states that "
        },
        {
            "type": "text",
            "text": "water is essential",
            "citations": [{
                "type": "page_location",
                "cited_text": "Water is essential for life.",
                "document_index": 1,
                "document_title": "PDF Document",
                "start_page_number": 5,
                "end_page_number": 6
            }]
        },
        {
            "type": "text",
            "text": ". The custom document mentions "
        },
        {
            "type": "text",
            "text": "important findings",
            "citations": [{
                "type": "content_block_location",
                "cited_text": "These are important findings.",
                "document_index": 2,
                "document_title": "Custom Content Document",
                "start_block_index": 0,
                "end_block_index": 1
            }]
        }
    ]
}
```

### Streaming Support

For streaming responses, we've added a `citations_delta` type that contains a single citation to be added to the `citations` list on the current `text` content block.

**Example streaming events:**

```json
event: message_start
data: {"type": "message_start", ...}

event: content_block_start
data: {"type": "content_block_start", "index": 0, ...}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0,
       "delta": {"type": "text_delta", "text": "According to..."}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0,
       "delta": {"type": "citations_delta",
                 "citation": {
                     "type": "char_location",
                     "cited_text": "...",
                     "document_index": 0,
                     ...
                 }}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 0}

event: message_stop
data: {"type": "message_stop"}
```

---

# Token Counting

Token counting enables you to determine the number of tokens in a message before sending it to Claude, helping you make informed decisions about your prompts and usage. With token counting, you can:

- Proactively manage rate limits and costs
- Make smart model routing decisions
- Optimize prompts to be a specific length

---

## How to Count Message Tokens

The token counting endpoint accepts the same structured list of inputs for creating a message, including support for system prompts, tools, images, and PDFs. The response contains the total number of input tokens.

### Important Notes

- The token count should be considered an **estimate**. In some cases, the actual number of input tokens used when creating a message may differ by a small amount.
- Token counts may include tokens added automatically by Anthropic for system optimizations. **You are not billed for system-added tokens**. Billing reflects only your content.

### Supported Models

All active models support token counting.

---

## Counting Tokens in Basic Messages

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.count_tokens(
    model="claude-sonnet-4-5",
    system="You are a scientist",
    messages=[{
        "role": "user",
        "content": "Hello, Claude"
    }],
)

print(response.json())
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.countTokens({
  model: 'claude-sonnet-4-5',
  system: 'You are a scientist',
  messages: [{
    role: 'user',
    content: 'Hello, Claude'
  }]
});

console.log(response);
```

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages/count_tokens \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "content-type: application/json" \
    --header "anthropic-version: 2023-06-01" \
    --data '{
      "model": "claude-sonnet-4-5",
      "system": "You are a scientist",
      "messages": [{
        "role": "user",
        "content": "Hello, Claude"
      }]
    }'
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCountTokensParams;
import com.anthropic.models.messages.MessageTokensCount;
import com.anthropic.models.messages.Model;

public class CountTokensExample {

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        MessageCountTokensParams params = MessageCountTokensParams.builder()
                .model(Model.CLAUDE_SONNET_4_20250514)
                .system("You are a scientist")
                .addUserMessage("Hello, Claude")
                .build();

        MessageTokensCount count = client.messages().countTokens(params);
        System.out.println(count);
    }
}
```

**Response:**
```json
{ "input_tokens": 14 }
```

---

## Counting Tokens in Messages with Tools

**Note**: Server tool token counts only apply to the first sampling call.

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.count_tokens(
    model="claude-sonnet-4-5",
    tools=[
        {
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    }
                },
                "required": ["location"],
            },
        }
    ],
    messages=[{"role": "user", "content": "What's the weather like in San Francisco?"}]
)

print(response.json())
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.countTokens({
  model: 'claude-sonnet-4-5',
  tools: [
    {
      name: "get_weather",
      description: "Get the current weather in a given location",
      input_schema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA",
          }
        },
        required: ["location"],
      }
    }
  ],
  messages: [{ role: "user", content: "What's the weather like in San Francisco?" }]
});

console.log(response);
```

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages/count_tokens \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "content-type: application/json" \
    --header "anthropic-version: 2023-06-01" \
    --data '{
      "model": "claude-sonnet-4-5",
      "tools": [
        {
          "name": "get_weather",
          "description": "Get the current weather in a given location",
          "input_schema": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and state, e.g. San Francisco, CA"
              }
            },
            "required": ["location"]
          }
        }
      ],
      "messages": [
        {
          "role": "user",
          "content": "What'\''s the weather like in San Francisco?"
        }
      ]
    }'
```

**Java:**
```java
import java.util.List;
import java.util.Map;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.MessageCountTokensParams;
import com.anthropic.models.messages.MessageTokensCount;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.Tool.InputSchema;

public class CountTokensWithToolsExample {

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        InputSchema schema = InputSchema.builder()
                .properties(JsonValue.from(Map.of(
                        "location", Map.of(
                                "type", "string",
                                "description", "The city and state, e.g. San Francisco, CA"
                        )
                )))
                .putAdditionalProperty("required", JsonValue.from(List.of("location")))
                .build();

        MessageCountTokensParams params = MessageCountTokensParams.builder()
                .model(Model.CLAUDE_SONNET_4_20250514)
                .addTool(Tool.builder()
                        .name("get_weather")
                        .description("Get the current weather in a given location")
                        .inputSchema(schema)
                        .build())
                .addUserMessage("What's the weather like in San Francisco?")
                .build();

        MessageTokensCount count = client.messages().countTokens(params);
        System.out.println(count);
    }
}
```

**Response:**
```json
{ "input_tokens": 403 }
```

---

## Counting Tokens in Messages with Images

**Shell:**
```bash
#!/bin/sh

IMAGE_URL="https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
IMAGE_MEDIA_TYPE="image/jpeg"
IMAGE_BASE64=$(curl "$IMAGE_URL" | base64)

curl https://api.anthropic.com/v1/messages/count_tokens \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-sonnet-4-5",
    "messages": [
        {"role": "user", "content": [
            {"type": "image", "source": {
                "type": "base64",
                "media_type": "'$IMAGE_MEDIA_TYPE'",
                "data": "'$IMAGE_BASE64'"
            }},
            {"type": "text", "text": "Describe this image"}
        ]}
    ]
}'
```

**Python:**
```python
import anthropic
import base64
import httpx

image_url = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
image_media_type = "image/jpeg"
image_data = base64.standard_b64encode(httpx.get(image_url).content).decode("utf-8")

client = anthropic.Anthropic()

response = client.messages.count_tokens(
    model="claude-sonnet-4-5",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": image_media_type,
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": "Describe this image"
                }
            ],
        }
    ],
)
print(response.json())
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const image_url = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
const image_media_type = "image/jpeg"
const image_array_buffer = await ((await fetch(image_url)).arrayBuffer());
const image_data = Buffer.from(image_array_buffer).toString('base64');

const response = await anthropic.messages.countTokens({
  model: 'claude-sonnet-4-5',
  messages: [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": image_media_type,
            "data": image_data,
          },
        },
        {
          "type": "text",
          "text": "Describe this image"
        }
      ],
    }
  ]
});
console.log(response);
```

**Java:**
```java
import java.util.Base64;
import java.util.List;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Base64ImageSource;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.ImageBlockParam;
import com.anthropic.models.messages.MessageCountTokensParams;
import com.anthropic.models.messages.MessageTokensCount;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.TextBlockParam;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class CountTokensImageExample {

    public static void main(String[] args) throws Exception {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        String imageUrl = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg";
        String imageMediaType = "image/jpeg";

        HttpClient httpClient = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(imageUrl))
                .build();
        byte[] imageBytes = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray()).body();
        String imageBase64 = Base64.getEncoder().encodeToString(imageBytes);

        ContentBlockParam imageBlock = ContentBlockParam.ofImage(
                ImageBlockParam.builder()
                        .source(Base64ImageSource.builder()
                                .mediaType(Base64ImageSource.MediaType.IMAGE_JPEG)
                                .data(imageBase64)
                                .build())
                        .build());

        ContentBlockParam textBlock = ContentBlockParam.ofText(
                TextBlockParam.builder()
                        .text("Describe this image")
                        .build());

        MessageCountTokensParams params = MessageCountTokensParams.builder()
                .model(Model.CLAUDE_SONNET_4_20250514)
                .addUserMessageOfBlockParams(List.of(imageBlock, textBlock))
                .build();

        MessageTokensCount count = client.messages().countTokens(params);
        System.out.println(count);
    }
}
```

**Response:**
```json
{ "input_tokens": 1551 }
```

---

## Counting Tokens in Messages with Extended Thinking

**Note**: Thinking blocks from **previous** assistant turns are ignored and **do not** count toward your input tokens. **Current** assistant turn thinking **does** count toward your input tokens. See the Extended Thinking documentation for more details about context window calculation.

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages/count_tokens \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "content-type: application/json" \
    --header "anthropic-version: 2023-06-01" \
    --data '{
      "model": "claude-sonnet-4-5",
      "thinking": {
        "type": "enabled",
        "budget_tokens": 16000
      },
      "messages": [
        {
          "role": "user",
          "content": "Are there an infinite number of prime numbers such that n mod 4 == 3?"
        },
        {
          "role": "assistant",
          "content": [
            {
              "type": "thinking",
              "thinking": "This is a nice number theory question. Lets think about it step by step...",
              "signature": "EuYBCkQYAiJAgCs1le6/Pol5Z4/JMomVOouGrWdhYNsH3ukzUECbB6iWrSQtsQuRHJID6lWV..."
            },
            {
              "type": "text",
              "text": "Yes, there are infinitely many prime numbers p such that p mod 4 = 3..."
            }
          ]
        },
        {
          "role": "user",
          "content": "Can you write a formal proof?"
        }
      ]
    }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.count_tokens(
    model="claude-sonnet-4-5",
    thinking={
        "type": "enabled",
        "budget_tokens": 16000
    },
    messages=[
        {
            "role": "user",
            "content": "Are there an infinite number of prime numbers such that n mod 4 == 3?"
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "thinking",
                    "thinking": "This is a nice number theory question. Let's think about it step by step...",
                    "signature": "EuYBCkQYAiJAgCs1le6/Pol5Z4/JMomVOouGrWdhYNsH3ukzUECbB6iWrSQtsQuRHJID6lWV..."
                },
                {
                  "type": "text",
                  "text": "Yes, there are infinitely many prime numbers p such that p mod 4 = 3..."
                }
            ]
        },
        {
            "role": "user",
            "content": "Can you write a formal proof?"
        }
    ]
)

print(response.json())
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.countTokens({
  model: 'claude-sonnet-4-5',
  thinking: {
    'type': 'enabled',
    'budget_tokens': 16000
  },
  messages: [
    {
      'role': 'user',
      'content': 'Are there an infinite number of prime numbers such that n mod 4 == 3?'
    },
    {
      'role': 'assistant',
      'content': [
        {
          'type': 'thinking',
          'thinking': "This is a nice number theory question. Let's think about it step by step...",
          'signature': 'EuYBCkQYAiJAgCs1le6/Pol5Z4/JMomVOouGrWdhYNsH3ukzUECbB6iWrSQtsQuRHJID6lWV...'
        },
        {
          'type': 'text',
          'text': 'Yes, there are infinitely many prime numbers p such that p mod 4 = 3...',
        }
      ]
    },
    {
      'role': 'user',
      'content': 'Can you write a formal proof?'
    }
  ]
});

console.log(response);
```

**Java:**
```java
import java.util.List;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.MessageCountTokensParams;
import com.anthropic.models.messages.MessageTokensCount;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.TextBlockParam;
import com.anthropic.models.messages.ThinkingBlockParam;

public class CountTokensThinkingExample {

    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        List<ContentBlockParam> assistantBlocks = List.of(
                ContentBlockParam.ofThinking(ThinkingBlockParam.builder()
                        .thinking("This is a nice number theory question. Let's think about it step by step...")
                        .signature("EuYBCkQYAiJAgCs1le6/Pol5Z4/JMomVOouGrWdhYNsH3ukzUECbB6iWrSQtsQuRHJID6lWV...")
                        .build()),
                ContentBlockParam.ofText(TextBlockParam.builder()
                        .text("Yes, there are infinitely many prime numbers p such that p mod 4 = 3...")
                        .build())
        );

        MessageCountTokensParams params = MessageCountTokensParams.builder()
                .model(Model.CLAUDE_SONNET_4_20250514)
                .enabledThinking(16000)
                .addUserMessage("Are there an infinite number of prime numbers such that n mod 4 == 3?")
                .addAssistantMessageOfBlockParams(assistantBlocks)
                .addUserMessage("Can you write a formal proof?")
                .build();

        MessageTokensCount count = client.messages().countTokens(params);
        System.out.println(count);
    }
}
```

**Response:**
```json
{ "input_tokens": 88 }
```

---

## Counting Tokens in Messages with PDFs

**Note**: Token counting supports PDFs with the same limitations as the Messages API.

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages/count_tokens \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "content-type: application/json" \
    --header "anthropic-version: 2023-06-01" \
    --data '{
      "model": "claude-sonnet-4-5",
      "messages": [{
        "role": "user",
        "content": [
          {
            "type": "document",
            "source": {
              "type": "base64",
              "media_type": "application/pdf",
              "data": "'$(base64 -i document.pdf)'"
            }
          },
          {
            "type": "text",
            "text": "Please summarize this document."
          }
        ]
      }]
    }'
```

**Python:**
```python
import base64
import anthropic

client = anthropic.Anthropic()

with open("document.pdf", "rb") as pdf_file:
    pdf_base64 = base64.standard_b64encode(pdf_file.read()).decode("utf-8")

response = client.messages.count_tokens(
    model="claude-sonnet-4-5",
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": pdf_base64
                }
            },
            {
                "type": "text",
                "text": "Please summarize this document."
            }
        ]
    }]
)

print(response.json())
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const client = new Anthropic();

const pdfBase64 = readFileSync('document.pdf', { encoding: 'base64' });

const response = await client.messages.countTokens({
  model: 'claude-sonnet-4-5',
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64
        }
      },
      {
        type: 'text',
        text: 'Please summarize this document.'
      }
    ]
  }]
});

console.log(response);
```

**Java:**
```java
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Base64PdfSource;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.DocumentBlockParam;
import com.anthropic.models.messages.MessageCountTokensParams;
import com.anthropic.models.messages.MessageTokensCount;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.TextBlockParam;

public class CountTokensPdfExample {

    public static void main(String[] args) throws Exception {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();

        byte[] fileBytes = Files.readAllBytes(Path.of("document.pdf"));
        String pdfBase64 = Base64.getEncoder().encodeToString(fileBytes);

        ContentBlockParam documentBlock = ContentBlockParam.ofDocument(
                DocumentBlockParam.builder()
                        .source(Base64PdfSource.builder()
                                .mediaType(Base64PdfSource.MediaType.APPLICATION_PDF)
                                .data(pdfBase64)
                                .build())
                        .build());

        ContentBlockParam textBlock = ContentBlockParam.ofText(
                TextBlockParam.builder()
                        .text("Please summarize this document.")
                        .build());

        MessageCountTokensParams params = MessageCountTokensParams.builder()
                .model(Model.CLAUDE_SONNET_4_20250514)
                .addUserMessageOfBlockParams(List.of(documentBlock, textBlock))
                .build();

        MessageTokensCount count = client.messages().countTokens(params);
        System.out.println(count);
    }
}
```

**Response:**
```json
{ "input_tokens": 2188 }
```

---

## Pricing and Rate Limits

Token counting is **free to use** but subject to requests per minute rate limits based on your usage tier. If you need higher limits, contact sales through the Claude Console.

| Usage tier | Requests per minute (RPM) |
|------------|---------------------------|
| 1          | 100                       |
| 2          | 2,000                     |
| 3          | 4,000                     |
| 4          | 8,000                     |

**Note**: Token counting and message creation have separate and independent rate limits. Usage of one does not count against the limits of the other.

---

## FAQ

**Does token counting use prompt caching?**

No, token counting provides an estimate without using caching logic. While you may provide `cache_control` blocks in your token counting request, prompt caching only occurs during actual message creation.

---

# Vision

Claude's vision capabilities allow it to understand and analyze images, opening up exciting possibilities for multimodal interaction.

This guide describes how to work with images in Claude, including best practices, code examples, and limitations to keep in mind.

---

## How to Use Vision

Use Claude's vision capabilities via:

- **claude.ai**: Upload an image like you would a file, or drag and drop an image directly into the chat window.
- **Console Workbench**: A button to add images appears at the top right of every User message block.
- **API request**: See the examples in this guide.

---

## Before You Upload

### Basics and Limits

You can include multiple images in a single request (up to 20 for claude.ai and 100 for API requests). Claude will analyze all provided images when formulating its response. This can be helpful for comparing or contrasting images.

If you submit an image larger than 8000x8000 px, it will be rejected. If you submit more than 20 images in one API request, this limit is 2000x2000 px.

**Note**: While the API supports 100 images per request, there is a 32MB request size limit for standard endpoints.

### Evaluate Image Size

For optimal performance, we recommend resizing images before uploading if they are too large. If your image's long edge is more than 1568 pixels, or your image is more than ~1,600 tokens, it will first be scaled down, preserving aspect ratio, until it's within the size limits.

If your input image is too large and needs to be resized, it will increase latency without giving you any additional model performance. Very small images under 200 pixels on any given edge may degrade performance.

**Recommendation**: Resize images to no more than 1.15 megapixels (and within 1568 pixels in both dimensions) to improve time-to-first-token.

#### Maximum image sizes for common aspect ratios

These images will not be resized and use approximately 1,600 tokens.

| Aspect ratio | Image size   |
| ------------ | ------------ |
| 1:1          | 1092x1092 px |
| 3:4          | 951x1268 px  |
| 2:3          | 896x1344 px  |
| 9:16         | 819x1456 px  |
| 1:2          | 784x1568 px  |

### Calculate Image Costs

Each image you include in a request to Claude counts towards your token usage. If your image does not need to be resized, you can estimate the number of tokens using this algorithm: `tokens = (width px * height px)/750`

**Example token usage and costs** (based on Claude Sonnet 4.5 at $3 per million input tokens):

| Image size                    | # of Tokens | Cost / image | Cost / 1K images |
| ----------------------------- | ----------- | ------------ | ---------------- |
| 200x200 px (0.04 MP)          | ~54         | ~$0.00016    | ~$0.16           |
| 1000x1000 px (1 MP)           | ~1334       | ~$0.004      | ~$4.00           |
| 1092x1092 px (1.19 MP)        | ~1590       | ~$0.0048     | ~$4.80           |

### Ensuring Image Quality

When providing images to Claude, keep the following in mind for best results:

- **Image format**: Use a supported image format: JPEG, PNG, GIF, or WebP.
- **Image clarity**: Ensure images are clear and not too blurry or pixelated.
- **Text**: If the image contains important text, make sure it's legible and not too small.

---

## Image Sources

Claude supports three ways to provide images to the API:

1. **Base64-encoded images**: Inline image data in requests
2. **URL references**: Links to images hosted online
3. **Files API**: Upload once, use multiple times

---

## Using Base64-Encoded Images

**Python:**
```python
import anthropic
import base64
import httpx

client = anthropic.Anthropic()

# Fetch and encode image
image_url = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
image_data = base64.standard_b64encode(httpx.get(image_url).content).decode("utf-8")

# Send to Claude
message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": "Describe this image."
                }
            ],
        }
    ],
)
print(message.content[0].text)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: imageData, // Base64-encoded image data
          }
        },
        {
          type: "text",
          text: "Describe this image."
        }
      ]
    }
  ]
});

console.log(message.content[0].type === 'text' ? message.content[0].text : '');
```

**Shell:**
```bash
BASE64_IMAGE_DATA=$(curl -s "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg" | base64)

curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "image",
            "source": {
              "type": "base64",
              "media_type": "image/jpeg",
              "data": "'"$BASE64_IMAGE_DATA"'"
            }
          },
          {
            "type": "text",
            "text": "Describe this image."
          }
        ]
      }
    ]
  }'
```

**Java:**
```java
import java.util.List;
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;

public class VisionExample {
    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();
        String imageData = ""; // Base64-encoded image data

        List<ContentBlockParam> contentBlockParams = List.of(
            ContentBlockParam.ofImage(
                ImageBlockParam.builder()
                    .source(Base64ImageSource.builder()
                        .data(imageData)
                        .build())
                    .build()
            ),
            ContentBlockParam.ofText(TextBlockParam.builder()
                .text("Describe this image.")
                .build())
        );

        Message message = client.messages().create(
            MessageCreateParams.builder()
                .model(Model.CLAUDE_SONNET_4_5_LATEST)
                .maxTokens(1024)
                .addUserMessageOfBlockParams(contentBlockParams)
                .build()
        );

        System.out.println(message.content);
    }
}
```

---

## Using URL-Based Images

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg",
                    },
                },
                {
                    "type": "text",
                    "text": "Describe this image."
                }
            ],
        }
    ],
)
print(message.content[0].text)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "url",
            url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
          }
        },
        {
          type: "text",
          text: "Describe this image."
        }
      ]
    }
  ]
});

console.log(message.content[0].type === 'text' ? message.content[0].text : '');
```

---

## Using the Files API

For images you'll use repeatedly or when you want to avoid encoding overhead:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

# Upload the image file
with open("image.jpg", "rb") as f:
    file_upload = client.beta.files.upload(file=("image.jpg", f, "image/jpeg"))

# Use the uploaded file in a message
message = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    betas=["files-api-2025-04-14"],
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "file",
                        "file_id": file_upload.id
                    }
                },
                {
                    "type": "text",
                    "text": "Describe this image."
                }
            ]
        }
    ],
)

print(message.content[0].text if message.content[0].type == 'text' else '')
```

**TypeScript:**
```typescript
import { Anthropic, toFile } from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic();

async function main() {
  // Upload the image file
  const fileUpload = await anthropic.beta.files.upload({
    file: toFile(fs.createReadStream('image.jpg'), undefined, { type: "image/jpeg" })
  }, {
    headers: {
      'anthropic-beta': 'files-api-2025-04-14'
    }
  });

  // Use the uploaded file in a message
  const response = await anthropic.beta.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'file',
              file_id: fileUpload.id
            }
          },
          {
            type: 'text',
            text: 'Describe this image.'
          }
        ]
      }
    ]
  }, {
    headers: {
      'anthropic-beta': 'files-api-2025-04-14'
    }
  });

  console.log(response.content[0].type === 'text' ? response.content[0].text : '');
}

main();
```

---

## Multiple Images

To analyze multiple images, introduce each with descriptive labels and ask Claude to compare or contrast them:

**Python:**
```python
message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Image 1:"
                },
                {
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg",
                    },
                },
                {
                    "type": "text",
                    "text": "Image 2:"
                },
                {
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Iridescent.green.sweat.bee1.jpg",
                    },
                },
                {
                    "type": "text",
                    "text": "How are these images different?"
                }
            ],
        }
    ],
)
```

**TypeScript:**
```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Image 1:"
        },
        {
          type: "image",
          source: {
            type: "url",
            url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
          }
        },
        {
          type: "text",
          text: "Image 2:"
        },
        {
          type: "image",
          source: {
            type: "url",
            url: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Iridescent.green.sweat.bee1.jpg"
          }
        },
        {
          type: "text",
          text: "How are these images different?"
        }
      ]
    }
  ]
});
```

---

## Limitations

While Claude's image understanding capabilities are cutting-edge, there are some limitations to be aware of:

- **People identification**: Claude cannot be used to identify (name) people in images and will refuse to do so.
- **Accuracy**: Claude may hallucinate or make mistakes when interpreting low-quality, rotated, or very small images under 200 pixels.
- **Spatial reasoning**: Claude's spatial reasoning abilities are limited. It may struggle with tasks requiring precise localization or layouts, like reading an analog clock face.
- **Counting**: Claude can give approximate counts of objects but may not be precisely accurate, especially with large numbers of small objects.
- **AI-generated images**: Claude does not know if an image is AI-generated and may be incorrect if asked. Do not rely on it to detect fake images.
- **Inappropriate content**: Claude will not process inappropriate or explicit images that violate the Acceptable Use Policy.
- **Healthcare applications**: While Claude can analyze general medical images, it is not designed to interpret complex diagnostic scans like CTs or MRIs.

Always carefully review and verify Claude's image interpretations, especially for high-stakes use cases.

---

## FAQ

**What image file types does Claude support?**

Claude supports JPEG, PNG, GIF, and WebP image formats:
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

**Can Claude read image URLs?**

Yes, Claude can process images from URLs. Use the "url" source type in your API requests:
```json
{
  "type": "image",
  "source": {
    "type": "url",
    "url": "https://example.com/image.jpg"
  }
}
```

**What are the image file size limits?**

- API: Maximum 5MB per image
- claude.ai: Maximum 10MB per image

Images larger than these limits will be rejected.

**How many images can I include in one request?**

- Messages API: Up to 100 images per request
- claude.ai: Up to 20 images per turn

**Does Claude read image metadata?**

No, Claude does not parse or receive any metadata from images passed to it.

**Can I delete images I've uploaded?**

No. Image uploads are ephemeral and not stored beyond the duration of the API request. Uploaded images are automatically deleted after processing.

**Can Claude generate or edit images?**

No, Claude is an image understanding model only. It can interpret and analyze images, but it cannot generate, produce, edit, manipulate, or create images.

---

# PDF support

Process PDFs with Claude. Extract text, analyze charts, and understand visual content from your documents.

---

You can now ask Claude about any text, pictures, charts, and tables in PDFs you provide. Here's how to send PDFs to Claude:

## PDF requirements and support

**Supported platforms:**
- Claude API
- claude.ai (web)
- Amazon Bedrock

**Supported models:**
- Claude 3.5 Sonnet
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku

**PDF limitations:**
- Maximum file size: 20 MB
- Maximum pages: Typically 500+ pages, depending on file size
- Maximum PDFs per request: Not restricted by Claude, but API request size limits apply
- File format: Standard PDF files only (not encrypted or password-protected)

## Amazon Bedrock specific notes

If using Claude via Amazon Bedrock:
- Use the `document` block type instead of `base64` for PDFs
- Bedrock automatically handles PDF extraction and processing
- Additional compliance considerations may apply depending on your AWS region

## How to send PDFs to Claude

### Method 1: Using a URL

The simplest approach is to provide a publicly accessible URL to your PDF:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "url",
                        "url": "https://example.com/sample.pdf"
                    }
                },
                {
                    "type": "text",
                    "text": "Can you summarize this document?"
                }
            ]
        }
    ]
)

print(message.content[0].text)
```

**TypeScript:**
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "url",
            url: "https://example.com/sample.pdf"
          }
        },
        {
          type: "text",
          text: "Can you summarize this document?"
        }
      ]
    }
  ]
});

console.log(message.content[0].text);
```

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "document",
            "source": {
              "type": "url",
              "url": "https://example.com/sample.pdf"
            }
          },
          {
            "type": "text",
            "text": "Can you summarize this document?"
          }
        ]
      }
    ]
  }'
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.DocumentBlock;
import com.anthropic.models.messages.DocumentBlockUrlSource;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.TextBlock;
import com.anthropic.models.messages.TextBlockParam;
import java.net.URL;

public class PDFUrl {
  public static void main(String[] args) {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    Message message = client.messages().create(MessageCreateParams.builder()
        .model("claude-3-5-sonnet-20241022")
        .maxTokens(1024)
        .addMessage(MessageParam.userMessage(Arrays.asList(
          DocumentBlock.builder()
              .source(DocumentBlockUrlSource.builder()
                  .url(new URL("https://example.com/sample.pdf"))
                  .build())
              .build(),
          TextBlockParam.of(TextBlock.builder()
              .text("Can you summarize this document?")
              .build())
        )))
        .build());

    System.out.println(message.getContent().get(0));
  }
}
```

### Method 2: Base64 encoding

For local files or when URLs aren't accessible, encode your PDF as base64:

**Python:**
```python
import anthropic
import base64

client = anthropic.Anthropic()

# Read and encode the PDF
with open("sample.pdf", "rb") as pdf_file:
    pdf_data = base64.standard_b64encode(pdf_file.read()).decode("utf-8")

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_data,
                    },
                },
                {
                    "type": "text",
                    "text": "What are the key points from this document?"
                }
            ]
        }
    ]
)

print(message.content[0].text)
```

**TypeScript:**
```typescript
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

const pdfData = fs.readFileSync("sample.pdf");
const base64Pdf = pdfData.toString("base64");

const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Pdf
          }
        },
        {
          type: "text",
          text: "What are the key points from this document?"
        }
      ]
    }
  ]
});

console.log(message.content[0].text);
```

**Shell:**
```bash
# Encode PDF to base64
base64 sample.pdf > pdf.b64

# Use the encoded content in your API call
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "document",
            "source": {
              "type": "base64",
              "media_type": "application/pdf",
              "data": "'$(cat pdf.b64)'"
            }
          },
          {
            "type": "text",
            "text": "What are the key points from this document?"
          }
        ]
      }
    ]
  }'
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.DocumentBlock;
import com.anthropic.models.messages.DocumentBlockBase64Source;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.TextBlock;
import com.anthropic.models.messages.TextBlockParam;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Base64;

public class PDFBase64 {
  public static void main(String[] args) throws Exception {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    // Read and encode PDF
    byte[] pdfBytes = Files.readAllBytes(Paths.get("sample.pdf"));
    String base64Pdf = Base64.getEncoder().encodeToString(pdfBytes);

    Message message = client.messages().create(MessageCreateParams.builder()
        .model("claude-3-5-sonnet-20241022")
        .maxTokens(1024)
        .addMessage(MessageParam.userMessage(Arrays.asList(
          DocumentBlock.builder()
              .source(DocumentBlockBase64Source.builder()
                  .mediaType("application/pdf")
                  .data(base64Pdf)
                  .build())
              .build(),
          TextBlockParam.of(TextBlock.builder()
              .text("What are the key points from this document?")
              .build())
        )))
        .build());

    System.out.println(message.getContent().get(0));
  }
}
```

### Method 3: Using the Files API (recommended for production)

The Files API is the recommended approach for production environments:

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

# Upload the PDF
pdf_response = client.beta.files.upload(
    file=open("sample.pdf", "rb"),
)

file_id = pdf_response.id

# Use in messages
message = client.beta.messages.create(
    model="claude-3-5-sonnet-20241022",
    betas=["files-api-2025-04-14"],
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "file",
                        "file_id": file_id,
                    },
                },
                {
                    "type": "text",
                    "text": "Please analyze this document."
                }
            ]
        }
    ]
)

print(message.content[0].text)

# Clean up - delete the file when done
client.beta.files.delete(file_id)
```

**TypeScript:**
```typescript
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic({
  defaultHeaders: {
    "anthropic-beta": "files-api-2025-04-14"
  }
});

// Upload the PDF
const pdfResponse = await client.beta.files.upload({
  file: fs.createReadStream("sample.pdf")
});

const fileId = pdfResponse.id;

// Use in messages
const message = await client.beta.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "file",
            file_id: fileId
          }
        },
        {
          type: "text",
          text: "Please analyze this document."
        }
      ]
    }
  ]
});

console.log(message.content[0].text);

// Clean up
await client.beta.files.delete(fileId);
```

**Shell:**
```bash
# Upload the file
FILE_ID=$(curl -X POST https://api.anthropic.com/v1/files \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -F "file=@sample.pdf" | jq -r '.id')

# Use in message request
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "document",
            "source": {
              "type": "file",
              "file_id": "'$FILE_ID'"
            }
          },
          {
            "type": "text",
            "text": "Please analyze this document."
          }
        ]
      }
    ]
  }'

# Clean up - delete the file
curl -X DELETE https://api.anthropic.com/v1/files/$FILE_ID \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.DocumentBlock;
import com.anthropic.models.messages.DocumentBlockFileSource;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.TextBlock;
import com.anthropic.models.messages.TextBlockParam;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;

public class PDFFilesAPI {
  public static void main(String[] args) throws Exception {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    // Upload the PDF
    var uploadResponse = client.beta().files().upload(
        BetaFileUploadParams.builder()
            .file(Files.newInputStream(Paths.get("sample.pdf")))
            .filename("sample.pdf")
            .build()
    );

    String fileId = uploadResponse.getId();

    // Use in message
    Message message = client.beta().messages().create(
        BetaMessageCreateParams.builder()
            .model("claude-3-5-sonnet-20241022")
            .maxTokens(1024)
            .addMessage(MessageParam.userMessage(Arrays.asList(
              DocumentBlock.builder()
                  .source(DocumentBlockFileSource.builder()
                      .fileId(fileId)
                      .build())
                  .build(),
              TextBlockParam.of(TextBlock.builder()
                  .text("Please analyze this document.")
                  .build())
            )))
            .build()
    );

    System.out.println(message.getContent().get(0));

    // Clean up
    client.beta().files().delete(fileId);
  }
}
```

## How PDF support works

When you send a PDF to Claude:

1. **Extraction**: Claude extracts text, tables, and identifies images within the PDF
2. **Processing**: All content is processed and analyzed by Claude's vision capabilities
3. **Understanding**: Claude understands context between text and visual elements
4. **Analysis**: Claude can answer questions about the entire document or specific sections

## Example use cases

**Document analysis:**
- Summarize research papers or reports
- Extract key information from financial documents
- Analyze contracts and legal documents
- Review technical specifications

**Data extraction:**
- Extract structured data from forms
- Identify and list important details
- Create summaries of multi-page documents
- Find specific information within long documents

**Visual content understanding:**
- Analyze charts and graphs in documents
- Understand diagrams and flowcharts
- Interpret tables and structured data
- Extract information from images embedded in PDFs

**Research and learning:**
- Ask questions about course materials
- Summarize academic papers
- Extract citations and references
- Understand complex visual explanations

## Cost estimation

PDF processing costs the same as standard messages. Token usage includes:
- The text content extracted from the PDF
- Visual content analysis (if your prompt asks about charts, images, etc.)
- Your text prompt

For cost estimates:
- A typical 10-page document might be 3,000-5,000 tokens
- A dense technical document might be 5,000-10,000 tokens
- Use the token counting API to estimate costs before processing large batches

## Optimization strategies

### 1. Be specific in your requests

Instead of:
```
"Summarize this document"
```

Try:
```
"Summarize this document in 3 bullet points, focusing on financial impacts"
```

### 2. Use multiple requests for different analyses

Rather than asking for everything at once, break complex analysis into focused requests to avoid exceeding token limits and reduce costs.

### 3. Extract first, then analyze

For large documents, consider extracting key sections first, then doing deeper analysis on specific parts.

### 4. Combine with prompt caching

For documents you process repeatedly, use prompt caching to avoid reprocessing:

```python
import anthropic

client = anthropic.Anthropic()

pdf_response = client.beta.files.upload(
    file=open("large_document.pdf", "rb"),
)

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "You are a document analyst specialized in extracting insights.",
        },
        {
            "type": "document",
            "source": {
                "type": "file",
                "file_id": pdf_response.id,
            },
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "What are the key findings?"
        }
    ]
)

print(message.content[0].text)
```

### 5. Use batch processing for multiple documents

For processing multiple PDFs, use the Batch API for 50% cost savings:

```python
import anthropic
import json

client = anthropic.Anthropic()

# Prepare batch requests for multiple PDFs
requests = []

for pdf_file in ["document1.pdf", "document2.pdf", "document3.pdf"]:
    pdf_response = client.beta.files.upload(file=open(pdf_file, "rb"))

    requests.append({
        "custom_id": f"pdf_{pdf_file}",
        "params": {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "file",
                                "file_id": pdf_response.id
                            }
                        },
                        {
                            "type": "text",
                            "text": "Summarize this document in 5 sentences."
                        }
                    ]
                }
            ]
        }
    })

# Submit batch
batch_response = client.beta.messages.batches.create(requests=requests)
print(f"Batch ID: {batch_response.id}")
```

## Common questions

**Can Claude process encrypted PDFs?**

No, Claude cannot process encrypted or password-protected PDFs. Remove encryption before sending.

**What if my PDF has unusual formatting?**

Claude handles most PDF formats well, but scanned PDFs (images of text) are processed as images. For best results with scanned documents:
- Use high-resolution scans (300+ DPI)
- Ask specific questions rather than open-ended requests
- Consider OCR processing for very low quality scans

**Can I process PDFs with forms?**

Yes, Claude can analyze form PDFs and extract information from filled forms or help you understand form requirements.

**How long does PDF processing take?**

PDF processing time depends on file size and complexity. Typical processing times:
- Small documents (1-5 pages): <1 second
- Medium documents (5-20 pages): 1-3 seconds
- Large documents (20+ pages): 3-10+ seconds

**Are there limits on PDF complexity?**

While there's no hard limit on complexity, extremely complex PDFs with unusual formatting may be processed less accurately. For best results:
- Use standard PDF creation tools
- Avoid highly compressed or malformed PDFs
- Test with sample sections first for new document types

## Next steps

- Check out the [Files API documentation](/docs/build/files) for production file handling
- Learn about [prompt caching](/docs/build/caching) to optimize repeated PDF analysis
- Explore [batch processing](/docs/build/batch) for cost-effective bulk document analysis
- Review [vision capabilities](/docs/build/vision) for advanced image and chart understanding

---

# Files API

Manage files efficiently in the Claude API without re-uploading content with each request.

---

The Files API lets you upload and manage files to use with the Claude API without re-uploading content with each request. This is particularly useful when using the code execution tool to provide inputs (e.g. datasets and documents) and then download outputs (e.g. charts). You can also use the Files API to prevent having to continually re-upload frequently used documents and images across multiple API calls.

## Supported models

Referencing a `file_id` in a Messages request is supported in all models that support the given file type:
- **Images**: Supported in all Claude 3+ models
- **PDFs**: Supported in all Claude 3.5+ models
- **Various file types**: For code execution tool in Claude Haiku 4.5 and all Claude 3.7+ models

The Files API is currently not supported on Amazon Bedrock or Google Vertex AI.

## How the Files API works

The Files API provides a simple create-once, use-many-times approach:

- **Upload files** to secure storage and receive a unique `file_id`
- **Download files** created from skills or the code execution tool
- **Reference files** in Messages requests using the `file_id` instead of re-uploading
- **Manage files** with list, retrieve, and delete operations

### Beta note

To use the Files API, include the beta feature header: `anthropic-beta: files-api-2025-04-14`

## How to use the Files API

### Uploading a file

Upload a file to be referenced in future API calls:

**Shell:**
```bash
curl -X POST https://api.anthropic.com/v1/files \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14" \
  -F "file=@/path/to/document.pdf"
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()
client.beta.files.upload(
  file=("document.pdf", open("/path/to/document.pdf", "rb"), "application/pdf"),
)
```

**TypeScript:**
```typescript
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import fs from "fs";

const anthropic = new Anthropic();

await anthropic.beta.files.upload({
  file: await toFile(fs.createReadStream('/path/to/document.pdf'), undefined, { type: 'application/pdf' })
}, {
  betas: ['files-api-2025-04-14']
});
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

public class UploadFile {
  public static void main(String[] args) throws Exception {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    var uploadResponse = client.beta().files().upload(
        BetaFileUploadParams.builder()
            .file(Files.newInputStream(Paths.get("/path/to/document.pdf")))
            .filename("document.pdf")
            .build()
    );

    System.out.println("File ID: " + uploadResponse.getId());
  }
}
```

The response from uploading a file includes:

```json
{
  "id": "file_011CNha8iCJcU1wXNR6q4V8w",
  "type": "file",
  "filename": "document.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 1024000,
  "created_at": "2025-01-01T00:00:00Z",
  "downloadable": false
}
```

### Using a file in messages

Once uploaded, reference the file using its `file_id`:

**Shell:**
```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Please summarize this document for me."
          },
          {
            "type": "document",
            "source": {
              "type": "file",
              "file_id": "file_011CNha8iCJcU1wXNR6q4V8w"
            }
          }
        ]
      }
    ]
  }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Please summarize this document for me."
                },
                {
                    "type": "document",
                    "source": {
                        "type": "file",
                        "file_id": "file_011CNha8iCJcU1wXNR6q4V8w"
                    }
                }
            ]
        }
    ],
    betas=["files-api-2025-04-14"],
)
print(response)
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Please summarize this document for me."
        },
        {
          type: "document",
          source: {
            type: "file",
            file_id: "file_011CNha8iCJcU1wXNR6q4V8w"
          }
        }
      ]
    }
  ],
  betas: ["files-api-2025-04-14"],
});

console.log(response);
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.DocumentBlock;
import com.anthropic.models.messages.DocumentBlockFileSource;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.TextBlock;
import com.anthropic.models.messages.TextBlockParam;

public class UseFileInMessage {
  public static void main(String[] args) throws Exception {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    Message response = client.beta().messages().create(
        BetaMessageCreateParams.builder()
            .model("claude-sonnet-4-5")
            .maxTokens(1024)
            .addMessage(MessageParam.userMessage(Arrays.asList(
              TextBlockParam.of(TextBlock.builder()
                  .text("Please summarize this document for me.")
                  .build()),
              DocumentBlock.builder()
                  .source(DocumentBlockFileSource.builder()
                      .fileId("file_011CNha8iCJcU1wXNR6q4V8w")
                      .build())
                  .build()
            )))
            .build()
    );

    System.out.println(response);
  }
}
```

### File types and content blocks

The Files API supports different file types that correspond to different content block types:

| File Type | MIME Type | Content Block Type | Use Case |
| :--- | :--- | :--- | :--- |
| PDF | `application/pdf` | `document` | Text analysis, document processing |
| Plain text | `text/plain` | `document` | Text analysis, processing |
| Images | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | `image` | Image analysis, visual tasks |
| Datasets, others | Varies | `container_upload` | Analyze data, create visualizations |

### Working with other file formats

For file types not supported as document blocks (.csv, .txt, .md, .docx, .xlsx), convert files to plain text and include the content directly in your message:

**Python:**
```python
import pandas as pd
import anthropic

client = anthropic.Anthropic()

# Example: Reading a CSV file
df = pd.read_csv('data.csv')
csv_content = df.to_string()

# Send as plain text in the message
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"Here's the CSV data:\n\n{csv_content}\n\nPlease analyze this data."
                }
            ]
        }
    ]
)

print(response.content[0].text)
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic();

async function analyzeDocument() {
  // Example: Reading a text file
  const textContent = fs.readFileSync('document.txt', 'utf-8');

  // Send as plain text in the message
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Here's the document content:\n\n${textContent}\n\nPlease summarize this document.`
          }
        ]
      }
    ]
  });

  console.log(response.content[0].text);
}

analyzeDocument();
```

**Shell:**
```bash
# Example: Reading a text file and sending it as plain text
TEXT_CONTENT=$(cat document.txt)

curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Here is the document content:\n\n'"$TEXT_CONTENT"'\n\nPlease summarize this document."
          }
        ]
      }
    ]
  }'
```

**Java:**
```java
import java.nio.file.Files;
import java.nio.file.Paths;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.TextBlock;
import com.anthropic.models.messages.TextBlockParam;

public class AnalyzeTextFile {
  public static void main(String[] args) throws Exception {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    // Read text file
    String textContent = Files.readString(Paths.get("document.txt"));

    Message response = client.messages().create(MessageCreateParams.builder()
        .model("claude-sonnet-4-5")
        .maxTokens(1024)
        .addMessage(MessageParam.userMessage(TextBlockParam.of(TextBlock.builder()
            .text("Here's the document content:\n\n" + textContent + "\n\nPlease summarize this document.")
            .build())))
        .build());

    System.out.println(response);
  }
}
```

#### Document blocks

For PDFs and text files, use the `document` content block:

```json
{
  "type": "document",
  "source": {
    "type": "file",
    "file_id": "file_011CNha8iCJcU1wXNR6q4V8w"
  },
  "title": "Document Title",
  "context": "Context about the document",
  "citations": {"enabled": true}
}
```

#### Image blocks

For images, use the `image` content block:

```json
{
  "type": "image",
  "source": {
    "type": "file",
    "file_id": "file_011CPMxVD3fHLUhvTqtsQA5w"
  }
}
```

## Managing files

### List files

Retrieve a list of your uploaded files:

**Shell:**
```bash
curl https://api.anthropic.com/v1/files \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14"
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()
files = client.beta.files.list()
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();
const files = await anthropic.beta.files.list({
  betas: ['files-api-2025-04-14'],
});
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

public class ListFiles {
  public static void main(String[] args) {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    var files = client.beta().files().list();
    System.out.println(files);
  }
}
```

### Get file metadata

Retrieve information about a specific file:

**Shell:**
```bash
curl https://api.anthropic.com/v1/files/file_011CNha8iCJcU1wXNR6q4V8w \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14"
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()
file = client.beta.files.retrieve_metadata("file_011CNha8iCJcU1wXNR6q4V8w")
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();
const file = await anthropic.beta.files.retrieveMetadata(
  "file_011CNha8iCJcU1wXNR6q4V8w",
  { betas: ['files-api-2025-04-14'] },
);
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

public class GetFileMetadata {
  public static void main(String[] args) {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    var file = client.beta().files().retrieveMetadata("file_011CNha8iCJcU1wXNR6q4V8w");
    System.out.println(file);
  }
}
```

### Delete a file

Remove a file from your workspace:

**Shell:**
```bash
curl -X DELETE https://api.anthropic.com/v1/files/file_011CNha8iCJcU1wXNR6q4V8w \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14"
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()
result = client.beta.files.delete("file_011CNha8iCJcU1wXNR6q4V8w")
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();
const result = await anthropic.beta.files.delete(
  "file_011CNha8iCJcU1wXNR6q4V8w",
  { betas: ['files-api-2025-04-14'] },
);
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

public class DeleteFile {
  public static void main(String[] args) {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    var result = client.beta().files().delete("file_011CNha8iCJcU1wXNR6q4V8w");
    System.out.println(result);
  }
}
```

### Downloading a file

Download files created by skills or the code execution tool:

**Shell:**
```bash
curl -X GET "https://api.anthropic.com/v1/files/file_011CNha8iCJcU1wXNR6q4V8w/content" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14" \
  --output downloaded_file.txt
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()
file_content = client.beta.files.download("file_011CNha8iCJcU1wXNR6q4V8w")

# Save to file
with open("downloaded_file.txt", "w") as f:
    f.write(file_content.decode('utf-8'))
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic();

const fileContent = await anthropic.beta.files.download(
  "file_011CNha8iCJcU1wXNR6q4V8w",
  { betas: ['files-api-2025-04-14'] },
);

// Save to file
fs.writeFileSync("downloaded_file.txt", fileContent);
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import java.nio.file.Files;
import java.nio.file.Paths;

public class DownloadFile {
  public static void main(String[] args) throws Exception {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    var fileContent = client.beta().files().download("file_011CNha8iCJcU1wXNR6q4V8w");

    // Save to file
    Files.write(Paths.get("downloaded_file.txt"), fileContent);
  }
}
```

Note: You can only download files created by skills or the code execution tool. Files that you uploaded cannot be downloaded.

## File storage and limits

### Storage limits

- **Maximum file size:** 500 MB per file
- **Total storage:** 100 GB per organization

### File lifecycle

- Files are scoped to the workspace of the API key. Other API keys can use files created by any other API key in the same workspace
- Files persist until you delete them
- Deleted files cannot be recovered
- Files become inaccessible via the API shortly after deletion, but may persist in active Messages API calls
- Files deleted by users are removed according to the data retention policy

## Error handling

Common errors when using the Files API include:

| Error | Cause | Solution |
| :--- | :--- | :--- |
| File not found (404) | Specified `file_id` doesn't exist or no access | Verify the file_id is correct |
| Invalid file type (400) | File type doesn't match content block type | Ensure image files use `image` blocks, PDFs use `document` blocks |
| Exceeds context window (400) | File larger than context window | Use smaller files or extract specific sections |
| Invalid filename (400) | Filename too long or contains forbidden characters | Use 1-255 character filenames without `< > : " \| ? * \ /` |
| File too large (413) | File exceeds 500 MB limit | Split into smaller files |
| Storage limit exceeded (403) | Organization at 100 GB limit | Delete unused files to free space |

Example error response:

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "File not found: file_011CNha8iCJcU1wXNR6q4V8w"
  }
}
```

## Usage and billing

### Free operations

The following File API operations are **free**:
- Uploading files
- Downloading files
- Listing files
- Getting file metadata
- Deleting files

### Paid operations

File content used in `Messages` requests is priced as input tokens. The file's content counts toward your input token usage.

### Rate limits

During the beta period:
- File-related API calls are limited to approximately 100 requests per minute
- Contact sales if you need higher limits

## Use cases

**Document processing:** Analyze PDFs, extract data, and answer questions about document content without re-uploading

**Data analysis:** Upload CSV or text datasets once, then analyze them across multiple requests

**Code execution:** Upload data files to use as inputs for code execution, then download generated visualizations or reports

**Collaboration:** Share uploaded file IDs with team members to reference the same files across different API calls

**Batch operations:** Upload files once, then use them in batch API requests for efficient processing

## Next steps

- Review the [API reference](/docs/api/files) for detailed endpoint documentation
- Learn about [prompt caching](/docs/build/caching) to optimize repeated file analysis
- Explore [batch processing](/docs/build/batch) for cost-effective bulk file processing
- Check out [code execution](/docs/agents-and-tools/tool-use/code-execution-tool) to process files programmatically

---

# Search results

Enable natural citations for RAG applications by providing search results with source attribution.

---

Search result content blocks enable natural citations with proper source attribution, bringing web search-quality citations to your custom applications. This feature is particularly powerful for RAG (Retrieval-Augmented Generation) applications where you need Claude to cite sources accurately.

## Supported models

The search results feature is available on:

- Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- Claude Opus 4.1 (`claude-opus-4-1-20250805`)
- Claude Opus 4 (`claude-opus-4-20250514`)
- Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- Claude Sonnet 3.7 (deprecated) (`claude-3-7-sonnet-20250219`)
- Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Claude Haiku 3.5 (deprecated) (`claude-3-5-haiku-20241022`)

## Key benefits

- **Natural citations** - Achieve the same citation quality as web search for any content
- **Flexible integration** - Use in tool returns for dynamic RAG or as top-level content for pre-fetched data
- **Proper source attribution** - Each result includes source and title information for clear attribution
- **No document workarounds** - Eliminates the need for document-based workarounds
- **Consistent format** - Matches the citation quality and format of Claude's web search functionality

## How it works

Search results can be provided in two ways:

1. **From tool calls** - Custom tools return search results, enabling dynamic RAG applications
2. **As top-level content** - Provide search results directly in user messages for pre-fetched or cached content

In both cases, Claude automatically cites information from the search results with proper source attribution.

## Search result schema

Search results use the following structure:

```json
{
  "type": "search_result",
  "source": "https://example.com/article",
  "title": "Article Title",
  "content": [
    {
      "type": "text",
      "text": "The actual content of the search result..."
    }
  ],
  "citations": {
    "enabled": true
  }
}
```

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"search_result"` |
| `source` | string | The source URL or identifier for the content |
| `title` | string | A descriptive title for the search result |
| `content` | array | An array of text blocks containing the actual content |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `citations` | object | Citation configuration with `enabled` boolean field |
| `cache_control` | object | Cache control settings (e.g., `{"type": "ephemeral"}`) |

Each item in the `content` array must have:
- `type`: Must be `"text"`
- `text`: The actual text content (non-empty string)

## Method 1: Search results from tool calls

The most powerful use case is returning search results from custom tools. This enables dynamic RAG applications where tools fetch and return relevant content with automatic citations.

### Example: Knowledge base tool

**Python:**
```python
from anthropic import Anthropic
from anthropic.types import (
    MessageParam,
    TextBlockParam,
    SearchResultBlockParam,
    ToolResultBlockParam
)

client = Anthropic()

# Define a knowledge base search tool
knowledge_base_tool = {
    "name": "search_knowledge_base",
    "description": "Search the company knowledge base for information",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query"
            }
        },
        "required": ["query"]
    }
}

# Function to handle the tool call
def search_knowledge_base(query):
    # Your search logic here
    return [
        SearchResultBlockParam(
            type="search_result",
            source="https://docs.company.com/product-guide",
            title="Product Configuration Guide",
            content=[
                TextBlockParam(
                    type="text",
                    text="To configure the product, navigate to Settings > Configuration. The default timeout is 30 seconds, but can be adjusted between 10-120 seconds."
                )
            ],
            citations={"enabled": True}
        ),
        SearchResultBlockParam(
            type="search_result",
            source="https://docs.company.com/troubleshooting",
            title="Troubleshooting Guide",
            content=[
                TextBlockParam(
                    type="text",
                    text="If you encounter timeout errors, check the configuration settings. Common causes include network latency and incorrect timeout values."
                )
            ],
            citations={"enabled": True}
        )
    ]

# Create a message with the tool
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=[knowledge_base_tool],
    messages=[
        MessageParam(
            role="user",
            content="How do I configure the timeout settings?"
        )
    ]
)

# When Claude calls the tool, provide the search results
if response.content[0].type == "tool_use":
    tool_result = search_knowledge_base(response.content[0].input["query"])

    final_response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[
            MessageParam(role="user", content="How do I configure the timeout settings?"),
            MessageParam(role="assistant", content=response.content),
            MessageParam(
                role="user",
                content=[
                    ToolResultBlockParam(
                        type="tool_result",
                        tool_use_id=response.content[0].id,
                        content=tool_result
                    )
                ]
            )
        ]
    )

    print(final_response.content[0].text)
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Define a knowledge base search tool
const knowledgeBaseTool = {
  name: "search_knowledge_base",
  description: "Search the company knowledge base for information",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query"
      }
    },
    required: ["query"]
  }
};

// Function to handle the tool call
function searchKnowledgeBase(query: string) {
  return [
    {
      type: "search_result" as const,
      source: "https://docs.company.com/product-guide",
      title: "Product Configuration Guide",
      content: [
        {
          type: "text" as const,
          text: "To configure the product, navigate to Settings > Configuration. The default timeout is 30 seconds, but can be adjusted between 10-120 seconds."
        }
      ],
      citations: { enabled: true }
    },
    {
      type: "search_result" as const,
      source: "https://docs.company.com/troubleshooting",
      title: "Troubleshooting Guide",
      content: [
        {
          type: "text" as const,
          text: "If you encounter timeout errors, check the configuration settings. Common causes include network latency and incorrect timeout values."
        }
      ],
      citations: { enabled: true }
    }
  ];
}

// Create a message with the tool
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  tools: [knowledgeBaseTool],
  messages: [
    {
      role: "user",
      content: "How do I configure the timeout settings?"
    }
  ]
});

// Handle tool use and provide results
if (response.content[0].type === "tool_use") {
  const toolResult = searchKnowledgeBase(response.content[0].input.query);

  const finalResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "How do I configure the timeout settings?" },
      { role: "assistant", content: response.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: response.content[0].id,
            content: toolResult
          }
        ]
      }
    ]
  });

  console.log(finalResponse.content[0].text);
}
```

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "tools": [{
      "name": "search_knowledge_base",
      "description": "Search the company knowledge base",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": {"type": "string", "description": "The search query"}
        },
        "required": ["query"]
      }
    }],
    "messages": [{
      "role": "user",
      "content": "How do I configure the timeout settings?"
    }]
  }'
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.TextBlock;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.ToolUseBlock;
import java.util.List;

public class SearchRAG {
  public static void main(String[] args) {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    Tool searchTool = Tool.builder()
        .name("search_knowledge_base")
        .description("Search the company knowledge base")
        .inputSchema(Tool.InputSchema.builder()
            .type("object")
            .properties(Map.of(
                "query", Map.of("type", "string", "description", "The search query")
            ))
            .required(List.of("query"))
            .build())
        .build();

    Message response = client.messages().create(MessageCreateParams.builder()
        .model("claude-sonnet-4-5")
        .maxTokens(1024)
        .tools(List.of(searchTool))
        .addMessage(MessageParam.userMessage("How do I configure the timeout settings?"))
        .build());

    System.out.println(response.getContent());
  }
}
```

## Method 2: Search results as top-level content

Provide search results directly in user messages. This is useful for:
- Pre-fetched content from your search infrastructure
- Cached search results from previous queries
- Content from external search services
- Testing and development

### Example: Direct search results

**Python:**
```python
from anthropic import Anthropic
from anthropic.types import (
    MessageParam,
    TextBlockParam,
    SearchResultBlockParam
)

client = Anthropic()

# Provide search results directly in the user message
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        MessageParam(
            role="user",
            content=[
                SearchResultBlockParam(
                    type="search_result",
                    source="https://docs.company.com/api-reference",
                    title="API Reference - Authentication",
                    content=[
                        TextBlockParam(
                            type="text",
                            text="All API requests must include an API key in the Authorization header. Keys can be generated from the dashboard. Rate limits: 1000 requests per hour for standard tier, 10000 for premium."
                        )
                    ],
                    citations={"enabled": True}
                ),
                SearchResultBlockParam(
                    type="search_result",
                    source="https://docs.company.com/quickstart",
                    title="Getting Started Guide",
                    content=[
                        TextBlockParam(
                            type="text",
                            text="To get started: 1) Sign up for an account, 2) Generate an API key from the dashboard, 3) Install our SDK, 4) Initialize the client with your API key."
                        )
                    ],
                    citations={"enabled": True}
                ),
                TextBlockParam(
                    type="text",
                    text="Based on these search results, how do I authenticate API requests?"
                )
            ]
        )
    ]
)

print(response.content[0].text)
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "search_result" as const,
          source: "https://docs.company.com/api-reference",
          title: "API Reference - Authentication",
          content: [
            {
              type: "text" as const,
              text: "All API requests must include an API key in the Authorization header. Keys can be generated from the dashboard. Rate limits: 1000 requests per hour for standard tier, 10000 for premium."
            }
          ],
          citations: { enabled: true }
        },
        {
          type: "search_result" as const,
          source: "https://docs.company.com/quickstart",
          title: "Getting Started Guide",
          content: [
            {
              type: "text" as const,
              text: "To get started: 1) Sign up for an account, 2) Generate an API key from the dashboard, 3) Install our SDK, 4) Initialize the client with your API key."
            }
          ],
          citations: { enabled: true }
        },
        {
          type: "text" as const,
          text: "Based on these search results, how do I authenticate API requests?"
        }
      ]
    }
  ]
});

console.log(response.content[0].text);
```

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "search_result",
            "source": "https://docs.company.com/api-reference",
            "title": "API Reference - Authentication",
            "content": [
              {
                "type": "text",
                "text": "All API requests must include an API key in the Authorization header. Keys can be generated from the dashboard. Rate limits: 1000 requests per hour for standard tier, 10000 for premium."
              }
            ],
            "citations": {"enabled": true}
          },
          {
            "type": "search_result",
            "source": "https://docs.company.com/quickstart",
            "title": "Getting Started Guide",
            "content": [
              {
                "type": "text",
                "text": "To get started: 1) Sign up for an account, 2) Generate an API key from the dashboard, 3) Install our SDK, 4) Initialize the client with your API key."
              }
            ],
            "citations": {"enabled": true}
          },
          {
            "type": "text",
            "text": "Based on these search results, how do I authenticate API requests?"
          }
        ]
      }
    ]
  }'
```

**Java:**
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import java.util.List;

public class DirectSearchResults {
  public static void main(String[] args) {
    AnthropicClient client = AnthropicOkHttpClient.builder()
        .apiKey(System.getenv("ANTHROPIC_API_KEY"))
        .build();

    Message response = client.messages().create(MessageCreateParams.builder()
        .model("claude-sonnet-4-5")
        .maxTokens(1024)
        .addMessage(MessageParam.userMessage(
            // Search result content here
        ))
        .build());

    System.out.println(response.getContent());
  }
}
```

## Claude's response with citations

Regardless of how search results are provided, Claude automatically includes citations when using information from them:

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "To authenticate API requests, you need to include an API key in the Authorization header",
      "citations": [
        {
          "type": "search_result_location",
          "source": "https://docs.company.com/api-reference",
          "title": "API Reference - Authentication",
          "cited_text": "All API requests must include an API key in the Authorization header",
          "search_result_index": 0,
          "start_block_index": 0,
          "end_block_index": 0
        }
      ]
    },
    {
      "type": "text",
      "text": ". You can generate API keys from your dashboard"
    }
  ]
}
```

### Citation fields

Each citation includes:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"search_result_location"` for search result citations |
| `source` | string | The source from the original search result |
| `title` | string or null | The title from the original search result |
| `cited_text` | string | The exact text being cited |
| `search_result_index` | integer | Index of the search result (0-based) |
| `start_block_index` | integer | Starting position in the content array |
| `end_block_index` | integer | Ending position in the content array |

## Advanced usage

### Multiple content blocks

Search results can contain multiple text blocks in the `content` array:

```json
{
  "type": "search_result",
  "source": "https://docs.company.com/api-guide",
  "title": "API Documentation",
  "content": [
    {
      "type": "text",
      "text": "Authentication: All API requests require an API key."
    },
    {
      "type": "text",
      "text": "Rate Limits: The API allows 1000 requests per hour per key."
    },
    {
      "type": "text",
      "text": "Error Handling: The API returns standard HTTP status codes."
    }
  ]
}
```

Claude can cite specific blocks using the `start_block_index` and `end_block_index` fields.

### Combining both methods

You can use both tool-based and top-level search results in the same conversation:

```python
# First message with top-level search results
messages = [
    MessageParam(
        role="user",
        content=[
            SearchResultBlockParam(
                type="search_result",
                source="https://docs.company.com/overview",
                title="Product Overview",
                content=[
                    TextBlockParam(type="text", text="Our product helps teams collaborate...")
                ],
                citations={"enabled": True}
            ),
            TextBlockParam(
                type="text",
                text="Tell me about this product and search for pricing information"
            )
        ]
    )
]

# Claude might respond and call a tool to search for pricing
# Then you provide tool results with more search results
```

### Cache control

Add cache control for better performance:

```json
{
  "type": "search_result",
  "source": "https://docs.company.com/guide",
  "title": "User Guide",
  "content": [{"type": "text", "text": "..."}],
  "cache_control": {
    "type": "ephemeral"
  }
}
```

### Citation configuration

By default, citations are disabled for search results. Enable them explicitly:

```json
{
  "type": "search_result",
  "source": "https://docs.company.com/guide",
  "title": "User Guide",
  "content": [{"type": "text", "text": "Important documentation..."}],
  "citations": {
    "enabled": true
  }
}
```

When `citations.enabled` is set to `true`, Claude will include citation references when using information from the search result. This enables:
- Natural citations for custom RAG applications
- Source attribution for proprietary knowledge bases
- Web search-quality citations for custom tool returns

Note: Citations are all-or-nothing. Either all search results in a request must have citations enabled, or all must have them disabled. Mixing different citation settings will result in an error.

## Best practices

### For tool-based search

- **Dynamic content**: Use for real-time searches and dynamic RAG applications
- **Error handling**: Return appropriate messages when searches fail
- **Result limits**: Return only the most relevant results to avoid context overflow
- **Structured responses**: Format results consistently for better citation quality

### For top-level search

- **Pre-fetched content**: Use when you already have search results from your infrastructure
- **Batch processing**: Ideal for processing multiple search results at once
- **Testing**: Great for testing citation behavior with known content

### General best practices

1. **Structure results effectively**
   - Use clear, permanent source URLs
   - Provide descriptive titles
   - Break long content into logical text blocks

2. **Maintain consistency**
   - Use consistent source formats across your application
   - Ensure titles accurately reflect content
   - Keep formatting consistent

3. **Handle errors gracefully**
   ```python
   def search_with_fallback(query):
       try:
           results = perform_search(query)
           if not results:
               return {"type": "text", "text": "No results found."}
           return format_as_search_results(results)
       except Exception as e:
           return {"type": "text", "text": f"Search error: {str(e)}"}
   ```

## Limitations

- Search result content blocks available on Claude API, Amazon Bedrock, and Google Vertex AI
- Only text content is supported within search results (no images or other media)
- The `content` array must contain at least one text block
- Citations must be uniform: either all enabled or all disabled across search results in a request

## Use cases

**Custom knowledge bases**: Provide citations for proprietary documentation and internal resources

**Document retrieval**: Create RAG applications that cite specific documents and sections

**Search integration**: Return web search or custom search results with proper attribution

**Research assistance**: Build tools that help users find and cite academic or technical resources

**FAQ systems**: Provide accurate citations when answering questions from knowledge bases

**Multi-source synthesis**: Combine information from multiple sources with clear attribution

## Next steps

- Learn about [tool use](/docs/build/tool-use) to create custom search tools
- Explore [prompt caching](/docs/build/caching) to optimize repeated searches
- Check out [batch processing](/docs/build/batch) for cost-effective bulk operations
- Review [vision capabilities](/docs/build/vision) to enhance search results with image analysis

---

# Structured outputs

Get validated JSON results from agent workflows.

---

Structured outputs constrain Claude's responses to follow a specific schema, ensuring valid, parseable output for downstream processing. Two complementary features are available:

- **JSON outputs** (`output_format`): Get Claude's response in a specific JSON format
- **Strict tool use** (`strict: true`): Guarantee schema validation on tool names and inputs

These features can be used independently or together in the same request.

## Status

Structured outputs are currently available as a public beta feature in the Claude API for:
- Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Claude Opus 4.1 (`claude-opus-4-1-20250805`)
- Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)

To use the feature, set the beta header `structured-outputs-2025-11-13`.

## Why use structured outputs

Without structured outputs, Claude can generate malformed JSON responses or invalid tool inputs that break your applications. Even with careful prompting, you may encounter:
- Parsing errors from invalid JSON syntax
- Missing required fields
- Inconsistent data types
- Schema violations requiring error handling and retries

Structured outputs guarantee schema-compliant responses through constrained decoding:
- **Always valid**: No more JSON parse errors
- **Type safe**: Guaranteed field types and required fields
- **Reliable**: No retries needed for schema violations

## JSON outputs

JSON outputs control Claude's response format, ensuring Claude returns valid JSON matching your schema. Use JSON outputs when you need to:
- Control Claude's response format
- Extract data from images or text
- Generate structured reports
- Format API responses

### Quick start

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: structured-outputs-2025-11-13" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Extract the key information from this email: John Smith (john@example.com) is interested in our Enterprise plan and wants to schedule a demo for next Tuesday at 2pm."
      }
    ],
    "output_format": {
      "type": "json_schema",
      "schema": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "email": {"type": "string"},
          "plan_interest": {"type": "string"},
          "demo_requested": {"type": "boolean"}
        },
        "required": ["name", "email", "plan_interest", "demo_requested"],
        "additionalProperties": false
      }
    }
  }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    betas=["structured-outputs-2025-11-13"],
    messages=[
        {
            "role": "user",
            "content": "Extract the key information from this email: John Smith (john@example.com) is interested in our Enterprise plan and wants to schedule a demo for next Tuesday at 2pm."
        }
    ],
    output_format={
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string"},
                "plan_interest": {"type": "string"},
                "demo_requested": {"type": "boolean"}
            },
            "required": ["name", "email", "plan_interest", "demo_requested"],
            "additionalProperties": False
        }
    }
)
print(response.content[0].text)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await client.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  betas: ["structured-outputs-2025-11-13"],
  messages: [
    {
      role: "user",
      content: "Extract the key information from this email: John Smith (john@example.com) is interested in our Enterprise plan and wants to schedule a demo for next Tuesday at 2pm."
    }
  ],
  output_format: {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        plan_interest: { type: "string" },
        demo_requested: { type: "boolean" }
      },
      required: ["name", "email", "plan_interest", "demo_requested"],
      additionalProperties: false
    }
  }
});
console.log(response.content[0].text);
```

**Response format:** Valid JSON matching your schema

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "plan_interest": "Enterprise",
  "demo_requested": true
}
```

### How it works

1. **Define your JSON schema** - Create a JSON schema describing the structure you want Claude to follow
2. **Add the output_format parameter** - Include the `output_format` parameter with your schema
3. **Include the beta header** - Add `anthropic-beta: structured-outputs-2025-11-13`
4. **Parse the response** - Claude's response will be valid JSON matching your schema

### Using Pydantic and Zod

For Python and TypeScript developers, use familiar schema tools like Pydantic and Zod instead of raw JSON schemas.

**Python with Pydantic:**
```python
from pydantic import BaseModel
import anthropic

class ContactInfo(BaseModel):
    name: str
    email: str
    plan_interest: str
    demo_requested: bool

client = anthropic.Anthropic()

# Using parse() method (recommended)
response = client.beta.messages.parse(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    betas=["structured-outputs-2025-11-13"],
    messages=[
        {
            "role": "user",
            "content": "Extract the key information from this email: John Smith (john@example.com) is interested in our Enterprise plan and wants to schedule a demo for next Tuesday at 2pm."
        }
    ],
    output_format=ContactInfo,
)

# Access parsed output directly
contact = response.parsed_output
print(contact.name, contact.email)
```

**TypeScript with Zod:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

const ContactInfoSchema = z.object({
  name: z.string(),
  email: z.string(),
  plan_interest: z.string(),
  demo_requested: z.boolean(),
});

const client = new Anthropic();

const response = await client.beta.messages.parse({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  betas: ["structured-outputs-2025-11-13"],
  messages: [
    {
      role: "user",
      content: "Extract the key information from this email: John Smith (john@example.com) is interested in our Enterprise plan and wants to schedule a demo for next Tuesday at 2pm."
    }
  ],
  output_format: betaZodOutputFormat(ContactInfoSchema),
});

// Automatically parsed and validated
console.log(response.parsed_output);
```

### Common use cases

**Data extraction:**
```python
from pydantic import BaseModel
from typing import List

class Invoice(BaseModel):
    invoice_number: str
    date: str
    total_amount: float
    customer_name: str

response = client.beta.messages.parse(
    model="claude-sonnet-4-5",
    betas=["structured-outputs-2025-11-13"],
    output_format=Invoice,
    messages=[{"role": "user", "content": f"Extract invoice data from: {invoice_text}"}]
)
```

**Classification:**
```python
from pydantic import BaseModel
from typing import List

class Classification(BaseModel):
    category: str
    confidence: float
    tags: List[str]
    sentiment: str

response = client.beta.messages.parse(
    model="claude-sonnet-4-5",
    betas=["structured-outputs-2025-11-13"],
    output_format=Classification,
    messages=[{"role": "user", "content": f"Classify this feedback: {feedback_text}"}]
)
```

**API response formatting:**
```python
from pydantic import BaseModel
from typing import List, Optional

class APIResponse(BaseModel):
    status: str
    data: dict
    errors: Optional[List[dict]] = None
    metadata: dict

response = client.beta.messages.parse(
    model="claude-sonnet-4-5",
    betas=["structured-outputs-2025-11-13"],
    output_format=APIResponse,
    messages=[{"role": "user", "content": "Process this request: ..."}]
)
```

## Strict tool use

Strict tool use validates tool parameters, ensuring Claude calls your functions with correctly-typed arguments. Use strict tool use when you need to:
- Validate tool parameters
- Build agentic workflows
- Ensure type-safe function calls
- Handle complex tools with nested properties

### Why strict tool use matters for agents

Building reliable agentic systems requires guaranteed schema conformance. Without strict mode, Claude might return incompatible types (`"2"` instead of `2`) or missing required fields, breaking your functions.

Strict tool use guarantees type-safe parameters:
- Functions receive correctly-typed arguments every time
- No need to validate and retry tool calls
- Production-ready agents that work consistently at scale

### Quick start

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: structured-outputs-2025-11-13" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "What is the weather in San Francisco?"}
    ],
    "tools": [{
      "name": "get_weather",
      "description": "Get the current weather in a given location",
      "strict": true,
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state, e.g. San Francisco, CA"
          },
          "unit": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"]
          }
        },
        "required": ["location"],
        "additionalProperties": false
      }
    }]
  }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    betas=["structured-outputs-2025-11-13"],
    messages=[
        {"role": "user", "content": "What's the weather like in San Francisco?"}
    ],
    tools=[
        {
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "strict": True,
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"]
                    }
                },
                "required": ["location"],
                "additionalProperties": False
            }
        }
    ]
)
print(response.content)
```

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await client.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  betas: ["structured-outputs-2025-11-13"],
  messages: [
    {
      role: "user",
      content: "What's the weather like in San Francisco?"
    }
  ],
  tools: [{
    name: "get_weather",
    description: "Get the current weather in a given location",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA"
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"]
        }
      },
      required: ["location"],
      additionalProperties: false
    }
  }]
});
console.log(response.content);
```

**Response format:** Tool use blocks with validated inputs

```json
{
  "type": "tool_use",
  "name": "get_weather",
  "input": {
    "location": "San Francisco, CA"
  }
}
```

### How it works

1. **Define your tool schema** - Create a JSON schema for your tool's `input_schema`
2. **Add strict: true** - Set `"strict": true` in your tool definition
3. **Include the beta header** - Add `anthropic-beta: structured-outputs-2025-11-13`
4. **Handle tool calls** - Claude's tool inputs will strictly follow your schema

### Agentic workflow with validated tools

**Python:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["structured-outputs-2025-11-13"],
    messages=[{"role": "user", "content": "Help me plan a trip to Paris for 2 people"}],
    tools=[
        {
            "name": "search_flights",
            "strict": True,
            "input_schema": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string"},
                    "destination": {"type": "string"},
                    "departure_date": {"type": "string", "format": "date"},
                    "travelers": {"type": "integer", "enum": [1, 2, 3, 4, 5, 6]}
                },
                "required": ["origin", "destination", "departure_date"],
                "additionalProperties": False
            }
        },
        {
            "name": "search_hotels",
            "strict": True,
            "input_schema": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "check_in": {"type": "string", "format": "date"},
                    "guests": {"type": "integer", "enum": [1, 2, 3, 4]}
                },
                "required": ["city", "check_in"],
                "additionalProperties": False
            }
        }
    ]
)
```

## Using both features together

JSON outputs and strict tool use solve different problems and can be used together:
- **JSON outputs** control Claude's response format (what Claude says)
- **Strict tool use** validates tool parameters (how Claude calls your functions)

When combined, Claude can call tools with guaranteed-valid parameters AND return structured JSON responses.

**Python:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["structured-outputs-2025-11-13"],
    max_tokens=1024,
    messages=[{"role": "user", "content": "Help me plan a trip to Paris for next month"}],
    # JSON outputs: structured response format
    output_format={
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "next_steps": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["summary", "next_steps"],
            "additionalProperties": False
        }
    },
    # Strict tool use: guaranteed tool parameters
    tools=[{
        "name": "search_flights",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "destination": {"type": "string"},
                "date": {"type": "string", "format": "date"}
            },
            "required": ["destination", "date"],
            "additionalProperties": False
        }
    }]
)
```

## Performance and caching

### Grammar compilation

Structured outputs use constrained sampling with compiled grammar artifacts:
- **First request latency**: Initial use of a schema has additional latency during grammar compilation
- **Automatic caching**: Compiled grammars are cached for 24 hours, making subsequent requests faster
- **Cache invalidation**: Cache is invalidated if you change:
  - The JSON schema structure
  - The set of tools in your request
  - Note: Changing only `name` or `description` does not invalidate the cache

### Token costs

When using structured outputs, Claude receives an additional system prompt explaining the output format:
- Your input token count will be slightly higher
- The injected prompt costs tokens like any other system prompt
- Changing `output_format` invalidates any prompt cache for that conversation

## JSON Schema support

Structured outputs support standard JSON Schema with limitations.

### Supported features

- All basic types: object, array, string, integer, number, boolean, null
- `enum` (strings, numbers, bools, nulls only)
- `const`
- `anyOf` and `allOf` (with limitations)
- `$ref`, `$def`, `definitions`
- String formats: `date-time`, `time`, `date`, `duration`, `email`, `hostname`, `uri`, `ipv4`, `ipv6`, `uuid`
- Array `minItems` (values 0 and 1 only)
- `required` and `additionalProperties` (must be `false` for objects)

### Not supported

- Recursive schemas
- Complex types within enums
- External `$ref`
- Numerical constraints (`minimum`, `maximum`, `multipleOf`)
- String constraints (`minLength`, `maxLength`)
- Array constraints beyond `minItems` of 0 or 1
- `additionalProperties` other than `false`
- Backreferences and lookahead/lookbehind in regex
- Word boundaries in regex patterns

## Feature compatibility

**Works with:**
- Batch processing (50% cost discount)
- Token counting
- Streaming
- Combined usage (JSON outputs + strict tool use together)

**Incompatible with:**
- Citations (returns 400 error if citations enabled with `output_format`)
- Message prefilling (incompatible with JSON outputs)

## Error handling

### Refusals

If Claude refuses a request for safety reasons:
- Response has `stop_reason: "refusal"`
- You receive 200 status code
- You're billed for generated tokens
- Output may not match your schema

### Token limit reached

If response is cut off at `max_tokens`:
- Response has `stop_reason: "max_tokens"`
- Output may be incomplete and not match schema
- Retry with higher `max_tokens`

### Schema validation errors

Common error scenarios:

| Error | Cause | Solution |
|-------|-------|----------|
| "Too many recursive definitions" | Excessive cyclic definitions | Simplify schema, reduce nesting |
| "Schema is too complex" | Exceeds complexity limits | Break into smaller schemas, reduce strict tools |
| Invalid schema | Unsupported features used | Use only supported JSON Schema features |

## Use cases

**Structured data extraction**: Extract information from emails, documents, or images with guaranteed JSON output

**Agentic workflows**: Build reliable multi-step agents with validated tool calls

**Report generation**: Create structured reports with guaranteed format compliance

**Classification systems**: Classify content with validated categories and metadata

**API integration**: Generate API-ready responses with guaranteed schema compliance

**Workflow automation**: Extract and route information to downstream systems without validation

## Next steps

- Learn about [tool use](/docs/build/tool-use) for advanced agent patterns
- Explore [batch processing](/docs/build/batch) to use structured outputs at scale
- Check out [extended thinking](/docs/build/extended-thinking) for complex reasoning with structured outputs
- Review [streaming](/docs/build/streaming) to stream structured outputs
