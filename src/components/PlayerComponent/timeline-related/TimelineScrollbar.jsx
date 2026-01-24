const TimelineScrollbar = ({
  scale,
  setCurrentScale,
  timelineContentRef,
}) => {
  const scrollbarRef = useRef(null);
  const handleRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartLeft, setDragStartLeft] = useState(0);
  const [isResizing, setIsResizing] = useState(null);
  const [initialHandleLeft, setInitialHandleLeft] = useState(0);
  const [initialHandleWidth, setInitialHandleWidth] = useState(0);

  const store = React.useContext(StoreContext);

  // 🔥 ПЛАВНІСТЬ
  const targetLeftRef = useRef(0);
  const currentLeftRef = useRef(0);
  const animationFrameRef = useRef(null);

  const lerp = (a, b, t) => a + (b - a) * t;

  const animateHandle = useCallback(() => {
    if (!handleRef.current) return;

    currentLeftRef.current = lerp(
      currentLeftRef.current,
      targetLeftRef.current,
      0.15 // 🔥 чим менше — тим плавніше (0.08–0.2)
    );

    handleRef.current.style.left = `${currentLeftRef.current}px`;

    if (
      Math.abs(currentLeftRef.current - targetLeftRef.current) > 0.1
    ) {
      animationFrameRef.current =
        requestAnimationFrame(animateHandle);
    } else {
      animationFrameRef.current = null;
    }
  }, []);

  const setHandleLeftSmooth = left => {
    targetLeftRef.current = left;
    if (!animationFrameRef.current) {
      animationFrameRef.current =
        requestAnimationFrame(animateHandle);
    }
  };

  // ------------------------------

  const updateHandleSize = useCallback(() => {
    if (
      !handleRef.current ||
      !scrollbarRef.current ||
      !timelineContentRef.current
    )
      return;

    const scrollbarWidth = scrollbarRef.current.offsetWidth;
    const scaleRatio = Math.max(0, Math.min((scale - 1) / 28.5, 0.98));
    const handleWidth = scrollbarWidth * (1 - scaleRatio);

    handleRef.current.style.width = `${handleWidth}px`;

    const scrollRatio =
      timelineContentRef.current.scrollLeft /
      (timelineContentRef.current.scrollWidth -
        timelineContentRef.current.clientWidth);

    const maxLeft = scrollbarWidth - handleWidth;
    const left = maxLeft * (isNaN(scrollRatio) ? 0 : scrollRatio);

    currentLeftRef.current = left;
    setHandleLeftSmooth(left);
  }, [scale, timelineContentRef]);

  useLayoutEffect(() => {
    updateHandleSize();
  }, [updateHandleSize]);

  const handleMouseDown = e => {
    if (e.target.classList.contains(styles.scrollHandleEdge)) {
      const isLeft = e.target.classList.contains(styles.left);
      setIsResizing(isLeft ? 'left' : 'right');
      setDragStartX(e.clientX);
      setInitialHandleLeft(handleRef.current.offsetLeft);
      setInitialHandleWidth(handleRef.current.offsetWidth);
    } else {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartLeft(handleRef.current.offsetLeft);
    }
  };

  const handleMouseMove = e => {
    if (!isDragging && !isResizing) return;

    const scrollbarRect = scrollbarRef.current.getBoundingClientRect();

    if (isDragging) {
      const delta = e.clientX - dragStartX;
      const maxLeft =
        scrollbarRect.width - handleRef.current.offsetWidth;

      const newLeft = Math.max(
        0,
        Math.min(dragStartLeft + delta, maxLeft)
      );

      setHandleLeftSmooth(newLeft);

      const scrollRatio = newLeft / maxLeft;
      const maxScroll =
        timelineContentRef.current.scrollWidth -
        timelineContentRef.current.clientWidth;

      timelineContentRef.current.scrollLeft =
        maxScroll * scrollRatio;
    }

    if (isResizing) {
      const delta = e.clientX - dragStartX;
      let newWidth = initialHandleWidth + delta;
      newWidth = Math.max(20, newWidth);

      handleRef.current.style.width = `${newWidth}px`;

      const widthRatio =
        newWidth / scrollbarRect.width;
      const newScale = Math.max(
        1,
        Math.min(29.5, 1 + 28.5 * (1 - widthRatio))
      );

      setCurrentScale(newScale);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  useEffect(() => {
    const onScroll = () => {
      if (
        isDragging ||
        isResizing ||
        !handleRef.current ||
        !scrollbarRef.current
      )
        return;

      const scrollRatio =
        timelineContentRef.current.scrollLeft /
        (timelineContentRef.current.scrollWidth -
          timelineContentRef.current.clientWidth);

      const maxLeft =
        scrollbarRef.current.offsetWidth -
        handleRef.current.offsetWidth;

      setHandleLeftSmooth(maxLeft * scrollRatio);
    };

    timelineContentRef.current?.addEventListener(
      'scroll',
      onScroll
    );

    return () => {
      timelineContentRef.current?.removeEventListener(
        'scroll',
        onScroll
      );
    };
  }, [isDragging, isResizing]);

  return (
    <div
      ref={scrollbarRef}
      className={styles.timelineScrollbar}
    >
      <div
        ref={handleRef}
        className={styles.scrollHandle}
        onMouseDown={handleMouseDown}
      >
        <div className={`${styles.scrollHandleEdge} ${styles.left}`} />
        <div className={`${styles.scrollHandleEdge} ${styles.right}`} />
      </div>
    </div>
  );
};
