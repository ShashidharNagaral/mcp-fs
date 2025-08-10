import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/index";

export interface LLMProvider {
  chat(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[]
  ): Promise<ChatCompletionAssistantMessageParam>;
}
