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

class PIIShieldContent {
  private initialized = false;
  private conversationId: string | null = null;

  async init(): Promise<void> {
    if (this.initialized) {
      logger.warn('content:init', 'Already initialized');
      return;
    }

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
    // Listen for extension toggle
    eventBus.on('extension:toggle', (event: { enabled: boolean }) => {
      logger.info('content:toggle', 'Extension toggled', event);

      if (event.enabled) {
        this.injectOverlays();
      } else {
        shadowInjector.cleanup();
      }
    });

    // Listen for redaction requests from input overlay
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
    });

    // Listen for conversation changes to migrate mappings
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
    });

    // Listen for review cancelled
    eventBus.on('review:cancelled', () => {
      logger.info('content:review-cancel', 'Review cancelled, resetting input state');

      // Reset input overlay to idle state
      eventBus.emit('input:reset');
    });

    // Listen for redaction approved
    eventBus.on('redaction:approved', async (event: any) => {
      logger.info('content:redaction-approved', 'Redactions approved', {
        conversationId: event.conversationId,
        mappingCount: event.mappings.length,
      });

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
    });

    // Listen for ChatGPT injection requests
    eventBus.on('chatgpt:inject', async (event: any) => {
      logger.info('content:inject-start', 'Injecting text into ChatGPT', {
        textLength: event.text.length,
        conversationId: event.conversationId,
      });

      try {
        const success = await chatGPTInjector.injectAndSend(event.text);

        if (success) {
          logger.info('content:inject-success', 'Text injected successfully');

          // Emit success event
          eventBus.emit('injection:complete', {
            conversationId: event.conversationId,
          });
        } else {
          throw new Error('Injection returned false');
        }
      } catch (error) {
        logger.error('content:inject-error', 'Injection failed', {
          error: String(error),
        });

        // Emit error event
        eventBus.emit('injection:error', {
          error: String(error),
        });
      }
    });

    // Listen for DOM mutations (new messages)
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            await this.processNewNode(node);
          }
        }
      }
    });

    const mainArea = document.querySelector('main');
    if (mainArea) {
      observer.observe(mainArea, {
        childList: true,
        subtree: true,
      });
    }
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

    // Check if already processed
    if (messageProcessor.hasBeenProcessed(node)) {
      return;
    }

    logger.debug('content:new-message', 'New message detected');

    // Get mappings for this conversation
    if (!this.conversationId) {
      return;
    }

    try {
      const mappings = await mappingService.getMappings(this.conversationId);

      if (mappings.size === 0) {
        logger.debug('content:no-mappings', 'No mappings to apply');
        return;
      }

      // Process message
      const replacements = await messageProcessor.processMessage(node, mappings);

      if (replacements > 0) {
        logger.info('content:message-deanonymized', 'Message de-anonymized', {
          replacements,
        });
      }

      // Mark as processed
      messageProcessor.markAsProcessed(node);
    } catch (error) {
      logger.error('content:process-message', 'Failed to process message', {
        error: String(error),
      });
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const shield = new PIIShieldContent();
    shield.init();
  });
} else {
  const shield = new PIIShieldContent();
  shield.init();
}
