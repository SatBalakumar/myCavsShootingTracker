import React, { useState, useLayoutEffect, useCallback } from 'react';
import HomePage from './components/HomePage';
import PlayerSelection from './components/PlayerSelection';
import CourtTracker from './components/CourtTracker';
import ZoneButtons from './components/ZoneButtons';
import HistoryLog from './components/HistoryLog';
import ShootingStatistics from './components/ShootingStatistics';
import DownloadResults from './components/DownloadResults';
import { AppBar, Toolbar, Box, Typography } from '@mui/material';
import { shootingSessionManager } from './firebase/sessionManager';
import { getEasternTimeISO } from './utils/timezone';
import { addCavsRoster } from './utils/addRoster';

// Make addCavsRoster available globally for console use
window.addCavsRoster = addCavsRoster;

function App() {
  const [shots, setShots] = useState([]);
  const [lastUndoShotTime, setLastUndoShotTime] = useState(null); // Store time for undone shot
  const [isMapMode, setIsMapMode] = useState(true);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'playerSelection', 'shootingTest'
  const [selectedPlayer, setSelectedPlayer] = useState(null); // Changed to object
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [showDiscardConfirmDialog, setShowDiscardConfirmDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [lastPauseTime, setLastPauseTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Zone order state (persists through orientation changes)
  const [isReversed, setIsReversed] = useState(false);
  
  // Global orientation and window dimension state
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [orientation, setOrientation] = useState(window.orientation || 0);
  const [appRenderKey, setAppRenderKey] = useState(0); // Force app-wide re-renders
  
  // Firebase session management
  const [currentFirebaseSession, setCurrentFirebaseSession] = useState(null);
  const [firebaseSessionError, setFirebaseSessionError] = useState(null);

  // State to track coach actions locally for CSV export
  const [coachActions, setCoachActions] = useState([]);

  // Function to log coach actions locally
  const logCoachAction = (actionType, additionalData = {}) => {
    const coachAction = {
      actionType,
      timestamp: getEasternTimeISO(),
      elapsedTime: elapsedTime,
      sequenceNumber: shots.length + coachActions.length + 1,
      ...additionalData
    };
    setCoachActions(prev => [...prev, coachAction]);
    console.log('Coach action logged:', coachAction);
  };

  // Enhanced device detection using dynamic window dimensions
  const isMobilePhone = useCallback(() => {
    return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && 
           !/iPad|tablet/i.test(navigator.userAgent) && 
           windowDimensions.width <= 480;
  }, [windowDimensions]);

  const isMobileDevice = useCallback(() => {
    // Only detect actual mobile/tablet devices, not just small desktop windows
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|tablet/i.test(navigator.userAgent) || 
           (/Mobi|Android/i.test(navigator.userAgent)) || 
           (('ontouchstart' in window) && windowDimensions.width <= 768); // Only mobile if touch AND small screen
  }, [windowDimensions]);

  const isIPhoneLandscape = useCallback(() => {
    return /iPhone/i.test(navigator.userAgent) && 
           windowDimensions.height < windowDimensions.width && 
           windowDimensions.height <= 500;
  }, [windowDimensions]);

  // Global orientation change handlers
  const handleResize = useCallback(() => {
    const newDimensions = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    console.log('App: Resize detected', newDimensions); // Debug log
    setWindowDimensions(newDimensions);
    setAppRenderKey(prev => prev + 1); // Force app-wide re-render
  }, []);

  const handleOrientationChange = useCallback(() => {
    setTimeout(() => {
      const newDimensions = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      console.log('App: Orientation changed', newDimensions); // Debug log
      setOrientation(window.orientation || 0);
      setWindowDimensions(newDimensions);
      setAppRenderKey(prev => prev + 1); // Force app-wide re-render
    }, 150); // Allow viewport to settle
  }, []);

  // Set up global orientation listeners
  useLayoutEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // iOS Safari visual viewport support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [handleResize, handleOrientationChange]);

  // Force Zone Buttons mode on mobile phones
  React.useEffect(() => {
    if (isMobilePhone() && isMapMode) {
      setIsMapMode(false);
    }
  }, [isMobilePhone, isMapMode, windowDimensions]);

  // Force Zone Buttons mode on mobile devices (including tablets) since they can't access court mode
  React.useEffect(() => {
    if (isMobileDevice() && isMapMode) {
      setIsMapMode(false);
    }
  }, [isMobileDevice, isMapMode, windowDimensions]);

  // Timer effect
  React.useEffect(() => {
    let interval = null;
    if (sessionStarted && !sessionPaused && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime - totalPausedTime);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [sessionStarted, sessionPaused, startTime, totalPausedTime]);

  // Auto-complete session when 100 shots are reached
  React.useEffect(() => {
    if (sessionStarted && shots.length === 100) {
      console.log('100 shots reached, auto-completing session');
      handleEndSession();
    }
  }, [shots.length, sessionStarted]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartNewTest = () => {
    setCurrentPage('playerSelection');
  };

  const handleDownloadResults = () => {
    // Navigate to download search interface
    setCurrentPage('downloadResults');
  };

  const handleBackToHomeFromDownload = () => {
    setCurrentPage('home');
  };

  const handleDownloadAuditLog = () => {
    // Download complete session audit log with coach actions
    if (shots.length === 0) {
      alert('No shooting session data available to download. Please complete a shooting test first.');
      return;
    }
    
    if (!selectedPlayer) {
      alert('No player selected. Please ensure you have completed a shooting test.');
      return;
    }
    
    downloadSessionReport('audit');
  };

  const generateAnalyticsReport = () => {
    // ANALYTICS MODE - Clean shot data only, no coach actions
    // This is what analytics teams want - just the final shots after all undos
    const logID = currentFirebaseSession?.logID || `session_${Date.now()}`;
    const playerID = selectedPlayer?.id || selectedPlayer?.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown_player';
    
    const csvContent = [
      // Header row - simplified for analytics
      ['playerID', 'logID', 'shot_result', 'shot_zone', 'time_taken', 'timestamp', 'sequence_number'],
      
      // Only player shots - no coach actions, no action_type column needed
      ...shots.map((shot, index) => [
        playerID,
        logID,
        shot.made ? 'made' : 'missed', // shot_result
        shot.location, // shot_zone
        shot.timeTakenForShot || shot.timerValue || 0, // time_taken (prefer new timing method)
        shot.timestamp, // timestamp
        index + 1 // sequence_number
      ])
    ];

    return csvContent.map(row => row.join(',')).join('\n');
  };

  const generateSessionReport = () => {
    // AUDIT MODE - Complete session log with both player actions and coach actions
    // Generate a unique session ID if we don't have a Firebase session
    const logID = currentFirebaseSession?.logID || `session_${Date.now()}`;
    const playerID = selectedPlayer?.id || selectedPlayer?.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown_player';
    
    // Create comprehensive CSV with both player actions (shots) and coach actions (session events)
    const csvContent = [
      // Header row with enhanced columns to separate player vs coach actions
      ['playerID', 'logID', 'action_type', 'event_type', 'shot_result', 'shot_zone', 'time_taken', 'timestamp', 'sequence_number'],
      
      // Player Actions (Shots) - marked as 'player' action_type
      ...shots.map((shot, index) => [
        playerID,
        logID,
        'player', // action_type
        shot.made ? 'shot_made' : 'shot_missed', // event_type
        shot.made ? 'made' : 'missed', // shot_result (for compatibility)
        shot.location, // shot_zone
        shot.timeTakenForShot || shot.timerValue || 0, // time_taken (prefer new timing method)
        shot.timestamp, // timestamp
        index + 1 // sequence_number
      ]),
      
      // Coach Actions (Session Events) - marked as 'coach' action_type
      // Include all tracked coach actions from the session
      ...coachActions.map((action, index) => [
        playerID,
        logID,
        'coach', // action_type
        action.actionType, // event_type (e.g., 'shot_undo_left_corner', 'session_pause', etc.)
        '', // shot_result (N/A for coach actions)
        action.zoneId || '', // shot_zone (populated for undo actions, empty for session events)
        action.elapsedTime || 0, // time_taken
        action.timestamp, // timestamp
        action.sequenceNumber || (shots.length + index + 1) // sequence_number
      ]),
      
      // Add basic session lifecycle events if not already tracked
      [
        playerID,
        logID,
        'coach', // action_type
        'session_start', // event_type
        '', // shot_result (N/A for coach actions)
        '', // shot_zone (N/A for coach actions)
        0, // time_taken (session start)
        startTime ? new Date(startTime).toISOString() : getEasternTimeISO(), // timestamp
        0 // sequence_number (session start)
      ],
      
      // Add session end event
      [
        playerID,
        logID,
        'coach', // action_type
        'session_end', // event_type
        '', // shot_result (N/A)
        '', // shot_zone (N/A)
        elapsedTime || 0, // time_taken (total session time)
        getEasternTimeISO(), // timestamp (current time)
        shots.length + coachActions.length + 1 // sequence_number (after all events)
      ]
    ];

    return csvContent.map(row => row.join(',')).join('\n');
  };

  const downloadSessionReport = (mode = 'analytics') => {
    if (shots.length === 0) {
      alert('No shots taken yet. Cannot generate report.');
      return;
    }

    try {
      let csvContent;
      let filename;
      
      if (mode === 'analytics') {
        // Clean data for analytics - shots only, no coach actions
        csvContent = generateAnalyticsReport();
        filename = `analytics_${selectedPlayer?.name || 'player'}_${getEasternTimeISO().slice(0, 10)}.csv`;
      } else {
        // Complete audit trail with coach actions
        csvContent = generateSessionReport();
        filename = `session_audit_${selectedPlayer?.name || 'player'}_${getEasternTimeISO().slice(0, 10)}.csv`;
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`Shooting data exported: ${filename}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handlePlayerSelected = (playerObject) => {
    console.log('Player selected:', playerObject); // Debug log
    setSelectedPlayer(playerObject); // Now receives full player object
    setShots([]); // Reset shots for new test
    setSessionStarted(false);
    setStartTime(null);
    setElapsedTime(0);
    setCurrentPage('shootingTest');
    
    // Clear any previous Firebase errors when starting fresh
    setFirebaseSessionError(null);
    setCurrentFirebaseSession(null);
    console.log('Navigating to shooting test page'); // Debug log
  };

  const handleStartSession = async () => {
    try {
      setFirebaseSessionError(null);
      
      // Check if this is a guest session - if so, skip Firebase entirely
      if (selectedPlayer?.isGuest) {
        console.log('Starting guest session - skipping Firebase');
        setCurrentFirebaseSession(null);
      } else {
        // Start Firebase session for regular players only
        console.log('Starting Firebase session for player:', selectedPlayer);
        const firebaseSession = await shootingSessionManager.startShootingSession(selectedPlayer.id);
        setCurrentFirebaseSession(firebaseSession);
        console.log('Session started successfully:', firebaseSession);
      }
      
      // Start local session tracking (for both guest and regular players)
      setSessionStarted(true);
      setSessionPaused(false);
      setStartTime(Date.now());
      setTotalPausedTime(0);
      setLastPauseTime(null);
      setElapsedTime(0);
      
      // Log coach action
      logCoachAction('session_start', { 
        playerName: selectedPlayer?.name,
        sessionType: selectedPlayer?.isGuest ? 'guest' : 'regular'
      });
      
    } catch (error) {
      console.error('Error starting session:', error);
      setFirebaseSessionError(`Failed to start session: ${error.message}`);
      
      // Still allow local session to start even if Firebase fails
      setSessionStarted(true);
      setSessionPaused(false);
      setStartTime(Date.now());
      setTotalPausedTime(0);
      setLastPauseTime(null);
      setElapsedTime(0);
    }
  };

  const handlePauseSession = async () => {
    try {
      if (sessionPaused) {
        // Resume - add the time we were paused to total paused time
        const pauseDuration = Date.now() - lastPauseTime;
        setTotalPausedTime(prev => prev + pauseDuration);
        setSessionPaused(false);
        setLastPauseTime(null);
        
        // Log coach action
        logCoachAction('session_resume', { 
          pauseDuration: pauseDuration 
        });
        
        // Log resume event in Firebase
        if (currentFirebaseSession) {
          await shootingSessionManager.resumeSession(currentFirebaseSession, totalPausedTime + pauseDuration);
        }
      } else {
        // Pause - record when we paused
        setSessionPaused(true);
        setLastPauseTime(Date.now());
        
        // Log coach action
        logCoachAction('session_pause');
        
        // Log pause event in Firebase
        if (currentFirebaseSession) {
          await shootingSessionManager.pauseSession(currentFirebaseSession);
        }
      }
    } catch (error) {
      console.error('Error logging pause/resume event:', error);
      setFirebaseSessionError(`Failed to log session event: ${error.message}`);
    }
  };

  const handleResetShots = () => {
    setShowResetDialog(true);
  };

  const handleConfirmReset = async () => {
    try {
      // End Firebase session if active
      if (currentFirebaseSession) {
        console.log('Ending Firebase session...');
        
        // Calculate final stats for the session
        const finalStats = {
          totalShots: shots.length,
          totalMade: shots.filter(shot => shot.made).length,
          totalMissed: shots.filter(shot => !shot.made).length,
          accuracy: shots.length > 0 ? (shots.filter(shot => shot.made).length / shots.length) : 0
        };
        
        await shootingSessionManager.endShootingSession(currentFirebaseSession, finalStats);
        setCurrentFirebaseSession(null);
        console.log('Firebase session ended successfully');
      }
    } catch (error) {
      console.error('Error ending Firebase session:', error);
      setFirebaseSessionError(`Failed to end session: ${error.message}`);
    }
    
    // Reset all shot data
    setShots([]);
    
    // Reset session state
    setSessionStarted(false);
    setSessionPaused(false);
    
    // Reset timer data
    setStartTime(null);
    setTotalPausedTime(0);
    setLastPauseTime(null);
    setElapsedTime(0);
    
    // Reset Firebase state
    setCurrentFirebaseSession(null);
    setFirebaseSessionError(null);
    
    // Close the dialog
    setShowResetDialog(false);
  };

  const handleCancelReset = () => {
    setShowResetDialog(false);
  };

  const handleShot = async (newShot) => {
    try {
      // Record shot in Firebase if session is active
      if (currentFirebaseSession) {
        console.log('Recording shot in Firebase:', newShot);
        await shootingSessionManager.recordShot(currentFirebaseSession, {
          location: newShot.location,
          made: newShot.made,
          timeTaken: elapsedTime,
          sequenceNumber: shots.length + 1
        });
        console.log('Shot recorded successfully in Firebase');
      }
    } catch (error) {
      console.error('Error recording shot in Firebase:', error);
      setFirebaseSessionError(`Failed to record shot: ${error.message}`);
      // Continue with local shot recording even if Firebase fails
    }
    
    // This function can be used for any additional shot processing if needed
    // The actual shot adding is handled in the individual components
  };

  const handleUndoLastShot = async () => {
    // Single undo button - undoes the most recent shot regardless of zone
    if (shots.length === 0) {
      console.log('No shots to undo');
      return;
    }
    
    const lastShot = shots[shots.length - 1];
    const previousShotTime = shots.length > 1 ? shots[shots.length - 2].timerValue : 0;
    const timeTakenForShot = lastShot.timerValue - previousShotTime;
    
    // Store the time it took for this shot so we can reuse it
    setLastUndoShotTime(timeTakenForShot);
    
    // Log coach action with the specific zone
    logCoachAction(`shot_undo_${lastShot.location}`, { 
      zoneId: lastShot.location,
      shotResult: lastShot.made ? 'made' : 'missed',
      originalSequenceNumber: lastShot.sequenceNumber,
      timeTakenForShot: timeTakenForShot
    });
    
    // Remove the last shot
    const newShots = [...shots];
    newShots.pop();
    setShots(newShots);
    
    // Attempt Firebase undo
    try {
      if (currentFirebaseSession && sessionStarted) {
        console.log('Attempting to undo last shot in Firebase for zone:', lastShot.location);
        const undoResult = await shootingSessionManager.undoLastShot(currentFirebaseSession, lastShot.location);
        
        if (undoResult) {
          console.log('Shot undone successfully in Firebase:', undoResult);
        } else {
          console.log('No shots found in Firebase for zone:', lastShot.location, '(local undo still completed)');
        }
      }
    } catch (error) {
      console.error('Error undoing shot in Firebase:', error);
      setFirebaseSessionError(`Failed to undo shot in Firebase: ${error.message}`);
      setTimeout(() => setFirebaseSessionError(null), 5000);
    }
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setSelectedPlayer(null); // Reset to null
    setShots([]);
    setSessionStarted(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const handleExitRequest = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    handleBackToHome();
  };

  const handleCancelExit = () => {
    setShowExitDialog(false);
  };

  // Function to calculate zone review statistics
  const calculateZoneReview = () => {
    const zones = {
      left_corner: { name: 'Left Corner', made: 0, attempts: 0, timeSpent: 0, shots: [] },
      left_wing: { name: 'Left Wing', made: 0, attempts: 0, timeSpent: 0, shots: [] },
      top_key: { name: 'Top of Key', made: 0, attempts: 0, timeSpent: 0, shots: [] },
      right_wing: { name: 'Right Wing', made: 0, attempts: 0, timeSpent: 0, shots: [] },
      right_corner: { name: 'Right Corner', made: 0, attempts: 0, timeSpent: 0, shots: [] }
    };

    // Group shots by zone and collect timestamps
    shots.forEach((shot, index) => {
      const zone = zones[shot.location];
      if (zone) {
        zone.attempts++;
        if (shot.made) zone.made++;
        zone.shots.push({
          index,
          timerValue: shot.timerValue || 0,
          timestamp: shot.timestamp
        });
      }
    });

    // Calculate time spent in each zone
    Object.keys(zones).forEach(zoneId => {
      const zone = zones[zoneId];
      if (zone.shots.length > 0) {
        // Sort shots by timer value to get chronological order
        zone.shots.sort((a, b) => a.timerValue - b.timerValue);
        
        if (zone.shots.length === 1) {
          // If only one shot, estimate 5 seconds spent in zone
          zone.timeSpent = 5000;
        } else {
          // Calculate time from first to last shot in zone, plus buffer time
          const firstShot = zone.shots[0].timerValue;
          const lastShot = zone.shots[zone.shots.length - 1].timerValue;
          zone.timeSpent = Math.max(5000, lastShot - firstShot + 3000); // Add 3 seconds buffer
        }
      }
      zone.percentage = zone.attempts > 0 ? Math.round((zone.made / zone.attempts) * 100) : 0;
    });

    return zones;
  };

  const handleEndSession = () => {
    // Stop the session and timer immediately when End is pressed
    setSessionStarted(false);
    setSessionPaused(false);
    
    // Log coach action
    logCoachAction('session_end', { 
      totalShots: shots.length,
      sessionDuration: elapsedTime 
    });
    
    setShowEndSessionDialog(true);
  };

  const handleSaveResults = () => {
    setShowEndSessionDialog(false);
    
    // Check if this is a guest session
    if (selectedPlayer?.isGuest) {
      // For guest sessions, skip saving and go directly to review
      setShowReviewDialog(true);
      return;
    }
    
    // For regular players, show saving dialog and save to Firebase
    setShowSaveDialog(true);
    
    // Simulate saving process
    setTimeout(() => {
      setShowSaveDialog(false);
      setShowReviewDialog(true); // Show review instead of results
    }, 2000);
  };

  const handleCloseReview = () => {
    setShowReviewDialog(false);
    
    // For guest sessions, go back to home instead of showing results
    if (selectedPlayer?.isGuest) {
      handleBackToHome();
    } else {
      setShowResultsDialog(true); // Then show regular results
    }
  };

  const handleDiscardRequest = () => {
    // Show confirmation dialog first
    setShowDiscardConfirmDialog(true);
  };

  const handleConfirmDiscard = async () => {
    try {
      // If there's a Firebase session active, discard it completely
      if (currentFirebaseSession && !selectedPlayer?.isGuest) {
        console.log('Discarding Firebase session...');
        await shootingSessionManager.discardSession(currentFirebaseSession);
        console.log('Firebase session discarded successfully');
      }
      
      // Reset all local state
      setCurrentFirebaseSession(null);
      setFirebaseSessionError(null);
      setShowEndSessionDialog(false);
      setShowDiscardConfirmDialog(false);
      setShots([]);
      handleBackToHome();
    } catch (error) {
      console.error('Error discarding session:', error);
      // Still proceed with local cleanup even if Firebase cleanup fails
      setCurrentFirebaseSession(null);
      setFirebaseSessionError(null);
      setShowEndSessionDialog(false);
      setShowDiscardConfirmDialog(false);
      setShots([]);
      handleBackToHome();
    }
  };

  const handleCancelDiscard = () => {
    // Go back to the end session dialog
    setShowDiscardConfirmDialog(false);
    // showEndSessionDialog should remain true to go back to save/discard options
  };

  const handleDiscardResults = async () => {
    try {
      // If there's a Firebase session active, discard it completely
      if (currentFirebaseSession && !selectedPlayer?.isGuest) {
        console.log('Discarding Firebase session...');
        await shootingSessionManager.discardSession(currentFirebaseSession);
        console.log('Firebase session discarded successfully');
      }
      
      // Reset all local state
      setCurrentFirebaseSession(null);
      setFirebaseSessionError(null);
      setShowEndSessionDialog(false);
      setShots([]);
      handleBackToHome();
    } catch (error) {
      console.error('Error discarding session:', error);
      // Still proceed with local cleanup even if Firebase cleanup fails
      setCurrentFirebaseSession(null);
      setFirebaseSessionError(null);
      setShowEndSessionDialog(false);
      setShots([]);
      handleBackToHome();
    }
  };

  const handleDownloadFromResults = () => {
    downloadSessionReport();
    setShowResultsDialog(false);
    handleBackToHome();
  };

  const handleBackToHomeFromResults = () => {
    setShowResultsDialog(false);
    handleBackToHome();
  };

  const renderContent = () => {
    console.log('Rendering page:', currentPage, 'Selected player:', selectedPlayer); // Debug log
    
    switch (currentPage) {
      case 'home':
        return (
          <HomePage 
            onStartNewTest={handleStartNewTest}
            onDownloadResults={handleDownloadResults}
          />
        );
      
      case 'downloadResults':
        return (
          <DownloadResults 
            onBackToHome={handleBackToHomeFromDownload}
            shootingSessionManager={shootingSessionManager}
            downloadSessionReport={downloadSessionReport}
          />
        );
      
      case 'playerSelection':
        return (
          <PlayerSelection 
            onPlayerSelected={handlePlayerSelected}
            onBackToHome={handleBackToHome}
          />
        );
      
      case 'shootingTest':
        return (
          <div style={{ 
            width: '100%', 
            height: '100%',
            maxWidth: '100vw', 
            maxHeight: '100%',
            padding: '0 0.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowX: 'hidden',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}>
            {/* Top Navigation Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '0.25rem 0.25rem',
              margin: '0'
            }}>
              {/* Exit Button - Left aligned */}
              <button 
                onClick={handleExitRequest}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  border: '2px solid #FFB81C',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: '#6F263D',
                  color: '#FFB81C',
                  minWidth: '80px',
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                Exit
              </button>

              {/* Shot Counter & Undo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  color: '#FFB81C',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textAlign: 'center'
                }}>
                  Shot {shots.length}/100
                </div>
                
                {/* Global Undo Button - Undoes last shot regardless of zone */}
                <button 
                  onClick={handleUndoLastShot}
                  disabled={shots.length === 0}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    border: '2px solid #FFB81C',
                    borderRadius: '6px',
                    cursor: shots.length === 0 ? 'not-allowed' : 'pointer',
                    backgroundColor: shots.length === 0 ? '#555' : '#DC3545',
                    color: shots.length === 0 ? '#888' : '#FFB81C',
                    opacity: shots.length === 0 ? 0.5 : 1,
                    minWidth: '80px',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  Undo
                </button>
                
                <button 
                  onClick={handleResetShots}
                  disabled={shots.length === 0}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    border: '2px solid #FFB81C',
                    borderRadius: '6px',
                    cursor: shots.length === 0 ? 'not-allowed' : 'pointer',
                    backgroundColor: shots.length === 0 ? '#555' : '#6F263D',
                    color: shots.length === 0 ? '#888' : '#FFB81C',
                    opacity: shots.length === 0 ? 0.5 : 1,
                    minWidth: '80px',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Player Info */}
            <div style={{
              textAlign: 'center',
              color: '#FFB81C',
              fontSize: '1rem',
              fontWeight: 'bold',
              padding: '0.25rem',
              backgroundColor: 'rgba(111, 38, 61, 0.3)',
              borderRadius: '6px',
              border: '1px solid #FFB81C'
            }}>
              Player: {selectedPlayer?.name} {selectedPlayer?.jerseyNumber ? `#${selectedPlayer.jerseyNumber}` : ''}
            </div>

            {/* Firebase Session Status */}
            {currentFirebaseSession && (
              <div style={{
                textAlign: 'center',
                color: '#4CAF50',
                fontSize: '0.8rem',
                padding: '0.25rem',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '4px',
                border: '1px solid #4CAF50'
              }}>
                Firebase Session Active: {currentFirebaseSession.logID?.slice(-8)}
              </div>
            )}

            {/* Firebase Error Status */}
            {firebaseSessionError && (
              <div style={{
                textAlign: 'center',
                color: '#f44336',
                fontSize: '0.8rem',
                padding: '0.25rem',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                borderRadius: '4px',
                border: '1px solid #f44336'
              }}>
                Warning Firebase: {firebaseSessionError}
              </div>
            )}

            {/* Session Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              maxWidth: '100vw',
              margin: '0 auto',
              padding: '0.25rem',
              backgroundColor: 'rgba(111, 38, 61, 0.2)',
              borderRadius: '8px',
              border: '2px solid #FFB81C',
              boxSizing: 'border-box',
              gap: '0.25rem'
            }}>
              {/* Start/Pause/Resume Session Button */}
              <button 
                onClick={sessionStarted ? handlePauseSession : handleStartSession}
                style={{
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  border: '2px solid #FFB81C',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: sessionStarted ? (sessionPaused ? '#28a745' : '#ffc107') : '#28a745',
                  color: sessionStarted ? '#6F263D' : '#FFB81C',
                  minWidth: '70px',
                  minHeight: '32px',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  maxWidth: '100px',
                  boxSizing: 'border-box'
                }}
              >
                {sessionStarted ? (sessionPaused ? 'Resume' : 'Pause') : 'Start'}
              </button>

              {/* Timer */}
              <div style={{
                color: '#FFB81C',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                textAlign: 'center',
                padding: '0.4rem 0.6rem',
                backgroundColor: sessionPaused ? '#ff6b35' : '#6F263D',
                borderRadius: '6px',
                border: '2px solid #FFB81C',
                minWidth: '60px',
                height: '32px',
                fontFamily: 'monospace',
                flex: '0 0 auto',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {sessionStarted ? formatTime(elapsedTime) : '00:00'}
              </div>

              {/* End Session Button */}
              <button 
                onClick={handleEndSession}
                disabled={!sessionStarted}
                style={{
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  border: '2px solid #FFB81C',
                  borderRadius: '6px',
                  cursor: !sessionStarted ? 'not-allowed' : 'pointer',
                  backgroundColor: !sessionStarted ? '#555' : '#dc3545',
                  color: !sessionStarted ? '#888' : '#FFB81C',
                  opacity: !sessionStarted ? 0.5 : 1,
                  minWidth: '70px',
                  minHeight: '32px',
                  transition: 'all 0.3s ease',
                  flex: '1',
                  maxWidth: '100px',
                  boxSizing: 'border-box'
                }}
                onMouseOver={(e) => sessionStarted && (e.target.style.backgroundColor = '#c82333')}
                onMouseOut={(e) => sessionStarted && (e.target.style.backgroundColor = '#dc3545')}
              >
                End
              </button>
            </div>

            {/* Mode Toggle - ALWAYS SHOW FOR DEBUGGING */}
            <div className="mode-toggle" style={{ 
              display: 'flex', 
              backgroundColor: '#6F263D', 
              borderRadius: '8px', 
              padding: '3px', 
              gap: '3px', 
              border: '2px solid #FFB81C',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              width: '100%',
              maxWidth: '100vw',
              margin: '0 auto',
              boxSizing: 'border-box'
            }}>
                {/* Only show Court View button on tablets and desktop */}
                <button 
                  className={`toggle-button ${isMapMode ? 'active' : ''}`}
                  onClick={() => setIsMapMode(true)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: isMapMode ? '#FFB81C' : 'transparent',
                    color: isMapMode ? '#6F263D' : '#FFB81C',
                    flex: 1,
                    minHeight: '36px',
                    boxSizing: 'border-box'
                  }}
                >
                  Court View
                </button>
                <button 
                  className={`toggle-button ${!isMapMode ? 'active' : ''}`}
                  onClick={() => setIsMapMode(false)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: !isMapMode ? '#FFB81C' : 'transparent',
                    color: !isMapMode ? '#6F263D' : '#FFB81C',
                    flex: 1,
                    minHeight: '36px',
                    boxSizing: 'border-box'
                  }}
                >
                  Zone Buttons
                </button>
              </div>

            {/* Main Content Area */}
            <div style={{
              display: 'flex',
              flexDirection: window.innerWidth > 768 ? 'row' : 'column',
              gap: '0.25rem',
              width: '100%',
              height: 'auto',
              flex: 1,
              justifyContent: 'center',
              maxWidth: '100vw',
              boxSizing: 'border-box',
              overflowX: 'hidden',
              overflowY: 'visible'
            }}>
              {/* Shooting Interface */}
              <div style={{ 
                flex: window.innerWidth > 768 ? '2' : '1',
                display: 'flex',
                justifyContent: 'center',
                maxWidth: '100%',
                height: 'auto',
                boxSizing: 'border-box'
              }}>
                {isMapMode ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: window.innerWidth > 1024 ? 'row' : 'column',
                    gap: '0.5rem',
                    width: '100%',
                    height: 'auto'
                  }}>
                    {/* Court Tracker */}
                    <div style={{
                      flex: window.innerWidth > 1024 ? '2' : '1',
                      minWidth: '300px'
                    }}>
                      <CourtTracker 
                        shots={shots} 
                        setShots={setShots} 
                        currentPlayer={selectedPlayer?.name || 'Unknown Player'}
                        onShot={handleShot}
                        onUndoLastShot={handleUndoLastShot}
                        lastUndoShotTime={lastUndoShotTime}
                        setLastUndoShotTime={setLastUndoShotTime}
                        sessionStarted={sessionStarted}
                        sessionPaused={sessionPaused}
                        currentElapsedTime={elapsedTime}
                        windowDimensions={windowDimensions}
                        orientation={orientation}
                        isIPhoneLandscape={isIPhoneLandscape}
                        appRenderKey={appRenderKey}
                      />
                    </div>
                    
                    {/* Right sidebar with Statistics and Shot Log vertically stacked */}
                    {window.innerWidth > 1024 && (
                      <div style={{
                        flex: '1',
                        minWidth: '300px',
                        maxWidth: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {/* Shooting Statistics Box */}
                        <ShootingStatistics 
                          shots={shots}
                          windowDimensions={windowDimensions}
                          sessionStarted={sessionStarted}
                        />
                        
                        {/* Shot Log below Statistics */}
                        <HistoryLog 
                          shots={shots} 
                          playerName={selectedPlayer?.name || 'Unknown Player'} 
                          sessionStartTime={startTime}
                          totalPausedTime={totalPausedTime}
                          windowDimensions={windowDimensions}
                          orientation={orientation}
                          isIPhoneLandscape={isIPhoneLandscape}
                          appRenderKey={appRenderKey}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <ZoneButtons 
                    shots={shots} 
                    setShots={setShots} 
                    currentPlayer={selectedPlayer?.name || 'Unknown Player'}
                    onShot={handleShot}
                    onUndoLastShot={handleUndoLastShot}
                    lastUndoShotTime={lastUndoShotTime}
                    setLastUndoShotTime={setLastUndoShotTime}
                    sessionStarted={sessionStarted}
                    sessionPaused={sessionPaused}
                    currentElapsedTime={elapsedTime}
                    windowDimensions={windowDimensions}
                    orientation={orientation}
                    isIPhoneLandscape={isIPhoneLandscape}
                    appRenderKey={appRenderKey}
                    isReversed={isReversed}
                    setIsReversed={setIsReversed}
                  />
                )}
              </div>

              {/* History Log - Show separately on smaller screens OR in zone mode */}
              {(window.innerWidth <= 1024 || !isMapMode) && (
                <div style={{ 
                  flex: window.innerWidth > 768 ? '1' : 'none',
                  minWidth: window.innerWidth > 768 ? '200px' : 'auto',
                  maxWidth: '100%',
                  height: 'auto',
                  boxSizing: 'border-box'
                }}>
                  <HistoryLog 
                    shots={shots} 
                    playerName={selectedPlayer?.name || 'Unknown Player'} 
                    sessionStartTime={startTime}
                    totalPausedTime={totalPausedTime}
                    windowDimensions={windowDimensions}
                    orientation={orientation}
                    isIPhoneLandscape={isIPhoneLandscape}
                    appRenderKey={appRenderKey}
                  />
                </div>
              )}
            </div>
            </div>
        );
      
      default:
        return <HomePage onStartNewTest={handleStartNewTest} onDownloadResults={handleDownloadResults} />;
    }
  };

  return (
    <div 
      key={appRenderKey} 
      className="flex flex-col bg-cavs-wine relative" 
      style={{ 
        width: '100%', 
        height: '100vh',
        maxWidth: '100vw', 
        maxHeight: '100vh',
        overflowX: 'hidden',
        overflowY: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <AppBar position="static" sx={{ 
        backgroundColor: '#6F263D',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <Toolbar sx={{ 
          height: '60px',
          minHeight: '60px',
          maxHeight: '60px',
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
          padding: { xs: '0 0.5rem', sm: '0 1rem' }
        }}>
          <Box
            component="img"
            src="/cavsLogo.png"
            alt="Cavs Logo"
            sx={{ height: 40, mr: 2, flexShrink: 0 }}
          />
          <Typography variant="h6" sx={{ 
            color: '#FFB81C', 
            fontWeight: 'bold',
            fontSize: { xs: '1rem', sm: '1.25rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            Cavs Shooting Tracker
          </Typography>
        </Toolbar>
      </AppBar>

      <main style={{ 
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: window.innerWidth > 768 ? '0.5rem' : '0.25rem',
        width: '100%',
        height: 'calc(100vh - 60px)',
        maxWidth: '100vw',
        maxHeight: 'calc(100vh - 60px)',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}>
        {renderContent()}
      </main>

      {/* End Session Dialog */}
      {showEndSessionDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFB81C',
            padding: '2rem',
            borderRadius: '12px',
            border: '3px solid #6F263D',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ color: '#6F263D', marginBottom: '1rem' }}>End Shooting Session</h2>
            <p style={{ color: '#6F263D', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Do you want to save or discard the results for {selectedPlayer?.name || 'Unknown Player'}?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleSaveResults}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save Results
              </button>
              <button
                onClick={handleDiscardRequest}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Discard Results
              </button>
              <button
                onClick={() => setShowEndSessionDialog(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: '2px solid #6F263D',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: '#6F263D',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            textAlign: 'center',
            maxWidth: '450px',
            width: '90%'
          }}>
            <h2 style={{ color: '#dc3545', marginBottom: '1rem', fontSize: '1.5rem' }}>
              Confirm Discard
            </h2>
            <p style={{ color: '#6F263D', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.4' }}>
              Are you sure? This will cause you to lose all previous shooting data for this session.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleConfirmDiscard}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  minWidth: '140px'
                }}
              >
                Yes, Discard
              </button>
              <button
                onClick={handleCancelDiscard}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: '2px solid #6F263D',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: '#6F263D',
                  cursor: 'pointer',
                  minWidth: '140px'
                }}
              >
                No, Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Session Dialog */}
      {showResetDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFB81C',
            padding: '2rem',
            borderRadius: '12px',
            border: '3px solid #6F263D',
            textAlign: 'center',
            maxWidth: '450px',
            width: '90%'
          }}>
            <h2 style={{ color: '#6F263D', marginBottom: '1rem', fontSize: '1.5rem' }}>
              Reset Shooting Session
            </h2>
            <p style={{ 
              color: '#6F263D', 
              marginBottom: '2rem', 
              fontSize: '1.1rem', 
              lineHeight: '1.4',
              fontWeight: '500'
            }}>
              Are you sure you want to reset the shooting session? This will cause the previous shooting session data to be lost!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleConfirmReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  minWidth: '140px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Reset Session
              </button>
              <button
                onClick={handleCancelReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: '2px solid #6F263D',
                  borderRadius: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  minWidth: '140px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                ← Back to Shooting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFB81C',
            padding: '2rem',
            borderRadius: '12px',
            border: '3px solid #6F263D',
            textAlign: 'center',
            maxWidth: '450px',
            width: '90%'
          }}>
            <h2 style={{ color: '#6F263D', marginBottom: '1rem', fontSize: '1.5rem' }}>
              Exit Shooting Session
            </h2>
            <p style={{ 
              color: '#6F263D', 
              marginBottom: '2rem', 
              fontSize: '1.1rem', 
              lineHeight: '1.4',
              fontWeight: '500'
            }}>
              All unsaved data will be lost. Are you sure you want to exit?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleConfirmExit}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  minWidth: '140px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Yes, Exit
              </button>
              <button
                onClick={handleCancelExit}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: '2px solid #6F263D',
                  borderRadius: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  minWidth: '140px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                No, Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFB81C',
            padding: '2rem',
            borderRadius: '12px',
            border: '3px solid #6F263D',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ color: '#6F263D', marginBottom: '1rem' }}>Saving Results...</h2>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid #6F263D',
              borderTop: '5px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: '#6F263D', fontSize: '1.1rem' }}>
              Saving shooting test results for {selectedPlayer?.name || 'Unknown Player'}...
            </p>
          </div>
        </div>
      )}

      {/* Zone Review Dialog */}
      {showReviewDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: window.innerWidth <= 480 ? '1rem' : '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: window.innerWidth <= 480 ? '90vh' : '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ 
              color: '#6F263D', 
              marginBottom: '1.5rem', 
              textAlign: 'center',
              fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.5rem'
            }}>
              Session Review
            </h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                color: '#6F263D', 
                marginBottom: '1rem',
                fontSize: window.innerWidth <= 480 ? '1rem' : '1.2rem'
              }}>Zone Performance</h3>
              {(() => {
                const zoneReview = calculateZoneReview();
                return Object.entries(zoneReview).map(([zoneId, zone]) => (
                  <div key={zoneId} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: window.innerWidth <= 480 ? '6px 8px' : '8px 12px',
                    marginBottom: '8px',
                    backgroundColor: zone.attempts > 0 ? '#f8f9fa' : '#f1f1f1',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${zone.percentage >= 50 ? '#28a745' : zone.percentage >= 30 ? '#ffc107' : '#dc3545'}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#6F263D',
                        fontSize: window.innerWidth <= 480 ? '0.85rem' : '1rem'
                      }}>{zone.name}</div>
                      <div style={{ 
                        fontSize: window.innerWidth <= 480 ? '0.75rem' : '0.9rem', 
                        color: '#666' 
                      }}>
                        {zone.made}/{zone.attempts} shots
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: window.innerWidth <= 480 ? '1rem' : '1.2rem', 
                        fontWeight: 'bold',
                        color: zone.percentage >= 50 ? '#28a745' : zone.percentage >= 30 ? '#ffc107' : '#dc3545'
                      }}>
                        {zone.percentage}%
                      </div>
                      <div style={{ 
                        fontSize: window.innerWidth <= 480 ? '0.7rem' : '0.8rem', 
                        color: '#666' 
                      }}>
                        {Math.floor(zone.timeSpent / 1000)}s in zone
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ 
                padding: window.innerWidth <= 480 ? '8px' : '12px',
                backgroundColor: '#FFB81C',
                borderRadius: '8px',
                color: '#6F263D',
                fontWeight: 'bold',
                fontSize: window.innerWidth <= 480 ? '0.9rem' : '1rem'
              }}>
                Total Session Time: {formatTime(elapsedTime)}
              </div>
            </div>

            <div style={{ 
              textAlign: 'center', 
              display: 'flex', 
              gap: window.innerWidth <= 480 ? '0.5rem' : '1rem', 
              justifyContent: 'center', 
              flexWrap: 'wrap' 
            }}>
              {selectedPlayer?.isGuest && (
                <button
                  onClick={() => {
                    downloadSessionReport();
                    handleCloseReview();
                  }}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: window.innerWidth <= 480 ? '8px 12px' : '12px 20px',
                    borderRadius: '8px',
                    fontSize: window.innerWidth <= 480 ? '0.85rem' : '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: window.innerWidth <= 480 ? '90px' : '120px',
                    flex: window.innerWidth <= 480 ? '1' : 'none'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#218838';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#28a745';
                  }}
                >
                  Download
                </button>
              )}
              <button
                onClick={handleCloseReview}
                style={{
                  backgroundColor: '#6F263D',
                  color: '#FFB81C',
                  border: 'none',
                  padding: window.innerWidth <= 480 ? '8px 12px' : '12px 24px',
                  borderRadius: '8px',
                  fontSize: window.innerWidth <= 480 ? '0.85rem' : '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: window.innerWidth <= 480 ? '90px' : '120px',
                  flex: window.innerWidth <= 480 ? '1' : 'none'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#8B2A47';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#6F263D';
                }}
              >
                {selectedPlayer?.isGuest ? 'Back to Home' : 'Continue to Results'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Saved Dialog */}
      {showResultsDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFB81C',
            padding: '2rem',
            borderRadius: '12px',
            border: '3px solid #6F263D',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ color: '#6F263D', marginBottom: '1rem' }}>Results Saved!</h2>
            <p style={{ color: '#6F263D', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Shooting test results for {selectedPlayer?.name || 'Unknown Player'} have been saved successfully.
              <br /><br />
              Total shots: {shots.length}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleDownloadFromResults}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#6F263D',
                  color: '#FFB81C',
                  cursor: 'pointer'
                }}
              >
                Download Results
              </button>
              <button
                onClick={handleBackToHomeFromResults}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  border: '2px solid #6F263D',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: '#6F263D',
                  cursor: 'pointer'
                }}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
