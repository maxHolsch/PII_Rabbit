/**
 * Shadow DOM host injection for overlays
 */

import { logger } from '@/utils/logger';
import {
  createShadowHost,
  attachShadowRoot,
  findChatGPTMainArea,
  injectElement,
} from '@/utils/dom-utils';

export class ShadowInjector {
  private hosts: Map<string, HTMLElement> = new Map();

  /**
   * Inject a Shadow DOM host for an overlay
   */
  injectHost(
    id: string,
    position: 'before' | 'after' | 'prepend' | 'append' = 'append'
  ): ShadowRoot | null {
    // Check if already injected
    if (this.hosts.has(id)) {
      logger.debug('injector:host', 'Host already exists', { id });
      const existing = this.hosts.get(id)!;
      return existing.shadowRoot;
    }

    // Find main area
    const mainArea = findChatGPTMainArea();
    if (!mainArea) {
      logger.error('injector:host', 'Cannot inject - main area not found', {
        id,
      });
      return null;
    }

    // Create host
    const host = createShadowHost(id, 'pii-shield-overlay');
    const shadowRoot = attachShadowRoot(host);

    // Inject into DOM
    injectElement(host, mainArea, position);
    this.hosts.set(id, host);

    logger.info('injector:host', 'Shadow host injected', {
      id,
      position,
    });

    return shadowRoot;
  }

  /**
   * Remove a Shadow DOM host
   */
  removeHost(id: string): void {
    const host = this.hosts.get(id);
    if (host) {
      host.remove();
      this.hosts.delete(id);
      logger.info('injector:remove', 'Shadow host removed', { id });
    }
  }

  /**
   * Get existing Shadow Root
   */
  getHost(id: string): HTMLElement | null {
    return this.hosts.get(id) || null;
  }

  /**
   * Check if host exists
   */
  hasHost(id: string): boolean {
    return this.hosts.has(id);
  }

  /**
   * Remove all hosts
   */
  cleanup(): void {
    this.hosts.forEach((host) => host.remove());
    this.hosts.clear();
    logger.info('injector:cleanup', 'All shadow hosts removed');
  }
}

// Singleton instance
export const shadowInjector = new ShadowInjector();
