import { v4 as uuidv4 } from 'uuid';

/**
 * Cuts a timeline element at the specified cut time
 * Splits the element into two clips at the cut position
 * @param {Object} store - The store instance
 * @param {string} elementId - ID of the element to cut
 * @param {number} cutTime - Time in milliseconds where to cut the element
 */
export const cutTimelineElement = (store, elementId, cutTime) => {
  const element = store.editorElements.find(el => el.id === elementId);

  if (!element) {
    console.warn(`Element with ID ${elementId} not found`);
    return;
  }

  const { timeFrame, type } = element;

  // Check if cut time is within element's timeframe
  if (cutTime <= timeFrame.start || cutTime >= timeFrame.end) {
    console.warn(
      `Cut time ${cutTime} is outside element's timeframe [${timeFrame.start}, ${timeFrame.end}]`
    );
    return;
  }

  // Create first clip (before cut) - keeps original element's ID
  const firstClip = {
    ...JSON.parse(JSON.stringify(element)), // Deep clone
    id: element.id, // Keep original ID for first clip
    timeFrame: {
      start: timeFrame.start,
      end: cutTime,
    },
  };

  // Create second clip (after cut) - gets new ID
  const secondClip = {
    ...JSON.parse(JSON.stringify(element)),
    id: uuidv4(), // New ID for second clip
    timeFrame: {
      start: cutTime,
      end: timeFrame.end,
    },
  };

  // Adjust properties based on element type
  adjustElementPropertiesForCut(firstClip, secondClip, element, cutTime, type);

  // Replace original element with the two new clips
  const updatedElements = store.editorElements
    .map(el => {
      if (el.id === elementId) {
        return null; // Mark for removal
      }
      return el;
    })
    .filter(el => el !== null);

  // Add the two new clips in place of the original
  const elementIndex = store.editorElements.findIndex(
    el => el.id === elementId
  );
  updatedElements.splice(elementIndex, 0, firstClip, secondClip);

  // Update the store
  store.editorElements = updatedElements;

  // Clear selection after cut
  store.setSelectedElement(null);

  // Update maxTime if needed
  store.refreshElements();
};

/**
 * Adjusts element properties when splitting into two clips
 * Handles different element types appropriately
 */
const adjustElementPropertiesForCut = (
  firstClip,
  secondClip,
  originalElement,
  cutTime,
  elementType
) => {
  const elementDuration =
    originalElement.timeFrame.end - originalElement.timeFrame.start;
  const cutPosition = cutTime - originalElement.timeFrame.start;

  switch (elementType) {
    case 'video':
    case 'imageUrl':
    case 'image':
      adjustMediaElementForCut(
        firstClip,
        secondClip,
        originalElement,
        cutPosition,
        elementDuration
      );
      break;

    case 'audio':
      adjustAudioElementForCut(
        firstClip,
        secondClip,
        originalElement,
        cutPosition,
        elementDuration
      );
      break;

    case 'text':
      // For text/subtitles, split words based on cut time
      adjustTextElementForCut(
        firstClip,
        secondClip,
        originalElement,
        cutPosition,
        elementDuration
      );
      break;

    default:
      // For other types, just use the default behavior
      break;
  }
};

/**
 * Adjusts video/image properties when cutting
 * Updates the source and duration properties
 */
const adjustMediaElementForCut = (
  firstClip,
  secondClip,
  originalElement,
  cutPosition,
  elementDuration
) => {
  // For images, we can't truly cut them, but we preserve their properties
  // They'll appear as two overlapping instances of the same image
  if (originalElement.type === 'image' || originalElement.type === 'imageUrl') {
    // Images are duplicated, which is reasonable behavior
    return;
  }

  // For videos, adjust the source time offset
  if (originalElement.properties) {
    const originalSourceTime = originalElement.properties.sourceStartTime || 0;
    const sourceDuration =
      originalElement.properties.sourceDuration || elementDuration;

    // Calculate what portion of the source corresponds to the cut position
    const sourceTimeAtCut =
      originalSourceTime + (cutPosition / elementDuration) * sourceDuration;

    // First clip uses original source start time
    firstClip.properties = {
      ...firstClip.properties,
      sourceStartTime: originalSourceTime,
      sourceDuration: sourceTimeAtCut - originalSourceTime,
    };

    // Second clip starts from the cut position in the source
    secondClip.properties = {
      ...secondClip.properties,
      sourceStartTime: sourceTimeAtCut,
      sourceDuration: sourceDuration - (sourceTimeAtCut - originalSourceTime),
    };
  }
};

/**
 * Adjusts audio properties when cutting
 * Preserves audio source timing information
 */
const adjustAudioElementForCut = (
  firstClip,
  secondClip,
  originalElement,
  cutPosition,
  elementDuration
) => {
  if (originalElement.properties) {
    const originalSourceTime = originalElement.properties.sourceStartTime || 0;

    firstClip.properties = {
      ...firstClip.properties,
      sourceStartTime: originalSourceTime,
    };

    // Second clip's source start time is offset by the cut position
    secondClip.properties = {
      ...secondClip.properties,
      sourceStartTime: originalSourceTime + cutPosition,
    };
  }
};

/**
 * Adjusts text/subtitle properties when cutting
 * Splits the words array based on timing
 */
const adjustTextElementForCut = (
  firstClip,
  secondClip,
  originalElement,
  cutPosition,
  elementDuration
) => {
  if (
    originalElement.properties &&
    originalElement.properties.words &&
    Array.isArray(originalElement.properties.words)
  ) {
    const words = originalElement.properties.words;
    const elementStart = originalElement.timeFrame.start;
    const cutTimeAbsolute = elementStart + cutPosition;

    // Split words: first clip gets words that end before or at cut time
    const firstWords = words.filter(word => word.end <= cutTimeAbsolute);

    // Second clip gets words that start after cut time
    // Adjust their timing to be relative to the second clip's start
    const secondWords = words
      .filter(word => word.start >= cutTimeAbsolute)
      .map(word => ({
        ...word,
        start: word.start - cutPosition,
        end: word.end - cutPosition,
      }));

    // Update both clips' word properties
    firstClip.properties = {
      ...firstClip.properties,
      words: firstWords.length > 0 ? firstWords : [],
    };

    secondClip.properties = {
      ...secondClip.properties,
      words: secondWords.length > 0 ? secondWords : [],
    };
  }
};
