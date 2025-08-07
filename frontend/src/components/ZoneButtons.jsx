import React from 'react';
import './ZoneButtons.css';

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

const ZoneButtons = ({ shots, setShots, currentPlayer, onShot, onUndoZoneShot, sessionStarted, sessionPaused, currentElapsedTime }) => {
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
      player: currentPlayer,
      timerValue: currentElapsedTime // Store what the timer showed when shot was taken
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
    <div className="zone-buttons-container">
      <h3 className="zone-buttons-title">Zone Shooting</h3>
      <div className="zone-buttons-list">
        {COURT_ZONES.map((zone) => {
          const zoneStats = stats[zone.id] || { made: 0, attempts: 0 };
          const hasShots = zoneStats.attempts > 0;
          
          return (
            <div key={zone.id} className="zone-button-row">
              <div className="zone-info">
                <span className="zone-name">{zone.label}:</span>
                <span className="zone-counter-badge" style={{
                  backgroundColor: zoneStats.attempts >= 20 ? '#28a745' : '#6F263D',
                  color: zoneStats.attempts >= 20 ? 'white' : '#FFB81C',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
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
                {/* Undo Button - positioned to the left of make button with CSS styling */}
                {hasShots && (
                  <button
                    className="zone-action-button undo-button"
                    onClick={() => onUndoZoneShot && onUndoZoneShot(zone.id)}
                    title={`Undo last shot from ${zone.label}`}
                  >
                    ↶
                  </button>
                )}
                <button
                  className="zone-action-button make-button"
                  onClick={() => handleZoneClick(zone.id, true)}
                  disabled={!sessionStarted || sessionPaused}
                  title={sessionStarted ? (sessionPaused ? 'Resume session to shoot' : `Make shot from ${zone.label} (${formatStatNumber(zoneStats.made)}/${formatStatNumber(zoneStats.attempts)})`) : 'Start session to shoot'}
                  style={{
                    opacity: (sessionStarted && !sessionPaused) ? 1 : 0.5,
                    cursor: (sessionStarted && !sessionPaused) ? 'pointer' : 'not-allowed'
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
                    cursor: (sessionStarted && !sessionPaused) ? 'pointer' : 'not-allowed'
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
};

export default ZoneButtons;
