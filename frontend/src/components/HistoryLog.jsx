import React, { useState, useRef } from 'react';
import './HistoryLog.css';

const HistoryLog = ({ shots, playerName = "Guest", sessionStartTime, totalPausedTime = 0 }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const scrollRef = useRef(null);

  const formatLocation = (location) => {
    const map = {
      left_corner: "L Corner",
      left_wing: "L Wing",
      top_key: "Top of Key",
      right_wing: "R Wing",
      right_corner: "R Corner",
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

  const scrollUp = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    }
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
            {shots.length > 5 && (
              <button className="scroll-button scroll-up" onClick={scrollUp}>
                ▲
              </button>
            )}
            <div className="log-scroll" ref={scrollRef}>
              {shots.slice().reverse().map((shot, index) => (
                <div key={shots.length - index - 1} className="log-entry">
                  <strong>{playerName}:</strong> Shot {shots.length - index} <span className={shot.made ? "shot-made" : "shot-missed"}>{shot.made ? "made" : "missed"}</span> from <i>{formatLocation(shot.location)}</i>
                  <span className="shot-timestamp">at {formatTime(shot)}</span>
                </div>
              ))}
            </div>
            {shots.length > 5 && (
              <button className="scroll-button scroll-down" onClick={scrollDown}>
                ▼
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryLog;
