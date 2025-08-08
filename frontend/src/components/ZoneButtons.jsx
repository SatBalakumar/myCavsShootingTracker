import React from 'react';
import './ZoneButtons.css';
import { getEasternTimeISO } from '../utils/timezone';

const COURT_ZONES = [
  { id: 'left_corner', label: 'Left Corner' },
  { id: 'left_wing', label: 'Left Wing' },
  { id: 'top_key', label: 'Top of Key' },
  { id: 'right_wing', label: 'Right Wing' },
  { id: 'right_corner', label: 'Right Corner' },
];

// Helper function to format numbers with leading zeros (always 2 digits)
const formatStatNumber = (num) => {
  return num.toString().padStart(2, '0');
};

const ZoneButtons = ({ 
  shots, 
  setShots, 
  currentPlayer, 
  onShot, 
  onUndoLastShot, // Changed from onUndoZoneShot to onUndoLastShot
  sessionStarted, 
  sessionPaused, 
  currentElapsedTime,
  windowDimensions,
  orientation,
  isIPhoneLandscape,
  appRenderKey,
  isReversed,
  lastUndoShotTime,
  setLastUndoShotTime,
  setIsReversed
}) => {
  // Add safety checks for props
  if (!shots || !setShots || typeof setShots !== 'function') {
    console.error('ZoneButtons: Missing required props (shots, setShots)');
    return <div>Loading...</div>;
  }

  // Use orientation data from App component if available, fallback to local detection
  const effectiveWindowDimensions = windowDimensions || {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  const effectiveIsIPhoneLandscape = isIPhoneLandscape || (() => {
    return /iPhone/i.test(navigator.userAgent) && 
           effectiveWindowDimensions.height < effectiveWindowDimensions.width && 
           effectiveWindowDimensions.height <= 500;
  });

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

  // Get zones in the desired order
  const displayZones = isReversed ? [...COURT_ZONES].reverse() : COURT_ZONES;

  try {
    return (
      <div 
        className="zone-buttons-container" 
        style={{
        ...(effectiveIsIPhoneLandscape && {
          gap: '0.2rem',
          padding: '0.2rem'
        })
      }}
    >
      <h3 className="zone-buttons-title" style={{
        ...(effectiveIsIPhoneLandscape && {
          fontSize: '0.9rem',
          margin: '0',
          padding: '0.1rem 0'
        })
      }}>Zone Shooting</h3>
      <div className="zone-buttons-list" style={{
        ...(effectiveIsIPhoneLandscape && {
          gap: '0.3rem'
        })
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          width: '100%', 
          marginBottom: effectiveIsIPhoneLandscape ? '0.1rem' : '0.5rem'
        }}>
          <button
            onClick={() => setIsReversed(!isReversed)}
            style={{
              width: effectiveIsIPhoneLandscape ? '28px' : '32px',
              height: effectiveIsIPhoneLandscape ? '28px' : '32px',
              backgroundColor: '#6F263D',
              color: '#FFB81C',
              border: '2px solid #FFB81C',
              borderRadius: '6px',
              fontSize: effectiveIsIPhoneLandscape ? '12px' : '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#8B3A5C';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#6F263D';
              e.target.style.transform = 'scale(1)';
            }}
            title={isReversed ? 'Switch to normal order (LC→RC)' : 'Reverse zone order (RC→LC)'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2L7 6H5v4H3V6H1L3 2z" />
              <path d="M13 14L9 10h2V6h2v4h2l-2 4z" />
            </svg>
          </button>
        </div>
        {displayZones.map((zone) => {
          const zoneStats = stats[zone.id] || { made: 0, attempts: 0 };
          const hasShots = zoneStats.attempts > 0;
          
          return (
            <div key={zone.id} className="zone-button-row" style={{
              ...(effectiveIsIPhoneLandscape && {
                padding: '0.25rem 0.3rem',
                minHeight: '38px'
              })
            }}>
              <div className="zone-info">
                <span className="zone-name" style={{
                  ...(effectiveIsIPhoneLandscape && {
                    fontSize: '0.75rem',
                    minWidth: '90px'
                  })
                }}>{zone.label}:</span>
                <span className="zone-counter-badge" style={{
                  backgroundColor: zoneStats.attempts >= 20 ? '#28a745' : '#6F263D',
                  color: zoneStats.attempts >= 20 ? 'white' : '#FFB81C',
                  padding: effectiveIsIPhoneLandscape ? '1px 5px' : '3px 8px',
                  borderRadius: '4px',
                  fontSize: effectiveIsIPhoneLandscape ? '0.65rem' : '0.8rem',
                  fontWeight: 'bold',
                  border: 'none',
                  marginLeft: '3px',
                  marginRight: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 'fit-content'
                }}>
                  {formatStatNumber(zoneStats.made)}/{formatStatNumber(zoneStats.attempts)}
                </span>
              </div>
              <div className="button-group" style={{
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                justifyContent: 'flex-end'
              }}>
                {/* Individual zone undo buttons removed - using global undo instead */}
                <button
                  className="zone-action-button make-button"
                  onClick={() => handleZoneClick(zone.id, true)}
                  disabled={!sessionStarted || sessionPaused}
                  title={sessionStarted ? (sessionPaused ? 'Resume session to shoot' : `Make shot from ${zone.label} (${formatStatNumber(zoneStats.made)}/${formatStatNumber(zoneStats.attempts)})`) : 'Start session to shoot'}
                  style={{
                    opacity: (sessionStarted && !sessionPaused) ? 1 : 0.5,
                    cursor: (sessionStarted && !sessionPaused) ? 'pointer' : 'not-allowed',
                    ...(effectiveIsIPhoneLandscape && {
                      padding: '0.25rem 0.7rem',
                      fontSize: '0.7rem',
                      width: '50px'
                    })
                  }}
                >
                  Make
                </button>
                <button
                  className="zone-action-button miss-button"
                  onClick={() => handleZoneClick(zone.id, false)}
                  disabled={!sessionStarted || sessionPaused}
                  title={sessionStarted ? (sessionPaused ? 'Resume session to shoot' : `Miss shot from ${zone.label} (${formatStatNumber(zoneStats.made)}/${formatStatNumber(zoneStats.attempts)})`) : 'Start session to shoot'}
                  style={{
                    opacity: (sessionStarted && !sessionPaused) ? 1 : 0.5,
                    cursor: (sessionStarted && !sessionPaused) ? 'pointer' : 'not-allowed',
                    ...(effectiveIsIPhoneLandscape && {
                      padding: '0.25rem 0.7rem',
                      fontSize: '0.7rem',
                      width: '50px'
                    })
                  }}
                >
                  Miss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  } catch (error) {
    console.error('ZoneButtons render error:', error);
    return <div>Error loading zone buttons. Please try refreshing the page.</div>;
  }
};

export default ZoneButtons;
