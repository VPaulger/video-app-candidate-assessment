import { AnimationSidebar } from 'components/PlayerComponent/AnimationSidebar/AnimationSidebar';
import { SeekPlayer } from 'components/PlayerComponent/timeline-related/SeekPlayer';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { StoreContext } from '../../mobx';
import { Store } from '../../mobx/store';
import '../../utils/fabric-utils';
import styles from './Player.module.scss';
import { TypographyPanel } from '../../components/PlayerComponent/TypographyPanel/TypographyPanel';
import { CanvasDropZone } from './CanvasDropZone';

import { PlayerFullscreen } from 'components/PlayerComponent/PlayerFullscreen/PlayerFullscreen';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import { useDispatch } from 'react-redux';
import { setActiveScene } from '../../redux/scene/sceneSlice';

export const EditorWithStore = ({ data }) => {
  const [store] = useState(new Store());

  return (
    <StoreContext.Provider value={store}>
      <VideoPanel data={data} store={store}></VideoPanel>
    </StoreContext.Provider>
  );
};

export const VideoPanel = observer(
  ({
    storyData,
    isMuted,
    currentVolume,
    handleVolumeChange,
    handleMuteToggle,
    volumeRangeRef,
    videoPanelRef,
    screen,
    isAnimationPanelOpen,
    toggleAnimationPanel,
    isImageEditingOpen,
    toggleImageEditing,
    isTypographyPanelOpen,
    toggleTypographyPanel,
    isSubtitlesPanelOpen,
    toggleSubtitlesPanel,
    isTransitionPanelOpen,
    toggleTransitionPanel,
    isSelectedElementsAudio = false,
    selectedAudioElements = [],
  }) => {
    const store = React.useContext(StoreContext);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [isCanvasSyncing, setIsCanvasSyncing] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderMessage, setRenderMessage] = useState('');
    const dispatch = useDispatch();

    // --- ITEM 4 IMPLEMENTATION: CANVAS SELECTION & MOVE LOGIC ---
    useEffect(() => {
      if (!store.canvas) return;

      const canvas = store.canvas;

      // 1. Requirement: Clearly show selection state
      // Configure global Fabric selection styles to match the Videfy UI
      canvas.selectionBorderColor = '#00f2ff';
      canvas.selectionLineWidth = 2;

      const configureObjectStyles = (obj) => {
        if (!obj) return;
        obj.set({
          transparentCorners: false,
          cornerColor: '#00f2ff',
          cornerStrokeColor: '#ffffff',
          borderColor: '#00f2ff',
          cornerSize: 8,
          padding: 5,
          borderDashArray: [3, 3] // Optional: dashed border for better visibility
        });
      };

      // 2. Requirement: After drop, keep item within canvas bounds (Clamp/Snap Back)
      const handleMouseUp = (options) => {
        const obj = options.target;
        if (!obj) return;

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const boundingRect = obj.getBoundingRect();

        let newLeft = obj.left;
        let newTop = obj.top;

        // Horizontal Clamping
        if (boundingRect.left < 0) {
          newLeft = obj.left - boundingRect.left;
        } else if (boundingRect.left + boundingRect.width > canvasWidth) {
          newLeft = obj.left - (boundingRect.left + boundingRect.width - canvasWidth);
        }

        // Vertical Clamping
        if (boundingRect.top < 0) {
          newTop = obj.top - boundingRect.top;
        } else if (boundingRect.top + boundingRect.height > canvasHeight) {
          newTop = obj.top - (boundingRect.top + boundingRect.height - canvasHeight);
        }

        // Smoothly snap back to bounds
        obj.set({
          left: newLeft,
          top: newTop
        });
        
        obj.setCoords();
        canvas.renderAll();
      };

      // Apply styles to any existing or new objects
      canvas.on('selection:created', (e) => configureObjectStyles(e.target));
      canvas.on('selection:updated', (e) => configureObjectStyles(e.target));
      
      // Handle the "Drop" requirement
      canvas.on('mouse:up', handleMouseUp);

      return () => {
        canvas.off('mouse:up', handleMouseUp);
      };
    }, [store.canvas]);
    // ------------------------------------------------------------

    // Effect to update rendering state from store
    useEffect(() => {
      if (store.renderingStatus) {
        setIsRendering(store.renderingStatus.state === 'rendering' || store.renderingStatus.state === 'complete');
        if (store.renderingStatus.progress !== undefined) {
          setRenderProgress(store.renderingStatus.progress);
        }
        if (store.renderingStatus.message) {
          setRenderMessage(store.renderingStatus.message);
        }
      } else {
        setIsRendering(false);
        setRenderProgress(0);
        setRenderMessage('');
      }
    }, [store.renderingStatus]);

    // Canvas synchronization effect
    useEffect(() => {
      if (isFullscreenOpen) {
        const mainCanvas = document.getElementById('canvas');
        const fullscreenCanvas = document.getElementById('fullscreen-canvas');

        const syncCanvas = () => {
          try {
            setIsCanvasSyncing(true);
            if (!mainCanvas || !fullscreenCanvas) return;

            const context = fullscreenCanvas.getContext('2d');
            if (!context) return;

            fullscreenCanvas.width = mainCanvas.width;
            fullscreenCanvas.height = mainCanvas.height;
            context.drawImage(mainCanvas, 0, 0);
          } catch (error) {
            console.error('Canvas sync error:', error);
          } finally {
            setIsCanvasSyncing(false);
          }
        };

        syncCanvas();
        let animationFrameId;
        const animate = () => {
          syncCanvas();
          animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
      }
    }, [isFullscreenOpen, store.currentTimeInMs]);

    const handleFullscreenOpen = () => setIsFullscreenOpen(!isFullscreenOpen);

    const handleExpandKeyDown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFullscreenOpen();
      }
    };

    const isVideoActive = () => store.playing || (store.currentTimeInMs >= 0 && store.currentTimeInMs < store.maxTime);

    const handlePanelClick = () => {
      const activeElement = store.selectedElement;
      if (activeElement && storyData?.scenes) {
        const scene = storyData.scenes.find(s => s._id === activeElement.pointId);
        if (scene) dispatch(setActiveScene(scene));
      }
    };

    return (
      <div
        className={`${styles.container} canvas ${isVideoActive() ? styles.playing : ''}`}
        onClick={handlePanelClick}
        data-testid="video-panel"
        data-interactive={true}
      >
        <div className={styles.playerContainer}>
          <div id="grid-canvas-container" ref={videoPanelRef} className={styles.canvasContainer}>
            {isTypographyPanelOpen && (
              <div className={styles.editingContainer}>
                <TypographyPanel onClose={toggleTypographyPanel} storyData={storyData} />
              </div>
            )}
            <CanvasDropZone className={styles.canvasWrapper}>
              {/* This is the main canvas targeted by the selection/move logic */}
              <canvas id="canvas" className={styles.canvasElement} />
              <div id="selection-layer" className={styles.selectionLayer}></div>
            </CanvasDropZone>

            {isRendering && (
              <div className={styles.renderingOverlay}>
                <div className={styles.renderingProgress}>
                  <div className={styles.progressText}>
                    {renderMessage || "Rendering video..."} <span className={styles.progressNumber}>{Math.round(renderProgress)}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${renderProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {!store.canvas?.getActiveObject() && (
              <ButtonWithIcon
                icon="ExpandIcon"
                classNameButton={styles.expandBtn}
                onClick={handleFullscreenOpen}
                onKeyDown={handleExpandKeyDown}
                tabIndex={0}
              />
            )}

            <AnimationSidebar
              toggleImageEditing={toggleImageEditing}
              toggleTypographyPanel={toggleTypographyPanel}
              toggleSubtitlesPanel={toggleSubtitlesPanel}
              isSubtitlesPanelOpen={isSubtitlesPanelOpen}
              toggleTransitionPanel={toggleTransitionPanel}
              isTransitionPanelOpen={isTransitionPanelOpen}
              storyData={storyData}
              screen={screen}
              isAnimationPanelOpen={isAnimationPanelOpen}
              toggleAnimationPanel={toggleAnimationPanel}
              isImageEditingOpen={isImageEditingOpen}
              isTypographyPanelOpen={isTypographyPanelOpen}
            />
          </div>
        </div>

        {!store.canvas?.getActiveObject() && !store.isResizing && (
          <div className={styles.seekPlayer} onClick={e => e.stopPropagation()}>
            <SeekPlayer
              isMuted={isMuted}
              currentVolume={currentVolume}
              handleVolumeChange={handleVolumeChange}
              handleMuteToggle={handleMuteToggle}
              volumeRangeRef={volumeRangeRef}
              isFullscreenOpen={false}
              isSelectedElementsAudio={isSelectedElementsAudio}
              selectedAudioElements={selectedAudioElements}
            />
          </div>
        )}

        {isFullscreenOpen && (
          <PlayerFullscreen
            handleFullscreenOpen={handleFullscreenOpen}
            storyData={storyData}
            isMuted={isMuted}
            currentVolume={currentVolume}
            handleVolumeChange={handleVolumeChange}
            handleMuteToggle={handleMuteToggle}
            volumeRangeRef={volumeRangeRef}
            isCanvasSyncing={isCanvasSyncing}
            isFullscreenOpen={isFullscreenOpen}
            isSelectedElementsAudio={isSelectedElementsAudio}
            selectedAudioElements={selectedAudioElements}
          />
        )}
      </div>
    );
  }
);