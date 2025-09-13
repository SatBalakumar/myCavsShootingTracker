import React, { useState, useEffect, useCallback } from 'react';
import './CourtTracker.css';
import { getEasternTimeISO } from '../utils/timezone';

/**
 * Helper function to format numbers with leading zeros for consistent display
 * Used for statistics display to maintain visual alignment (e.g., "01", "02", etc.)
 */
const formatStatNumber = (num) => {
  return num.toString().padStart(2, '0');
};

/**
 * COURT_ZONES: Defines the interactive shooting zones on the basketball court
 * 
 * Each zone contains:
 * - id: Unique identifier for database storage and zone tracking
 * - label: Human-readable name for UI display
 * - polygon: SVG coordinate string defining the clickable area boundaries
 * - buttonPosition: CSS positioning for mobile zone buttons (fallback UI)
 * - bounds: Rectangular boundaries for collision detection and validation
 * 
 * Design Decision: We use SVG polygons instead of rectangular divs because:
 * 1. Basketball court zones are irregular shapes that follow the actual court lines
 * 2. SVG coordinates scale perfectly with responsive design
 * 3. Precise zone boundaries improve shot tracking accuracy
 * 4. Polygons allow for realistic court zone representation
 */
const COURT_ZONES = [
  { 
    id: 'left_corner', 
    label: 'Left Corner',
    // Left corner: Actual corner area following three-point line geometry
    // Coordinates carefully mapped to match real court proportions
    polygon: "17.8,0.3 17.9,21.9 21.5,21.8 21.5,0.2",
    buttonPosition: { top: '15%', left: '11%' }, // Mobile fallback button placement
    bounds: { top: -2.5, left: 8.3, bottom: 21.9, right: 13.4 } // Collision detection boundaries
  },
  { 
    id: 'left_wing', 
    label: 'Left Wing',
    // Left wing: Area between corner and paint, follows three-point arc
    // Complex polygon shape accounts for the curved three-point line
    polygon: "18,22 18.1,59.4 39.7,59.6 39.8,42.9 37.6,42 35.4,41 33.1,39.1 30.7,37.3 28.7,34.6 26.6,32.4 25.1,29.8 23.8,27.3 22.6,24.6 21.6,22.1",
    buttonPosition: { top: '40%', left: '20%' },
    bounds: { top: 21.9, left: 8.3, bottom: 58, right: 32.3 }
  },
  { 
    id: 'top_key', 
    label: 'Top of Key',
    // Top of key: Paint area and free throw extended region
    // Most common shooting area, positioned for optimal user accessibility
    polygon: "40.1,42.9 40.1,59.9 60.6,59.9 60.6,42.7 58.8,43.6 56.3,44.4 53.8,45.1 51.1,45.3 48.3,45.5 45.5,44.9 42.6,44.2",
    buttonPosition: { top: '75%', left: '50%' }, // Centered for easy thumb access on mobile
    bounds: { top: 41.7, left: 32.3, bottom: 58, right: 68.4 }
  },
  { 
    id: 'right_wing', 
    label: 'Right Wing',
    // Right wing: Mirror of left wing with precise boundary alignment to top_key
    // Ensures no gaps or overlaps between adjacent zones for accurate tracking
    polygon: "82.2,21.7 82,59.7 60.8,59.6 60.8,42.8 63.1,41.8 65.7,40.1 68.2,38.6 70,36.5 72.3,33.9 74.2,31.5 75.8,28.8 77.1,26.3 78,23.9 78.8,21.9",
    buttonPosition: { top: '40%', left: '80%' },
    bounds: { top: 21.9, left: 68.4, bottom: 58, right: 91.7 }
  },
  { 
    id: 'right_corner', 
    label: 'Right Corner',
    // Right corner: Perfect mirror of left corner for symmetrical court layout
    // Maintains consistent zone sizing for fair statistical comparison
    polygon: "78.8,0.2 82.1,0.2 82.1,21.2 78.8,21.3",
    buttonPosition: { top: '15%', left: '89%' },
    bounds: { top: -2.5, left: 86.6, bottom: 21.9, right: 91.9 }
  }
];

/**
 * CourtTracker Component: Interactive basketball court for desktop shot tracking
 * 
 * Design Philosophy:
 * - Desktop-only interactive court for precision clicking
 * - Mobile devices get zone buttons (better UX for touch interfaces)
 * - SVG overlay system for scalable, responsive zone detection
 * - Split-zone design: each zone divided into "make" and "miss" sections
 * 
 * Key Features:
 * 1. Responsive design that scales with screen size
 * 2. Zone editor mode for developers to create new court zones
 * 3. Real-time statistics tracking and display
 * 4. Session state management (start/pause/resume)
 * 5. Device-aware UI (desktop vs mobile experience)
 */
// CourtTracker: Interactive SVG basketball court - Called from App.jsx renderContent()
const CourtTracker = (props) => {
  // SAFETY CHECKS: Defensive programming to prevent runtime errors
  // Props can be undefined during React component lifecycle transitions
  if (!props) {
    console.error('CourtTracker: No props provided');
    return <div>Loading Court...</div>;
  }

  // PROP EXTRACTION: Destructure props with clear naming for maintainability
  // Each prop serves a specific purpose in the shooting session workflow
  const { 
    shots,                    // Array of shot objects for current session
    setShots,                 // State setter for updating shots array
    sessionStarted,           // Boolean: whether shooting session is active
    sessionPaused,            // Boolean: whether session is temporarily paused
    currentPlayer,            // Object: selected player information
    currentElapsedTime,       // Number: milliseconds since session start
    onShot,                   // Callback: fired when shot is recorded
    onUndoLastShot,          // Callback: fired when last shot is undone
    lastUndoShotTime,        // Number: timer value from undone shot (for recalculation)
    setLastUndoShotTime,     // State setter: clears undo timer after use
    windowDimensions,        // Object: current window size for responsive behavior
    orientation,             // String: device orientation (portrait/landscape)
    isIPhoneLandscape,       // Boolean: specific iPhone landscape detection
    appRenderKey             // Number: forces re-render when needed
  } = props;

  // CRITICAL PROPS VALIDATION: Ensure required props exist and are functional
  // Without shots array and setShots function, the component cannot track data
  if (!shots || !setShots || typeof setShots !== 'function') {
    console.error('CourtTracker: Missing required props (shots, setShots)');
    return <div>Loading Court...</div>;
  }

  /**
   * SHOT TIMING CALCULATION: Determines time elapsed for each individual shot
   * 
   * Two scenarios:
   * 1. Normal shot: Calculate time since last shot (or session start)
   * 2. Post-undo shot: Use stored time from the undone shot for accuracy
   * 
   * Why this matters: Shot timing data is used for analyzing shooting rhythm
   * and performance patterns over time. Accurate timing is crucial for
   * meaningful basketball analytics.
   */
  // calculateShotTime: Computes time elapsed since last shot - Called by handleZoneClick
  const calculateShotTime = (currentElapsedTime) => {
    try {
      if (lastUndoShotTime !== null && lastUndoShotTime !== undefined) {
        // Scenario 1: Use stored time from undone shot to maintain timing accuracy
        const undoTime = lastUndoShotTime;
        if (typeof setLastUndoShotTime === 'function') {
          setLastUndoShotTime(null); // Clear after using to prevent reuse
        }
        return undoTime;
      } else {
        // Scenario 2: Calculate time since last shot (or session start if first shot)
        const previousShotTime = shots && shots.length > 0 ? shots[shots.length - 1].timerValue : 0;
        return (currentElapsedTime || 0) - (previousShotTime || 0);
      }
    } catch (error) {
      console.error('Error calculating shot time:', error);
      return 0; // Safe fallback prevents app crashes
    }
  };
  /**
   * RESPONSIVE DESIGN: Get effective window dimensions for device detection
   * Prioritizes parent-provided dimensions over local window measurements
   * for consistent behavior across the application
   */
  const effectiveWindowDimensions = windowDimensions || {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  /**
   * DEVICE DETECTION: Comprehensive mobile and tablet detection strategy
   * 
   * Why disable court interactions on mobile/tablet:
   * 1. Touch interfaces are imprecise for small court zones
   * 2. Finger size obscures the shooting area being clicked
   * 3. Zone buttons provide better UX for touch devices
   * 4. Prevents accidental touches during device handling
   * 
   * Multi-layered detection approach:
   * - User agent strings (most reliable for known devices)
   * - Screen width thresholds (catches various form factors)
   * - Touch capability detection (modern device fallback)
   * - Specific iPad detection (often misidentified as desktop)
   * - Viewport-based detection (tablet size ranges)
   */
  const isMobileOrTablet = useCallback(() => {
    return (
      // Layer 1: User agent detection (catches most devices reliably)
      /Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent) ||
      // Layer 2: Screen width detection (catches smaller screens and some tablets)
      effectiveWindowDimensions.width <= 768 ||
      // Layer 3: Touch capability detection (fallback for devices not caught above)
      ('ontouchstart' in window) ||
      // Layer 4: Specific iPad detection (comprehensive approach for modern iPads)
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      // Layer 5: Viewport-based detection for tablets (additional safety net)
      (effectiveWindowDimensions.width <= 1200 && effectiveWindowDimensions.height <= 900)
    );
  }, [effectiveWindowDimensions]);
  
  // INTERACTION CONTROL: Determine if court should be interactive based on device type
  const shouldDisableCourtInteractions = isMobileOrTablet();
  
  /**
   * ZONE EDITOR STATE: Developer tool for creating new court zones
   * Only enabled on desktop to avoid accidental activation on mobile
   * 
   * State variables:
   * - isEditorMode: Boolean toggle for editor interface
   * - selectedPoints: Array of clicked coordinates for polygon creation
   * - currentZoneName: String identifier for new zone being created
   * - editingZoneId: ID of zone being modified (future feature)
   */
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [currentZoneName, setCurrentZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState(null);

  /**
   * COURT CLICK HANDLER: Processes clicks for zone editor point selection
   * 
   * Coordinate system explanation:
   * - SVG viewBox is "0 0 100 60" (100 width units, 60 height units)
   * - Click coordinates are converted to percentage-based positions
   * - This ensures coordinates scale properly with responsive design
   * 
   * Security: Only functions in editor mode on desktop devices
   */
  const handleCourtClick = (event) => {
    // Security check: Prevent activation on mobile or when editor is disabled
    if (shouldDisableCourtInteractions || !isEditorMode) return;
    
    // Convert browser click coordinates to SVG coordinate system
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 60;
    
    // Round to 1 decimal place for clean coordinate values
    const newPoint = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    setSelectedPoints([...selectedPoints, newPoint]);
  };

  /**
   * UTILITY FUNCTIONS for Zone Editor
   * These functions support the developer zone creation workflow
   */
  
  // Convert array of point objects to SVG polygon coordinate string
  const pointsToPolygon = (points) => {
    return points.map(p => `${p.x},${p.y}`).join(' ');
  };

  // Reset all editor state to start fresh zone creation
  const clearSelection = () => {
    setSelectedPoints([]);
    setCurrentZoneName('');
    setEditingZoneId(null);
  };

  // Generate copy-pasteable code for new zone definitions
  const generatePolygonCode = () => {
    if (selectedPoints.length < 3) return '';
    const polygonString = pointsToPolygon(selectedPoints);
    return `polygon: "${polygonString}"`;
  };

  // Remove most recent point (undo last click)
  const removeLastPoint = () => {
    setSelectedPoints(selectedPoints.slice(0, -1));
  };

  /**
   * SHOT RECORDING HANDLERS: Process user interactions with court zones
   * 
   * Two-layer approach:
   * 1. handlePolygonClick: Handles SVG element events (prevents event bubbling)
   * 2. handleZoneClick: Core business logic for shot recording
   */
  
  // SVG event handler - prevents click events from bubbling to parent elements
  const handlePolygonClick = (zoneId, made, event) => {
    event.preventDefault();
    event.stopPropagation();
    handleZoneClick(zoneId, made);
  };

  /**
   * CORE SHOT RECORDING LOGIC: Validates session state and records shot data
   * 
   * Validation hierarchy:
   * 1. Session must be started (prevents accidental shots)
   * 2. Session must not be paused (enforces proper workflow)
   * 3. Shot limit not exceeded (prevents infinite sessions)
   * 
   * Shot data structure includes:
   * - location: Zone identifier for analytics
   * - made: Boolean for make/miss tracking
   * - timestamp: Eastern Time for Cleveland Cavaliers timezone
   * - player: Player object for session attribution
   * - timerValue: Absolute session time when shot occurred
   * - timeTakenForShot: Relative time since previous shot
   */
  // handleZoneClick: Records shot when court zone is clicked - Called by SVG polygon click events
  const handleZoneClick = (zoneId, made) => {
    // Validation 1: Ensure session is active
    if (!sessionStarted) {
      alert("Please start a session first!");
      return;
    }
    
    // Validation 2: Ensure session is not paused
    if (sessionPaused) {
      alert("Session is paused! Resume to continue shooting.");
      return;
    }
    
    // Validation 3: Enforce shot limit for manageable session lengths
    if (shots.length >= 100) {
      alert("Test complete! 100 shots taken.");
      return;
    }

    // Create comprehensive shot record with timing and context data
    const newShot = {
      location: zoneId,                               // Zone identifier for analytics
      made,                                           // Boolean: true for make, false for miss
      timestamp: getEasternTimeISO(),                 // Eastern Time (Cavaliers timezone)
      player: currentPlayer,                          // Player object for attribution
      timerValue: currentElapsedTime,                 // Absolute session timer value
      timeTakenForShot: calculateShotTime(currentElapsedTime) // Time since last shot
    };
    
    // Update local state and notify parent component
    setShots([...shots, newShot]);
    if (onShot) onShot(newShot); // Trigger any additional shot processing
  };

  /**
   * STATISTICS CALCULATION: Real-time shot tracking per zone
   * 
   * Creates object with zone-based statistics:
   * - made: Number of successful shots in each zone
   * - attempts: Total shots attempted in each zone
   * 
   * Used for:
   * - Real-time feedback during sessions
   * - Visual indicators on court zones
   * - Performance analysis and improvement tracking
   */
  // getStats: Calculates zone-based shooting statistics - Called for court zone overlays
  const getStats = () => {
    const stats = {};
    for (let shot of shots) {
      // Initialize zone stats if first shot in this zone
      if (!stats[shot.location]) stats[shot.location] = { made: 0, attempts: 0 };
      
      // Count all attempts
      stats[shot.location].attempts++;
      
      // Count successful shots
      if (shot.made) stats[shot.location].made++;
    }
    return stats;
  };

  const stats = getStats(); // Calculate current session statistics

  /**
   * MOBILE DEVICE FALLBACK: Provide alternative UI for touch devices
   * 
   * Design Decision: Instead of trying to make court interactive on mobile
   * (which would be frustrating due to touch precision issues), we provide
   * a clear message directing users to the zone buttons interface.
   * 
   * This maintains a consistent user experience across all device types.
   */
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
            color: '#6F263D',              // Cavaliers wine color
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
