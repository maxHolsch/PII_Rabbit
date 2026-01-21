/**
 * Mapping service
 * Manages pseudonym <-> real value mappings per conversation
 */

import { logger } from '@/utils/logger';
import { db } from '@/storage/indexeddb';
import type { RedactionMapping } from '@/types';

export class MappingService {
  /**
   * Get all mappings for a conversation
   */
  async getMappings(conversationId: string): Promise<Map<string, string>> {
    logger.debug('mapping:get', 'Fetching mappings', { conversationId });

    const mappings = await db.getMappingsByConversation(conversationId);
    const map = new Map<string, string>();

    for (const mapping of mappings) {
      map.set(mapping.pseudonym, mapping.realValue);
    }

    logger.info('mapping:get', 'Mappings retrieved', {
      conversationId,
      count: map.size,
    });

    return map;
  }

  /**
   * Save new mappings for a conversation
   */
  async saveMappings(
    conversationId: string,
    mappings: RedactionMapping[]
  ): Promise<void> {
    logger.info('mapping:save', 'Saving mappings', {
      conversationId,
      count: mappings.length,
    });

    const timestamp = new Date().toISOString();

    try {
      for (const mapping of mappings) {
        await db.saveMapping({
          conversationId,
          pseudonym: mapping.pseudonym,
          realValue: mapping.realValue,
          entityType: mapping.entityType,
          createdAt: timestamp,
          lastUsed: timestamp,
        });
      }

      logger.info('mapping:save', 'Mappings saved successfully', {
        conversationId,
        count: mappings.length,
      });
    } catch (error) {
      logger.error('mapping:save', 'Failed to save mappings', {
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Update last used timestamp for a mapping
   */
  async touchMapping(conversationId: string, pseudonym: string): Promise<void> {
    const mappings = await db.getMappingsByConversation(conversationId);
    const mapping = mappings.find((m) => m.pseudonym === pseudonym);

    if (mapping && mapping.id) {
      await db.updateMapping(mapping.id, {
        lastUsed: new Date().toISOString(),
      });

      logger.debug('mapping:touch', 'Mapping touched', {
        conversationId,
        pseudonym,
      });
    }
  }

  /**
   * Migrate mappings from temp ID to real conversation ID
   */
  async migrateMappings(tempId: string, realId: string): Promise<void> {
    logger.info('mapping:migrate', 'Migrating mappings', {
      from: tempId,
      to: realId,
    });

    try {
      const mappings = await db.getMappingsByConversation(tempId);

      if (mappings.length === 0) {
        logger.info('mapping:migrate', 'No mappings to migrate');
        return;
      }

      // Update each mapping to new conversation ID
      for (const mapping of mappings) {
        if (mapping.id) {
          await db.updateMapping(mapping.id, {
            conversationId: realId,
          });
        }
      }

      logger.info('mapping:migrate', 'Migration complete', {
        count: mappings.length,
      });
    } catch (error) {
      logger.error('mapping:migrate', 'Migration failed', {
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Clear old mappings (cleanup)
   */
  async clearOldMappings(daysOld = 30): Promise<void> {
    logger.info('mapping:cleanup', 'Clearing old mappings', { daysOld });

    // This would require a more complex query
    // For now, just log the intent
    logger.info('mapping:cleanup', 'Cleanup not implemented yet');
  }

  /**
   * De-anonymize text using mappings
   */
  async deAnonymize(
    conversationId: string,
    text: string
  ): Promise<string> {
    const mappings = await this.getMappings(conversationId);

    if (mappings.size === 0) {
      return text;
    }

    let result = text;

    // Replace each pseudonym with real value
    mappings.forEach((realValue, pseudonym) => {
      const regex = new RegExp(`\\[${this.escapeRegex(pseudonym)}\\]`, 'gi');
      result = result.replace(regex, realValue);
    });

    logger.debug('mapping:deanonymize', 'Text de-anonymized', {
      conversationId,
      replacements: mappings.size,
    });

    return result;
  }

  /**
   * Find pseudonyms in text
   */
  findPseudonyms(text: string): string[] {
    const pattern = /\[(Person|Location|Phone|Email|PII) \d+\]/g;
    const matches = text.match(pattern) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Singleton instance
export const mappingService = new MappingService();
