/**
 * ChatGPT page detection and validation
 */

import { logger } from '@/utils/logger';

export class ChatGPTDetector {
  private static VALID_HOSTS = ['chatgpt.com', 'chat.openai.com'];

  /**
   * Check if current page is ChatGPT
   */
  static isChatGPTPage(): boolean {
    const hostname = window.location.hostname;
    const isValid = this.VALID_HOSTS.some((host) => hostname.includes(host));

    logger.debug('detector:check', 'Page validation', {
      hostname,
      isValid,
    });

    return isValid;
  }

  /**
   * Wait for ChatGPT UI to be ready
   */
  static async waitForReady(timeout = 10000): Promise<boolean> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const check = () => {
        // Check for main content area
        const main = document.querySelector('main');
        if (main) {
          logger.info('detector:ready', 'ChatGPT UI ready', {
            loadTime: Date.now() - startTime,
          });
          resolve(true);
          return;
        }

        // Timeout check
        if (Date.now() - startTime > timeout) {
          logger.warn('detector:ready', 'Timeout waiting for ChatGPT UI', {
            timeout,
          });
          resolve(false);
          return;
        }

        // Continue checking
        setTimeout(check, 100);
      };

      check();
    });
  }

  /**
   * Get current conversation ID from URL
   */
  static getConversationId(): string {
    const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
    if (match) {
      return match[1];
    }

    // Return temp ID for new conversations
    return `temp-${Date.now()}`;
  }

  /**
   * Check if conversation ID is temporary
   */
  static isTempId(id: string): boolean {
    return id.startsWith('temp-');
  }
}
