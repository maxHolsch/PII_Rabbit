/**
 * Background service worker
 * Handles cross-tab communication and LLM API calls
 */

import { logger } from '@/utils/logger';

logger.info('background:init', 'Service worker started');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('background:installed', 'Extension installed', {
    reason: details.reason,
  });

  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      enabled: true,
      llmEndpoint: 'http://localhost:1234',
      llmModel: 'qwen/qwen3-4b-thinking-2507',
      autoRedact: true,
      debugMode: false,
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('background:message', 'Received message', {
    type: message.type,
    from: sender.tab?.id || 'popup',
  });

  switch (message.type) {
    case 'llm:request':
      handleLLMRequest(message.data)
        .then(sendResponse)
        .catch((error) => {
          logger.error('background:llm', 'LLM request failed', {
            error: String(error),
          });
          sendResponse({ error: String(error) });
        });
      return true; // Keep channel open for async response

    case 'settings:get':
      chrome.storage.local.get(null, (settings) => {
        sendResponse(settings);
      });
      return true;

    case 'settings:set':
      chrome.storage.local.set(message.data, () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      logger.warn('background:message', 'Unknown message type', {
        type: message.type,
      });
  }
});

/**
 * Handle LLM API request
 */
async function handleLLMRequest(data: any): Promise<any> {
  const { endpoint, model, messages, temperature, max_tokens } = data;

  const startTime = Date.now();
  logger.info('background:llm', 'Making LLM request', {
    endpoint,
    model,
    messageCount: messages.length,
  });

  try {
    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.3,
        max_tokens: max_tokens ?? -1,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const latency = Date.now() - startTime;

    logger.info('background:llm', 'LLM request completed', {
      latency,
      tokens: result.usage?.total_tokens,
    });

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error('background:llm', 'LLM request error', {
      error: String(error),
      latency,
    });
    throw error;
  }
}
