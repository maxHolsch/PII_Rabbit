/**
 * StatusBadge component
 * Displays status information with count
 */

import React from 'react';
import styles from './StatusBadge.css?inline';

export type StatusBadgeVariant = 'default' | 'success' | 'warning';

interface StatusBadgeProps {
  count: number;
  variant?: StatusBadgeVariant;
  icon?: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  count,
  variant = 'default',
  icon = '🛡️',
  label = 'anonymized',
}) => {
  return (
    <>
      <style>{styles}</style>
      <div
        className={`status-badge status-badge-${variant}`}
        role="status"
        aria-label={`${count} item${count !== 1 ? 's' : ''} ${label}`}
      >
        <span className="status-badge-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="status-badge-text">
          <strong>{count}</strong> {label}
        </span>
      </div>
    </>
  );
};
