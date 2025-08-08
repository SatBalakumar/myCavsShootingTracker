import React, { useState, useEffect, useCallback } from 'react';
import './CourtTracker.css';
import { getEasternTimeISO } from '../utils/timezone';

// Helper function to format numbers with leading zeros (always 2 digits)
const formatStatNumber = (num) => {
  return num.toString().padStart(2, '0');
};

const COURT_ZONES = [
  { 
    id: 'left_corner', 
    label: 'Left Corner',
    // Left corner: actual corner area following three-point line
    polygon: "17.8,0.3 17.9,21.9 21.5,21.8 21.5,0.2",
    buttonPosition: { top: '15%', left: '11%' },
    bounds: { top: -2.5, left: 8.3, bottom: 21.9, right: 13.4 }
  },
  { 
    id: 'left_wing', 
    label: 'Left Wing',
    // Left wing: between corner and paint
    polygon: "18,22 18.1,59.4 39.7,59.6 39.8,42.9 37.6,42 35.4,41 33.1,39.1 30.7,37.3 28.7,34.6 26.6,32.4 25.1,29.8 23.8,27.3 22.6,24.6 21.6,22.1",
    buttonPosition: { top: '40%', left: '20%' },
    bounds: { top: 21.9, left: 8.3, bottom: 58, right: 32.3 }
  },
  { 
    id: 'top_key', 
    label: 'Top of Key',
    // Top of key: paint area and free throw extended
    polygon: "40.1,42.9 40.1,59.9 60.6,59.9 60.6,42.7 58.8,43.6 56.3,44.4 53.8,45.1 51.1,45.3 48.3,45.5 45.5,44.9 42.6,44.2",
    buttonPosition: { top: '75%', left: '50%' },
    bounds: { top: 41.7, left: 32.3, bottom: 58, right: 68.4 }
  },
  { 
    id: 'right_wing', 
    label: 'Right Wing',
    // Right wing: mirror of left wing - aligned boundary with top_key
    polygon: "82.2,21.7 82,59.7 60.8,59.6 60.8,42.8 63.1,41.8 65.7,40.1 68.2,38.6 70,36.5 72.3,33.9 74.2,31.5 75.8,28.8 77.1,26.3 78,23.9 78.8,21.9",
    buttonPosition: { top: '40%', left: '80%' },
    bounds: { top: 21.9, left: 68.4, bottom: 58, right: 91.7 }
  },
  { 
    id: 'right_corner', 
    label: 'Right Corner',
    // Right corner: mirror of left corner
    polygon: "78.8,0.2 82.1,0.2 82.1,21.2 78.8,21.3",
    buttonPosition: { top: '15%', left: '89%' },
    bounds: { top: -2.5, left: 86.6, bottom: 21.9, right: 91.9 }
  }
];

const CourtTracker = (props) => {
  // Add safety checks for props
  if (!props) {
    console.error('CourtTracker: No props provided');
    return <div>Loading Court...</div>;
  }

  const { 
    shots, 
    setShots, 
    sessionStarted, 
    sessionPaused, 
    currentPlayer, 
    currentElapsedTime, 
    onShot,
    onUndoLastShot,
    lastUndoShotTime,
    setLastUndoShotTime,
    windowDimensions,
    orientation,
    isIPhoneLandscape,
    appRenderKey
  } = props;

  // Additional safety checks
  if (!shots || !setShots || typeof setShots !== 'function') {
    console.error('CourtTracker: Missing required props (shots, setShots)');
    return <div>Loading Court...</div>;
  }

  // Calculate time taken for current shot
  const calculateShotTime = (currentElapsedTime) => {
    try {
      if (lastUndoShotTime !== null && lastUndoShotTime !== undefined) {
        // Use the time from the undone shot
        const undoTime = lastUndoShotTime;
        if (typeof setLastUndoShotTime === 'function') {
          setLastUndoShotTime(null); // Clear after using
        }
        return undoTime;
      } else {
        // Calculate time since last shot (or session start)
        const previousShotTime = shots && shots.length > 0 ? shots[shots.length - 1].timerValue : 0;
        return (currentElapsedTime || 0) - (previousShotTime || 0);
      }
    } catch (error) {
      console.error('Error calculating shot time:', error);
      return 0; // Fallback value
    }
  };
  // Use orientation data from App component if available, fallback to local detection
  const effectiveWindowDimensions = windowDimensions || {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  // Enhanced mobile and tablet detection - disable court mode on all mobile devices and tablets
  const isMobileOrTablet = useCallback(() => {
    return (
      // User agent detection (catches most devices)
      /Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent) ||
      // Screen width detection (catches smaller screens and some tablets)
      effectiveWindowDimensions.width <= 768 ||
      // Touch capability detection (fallback for devices not caught above)
      ('ontouchstart' in window) ||
      // Specific iPad detection (more comprehensive)
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      // Additional viewport-based detection for tablets
      (effectiveWindowDimensions.width <= 1200 && effectiveWindowDimensions.height <= 900)
    );
  }, [effectiveWindowDimensions]);
  
  // Determine if court interactions should be disabled (only allow on desktop)
  const shouldDisableCourtInteractions = isMobileOrTablet();
  
  // Zone Editor State - Only allow on desktop
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [currentZoneName, setCurrentZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState(null);

  // Handle clicks on court for point selection
  const handleCourtClick = (event) => {
    // Completely disable editor functionality on mobile phones and tablet landscape
    if (shouldDisableCourtInteractions || !isEditorMode) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 60;
    
    const newPoint = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    setSelectedPoints([...selectedPoints, newPoint]);
  };

  // Convert points to polygon string
  const pointsToPolygon = (points) => {
    return points.map(p => `${p.x},${p.y}`).join(' ');
  };

  // Clear current selection
  const clearSelection = () => {
    setSelectedPoints([]);
    setCurrentZoneName('');
    setEditingZoneId(null);
  };

  // Generate polygon code
  const generatePolygonCode = () => {
    if (selectedPoints.length < 3) return '';
    const polygonString = pointsToPolygon(selectedPoints);
    return `polygon: "${polygonString}"`;
  };

  // Remove last point
  const removeLastPoint = () => {
    setSelectedPoints(selectedPoints.slice(0, -1));
  };

  // Handle clicks on SVG polygon zones
  const handlePolygonClick = (zoneId, made, event) => {
    event.preventDefault();
    event.stopPropagation();
    handleZoneClick(zoneId, made);
  };

  const handleZoneClick = (zoneId, made) => {
    if (!sessionStarted) {
      alert("Please start a session first!");
      return;
    }
    
    if (sessionPaused) {
      alert("Session is paused! Resume to continue shooting.");
      return;
    }
    
    if (shots.length >= 100) {
      alert("Test complete! 100 shots taken.");
      return;
    }

    const newShot = {
      location: zoneId,
      made,
      timestamp: getEasternTimeISO(),
      player: currentPlayer,
      timerValue: currentElapsedTime, // Store what the timer showed when shot was taken
      timeTakenForShot: calculateShotTime(currentElapsedTime) // Time since last shot
    };
    setShots([...shots, newShot]);
    if (onShot) onShot(newShot);
  };

  const getStats = () => {
    const stats = {};
    for (let shot of shots) {
      if (!stats[shot.location]) stats[shot.location] = { made: 0, attempts: 0 };
      stats[shot.location].attempts++;
      if (shot.made) stats[shot.location].made++;
    }
    return stats;
  };

  const stats = getStats();

  // Don't render court at all on mobile/tablet devices
  if (shouldDisableCourtInteractions) {
    return (
      <div className="court-wrapper-single">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '10px',
          margin: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#6F263D',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Court mode is not available on mobile devices.<br/>
            Please use the zone buttons to track shots.
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="court-wrapper-single">
      {/* Zone Editor Controls */}
      {isEditorMode && !shouldDisableCourtInteractions && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 20,
          background: 'rgba(111, 38, 61, 0.95)',
          color: '#FFB81C',
          padding: '15px',
          borderRadius: '10px',
          minWidth: '300px',
          maxWidth: '400px',
          fontFamily: 'Arial, sans-serif',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Zone Editor Mode</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Zone name (e.g., left_corner)"
              value={currentZoneName}
              onChange={(e) => setCurrentZoneName(e.target.value)}
              style={{
                width: '100%',
                padding: '5px',
                marginBottom: '5px',
                borderRadius: '5px',
                border: 'none'
              }}
            />
          </div>
          
          <div style={{ fontSize: '12px', marginBottom: '10px' }}>
            Points selected: {selectedPoints.length}
            {selectedPoints.length >= 3 && <span style={{ color: '#90EE90' }}> Ready to generate</span>}
          </div>
          
          <div style={{ marginBottom: '10px', fontSize: '11px' }}>
            <strong>Instructions:</strong><br/>
            • Click on court to add points<br/>
            • Create zone boundary by clicking around the area<br/>
            • Need at least 3 points to form a polygon
          </div>
          
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button
              onClick={removeLastPoint}
              disabled={selectedPoints.length === 0}
              style={{
                padding: '5px 10px',
                backgroundColor: '#FFB81C',
                color: '#6F263D',
                border: 'none',
                borderRadius: '5px',
                fontSize: '11px',
                cursor: selectedPoints.length > 0 ? 'pointer' : 'not-allowed',
                opacity: selectedPoints.length > 0 ? 1 : 0.5
              }}
            >
              Remove Last
            </button>
            
            <button
              onClick={clearSelection}
              style={{
                padding: '5px 10px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
            
            <button
              onClick={() => setIsEditorMode(false)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Exit Editor
            </button>
          </div>
          
          {selectedPoints.length >= 3 && (
            <div style={{ marginTop: '10px', fontSize: '10px', fontFamily: 'monospace' }}>
              <strong>Generated Code:</strong><br/>
              <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '5px', 
                borderRadius: '3px',
                wordBreak: 'break-all',
                maxHeight: '60px',
                overflow: 'auto'
              }}>
                {generatePolygonCode()}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(generatePolygonCode())}
                style={{
                  marginTop: '5px',
                  padding: '3px 6px',
                  fontSize: '10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Copy Code
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Editor Mode Toggle Button - Always visible on desktop */}
      {!shouldDisableCourtInteractions && (
        <button
          onClick={() => setIsEditorMode(!isEditorMode)}
          style={{
            position: 'absolute',
            top: isEditorMode ? '320px' : '10px',
            right: '10px',
            zIndex: 20,
            padding: '8px 12px',
            backgroundColor: isEditorMode ? '#d32f2f' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {isEditorMode ? 'Exit' : 'Zone Editor'}
        </button>
      )}

      <div 
        className="court-container"
        onClick={handleCourtClick}
        style={{ 
          cursor: (isEditorMode && !shouldDisableCourtInteractions) ? 'crosshair' : 'default',
          position: 'relative',
          display: 'inline-block',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <img 
          src="/cavaliersCourt.png" 
          alt="Court" 
          className="court-image" 
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
        
        {/* Zone Editor Mode: SVG Overlay for point selection */}
        {isEditorMode && !shouldDisableCourtInteractions && (
          <svg 
            className="court-overlay" 
            viewBox="0 0 100 60" 
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <g>
              {/* Selected Points */}
              {selectedPoints.map((point, index) => (
                <g key={index}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="0.8"
                    fill="#FF4444"
                    stroke="white"
                    strokeWidth="0.2"
                  />
                  <text
                    x={point.x + 1}
                    y={point.y - 1}
                    fontSize="1.5"
                    fill="#FF4444"
                    fontWeight="bold"
                  >
                    {index + 1}
                  </text>
                </g>
              ))}
              
              {/* Preview polygon */}
              {selectedPoints.length >= 3 && (
                <polygon
                  points={pointsToPolygon(selectedPoints)}
                  fill="rgba(255, 68, 68, 0.2)"
                  stroke="#FF4444"
                  strokeWidth="0.3"
                  strokeDasharray="1,1"
                />
              )}
              
              {/* Lines connecting points */}
              {selectedPoints.length >= 2 && selectedPoints.map((point, index) => {
                if (index === 0) return null;
                const prevPoint = selectedPoints[index - 1];
                return (
                  <line
                    key={`line-${index}`}
                    x1={prevPoint.x}
                    y1={prevPoint.y}
                    x2={point.x}
                    y2={point.y}
                    stroke="#FF4444"
                    strokeWidth="0.2"
                    strokeDasharray="0.5,0.5"
                  />
                );
              })}
            </g>
          </svg>
        )}

        {/* Interactive Zone Areas */}
        {!isEditorMode && (
          <svg 
            className="court-overlay" 
            viewBox="0 0 100 60" 
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'auto'
            }}
          >
            {/* Clip path definitions */}
            <defs>
              {COURT_ZONES.map((zone) => (
                <g key={`defs-${zone.id}`}>
                  <clipPath id={`makeSection-${zone.id}`}>
                    {(() => {
                      const points = zone.polygon.split(' ').map(p => {
                        const [x, y] = p.split(',').map(Number);
                        return { x, y };
                      });
                      
                      const minX = Math.min(...points.map(p => p.x));
                      const maxX = Math.max(...points.map(p => p.x));
                      const minY = Math.min(...points.map(p => p.y));
                      const maxY = Math.max(...points.map(p => p.y));
                      const centerX = (minX + maxX) / 2;
                      const centerY = (minY + maxY) / 2;
                      
                      if (zone.id.includes('corner')) {
                        // Horizontal split for corners (top half = make)
                        return (
                          <path d={`M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${centerY} L ${minX} ${centerY} Z`} />
                        );
                      } else if (zone.id.includes('wing')) {
                        // Diagonal split for wings
                        if (zone.id === 'left_wing') {
                          return (
                            <path d={`M ${minX} ${minY} L ${maxX} ${minY} L ${minX + (maxX - minX) * 0.3} ${maxY} L ${minX} ${maxY} Z`} />
                          );
                        } else {
                          return (
                            <path d={`M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${maxX - (maxX - minX) * 0.3} ${maxY} Z`} />
                          );
                        }
                      } else {
                        // Vertical split for top of key (left half = make)
                        return (
                          <path d={`M ${minX} ${minY} L ${centerX} ${minY} L ${centerX} ${maxY} L ${minX} ${maxY} Z`} />
                        );
                      }
                    })()}
                  </clipPath>
                  
                  <clipPath id={`missSection-${zone.id}`}>
                    {(() => {
                      const points = zone.polygon.split(' ').map(p => {
                        const [x, y] = p.split(',').map(Number);
                        return { x, y };
                      });
                      
                      const minX = Math.min(...points.map(p => p.x));
                      const maxX = Math.max(...points.map(p => p.x));
                      const minY = Math.min(...points.map(p => p.y));
                      const maxY = Math.max(...points.map(p => p.y));
                      const centerX = (minX + maxX) / 2;
                      const centerY = (minY + maxY) / 2;
                      
                      if (zone.id.includes('corner')) {
                        // Horizontal split for corners (bottom half = miss)
                        return (
                          <path d={`M ${minX} ${centerY} L ${maxX} ${centerY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`} />
                        );
                      } else if (zone.id.includes('wing')) {
                        // Diagonal split for wings
                        if (zone.id === 'left_wing') {
                          return (
                            <path d={`M ${minX + (maxX - minX) * 0.3} ${maxY} L ${maxX} ${minY} L ${maxX} ${maxY} Z`} />
                          );
                        } else {
                          return (
                            <path d={`M ${minX} ${minY} L ${maxX - (maxX - minX) * 0.3} ${maxY} L ${minX} ${maxY} Z`} />
                          );
                        }
                      } else {
                        // Vertical split for top of key (right half = miss)
                        return (
                          <path d={`M ${centerX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${centerX} ${maxY} Z`} />
                        );
                      }
                    })()}
                  </clipPath>
                </g>
              ))}
            </defs>

            {COURT_ZONES.map((zone) => {
              const zoneStats = stats[zone.id] || { made: 0, attempts: 0 };
              
              return (
                <g key={zone.id}>
                  {/* Make Section (Left/Top half) */}
                  <polygon
                    points={zone.polygon}
                    fill="rgba(0, 200, 0, 0.3)"
                    stroke="none"
                    strokeWidth="0"
                    style={{ 
                      pointerEvents: (sessionStarted && !sessionPaused && shots.length < 100) ? 'auto' : 'none',
                      cursor: (sessionStarted && !sessionPaused && shots.length < 100) ? 'pointer' : 'not-allowed',
                      transition: 'fill 0.2s ease'
                    }}
                    clipPath={`url(#makeSection-${zone.id})`}
                    onMouseEnter={(e) => {
                      if (sessionStarted && !sessionPaused && shots.length < 100) {
                        e.target.style.fill = 'rgba(0, 255, 0, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.fill = 'rgba(0, 200, 0, 0.3)';
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleZoneClick(zone.id, true);
                    }}
                    title={sessionStarted ? 
                      (sessionPaused ? 'Resume session to shoot' : 
                      shots.length >= 100 ? 'Test complete! 100 shots taken.' :
                      `MAKE from ${zone.label}`) : 
                      'Start session to shoot'}
                  />
                  
                  {/* Miss Section (Right/Bottom half) */}
                  <polygon
                    points={zone.polygon}
                    fill="rgba(200, 0, 0, 0.3)"
                    stroke="none"
                    strokeWidth="0"
                    style={{ 
                      pointerEvents: (sessionStarted && !sessionPaused && shots.length < 100) ? 'auto' : 'none',
                      cursor: (sessionStarted && !sessionPaused && shots.length < 100) ? 'pointer' : 'not-allowed',
                      transition: 'fill 0.2s ease'
                    }}
                    clipPath={`url(#missSection-${zone.id})`}
                    onMouseEnter={(e) => {
                      if (sessionStarted && !sessionPaused && shots.length < 100) {
                        e.target.style.fill = 'rgba(255, 0, 0, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.fill = 'rgba(200, 0, 0, 0.3)';
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleZoneClick(zone.id, false);
                    }}
                    title={sessionStarted ? 
                      (sessionPaused ? 'Resume session to shoot' : 
                      shots.length >= 100 ? 'Test complete! 100 shots taken.' :
                      `MISS from ${zone.label}`) : 
                      'Start session to shoot'}
                  />


                </g>
              );
            })}
          </svg>
        )}

        {/* Individual zone undo buttons removed - using global undo button instead */}
      </div>
    </div>
  );
  } catch (error) {
    console.error('CourtTracker render error:', error);
    return <div>Error loading court. Please try refreshing the page.</div>;
  }
};

export default CourtTracker;
