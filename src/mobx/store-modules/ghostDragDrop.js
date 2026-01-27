import { action } from 'mobx';

export const startFileGhostDragUtil = action(
    (store, file, elementType, defaultDuration) => {
        store.ghostState.isFileDragging = true;
        store.ghostState.fileData = file;
        store.ghostState.fileGhostElement = {
            type: elementType,
            duration: defaultDuration,
            // Initial defaults
            timeFrame: {
                start: 0,
                end: defaultDuration,
            },
        };
    }
);

export const updateFileGhostUtil = action(
    (store, newPosition, rowIndex, isIncompatible) => {
        if (!store.ghostState.isFileDragging || !store.ghostState.fileGhostElement)
            return;

        store.ghostState.ghostMarkerPosition = newPosition;
        store.ghostState.dragOverRowIndex = rowIndex;
        store.ghostState.isIncompatibleRow = isIncompatible;

        // Update ghost element position for visual feedback
        if (store.ghostState.fileGhostElement) {
            store.ghostState.fileGhostElement.row = rowIndex;
            store.ghostState.fileGhostElement.timeFrame = {
                start: newPosition,
                end: newPosition + store.ghostState.fileGhostElement.duration,
            };
        }
    }
);

export const finishFileGhostDragUtil = action(
    (store, finalPosition, rowIndex, callback) => {
        if (!store.ghostState.isFileDragging) return;

        // Execute callback with final position info if provided
        if (callback && typeof callback === 'function') {
            callback(finalPosition, rowIndex);
        }

        // Reset state
        store.ghostState.isFileDragging = false;
        store.ghostState.fileGhostElement = null;
        store.ghostState.fileData = null;
        store.ghostState.ghostMarkerPosition = null;
        store.ghostState.dragOverRowIndex = null;
        store.ghostState.isIncompatibleRow = false;
    }
);


