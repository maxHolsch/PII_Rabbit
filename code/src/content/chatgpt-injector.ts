/**
 * ChatGPT text injector
 * Handles injecting redacted text into ChatGPT's input and triggering send
 */

import { logger } from '@/utils/logger';
import { findChatGPTInput } from '@/utils/dom-utils';
import {
  setReactInputValue,
  setContentEditableValue,
  clickReactElement,
  waitForInteractive,
} from '@/utils/react-sync';

export class ChatGPTInjector {
  /**
   * Inject text into ChatGPT input and trigger send
   */
  async injectAndSend(text: string): Promise<boolean> {
    logger.info('injector:start', 'Starting injection', {
      textLength: text.length,
    });

    try {
      // Find and validate input element
      let input = await this.validateAndRefresh(
        findChatGPTInput(),
        findChatGPTInput
      );

      if (!input) {
        throw new Error('ChatGPT input not found or invalid');
      }

      logger.debug('injector:input-found', 'Input element found', {
        tagName: input.tagName,
        type: input.getAttribute('type'),
        contentEditable: input.getAttribute('contenteditable'),
      });

      // Wait for input to be ready
      const ready = await waitForInteractive(input, 2000);
      if (!ready) {
        throw new Error('Input not ready for interaction');
      }

      // Validate input again before focusing
      input = await this.validateAndRefresh(input, findChatGPTInput);
      if (!input) {
        throw new Error('Input element became invalid');
      }

      // Focus input
      input.focus();
      await this.sleep(100);

      // Set text based on input type
      let success = false;
      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
        success = setReactInputValue(input, text);
      } else if (input.getAttribute('contenteditable') === 'true') {
        success = setContentEditableValue(input, text);
      } else {
        throw new Error('Unknown input type');
      }

      if (!success) {
        throw new Error('Failed to set input value');
      }

      logger.debug('injector:text-set', 'Text set in input');

      // Wait for React to update
      await this.sleep(200);

      // Find and validate send button
      let sendButton = await this.validateAndRefresh(
        this.findSendButton(),
        () => this.findSendButton()
      );

      if (!sendButton) {
        throw new Error('Send button not found or invalid');
      }

      logger.debug('injector:button-found', 'Send button found');

      // Wait for button to be enabled
      const buttonReady = await this.waitForButtonEnabled(sendButton, 2000);
      if (!buttonReady) {
        throw new Error('Send button not enabled');
      }

      // Validate button again before clicking
      sendButton = await this.validateAndRefresh(
        sendButton,
        () => this.findSendButton()
      );

      if (!sendButton) {
        throw new Error('Send button became invalid');
      }

      // Click send button
      clickReactElement(sendButton);

      // Wait to verify the send actually happened
      const sent = await this.waitForSendConfirmation(input, sendButton, 3000);

      if (!sent) {
        // Only use fallback if we confirmed the first attempt failed
        logger.debug('injector:fallback', 'Send not confirmed, trying form submit');

        // Validate input again before using it
        input = await this.validateAndRefresh(input, findChatGPTInput);
        if (!input) {
          throw new Error('Input element became invalid before fallback');
        }

        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

          // Validate button for fallback confirmation check
          sendButton = await this.validateAndRefresh(
            sendButton,
            () => this.findSendButton()
          );

          if (!sendButton) {
            throw new Error('Send button became invalid during fallback');
          }

          // Wait again
          const sentFallback = await this.waitForSendConfirmation(input, sendButton, 3000);
          if (!sentFallback) {
            throw new Error('Failed to send message after fallback attempt');
          }
        } else {
          throw new Error('Failed to send message and no form found');
        }
      }

      logger.info('injector:complete', 'Injection completed successfully');

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('injector:error', 'Injection failed', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Emit specific error event for UI feedback
      if (typeof window !== 'undefined' && (window as any).__piiShieldEventBus) {
        (window as any).__piiShieldEventBus.emit('injection:error', {
          error: errorMessage,
          type: this.categorizeError(errorMessage),
          recoverable: this.isRecoverableError(errorMessage),
        });
      }

      return false;
    }
  }

  /**
   * Categorize error for better user feedback
   */
  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('not found')) {
      return 'element_not_found';
    }
    if (errorMessage.includes('not ready') || errorMessage.includes('not enabled')) {
      return 'element_not_ready';
    }
    if (errorMessage.includes('invalid') || errorMessage.includes('stale')) {
      return 'element_invalid';
    }
    if (errorMessage.includes('Failed to send')) {
      return 'send_failed';
    }
    if (errorMessage.includes('Failed to set')) {
      return 'value_set_failed';
    }
    return 'unknown';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(errorMessage: string): boolean {
    // Element-related errors are often recoverable with a retry
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('stale')
    ) {
      return true;
    }
    // Send verification failures might be recoverable
    if (errorMessage.includes('not confirmed')) {
      return true;
    }
    return false;
  }

  /**
   * Find ChatGPT's send button
   */
  private findSendButton(): HTMLElement | null {
    // Try multiple selectors for the send button
    const selectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button svg[class*="SendIcon"]',
      'form button[type="submit"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) {
        // If we found an SVG, get the button parent
        if (element.tagName === 'svg') {
          return element.closest('button');
        }
        return element;
      }
    }

    // Try finding by position (usually bottom right)
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      if (
        rect.bottom > window.innerHeight - 200 &&
        rect.right > window.innerWidth - 200
      ) {
        return button;
      }
    }

    return null;
  }

  /**
   * Wait for send button to be enabled
   */
  private async waitForButtonEnabled(
    button: HTMLElement,
    timeout = 2000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!button.hasAttribute('disabled') && !button.getAttribute('aria-disabled')) {
        return true;
      }

      await this.sleep(100);
    }

    return false;
  }

  /**
   * Wait for confirmation that message was actually sent
   * Checks for observable changes in ChatGPT UI:
   * - Input field is cleared
   * - Send button becomes disabled
   * - New message appears in conversation
   */
  private async waitForSendConfirmation(
    input: HTMLElement,
    sendButton: HTMLElement,
    timeout = 3000
  ): Promise<boolean> {
    const startTime = Date.now();
    const initialMessageCount = document.querySelectorAll('[data-message-author-role="user"]').length;

    logger.debug('injector:wait-confirmation', 'Waiting for send confirmation', {
      initialMessageCount,
      timeout,
    });

    while (Date.now() - startTime < timeout) {
      // Check if input has been cleared
      const inputValue = input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement
        ? input.value
        : input.textContent;

      const isInputCleared = !inputValue || inputValue.trim().length === 0;

      // Check if send button is disabled
      const isButtonDisabled = sendButton.hasAttribute('disabled') ||
                             sendButton.getAttribute('aria-disabled') === 'true';

      // Check if new message appeared
      const currentMessageCount = document.querySelectorAll('[data-message-author-role="user"]').length;
      const hasNewMessage = currentMessageCount > initialMessageCount;

      // Consider send confirmed if either:
      // 1. Input is cleared AND button is disabled (send in progress)
      // 2. New user message appears in conversation
      if ((isInputCleared && isButtonDisabled) || hasNewMessage) {
        logger.debug('injector:send-confirmed', 'Send confirmed', {
          isInputCleared,
          isButtonDisabled,
          hasNewMessage,
          elapsed: Date.now() - startTime,
        });
        return true;
      }

      await this.sleep(100);
    }

    logger.warn('injector:send-not-confirmed', 'Send not confirmed within timeout', {
      timeout,
    });
    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if element is valid and connected to DOM
   */
  private isElementValid(element: HTMLElement): boolean {
    return element.isConnected && document.contains(element);
  }

  /**
   * Validate element and refresh if needed
   * Returns fresh element reference or null if not found
   */
  private async validateAndRefresh<T extends HTMLElement>(
    element: T | null,
    finder: () => T | null,
    maxRetries = 3
  ): Promise<T | null> {
    // If element is valid, return it
    if (element && this.isElementValid(element)) {
      return element;
    }

    logger.debug('injector:refresh-element', 'Element is stale, attempting refresh', {
      maxRetries,
    });

    // Element is stale or invalid, try to find it again
    for (let i = 0; i < maxRetries; i++) {
      const fresh = finder();
      if (fresh && this.isElementValid(fresh)) {
        logger.debug('injector:element-refreshed', 'Element refreshed successfully', {
          attempt: i + 1,
        });
        return fresh;
      }
      await this.sleep(100);
    }

    logger.warn('injector:refresh-failed', 'Failed to refresh element', {
      maxRetries,
    });
    return null;
  }

  /**
   * Clear ChatGPT input
   */
  async clearInput(): Promise<boolean> {
    try {
      const input = findChatGPTInput();
      if (!input) {
        return false;
      }

      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
        setReactInputValue(input, '');
      } else if (input.getAttribute('contenteditable') === 'true') {
        setContentEditableValue(input, '');
      }

      logger.debug('injector:clear', 'Input cleared');
      return true;
    } catch (error) {
      logger.error('injector:clear', 'Failed to clear input', {
        error: String(error),
      });
      return false;
    }
  }
}

// Singleton instance
export const chatGPTInjector = new ChatGPTInjector();
