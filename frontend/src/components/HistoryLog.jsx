/**
 * HISTORY LOG COMPONENT
 * 
 * Purpose: Real-time chronological display of shooting session activity
 * Context: Live session tracking with immediate shot recording feedback
 * 
 * Key Features:
 * 1. Chronological shot-by-shot session history
 * 2. Collapsible interface to save screen space
 * 3. Real-time updates as shots are recorded
 * 4. Touch-optimized scrolling for mobile devices
 * 5. Responsive layout adapting to device constraints
 * 6. iPhone-specific optimization for Safari browser quirks
 * 
 * Design Philosophy:
 * - Immediate feedback for shot recording confirmation
 * - Space-efficient interface that doesn't interfere with shooting
 * - Clear visual distinction between makes and misses
 * - Professional sports-style logging format
 * - Accessible on all device types with responsive behavior
 * 
 * User Experience:
 * - Expanded by default on iPhone (Safari URL bar compatibility)
 * - Collapsed by default on other devices (space preservation)
 * - Smooth scrolling to newest entries
 * - Clear shot identification with timestamps and locations
 */

import React, { useState, useRef } from 'react';
import './HistoryLog.css';

/**
 * HISTORY LOG COMPONENT: Live session activity tracking
 * 
 * Props:
 * @param {Array} shots - Array of shot objects from current session
 * @param {string} playerName - Name of current player (default: "Guest")
 * @param {Date} sessionStartTime - When shooting session began
 * @param {number} totalPausedTime - Total milliseconds spent in paused state
 * @param {Object} windowDimensions - Current window size for responsive behavior
 * @param {number} orientation - Device orientation for layout optimization
 * @param {boolean} isIPhoneLandscape - Specific iPhone landscape detection
 * @param {number} appRenderKey - Forces re-render when needed
 * 
 * State Management:
 * - Collapse state: Interface visibility control
 * - Scroll reference: Programmatic scrolling to newest entries
 * - Device detection: iPhone-specific UI optimizations
 */
const HistoryLog = ({ 
  shots, 
  playerName = "Guest", 
  sessionStartTime, 
  totalPausedTime = 0,
  windowDimensions,
  orientation,
  isIPhoneLandscape,
  appRenderKey
}) => {
  /**
   * DEVICE DETECTION: iPhone-specific behavior optimization
   * 
   * Why iPhone detection matters:
   * - Safari's address bar behavior affects viewport height
   * - iOS scrolling physics differ from other mobile browsers
   * - Touch interaction patterns unique to iPhone interface
   */
  const effectiveIsIPhone = isIPhoneLandscape !== undefined ? 
    /iPhone/i.test(navigator.userAgent) : 
    /iPhone/i.test(navigator.userAgent);
  
  /**
   * COLLAPSE STATE MANAGEMENT: Space-efficient interface control
   * 
   * Default State Strategy:
   * - iPhone: Expanded by default (Safari URL bar compatibility)
   * - Other devices: Collapsed by default (space preservation)
   * 
   * This ensures optimal user experience across different platforms
   * while maintaining accessibility to session history when needed
   */
  const [isCollapsed, setIsCollapsed] = useState(!effectiveIsIPhone); // Expanded by default on iPhone only
  const scrollRef = useRef(null);                                     // Reference for programmatic scrolling

  /**
   * LOCATION FORMATTING: Convert database IDs to user-friendly zone names
   * 
   * Mapping Strategy:
   * - Database uses snake_case IDs for consistency
   * - UI displays abbreviated, space-efficient labels
   * - Maintains basketball terminology familiar to users
   * 
   * @param {string} location - Database location identifier
   * @returns {string} User-friendly zone label
   */
  const formatLocation = (location) => {
    const map = {
      left_corner: "L Corner",      // Left corner three-point area
      left_wing: "L Wing",          // Left wing three-point area
      top_key: "Top of Key",        // Paint and free throw extended area
      right_wing: "R Wing",         // Right wing three-point area
      right_corner: "R Corner",     // Right corner three-point area
    };
    return map[location] || location;
  };

  const formatTime = (shot) => {
    // If the shot has a stored timer value, use that (new shots)
    if (shot.timerValue !== undefined) {
      const totalSeconds = Math.floor(shot.timerValue / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Fallback for old shots without timerValue (backwards compatibility)
    if (!sessionStartTime) return "00:00";
    
    const shotTime = new Date(shot.timestamp).getTime();
    const elapsedTime = Math.max(0, shotTime - sessionStartTime);
    
    // Convert to seconds
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Format as MM:SS
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`history-log ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="log-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2>Shot Log</h2>
        <button className="collapse-button">
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      
      {isCollapsed ? (
        // Show separator and latest shot when collapsed
        <>
          <div className="separator-line"></div>
          <div className="latest-shot">
            {shots.length > 0 ? (
              <div className="log-entry">
                <strong>{playerName}:</strong> Shot {shots.length} <span className={shots[shots.length - 1].made ? "shot-made" : "shot-missed"}>{shots[shots.length - 1].made ? "made" : "missed"}</span> from <i>{formatLocation(shots[shots.length - 1].location)}</i>
                <span className="shot-timestamp">at {formatTime(shots[shots.length - 1])}</span>
              </div>
            ) : (
              <div className="log-entry">No shots taken yet</div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="separator-line"></div>
          <div className="log-container">
            <div className="log-scroll" ref={scrollRef}>
              {shots.slice().reverse().map((shot, index) => (
                <div key={shots.length - index - 1} className="log-entry">
                  <strong>{playerName}:</strong> Shot {shots.length - index} <span className={shot.made ? "shot-made" : "shot-missed"}>{shot.made ? "made" : "missed"}</span> from <i>{formatLocation(shot.location)}</i>
                  <span className="shot-timestamp">at {formatTime(shot)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryLog;
