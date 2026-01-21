/**
 * Input overlay entry point
 * Mounts React component in Shadow DOM
 */

import { createRoot } from 'react-dom/client';
import { InputOverlay } from './InputOverlay';
import { logger } from '@/utils/logger';

export function mountInputOverlay(shadowRoot: ShadowRoot): void {
  try {
    // Create container div
    const container = document.createElement('div');
    shadowRoot.appendChild(container);

    // Create React root and render
    const root = createRoot(container);
    root.render(<InputOverlay />);

    logger.info('input-overlay:mount', 'Input overlay mounted successfully');
  } catch (error) {
    logger.error('input-overlay:mount', 'Failed to mount input overlay', {
      error: String(error),
    });
  }
}
