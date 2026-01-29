import React, { useState, useRef } from 'react';
import img1 from '../../images/mockCard/card5.png';

/**
 * VIDEFY - Canvas Item Selection + Move Implementation
 * Clean version with corrected syntax.
 */
const VidefyCanvasEditor = () => {
  // 1. DATA & STATE MANAGEMENT
  const [items, setItems] = useState([
    { 
      id: 'media-1', 
      x: 100, 
      y: 100, 
      width: 200, 
      height: 300, 
      type: 'image', 
      src: img1
    //   src: 'https://via.placeholder.com/200x300/333/fff?text=Media+Item' 
    }
  ]);
  const [selectedId, setSelectedId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 2. SELECTION LOGIC
  const handleItemSelect = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    
    const item = items.find(i => i.id === id);
    if (item) {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - item.x,
        y: e.clientY - item.y
      };
    }
  };

  // 3. MOVEMENT LOGIC
  const handleMouseMove = (e) => {
    if (!isDragging || !selectedId) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    setItems(prev => prev.map(item => 
      item.id === selectedId ? { ...item, x: newX, y: newY } : item
    ));
  };

  // 4. CLAMPING & DROPPING LOGIC
  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!canvasRef.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    
    setItems(prev => prev.map(item => {
      if (item.id === selectedId) {
        // Requirement: Keep item within canvas bounds (clamp) [cite: 84]
        const clampedX = Math.max(0, Math.min(item.x, canvas.width - item.width));
        const clampedY = Math.max(0, Math.min(item.y, canvas.height - item.height));
        return { ...item, x: clampedX, y: clampedY };
      }
      return item;
    }));
  };

  return (
    <div style={styles.pageWrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>VIDEFY.ai - Canvas Editor</h1>
        <p style={styles.subtitle}>Click to select • Drag to move • Snaps to bounds on drop</p>
      </header>

      {/* THE CANVAS AREA */}
      <div 
        ref={canvasRef}
        style={styles.canvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} 
        onClick={() => setSelectedId(null)}
      >
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          
          return (
            <div
              key={item.id}
              onMouseDown={(e) => handleItemSelect(e, item.id)}
              style={{
                ...styles.mediaItem,
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                // Requirement: Clearly show selection state [cite: 82]
                border: isSelected ? '3px solid #00f2ff' : '1px solid #444',
                boxShadow: isSelected ? '0 0 15px rgba(0, 242, 255, 0.6)' : 'none',
                zIndex: isSelected ? 10 : 1,
                cursor: isDragging && isSelected ? 'grabbing' : 'grab',
              }}
            >
              <img 
                src={item.src} 
                alt="Media" 
                style={styles.image} 
                draggable={false} 
              />

              {isSelected && (
                <>
                  <div style={{ ...styles.handle, top: -6, left: -6 }} />
                  <div style={{ ...styles.handle, top: -6, right: -6 }} />
                  <div style={{ ...styles.handle, bottom: -6, left: -6 }} />
                  <div style={{ ...styles.handle, bottom: -6, right: -6 }} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    backgroundColor: '#0f1115',
    color: '#fff',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    fontFamily: 'sans-serif'
  },
  header: { textAlign: 'center', marginBottom: '30px' },
  title: { fontSize: '24px', margin: '0 0 10px 0' },
  subtitle: { color: '#888', fontSize: '14px' },
  canvas: {
    width: '800px',
    height: '500px',
    backgroundColor: '#1a1d23',
    border: '1px solid #333',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '8px'
  },
  mediaItem: {
    position: 'absolute',
    userSelect: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
  },
  handle: {
    position: 'absolute',
    width: '12px',
    height: '12px',
    backgroundColor: '#00f2ff',
    borderRadius: '50%',
    border: '2px solid #0f1115'
  }
};

export default VidefyCanvasEditor;