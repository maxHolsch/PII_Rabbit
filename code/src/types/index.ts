/**
 * Shared type definitions for PII Shield
 */

export type EntityType = 'person' | 'location' | 'phone' | 'email' | 'other';

export interface RedactionMapping {
  pseudonym: string;
  realValue: string;
  entityType: EntityType;
}

export interface RedactionResult {
  redactedText: string;
  mappings: RedactionMapping[];
}

export type InputState =
  | 'idle'
  | 'processing'
  | 'review'
  | 'sending'
  | 'error';

export interface ConversationContext {
  id: string;
  isTemp: boolean;
  mappings: Map<string, string>; // pseudonym -> real value
}

export interface ExtensionSettings {
  enabled: boolean;
  llmEndpoint: string;
  llmModel: string;
  autoRedact: boolean;
  debugMode: boolean;
}
