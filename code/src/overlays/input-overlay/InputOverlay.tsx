/**
 * Input overlay component
 * Custom input area for ChatGPT with PII redaction
 */

import React, { useState, useEffect, useRef } from 'react';
import { InputStateMachine } from './state-machine';
import { eventBus } from '@/utils/event-bus';
import { logger } from '@/utils/logger';
import type { InputState } from '@/types';
import styles from './styles.css?inline';

const stateMachine = new InputStateMachine();

export const InputOverlay: React.FC = () => {
  const [text, setText] = useState('');
  const [state, setState] = useState<InputState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribeState = eventBus.on('input:state-change', (event: any) => {
      setState(event.to);
      updateStatusMessage(event.to, event.reason);
    });

    // Subscribe to redaction complete
    const unsubscribeComplete = eventBus.on('redaction:complete', (event: any) => {
      logger.info('input:redaction-complete', 'Redaction completed', {
        mappingCount: event.result.mappings.length,
      });

      // Transition to review state
      stateMachine.transition('success');

      // Emit event to show review overlay
      eventBus.emit('review:show', {
        result: event.result,
        originalText: event.originalText,
        conversationId: event.conversationId,
      });
    });

    // Subscribe to redaction error
    const unsubscribeError = eventBus.on('redaction:error', (event: any) => {
      logger.error('input:redaction-error', 'Redaction failed', {
        error: event.error,
      });

      // Transition to error state
      stateMachine.transition('error', event.error);
    });

    // Subscribe to reset event (from review cancel)
    const unsubscribeReset = eventBus.on('input:reset', () => {
      logger.info('input:reset', 'Resetting input state');
      stateMachine.reset();
    });

    // Subscribe to injection complete to clear input
    const unsubscribeInjection = eventBus.on('injection:complete', () => {
      logger.info('input:injection-complete', 'Injection complete, clearing input');
      setText('');
      stateMachine.reset();
    });

    // Subscribe to injection error
    const unsubscribeInjectionError = eventBus.on('injection:error', (event: any) => {
      logger.error('input:injection-error', 'Injection failed', {
        error: event.error,
      });

      // Transition to error state
      stateMachine.transition('error', `Failed to send to ChatGPT: ${event.error}`);
    });

    // Focus input on mount
    textareaRef.current?.focus();

    return () => {
      unsubscribeState();
      unsubscribeComplete();
      unsubscribeError();
      unsubscribeReset();
      unsubscribeInjection();
      unsubscribeInjectionError();
    };
  }, []);

  const updateStatusMessage = (newState: InputState, reason?: string) => {
    switch (newState) {
      case 'idle':
        setStatusMessage('');
        break;
      case 'processing':
        setStatusMessage('Analyzing for PII...');
        break;
      case 'review':
        setStatusMessage('');
        break;
      case 'sending':
        setStatusMessage('Sending to ChatGPT...');
        break;
      case 'error':
        setStatusMessage(reason || 'An error occurred');
        break;
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      logger.warn('input:submit', 'Cannot submit empty text');
      return;
    }

    if (!stateMachine.canTransition('submit')) {
      logger.warn('input:submit', 'Cannot submit in current state', { state });
      return;
    }

    logger.info('input:submit', 'Submitting text for redaction', {
      length: text.length,
    });

    stateMachine.transition('submit');

    // Emit event for redaction service to process
    eventBus.emit('redaction:request', {
      text,
      conversationId: getCurrentConversationId(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }

    // Prevent propagation to ChatGPT
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    logger.debug('input:keystroke', 'Text changed', { length: e.target.value.length });
  };

  const getCurrentConversationId = (): string => {
    // This will be provided by content script context
    return (window as any).__piiShieldConversationId || 'temp-unknown';
  };

  const getStateDisplay = (): string => {
    switch (state) {
      case 'idle':
        return 'Ready';
      case 'processing':
        return 'Analyzing...';
      case 'review':
        return 'Review';
      case 'sending':
        return 'Sending...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const isInputDisabled = state !== 'idle';
  const isSubmitDisabled = !text.trim() || state !== 'idle';

  return (
    <>
      <style>{styles}</style>
      <div className="input-overlay-container">
        <div className={`input-overlay ${state}`}>
          <div className="input-header">
            <div className="input-title">
              <span className="shield-icon">🛡️</span>
              <span>PII Shield</span>
            </div>
            <div className="status-indicator">
              <div className={`status-dot ${state}`}></div>
              <span>{getStateDisplay()}</span>
            </div>
          </div>

          <div className="input-body">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="input-textarea"
                placeholder="Type your message here. Personal information will be automatically detected and redacted before sending to ChatGPT..."
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={isInputDisabled}
              />
            </div>

            <div className="input-footer">
              <div>
                <div className="char-count">
                  {text.length} character{text.length !== 1 ? 's' : ''}
                </div>
                <div className="keyboard-hint">
                  Press Ctrl+Enter to submit
                </div>
              </div>

              <div className="actions">
                {state === 'processing' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => stateMachine.transition('cancel')}
                  >
                    Cancel
                  </button>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled}
                >
                  {state === 'processing' ? (
                    <>
                      <span className="loading-spinner"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Secure & Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className={`status-message ${state === 'error' ? 'error' : 'info'}`}>
                {statusMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
