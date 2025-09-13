/**
 * PLAYER SELECTION COMPONENT
 * 
 * Purpose: Interactive player roster interface for basketball shooting sessions
 * Context: Second step in the shooting tracker workflow (Home → Player Selection → Shooting Test)
 * 
 * Key Features:
 * 1. Dynamic player roster loading from Firebase
 * 2. Jersey number-based player organization and display
 * 3. Responsive design with landscape orientation optimization
 * 4. Progressive loading with visual feedback and time estimation
 * 5. Sample data initialization for first-time setup
 * 6. Error handling with graceful degradation
 * 
 * User Experience Design:
 * - Clear visual hierarchy with player photos and jersey numbers
 * - Loading states with progress indication and time estimates
 * - Responsive layout adapting to device orientation
 * - Immediate feedback for user selections
 * - Error recovery options for network failures
 * 
 * Data Flow:
 * Firebase → Player List → User Selection → Parent Callback → Shooting Session
 */

import React, { useState, useEffect } from 'react';
import './PlayerSelection.css';
import { playersService, initializeSampleData } from '../firebase/services';

// PlayerSelection: Roster interface for shooting session setup - Called from App.jsx renderContent()
/**
 * PLAYER SELECTION COMPONENT: Roster interface for shooting session setup
 * 
 * Props:
 * @param {Function} onPlayerSelected - Callback when player is chosen (receives player object)
 * @param {Function} onBackToHome - Callback to return to home screen
 * 
 * State Management:
 * - Player data: Roster information with real-time loading
 * - UI state: Loading indicators, error handling, progress tracking
 * - Responsive state: Orientation and layout adaptation
 */
const PlayerSelection = ({ onPlayerSelected, onBackToHome }) => {
  /**
   * PLAYER SELECTION STATE
   * Manages the currently selected player and available roster
   */
  const [selectedPlayer, setSelectedPlayer] = useState('');    // Currently selected player ID
  const [players, setPlayers] = useState([]);                 // Array of available players from Firebase
  
  /**
   * LOADING AND ERROR STATE
   * Provides comprehensive feedback during async operations
   */
  const [loading, setLoading] = useState(true);               // Boolean: whether initial data load is in progress
  const [error, setError] = useState(null);                  // Error object: captures and displays data loading failures
  const [isInitializing, setIsInitializing] = useState(false); // Boolean: whether sample data initialization is running
  
  /**
   * LOADING PROGRESS STATE
   * Enhances user experience with detailed loading feedback and time estimation
   * 
   * Why detailed loading states:
   * - Firebase operations can be slow on poor connections
   * - Users need feedback that the app is working, not frozen
   * - Time estimates help set user expectations appropriately
   * - Progress bars provide visual indication of completion
   */
  const [loadingProgress, setLoadingProgress] = useState(0);   // Number (0-100): visual progress indicator
  const [estimatedTime, setEstimatedTime] = useState(0);      // Number (seconds): estimated remaining time
  const [loadingStartTime, setLoadingStartTime] = useState(null); // Timestamp: when loading began (for calculations)
  
  /**
   * RESPONSIVE DESIGN STATE
   */
  const [isLandscape, setIsLandscape] = useState(false);      // Boolean: whether device is in landscape orientation
  
  /**
   * ORIENTATION DETECTION: Real-time responsive layout adjustment
   */
  useEffect(() => {
    const checkOrientation = () => {
      // Landscape detection: width > height AND height is mobile-sized
      const landscape = window.innerHeight < window.innerWidth && window.innerHeight <= 428;
      setIsLandscape(landscape);
    };

    // Initial check and event listeners for dynamic updates
    checkOrientation();
    window.addEventListener('resize', checkOrientation);          // Handle window resizing
    window.addEventListener('orientationchange', checkOrientation); // Handle device rotation

    // Cleanup: Remove event listeners to prevent memory leaks
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  /**
   * PLAYER DATA LOADING: Fetch roster from Firebase with comprehensive error handling
   * 
   * Loading Process:
   * 1. Initialize loading state and progress tracking
   * 2. Start visual progress simulation for user feedback
   * 3. Attempt to fetch active players from Firebase
   * 4. Handle success, empty data, and error scenarios
   * 5. Provide recovery options for initialization failures
   */
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        // LOADING STATE INITIALIZATION
        setLoading(true);
        setError(null);
        setLoadingProgress(0);
        setLoadingStartTime(Date.now());
        
        // PROGRESS SIMULATION: Start visual feedback for user experience
        const progressInterval = simulateLoadingProgress();
        
        // FIREBASE DATA FETCH: Get active players with jersey number sorting
        const fetchedPlayers = await playersService.getActivePlayers();
        
        // PROGRESS COMPLETION: Clear simulation and show completion
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
          <div className={`loading-container ${isLandscape ? 'landscape' : ''}`}>
            <div className={`loading-text ${isLandscape ? 'landscape' : ''}`}>
              Loading players...
            </div>
            
            {/* Progress Bar Container */}
            <div className={`progress-bar-container ${isLandscape ? 'landscape' : ''}`}>
              {/* Progress Fill */}
              <div 
                className="progress-bar-fill"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            
            {/* Progress Info */}
            <div className={`progress-info ${isLandscape ? 'landscape' : ''}`}>
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
