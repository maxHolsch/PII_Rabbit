/**
 * NotificationBar component
 * Displays temporary notification messages with auto-dismiss
 */

import React, { useEffect, useState } from 'react';
import styles from './NotificationBar.css?inline';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationBarProps {
  message: string;
  type?: NotificationType;
  duration?: number; // Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
  onClose?: () => void;
  show?: boolean;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  show = true,
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    setIsVisible(show);
    setIsAnimatingOut(false);
  }, [show]);

  useEffect(() => {
    if (!isVisible || duration === 0) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 200); // Match animation duration
  };

  const getIcon = (): string => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getAriaLive = (): 'polite' | 'assertive' => {
    return type === 'error' ? 'assertive' : 'polite';
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{styles}</style>
      <div
        className={`notification-bar notification-${type} ${isAnimatingOut ? 'animating-out' : ''}`}
        role={type === 'error' ? 'alert' : 'status'}
        aria-live={getAriaLive()}
        aria-atomic="true"
      >
        <div className="notification-content">
          <span className="notification-icon" aria-hidden="true">
            {getIcon()}
          </span>
          <span className="notification-message">{message}</span>
        </div>
        <button
          className="notification-close"
          onClick={handleClose}
          aria-label="Close notification"
          type="button"
        >
          ✕
        </button>
      </div>
    </>
  );
};
