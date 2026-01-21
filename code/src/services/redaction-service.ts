/**
 * Redaction service
 * Orchestrates PII detection and redaction using LLM
 */

import { logger } from '@/utils/logger';
import { createLLMClient } from './llm-client';
import type { RedactionResult, RedactionMapping } from '@/types';
import type { RedactionLLMResponse } from '@/types/llm';

export class RedactionService {
  /**
   * Redact PII from text using LLM
   */
  async redactText(
    text: string,
    existingMappings: Map<string, string> = new Map()
  ): Promise<RedactionResult> {
    logger.info('redaction:start', 'Starting PII redaction', {
      textLength: text.length,
      existingMappings: existingMappings.size,
    });

    try {
      // Create LLM client
      const llmClient = await createLLMClient();

      // Build prompt
      const prompt = this.buildRedactionPrompt(text, existingMappings);

      // Call LLM
      const response = await llmClient.chat([
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // Parse response
      const result = this.parseRedactionResponse(response.choices[0].message.content);

      logger.info('redaction:complete', 'PII redaction completed', {
        mappingCount: result.mappings.length,
        textChanged: result.redactedText !== text,
      });

      return result;
    } catch (error) {
      logger.error('redaction:error', 'Redaction failed', {
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Build system prompt for LLM
   */
  private getSystemPrompt(): string {
    return `You are a PII (Personally Identifiable Information) redaction assistant. Your task is to:

1. Identify and redact the following types of PII:
   - Person names → [Person N]
   - Locations (addresses, cities, etc.) → [Location N]
   - Phone numbers → [Phone N]
   - Email addresses → [Email N]
   - Other PII (SSN, credit cards, etc.) → [PII N]

2. Maintain consistency:
   - If the same entity appears multiple times, use the same pseudonym
   - Respect existing mappings provided by the user
   - Use sequential numbering within each category

3. Response format:
   Return ONLY a JSON object with this structure:
   {
     "redacted_text": "The redacted text with [Person 1] instead of names...",
     "mappings": {
       "Person 1": "John Smith",
       "Location 1": "123 Main St",
       ...
     }
   }

Important: Return ONLY the JSON object, no additional text or explanation.`;
  }

  /**
   * Build user prompt with text and existing mappings
   */
  private buildRedactionPrompt(
    text: string,
    existingMappings: Map<string, string>
  ): string {
    let prompt = 'Redact PII from the following text:\n\n';
    prompt += `${text}\n\n`;

    if (existingMappings.size > 0) {
      prompt += 'Existing mappings to maintain consistency:\n';
      const mappingsObj: Record<string, string> = {};
      existingMappings.forEach((realValue, pseudonym) => {
        mappingsObj[pseudonym] = realValue;
      });
      prompt += JSON.stringify(mappingsObj, null, 2);
      prompt += '\n\n';
    }

    prompt += 'Return the redacted text and mappings as JSON.';

    return prompt;
  }

  /**
   * Parse LLM response into RedactionResult
   */
  private parseRedactionResponse(content: string): RedactionResult {
    try {
      // Remove thinking tags if present
      let cleanContent = content;
      if (content.includes('<think>')) {
        cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }

      // Try to extract JSON from response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed: RedactionLLMResponse = JSON.parse(jsonMatch[0]);

      logger.debug('redaction:parse', 'Parsed LLM response', {
        redactedText: parsed.redacted_text,
        mappingsKeys: Object.keys(parsed.mappings),
      });

      // Convert to RedactionResult format
      const mappings: RedactionMapping[] = Object.entries(parsed.mappings).map(
        ([pseudonym, realValue]) => ({
          pseudonym,
          realValue,
          entityType: this.inferEntityType(pseudonym),
        })
      );

      logger.info('redaction:parse', 'Created mappings', {
        count: mappings.length,
        pseudonyms: mappings.map(m => m.pseudonym),
      });

      return {
        redactedText: parsed.redacted_text,
        mappings,
      };
    } catch (error) {
      logger.error('redaction:parse', 'Failed to parse LLM response', {
        error: String(error),
        content: content.substring(0, 200),
      });

      // Fallback: no redactions found
      return {
        redactedText: content,
        mappings: [],
      };
    }
  }

  /**
   * Infer entity type from pseudonym
   */
  private inferEntityType(pseudonym: string): RedactionMapping['entityType'] {
    if (pseudonym.startsWith('Person')) return 'person';
    if (pseudonym.startsWith('Location')) return 'location';
    if (pseudonym.startsWith('Phone')) return 'phone';
    if (pseudonym.startsWith('Email')) return 'email';
    return 'other';
  }

  /**
   * Validate redaction result
   */
  validateRedaction(result: RedactionResult, originalText: string): boolean {
    // Check if text was actually redacted
    if (result.redactedText === originalText && result.mappings.length === 0) {
      logger.info('redaction:validate', 'No PII detected');
      return true;
    }

    // Check if all pseudonyms in redacted text have mappings
    const pseudonymPattern = /\[(Person|Location|Phone|Email|PII) \d+\]/g;
    const pseudonymsInText = result.redactedText.match(pseudonymPattern) || [];
    const pseudonymsInMappings = new Set(result.mappings.map(m => m.pseudonym));

    for (const pseudonym of pseudonymsInText) {
      // Strip brackets for comparison: "[Person 1]" -> "Person 1"
      const pseudonymWithoutBrackets = pseudonym.slice(1, -1);

      logger.debug('redaction:validate', 'Checking pseudonym', {
        withBrackets: pseudonym,
        withoutBrackets: pseudonymWithoutBrackets,
        inMappings: pseudonymsInMappings.has(pseudonymWithoutBrackets),
        allMappings: Array.from(pseudonymsInMappings),
      });

      if (!pseudonymsInMappings.has(pseudonymWithoutBrackets)) {
        logger.warn('redaction:validate', 'Pseudonym without mapping', {
          pseudonym,
          pseudonymWithoutBrackets,
          availableMappings: Array.from(pseudonymsInMappings),
        });
        return false;
      }
    }

    logger.info('redaction:validate', 'Redaction valid', {
      pseudonyms: pseudonymsInText.length,
    });

    return true;
  }
}

// Singleton instance
export const redactionService = new RedactionService();
