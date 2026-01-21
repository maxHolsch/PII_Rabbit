/**
 * Input overlay state machine
 * Manages IDLE → PROCESSING → REVIEW → SENDING → IDLE flow
 */

import { logger } from '@/utils/logger';
import { eventBus } from '@/utils/event-bus';
import type { InputState } from '@/types';

export type StateTransition =
  | 'submit'
  | 'success'
  | 'error'
  | 'approve'
  | 'cancel'
  | 'retry'
  | 'done';

export class InputStateMachine {
  private currentState: InputState = 'idle';
  private previousState: InputState = 'idle';

  private validTransitions: Record<InputState, Record<StateTransition, InputState>> = {
    idle: {
      submit: 'processing',
      error: 'error',
      done: 'idle',
      success: 'idle',
      approve: 'idle',
      cancel: 'idle',
      retry: 'idle',
    },
    processing: {
      success: 'review',
      error: 'error',
      cancel: 'idle',
      submit: 'processing',
      approve: 'processing',
      done: 'processing',
      retry: 'processing',
    },
    review: {
      approve: 'sending',
      cancel: 'idle',
      error: 'error',
      submit: 'review',
      success: 'review',
      done: 'review',
      retry: 'review',
    },
    sending: {
      done: 'idle',
      error: 'error',
      success: 'idle',
      submit: 'sending',
      approve: 'sending',
      cancel: 'sending',
      retry: 'sending',
    },
    error: {
      retry: 'processing',
      cancel: 'idle',
      submit: 'error',
      success: 'error',
      approve: 'error',
      done: 'error',
      error: 'error',
    },
  };

  getState(): InputState {
    return this.currentState;
  }

  transition(event: StateTransition, reason?: string): boolean {
    const nextState = this.validTransitions[this.currentState][event];

    if (!nextState || nextState === this.currentState) {
      logger.warn('state-machine:invalid', 'Invalid transition attempted', {
        from: this.currentState,
        event,
      });
      return false;
    }

    this.previousState = this.currentState;
    this.currentState = nextState;

    logger.info('state-machine:transition', 'State changed', {
      from: this.previousState,
      to: this.currentState,
      event,
      reason,
    });

    // Emit event for UI updates
    eventBus.emit('input:state-change', {
      from: this.previousState,
      to: this.currentState,
      reason,
    });

    return true;
  }

  reset(): void {
    const previous = this.currentState;
    this.currentState = 'idle';
    this.previousState = previous;

    logger.info('state-machine:reset', 'State reset to idle');
    eventBus.emit('input:state-change', {
      from: previous,
      to: 'idle',
      reason: 'reset',
    });
  }

  canTransition(event: StateTransition): boolean {
    const nextState = this.validTransitions[this.currentState][event];
    return Boolean(nextState && nextState !== this.currentState);
  }

  isIdle(): boolean {
    return this.currentState === 'idle';
  }

  isProcessing(): boolean {
    return this.currentState === 'processing';
  }

  isReview(): boolean {
    return this.currentState === 'review';
  }

  isSending(): boolean {
    return this.currentState === 'sending';
  }

  isError(): boolean {
    return this.currentState === 'error';
  }
}
