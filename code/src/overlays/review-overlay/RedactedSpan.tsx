/**
 * RedactedSpan component
 * Interactive pseudonym display with hover and edit functionality
 */

import React, { useState, useRef, useEffect } from 'react';
import type { RedactionMapping } from '@/types';

interface RedactedSpanProps {
  mapping: RedactionMapping;
  onEdit: (pseudonym: string, newValue: string) => void;
  onRemove: (pseudonym: string) => void;
}

export const RedactedSpan: React.FC<RedactedSpanProps> = ({
  mapping,
  onEdit,
  onRemove,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(mapping.realValue);
  const spanRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync editValue with mapping.realValue when it changes
  useEffect(() => {
    setEditValue(mapping.realValue);
  }, [mapping.realValue]);

  // Track popover visibility changes
  useEffect(() => {
    console.log('[RedactedSpan] Popover visibility changed:', {
      showPopover,
      isEditing,
      pseudonym: mapping.pseudonym,
    });
  }, [showPopover, isEditing, mapping.pseudonym]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Use composedPath() to handle Shadow DOM event retargeting
      const path = e.composedPath();
      const clickedInsidePopover = popoverRef.current && path.includes(popoverRef.current);
      const clickedInsideSpan = spanRef.current && path.includes(spanRef.current);

      console.log('[RedactedSpan] handleClickOutside triggered:', {
        target: e.target,
        composedPath: path.slice(0, 5).map((el: EventTarget) => {
          if (el instanceof Element) {
            return `${el.tagName}${el.className ? '.' + el.className.split(' ').join('.') : ''}${el.id ? '#' + el.id : ''}`;
          }
          return el;
        }),
        clickedInsidePopover,
        clickedInsideSpan,
      });

      if (!clickedInsidePopover && !clickedInsideSpan) {
        console.log('[RedactedSpan] Closing popover due to outside click');
        setShowPopover(false);
        setIsEditing(false);
      } else {
        console.log('[RedactedSpan] Click was inside popover or span, keeping open');
      }
    };

    if (showPopover) {
      // Delay attaching the listener to avoid catching the same click that opened the popover
      console.log('[RedactedSpan] Scheduling click-outside listener');
      const timeoutId = setTimeout(() => {
        console.log('[RedactedSpan] Attaching click-outside listener');
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      return () => {
        console.log('[RedactedSpan] Cleaning up click-outside listener');
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPopover]);

  const handleClick = (e: React.MouseEvent) => {
    console.log('[RedactedSpan] Span clicked:', {
      pseudonym: mapping.pseudonym,
      currentShowPopover: showPopover,
      willToggleTo: !showPopover,
    });
    e.stopPropagation();
    setShowPopover(!showPopover);
  };

  const handleEditClick = () => {
    console.log('[RedactedSpan] Edit button clicked:', {
      pseudonym: mapping.pseudonym,
      currentValue: mapping.realValue,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    console.log('[RedactedSpan] Save edit clicked:', {
      pseudonym: mapping.pseudonym,
      oldValue: mapping.realValue,
      newValue: editValue.trim(),
      willCallOnEdit: editValue.trim() && editValue !== mapping.realValue,
    });
    if (editValue.trim() && editValue !== mapping.realValue) {
      console.log('[RedactedSpan] Calling onEdit handler with:', {
        pseudonym: mapping.pseudonym,
        newValue: editValue.trim(),
      });
      onEdit(mapping.pseudonym, editValue.trim());
    }
    setIsEditing(false);
    setShowPopover(false);
  };

  const handleRemoveClick = () => {
    console.log('[RedactedSpan] Remove button clicked:', {
      pseudonym: mapping.pseudonym,
      realValue: mapping.realValue,
    });
    console.log('[RedactedSpan] Calling onRemove handler with:', {
      pseudonym: mapping.pseudonym,
    });
    onRemove(mapping.pseudonym);
    setShowPopover(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditValue(mapping.realValue);
      setIsEditing(false);
    }
  };

  const handleSpanKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowPopover(!showPopover);
    } else if (e.key === 'Escape') {
      setShowPopover(false);
    }
  };

  const getEntityIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'person':
        return '👤';
      case 'location':
        return '📍';
      case 'phone':
        return '📞';
      case 'email':
        return '📧';
      default:
        return '🔒';
    }
  };

  return (
    <span
      ref={spanRef}
      className={`redacted-span ${mapping.entityType}`}
      onClick={handleClick}
      onKeyDown={handleSpanKeyDown}
      style={{ position: 'relative' }}
      role="button"
      tabIndex={0}
      aria-label={`${mapping.entityType}: ${mapping.pseudonym}, click to edit or remove`}
      aria-expanded={showPopover}
    >
      <span className="badge-icon">{getEntityIcon(mapping.entityType)}</span>
      <span className="badge-text">{mapping.pseudonym}</span>
      <span className="tooltip">Original: {mapping.realValue}</span>

      {showPopover && (
        <div ref={popoverRef} className="edit-popover" role="menu">
          <div className="edit-popover-title">Edit Redaction</div>

          {isEditing ? (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                aria-label={`Edit value for ${mapping.entityType}`}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              />
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleSaveEdit}
                  aria-label="Save changes"
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditValue(mapping.realValue);
                    setIsEditing(false);
                  }}
                  aria-label="Cancel editing"
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="edit-popover-actions">
              <button
                className="edit-action"
                onClick={(e) => {
                  console.log('[RedactedSpan] Edit button onClick fired', {
                    pseudonym: mapping.pseudonym,
                    target: e.target,
                    currentTarget: e.currentTarget,
                  });
                  e.preventDefault();
                  e.stopPropagation();
                  handleEditClick();
                }}
                role="menuitem"
                aria-label="Change redaction value"
              >
                ✏️ Change value
              </button>
              <button
                className="edit-action danger"
                onClick={(e) => {
                  console.log('[RedactedSpan] Remove button onClick fired', {
                    pseudonym: mapping.pseudonym,
                    target: e.target,
                    currentTarget: e.currentTarget,
                  });
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveClick();
                }}
                role="menuitem"
                aria-label="Remove this redaction"
              >
                🗑️ Don't redact this
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
};
