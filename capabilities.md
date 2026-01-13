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
