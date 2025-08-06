import React, { useState } from 'react';
import HomePage from './components/HomePage';
import PlayerSelection from './components/PlayerSelection';
import CourtTracker from './components/CourtTracker';
import ZoneButtons from './components/ZoneButtons';
import HistoryLog from './components/HistoryLog';
import { AppBar, Toolbar, Box, Typography } from '@mui/material';

function App() {
  const [shots, setShots] = useState([]);
  const [isMapMode, setIsMapMode] = useState(true);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'playerSelection', 'shootingTest'
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [lastPauseTime, setLastPauseTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Mobile phone detection (excludes tablets)
  const isMobilePhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && !/iPad|tablet/i.test(navigator.userAgent) && window.innerWidth <= 480;

  // Force Zone Buttons mode on mobile phones
  React.useEffect(() => {
    if (isMobilePhone && isMapMode) {
      setIsMapMode(false);
    }
  }, [isMobilePhone, isMapMode]);

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
    // TODO: Implement download functionality later
    alert('Download functionality will be implemented later');
  };

  const handlePlayerSelected = (playerName) => {
    setSelectedPlayer(playerName);
    setShots([]); // Reset shots for new test
    setSessionStarted(false);
    setStartTime(null);
    setElapsedTime(0);
    setCurrentPage('shootingTest');
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setSessionPaused(false);
    setStartTime(Date.now());
    setTotalPausedTime(0);
    setLastPauseTime(null);
    setElapsedTime(0);
  };

  const handlePauseSession = () => {
    if (sessionPaused) {
      // Resume - add the time we were paused to total paused time
      const pauseDuration = Date.now() - lastPauseTime;
      setTotalPausedTime(prev => prev + pauseDuration);
      setSessionPaused(false);
      setLastPauseTime(null);
    } else {
      // Pause - record when we paused
      setSessionPaused(true);
      setLastPauseTime(Date.now());
    }
  };

  const handleResetShots = () => {
    setShowResetDialog(true);
  };

  const handleConfirmReset = () => {
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
    
    // Close the dialog
    setShowResetDialog(false);
  };

  const handleCancelReset = () => {
    setShowResetDialog(false);
  };

  const handleShot = (newShot) => {
    // This function can be used for any additional shot processing if needed
    // The actual shot adding is handled in the individual components
  };

  const handleUndoZoneShot = (zoneId) => {
    // Find the last shot from this zone and remove it
    const zoneShots = shots.filter(shot => shot.location === zoneId);
    if (zoneShots.length === 0) return;
    
    const lastZoneShot = zoneShots[zoneShots.length - 1];
    const lastZoneShotIndex = shots.lastIndexOf(lastZoneShot);
    
    const newShots = [...shots];
    newShots.splice(lastZoneShotIndex, 1);
    setShots(newShots);
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setSelectedPlayer('');
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

  const handleEndSession = () => {
    setShowEndSessionDialog(true);
  };

  const handleSaveResults = () => {
    setShowEndSessionDialog(false);
    setShowSaveDialog(true);
    
    // Simulate saving process
    setTimeout(() => {
      setShowSaveDialog(false);
      setShowResultsDialog(true);
    }, 2000);
  };

  const handleDiscardResults = () => {
    setShowEndSessionDialog(false);
    setShots([]);
    handleBackToHome();
  };

  const handleDownloadFromResults = () => {
    // TODO: Implement actual download
    alert('Downloading results for ' + selectedPlayer);
    setShowResultsDialog(false);
    handleBackToHome();
  };

  const handleBackToHomeFromResults = () => {
    setShowResultsDialog(false);
    handleBackToHome();
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage 
            onStartNewTest={handleStartNewTest}
            onDownloadResults={handleDownloadResults}
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
              Player: {selectedPlayer}
            </div>

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

            {/* Mode Toggle - Optimized for touch */}
            {!isMobilePhone && (
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
            )}

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
                  <CourtTracker 
                    shots={shots} 
                    setShots={setShots} 
                    currentPlayer={selectedPlayer}
                    onShot={handleShot}
                    onUndoZoneShot={handleUndoZoneShot}
                    sessionStarted={sessionStarted}
                    sessionPaused={sessionPaused}
                  />
                ) : (
                  <ZoneButtons 
                    shots={shots} 
                    setShots={setShots} 
                    currentPlayer={selectedPlayer}
                    onShot={handleShot}
                    onUndoZoneShot={handleUndoZoneShot}
                    sessionStarted={sessionStarted}
                    sessionPaused={sessionPaused}
                    currentElapsedTime={elapsedTime}
                  />
                )}
              </div>

              {/* History Log - Sidebar on tablet, bottom on mobile */}
              <div style={{ 
                flex: window.innerWidth > 768 ? '1' : 'none',
                minWidth: window.innerWidth > 768 ? '200px' : 'auto',
                maxWidth: '100%',
                height: 'auto',
                boxSizing: 'border-box'
              }}>
                <HistoryLog 
                  shots={shots} 
                  playerName={selectedPlayer} 
                  sessionStartTime={startTime}
                  totalPausedTime={totalPausedTime}
                />
              </div>
            </div>
            </div>
        );
      
      default:
        return <HomePage onStartNewTest={handleStartNewTest} onDownloadResults={handleDownloadResults} />;
    }
  };

  return (
    <div className="flex flex-col bg-cavs-wine relative" style={{ 
      width: '100%', 
      height: '100vh',
      maxWidth: '100vw', 
      maxHeight: '100vh',
      overflowX: 'hidden',
      overflowY: 'hidden',
      boxSizing: 'border-box'
    }}>
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
              Do you want to save or discard the results for {selectedPlayer}?
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
                onClick={handleDiscardResults}
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
              Saving shooting test results for {selectedPlayer}...
            </p>
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
            <h2 style={{ color: '#6F263D', marginBottom: '1rem' }}>✅ Results Saved!</h2>
            <p style={{ color: '#6F263D', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Shooting test results for {selectedPlayer} have been saved successfully.
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
