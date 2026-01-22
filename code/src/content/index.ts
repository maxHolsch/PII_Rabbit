/**
 * Content script entry point
 * Initializes PII Shield on ChatGPT pages
 */

import { logger } from '@/utils/logger';
import { eventBus } from '@/utils/event-bus';
import { db } from '@/storage/indexeddb';
import { ChatGPTDetector } from './chatgpt-detector';
import { shadowInjector } from './injector';
import { chatGPTInjector } from './chatgpt-injector';
import { messageProcessor } from './message-processor';
import { mountInputOverlay } from '@/overlays/input-overlay';
import { mountReviewOverlay } from '@/overlays/review-overlay';
import { redactionService } from '@/services/redaction-service';
import { mappingService } from '@/services/mapping-service';

// Global initialization flag to prevent multiple instances
let globalInitialized = false;

class PIIShieldContent {
  private initialized = false;
  private conversationId: string | null = null;
  private pendingMessages = new Map<HTMLElement, number>();
  private eventUnsubscribers: Array<() => void> = [];

  async init(): Promise<void> {
    if (this.initialized || globalInitialized) {
      logger.warn('content:init', 'Already initialized');
      return;
    }

    // Check if listeners already exist before initializing
    const existingListeners = eventBus.listenerCount('chatgpt:inject');
    if (existingListeners > 0) {
      logger.error('content:init', 'Event listeners already registered, cleaning up first', {
        count: existingListeners,
      });
      this.cleanup();
    }

    globalInitialized = true;

    logger.info('content:init', 'Initializing PII Shield', {
      url: window.location.href,
    });

    // Check if we're on ChatGPT
    if (!ChatGPTDetector.isChatGPTPage()) {
      logger.warn('content:init', 'Not a ChatGPT page, aborting');
      return;
    }

    // Wait for ChatGPT to be ready
    const ready = await ChatGPTDetector.waitForReady();
    if (!ready) {
      logger.error('content:init', 'ChatGPT UI not ready, aborting');
      return;
    }

    // Wait for React hydration to complete
    // This prevents interfering with ChatGPT's React hydration process
    await new Promise<void>((resolve) => {
      if ('requestIdleCallback' in window) {
        // Use requestIdleCallback to wait for browser idle state
        window.requestIdleCallback(() => {
          // Add small additional delay to ensure React is fully hydrated
          setTimeout(() => resolve(), 500);
        }, { timeout: 3000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => resolve(), 2000);
      }
    });

    logger.debug('content:init', 'React hydration wait complete');

    // Initialize storage
    try {
      await db.init();
    } catch (error) {
      logger.error('content:init', 'Failed to initialize storage', {
        error: String(error),
      });
      return;
    }

    // Check if extension is enabled
    const settings = await db.getAllSettings();
    if (!settings.enabled) {
      logger.info('content:init', 'Extension disabled, not initializing');
      return;
    }

    // Get conversation ID
    this.conversationId = ChatGPTDetector.getConversationId();
    logger.info('content:init', 'Conversation detected', {
      id: this.conversationId,
      isTemp: ChatGPTDetector.isTempId(this.conversationId),
    });

    // Set up URL change detection
    this.setupURLListener();

    // Inject Shadow DOM hosts for overlays
    this.injectOverlays();

    // Set up event listeners
    this.setupEventListeners();

    this.initialized = true;
    logger.info('content:init', 'PII Shield initialized successfully');
  }

  /**
   * Cleanup all event listeners and state
   */
  private cleanup(): void {
    logger.info('content:cleanup', 'Cleaning up event listeners', {
      unsubscriberCount: this.eventUnsubscribers.length,
      pendingMessagesCount: this.pendingMessages.size,
    });

    // Unsubscribe from all events
    this.eventUnsubscribers.forEach(unsub => unsub());
    this.eventUnsubscribers = [];

    // Clear pending messages
    this.pendingMessages.forEach(timeout => clearTimeout(timeout));
    this.pendingMessages.clear();

    // Reset initialization flag
    this.initialized = false;

    logger.info('content:cleanup', 'Cleanup complete');
  }

  private setupURLListener(): void {
    // Override history methods to detect URL changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleURLChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleURLChange();
    };

    // Listen for popstate
    window.addEventListener('popstate', () => {
      this.handleURLChange();
    });

    logger.debug('content:url-listener', 'URL change listener installed');
  }

  private handleURLChange(): void {
    const newId = ChatGPTDetector.getConversationId();

    if (newId !== this.conversationId) {
      const oldId = this.conversationId;
      this.conversationId = newId;

      logger.info('content:conversation-change', 'Conversation changed', {
        from: oldId,
        to: newId,
      });

      eventBus.emit('conversation:change', {
        from: oldId || '',
        to: newId,
        needsMigration: oldId ? ChatGPTDetector.isTempId(oldId) : false,
      });
    }
  }

  private injectOverlays(): void {
    // Inject input overlay host
    const inputShadow = shadowInjector.injectHost('pii-shield-input', 'append');
    if (!inputShadow) {
      logger.error('content:inject', 'Failed to inject input overlay');
      return;
    }

    // Inject review overlay host
    const reviewShadow = shadowInjector.injectHost('pii-shield-review', 'append');
    if (!reviewShadow) {
      logger.error('content:inject', 'Failed to inject review overlay');
      return;
    }

    // Mount React components in Shadow DOM
    mountInputOverlay(inputShadow);
    mountReviewOverlay(reviewShadow);

    // Make conversation ID available to overlays
    (window as any).__piiShieldConversationId = this.conversationId;

    logger.info('content:inject', 'Overlays injected and mounted');
  }

  private setupEventListeners(): void {
    // Store unsubscribe functions for cleanup

    // Listen for extension toggle
    this.eventUnsubscribers.push(
      eventBus.on('extension:toggle', (event: { enabled: boolean }) => {
        logger.info('content:toggle', 'Extension toggled', event);

        if (event.enabled) {
          this.injectOverlays();
        } else {
          shadowInjector.cleanup();
        }
      })
    );

    // Listen for redaction requests from input overlay
    this.eventUnsubscribers.push(
      eventBus.on('redaction:request', async (event: { text: string; conversationId: string }) => {
        logger.info('content:redaction', 'Processing redaction request', {
          textLength: event.text.length,
          conversationId: event.conversationId,
        });

        try {
          // Get existing mappings for this conversation
          const existingMappings = await mappingService.getMappings(event.conversationId);

          // Perform redaction
          const result = await redactionService.redactText(event.text, existingMappings);

          // Validate result
          const isValid = redactionService.validateRedaction(result, event.text);

          if (!isValid) {
            throw new Error('Redaction validation failed');
          }

          // Emit success event with result
          eventBus.emit('redaction:complete', {
            result,
            originalText: event.text,
            conversationId: event.conversationId,
          });
        } catch (error) {
          logger.error('content:redaction', 'Redaction failed', {
            error: String(error),
          });

          // Emit error event
          eventBus.emit('redaction:error', {
            error: String(error),
          });
        }
      })
    );

    // Listen for conversation changes to migrate mappings
    this.eventUnsubscribers.push(
      eventBus.on('conversation:change', async (event: any) => {
        if (event.needsMigration) {
          logger.info('content:migrate', 'Migrating mappings', {
            from: event.from,
            to: event.to,
          });

          try {
            await mappingService.migrateMappings(event.from, event.to);

            // Update conversation ID reference
            this.conversationId = event.to;
            (window as any).__piiShieldConversationId = event.to;
          } catch (error) {
            logger.error('content:migrate', 'Migration failed', {
              error: String(error),
            });
          }
        }
      })
    );

    // Listen for review cancelled
    this.eventUnsubscribers.push(
      eventBus.on('review:cancelled', () => {
        logger.info('content:review-cancel', 'Review cancelled, resetting input state');

        // Reset input overlay to idle state
        eventBus.emit('input:reset');
      })
    );

    // Listen for redaction approved
    this.eventUnsubscribers.push(
      eventBus.on('redaction:approved', async (event: any) => {
        const listenerCount = eventBus.listenerCount('redaction:approved');

        logger.info('content:redaction-approved', 'Redactions approved', {
          conversationId: event.conversationId,
          mappingCount: event.mappings.length,
          listenerCount,
        });

        // Warn if multiple listeners detected
        if (listenerCount > 1) {
          logger.warn('content:duplicate-listener', 'Multiple redaction:approved listeners detected', {
            count: listenerCount,
          });
        }

        try {
          // Save mappings to storage
          await mappingService.saveMappings(event.conversationId, event.mappings);

          // Emit event to inject text into ChatGPT
          eventBus.emit('chatgpt:inject', {
            text: event.finalText,
            conversationId: event.conversationId,
          });
        } catch (error) {
          logger.error('content:save-mappings', 'Failed to save mappings', {
            error: String(error),
          });

          // Emit error event
          eventBus.emit('injection:error', {
            error: String(error),
          });
        }
      })
    );

    // Listen for ChatGPT injection requests
    this.eventUnsubscribers.push(
      eventBus.on('chatgpt:inject', async (event: any) => {
        const listenerCount = eventBus.listenerCount('chatgpt:inject');

        logger.info('content:inject-start', 'Injecting text into ChatGPT', {
          textLength: event.text.length,
          conversationId: event.conversationId,
          listenerCount,
        });

        // Warn if multiple listeners detected
        if (listenerCount > 1) {
          logger.warn('content:duplicate-listener', 'Multiple chatgpt:inject listeners detected', {
            count: listenerCount,
          });
        }

        try {
          const success = await chatGPTInjector.injectAndSend(event.text);

          if (success) {
            logger.info('content:inject-success', 'Text injected successfully');

            // Emit success event
            eventBus.emit('injection:complete', {
              conversationId: event.conversationId,
            });
          } else {
            throw new Error('Injection failed - returned false');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          logger.error('content:inject-error', 'Injection failed', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            conversationId: event.conversationId,
          });

          // Emit detailed error event
          eventBus.emit('injection:error', {
            error: errorMessage,
            conversationId: event.conversationId,
            timestamp: Date.now(),
            context: {
              textLength: event.text.length,
              url: window.location.href,
            },
          });
        }
      })
    );

    // Listen for DOM mutations (new messages)
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        // Handle new nodes being added
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            await this.processNewNode(node);
          }
        }

        // Handle text content changes (streaming messages)
        if (mutation.type === 'characterData' || mutation.type === 'childList') {
          const target = mutation.target;

          // Find the message container
          let messageElement: HTMLElement | null = null;
          if (target instanceof HTMLElement) {
            messageElement = target.closest('[data-message-author-role]') ||
                           target.closest('.group');
          } else if (target.parentElement) {
            messageElement = target.parentElement.closest('[data-message-author-role]') ||
                           target.parentElement.closest('.group');
          }

          if (messageElement && !messageProcessor.hasBeenProcessed(messageElement)) {
            await this.processNewNode(messageElement);
          }
        }
      }
    });

    const mainArea = document.querySelector('main');
    if (mainArea) {
      observer.observe(mainArea, {
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: false,
      });
    }
  }

  private processingMessages = new Set<HTMLElement>();

  /**
   * Schedule message processing after a delay
   * Used for streaming messages that don't have content yet
   */
  private scheduleMessageProcessing(node: HTMLElement): void {
    // Cancel existing timeout if any
    this.cancelPendingProcessing(node);

    // Schedule retry after 500ms
    const timeout = setTimeout(() => {
      this.pendingMessages.delete(node);
      this.processNewNode(node);
    }, 500);

    this.pendingMessages.set(node, timeout);

    logger.debug('content:schedule-retry', 'Scheduled message processing retry');
  }

  /**
   * Cancel pending message processing
   */
  private cancelPendingProcessing(node: HTMLElement): void {
    const timeout = this.pendingMessages.get(node);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingMessages.delete(node);
      logger.debug('content:cancel-retry', 'Cancelled pending message processing');
    }
  }

  /**
   * Wait for streaming message to complete
   * Detects when message content stops changing
   */
  private async waitForStreamingComplete(
    node: HTMLElement,
    maxWait = 10000
  ): Promise<void> {
    const startTime = Date.now();
    let lastLength = 0;
    let stableCount = 0;

    logger.debug('content:wait-streaming', 'Waiting for streaming to complete');

    while (Date.now() - startTime < maxWait) {
      const currentLength = node.textContent?.length || 0;

      if (currentLength === lastLength) {
        stableCount++;
        // If length hasn't changed for 3 checks (300ms), consider it complete
        if (stableCount >= 3) {
          logger.debug('content:streaming-complete', 'Streaming appears complete', {
            finalLength: currentLength,
            elapsed: Date.now() - startTime,
          });
          return;
        }
      } else {
        stableCount = 0;
        lastLength = currentLength;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.warn('content:streaming-timeout', 'Streaming did not stabilize within timeout', {
      maxWait,
    });
  }

  /**
   * Process a newly added DOM node
   */
  private async processNewNode(node: HTMLElement): Promise<void> {
    // Check if this is a message container
    const isMessage = node.hasAttribute('data-message-author-role') ||
                     node.classList.contains('group') ||
                     node.querySelector('[data-message-author-role]');

    if (!isMessage) {
      return;
    }

    // Check if already processed or being processed
    if (messageProcessor.hasBeenProcessed(node) || this.processingMessages.has(node)) {
      return;
    }

    // Check if message has any text content yet
    const textContent = node.textContent?.trim();
    if (!textContent) {
      // Message container exists but no text yet, schedule a retry
      this.scheduleMessageProcessing(node);
      return;
    }

    // Cancel any pending retry for this node since we have content now
    this.cancelPendingProcessing(node);

    logger.debug('content:new-message', 'New message detected');

    // Get mappings for this conversation
    if (!this.conversationId) {
      return;
    }

    // Mark as being processed to prevent duplicate processing
    this.processingMessages.add(node);

    try {
      const mappings = await mappingService.getMappings(this.conversationId);

      if (mappings.size === 0) {
        logger.debug('content:no-mappings', 'No mappings to apply');
        messageProcessor.markAsProcessed(node);
        return;
      }

      // Wait for streaming to complete before processing
      await this.waitForStreamingComplete(node, 10000);

      // Process message with complete content
      const replacements = await messageProcessor.processMessage(node, mappings);

      if (replacements > 0) {
        logger.info('content:message-deanonymized', 'Message de-anonymized', {
          replacements,
          conversationId: this.conversationId,
        });

        // Emit event for UI feedback
        eventBus.emit('message:deanonymized', {
          replacements,
          conversationId: this.conversationId,
          timestamp: Date.now(),
        });
      }

      // Mark as processed
      messageProcessor.markAsProcessed(node);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('content:process-message', 'Failed to process message', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        conversationId: this.conversationId,
        hasTextContent: !!node.textContent,
        textLength: node.textContent?.length || 0,
      });

      // Emit error event for tracking
      eventBus.emit('message:process-error', {
        error: errorMessage,
        conversationId: this.conversationId,
        timestamp: Date.now(),
      });

      // Still mark as processed to avoid retry loops
      messageProcessor.markAsProcessed(node);
    } finally {
      this.processingMessages.delete(node);
    }
  }
}

// Singleton instance
const shield = new PIIShieldContent();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    shield.init();
  });
} else {
  shield.init();
}
