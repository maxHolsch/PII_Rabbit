/**
 * Review overlay entry point
 * Mounts React component in Shadow DOM
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ReviewOverlay } from './ReviewOverlay';
import { logger } from '@/utils/logger';
import { eventBus } from '@/utils/event-bus';
import type { RedactionResult, RedactionMapping } from '@/types';

interface ReviewData {
  result: RedactionResult;
  originalText: string;
  conversationId: string;
}

const ReviewOverlayManager: React.FC = () => {
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);

  useEffect(() => {
    const unsubscribe = eventBus.on('review:show', (data: ReviewData) => {
      logger.info('review-manager:show', 'Showing review overlay');
      setReviewData(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleApprove = (finalText: string, mappings: RedactionMapping[]) => {
    if (!reviewData) return;

    logger.info('review-manager:approve', 'Redactions approved', {
      finalMappings: mappings.length,
    });

    // Emit approval event
    eventBus.emit('redaction:approved', {
      finalText,
      mappings,
      conversationId: reviewData.conversationId,
    });

    // Close overlay
    setReviewData(null);
  };

  const handleCancel = () => {
    logger.info('review-manager:cancel', 'Review cancelled');

    // Emit cancel event to reset input state
    eventBus.emit('review:cancelled');

    // Close overlay
    setReviewData(null);
  };

  if (!reviewData) {
    return null;
  }

  return (
    <ReviewOverlay
      result={reviewData.result}
      originalText={reviewData.originalText}
      conversationId={reviewData.conversationId}
      onApprove={handleApprove}
      onCancel={handleCancel}
    />
  );
};

export function mountReviewOverlay(shadowRoot: ShadowRoot): void {
  try {
    // Create container div
    const container = document.createElement('div');
    shadowRoot.appendChild(container);

    // Create React root and render
    const root = createRoot(container);
    root.render(<ReviewOverlayManager />);

    logger.info('review-overlay:mount', 'Review overlay mounted successfully');
  } catch (error) {
    logger.error('review-overlay:mount', 'Failed to mount review overlay', {
      error: String(error),
    });
  }
}
