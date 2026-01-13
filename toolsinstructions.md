# Tool use with Claude

---

Claude is capable of interacting with tools and functions, allowing you to extend Claude's capabilities to perform a wider variety of tasks.

**Guarantee schema conformance with strict tool use**

Structured Outputs provides guaranteed schema validation for tool inputs. Add `strict: true` to your tool definitions to ensure Claude's tool calls always match your schema exactly—no more type mismatches or missing fields.

Perfect for production agents where invalid tool parameters would cause failures.

Here's an example of how to provide tools to Claude using the Messages API:

```bash Shell
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
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
        "content": "What is the weather like in San Francisco?"
      }
    ]
  }'
```

```python Python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
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
    messages=[{"role": "user", "content": "What's the weather like in San Francisco?"}],
)
print(response)
```

```typescript TypeScript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function main() {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [{
      name: "get_weather",
      description: "Get the current weather in a given location",
      input_schema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA"
          }
        },
        required: ["location"]
      }
    }],
    messages: [{
      role: "user",
      content: "Tell me the weather in San Francisco."
    }]
  });

  console.log(response);
}

main().catch(console.error);
```

---

## How tool use works

Claude supports two types of tools:

1. **Client tools**: Tools that execute on your systems, which include:
   - User-defined custom tools that you create and implement
   - Anthropic-defined tools like computer use and text editor that require client implementation

2. **Server tools**: Tools that execute on Anthropic's servers, like the web search and web fetch tools. These tools must be specified in the API request but don't require implementation on your part.

**Note:** Anthropic-defined tools use versioned types (e.g., `web_search_20250305`, `text_editor_20250124`) to ensure compatibility across model versions.

### Client tools
Integrate client tools with Claude in these steps:

1. **Provide Claude with tools and a user prompt**
   - Define client tools with names, descriptions, and input schemas in your API request.
   - Include a user prompt that might require these tools, e.g., "What's the weather in San Francisco?"

2. **Claude decides to use a tool**
   - Claude assesses if any tools can help with the user's query.
   - If yes, Claude constructs a properly formatted tool use request.
   - For client tools, the API response has a `stop_reason` of `tool_use`, signaling Claude's intent.

3. **Execute the tool and return results**
   - Extract the tool name and input from Claude's request
   - Execute the tool code on your system
   - Return the results in a new `user` message containing a `tool_result` content block

4. **Claude uses tool result to formulate a response**
   - Claude analyzes the tool results to craft its final response to the original user prompt.

Note: Steps 3 and 4 are optional. For some workflows, Claude's tool use request (step 2) might be all you need, without sending results back to Claude.

### Server tools

Server tools follow a different workflow:

1. **Provide Claude with tools and a user prompt**
   - Server tools, like web search and web fetch, have their own parameters.
   - Include a user prompt that might require these tools, e.g., "Search for the latest news about AI" or "Analyze the content at this URL."

2. **Claude executes the server tool**
   - Claude assesses if a server tool can help with the user's query.
   - If yes, Claude executes the tool, and the results are automatically incorporated into Claude's response.

3. **Claude uses the server tool result to formulate a response**
   - Claude analyzes the server tool results to craft its final response to the original user prompt.
   - No additional user interaction is needed for server tool execution.

---

## Using MCP tools with Claude

If you're building an application that uses the Model Context Protocol (MCP), you can use tools from MCP servers directly with Claude's Messages API. MCP tool definitions use a schema format that's similar to Claude's tool format. You just need to rename `inputSchema` to `input_schema`.

**Don't want to build your own MCP client?** Use the MCP connector to connect directly to remote MCP servers from the Messages API without implementing a client.

### Converting MCP tools to Claude format

When you build an MCP client and call `list_tools()` on an MCP server, you'll receive tool definitions with an `inputSchema` field. To use these tools with Claude, convert them to Claude's format:

```python Python
from mcp import ClientSession

async def get_claude_tools(mcp_session: ClientSession):
    """Convert MCP tools to Claude's tool format."""
    mcp_tools = await mcp_session.list_tools()

    claude_tools = []
    for tool in mcp_tools.tools:
        claude_tools.append({
            "name": tool.name,
            "description": tool.description or "",
            "input_schema": tool.inputSchema  # Rename inputSchema to input_schema
        })

    return claude_tools
```

```typescript TypeScript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function getClaudeTools(mcpClient: Client) {
  // Convert MCP tools to Claude's tool format
  const mcpTools = await mcpClient.listTools();

  return mcpTools.tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema, // Rename inputSchema to input_schema
  }));
}
```

Then pass these converted tools to Claude:

```python Python
import anthropic

client = anthropic.Anthropic()
claude_tools = await get_claude_tools(mcp_session)

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=claude_tools,
    messages=[{"role": "user", "content": "What tools do you have available?"}]
)
```

```typescript TypeScript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const claudeTools = await getClaudeTools(mcpClient);

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  tools: claudeTools,
  messages: [{ role: "user", content: "What tools do you have available?" }],
});
```

When Claude responds with a `tool_use` block, execute the tool on your MCP server using `call_tool()` and return the result to Claude in a `tool_result` block.

For a complete guide to building MCP clients, see the MCP documentation.

---

## Tool use examples

Here are a few code examples demonstrating various tool use patterns and techniques.

### Single tool example

When providing a single tool, Claude will determine whether it's applicable to the user's request.

```bash Shell
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "tools": [{
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "The unit of temperature, either \"celsius\" or \"fahrenheit\""
                }
            },
            "required": ["location"]
        }
    }],
    "messages": [{"role": "user", "content": "What is the weather like in San Francisco?"}]
}'
```

Claude will return a response similar to:

```json JSON
{
  "id": "msg_01Aq9w938a90dw8q",
  "model": "claude-sonnet-4-5",
  "stop_reason": "tool_use",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I'll check the current weather in San Francisco for you."
    },
    {
      "type": "tool_use",
      "id": "toolu_01A09q90qw90lq917835lq9",
      "name": "get_weather",
      "input": {"location": "San Francisco, CA", "unit": "celsius"}
    }
  ]
}
```

You would then need to execute the `get_weather` function with the provided input, and return the result in a new `user` message:

```bash Shell
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
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
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "The unit of temperature, either \"celsius\" or \"fahrenheit\""
                    }
                },
                "required": ["location"]
            }
        }
    ],
    "messages": [
        {
            "role": "user",
            "content": "What is the weather like in San Francisco?"
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": "I'll check the current weather in San Francisco for you."
                },
                {
                    "type": "tool_use",
                    "id": "toolu_01A09q90qw90lq917835lq9",
                    "name": "get_weather",
                    "input": {
                        "location": "San Francisco, CA",
                        "unit": "celsius"
                    }
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
                    "content": "15 degrees"
                }
            ]
        }
    ]
}'
```

This will print Claude's final response, incorporating the weather data:

```json JSON
{
  "id": "msg_01Aq9w938a90dw8q",
  "model": "claude-sonnet-4-5",
  "stop_reason": "stop_sequence",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "The current weather in San Francisco is 15 degrees Celsius (59 degrees Fahrenheit). It's a cool day in the city by the bay!"
    }
  ]
}
```

### Parallel tool use

Claude can call multiple tools in parallel within a single response, which is useful for tasks that require multiple independent operations. When using parallel tools, all `tool_use` blocks are included in a single assistant message, and all corresponding `tool_result` blocks must be provided in the subsequent user message.

**Important**: Tool results must be formatted correctly to avoid API errors and ensure Claude continues using parallel tools.

### Multiple tool example

You can provide Claude with multiple tools to choose from in a single request. Here's an example with both a `get_weather` and a `get_time` tool, along with a user query that asks for both.

In this case, Claude may either:
- Use the tools sequentially (one at a time) — calling `get_weather` first, then `get_time` after receiving the weather result
- Use parallel tool calls — outputting multiple `tool_use` blocks in a single response when the operations are independent

When Claude makes parallel tool calls, you must return all tool results in a single `user` message, with each result in its own `tool_result` block.

### Missing information

If the user's prompt doesn't include enough information to fill all the required parameters for a tool, Claude Opus is much more likely to recognize that a parameter is missing and ask for it. Claude Sonnet may ask, especially when prompted to think before outputting a tool request. But it may also do its best to infer a reasonable value.

For example, using the `get_weather` tool above, if you ask Claude "What's the weather?" without specifying a location, Claude, particularly Claude Sonnet, may make a guess about tools inputs:

```json JSON
{
  "type": "tool_use",
  "id": "toolu_01A09q90qw90lq917835lq9",
  "name": "get_weather",
  "input": {"location": "New York, NY", "unit": "fahrenheit"}
}
```

This behavior is not guaranteed, especially for more ambiguous prompts and for less intelligent models. If Claude Opus doesn't have enough context to fill in the required parameters, it is far more likely respond with a clarifying question instead of making a tool call.

### Sequential tools

Some tasks may require calling multiple tools in sequence, using the output of one tool as the input to another. In such a case, Claude will call one tool at a time. If prompted to call the tools all at once, Claude is likely to guess parameters for tools further downstream if they are dependent on tool results for tools further upstream.

Here's an example of using a `get_location` tool to get the user's location, then passing that location to the `get_weather` tool:

The full conversation might look like:

| Role      | Content |
| --------- | ------- |
| User      | What's the weather like where I am? |
| Assistant | I'll find your current location first, then check the weather there. [Tool use for get_location] |
| User      | [Tool result for get_location with matching id and result of San Francisco, CA] |
| Assistant | [Tool use for get_weather with the following input] { "location": "San Francisco, CA", "unit": "fahrenheit" } |
| User      | [Tool result for get_weather with matching id and result of "59°F (15°C), mostly cloudy"] |
| Assistant | Based on your current location in San Francisco, CA, the weather right now is 59°F (15°C) and mostly cloudy. It's a fairly cool and overcast day in the city. You may want to bring a light jacket if you're heading outside. |

This example demonstrates how Claude can chain together multiple tool calls to answer a question that requires gathering data from different sources. The key steps are:

1. Claude first realizes it needs the user's location to answer the weather question, so it calls the `get_location` tool.
2. The user (i.e. the client code) executes the actual `get_location` function and returns the result "San Francisco, CA" in a `tool_result` block.
3. With the location now known, Claude proceeds to call the `get_weather` tool, passing in "San Francisco, CA" as the `location` parameter (as well as a guessed `unit` parameter, as `unit` is not a required parameter).
4. The user again executes the actual `get_weather` function with the provided arguments and returns the weather data in another `tool_result` block.
5. Finally, Claude incorporates the weather data into a natural language response to the original question.

### Chain of thought tool use

By default, Claude Opus is prompted to think before it answers a tool use query to best determine whether a tool is necessary, which tool to use, and the appropriate parameters. Claude Sonnet and Claude Haiku are prompted to try to use tools as much as possible and are more likely to call an unnecessary tool or infer missing parameters. To prompt Sonnet or Haiku to better assess the user query before making tool calls, use this approach:

Before calling a tool, do some analysis:
1. Think about which of the provided tools is the relevant tool to answer the user's request
2. Go through each of the required parameters of the relevant tool and determine if the user has directly provided or given enough information to infer a value
3. When deciding if the parameter can be inferred, carefully consider all the context to see if it supports a specific value
4. If all of the required parameters are present or can be reasonably inferred, proceed with the tool call
5. If one of the values for a required parameter is missing, DO NOT invoke the function and instead ask the user to provide the missing parameters

---

## Pricing

Tool use requests are priced based on:
1. The total number of input tokens sent to the model (including in the `tools` parameter)
2. The number of output tokens generated
3. For server-side tools, additional usage-based pricing (e.g., web search charges per search performed)

Client-side tools are priced the same as any other Claude API request, while server-side tools may incur additional charges based on their specific usage.

The additional tokens from tool use come from:
- The `tools` parameter in API requests (tool names, descriptions, and schemas)
- `tool_use` content blocks in API requests and responses
- `tool_result` content blocks in API requests

When you use `tools`, we also automatically include a special system prompt for the model which enables tool use.

---

## How to implement tool use

This guide covers the practical steps to implement tool use with Claude's API, including how to define tools, structure requests, and handle responses.

### Choosing your model

Tool use works with:
- **Claude 3.5 Sonnet** - Best for general use, balanced performance/cost
- **Claude 3 Opus** - Most capable for complex reasoning
- **Claude 3 Haiku** - Most cost-efficient

We recommend Claude 3.5 Sonnet for most tool use applications.

### Specifying client tools

Define tools in your API request with:
- **name**: Identifier for the tool
- **description**: What the tool does
- **input_schema**: JSON Schema defining the input parameters

Example:
```json
{
  "name": "get_weather",
  "description": "Get the current weather for a location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name"
      },
      "unit": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"]
      }
    },
    "required": ["location"]
  }
}
```

### Best practices for tool definitions

1. **Clear, specific descriptions**: Describe what the tool does, not how it works
2. **Precise parameter descriptions**: Include example values and acceptable ranges
3. **Required parameters only**: Only mark parameters as required when truly necessary
4. **Logical grouping**: If tools are related, use similar naming conventions

Example of a well-defined tool:
```json
{
  "name": "search_documentation",
  "description": "Search the API documentation for information about a specific feature. Use this when users ask questions about how to use our API.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search terms. For example: 'authentication', 'rate limits', 'pagination'"
      },
      "section": {
        "type": "string",
        "enum": ["authentication", "endpoints", "errors", "best-practices"],
        "description": "Documentation section to search in. Omit to search all sections."
      }
    },
    "required": ["query"]
  }
}
```

### Using input_examples (beta)

The `input_examples` field helps Claude understand tool usage patterns:

```json
{
  "name": "send_email",
  "description": "Send an email to a recipient",
  "input_schema": { ... },
  "input_examples": [
    {
      "input": {
        "to": "user@example.com",
        "subject": "Meeting Tomorrow",
        "body": "Let's meet at 2pm"
      }
    },
    {
      "input": {
        "to": "team@company.com",
        "subject": "Project Update",
        "body": "The project is on track..."
      }
    }
  ]
}
```

### Controlling Claude's tool use

#### Force tool use
Make Claude always use a tool:
```python
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[...],
    messages=[...],
    tool_choice={"type": "tool", "name": "get_weather"}
)
```

#### Auto tool use (default)
Let Claude decide:
```python
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[...],
    messages=[...],
    tool_choice={"type": "auto"}  # or omit this line
)
```

#### Disable tool use
```python
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[...],
    messages=[...],
    tool_choice={"type": "disabled"}
)
```

### Tool runners (beta)

Tool runners automatically execute tools on your behalf. Available in beta for Python, TypeScript, and Ruby.

#### Python with tool runner

```python
from anthropic import Anthropic

client = Anthropic()

def get_weather(location: str, unit: str = "celsius") -> str:
    """Get weather for a location"""
    return f"The weather in {location} is 20°{unit}"

def get_time(timezone: str) -> str:
    """Get current time in timezone"""
    return f"Time in {timezone}: 14:30"

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[
        {
            "name": "get_weather",
            "description": "Get the current weather",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
                },
                "required": ["location"]
            }
        },
        {
            "name": "get_time",
            "description": "Get the current time",
            "input_schema": {
                "type": "object",
                "properties": {
                    "timezone": {"type": "string"}
                },
                "required": ["timezone"]
            }
        }
    ],
    messages=[{"role": "user", "content": "What's the weather in SF and time in New York?"}],
    tool_runner={
        "get_weather": get_weather,
        "get_time": get_time
    }
)

print(response.content)
```

#### TypeScript with tool runner

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

function getWeather(location: string, unit: string = "celsius"): string {
  return `The weather in ${location} is 20°${unit}`;
}

function getTime(timezone: string): string {
  return `Time in ${timezone}: 14:30`;
}

const response = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  tools: [
    {
      name: "get_weather",
      description: "Get the current weather",
      input_schema: {
        type: "object",
        properties: {
          location: { type: "string" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] }
        },
        required: ["location"]
      }
    },
    {
      name: "get_time",
      description: "Get the current time",
      input_schema: {
        type: "object",
        properties: {
          timezone: { type: "string" }
        },
        required: ["timezone"]
      }
    }
  ],
  messages: [
    {
      role: "user",
      content: "What's the weather in SF and time in New York?"
    }
  ],
  toolRunner: {
    getWeather,
    getTime
  }
});

console.log(response.content);
```

### Handling tool use and results

When Claude responds with `stop_reason: "tool_use"`:

1. Extract tool calls from the response
2. Execute the tools
3. Return results in a new message with `tool_result` content blocks

Example flow:

```python
messages = [{"role": "user", "content": "What's the weather in San Francisco?"}]

while True:
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        tools=tools,
        messages=messages
    )

    if response.stop_reason == "tool_use":
        # Process tool calls
        tool_calls = [block for block in response.content if block.type == "tool_use"]

        # Add assistant response to messages
        messages.append({"role": "assistant", "content": response.content})

        # Execute tools and collect results
        tool_results = []
        for tool_call in tool_calls:
            result = execute_tool(tool_call.name, tool_call.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_call.id,
                "content": result
            })

        # Add tool results to messages
        messages.append({"role": "user", "content": tool_results})
    else:
        # Claude has finished
        break

print(response.content[0].text)
```

### Parallel tool use

Claude can call multiple tools in a single response:

```python
# Claude calls both tools in one response
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[get_weather_tool, get_time_tool],
    messages=[
        {
            "role": "user",
            "content": "What's the weather in SF and NYC, and what time is it in London?"
        }
    ]
)

# If stop_reason is "tool_use", Claude made multiple tool calls
# Return all results in a single user message:
messages = [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": response.content}
]

tool_results = []
for tool_call in [b for b in response.content if b.type == "tool_use"]:
    result = execute_tool(tool_call.name, tool_call.input)
    tool_results.append({
        "type": "tool_result",
        "tool_use_id": tool_call.id,
        "content": result
    })

messages.append({"role": "user", "content": tool_results})
```

### Error handling

Handle tool execution failures gracefully:

```python
try:
    result = execute_tool(tool_call.name, tool_call.input)
except Exception as e:
    # Return error as tool result
    tool_result = {
        "type": "tool_result",
        "tool_use_id": tool_call.id,
        "content": f"Error executing tool: {str(e)}",
        "is_error": True
    }
```

### Troubleshooting

**Claude isn't using tools**
- Ensure tools are provided in the request
- Check that the user prompt relates to available tools
- Try forcing tool use with `tool_choice`
- Use Claude 3.5 Sonnet or Opus for better tool use

**Tool not returning expected results**
- Verify tool definitions (especially input_schema)
- Check that tool parameters are correct
- Add examples to help Claude understand usage

**High token usage**
- Minimize tool descriptions to essentials
- Don't include unused tools
- Use specific prompts that don't require multiple tool calls

**Tool calls in wrong order**
- Claude determines the optimal order
- If you need a specific order, use sequential tool calls
- Return results from previous call before requesting next call

---

## Fine-grained tool streaming

Tool use now supports fine-grained streaming for parameter values. This allows developers to stream tool use parameters without buffering or JSON validation, reducing the latency to begin receiving large parameters.

Fine-grained tool streaming is available via the Claude API, AWS Bedrock, Google Cloud's Vertex AI, and Microsoft Foundry.

**Note:** Fine-grained tool streaming is a beta feature. Please evaluate responses before using in production.

**Warning:** When using fine-grained tool streaming, you may receive invalid or partial JSON inputs. Account for these edge cases in your code.

### How to use fine-grained tool streaming

To use this beta feature, add the beta header `fine-grained-tool-streaming-2025-05-14` to a tool use request and enable streaming.

#### Shell example

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: fine-grained-tool-streaming-2025-05-14" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 65536,
    "tools": [
      {
        "name": "make_file",
        "description": "Write text to a file",
        "input_schema": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "description": "The filename to write text to"
            },
            "lines_of_text": {
              "type": "array",
              "description": "An array of lines of text to write to the file"
            }
          },
          "required": ["filename", "lines_of_text"]
        }
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "Can you write a long poem and make a file called poem.txt?"
      }
    ],
    "stream": true
  }' | jq '.usage'
```

#### Python example

```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.stream(
    max_tokens=65536,
    model="claude-sonnet-4-5",
    tools=[{
      "name": "make_file",
      "description": "Write text to a file",
      "input_schema": {
        "type": "object",
        "properties": {
          "filename": {
            "type": "string",
            "description": "The filename to write text to"
          },
          "lines_of_text": {
            "type": "array",
            "description": "An array of lines of text to write to the file"
          }
        },
        "required": ["filename", "lines_of_text"]
      }
    }],
    messages=[{
      "role": "user",
      "content": "Can you write a long poem and make a file called poem.txt?"
    }],
    betas=["fine-grained-tool-streaming-2025-05-14"]
)

print(response.usage)
```

#### TypeScript example

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const message = await anthropic.beta.messages.stream({
  model: "claude-sonnet-4-5",
  max_tokens: 65536,
  tools: [{
    "name": "make_file",
    "description": "Write text to a file",
    "input_schema": {
      "type": "object",
      "properties": {
        "filename": {
          "type": "string",
          "description": "The filename to write text to"
        },
        "lines_of_text": {
          "type": "array",
          "description": "An array of lines of text to write to the file"
        }
      },
      "required": ["filename", "lines_of_text"]
    }
  }],
  messages: [{
    role: "user",
    content: "Can you write a long poem and make a file called poem.txt?"
  }],
  betas: ["fine-grained-tool-streaming-2025-05-14"]
});

console.log(message.usage);
```

### Streaming behavior

Fine-grained tool streaming enables Claude to stream large parameter values without buffering to validate JSON. This means you can see parameters stream as they arrive without waiting for the entire parameter to buffer.

**Chunking differences:**

With fine-grained streaming, tool use chunks start streaming faster and are often longer with fewer word breaks:

**Without fine-grained streaming (15s delay):**
```
Chunk 1: '{"'
Chunk 2: 'query": "Ty'
Chunk 3: 'peScri'
Chunk 4: 'pt 5.0 5.1 '
Chunk 5: '5.2 5'
Chunk 6: '.3'
Chunk 8: ' new f'
Chunk 9: 'eatur'
...
```

**With fine-grained streaming (3s delay):**
```
Chunk 1: '{"query": "TypeScript 5.0 5.1 5.2 5.3'
Chunk 2: ' new features comparison'
```

### Handling invalid JSON

Because fine-grained streaming sends parameters without buffering or JSON validation, there is no guarantee the stream will complete as valid JSON.

If the `max_tokens` stop reason is reached, the stream may end mid-parameter and be incomplete. You generally need specific handling for when `max_tokens` is reached.

**Wrapping invalid JSON for error responses:**

If you need to pass invalid JSON back to the model in an error response block, wrap it in a JSON object:

```json
{
  "INVALID_JSON": "<your invalid json string>"
}
```

This helps the model understand the content is invalid JSON while preserving the original data for debugging. Properly escape any quotes or special characters to maintain valid JSON structure.

**Example error handling:**

```python
try:
    # Parse tool parameters
    params = json.loads(tool_input)
except json.JSONDecodeError as e:
    # Handle invalid JSON from streaming
    error_response = {
        "type": "tool_result",
        "tool_use_id": tool_call.id,
        "content": json.dumps({
            "INVALID_JSON": tool_input,
            "error": str(e)
        }),
        "is_error": True
    }
```

---

## Bash tool

The bash tool enables Claude to execute shell commands in a persistent bash session, allowing system operations, script execution, and command-line automation.

### Overview

The bash tool provides:
- Persistent bash session that maintains state
- Ability to run any shell command
- Access to environment variables and working directory
- Command chaining and scripting capabilities

### Model compatibility

| Model | Tool Version |
|-------|--------------|
| Claude 4 models and Sonnet 3.7 | `bash_20250124` |

**Warning:** Older tool versions are not guaranteed to be backwards-compatible with newer models. Always use the tool version that corresponds to your model version.

### Use cases

- **Development workflows**: Run build commands, tests, and development tools
- **System automation**: Execute scripts, manage files, automate tasks
- **Data processing**: Process files, run analysis scripts, manage datasets
- **Environment setup**: Install packages, configure environments

### Quick start

#### Python

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=[
        {
            "type": "bash_20250124",
            "name": "bash"
        }
    ],
    messages=[
        {"role": "user", "content": "List all Python files in the current directory."}
    ]
)
```

#### Shell

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "tools": [
      {
        "type": "bash_20250124",
        "name": "bash"
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "List all Python files in the current directory."
      }
    ]
  }'
```

### How it works

The bash tool maintains a persistent session:

1. Claude determines what command to run
2. You execute the command in a bash shell
3. Return the output (stdout and stderr) to Claude
4. Session state persists between commands (environment variables, working directory)

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `command` | Yes* | The bash command to run |
| `restart` | No | Set to `true` to restart the bash session |

*Required unless using `restart`

**Example usage:**

```json
{
  "command": "ls -la *.py"
}
```

```json
{
  "restart": true
}
```

### Multi-step automation example

Claude can chain commands to complete complex tasks:

```
User: Install the requests library and create a simple Python script that fetches a joke from an API, then run it.

Claude's commands:
1. {"command": "pip install requests"}

2. {"command": "cat > fetch_joke.py << 'EOF'\nimport requests\nresponse = requests.get('https://official-joke-api.appspot.com/random_joke')\njoke = response.json()\nprint(f\"Setup: {joke['setup']}\")\nprint(f\"Punchline: {joke['punchline']}\")\nEOF"}

3. {"command": "python fetch_joke.py"}
```

The session maintains state between commands, so files created in step 2 are available in step 3.

### Implementation

The bash tool is implemented as a schema-less tool. You don't need to provide an input schema; the schema is built into Claude's model.

**Set up a bash environment:**

```python
import subprocess
import threading
import queue

class BashSession:
    def __init__(self):
        self.process = subprocess.Popen(
            ['/bin/bash'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0
        )
        self.output_queue = queue.Queue()
        self.error_queue = queue.Queue()
        self._start_readers()
```

**Handle command execution:**

```python
def execute_command(self, command):
    # Send command to bash
    self.process.stdin.write(command + '\n')
    self.process.stdin.flush()

    # Capture output with timeout
    output = self._read_output(timeout=10)
    return output
```

**Process Claude's tool calls:**

```python
for content in response.content:
    if content.type == "tool_use" and content.name == "bash":
        if content.input.get("restart"):
            bash_session.restart()
            result = "Bash session restarted"
        else:
            command = content.input.get("command")
            result = bash_session.execute_command(command)

        # Return result to Claude
        tool_result = {
            "type": "tool_result",
            "tool_use_id": content.id,
            "content": result
        }
```

**Implement safety measures:**

```python
def validate_command(command):
    # Block dangerous commands
    dangerous_patterns = ['rm -rf /', 'format', ':(){:|:&};:']
    for pattern in dangerous_patterns:
        if pattern in command:
            return False, f"Command contains dangerous pattern: {pattern}"

    # Add more validation as needed
    return True, None
```

### Error handling

Handle various error scenarios when implementing the bash tool.

**Command execution timeout:**

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
      "content": "Error: Command timed out after 30 seconds",
      "is_error": true
    }
  ]
}
```

**Command not found:**

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
      "content": "bash: nonexistentcommand: command not found",
      "is_error": true
    }
  ]
}
```

**Permission denied:**

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
      "content": "bash: /root/sensitive-file: Permission denied",
      "is_error": true
    }
  ]
}
```

### Implementation best practices

**Use command timeouts:**

```python
def execute_with_timeout(command, timeout=30):
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return f"Command timed out after {timeout} seconds"
```

**Maintain session state:**

```python
# Commands run in the same session maintain state
commands = [
    "cd /tmp",
    "echo 'Hello' > test.txt",
    "cat test.txt"  # This works because we're still in /tmp
]
```

**Handle large outputs:**

```python
def truncate_output(output, max_lines=100):
    lines = output.split('\n')
    if len(lines) > max_lines:
        truncated = '\n'.join(lines[:max_lines])
        return f"{truncated}\n\n... Output truncated ({len(lines)} total lines) ..."
    return output
```

**Log all commands:**

```python
import logging

def log_command(command, output, user_id):
    logging.info(f"User {user_id} executed: {command}")
    logging.info(f"Output: {output[:200]}...")  # Log first 200 chars
```

**Sanitize outputs:**

```python
def sanitize_output(output):
    # Remove potential secrets or credentials
    import re
    # Example: Remove AWS credentials
    output = re.sub(r'aws_access_key_id\s*=\s*\S+', 'aws_access_key_id=***', output)
    output = re.sub(r'aws_secret_access_key\s*=\s*\S+', 'aws_secret_access_key=***', output)
    return output
```

### Security

**Warning:** The bash tool provides direct system access. Implement essential safety measures:
- Running in isolated environments (Docker/VM)
- Implementing command filtering and allowlists
- Setting resource limits (CPU, memory, disk)
- Logging all executed commands

**Key recommendations:**
- Use `ulimit` to set resource constraints
- Filter dangerous commands (`sudo`, `rm -rf`, etc.)
- Run with minimal user permissions
- Monitor and log all command execution

### Pricing

The bash tool adds **245 input tokens** to your API calls.

Additional tokens are consumed by:
- Command outputs (stdout/stderr)
- Error messages
- Large file contents

### Common patterns

**Development workflows:**
- Running tests: `pytest && coverage report`
- Building projects: `npm install && npm run build`
- Git operations: `git status && git add . && git commit -m "message"`

**File operations:**
- Processing data: `wc -l *.csv && ls -lh *.csv`
- Searching files: `find . -name "*.py" | xargs grep "pattern"`
- Creating backups: `tar -czf backup.tar.gz ./data`

**System tasks:**
- Checking resources: `df -h && free -m`
- Process management: `ps aux | grep python`
- Environment setup: `export PATH=$PATH:/new/path && echo $PATH`

### Limitations

- **No interactive commands**: Cannot handle `vim`, `less`, or password prompts
- **No GUI applications**: Command-line only
- **Session scope**: Persists within conversation, lost between API calls
- **Output limits**: Large outputs may be truncated
- **No streaming**: Results returned after completion

---

## Code execution tool

Claude can analyze data, create visualizations, perform complex calculations, run system commands, create and edit files, and process uploaded files directly within the API conversation. The code execution tool allows Claude to run Bash commands and manipulate files in a secure, sandboxed environment.

**Note:** The code execution tool is currently in public beta. Add the `"code-execution-2025-08-25"` beta header to your API requests.

### Model compatibility

The code execution tool is available on:

| Model | Tool Version |
|-------|--------------|
| Claude Opus 4.5 | `code_execution_20250825` |
| Claude Opus 4.1 | `code_execution_20250825` |
| Claude Opus 4 | `code_execution_20250825` |
| Claude Sonnet 4.5 | `code_execution_20250825` |
| Claude Sonnet 4 | `code_execution_20250825` |
| Claude Haiku 4.5 | `code_execution_20250825` |

**Warning:** Older tool versions are not guaranteed to be backwards-compatible with newer models. Always use the tool version that corresponds to your model version.

### Quick start

Simple example asking Claude to perform a calculation:

#### Shell

```bash
curl https://api.anthropic.com/v1/messages \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "anthropic-version: 2023-06-01" \
    --header "anthropic-beta: code-execution-2025-08-25" \
    --header "content-type: application/json" \
    --data '{
        "model": "claude-sonnet-4-5",
        "max_tokens": 4096,
        "messages": [
            {
                "role": "user",
                "content": "Calculate the mean and standard deviation of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
            }
        ],
        "tools": [{
            "type": "code_execution_20250825",
            "name": "code_execution"
        }]
    }'
```

#### Python

```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["code-execution-2025-08-25"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Calculate the mean and standard deviation of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)

print(response)
```

#### TypeScript

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function main() {
  const response = await anthropic.beta.messages.create({
    model: "claude-sonnet-4-5",
    betas: ["code-execution-2025-08-25"],
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: "Calculate the mean and standard deviation of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
      }
    ],
    tools: [{
      type: "code_execution_20250825",
      name: "code_execution"
    }]
  });

  console.log(response);
}

main().catch(console.error);
```

### How code execution works

When you add the code execution tool:

1. Claude evaluates whether code execution would help answer your question
2. The tool automatically provides Claude with:
   - **Bash commands**: Execute shell commands for system operations and package management
   - **File operations**: Create, view, and edit files directly, including writing code
3. Claude can use any combination of these capabilities in a single request
4. All operations run in a secure sandbox environment
5. Claude provides results with any generated charts, calculations, or analysis

### Execute Bash commands

Ask Claude to check system information and install packages:

```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["code-execution-2025-08-25"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Check the Python version and list installed packages"
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)
```

### Create and edit files

Claude can create, view, and edit files directly in the sandbox:

```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["code-execution-2025-08-25"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Create a config.yaml file with database settings, then update the port from 5432 to 3306"
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)
```

### Upload and analyze files

To analyze your own data files (CSV, Excel, images, etc.), upload them via the Files API:

**Note:** Using the Files API with Code Execution requires two beta headers: `"code-execution-2025-08-25,files-api-2025-04-14"`

Supported file types:
- CSV, Excel (.xlsx, .xls), JSON, XML
- Images (JPEG, PNG, GIF, WebP)
- Text files (.txt, .md, .py, etc)

#### Upload and analyze files

```python
import anthropic

client = anthropic.Anthropic()

# Upload a file
file_object = client.beta.files.upload(
    file=open("data.csv", "rb"),
)

# Use the file_id with code execution
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["code-execution-2025-08-25", "files-api-2025-04-14"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Analyze this CSV data"},
            {"type": "container_upload", "file_id": file_object.id}
        ]
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)
```

#### Retrieve generated files

When Claude creates files during code execution, retrieve them using the Files API:

```python
from anthropic import Anthropic

client = Anthropic()

# Request code execution that creates files
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["code-execution-2025-08-25", "files-api-2025-04-14"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Create a matplotlib visualization and save it as output.png"
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)

# Extract file IDs from the response
def extract_file_ids(response):
    file_ids = []
    for item in response.content:
        if item.type == 'bash_code_execution_tool_result':
            content_item = item.content
            if content_item.type == 'bash_code_execution_result':
                for file in content_item.content:
                    if hasattr(file, 'file_id'):
                        file_ids.append(file.file_id)
    return file_ids

# Download the created files
for file_id in extract_file_ids(response):
    file_metadata = client.beta.files.retrieve_metadata(file_id)
    file_content = client.beta.files.download(file_id)
    file_content.write_to_file(file_metadata.filename)
    print(f"Downloaded: {file_metadata.filename}")
```

### Tool definition

The code execution tool requires no additional parameters:

```json
{
  "type": "code_execution_20250825",
  "name": "code_execution"
}
```

When provided, Claude automatically gains access to:
- `bash_code_execution`: Run shell commands
- `text_editor_code_execution`: View, create, and edit files

### Response format

The code execution tool returns two types of results.

**Bash command response:**

```json
{
  "type": "server_tool_use",
  "id": "srvtoolu_01B3C4D5E6F7G8H9I0J1K2L3",
  "name": "bash_code_execution",
  "input": {
    "command": "ls -la | head -5"
  }
},
{
  "type": "bash_code_execution_tool_result",
  "tool_use_id": "srvtoolu_01B3C4D5E6F7G8H9I0J1K2L3",
  "content": {
    "type": "bash_code_execution_result",
    "stdout": "total 24\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 user user 4096 Jan 1 11:00 ..\n-rw-r--r-- 1 user user  220 Jan 1 12:00 data.csv",
    "stderr": "",
    "return_code": 0
  }
}
```

**File operation (view):**

```json
{
  "type": "server_tool_use",
  "id": "srvtoolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "name": "text_editor_code_execution",
  "input": {
    "command": "view",
    "path": "config.json"
  }
},
{
  "type": "text_editor_code_execution_tool_result",
  "tool_use_id": "srvtoolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "content": {
    "type": "text_editor_code_execution_result",
    "file_type": "text",
    "content": "{\n  \"setting\": \"value\",\n  \"debug\": true\n}",
    "numLines": 4,
    "startLine": 1,
    "totalLines": 4
  }
}
```

**Result fields:**

All execution results include:
- `stdout`: Output from successful execution
- `stderr`: Error messages if execution fails
- `return_code`: 0 for success, non-zero for failure

Additional fields for file operations:
- **View**: `file_type`, `content`, `numLines`, `startLine`, `totalLines`
- **Create**: `is_file_update`
- **Edit**: `oldStart`, `oldLines`, `newStart`, `newLines`, `lines` (diff format)

### Error handling

**Common error codes:**

| Error Code | Description |
|-----------|-------------|
| `unavailable` | The tool is temporarily unavailable |
| `execution_time_exceeded` | Execution exceeded maximum time limit |
| `container_expired` | Container expired and is no longer available |
| `invalid_tool_input` | Invalid parameters provided to the tool |
| `too_many_requests` | Rate limit exceeded for tool usage |
| `file_not_found` | File doesn't exist (for view/edit operations) |
| `string_not_found` | The `old_str` not found in file (for str_replace) |

The API may include a `pause_turn` stop reason for long-running turns. You can provide the response back as-is in a subsequent request to let Claude continue, or modify the content to interrupt.

### Container environment

The code execution tool runs in a secure, containerized environment with:

**Runtime:**
- **Python version**: 3.11.12
- **Operating system**: Linux-based container
- **Architecture**: x86_64 (AMD64)

**Resource limits:**
- **Memory**: 5GiB RAM
- **Disk space**: 5GiB workspace storage
- **CPU**: 1 CPU

**Security & Networking:**
- **Internet access**: Completely disabled
- **External connections**: No outbound network requests
- **Sandbox isolation**: Full isolation from host and other containers
- **File access**: Limited to workspace directory only
- **Expiration**: Containers expire 30 days after creation

**Pre-installed libraries:**
- **Data Science**: pandas, numpy, scipy, scikit-learn, statsmodels
- **Visualization**: matplotlib, seaborn
- **File Processing**: pyarrow, openpyxl, pillow, pypdf, pdfplumber
- **Math**: sympy, mpmath
- **Utilities**: tqdm, python-dateutil, pytz, joblib, rg, fd, sqlite

### Container reuse

Reuse an existing container across multiple API requests by providing the container ID:

```python
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# First request: Create a file
response1 = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["code-execution-2025-08-25"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Write a file with a random number and save it to '/tmp/number.txt'"
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)

# Extract the container ID
container_id = response1.container.id

# Second request: Reuse the container
response2 = client.beta.messages.create(
    container=container_id,  # Reuse the same container
    model="claude-sonnet-4-5",
    betas=["code-execution-2025-08-25"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Read the number from '/tmp/number.txt' and calculate its square"
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)
```

### Streaming

With streaming enabled, you'll receive code execution events as they occur:

```javascript
event: content_block_start
data: {"type": "content_block_start", "index": 1, "content_block": {"type": "server_tool_use", "id": "srvtoolu_xyz789", "name": "code_execution"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "{\"code\":\"import pandas as pd\\ndf = pd.read_csv('data.csv')\\nprint(df.head())\"}"}}

event: content_block_start
data: {"type": "content_block_start", "index": 2, "content_block": {"type": "code_execution_tool_result", "tool_use_id": "srvtoolu_xyz789", "content": {"stdout": "   A  B  C\n0  1  2  3\n1  4  5  6", "stderr": ""}}}
```

### Pricing

Code execution tool usage is tracked separately from token usage. Execution time has a minimum of 5 minutes. If files are included, execution time is billed even if the tool is not used due to files being preloaded.

Each organization receives **1,550 free hours per month**. Additional usage beyond the first 1,550 hours is billed at **$0.05 per hour, per container**.

### Upgrade to latest version

Upgrading to `code-execution-2025-08-25` provides access to file manipulation and Bash capabilities. There is no price difference.

**What's changed:**

| Component | Legacy | Current |
|-----------|--------|---------|
| Beta header | `code-execution-2025-05-22` | `code-execution-2025-08-25` |
| Tool type | `code_execution_20250522` | `code_execution_20250825` |
| Capabilities | Python only | Bash commands, file operations |
| Response types | `code_execution_result` | `bash_code_execution_result`, `text_editor_code_execution_result` |

**Upgrade steps:**

1. Update the beta header:
```diff
- "anthropic-beta": "code-execution-2025-05-22"
+ "anthropic-beta": "code-execution-2025-08-25"
```

2. Update the tool type:
```diff
- "type": "code_execution_20250522"
+ "type": "code_execution_20250825"
```

3. Review response handling (if parsing responses programmatically)

All existing Python code execution continues to work exactly as before. No changes required to existing Python-only workflows.

---

## Programmatic tool calling

Programmatic tool calling allows Claude to write code that calls your tools programmatically within a code execution container, rather than requiring round trips through the model for each tool invocation. This reduces latency for multi-tool workflows and decreases token consumption by allowing Claude to filter or process data before it reaches the model's context window.

**Note:** Programmatic tool calling is currently in public beta. Add the `"advanced-tool-use-2025-11-20"` beta header to your API requests. This feature requires the code execution tool to be enabled.

### Model compatibility

Programmatic tool calling is available on:

| Model | Tool Version |
|-------|--------------|
| Claude Opus 4.5 | `code_execution_20250825` |
| Claude Sonnet 4.5 | `code_execution_20250825` |

**Warning:** Programmatic tool calling is available via the Claude API and Microsoft Foundry.

### Quick start

Example where Claude programmatically queries a database multiple times and aggregates results:

#### Python

```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["advanced-tool-use-2025-11-20"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Query sales data for the West, East, and Central regions, then tell me which region had the highest revenue"
    }],
    tools=[
        {
            "type": "code_execution_20250825",
            "name": "code_execution"
        },
        {
            "name": "query_database",
            "description": "Execute a SQL query against the sales database. Returns a list of rows as JSON objects.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL query to execute"
                    }
                },
                "required": ["sql"]
            },
            "allowed_callers": ["code_execution_20250825"]
        }
    ]
)

print(response)
```

#### TypeScript

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function main() {
  const response = await anthropic.beta.messages.create({
    model: "claude-sonnet-4-5",
    betas: ["advanced-tool-use-2025-11-20"],
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: "Query sales data for the West, East, and Central regions, then tell me which region had the highest revenue"
      }
    ],
    tools: [
      {
        type: "code_execution_20250825",
        name: "code_execution"
      },
      {
        name: "query_database",
        description: "Execute a SQL query against the sales database. Returns a list of rows as JSON objects.",
        input_schema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "SQL query to execute"
            }
          },
          required: ["sql"]
        },
        allowed_callers: ["code_execution_20250825"]
      }
    ]
  });

  console.log(response);
}

main().catch(console.error);
```

### How it works

When you configure a tool to be callable from code execution and Claude decides to use that tool:

1. Claude writes Python code that invokes the tool as a function, potentially including multiple tool calls and pre/post-processing logic
2. Claude runs this code in a sandboxed container via code execution
3. When a tool function is called, code execution pauses and the API returns a `tool_use` block
4. You provide the tool result, and code execution continues (intermediate results are not loaded into Claude's context window)
5. Once all code execution completes, Claude receives the final output and continues working on the task

**Note:** Custom tools are converted to async Python functions. When Claude writes code, it uses `await` (e.g., `result = await query_database("<sql")`), and the async wrapper is automatically included.

### Core concepts

#### The `allowed_callers` field

Specifies which contexts can invoke a tool:

```json
{
  "name": "query_database",
  "description": "Execute a SQL query against the database",
  "input_schema": {...},
  "allowed_callers": ["code_execution_20250825"]
}
```

**Possible values:**
- `["direct"]` - Only Claude can call this tool directly (default if omitted)
- `["code_execution_20250825"]` - Only callable from within code execution
- `["direct", "code_execution_20250825"]` - Callable both directly and from code execution

**Tip:** Choose either `["direct"]` or `["code_execution_20250825"]` for each tool rather than enabling both, as this provides clearer guidance to Claude for how best to use the tool.

#### The `caller` field in responses

Every tool use block includes a `caller` field indicating how it was invoked.

**Direct invocation:**
```json
{
  "type": "tool_use",
  "id": "toolu_abc123",
  "name": "query_database",
  "input": {"sql": "<sql>"},
  "caller": {"type": "direct"}
}
```

**Programmatic invocation:**
```json
{
  "type": "tool_use",
  "id": "toolu_xyz789",
  "name": "query_database",
  "input": {"sql": "<sql>"},
  "caller": {
    "type": "code_execution_20250825",
    "tool_id": "srvtoolu_abc123"
  }
}
```

The `tool_id` references the code execution tool that made the programmatic call.

#### Container lifecycle

Programmatic tool calling uses the same containers as code execution:

- **Container creation**: A new container is created for each session unless you reuse an existing one
- **Expiration**: Containers expire after approximately 4.5 minutes of inactivity
- **Container ID**: Returned in responses via the `container` field
- **Reuse**: Pass the container ID to maintain state across requests

**Warning:** When a tool is called programmatically and the container is waiting for your tool result, you must respond before the container expires. Monitor the `expires_at` field. If the container expires, Claude may treat the tool call as timed out and retry it.

### Example workflow

#### Step 1: Initial request

Send a request with code execution and a tool that allows programmatic calling:

```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["advanced-tool-use-2025-11-20"],
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Query customer purchase history from the last quarter and identify our top 5 customers by revenue"
    }],
    tools=[
        {
            "type": "code_execution_20250825",
            "name": "code_execution"
        },
        {
            "name": "query_database",
            "description": "Execute a SQL query against the sales database. Returns a list of rows as JSON objects.",
            "input_schema": {...},
            "allowed_callers": ["code_execution_20250825"]
        }
    ]
)
```

**Note:** Provide detailed descriptions of your tool's output format. If you specify that the tool returns JSON, Claude will attempt to deserialize and process the result in code.

#### Step 2: API response with tool call

Claude writes code that calls your tool. The API pauses and returns:

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I'll query the purchase history and analyze the results."
    },
    {
      "type": "server_tool_use",
      "id": "srvtoolu_abc123",
      "name": "code_execution",
      "input": {
        "code": "results = await query_database('<sql>')\ntop_customers = sorted(results, key=lambda x: x['revenue'], reverse=True)[:5]\nprint(f'Top 5 customers: {top_customers}')"
      }
    },
    {
      "type": "tool_use",
      "id": "toolu_def456",
      "name": "query_database",
      "input": {"sql": "<sql>"},
      "caller": {
        "type": "code_execution_20250825",
        "tool_id": "srvtoolu_abc123"
      }
    }
  ],
  "container": {
    "id": "container_xyz789",
    "expires_at": "2025-01-15T14:30:00Z"
  },
  "stop_reason": "tool_use"
}
```

#### Step 3: Provide tool result

Include the full conversation history plus your tool result:

```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    betas=["advanced-tool-use-2025-11-20"],
    max_tokens=4096,
    container="container_xyz789",  # Reuse the container
    messages=[
        {"role": "user", "content": "Query customer purchase history..."},
        {
            "role": "assistant",
            "content": [...]  # Full assistant response from Step 2
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": "toolu_def456",
                    "content": "[{\"customer_id\": \"C1\", \"revenue\": 45000}, {\"customer_id\": \"C2\", \"revenue\": 38000}, ...]"
                }
            ]
        }
    ],
    tools=[...]
)
```

#### Step 4 & 5: Completion

The code execution continues and processes results. If additional tool calls are needed, repeat. Once complete, Claude provides the final response.

### Advanced patterns

#### Batch processing with loops

```python
# async wrapper omitted for clarity
regions = ["West", "East", "Central", "North", "South"]
results = {}
for region in regions:
    data = await query_database(f"<sql for {region}>")
    results[region] = sum(row["revenue"] for row in data)

top_region = max(results.items(), key=lambda x: x[1])
print(f"Top region: {top_region[0]} with ${top_region[1]:,} in revenue")
```

This reduces model round-trips from N to 1 and processes large result sets programmatically.

#### Early termination

```python
# async wrapper omitted for clarity
endpoints = ["us-east", "eu-west", "apac"]
for endpoint in endpoints:
    status = await check_health(endpoint)
    if status == "healthy":
        print(f"Found healthy endpoint: {endpoint}")
        break  # Stop early
```

#### Conditional tool selection

```python
# async wrapper omitted for clarity
file_info = await get_file_info(path)
if file_info["size"] < 10000:
    content = await read_full_file(path)
else:
    content = await read_file_summary(path)
print(content)
```

#### Data filtering

```python
# async wrapper omitted for clarity
logs = await fetch_logs(server_id)
errors = [log for log in logs if "ERROR" in log]
print(f"Found {len(errors)} errors")
for error in errors[-10:]:  # Only return last 10 errors
    print(error)
```

### Error handling

#### Common errors

| Error | Description | Solution |
|-------|-------------|----------|
| `invalid_tool_input` | Tool input doesn't match schema | Validate your tool's input_schema |
| `tool_not_allowed` | Tool doesn't allow the requested caller type | Check `allowed_callers` includes the right contexts |
| `missing_beta_header` | PTC beta header not provided | Add both beta headers to your request |

#### Container expiration

If your tool takes too long to respond, code execution receives a `TimeoutError`:

```json
{
  "type": "code_execution_tool_result",
  "tool_use_id": "srvtoolu_abc123",
  "content": {
    "type": "code_execution_result",
    "stdout": "",
    "stderr": "TimeoutError: Calling tool ['query_database'] timed out.",
    "return_code": 0,
    "content": []
  }
}
```

**Prevention:**
- Monitor the `expires_at` field in responses
- Implement timeouts for your tool execution
- Break long operations into smaller chunks

### Constraints and limitations

#### Feature incompatibilities

- **Structured outputs**: Tools with `strict: true` are not supported with programmatic calling
- **Tool choice**: Cannot force programmatic calling of a specific tool via `tool_choice`
- **Parallel tool use**: `disable_parallel_tool_use: true` is not supported

#### Tools that cannot be called programmatically

- Web search
- Web fetch
- Tools provided by an MCP connector

#### Message formatting restrictions

When responding to programmatic tool calls, responses must contain **only** `tool_result` blocks. You cannot include text content:

```json
// ❌ INVALID - Cannot include text with programmatic tool calls
{
  "role": "user",
  "content": [
    {"type": "tool_result", "tool_use_id": "toolu_01", "content": "[{\"customer_id\": \"C1\", \"revenue\": 45000}]"},
    {"type": "text", "text": "What should I do next?"}  // Error
  ]
}

// ✅ VALID - Only tool results
{
  "role": "user",
  "content": [
    {"type": "tool_result", "tool_use_id": "toolu_01", "content": "[{\"customer_id\": \"C1\", \"revenue\": 45000}]"}
  ]
}
```

### Token efficiency

Programmatic tool calling significantly reduces token consumption:

- **Tool results from programmatic calls are not added to Claude's context** - only the final code output is
- **Intermediate processing happens in code** - filtering, aggregation, etc. don't consume model tokens
- **Multiple tool calls in one code execution** - reduces overhead compared to separate model turns

For example, calling 10 tools directly uses ~10x the tokens of calling them programmatically and returning a summary.

**Note:** Tool results from programmatic invocations do not count toward your input/output token usage. Only the final code execution result and Claude's response count.

### Best practices

#### Tool design

- **Provide detailed output descriptions**: Clearly document the format (JSON structure, field types, etc.)
- **Return structured data**: JSON or other easily parseable formats work best
- **Keep responses concise**: Return only necessary data to minimize processing overhead

#### When to use programmatic calling

**Good use cases:**
- Processing large datasets where you only need aggregates or summaries
- Multi-step workflows with 3+ dependent tool calls
- Operations requiring filtering, sorting, or transformation of tool results
- Tasks where intermediate data shouldn't influence Claude's reasoning
- Parallel operations across many items (e.g., checking 50 endpoints)

**Less ideal use cases:**
- Single tool calls with simple responses
- Tools that need immediate user feedback
- Very fast operations where code execution overhead would outweigh the benefit

#### Performance optimization

- **Reuse containers** when making multiple related requests to maintain state
- **Batch similar operations** in a single code execution when possible

### Troubleshooting

#### Common issues

**"Tool not allowed" error**
- Verify your tool definition includes `"allowed_callers": ["code_execution_20250825"]`
- Check that you're using the correct beta headers

**Container expiration**
- Ensure you respond to tool calls within the container's lifetime (~4.5 minutes)
- Monitor the `expires_at` field in responses
- Implement faster tool execution

**Beta header issues**
- You need the header: `"advanced-tool-use-2025-11-20"`

**Tool result not parsed correctly**
- Ensure your tool returns string data that Claude can deserialize
- Provide clear output format documentation in your tool description

#### Debugging tips

1. Log all tool calls and results to track the flow
2. Check the `caller` field to confirm programmatic invocation
3. Monitor container IDs to ensure proper reuse
4. Test tools independently before enabling programmatic calling

### Why programmatic tool calling works

Claude's training includes extensive exposure to code, making it effective at reasoning through and chaining function calls. When tools are presented as callable functions within a code execution environment, Claude can:

- **Reason naturally about tool composition**: Chain operations and handle dependencies as naturally as writing any Python code
- **Process large results efficiently**: Filter down large tool outputs, extract only relevant data, or write intermediate results to files
- **Reduce latency significantly**: Eliminate the overhead of re-sampling Claude between each tool call

This approach enables workflows that would be impractical with traditional tool use—such as processing files over 1M tokens—by allowing Claude to work with data programmatically rather than loading everything into conversation context.

---

## Computer use tool

Claude can interact with computer environments through the computer use tool, which provides screenshot capabilities and mouse/keyboard control for autonomous desktop interaction.

**Note:** Computer use is currently in beta and requires beta headers:
- `"computer-use-2025-11-24"` for Claude Opus 4.5
- `"computer-use-2025-01-24"` for other supported models

### Overview

Computer use is a beta feature that enables Claude to interact with desktop environments. This tool provides:

- **Screenshot capture**: See what's currently displayed on screen
- **Mouse control**: Click, drag, and move the cursor
- **Keyboard input**: Type text and use keyboard shortcuts
- **Desktop automation**: Interact with any application or interface

Computer use can be augmented with other tools like bash and text editor for more comprehensive automation workflows.

### Model compatibility

Computer use is available for:

| Model | Tool Version | Beta Flag |
|-------|--------------|-----------|
| Claude Opus 4.5 | `computer_20251124` | `computer-use-2025-11-24` |
| Claude Sonnet 4.5, Haiku 4.5, Opus 4.1, Sonnet 4, Opus 4, Sonnet 3.7 | `computer_20250124` | `computer-use-2025-01-24` |

**Note:** Claude Opus 4.5 introduces the `computer_20251124` tool version with zoom action for detailed screen region inspection. All other models use `computer_20250124`.

**Warning:** Older tool versions are not guaranteed to be backwards-compatible with newer models. Always use the tool version that corresponds to your model version.

### Security considerations

Computer use is a beta feature with unique risks distinct from standard API features. These risks are heightened when interacting with the internet.

**Precautions to minimize risks:**
1. Use a dedicated virtual machine or container with minimal privileges
2. Avoid giving Claude access to sensitive data like login information
3. Limit internet access to an allowlist of domains
4. Ask a human to confirm decisions with real-world consequences

Claude may follow commands in content even if it conflicts with your instructions. For example, Claude instructions on webpages or in images may override your instructions. Anthropic has trained the model to resist prompt injections and added automatic classifiers to flag potential injection attempts, but precautions are still recommended.

### Quick start

Example with Python:

```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5",  # or another compatible model
    max_tokens=1024,
    tools=[
        {
          "type": "computer_20250124",
          "name": "computer",
          "display_width_px": 1024,
          "display_height_px": 768,
          "display_number": 1,
        },
        {
          "type": "text_editor_20250728",
          "name": "str_replace_based_edit_tool"
        },
        {
          "type": "bash_20250124",
          "name": "bash"
        }
    ],
    messages=[{"role": "user", "content": "Save a picture of a cat to my desktop."}],
    betas=["computer-use-2025-01-24"]
)
print(response)
```

**Note:** A beta header is only required for the computer use tool, not for bash or text editor tools used alongside it.

### How it works

4-step process:

1. **Provide Claude with the computer use tool and a user prompt** - Add the computer use tool to your API request with a prompt requiring desktop interaction
2. **Claude decides to use the computer use tool** - Claude assesses if the tool can help and constructs a tool use request
3. **Execute the tool and return results** - Extract tool input, execute on a VM/container, return results in a tool_result block
4. **Claude continues until completion** - Claude analyzes results and either requests more tool use or completes the task

The repetition of steps 3-4 without user input is the "agent loop."

### Available actions

**Basic actions (all versions):**
- `screenshot` - Capture the current display
- `left_click` - Click at coordinates `[x, y]`
- `type` - Type text string
- `key` - Press key or key combination (e.g., "ctrl+s")
- `mouse_move` - Move cursor to coordinates

**Enhanced actions (`computer_20250124`):**
Available in Claude 4 models and Sonnet 3.7:
- `scroll` - Scroll in any direction with amount control
- `left_click_drag` - Click and drag between coordinates
- `right_click`, `middle_click` - Additional mouse buttons
- `double_click`, `triple_click` - Multiple clicks
- `left_mouse_down`, `left_mouse_up` - Fine-grained click control
- `hold_key` - Hold a key while performing other actions
- `wait` - Pause between actions

**Enhanced actions (`computer_20251124`):**
Available in Claude Opus 4.5:
- All actions from `computer_20250124`
- `zoom` - View a specific region at full resolution. Requires `enable_zoom: true` in tool definition. Takes `region` parameter `[x1, y1, x2, y2]`

**Example actions:**

```json
// Take a screenshot
{"action": "screenshot"}

// Click at position
{"action": "left_click", "coordinate": [500, 300]}

// Type text
{"action": "type", "text": "Hello, world!"}

// Scroll down
{"action": "scroll", "coordinate": [500, 400], "scroll_direction": "down", "scroll_amount": 3}

// Zoom to view region (Opus 4.5)
{"action": "zoom", "region": [100, 200, 400, 350]}
```

### Tool parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `type` | Yes | Tool version (`computer_20251124`, `computer_20250124`, or `computer_20241022`) |
| `name` | Yes | Must be "computer" |
| `display_width_px` | Yes | Display width in pixels |
| `display_height_px` | Yes | Display height in pixels |
| `display_number` | No | Display number for X11 environments |
| `enable_zoom` | No | Enable zoom action (`computer_20251124` only). Default: `false` |

**Important:** The computer use tool must be explicitly executed by your application - Claude cannot execute it directly. You are responsible for implementing screenshot capture, mouse movements, keyboard inputs, and other actions based on Claude's requests.

### Enable thinking capability

Claude Sonnet 3.7 introduced a "thinking" capability that allows you to see the model's reasoning process as it works through complex tasks. To enable thinking:

```json
"thinking": {
  "type": "enabled",
  "budget_tokens": 1024
}
```

The `budget_tokens` parameter specifies how many tokens Claude can use for thinking. This is subtracted from your overall `max_tokens` budget.

### Implementation guide

#### Understanding the agent loop

The core of computer use is the "agent loop" - a cycle where Claude requests tool actions, your application executes them, and returns results to Claude:

```python
async def sampling_loop(model: str, messages: list[dict], api_key: str, max_tokens: int = 4096, max_iterations: int = 10):
    """Agent loop for Claude computer use interactions."""
    client = Anthropic(api_key=api_key)

    tools = [
        {"type": "computer_20250124", "name": "computer", "display_width_px": 1024, "display_height_px": 768},
        {"type": "text_editor_20250728", "name": "str_replace_editor"},
        {"type": "bash_20250124", "name": "bash"}
    ]

    iterations = 0
    while True and iterations < max_iterations:
        iterations += 1

        response = client.beta.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,
            tools=tools,
            betas=["computer-use-2025-01-24"]
        )

        # Add Claude's response to history
        messages.append({"role": "assistant", "content": response.content})

        # Check if Claude used any tools
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                # In a real app, you would execute the tool here
                result = {"result": "Tool executed successfully"}

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result
                })

        # If no tools were used, Claude is done
        if not tool_results:
            return messages

        # Add tool results for the next iteration
        messages.append({"role": "user", "content": tool_results})
```

The loop continues until Claude responds without requesting tools or the iteration limit is reached.

#### Optimize model performance

Best practices for better outputs:

1. Specify simple, well-defined tasks with explicit instructions
2. Prompt Claude to take screenshots and evaluate results after each step
3. Use keyboard shortcuts for tricky UI elements like dropdowns
4. Include example screenshots and tool calls of successful outcomes
5. For login-required tasks, provide credentials in `<robot_credentials>` XML tags

### Error handling

**Screenshot capture failure:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: Failed to capture screenshot. Display may be locked or unavailable.",
  "is_error": true
}
```

**Invalid coordinates:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: Coordinates (1200, 900) are outside display bounds (1024x768).",
  "is_error": true
}
```

**Action execution failure:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: Failed to perform click action. The application may be unresponsive.",
  "is_error": true
}
```

### Coordinate scaling

The API constrains images to a maximum of 1568 pixels on the longest edge and approximately 1.15 megapixels total. For example, a 1512x982 screen gets downsampled to approximately 1330x864. Claude analyzes this smaller image and returns coordinates in that space, but your tool executes in the original screen space.

To fix coordinate scaling:

```python
import math

def get_scale_factor(width, height):
    """Calculate scale factor to meet API constraints."""
    long_edge = max(width, height)
    total_pixels = width * height

    long_edge_scale = 1568 / long_edge
    total_pixels_scale = math.sqrt(1_150_000 / total_pixels)

    return min(1.0, long_edge_scale, total_pixels_scale)

# When capturing screenshot
scale = get_scale_factor(screen_width, screen_height)
scaled_width = int(screen_width * scale)
scaled_height = int(screen_height * scale)

# Resize image to scaled dimensions before sending to Claude
screenshot = capture_and_resize(scaled_width, scaled_height)

# When handling Claude's coordinates, scale them back up
def execute_click(x, y):
    screen_x = x / scale
    screen_y = y / scale
    perform_click(screen_x, screen_y)
```

### Implementation best practices

**Use appropriate display resolution:**
- General desktop tasks: 1024x768 or 1280x720
- Web applications: 1280x800 or 1366x768
- Avoid resolutions above 1920x1080 for performance

**Implement proper screenshot handling:**
- Encode screenshots as base64 PNG or JPEG
- Consider compressing large screenshots
- Include relevant metadata like timestamp
- Ensure coordinates are accurately scaled for higher resolutions

**Add action delays:**
```python
def click_and_wait(x, y, wait_time=0.5):
    click_at(x, y)
    time.sleep(wait_time)  # Allow UI to update
```

**Validate actions before execution:**
```python
def validate_action(action_type, params):
    if action_type == "left_click":
        x, y = params.get("coordinate", (0, 0))
        if not (0 <= x < display_width and 0 <= y < display_height):
            return False, "Coordinates out of bounds"
    return True, None
```

**Log actions for debugging:**
```python
import logging

def log_action(action_type, params, result):
    logging.info(f"Action: {action_type}, Params: {params}, Result: {result}")
```

### Limitations

Computer use is in beta with known limitations:

1. **Latency**: Current latency may be too slow compared to human-directed computer actions. Focus on use cases where speed isn't critical (e.g., background information gathering, automated software testing) in trusted environments.
2. **Computer vision accuracy**: Claude may make mistakes when outputting specific coordinates. Thinking capability can help understand reasoning.
3. **Tool selection accuracy**: Claude may make mistakes selecting tools or take unexpected actions. Reliability may be lower with niche applications or multiple applications at once.
4. **Scrolling reliability**: Improved in Claude Sonnet 3.7 with dedicated scroll actions with direction control.
5. **Spreadsheet interaction**: Improved in Claude Sonnet 3.7 with fine-grained mouse controls and modifier key support.
6. **Account creation and social media**: Limited ability to create accounts or generate content on social platforms.
7. **Vulnerabilities**: Jailbreaking or prompt injection may persist. Limit computer use to trusted environments with minimal privileges.
8. **Inappropriate or illegal actions**: Must not violate laws or Anthropic's Acceptable Use Policy.

Always carefully review and verify Claude's computer use actions and logs. Do not use for tasks requiring perfect precision or sensitive user information without human oversight.

### Pricing

Computer use follows standard tool use pricing. When using the computer use tool:

**System prompt overhead**: 466-499 tokens

**Computer use tool token usage:**
- Claude 4.x models: 735 tokens per tool definition
- Claude Sonnet 3.7: 735 tokens per tool definition

**Additional token consumption:**
- Screenshot images (see Vision pricing)
- Tool execution results returned to Claude

**Note:** If also using bash or text editor tools, those have their own token costs.

---

## Text editor tool

Claude can use a text editor tool to view and modify text files, helping you debug, fix, and improve your code or other text documents. This allows Claude to directly interact with your files, providing hands-on assistance rather than just suggesting changes.

### Model compatibility

| Model | Tool Version |
|-------|--------------|
| Claude 4.x models | `text_editor_20250728` |
| Claude Sonnet 3.7 (deprecated) | `text_editor_20250124` |

**Warning:** Older tool versions are not guaranteed to be backwards-compatible with newer models. Always use the tool version that corresponds to your model version.

**Note:** The `text_editor_20250728` tool for Claude 4 models does not include the `undo_edit` command.

### When to use the text editor tool

- **Code debugging**: Have Claude identify and fix bugs in your code
- **Code refactoring**: Let Claude improve your code structure, readability, and performance
- **Documentation generation**: Ask Claude to add docstrings, comments, or README files
- **Test creation**: Have Claude create unit tests for your code

### How to use the text editor tool

Provide the text editor tool to Claude using the Messages API:

**Claude 4:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=[
        {
            "type": "text_editor_20250728",
            "name": "str_replace_based_edit_tool",
            "max_characters": 10000
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "There's a syntax error in my primes.py file. Can you help me fix it?"
        }
    ]
)
```

**Claude Sonnet 3.7:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1024,
    tools=[
        {
            "type": "text_editor_20250124",
            "name": "str_replace_editor"
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "There's a syntax error in my primes.py file. Can you help me fix it?"
        }
    ]
)
```

**Note:** `max_characters` is only compatible with `text_editor_20250728` and later versions.

### 6-step workflow

1. **Provide Claude with the text editor tool and a user prompt** - Include the text editor tool in your API request with a prompt that may require examining or modifying files
2. **Claude uses the tool to examine files** - Claude assesses what it needs to look at and uses the `view` command
3. **Execute the view command and return results** - Read file contents or list directory contents, truncate if `max_characters` specified
4. **Claude uses the tool to modify files** - After examining, Claude may use `str_replace`, `create`, or `insert` commands
5. **Execute the edit and return results** - Perform the modification and return results
6. **Claude provides analysis and explanation** - Claude explains what it found and what changes it made

### Text editor tool commands

**view** - Examine file contents or list directory contents

Parameters:
- `command`: Must be "view"
- `path`: The path to the file or directory to view
- `view_range` (optional): Array of two integers [start_line, end_line] for viewing specific lines (1-indexed, -1 means end of file)

**str_replace** - Replace a specific string in a file

Parameters:
- `command`: Must be "str_replace"
- `path`: The path to the file to modify
- `old_str`: The text to replace (must match exactly)
- `new_str`: The new text to insert

**create** - Create a new file with specified content

Parameters:
- `command`: Must be "create"
- `path`: The path where the new file should be created
- `file_text`: The content to write to the new file

**insert** - Insert text at a specific location in a file

Parameters:
- `command`: Must be "insert"
- `path`: The path to the file to modify
- `insert_line`: The line number after which to insert the text (0 for beginning)
- `new_str`: The text to insert

**undo_edit** - Revert the last edit made to a file

**Note:** Only available in Claude Sonnet 3.7. Not supported in Claude 4 models.

Parameters:
- `command`: Must be "undo_edit"
- `path`: The path to the file whose last edit should be undone

### Implementation guide

#### Initialize your editor implementation

Create helper functions to handle file operations like reading, writing, and modifying files. Consider implementing backup functionality.

#### Handle editor tool calls

Create a function that processes tool calls from Claude based on the command type:

```python
def handle_editor_tool(tool_call, model_version):
    input_params = tool_call.input
    command = input_params.get('command', '')
    file_path = input_params.get('path', '')

    if command == 'view':
        # Read and return file contents
        pass
    elif command == 'str_replace':
        # Replace text in file
        pass
    elif command == 'create':
        # Create new file
        pass
    elif command == 'insert':
        # Insert text at location
        pass
    elif command == 'undo_edit':
        # Check if it's supported (Claude Sonnet 3.7 only)
        if 'str_replace_based_edit_tool' in model_version:
            return {"error": "undo_edit command is not supported in Claude 4"}
        pass
```

#### Implement security measures

- Validate file paths to prevent directory traversal
- Create backups before making changes
- Handle errors gracefully
- Implement permissions checks

#### Process Claude's responses

```python
# Process tool use in Claude's response
for content in response.content:
    if content.type == "tool_use":
        # Execute the tool based on command
        result = handle_editor_tool(content)

        # Return result to Claude
        tool_result = {
            "type": "tool_result",
            "tool_use_id": content.id,
            "content": result
        }
```

### Error handling

**File not found:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: File not found",
  "is_error": true
}
```

**Multiple matches for replacement:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: Found 3 matches for replacement text. Please provide more context to make a unique match.",
  "is_error": true
}
```

**No matches for replacement:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: No match found for replacement. Please check your text and try again.",
  "is_error": true
}
```

**Permission errors:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: Permission denied. Cannot write to file.",
  "is_error": true
}
```

### Best practices

**Provide clear context:**
- Less helpful: "Can you fix my code?"
- Better: "There's a syntax error in my primes.py file that prevents it from running. Can you fix it?"

**Be explicit about file paths:**
- Less helpful: "Review my helper file"
- Better: "Can you check my utils/helpers.py file for any performance issues?"

**Create backups before editing:**
```python
def backup_file(file_path):
    """Create a backup of a file before editing."""
    backup_path = f"{file_path}.backup"
    if os.path.exists(file_path):
        with open(file_path, 'r') as src, open(backup_path, 'w') as dst:
            dst.write(src.read())
```

**Handle unique text replacement carefully:**
```python
def safe_replace(file_path, old_text, new_text):
    """Replace text only if there's exactly one match."""
    with open(file_path, 'r') as f:
        content = f.read()

    count = content.count(old_text)
    if count == 0:
        return "Error: No match found"
    elif count > 1:
        return f"Error: Found {count} matches"
    else:
        new_content = content.replace(old_text, new_text)
        with open(file_path, 'w') as f:
            f.write(new_content)
        return "Successfully replaced text"
```

**Verify changes:**
```python
def verify_changes(file_path):
    """Run tests or checks after making changes."""
    try:
        if file_path.endswith('.py'):
            import ast
            with open(file_path, 'r') as f:
                ast.parse(f.read())
            return "Syntax check passed"
    except Exception as e:
        return f"Verification failed: {str(e)}"
```

### Pricing and token usage

The text editor tool uses standard input/output token pricing. Additional input tokens required:

| Tool | Additional input tokens |
|------|-------------------------|
| `text_editor_20250728` (Claude 4.x) | 700 tokens |
| `text_editor_20250124` (Claude Sonnet 3.7) | 700 tokens |

See [Tool use pricing](/docs/en/agents-and-tools/tool-use/overview#pricing) for complete details.

### Changelog

| Date | Version | Changes |
|------|---------|---------|
| July 28, 2025 | `text_editor_20250728` | Updated text editor tool with optional `max_characters` parameter |
| April 29, 2025 | `text_editor_20250429` | Text editor tool for Claude 4 (removed `undo_edit` command) |
| March 13, 2025 | `text_editor_20250124` | Standalone text editor tool documentation |
| October 22, 2024 | `text_editor_20241022` | Initial release with view, create, str_replace, insert, undo_edit commands |

---

# Web search tool

---

The web search tool gives Claude direct access to real-time web content, allowing it to answer questions with up-to-date information beyond its knowledge cutoff. Claude automatically cites sources from search results as part of its answer.

**Note:** Please reach out through our feedback form to share your experience with the web search tool.

## Supported models

Web search is available on:

- Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- Claude Sonnet 3.7 (deprecated) (`claude-3-7-sonnet-20250219`)
- Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Claude Haiku 3.5 (deprecated) (`claude-3-5-haiku-latest`)
- Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- Claude Opus 4.1 (`claude-opus-4-1-20250805`)
- Claude Opus 4 (`claude-opus-4-20250514`)

## How web search works

When you add the web search tool to your API request:

1. Claude decides when to search based on the prompt.
2. The API executes the searches and provides Claude with the results. This process may repeat multiple times throughout a single request.
3. At the end of its turn, Claude provides a final response with cited sources.

## How to use web search

**Note:** Your organization's administrator must enable web search in Console.

Provide the web search tool in your API request:

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
                "content": "What is the weather in NYC?"
            }
        ],
        "tools": [{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 5
        }]
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
            "content": "What's the weather in NYC?"
        }
    ],
    tools=[{
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 5
    }]
)
print(response)
```

**TypeScript:**
```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function main() {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "What's the weather in NYC?"
      }
    ],
    tools: [{
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5
    }]
  });

  console.log(response);
}

main().catch(console.error);
```

### Tool definition

The web search tool supports the following parameters:

```json
{
  "type": "web_search_20250305",
  "name": "web_search",

  // Optional: Limit the number of searches per request
  "max_uses": 5,

  // Optional: Only include results from these domains
  "allowed_domains": ["example.com", "trusteddomain.org"],

  // Optional: Never include results from these domains
  "blocked_domains": ["untrustedsource.com"],

  // Optional: Localize search results
  "user_location": {
    "type": "approximate",
    "city": "San Francisco",
    "region": "California",
    "country": "US",
    "timezone": "America/Los_Angeles"
  }
}
```

#### Max uses

The `max_uses` parameter limits the number of searches performed. If Claude attempts more searches than allowed, the `web_search_tool_result` will be an error with the `max_uses_exceeded` error code.

#### Domain filtering

When using domain filters:

- Domains should not include the HTTP/HTTPS scheme (use `example.com` instead of `https://example.com`)
- Subdomains are automatically included (`example.com` covers `docs.example.com`)
- Specific subdomains restrict results to only that subdomain (`docs.example.com` returns only results from that subdomain, not from `example.com` or `api.example.com`)
- Subpaths are supported and match anything after the path (`example.com/blog` matches `example.com/blog/post-1`)
- You can use either `allowed_domains` or `blocked_domains`, but not both in the same request.

**Wildcard support:**

- Only one wildcard (`*`) is allowed per domain entry, and it must appear after the domain part (in the path)
- Valid: `example.com/*`, `example.com/*/articles`
- Invalid: `*.example.com`, `ex*.com`, `example.com/*/news/*`

Invalid domain formats will return an `invalid_tool_input` tool error.

**Note:** Request-level domain restrictions must be compatible with organization-level domain restrictions configured in Console. Request-level domains can only further restrict domains, not override or expand beyond the organization-level list. If your request includes domains that conflict with organization settings, the API will return a validation error.

#### Localization

The `user_location` parameter allows you to localize search results based on a user's location.

- `type`: The type of location (must be `approximate`)
- `city`: The city name
- `region`: The region or state
- `country`: The country
- `timezone`: The IANA timezone ID

### Response

Here's an example response structure:

```json
{
  "role": "assistant",
  "content": [
    // 1. Claude's decision to search
    {
      "type": "text",
      "text": "I'll search for when Claude Shannon was born."
    },
    // 2. The search query used
    {
      "type": "server_tool_use",
      "id": "srvtoolu_01WYG3ziw53XMcoyKL4XcZmE",
      "name": "web_search",
      "input": {
        "query": "claude shannon birth date"
      }
    },
    // 3. Search results
    {
      "type": "web_search_tool_result",
      "tool_use_id": "srvtoolu_01WYG3ziw53XMcoyKL4XcZmE",
      "content": [
        {
          "type": "web_search_result",
          "url": "https://en.wikipedia.org/wiki/Claude_Shannon",
          "title": "Claude Shannon - Wikipedia",
          "encrypted_content": "EqgfCioIARgBIiQ3YTAwMjY1Mi1mZjM5LTQ1NGUtODgxNC1kNjNjNTk1ZWI3Y...",
          "page_age": "April 30, 2025"
        }
      ]
    },
    {
      "text": "Based on the search results, ",
      "type": "text"
    },
    // 4. Claude's response with citations
    {
      "text": "Claude Shannon was born on April 30, 1916, in Petoskey, Michigan",
      "type": "text",
      "citations": [
        {
          "type": "web_search_result_location",
          "url": "https://en.wikipedia.org/wiki/Claude_Shannon",
          "title": "Claude Shannon - Wikipedia",
          "encrypted_index": "Eo8BCioIAhgBIiQyYjQ0OWJmZi1lNm..",
          "cited_text": "Claude Elwood Shannon (April 30, 1916 – February 24, 2001) was an American mathematician, electrical engineer, computer scientist, cryptographer and i..."
        }
      ]
    }
  ],
  "id": "msg_a930390d3a",
  "usage": {
    "input_tokens": 6039,
    "output_tokens": 931,
    "server_tool_use": {
      "web_search_requests": 1
    }
  },
  "stop_reason": "end_turn"
}
```

#### Search results

Search results include:

- `url`: The URL of the source page
- `title`: The title of the source page
- `page_age`: When the site was last updated
- `encrypted_content`: Encrypted content that must be passed back in multi-turn conversations for citations

#### Citations

Citations are always enabled for web search, and each `web_search_result_location` includes:

- `url`: The URL of the cited source
- `title`: The title of the cited source
- `encrypted_index`: A reference that must be passed back for multi-turn conversations.
- `cited_text`: Up to 150 characters of the cited content

The web search citation fields `cited_text`, `title`, and `url` do not count towards input or output token usage.

**Note:** When displaying API outputs directly to end users, citations must be included to the original source. If you are making modifications to API outputs, including by reprocessing and/or combining them with your own material before displaying them to end users, display citations as appropriate based on consultation with your legal team.

#### Errors

When the web search tool encounters an error (such as hitting rate limits), the Claude API still returns a 200 (success) response. The error is represented within the response body using the following structure:

```json
{
  "type": "web_search_tool_result",
  "tool_use_id": "servertoolu_a93jad",
  "content": {
    "type": "web_search_tool_result_error",
    "error_code": "max_uses_exceeded"
  }
}
```

These are the possible error codes:

- `too_many_requests`: Rate limit exceeded
- `invalid_input`: Invalid search query parameter
- `max_uses_exceeded`: Maximum web search tool uses exceeded
- `query_too_long`: Query exceeds maximum length
- `unavailable`: An internal error occurred

#### `pause_turn` stop reason

The response may include a `pause_turn` stop reason, which indicates that the API paused a long-running turn. You may provide the response back as-is in a subsequent request to let Claude continue its turn, or modify the content if you wish to interrupt the conversation.

## Prompt caching

Web search works with prompt caching. To enable prompt caching, add at least one `cache_control` breakpoint in your request. The system will automatically cache up until the last `web_search_tool_result` block when executing the tool.

For multi-turn conversations, set a `cache_control` breakpoint on or after the last `web_search_tool_result` block to reuse cached content.

For example, to use prompt caching with web search for a multi-turn conversation:

```python
import anthropic

client = anthropic.Anthropic()

# First request with web search and cache breakpoint
messages = [
    {
        "role": "user",
        "content": "What's the current weather in San Francisco today?"
    }
]

response1 = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=messages,
    tools=[{
        "type": "web_search_20250305",
        "name": "web_search",
        "user_location": {
            "type": "approximate",
            "city": "San Francisco",
            "region": "California",
            "country": "US",
            "timezone": "America/Los_Angeles"
        }
    }]
)

# Add Claude's response to the conversation
messages.append({
    "role": "assistant",
    "content": response1.content
})

# Second request with cache breakpoint after the search results
messages.append({
    "role": "user",
    "content": "Should I expect rain later this week?",
    "cache_control": {"type": "ephemeral"}  # Cache up to this point
})

response2 = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=messages,
    tools=[{
        "type": "web_search_20250305",
        "name": "web_search",
        "user_location": {
            "type": "approximate",
            "city": "San Francisco",
            "region": "California",
            "country": "US",
            "timezone": "America/Los_Angeles"
        }
    }]
)
# The second response will benefit from cached search results
# while still being able to perform new searches if needed
print(f"Cache read tokens: {response2.usage.get('cache_read_input_tokens', 0)}")
```

## Streaming

With streaming enabled, you'll receive search events as part of the stream. There will be a pause while the search executes:

```javascript
event: message_start
data: {"type": "message_start", "message": {"id": "msg_abc123", "type": "message"}}

event: content_block_start
data: {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}

// Claude's decision to search

event: content_block_start
data: {"type": "content_block_start", "index": 1, "content_block": {"type": "server_tool_use", "id": "srvtoolu_xyz789", "name": "web_search"}}

// Search query streamed
event: content_block_delta
data: {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "{\"query\":\"latest quantum computing breakthroughs 2025\"}"}}

// Pause while search executes

// Search results streamed
event: content_block_start
data: {"type": "content_block_start", "index": 2, "content_block": {"type": "web_search_tool_result", "tool_use_id": "srvtoolu_xyz789", "content": [{"type": "web_search_result", "title": "Quantum Computing Breakthroughs in 2025", "url": "https://example.com"}]}}

// Claude's response with citations (omitted in this example)
```

## Batch requests

You can include the web search tool in the Messages Batches API. Web search tool calls through the Messages Batches API are priced the same as those in regular Messages API requests.

## Usage and pricing

Web search usage is charged in addition to token usage:

```json
"usage": {
  "input_tokens": 105,
  "output_tokens": 6039,
  "cache_read_input_tokens": 7123,
  "cache_creation_input_tokens": 7345,
  "server_tool_use": {
    "web_search_requests": 1
  }
}
```

Web search is available on the Claude API for **$10 per 1,000 searches**, plus standard token costs for search-generated content. Web search results retrieved throughout a conversation are counted as input tokens, in search iterations executed during a single turn and in subsequent conversation turns.

Each web search counts as one use, regardless of the number of results returned. If an error occurs during web search, the web search will not be billed.

---

# Tool search tool

---

The tool search tool enables Claude to work with hundreds or thousands of tools by dynamically discovering and loading them on-demand. Instead of loading all tool definitions into the context window upfront, Claude searches your tool catalog—including tool names, descriptions, argument names, and argument descriptions—and loads only the tools it needs.

This approach solves two critical challenges as tool libraries scale:

- **Context efficiency**: Tool definitions can consume massive portions of your context window (50 tools ≈ 10-20K tokens), leaving less room for actual work
- **Tool selection accuracy**: Claude's ability to correctly select tools degrades significantly with more than 30-50 conventionally-available tools

Although this is provided as a server-side tool, you can also implement your own client-side tool search functionality.

**Note:** The tool search tool is currently in public beta. Include the appropriate beta header for your provider:

| Provider | Beta header | Supported models |
|----------|------------|------------------|
| Claude API / Microsoft Foundry | `advanced-tool-use-2025-11-20` | Claude Opus 4.5, Claude Sonnet 4.5 |
| Google Cloud Vertex AI | `tool-search-tool-2025-10-19` | Claude Opus 4.5, Claude Sonnet 4.5 |
| Amazon Bedrock | `tool-search-tool-2025-10-19` | Claude Opus 4.5 |

Please reach out through the feedback form to share your feedback on this feature.

**Warning:** On Amazon Bedrock, server-side tool search is available only via the invoke API, not the converse API.

## How tool search works

There are two tool search variants:

- **Regex** (`tool_search_tool_regex_20251119`): Claude constructs regex patterns to search for tools
- **BM25** (`tool_search_tool_bm25_20251119`): Claude uses natural language queries to search for tools

When you enable the tool search tool:

1. You include a tool search tool in your tools list
2. You provide all tool definitions with `defer_loading: true` for tools that shouldn't be loaded immediately
3. Claude sees only the tool search tool and any non-deferred tools initially
4. When Claude needs additional tools, it searches using a tool search tool
5. The API returns 3-5 most relevant `tool_reference` blocks
6. These references are automatically expanded into full tool definitions
7. Claude selects from the discovered tools and invokes them

This keeps your context window efficient while maintaining high tool selection accuracy.

## Quick start

Here's a simple example with deferred tools:

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "anthropic-version: 2023-06-01" \
    --header "anthropic-beta: advanced-tool-use-2025-11-20" \
    --header "content-type: application/json" \
    --data '{
        "model": "claude-sonnet-4-5-20250929",
        "max_tokens": 2048,
        "messages": [
            {
                "role": "user",
                "content": "What is the weather in San Francisco?"
            }
        ],
        "tools": [
            {
                "type": "tool_search_tool_regex_20251119",
                "name": "tool_search_tool_regex"
            },
            {
                "name": "get_weather",
                "description": "Get the weather at a specific location",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"},
                        "unit": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"]
                        }
                    },
                    "required": ["location"]
                },
                "defer_loading": true
            },
            {
                "name": "search_files",
                "description": "Search through files in the workspace",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "file_types": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["query"]
                },
                "defer_loading": true
            }
        ]
    }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    betas=["advanced-tool-use-2025-11-20"],
    max_tokens=2048,
    messages=[
        {
            "role": "user",
            "content": "What is the weather in San Francisco?"
        }
    ],
    tools=[
        {
            "type": "tool_search_tool_regex_20251119",
            "name": "tool_search_tool_regex"
        },
        {
            "name": "get_weather",
            "description": "Get the weather at a specific location",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"]
                    }
                },
                "required": ["location"]
            },
            "defer_loading": True
        },
        {
            "name": "search_files",
            "description": "Search through files in the workspace",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "file_types": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["query"]
            },
            "defer_loading": True
        }
    ]
)

print(response)
```

**TypeScript:**
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const response = await client.beta.messages.create({
    model: "claude-sonnet-4-5-20250929",
    betas: ["advanced-tool-use-2025-11-20"],
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: "What is the weather in San Francisco?",
      },
    ],
    tools: [
      {
        type: "tool_search_tool_regex_20251119",
        name: "tool_search_tool_regex",
      },
      {
        name: "get_weather",
        description: "Get the weather at a specific location",
        input_schema: {
          type: "object",
          properties: {
            location: { type: "string" },
            unit: {
              type: "string",
              enum: ["celsius", "fahrenheit"],
            },
          },
          required: ["location"],
        },
        defer_loading: true,
      },
      {
        name: "search_files",
        description: "Search through files in the workspace",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            file_types: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["query"],
        },
        defer_loading: true,
      },
    ],
  });

  console.log(JSON.stringify(response, null, 2));
}

main();
```

## Tool definition

The tool search tool has two variants:

**Regex variant:**
```json
{
  "type": "tool_search_tool_regex_20251119",
  "name": "tool_search_tool_regex"
}
```

**BM25 variant:**
```json
{
  "type": "tool_search_tool_bm25_20251119",
  "name": "tool_search_tool_bm25"
}
```

**Warning:** Regex variant query format uses Python regex, NOT natural language. When using `tool_search_tool_regex_20251119`, Claude constructs regex patterns using Python's `re.search()` syntax. Common patterns:

- `"weather"` - matches tool names/descriptions containing "weather"
- `"get_.*_data"` - matches tools like `get_user_data`, `get_weather_data`
- `"database.*query|query.*database"` - OR patterns for flexibility
- `"(?i)slack"` - case-insensitive search

Maximum query length: 200 characters

**Note:** When using `tool_search_tool_bm25_20251119`, Claude uses natural language queries to search for tools.

### Deferred tool loading

Mark tools for on-demand loading by adding `defer_loading: true`:

```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": { "type": "string" },
      "unit": { "type": "string", "enum": ["celsius", "fahrenheit"] }
    },
    "required": ["location"]
  },
  "defer_loading": true
}
```

**Key points:**

- Tools without `defer_loading` are loaded into context immediately
- Tools with `defer_loading: true` are only loaded when Claude discovers them via search
- The tool search tool itself should **never** have `defer_loading: true`
- Keep your 3-5 most frequently used tools as non-deferred for optimal performance

Both tool search variants search tool names, descriptions, argument names, and argument descriptions.

## Response format

When Claude uses the tool search tool, the response includes new block types:

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I'll search for tools to help with the weather information."
    },
    {
      "type": "server_tool_use",
      "id": "srvtoolu_01ABC123",
      "name": "tool_search_tool_regex",
      "input": {
        "query": "weather"
      }
    },
    {
      "type": "tool_search_tool_result",
      "tool_use_id": "srvtoolu_01ABC123",
      "content": {
        "type": "tool_search_tool_search_result",
        "tool_references": [{ "type": "tool_reference", "tool_name": "get_weather" }]
      }
    },
    {
      "type": "text",
      "text": "I found a weather tool. Let me get the weather for San Francisco."
    },
    {
      "type": "tool_use",
      "id": "toolu_01XYZ789",
      "name": "get_weather",
      "input": { "location": "San Francisco", "unit": "fahrenheit" }
    }
  ],
  "stop_reason": "tool_use"
}
```

### Understanding the response

- **`server_tool_use`**: Indicates Claude is invoking the tool search tool
- **`tool_search_tool_result`**: Contains the search results with a nested `tool_search_tool_search_result` object
- **`tool_references`**: Array of `tool_reference` objects pointing to discovered tools
- **`tool_use`**: Claude invoking the discovered tool

The `tool_reference` blocks are automatically expanded into full tool definitions before being shown to Claude. You don't need to handle this expansion yourself—it happens automatically in the API as long as you provide all matching tool definitions in the `tools` parameter.

## MCP integration

The tool search tool works with MCP servers. Add the `"mcp-client-2025-11-20"` beta header to your API request, and then use `mcp_toolset` with `default_config` to defer loading MCP tools:

**Shell:**
```bash
curl https://api.anthropic.com/v1/messages \
  --header "x-api-key: $ANTHROPIC_API_KEY" \
  --header "anthropic-version: 2023-06-01" \
  --header "anthropic-beta: advanced-tool-use-2025-11-20,mcp-client-2025-11-20" \
  --header "content-type: application/json" \
  --data '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 2048,
    "mcp_servers": [
      {
        "type": "url",
        "name": "database-server",
        "url": "https://mcp-db.example.com"
      }
    ],
    "tools": [
      {
        "type": "tool_search_tool_regex_20251119",
        "name": "tool_search_tool_regex"
      },
      {
        "type": "mcp_toolset",
        "mcp_server_name": "database-server",
        "default_config": {
          "defer_loading": true
        },
        "configs": {
          "search_events": {
            "defer_loading": false
          }
        }
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "What events are in my database?"
      }
    ]
  }'
```

**Python:**
```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    betas=["advanced-tool-use-2025-11-20", "mcp-client-2025-11-20"],
    max_tokens=2048,
    mcp_servers=[
        {
            "type": "url",
            "name": "database-server",
            "url": "https://mcp-db.example.com"
        }
    ],
    tools=[
        {
            "type": "tool_search_tool_regex_20251119",
            "name": "tool_search_tool_regex"
        },
        {
            "type": "mcp_toolset",
            "mcp_server_name": "database-server",
            "default_config": {
                "defer_loading": True
            },
            "configs": {
                "search_events": {
                    "defer_loading": False
                }
            }
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "What events are in my database?"
        }
    ]
)

print(response)
```

**TypeScript:**
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const response = await client.beta.messages.create({
    model: "claude-sonnet-4-5-20250929",
    betas: ["advanced-tool-use-2025-11-20", "mcp-client-2025-11-20"],
    max_tokens: 2048,
    mcp_servers: [
      {
        type: "url",
        name: "database-server",
        url: "https://mcp-db.example.com",
      },
    ],
    tools: [
      {
        type: "tool_search_tool_regex_20251119",
        name: "tool_search_tool_regex",
      },
      {
        type: "mcp_toolset",
        mcp_server_name: "database-server",
        default_config: {
          defer_loading: true,
        },
        configs: {
          search_events: {
            defer_loading: false,
          },
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: "What events are in my database?",
      },
    ],
  });

  console.log(JSON.stringify(response, null, 2));
}

main();
```

**MCP configuration options:**

- `default_config.defer_loading`: Set default for all tools from the MCP server
- `configs`: Override defaults for specific tools by name
- Combine multiple MCP servers with tool search for massive tool libraries

## Custom tool search implementation

You can implement your own tool search logic (e.g., using embeddings or semantic search) by returning `tool_reference` blocks from a custom tool. When Claude calls your custom search tool, return a standard `tool_result` with `tool_reference` blocks in the content array:

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_your_tool_id",
  "content": [
    { "type": "tool_reference", "tool_name": "discovered_tool_name" }
  ]
}
```

Every tool referenced must have a corresponding tool definition in the top-level `tools` parameter with `defer_loading: true`. This approach lets you use more sophisticated search algorithms while maintaining compatibility with the tool search system.

**Note:** The `tool_search_tool_result` format is the server-side format used internally by Anthropic's built-in tool search. For custom client-side implementations, always use the standard `tool_result` format with `tool_reference` content blocks as shown above.

## Error handling

**Note:** The tool search tool is not compatible with tool use examples. If you need to provide examples of tool usage, use standard tool calling without tool search.

### HTTP errors (400 status)

**All tools deferred:**
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "All tools have defer_loading set. At least one tool must be non-deferred."
  }
}
```

**Missing tool definition:**
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Tool reference 'unknown_tool' has no corresponding tool definition"
  }
}
```

### Tool result errors (200 status)

Errors during tool execution return a 200 response with error information in the body:

```json
{
  "type": "tool_result",
  "tool_use_id": "srvtoolu_01ABC123",
  "content": {
    "type": "tool_search_tool_result_error",
    "error_code": "invalid_pattern"
  }
}
```

**Error codes:**

- `too_many_requests`: Rate limit exceeded for tool search operations
- `invalid_pattern`: Malformed regex pattern
- `pattern_too_long`: Pattern exceeds 200 character limit
- `unavailable`: Tool search service temporarily unavailable

### Common mistakes

**400 Error: All tools are deferred**

Cause: You set `defer_loading: true` on ALL tools including the search tool

Fix: Remove `defer_loading` from the tool search tool:

```json
{
  "type": "tool_search_tool_regex_20251119",
  "name": "tool_search_tool_regex"
}
```

**400 Error: Missing tool definition**

Cause: A `tool_reference` points to a tool not in your `tools` array

Fix: Ensure every tool that could be discovered has a complete definition:

```json
{
  "name": "my_tool",
  "description": "Full description here",
  "input_schema": {
    "type": "object",
    "properties": {}
  },
  "defer_loading": true
}
```

**Claude doesn't find expected tools**

Cause: Tool names or descriptions don't match the regex pattern

Debugging steps:

1. Check tool name and description—Claude searches BOTH fields
2. Test your pattern: `import re; re.search(r"your_pattern", "tool_name")`
3. Remember searches are case-sensitive by default (use `(?i)` for case-insensitive)
4. Claude uses broad patterns like `".*weather.*"` not exact matches

Tip: Add common keywords to tool descriptions to improve discoverability

## Prompt caching

Tool search works with prompt caching. Add `cache_control` breakpoints to optimize multi-turn conversations:

```python
import anthropic

client = anthropic.Anthropic()

# First request with tool search
messages = [
    {
        "role": "user",
        "content": "What's the weather in Seattle?"
    }
]

response1 = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    betas=["advanced-tool-use-2025-11-20"],
    max_tokens=2048,
    messages=messages,
    tools=[
        {
            "type": "tool_search_tool_regex_20251119",
            "name": "tool_search_tool_regex"
        },
        {
            "name": "get_weather",
            "description": "Get weather for a location",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                },
                "required": ["location"]
            },
            "defer_loading": True
        }
    ]
)

# Add Claude's response to conversation
messages.append({
    "role": "assistant",
    "content": response1.content
})

# Second request with cache breakpoint
messages.append({
    "role": "user",
    "content": "What about New York?",
    "cache_control": {"type": "ephemeral"}
})

response2 = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    betas=["advanced-tool-use-2025-11-20"],
    max_tokens=2048,
    messages=messages,
    tools=[
        {
            "type": "tool_search_tool_regex_20251119",
            "name": "tool_search_tool_regex"
        },
        {
            "name": "get_weather",
            "description": "Get weather for a location",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                },
                "required": ["location"]
            },
            "defer_loading": True
        }
    ]
)

print(f"Cache read tokens: {response2.usage.get('cache_read_input_tokens', 0)}")
```

The system automatically expands tool_reference blocks throughout the entire conversation history, so Claude can reuse discovered tools in subsequent turns without re-searching.

## Streaming

With streaming enabled, you'll receive tool search events as part of the stream:

```javascript
event: content_block_start
data: {"type": "content_block_start", "index": 1, "content_block": {"type": "server_tool_use", "id": "srvtoolu_xyz789", "name": "tool_search_tool_regex"}}

// Search query streamed
event: content_block_delta
data: {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "{\"query\":\"weather\"}"}}

// Pause while search executes

// Search results streamed
event: content_block_start
data: {"type": "content_block_start", "index": 2, "content_block": {"type": "tool_search_tool_result", "tool_use_id": "srvtoolu_xyz789", "content": {"type": "tool_search_tool_search_result", "tool_references": [{"type": "tool_reference", "tool_name": "get_weather"}]}}}

// Claude continues with discovered tools
```

## Batch requests

You can include the tool search tool in the Messages Batches API. Tool search operations through the Messages Batches API are priced the same as those in regular Messages API requests.

## Limits and best practices

### Limits

- **Maximum tools**: 10,000 tools in your catalog
- **Search results**: Returns 3-5 most relevant tools per search
- **Pattern length**: Maximum 200 characters for regex patterns
- **Model support**: Sonnet 4.0+, Opus 4.0+ only (no Haiku)

### When to use tool search

**Good use cases:**

- 10+ tools available in your system
- Tool definitions consuming >10K tokens
- Experiencing tool selection accuracy issues with large tool sets
- Building MCP-powered systems with multiple servers (200+ tools)
- Tool library growing over time

**When traditional tool calling might be better:**

- Less than 10 tools total
- All tools are frequently used in every request
- Very small tool definitions (<100 tokens total)

### Optimization tips

- Keep 3-5 most frequently used tools as non-deferred
- Write clear, descriptive tool names and descriptions
- Use semantic keywords in descriptions that match how users describe tasks
- Add a system prompt section describing available tool categories: "You can search for tools to interact with Slack, GitHub, and Jira"
- Monitor which tools Claude discovers to refine descriptions

## Usage

Tool search tool usage is tracked in the response usage object:

```json
{
  "usage": {
    "input_tokens": 1024,
    "output_tokens": 256,
    "server_tool_use": {
      "tool_search_requests": 2
    }
  }
}
```
