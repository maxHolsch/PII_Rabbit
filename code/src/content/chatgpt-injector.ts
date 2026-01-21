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
      // Find input element
      const input = findChatGPTInput();
      if (!input) {
        throw new Error('ChatGPT input not found');
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

      // Find and click send button
      const sendButton = this.findSendButton();
      if (!sendButton) {
        throw new Error('Send button not found');
      }

      logger.debug('injector:button-found', 'Send button found');

      // Wait for button to be enabled
      const buttonReady = await this.waitForButtonEnabled(sendButton, 2000);
      if (!buttonReady) {
        throw new Error('Send button not enabled');
      }

      // Click send button
      clickReactElement(sendButton);
      await this.sleep(100);

      // Also try triggering form submit as fallback
      const form = input.closest('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }

      logger.info('injector:complete', 'Injection completed successfully');

      return true;
    } catch (error) {
      logger.error('injector:error', 'Injection failed', {
        error: String(error),
      });
      return false;
    }
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
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
