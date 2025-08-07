import React, { useState, useEffect } from 'react';
import './PlayerSelection.css';
import { playersService, initializeSampleData } from '../firebase/services';

const PlayerSelection = ({ onPlayerSelected, onBackToHome }) => {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);

  // Check for landscape orientation and screen size
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerHeight < window.innerWidth && window.innerHeight <= 428;
      setIsLandscape(landscape);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Fetch players from Firebase on component mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadingProgress(0);
        setLoadingStartTime(Date.now());
        
        // Start progress simulation
        const progressInterval = simulateLoadingProgress();
        
        // Try to get players from Firebase
        const fetchedPlayers = await playersService.getActivePlayers();
        
        // Clear progress interval
        clearInterval(progressInterval);
        setLoadingProgress(100);
        
        // Small delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (fetchedPlayers.length === 0) {
          // If no players exist, offer to initialize sample data
          setError('No players found in database. Would you like to load sample Cavaliers players?');
          setPlayers([]);
        } else {
          setPlayers(fetchedPlayers);
        }
      } catch (err) {
        console.error('Error fetching players:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        setError(`Failed to load players: ${err.message}. Please check your Firebase configuration.`);
        setPlayers([]);
      } finally {
        setLoading(false);
        setLoadingProgress(0);
        setEstimatedTime(0);
      }
    };

    fetchPlayers();
  }, []);

  // Simulate loading progress with estimated time
  const simulateLoadingProgress = () => {
    let progress = 0;
    const startTime = Date.now();
    
    return setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Simulate realistic loading curve
      if (progress < 30) {
        progress += Math.random() * 15; // Fast initial progress
      } else if (progress < 60) {
        progress += Math.random() * 8;  // Medium progress
      } else if (progress < 85) {
        progress += Math.random() * 3;  // Slower progress
      } else if (progress < 95) {
        progress += Math.random() * 1;  // Very slow near end
      }
      
      progress = Math.min(progress, 95); // Cap at 95% until actual completion
      setLoadingProgress(Math.round(progress));
      
      // Calculate estimated time remaining
      if (progress > 5) {
        const estimatedTotal = (elapsed / progress) * 100;
        const remaining = Math.max(0, (estimatedTotal - elapsed) / 1000);
        setEstimatedTime(remaining);
      }
    }, 100);
  };

  const handleInitializeSampleData = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      await initializeSampleData();
      
      // Refresh the players list
      const fetchedPlayers = await playersService.getActivePlayers();
      setPlayers(fetchedPlayers);
      setError(null);
    } catch (err) {
      console.error('Error initializing sample data:', err);
      setError('Failed to initialize sample data. Please check your Firebase configuration.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await playersService.testConnection();
      if (result.success) {
        alert(`Connection successful! Found ${result.count} documents.`);
        
        // Try to fetch players again after successful test
        const fetchedPlayers = await playersService.getActivePlayers();
        setPlayers(fetchedPlayers);
        setError(null);
      } else {
        alert(`Connection failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Test failed: ${err.message}`);
    }
  };

  const handleStartGuest = () => {
    // Create a guest player object
    const guestPlayer = {
      id: 'guest',
      name: 'Guest Player',
      jerseyNumber: null,
      position: 'Guest',
      isGuest: true // Flag to indicate this is a guest session
    };
    
    onPlayerSelected(guestPlayer);
  };

  const handleStartTest = () => {
    if (selectedPlayer) {
      // Find the full player object
      const playerObj = players.find(p => p.id === selectedPlayer);
      if (playerObj) {
        // Pass both the player ID and full player object
        onPlayerSelected({
          id: playerObj.id,
          name: playerObj.name,
          jerseyNumber: playerObj.jerseyNumber,
          position: playerObj.position
        });
      }
    }
  };

  // Loading state with progress bar
  if (loading) {
    return (
      <div className="player-selection">
        <div className="player-selection-content">
          <h1 className="player-selection-title">Loading Players...</h1>
          <div style={{ 
            padding: isLandscape ? '20px 10px' : '40px 20px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: isLandscape ? '10px' : '20px', fontSize: isLandscape ? '1rem' : '1.1rem', color: '#FFB81C' }}>
              🏀 Loading players...
            </div>
            
            {/* Progress Bar Container */}
            <div style={{ 
              width: '100%', 
              maxWidth: isLandscape ? '300px' : '400px', 
              margin: isLandscape ? '0 auto 10px' : '0 auto 20px',
              backgroundColor: '#f0f0f0',
              borderRadius: '10px',
              overflow: 'hidden',
              height: isLandscape ? '10px' : '12px',
              position: 'relative'
            }}>
              {/* Progress Fill */}
              <div style={{
                width: `${loadingProgress}%`,
                height: '100%',
                backgroundColor: '#FFB81C',
                borderRadius: '10px',
                transition: 'width 0.2s ease-in-out',
                background: 'linear-gradient(90deg, #FFB81C 0%, #ffc747 50%, #FFB81C 100%)'
              }} />
            </div>
            
            {/* Progress Info */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              maxWidth: isLandscape ? '300px' : '400px',
              margin: '0 auto',
              fontSize: isLandscape ? '0.8rem' : '0.9rem',
              color: '#6F263D'
            }}>
              <span>{loadingProgress}% complete</span>
              {estimatedTime > 0 && (
                <span>~{Math.ceil(estimatedTime)}s remaining</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-selection">
      <div className="player-selection-content">
        <h1 className="player-selection-title">Select Player</h1>
        
        {/* Error handling and sample data initialization */}
        {error && players.length === 0 && error.includes('No players found') && (
          <div style={{ 
            margin: isLandscape ? '8px 0' : '20px 0',
            padding: isLandscape ? '10px' : '15px',
            backgroundColor: '#FFB81C',
            color: '#6F263D',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>{error}</p>
            <div style={{ display: 'flex', gap: isLandscape ? '8px' : '10px', justifyContent: 'center', flexWrap: isLandscape ? 'nowrap' : 'wrap' }}>
              <button
                onClick={handleInitializeSampleData}
                disabled={isInitializing}
                style={{
                  padding: isLandscape ? '6px 12px' : '8px 16px',
                  backgroundColor: '#6F263D',
                  color: '#FFB81C',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isInitializing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: isLandscape ? '0.8rem' : '1rem',
                  opacity: isInitializing ? 0.6 : 1
                }}
              >
                {isInitializing ? 'Loading...' : 'Load Sample Cavaliers Players'}
              </button>
              <button
                onClick={handleTestConnection}
                style={{
                  padding: isLandscape ? '6px 12px' : '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: isLandscape ? '0.8rem' : '1rem'
                }}
              >
                Test Connection
              </button>
            </div>
          </div>
        )}

        {/* Error for other Firebase issues */}
        {error && !error.includes('No players found') && (
          <div style={{ 
            margin: isLandscape ? '8px 0' : '20px 0',
            padding: isLandscape ? '10px' : '15px',
            backgroundColor: '#d32f2f',
            color: 'white',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0' }}>{error}</p>
            <button
              onClick={handleTestConnection}
              style={{
                padding: isLandscape ? '6px 12px' : '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: isLandscape ? '0.8rem' : '1rem'
              }}
            >
              Test Firebase Connection
            </button>
          </div>
        )}
        
        {/* Player selection dropdown */}
        {players.length > 0 && (
          <>
            <div className="dropdown-container">
              <label htmlFor="player-dropdown" className="dropdown-label">
                Choose a player to conduct the shooting test:
              </label>
              <select
                id="player-dropdown"
                className="player-dropdown"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">-- Select a Player --</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} {player.jerseyNumber ? `#${player.jerseyNumber}` : ''} {player.position ? `(${player.position})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Show selected player details */}
            {selectedPlayer && (
              <div style={{ 
                margin: isLandscape ? '6px 0' : '15px 0',
                padding: isLandscape ? '6px' : '10px',
                backgroundColor: 'rgba(255, 184, 28, 0.1)',
                border: '2px solid #FFB81C',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                {(() => {
                  const player = players.find(p => p.id === selectedPlayer);
                  return player ? (
                    <p style={{ 
                      margin: 0, 
                      color: '#FFB81C', 
                      fontWeight: 'bold',
                      fontSize: isLandscape ? '0.9rem' : '1.1rem'
                    }}>
                      Selected: {player.name} 
                      {player.jerseyNumber && ` #${player.jerseyNumber}`}
                      {player.position && ` - ${player.position}`}
                    </p>
                  ) : null;
                })()}
              </div>
            )}
          </>
        )}

        <div className="selection-buttons">
          <button 
            className="selection-button back-button"
            onClick={onBackToHome}
          >
            Back to Home
          </button>
          <button 
            className="selection-button start-button"
            onClick={handleStartTest}
            disabled={!selectedPlayer}
          >
            Start Shooting Test
          </button>
        </div>

        {/* Guest Mode Option */}
        <div style={{ 
          textAlign: 'center', 
          margin: isLandscape ? '8px 0' : '15px 0',
          padding: isLandscape ? '8px' : '15px',
          borderTop: '1px solid rgba(255, 184, 28, 0.3)'
        }}>
          <p style={{ 
            margin: '0 0 10px 0', 
            color: '#FFB81C', 
            fontSize: isLandscape ? '0.9rem' : '1rem',
            fontWeight: 'normal'
          }}>
            Or practice without saving results:
          </p>
          <button 
            className="selection-button guest-button"
            onClick={handleStartGuest}
            style={{
              backgroundColor: '#6F263D',
              color: '#FFB81C',
              border: '2px solid #FFB81C',
              opacity: 0.9
            }}
          >
            Continue as Guest
          </button>
          <p style={{ 
            margin: '8px 0 0 0', 
            color: 'rgba(255, 184, 28, 0.7)', 
            fontSize: isLandscape ? '0.75rem' : '0.85rem',
            fontStyle: 'italic'
          }}>
            Guest sessions won't be saved to database but can be downloaded
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlayerSelection;
