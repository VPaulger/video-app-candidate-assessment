import React from 'react';
import { observer } from 'mobx-react';
import styles from './Timeline.module.scss';

/**
 * Visual drop zone overlay that appears when dragging files over the timeline
 * Provides clear visual feedback for drag-and-drop operations
 */
const DropZoneOverlay = observer(({ isDraggingOver, isIncompatible, fileType }) => {
  if (!isDraggingOver) return null;

  const getFileTypeLabel = () => {
    if (fileType?.startsWith('video/')) return 'Video';
    if (fileType?.startsWith('audio/')) return 'Audio';
    if (fileType?.startsWith('image/')) return 'Image';
    return 'Media';
  };

  return (
    <div
      className={`${styles.dropZoneOverlay} ${
        isIncompatible ? styles.dropZoneIncompatible : styles.dropZoneCompatible
      }`}
      role="alert"
      aria-live="polite"
      aria-label={`Drop zone for ${getFileTypeLabel()} files`}
    >
      <div className={styles.dropZoneContent}>
        <div className={styles.dropZoneIcon}>
          {isIncompatible ? (
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>
        <div className={styles.dropZoneText}>
          <p className={styles.dropZoneTitle}>
            {isIncompatible
              ? 'Incompatible File Type'
              : `Drop ${getFileTypeLabel()} File Here`}
          </p>
          <p className={styles.dropZoneSubtitle}>
            {isIncompatible
              ? 'This file type cannot be placed on this track'
              : 'Release to add to timeline'}
          </p>
        </div>
      </div>
    </div>
  );
});

export default DropZoneOverlay;
