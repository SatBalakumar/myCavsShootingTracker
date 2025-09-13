import React, { useState } from 'react';
import './ZoneButtons.css';
import { getEasternTimeISO } from '../utils/timezone';

// ZoneButtons: Touch-friendly shooting interface with zone selection - Called from App.jsx renderContent()

const COURT_ZONES = [
  { id: 'left_corner', label: 'Left Corner', abbrev: 'LC' },
  { id: 'left_wing', label: 'Left Wing', abbrev: 'LW' },
  { id: 'top_key', label: 'Top of Key', abbrev: 'TK' },
  { id: 'right_wing', label: 'Right Wing', abbrev: 'RW' },
  { id: 'right_corner', label: 'Right Corner', abbrev: 'RC' },
];

const ZoneButtons = ({ 
  shots, 
  setShots, 
  currentPlayer, 
  onShot, 
  onUndoLastShot,
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
  // Currently selected zone index
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  
  const selectedZone = COURT_ZONES[selectedZoneIndex];

  if (!shots || !setShots || typeof setShots !== 'function') {
    return <div>Loading...</div>;
  }

  const calculateShotTime = (currentElapsedTime) => {
    try {
      if (lastUndoShotTime !== null && lastUndoShotTime !== undefined) {
        const undoTime = lastUndoShotTime;
        if (typeof setLastUndoShotTime === 'function') {
          setLastUndoShotTime(null);
        }
        return undoTime;
      }

      if (!sessionStarted || sessionPaused || currentElapsedTime <= 0) {
        return 0;
      }

      if (shots.length === 0) {
        return currentElapsedTime;
      }

      const lastShot = shots[shots.length - 1];
      const lastShotTime = lastShot.timerValue || lastShot.timeTakenForShot || 0;
      return currentElapsedTime - lastShotTime;
    } catch (error) {
      return 0;
    }
  };

  // handleShot: Records shot make/miss for current zone - Called by Make/Miss buttons
  const handleShot = (made) => {
    if (!sessionStarted || sessionPaused) {
      alert('Please start the session first!');
      return;
    }

    if (shots.length >= 100) {
      alert('Maximum of 100 shots reached!');
      return;
    }

    const timeTakenForShot = calculateShotTime(currentElapsedTime);
    
    const shotData = {
      location: selectedZone.id,
      made: made,
      timestamp: getEasternTimeISO(),
      timerValue: currentElapsedTime,
      timeTakenForShot: timeTakenForShot,
      sequenceNumber: shots.length + 1,
      player: currentPlayer
    };

    // Add shot to local state
    setShots(prevShots => [...prevShots, shotData]);

    // Call parent callback if provided
    if (typeof onShot === 'function') {
      onShot(shotData);
    }
  };

  // nextZone: Cycles to next shooting zone - Called by Next Zone button
  const nextZone = () => {
    setSelectedZoneIndex((prev) => (prev + 1) % COURT_ZONES.length);
  };

  // prevZone: Cycles to previous shooting zone - Called by Previous Zone button
  const prevZone = () => {
    setSelectedZoneIndex((prev) => (prev - 1 + COURT_ZONES.length) % COURT_ZONES.length);
  };

  const zoneShots = shots.filter(shot => shot.location === selectedZone.id);
  const zoneMade = zoneShots.filter(shot => shot.made).length;
  const zoneTotal = zoneShots.length;
  const zonePercentage = zoneTotal > 0 ? Math.round((zoneMade / zoneTotal) * 100) : 0;

  // Overall session stats
  const totalMade = shots.filter(shot => shot.made).length;
  const totalShots = shots.length;
  const overallPercentage = totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : 0;

  return (
    <div className="zone-buttons-container">
      {/* Session Statistics */}
      <div className="session-stats">
        <span className="stat-label">Session:</span>
        <span className="stat-value">{totalMade}/{totalShots} ({overallPercentage}%)</span>
      </div>

      {/* Zone Carousel */}
      <div className="zone-carousel">
        <button className="carousel-nav prev" onClick={prevZone} aria-label="Previous zone">
          ‹
        </button>
        
        <div className="zone-display">
          <h2 className="zone-name">{selectedZone.label}</h2>
          <div className="zone-stats">
            {zoneMade}/{zoneTotal} ({zonePercentage}%)
          </div>
        </div>
        
        <button className="carousel-nav next" onClick={nextZone} aria-label="Next zone">
          ›
        </button>
      </div>

      {/* Zone Indicator Dots */}
      <div className="zone-indicators">
        {COURT_ZONES.map((zone, index) => (
          <button
            key={zone.id}
            className={`zone-dot ${index === selectedZoneIndex ? 'active' : ''}`}
            onClick={() => setSelectedZoneIndex(index)}
            aria-label={zone.label}
          >
            {zone.abbrev}
          </button>
        ))}
      </div>

      {/* Single Make/Miss Buttons */}
      <div className="shot-buttons">
        <button 
          className="shot-button miss-button"
          onClick={() => handleShot(false)}
          disabled={!sessionStarted || sessionPaused}
        >
          <span className="button-icon">✗</span>
          <span className="button-text">MISS</span>
        </button>
        
        <button 
          className="shot-button make-button"
          onClick={() => handleShot(true)}
          disabled={!sessionStarted || sessionPaused}
        >
          <span className="button-icon">✓</span>
          <span className="button-text">MAKE</span>
        </button>
      </div>

      {/* Session Status Warning */}
      {(!sessionStarted || sessionPaused) && (
        <div className="session-warning">
          {!sessionStarted ? 'Start session to begin tracking shots' : 'Session paused - resume to continue'}
        </div>
      )}
    </div>
  );
};

export default ZoneButtons;
