import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types";
import fetch from "node-fetch";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import readline from "readline";

// Configuration
const MCP_SERVER_URL = "http://localhost:4001/mcp";

// Replace this with any LLM endpoint you want (e.g., OpenAI, Ollama, Anthropic)
const LLM_API_URL = "http://localhost:11434/api/chat";
const LLM_MODEL = "llama3.2";
// const LLM_MODEL = "qwen3:4b";
// const LLM_MODEL = "phi4-mini";

/**
 * Sends a chat request to a generic LLM endpoint.
 * @param messages - Conversation history
 * @param tools - Tools defined in OpenAI-compatible schema
 */
async function callLLM(
  messages: ChatCompletionMessageParam[],
  tools: any[]
): Promise<ChatCompletionMessageParam> {
  const body = {
    model: LLM_MODEL,
    messages,
    tools,
    think: false,
    stream: false,
  };

  console.log("📤 Sending prompt to LLM:", JSON.stringify(messages, null, 2));

  const res = await fetch(LLM_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log("📥 LLM response:", JSON.stringify(data));
  return (
    data?.message ?? { role: "assistant", content: "⚠️ No message received." }
  );
}

/**
 * Queries the MCP server for available tools.
 */
async function getToolList(client: Client) {
  const result = await client.request(
    { method: "tools/list", params: {} },
    ListToolsResultSchema
  );

  console.log(
    "🛠️ Available tools:",
    result.tools.map((t) => t.name)
  );

  return result.tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

/**
 * Prompts the user in terminal.
 */
function promptInput(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

/**
 * Main function to start the MCP client, fetch tools, interact with the user,
 * call the LLM, and handle any tool invocations.
 */
async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
  const client = new Client({ name: "ollama-client", version: "1.0.0" });
  await client.connect(transport);

  const tools = await getToolList(client);
  const messages: ChatCompletionMessageParam[] = [];

  messages.push({
    role: "system",
    content: `You are an AI assistant with access to MCP tools. 
    If you're unsure, ask clarifying questions. Always consider tool descriptions before responding.`,
  });

  console.log("💬 Chat started. Type your message (or 'exit' to quit):");

  while (true) {
    const userInput = await promptInput("You: ");
    if (userInput.toLowerCase() === "exit") break;

    messages.push({ role: "user", content: userInput });

    // 1. Initial response from LLM
    const firstResponse = await callLLM(messages, tools);

    // 2. If no tool calls, show response
    if (!firstResponse.tool_calls?.length) {
      console.log("🤖:", firstResponse.content);
      messages.push({ role: "assistant", content: firstResponse.content });
      continue;
    }

    // 3. Handle multiple tool calls
    const toolCalls = firstResponse.tool_calls;
    messages.push({
      role: "assistant",
      content: "",
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      console.log(
        "🔧 Tool call:",
        toolCall.function.name,
        toolCall.function.arguments
      );

      const toolResponse = await client.callTool({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      });

      let toolOutput = "";
      for await (const item of toolResponse.content) {
        if (item.type === "text") toolOutput += item.text;
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id ?? toolCall.function.name,
        content: toolOutput,
      });
    }

    // 4. Final LLM response after tool results
    // Show loading dots while waiting
    const loading = ["⏳", "⌛", "🤖", "💬"];
    let i = 0;

    const spinner = setInterval(() => {
      console.log(`Waiting for LLM... ${loading[i % loading.length]}`);
      i++;
    }, 1000);

    const finalResponse = await callLLM(messages, tools);

    clearInterval(spinner); // stop spinner after response
    console.log("🤖:", finalResponse.content);

    messages.push({ role: "assistant", content: finalResponse.content });
  }

  await transport.close();
  console.log("🔌 Disconnected from MCP server.");
}

// Entry point
main().catch((err) => {
  console.error("❌ Client error:", err);
});
