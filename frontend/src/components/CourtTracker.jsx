import React, { useState } from 'react';
import './CourtTracker.css';


const COURT_ZONES = [
  { 
    id: 'left_corner', 
    label: 'Left Corner',
    // Left corner: actual corner area following three-point line
    polygon: "8.4,-2.1 13.2,-2.1 13.4,21.9 8.3,21.9",
    buttonPosition: { top: '15%', left: '11%' },
    bounds: { top: -2.5, left: 8.3, bottom: 21.9, right: 13.4 }
  },
  { 
    id: 'left_wing', 
    label: 'Left Wing',
    // Left wing: between corner and paint
    polygon: "8.3,21.9 13.4,21.9 15,25.7 17.9,29.9 20.5,32.9 23.1,35.6 26,38.1 29,40.1 31.9,41.4 32.3,41.7 32.3,58 8.3,58",
    buttonPosition: { top: '40%', left: '20%' },
    bounds: { top: 21.9, left: 8.3, bottom: 58, right: 32.3 }
  },
  { 
    id: 'top_key', 
    label: 'Top of Key',
    // Top of key: paint area and free throw extended
    polygon: "32.3,41.7 36.3,43.5 40.2,44.7 44.4,45.8 47.5,45.9 52.1,45.8 56.7,45.4 62.7,44.2 66.1,42.4 68.4,41.7 68.4,58 32.3,58",
    buttonPosition: { top: '75%', left: '50%' },
    bounds: { top: 41.7, left: 32.3, bottom: 58, right: 68.4 }
  },
  { 
    id: 'right_wing', 
    label: 'Right Wing',
    // Right wing: mirror of left wing - aligned boundary with top_key
    polygon: "68.4,41.7 69.7,41.4 70.1,40.1 74,38.1 76.9,35.6 79.5,32.9 82.1,29.9 85,25.7 86.6,21.9 91.7,21.9 91.7,58 68.4,58",
    buttonPosition: { top: '40%', left: '80%' },
    bounds: { top: 21.9, left: 68.4, bottom: 58, right: 91.7 }
  },
  { 
    id: 'right_corner', 
    label: 'Right Corner',
    // Right corner: mirror of left corner
    polygon: "86.6,-2.1 91.7,-2.1 91.7,21.9 86.6,21.9",
    buttonPosition: { top: '15%', left: '89%' },
    bounds: { top: -2.5, left: 86.6, bottom: 21.9, right: 91.9 }
  }
];

const CourtTracker = ({ shots, setShots, currentPlayer, onShot, onUndoZoneShot, sessionStarted, sessionPaused }) => {
  // Mobile phone detection (excludes tablets)
  const isMobilePhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && !/iPad|tablet/i.test(navigator.userAgent) && window.innerWidth <= 480;
  
  // Zone Editor State - Only allow on desktop
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [currentZoneName, setCurrentZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState(null);

  // Handle clicks on court for point selection
  const handleCourtClick = (event) => {
    // Completely disable editor functionality on mobile phones
    if (isMobilePhone || !isEditorMode) return;
    
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
      timestamp: new Date().toISOString(),
      player: currentPlayer
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

  return (
    <div className="court-wrapper-single">
      {/* Zone Editor Controls */}
      {isEditorMode && !isMobilePhone && (
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
            {selectedPoints.length >= 3 && <span style={{ color: '#90EE90' }}> ✓ Ready to generate</span>}
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
      
      {/* Editor Mode Toggle Button */}
      {!sessionStarted && !isMobilePhone && (
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
          cursor: (isEditorMode && !isMobilePhone) ? 'crosshair' : 'default',
          position: 'relative',
          display: 'inline-block',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <img 
          src="/court.png" 
          alt="Court" 
          className="court-image" 
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
        
        {/* SVG Overlay for Zone Boundaries and Clickable Areas */}
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
            pointerEvents: (isEditorMode && !isMobilePhone) ? 'none' : 'auto'
          }}
        >
          {/* Editor Mode: Show selected points and preview polygon */}
          {isEditorMode && !isMobilePhone && (
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
          )}
          
          {/* Normal Mode: Show existing zones - Always available on tablets */}
          {(!isEditorMode || isMobilePhone) && COURT_ZONES.map((zone) => {
            const zoneStats = stats[zone.id] || { made: 0, attempts: 0 };
            
            return (
              <g key={zone.id}>
                {/* Zone Boundary - Visual Only */}
                <polygon
                  points={zone.polygon}
                  fill="rgba(111, 38, 61, 0.1)"
                  stroke="#000000"
                  strokeWidth="1"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Calculate zone center for text positioning */}
                {(() => {
                  const points = zone.polygon.split(' ').map(p => {
                    const [x, y] = p.split(',').map(Number);
                    return { x, y };
                  });
                  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
                  const minX = Math.min(...points.map(p => p.x));
                  const maxX = Math.max(...points.map(p => p.x));
                  const minY = Math.min(...points.map(p => p.y));
                  const maxY = Math.max(...points.map(p => p.y));
                  
                  // Get zone letter
                  const zoneLetters = {
                    'left_corner': 'LC',
                    'left_wing': 'LW', 
                    'top_key': 'TK',
                    'right_wing': 'RW',
                    'right_corner': 'RC'
                  };
                  
                  return (
                    <>
                      {/* Make Section (Top-left triangle) */}
                      <polygon
                        points={zone.polygon}
                        fill="rgba(0, 200, 0, 1.0)"
                        stroke="none"
                        strokeWidth="0"
                        style={{ 
                          pointerEvents: (sessionStarted && !sessionPaused && !isMobilePhone) ? 'auto' : 'none',
                          cursor: (sessionStarted && !sessionPaused && !isMobilePhone) ? 'pointer' : 'not-allowed',
                          transition: 'fill 0.2s ease'
                        }}
                        clipPath={`url(#topLeftTriangle-${zone.id})`}
                        onMouseEnter={(e) => {
                          if (sessionStarted && !sessionPaused && !isMobilePhone) {
                            e.target.style.fill = 'rgba(0, 255, 0, 1.0)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.fill = 'rgba(0, 200, 0, 1.0)';
                        }}
                        onClick={(e) => !isMobilePhone && handlePolygonClick(zone.id, true, e)}
                        title={sessionStarted ? 
                          (sessionPaused ? 'Resume session to shoot' : 
                          `${zone.label} - MAKE (${zoneStats.made}/${zoneStats.attempts})`) : 
                          'Start session to shoot'}
                      />
                      
                      {/* Miss Section (Bottom-right triangle) */}
                      <polygon
                        points={zone.polygon}
                        fill="rgba(200, 0, 0, 1.0)"
                        stroke="none"
                        strokeWidth="0"
                        style={{ 
                          pointerEvents: (sessionStarted && !sessionPaused && !isMobilePhone) ? 'auto' : 'none',
                          cursor: (sessionStarted && !sessionPaused && !isMobilePhone) ? 'pointer' : 'not-allowed',
                          transition: 'fill 0.2s ease'
                        }}
                        clipPath={`url(#bottomRightTriangle-${zone.id})`}
                        onMouseEnter={(e) => {
                          if (sessionStarted && !sessionPaused && !isMobilePhone) {
                            e.target.style.fill = 'rgba(255, 0, 0, 1.0)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.fill = 'rgba(200, 0, 0, 1.0)';
                        }}
                        onClick={(e) => !isMobilePhone && handlePolygonClick(zone.id, false, e)}
                        title={sessionStarted ? 
                          (sessionPaused ? 'Resume session to shoot' : 
                          `${zone.label} - MISS (${zoneStats.made}/${zoneStats.attempts})`) : 
                          'Start session to shoot'}
                      />
                      
                      {/* Make section text - White zone abbreviation and make count */}
                      <text
                        x={zone.id.includes('corner') ? centerX : 
                          zone.id.includes('wing') ? 
                            (zone.id === 'left_wing' ? minX + (centerX - minX) * 0.6 : centerX + (maxX - centerX) * 0.4) :
                            minX + (centerX - minX) * 0.5}
                        y={zone.id.includes('corner') ? minY + (centerY - minY) * 0.5 :
                          zone.id.includes('wing') ? minY + (centerY - minY) * 0.6 :
                            centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="1.8"
                        fontWeight="bold"
                        fill="white"
                        style={{ 
                          pointerEvents: 'none'
                        }}
                      >
                        {zoneLetters[zone.id]}
                      </text>
                      <text
                        x={zone.id.includes('corner') ? centerX : 
                          zone.id.includes('wing') ? 
                            (zone.id === 'left_wing' ? minX + (centerX - minX) * 0.6 : centerX + (maxX - centerX) * 0.4) :
                            minX + (centerX - minX) * 0.5}
                        y={zone.id.includes('corner') ? minY + (centerY - minY) * 0.5 + 2.5 :
                          zone.id.includes('wing') ? minY + (centerY - minY) * 0.6 + 2.5 :
                            centerY + 2.5}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="1.2"
                        fontWeight="bold"
                        fill="white"
                        style={{ pointerEvents: 'none' }}
                      >
                        {zoneStats.made}
                      </text>
                      
                      {/* Miss section text - White zone abbreviation and miss count */}
                      <text
                        x={zone.id.includes('corner') ? centerX : 
                          zone.id.includes('wing') ? 
                            (zone.id === 'left_wing' ? centerX + (maxX - centerX) * 0.4 : minX + (centerX - minX) * 0.6) :
                            centerX + (maxX - centerX) * 0.5}
                        y={zone.id.includes('corner') ? centerY + (maxY - centerY) * 0.5 :
                          zone.id.includes('wing') ? centerY + (maxY - centerY) * 0.4 :
                            centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="1.8"
                        fontWeight="bold"
                        fill="white"
                        style={{ 
                          pointerEvents: 'none'
                        }}
                      >
                        {zoneLetters[zone.id]}
                      </text>
                      <text
                        x={zone.id.includes('corner') ? centerX : 
                          zone.id.includes('wing') ? 
                            (zone.id === 'left_wing' ? centerX + (maxX - centerX) * 0.4 : minX + (centerX - minX) * 0.6) :
                            centerX + (maxX - centerX) * 0.5}
                        y={zone.id.includes('corner') ? centerY + (maxY - centerY) * 0.5 + 2.5 :
                          zone.id.includes('wing') ? centerY + (maxY - centerY) * 0.4 + 2.5 :
                            centerY + 2.5}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="1.2"
                        fontWeight="bold"
                        fill="white"
                        style={{ pointerEvents: 'none' }}
                      >
                        {zoneStats.attempts - zoneStats.made}
                      </text>
                      
                      {/* Total shot counter on boundary line - Cavs yellow */}
                      <text
                        x={centerX}
                        y={zone.id.includes('corner') ? centerY :
                          zone.id.includes('wing') ? centerY :
                            centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="1.5"
                        fontWeight="bold"
                        fill="#FFB81C"
                        stroke="#000000"
                        strokeWidth="0.1"
                        style={{ pointerEvents: 'none' }}
                      >
                        {zoneStats.attempts}
                      </text>
                    </>
                  );
                })()}
                
                {/* Clip path definitions for each zone */}
                <defs>
                  <clipPath id={`topLeftTriangle-${zone.id}`}>
                    {(() => {
                      const points = zone.polygon.split(' ').map(p => {
                        const [x, y] = p.split(',').map(Number);
                        return { x, y };
                      });
                      
                      // Find bounding box
                      const minX = Math.min(...points.map(p => p.x));
                      const maxX = Math.max(...points.map(p => p.x));
                      const minY = Math.min(...points.map(p => p.y));
                      const maxY = Math.max(...points.map(p => p.y));
                      
                      const centerX = (minX + maxX) / 2;
                      const centerY = (minY + maxY) / 2;
                      
                      // Different sectional patterns based on zone type
                      if (zone.id.includes('corner')) {
                        // Horizontal split for corners
                        return (
                          <path
                            d={`M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${centerY} L ${minX} ${centerY} Z`}
                          />
                        );
                      } else if (zone.id.includes('wing')) {
                        // Diagonal split for wings (parallel to 3-point line)
                        if (zone.id === 'left_wing') {
                          // Left wing: diagonal from top-left to bottom-right
                          return (
                            <path
                              d={`M ${minX} ${minY} L ${maxX} ${minY} L ${minX + (maxX - minX) * 0.3} ${maxY} L ${minX} ${maxY} Z`}
                            />
                          );
                        } else {
                          // Right wing: diagonal from top-right to bottom-left
                          return (
                            <path
                              d={`M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${maxX - (maxX - minX) * 0.3} ${maxY} Z`}
                            />
                          );
                        }
                      } else {
                        // Vertical split for top of key
                        return (
                          <path
                            d={`M ${minX} ${minY} L ${centerX} ${minY} L ${centerX} ${maxY} L ${minX} ${maxY} Z`}
                          />
                        );
                      }
                    })()}
                  </clipPath>
                  
                  <clipPath id={`bottomRightTriangle-${zone.id}`}>
                    {(() => {
                      const points = zone.polygon.split(' ').map(p => {
                        const [x, y] = p.split(',').map(Number);
                        return { x, y };
                      });
                      
                      // Find bounding box
                      const minX = Math.min(...points.map(p => p.x));
                      const maxX = Math.max(...points.map(p => p.x));
                      const minY = Math.min(...points.map(p => p.y));
                      const maxY = Math.max(...points.map(p => p.y));
                      
                      const centerX = (minX + maxX) / 2;
                      const centerY = (minY + maxY) / 2;
                      
                      // Different sectional patterns based on zone type
                      if (zone.id.includes('corner')) {
                        // Horizontal split for corners
                        return (
                          <path
                            d={`M ${minX} ${centerY} L ${maxX} ${centerY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`}
                          />
                        );
                      } else if (zone.id.includes('wing')) {
                        // Diagonal split for wings (parallel to 3-point line)
                        if (zone.id === 'left_wing') {
                          // Left wing: diagonal from top-left to bottom-right
                          return (
                            <path
                              d={`M ${minX + (maxX - minX) * 0.3} ${maxY} L ${maxX} ${minY} L ${maxX} ${maxY} Z`}
                            />
                          );
                        } else {
                          // Right wing: diagonal from top-right to bottom-left
                          return (
                            <path
                              d={`M ${minX} ${minY} L ${maxX - (maxX - minX) * 0.3} ${maxY} L ${minX} ${maxY} Z`}
                            />
                          );
                        }
                      } else {
                        // Vertical split for top of key
                        return (
                          <path
                            d={`M ${centerX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${centerX} ${maxY} Z`}
                          />
                        );
                      }
                    })()}
                  </clipPath>
                </defs>
              </g>
            );
          })}
        </svg>

        {/* Zone labels and undo buttons - Always available on tablets */}
        {(!isEditorMode || isMobilePhone) && COURT_ZONES.map((zone) => {
          const zoneStats = stats[zone.id] || { made: 0, attempts: 0 };
          const hasShots = zoneStats.attempts > 0;
          
          return hasShots ? (
            <div 
              key={`${zone.id}-undo`}
              style={{
                position: 'absolute',
                ...zone.buttonPosition,
                transform: 'translate(-50%, -50%)',
                zIndex: 15
              }}
            >
              {/* Undo Button */}
              <button
                className="zone-button undo-button"
                onClick={() => onUndoZoneShot && onUndoZoneShot(zone.id)}
                title={`Undo last shot from ${zone.label}`}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#28a745',
                  color: '#6F263D',
                  border: '2px solid #FFB81C',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                UNDO
              </button>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
};

export default CourtTracker;
