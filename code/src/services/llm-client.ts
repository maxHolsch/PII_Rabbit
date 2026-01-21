/**
 * LLM client for communicating with local LLM server
 * Uses background service worker to avoid CORS issues
 */

import { logger } from '@/utils/logger';
import type { LLMResponse, LLMMessage } from '@/types/llm';

export class LLMClient {
  private endpoint: string;
  private model: string;
  private timeout: number;

  constructor(endpoint: string, model: string, timeout = 30000) {
    this.endpoint = endpoint;
    this.model = model;
    this.timeout = timeout;
  }

  /**
   * Send a request to the LLM
   */
  async chat(messages: LLMMessage[], temperature = 0.3): Promise<LLMResponse> {
    const startTime = Date.now();

    logger.info('llm:request', 'Sending request to LLM', {
      endpoint: this.endpoint,
      model: this.model,
      messageCount: messages.length,
    });

    try {
      // Send request through background service worker
      const response = await this.sendMessage({
        type: 'llm:request',
        data: {
          endpoint: this.endpoint,
          model: this.model,
          messages,
          temperature,
          max_tokens: -1,
        },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const latency = Date.now() - startTime;
      logger.info('llm:response', 'Received response from LLM', {
        latency,
        tokens: response.usage?.total_tokens,
      });

      return response as LLMResponse;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('llm:error', 'LLM request failed', {
        error: String(error),
        latency,
      });
      throw this.handleError(error);
    }
  }

  /**
   * Send message to background service worker
   */
  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      }, this.timeout);

      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Handle LLM errors with user-friendly messages
   */
  private handleError(error: any): Error {
    const errorMessage = String(error);

    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ECONNREFUSED')) {
      return new Error(
        'Cannot connect to LLM server. Please ensure LM Studio is running on localhost:1234.'
      );
    }

    if (errorMessage.includes('timeout')) {
      return new Error(
        'LLM request timed out. The model may be taking too long to respond.'
      );
    }

    if (errorMessage.includes('HTTP 404')) {
      return new Error(
        'LLM endpoint not found. Please check your server configuration.'
      );
    }

    if (errorMessage.includes('HTTP 500')) {
      return new Error(
        'LLM server error. Please check the server logs.'
      );
    }

    return new Error(`LLM error: ${errorMessage}`);
  }

  /**
   * Test connection to LLM server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.chat([
        {
          role: 'user',
          content: 'Hello',
        },
      ]);
      return true;
    } catch (error) {
      logger.error('llm:test', 'Connection test failed', {
        error: String(error),
      });
      return false;
    }
  }
}

/**
 * Create LLM client from settings
 */
export async function createLLMClient(): Promise<LLMClient> {
  // Get settings from storage
  const settings = await chrome.runtime.sendMessage({
    type: 'settings:get',
  });

  return new LLMClient(
    settings.llmEndpoint || 'http://localhost:1234',
    settings.llmModel || 'qwen3-0.6b'
  );
}
