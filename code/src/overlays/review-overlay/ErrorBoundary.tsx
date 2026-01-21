/**
 * ErrorBoundary component
 * Catches and logs React errors to prevent silent failures
 */

import React, { Component, ReactNode } from 'react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary] Error caught:', error);
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    logger.error('error-boundary:catch', 'React error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      console.error('[ErrorBoundary] Rendering error state:', this.state.error);
      // Don't render anything on error to avoid breaking the UI
      // In production, you might want to show a user-friendly error message
      return null;
    }

    return this.props.children;
  }
}
