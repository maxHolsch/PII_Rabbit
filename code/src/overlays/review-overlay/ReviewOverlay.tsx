/**
 * ReviewOverlay component
 * Modal for reviewing and approving redactions before sending to ChatGPT
 */

import React, { useState, useEffect } from 'react';
import { RedactedSpan } from './RedactedSpan';
import { logger } from '@/utils/logger';
import type { RedactionResult, RedactionMapping } from '@/types';
import styles from './styles.css?inline';

interface ReviewOverlayProps {
  result: RedactionResult;
  originalText: string;
  conversationId: string;
  onApprove: (finalText: string, mappings: RedactionMapping[]) => void;
  onCancel: () => void;
}

export const ReviewOverlay: React.FC<ReviewOverlayProps> = ({
  result,
  originalText: _originalText,
  conversationId,
  onApprove,
  onCancel,
}) => {
  const [redactedText, setRedactedText] = useState(result.redactedText);
  const [mappings, setMappings] = useState<RedactionMapping[]>(result.mappings);

  useEffect(() => {
    logger.info('review:shown', 'Review overlay displayed', {
      redactionCount: mappings.length,
      conversationId,
    });
  }, []);

  const handleEditMapping = (pseudonym: string, newValue: string) => {
    logger.info('review:edit', 'Mapping edited', {
      pseudonym,
      newValue,
    });

    setMappings((prev) =>
      prev.map((m) =>
        m.pseudonym === pseudonym ? { ...m, realValue: newValue } : m
      )
    );
  };

  const handleRemoveMapping = (pseudonym: string) => {
    logger.info('review:remove', 'Mapping removed', { pseudonym });

    // Find the mapping to get the original value
    const mapping = mappings.find((m) => m.pseudonym === pseudonym);
    if (!mapping) return;

    // Replace pseudonym in text with original value
    const regex = new RegExp(`\\[${escapeRegex(pseudonym)}\\]`, 'g');
    setRedactedText((prev) => prev.replace(regex, mapping.realValue));

    // Remove from mappings
    setMappings((prev) => prev.filter((m) => m.pseudonym !== pseudonym));
  };

  const handleApprove = () => {
    logger.info('review:approved', 'Redactions approved', {
      edits: mappings.length !== result.mappings.length,
      finalMappings: mappings.length,
    });

    onApprove(redactedText, mappings);
  };

  const handleCancel = () => {
    logger.info('review:cancelled', 'Review cancelled');
    onCancel();
  };

  const renderRedactedText = () => {
    if (mappings.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-text">No PII detected</div>
          <div className="empty-subtext">
            Your message appears to be safe to send as-is.
          </div>
        </div>
      );
    }

    // Split text by pseudonyms and render with RedactedSpan components
    const parts: React.ReactNode[] = [];
    let currentText = redactedText;
    let key = 0;

    const pseudonymPattern = /\[(Person|Location|Phone|Email|PII) \d+\]/g;
    const matches = [...currentText.matchAll(pseudonymPattern)];

    let lastIndex = 0;
    for (const match of matches) {
      const matchIndex = match.index!;
      const matchText = match[0];

      // Add text before match
      if (matchIndex > lastIndex) {
        parts.push(currentText.substring(lastIndex, matchIndex));
      }

      // Add RedactedSpan for match
      const pseudonym = matchText.slice(1, -1); // Remove brackets
      const mapping = mappings.find((m) => m.pseudonym === pseudonym);

      if (mapping) {
        parts.push(
          <RedactedSpan
            key={key++}
            mapping={mapping}
            onEdit={handleEditMapping}
            onRemove={handleRemoveMapping}
          />
        );
      } else {
        parts.push(matchText);
      }

      lastIndex = matchIndex + matchText.length;
    }

    // Add remaining text
    if (lastIndex < currentText.length) {
      parts.push(currentText.substring(lastIndex));
    }

    return <div className="redacted-text">{parts}</div>;
  };

  return (
    <>
      <style>{styles}</style>
      <div className="review-overlay-backdrop">
        <div className="review-overlay">
          <div className="review-header">
            <div className="review-title">
              <span className="review-icon">🔍</span>
              <span>Review Redactions</span>
            </div>
            <button className="close-button" onClick={handleCancel}>
              ✕
            </button>
          </div>

          <div className="review-body">
            <div className="review-instruction">
              <strong>Review your message:</strong> Click on any highlighted
              redaction to edit or remove it. All personal information will be
              replaced before sending to ChatGPT.
            </div>

            <div className="redacted-text-container">
              {renderRedactedText()}
            </div>

            {mappings.length > 0 && (
              <div className="mapping-list">
                <div className="mapping-list-title">
                  Detected Redactions ({mappings.length})
                </div>
                <div className="mapping-items">
                  {mappings.map((mapping) => (
                    <div key={mapping.pseudonym} className="mapping-item">
                      <span className="mapping-pseudonym">
                        {mapping.pseudonym}
                      </span>
                      <span className="mapping-arrow">→</span>
                      <span className="mapping-value">{mapping.realValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="review-footer">
            <div className="footer-hint">
              {mappings.length === 0
                ? 'No redactions needed'
                : `${mappings.length} item${mappings.length !== 1 ? 's' : ''} will be redacted`}
            </div>
            <div className="footer-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApprove}>
                <span>✓</span>
                <span>Approve & Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
