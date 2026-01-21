/**
 * DOM manipulation utilities
 * Handles Shadow DOM creation and injection
 */

import { logger } from './logger';

/**
 * Create a Shadow DOM host element
 */
export function createShadowHost(
  id: string,
  className?: string
): HTMLDivElement {
  const host = document.createElement('div');
  host.id = id;
  if (className) {
    host.className = className;
  }
  return host;
}

/**
 * Attach Shadow DOM to a host element
 */
export function attachShadowRoot(
  host: HTMLElement,
  mode: 'open' | 'closed' = 'open'
): ShadowRoot {
  if (host.shadowRoot) {
    logger.warn('dom:shadow', 'Shadow root already exists', { hostId: host.id });
    return host.shadowRoot;
  }

  const shadowRoot = host.attachShadow({ mode });
  logger.debug('dom:shadow', 'Shadow root attached', { hostId: host.id });
  return shadowRoot;
}

/**
 * Inject styles into Shadow DOM
 */
export function injectStyles(shadowRoot: ShadowRoot, css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  shadowRoot.appendChild(style);
}

/**
 * Find ChatGPT's main content area
 */
export function findChatGPTMainArea(): HTMLElement | null {
  // ChatGPT uses various selectors, try multiple approaches
  const selectors = [
    'main',
    '[role="main"]',
    '.flex.flex-col.items-center',
    '#__next > div > div > main',
  ];

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      logger.debug('dom:find-main', 'Found main area', { selector });
      return element;
    }
  }

  logger.warn('dom:find-main', 'Could not find main area');
  return null;
}

/**
 * Find ChatGPT's input textarea
 */
export function findChatGPTInput(): HTMLTextAreaElement | HTMLElement | null {
  // Try multiple selectors for ChatGPT's input
  const selectors = [
    'textarea[data-id]',
    'textarea#prompt-textarea',
    '[contenteditable="true"]',
    'textarea',
  ];

  for (const selector of selectors) {
    const element = document.querySelector<HTMLTextAreaElement>(selector);
    if (element && isVisibleInput(element)) {
      logger.debug('dom:find-input', 'Found input element', { selector });
      return element;
    }
  }

  logger.warn('dom:find-input', 'Could not find input element');
  return null;
}

/**
 * Check if an element is a visible input
 */
function isVisibleInput(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.offsetParent !== null
  );
}

/**
 * Find message containers in ChatGPT
 */
export function findMessageContainers(): HTMLElement[] {
  const containers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-message-author-role]')
  );

  logger.debug('dom:find-messages', 'Found message containers', {
    count: containers.length,
  });

  return containers;
}

/**
 * Extract message text from a container
 */
export function extractMessageText(container: HTMLElement): string {
  // ChatGPT messages are typically in markdown/prose divs
  const textElement = container.querySelector('.markdown, .prose, p');
  return textElement?.textContent || '';
}

/**
 * Check if element is a ChatGPT message
 */
export function isMessageContainer(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;

  return (
    node.hasAttribute('data-message-author-role') ||
    node.classList.contains('group') ||
    Boolean(node.querySelector('[data-message-author-role]'))
  );
}

/**
 * Wait for element to appear in DOM
 */
export function waitForElement(
  selector: string,
  timeout = 5000
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Inject element into DOM at specific position
 */
export function injectElement(
  element: HTMLElement,
  target: HTMLElement,
  position: 'before' | 'after' | 'prepend' | 'append' = 'append'
): void {
  switch (position) {
    case 'before':
      target.parentNode?.insertBefore(element, target);
      break;
    case 'after':
      target.parentNode?.insertBefore(element, target.nextSibling);
      break;
    case 'prepend':
      target.insertBefore(element, target.firstChild);
      break;
    case 'append':
      target.appendChild(element);
      break;
  }

  logger.debug('dom:inject', 'Element injected', {
    elementId: element.id,
    position,
  });
}
