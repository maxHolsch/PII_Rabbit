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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !spanRef.current?.contains(e.target as Node)
      ) {
        setShowPopover(false);
        setIsEditing(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopover(!showPopover);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== mapping.realValue) {
      onEdit(mapping.pseudonym, editValue.trim());
    }
    setIsEditing(false);
    setShowPopover(false);
  };

  const handleRemoveClick = () => {
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

  return (
    <span
      ref={spanRef}
      className={`redacted-span ${mapping.entityType}`}
      onClick={handleClick}
      style={{ position: 'relative' }}
    >
      {mapping.pseudonym}
      <span className="tooltip">Original: {mapping.realValue}</span>

      {showPopover && (
        <div ref={popoverRef} className="edit-popover">
          <div className="edit-popover-title">Edit Redaction</div>

          {isEditing ? (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
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
              <button className="edit-action" onClick={handleEditClick}>
                ✏️ Change value
              </button>
              <button className="edit-action danger" onClick={handleRemoveClick}>
                🗑️ Don't redact this
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
};
