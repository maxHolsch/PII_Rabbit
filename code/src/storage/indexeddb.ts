/**
 * IndexedDB wrapper for PII Shield storage
 * Handles mappings, settings, and conversation data
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { logger } from '@/utils/logger';

export interface Mapping {
  id?: number;
  conversationId: string;
  pseudonym: string;
  realValue: string;
  entityType: 'person' | 'location' | 'phone' | 'email' | 'other';
  createdAt: string;
  lastUsed: string;
}

export interface Settings {
  enabled: boolean;
  llmEndpoint: string;
  llmModel: string;
  autoRedact: boolean;
  debugMode: boolean;
}

interface PIIShieldDB extends DBSchema {
  mappings: {
    key: number;
    value: Mapping;
    indexes: {
      'by-conversation': string;
      'by-pseudonym': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

class IndexedDBManager {
  private db: IDBPDatabase<PIIShieldDB> | null = null;
  private dbName = 'pii-shield';
  private dbVersion = 1;

  async init(): Promise<void> {
    try {
      this.db = await openDB<PIIShieldDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Create mappings store
          if (!db.objectStoreNames.contains('mappings')) {
            const mappingStore = db.createObjectStore('mappings', {
              keyPath: 'id',
              autoIncrement: true,
            });
            mappingStore.createIndex('by-conversation', 'conversationId');
            mappingStore.createIndex('by-pseudonym', 'pseudonym');
          }

          // Create settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        },
      });

      logger.info('storage:init', 'IndexedDB initialized successfully');
    } catch (error) {
      logger.error('storage:init', 'Failed to initialize IndexedDB', {
        error: String(error),
      });
      throw error;
    }
  }

  private ensureDB(): IDBPDatabase<PIIShieldDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Mapping operations
  async saveMapping(mapping: Omit<Mapping, 'id'>): Promise<number> {
    const db = this.ensureDB();
    try {
      const id = await db.add('mappings', mapping as Mapping);
      logger.debug('storage:save-mapping', 'Mapping saved', {
        id,
        conversationId: mapping.conversationId,
        pseudonym: mapping.pseudonym,
      });
      return id as number;
    } catch (error) {
      logger.error('storage:save-mapping', 'Failed to save mapping', {
        error: String(error),
      });
      throw error;
    }
  }

  async getMappingsByConversation(conversationId: string): Promise<Mapping[]> {
    const db = this.ensureDB();
    try {
      const mappings = await db.getAllFromIndex(
        'mappings',
        'by-conversation',
        conversationId
      );
      logger.debug('storage:get-mappings', 'Retrieved mappings', {
        conversationId,
        count: mappings.length,
      });
      return mappings;
    } catch (error) {
      logger.error('storage:get-mappings', 'Failed to get mappings', {
        error: String(error),
      });
      return [];
    }
  }

  async updateMapping(id: number, updates: Partial<Mapping>): Promise<void> {
    const db = this.ensureDB();
    try {
      const existing = await db.get('mappings', id);
      if (!existing) {
        throw new Error(`Mapping with id ${id} not found`);
      }

      const updated = { ...existing, ...updates };
      await db.put('mappings', updated);

      logger.debug('storage:update-mapping', 'Mapping updated', { id });
    } catch (error) {
      logger.error('storage:update-mapping', 'Failed to update mapping', {
        error: String(error),
      });
      throw error;
    }
  }

  async deleteMappingsByConversation(conversationId: string): Promise<void> {
    const db = this.ensureDB();
    try {
      const mappings = await this.getMappingsByConversation(conversationId);
      const tx = db.transaction('mappings', 'readwrite');

      await Promise.all([
        ...mappings.map((m) => tx.store.delete(m.id!)),
        tx.done,
      ]);

      logger.info('storage:delete-mappings', 'Deleted conversation mappings', {
        conversationId,
        count: mappings.length,
      });
    } catch (error) {
      logger.error('storage:delete-mappings', 'Failed to delete mappings', {
        error: String(error),
      });
      throw error;
    }
  }

  // Settings operations
  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
    const db = this.ensureDB();
    try {
      const value = await db.get('settings', key);
      return value !== undefined ? value : defaultValue;
    } catch (error) {
      logger.error('storage:get-setting', 'Failed to get setting', {
        key,
        error: String(error),
      });
      return defaultValue;
    }
  }

  async setSetting<T = any>(key: string, value: T): Promise<void> {
    const db = this.ensureDB();
    try {
      await db.put('settings', value, key);
      logger.debug('storage:set-setting', 'Setting saved', { key });
    } catch (error) {
      logger.error('storage:set-setting', 'Failed to save setting', {
        key,
        error: String(error),
      });
      throw error;
    }
  }

  async getAllSettings(): Promise<Settings> {
    const defaults: Settings = {
      enabled: true,
      llmEndpoint: 'http://localhost:1234',
      llmModel: 'qwen/qwen3-4b-thinking-2507',
      autoRedact: true,
      debugMode: false,
    };

    try {
      const enabled = (await this.getSetting('enabled', defaults.enabled)) ?? defaults.enabled;
      const llmEndpoint = (await this.getSetting('llmEndpoint', defaults.llmEndpoint)) ?? defaults.llmEndpoint;
      const llmModel = (await this.getSetting('llmModel', defaults.llmModel)) ?? defaults.llmModel;
      const autoRedact = (await this.getSetting('autoRedact', defaults.autoRedact)) ?? defaults.autoRedact;
      const debugMode = (await this.getSetting('debugMode', defaults.debugMode)) ?? defaults.debugMode;

      return { enabled, llmEndpoint, llmModel, autoRedact, debugMode };
    } catch (error) {
      logger.error('storage:get-all-settings', 'Failed to get settings', {
        error: String(error),
      });
      return defaults;
    }
  }
}

// Singleton instance
export const db = new IndexedDBManager();
