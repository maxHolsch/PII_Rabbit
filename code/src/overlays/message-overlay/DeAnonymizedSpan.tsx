/**
 * DeAnonymizedSpan component
 * Displays real value with tooltip showing what was sent to ChatGPT
 */

import React from 'react';
import styles from './styles.css?inline';

interface DeAnonymizedSpanProps {
  realValue: string;
  pseudonym: string;
}

export const DeAnonymizedSpan: React.FC<DeAnonymizedSpanProps> = ({
  realValue,
  pseudonym,
}) => {
  return (
    <>
      <style>{styles}</style>
      <span className="deanonymized-span">
        {realValue}
        <span className="tooltip">
          <span className="tooltip-content">
            <span className="tooltip-icon">🔒</span>
            <span>Sent as: {pseudonym}</span>
          </span>
        </span>
      </span>
    </>
  );
};
