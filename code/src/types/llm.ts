/**
 * LLM request/response types (OpenAI-compatible format)
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface RedactionLLMResponse {
  redacted_text: string;
  mappings: Record<string, string>; // pseudonym -> real value
}

export interface LLMError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}
