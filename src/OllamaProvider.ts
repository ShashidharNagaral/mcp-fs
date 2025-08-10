import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/index";
import { LLMProvider } from "./LLMProvider";

export class OllamaProvider implements LLMProvider {
  private readonly url: URL;
  private readonly model: string;

  constructor(model: string, url?: string) {
    this.url = new URL(
      process.env.LLM_API_URL ?? url ?? "http://localhost:11434/api/chat"
    );
    this.model = process.env.LLM_MODEL ?? model;
  }

  async chat(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[]
  ): Promise<ChatCompletionAssistantMessageParam> {
    const body = {
      model: this.model,
      messages,
      tools,
      think: false,
      stream: false,
    };

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    return (
      data?.message ?? { role: "assistant", content: "⚠️ No message received." }
    );
  }
}
