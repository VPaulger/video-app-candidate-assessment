import { useState, useEffect, useCallback, useRef } from 'react';
import TimelineManager from '../utils/timeline/TimelineManager';

/**
 * React hook for timeline zoom management
 */
export const useTimelineZoom = (options = {}) => {
  const { initialZoom, onZoomChange } = options;
  const timelineManager = useRef(TimelineManager.getInstance()).current;
  const zoomAncor = useRef(null); // point in time under the mouse that must not move

  const [zoomValue, setZoomValue] = useState(
    initialZoom || timelineManager.viewData.zoomVal
  );
  const [timelineZoom, setTimelineZoom] = useState(
    timelineManager.viewData.timelineZoom
  );
  const [zoomPercentage, setZoomPercentage] = useState(
    timelineManager.getZoomPercentage()
  );

  useEffect(() => {
    if (initialZoom !== undefined) {
      timelineManager.setZoomValue(initialZoom, false);
    }
  }, []);

  useEffect(() => {
    const handleZoomUpdate = data => {
      setZoomValue(data.newValue);
      setTimelineZoom(data.timelineZoom);
      setZoomPercentage(timelineManager.getZoomPercentage());

      if (onZoomChange) {
        onZoomChange({...data,anchor:zoomAncor.current});
      }
      zoomAncor.current = null
    };
   

    timelineManager.addEventListener('ZoomChangeUpdate', handleZoomUpdate);

    return () => {
      timelineManager.removeEventListener('ZoomChangeUpdate', handleZoomUpdate);
    };
  }, [timelineManager, onZoomChange]);

  const zoomIn = useCallback(
    (step = 1,anchor=null) => {
      zoomAncor.current = anchor
      timelineManager.zoomIn(step);
    },
    [timelineManager]
  );

  const zoomOut = useCallback(
    (step = 1,anchor=null) => {
      zoomAncor.current = anchor
      timelineManager.zoomOut(step);
    },
    [timelineManager]
  );

  const setZoom = useCallback(
    (value,anchor=null) => {
      zoomAncor.current = anchor
      timelineManager.setZoomValue(value);
    },
    [timelineManager]
  );

  const resetZoom = useCallback(() => {
    timelineManager.resetZoom();
  }, [timelineManager]);

  return {
    zoomValue,
    timelineZoom,
    zoomPercentage,
    zoomIn,
    zoomOut,
    setZoom,
    resetZoom,
    timelineManager,
  };
};

export default useTimelineZoom;
