/**
 * Event payload types for event bus communication
 */

import type { InputState, RedactionResult } from './index';
import type { LogEntry } from '@/utils/logger';

export interface InputStateChangeEvent {
  from: InputState;
  to: InputState;
  reason?: string;
}

export interface RedactionCompleteEvent {
  result: RedactionResult;
  originalText: string;
  conversationId: string;
}

export interface RedactionApprovedEvent {
  finalText: string;
  mappings: Map<string, string>;
  conversationId: string;
}

export interface MessageDetectedEvent {
  messageId: string;
  text: string;
  role: 'user' | 'assistant';
}

export interface ConversationChangeEvent {
  from: string;
  to: string;
  needsMigration: boolean;
}

export interface LogEntryEvent extends LogEntry {}

export interface ExtensionToggleEvent {
  enabled: boolean;
}
