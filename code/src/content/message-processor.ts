/**
 * Message processor
 * Handles finding and replacing pseudonyms in ChatGPT messages
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { logger } from '@/utils/logger';
import { DeAnonymizedSpan } from '@/overlays/message-overlay/DeAnonymizedSpan';

export class MessageProcessor {
  /**
   * Process a message element and replace pseudonyms
   */
  async processMessage(
    messageElement: HTMLElement,
    mappings: Map<string, string>
  ): Promise<number> {
    if (mappings.size === 0) {
      return 0;
    }

    logger.debug('message:process', 'Processing message', {
      mappingCount: mappings.size,
    });

    let replacementCount = 0;

    // Find all text nodes in the message
    const textNodes = this.findTextNodes(messageElement);

    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const matches = this.findPseudonymsInText(text, mappings);

      if (matches.length > 0) {
        replacementCount += this.replaceInTextNode(textNode, matches, mappings);
      }
    }

    logger.info('message:processed', 'Message processed', {
      replacements: replacementCount,
    });

    return replacementCount;
  }

  /**
   * Find all text nodes in an element
   */
  private findTextNodes(element: HTMLElement): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent?.trim()) {
        textNodes.push(node as Text);
      }
    }

    return textNodes;
  }

  /**
   * Find pseudonyms in text
   */
  private findPseudonymsInText(
    text: string,
    mappings: Map<string, string>
  ): Array<{ pseudonym: string; realValue: string; index: number }> {
    const matches: Array<{ pseudonym: string; realValue: string; index: number }> = [];

    mappings.forEach((realValue, pseudonym) => {
      // Create regex for this pseudonym (case-insensitive)
      const regex = new RegExp(`\\[${this.escapeRegex(pseudonym)}\\]`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          pseudonym,
          realValue,
          index: match.index,
        });
      }
    });

    // Sort by index (for correct replacement order)
    return matches.sort((a, b) => a.index - b.index);
  }

  /**
   * Replace pseudonyms in a text node with Shadow DOM elements
   */
  private replaceInTextNode(
    textNode: Text,
    matches: Array<{ pseudonym: string; realValue: string; index: number }>,
    _mappings: Map<string, string>
  ): number {
    const text = textNode.textContent || '';
    const parent = textNode.parentNode;

    if (!parent) {
      return 0;
    }

    // Create document fragment to hold new nodes
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let replacementCount = 0;

    for (const match of matches) {
      // Add text before match
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index))
        );
      }

      // Create Shadow DOM host for the replacement
      const host = document.createElement('span');
      host.className = 'pii-shield-deanonymized';

      // Attach Shadow DOM
      const shadow = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      shadow.appendChild(container);

      // Render React component in Shadow DOM
      const root = createRoot(container);
      root.render(
        React.createElement(DeAnonymizedSpan, {
          realValue: match.realValue,
          pseudonym: match.pseudonym,
        })
      );

      fragment.appendChild(host);

      const pseudonymLength = match.pseudonym.length + 2; // +2 for brackets
      lastIndex = match.index + pseudonymLength;
      replacementCount++;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    // Replace original text node with fragment
    parent.replaceChild(fragment, textNode);

    return replacementCount;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if message has already been processed
   */
  hasBeenProcessed(messageElement: HTMLElement): boolean {
    return messageElement.hasAttribute('data-pii-shield-processed');
  }

  /**
   * Mark message as processed
   */
  markAsProcessed(messageElement: HTMLElement): void {
    messageElement.setAttribute('data-pii-shield-processed', 'true');
  }
}

// Singleton instance
export const messageProcessor = new MessageProcessor();
