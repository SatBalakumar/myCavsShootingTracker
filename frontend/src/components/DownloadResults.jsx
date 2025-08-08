import React, { useState, useEffect } from 'react';
import './DownloadResults.css';

const DownloadResults = ({ 
  onBackToHome, 
  shootingSessionManager, 
  downloadSessionReport 
}) => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [errorMessage, setErrorMessage] = useState('');

  // Load all players on component mount
  useEffect(() => {
    loadAllPlayers();
  }, []);

  const loadAllPlayers = async () => {
    try {
      setLoading(true);
      const players = await shootingSessionManager.getAllPlayers();
      
      // Sort players by jersey number, then by name for players without jersey numbers
      const sortedPlayers = (players || []).sort((a, b) => {
        // If both players have jersey numbers, sort by jersey number
        if (a.jerseyNumber && b.jerseyNumber) {
          return a.jerseyNumber - b.jerseyNumber;
        }
        // If only one has a jersey number, put that one first
        if (a.jerseyNumber && !b.jerseyNumber) return -1;
        if (!a.jerseyNumber && b.jerseyNumber) return 1;
        // If neither has a jersey number, sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
      
      setAllPlayers(sortedPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
      setErrorMessage('Failed to load players. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedPlayer) {
      setErrorMessage('Please select a player to search.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      
      console.log('Searching for player:', selectedPlayer);
      console.log('All players loaded:', allPlayers);
      
      // Build search criteria
      const searchCriteria = {
        playerId: selectedPlayer,
        startDate: startDate || null,
        endDate: endDate || null
      };

      console.log('Search criteria:', searchCriteria);

      // Get shooting sessions for the player in the date range
      const sessions = await shootingSessionManager.getPlayerSessions(searchCriteria);
      
      console.log('Found sessions:', sessions);
      
      if (!sessions || sessions.length === 0) {
        setErrorMessage('No data available for download for this search. Please try a different player or a different date range.');
        setSearchResults([]);
        return;
      }

      setSearchResults(sessions);
      setShowDownloadModal(true);
    } catch (error) {
      console.error('Error searching sessions:', error);
      setErrorMessage('Failed to search sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setLoading(true);
      setShowDownloadModal(false);
      
      // Generate CSV for all sessions in date range
      const csvData = await generateHistoricalCSV(searchResults);
      downloadCSV(csvData, `shooting_data_${selectedPlayer}_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    } catch (error) {
      console.error('Error downloading all data:', error);
      setErrorMessage('Failed to download data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSelection = () => {
    setShowDownloadModal(false);
    setShowManualSelection(true);
    setSelectedSessions(new Set());
  };

  const toggleSessionSelection = (sessionId) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleDownloadSelected = async () => {
    if (selectedSessions.size === 0) {
      setErrorMessage('Please select at least one session to download.');
      return;
    }

    try {
      setLoading(true);
      
      // Filter sessions to only selected ones
      const selectedSessionData = searchResults.filter(session => 
        selectedSessions.has(session.sessionId)
      );
      
      const csvData = await generateHistoricalCSV(selectedSessionData);
      downloadCSV(csvData, `shooting_data_selected_${selectedPlayer}_${Date.now()}.csv`);
      
      setShowManualSelection(false);
      setSelectedSessions(new Set());
    } catch (error) {
      console.error('Error downloading selected data:', error);
      setErrorMessage('Failed to download selected data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateHistoricalCSV = async (sessions) => {
    // CSV format: PlayerID, logID, timestamp, timerVal_ms, shotID, shotZone, shotResult
    const rows = [['PlayerID', 'logID', 'timestamp', 'timerVal_ms', 'shotID', 'shotZone', 'shotResult']];
    
    // Sort sessions by start time
    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );

    for (const session of sortedSessions) {
      try {
        // Get all shots for this session
        const shots = await shootingSessionManager.getSessionShots(session.sessionId);
        
        if (shots && shots.length > 0) {
          // Sort shots by timestamp within each session
          const sortedShots = shots.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );

          sortedShots.forEach((shot, index) => {
            rows.push([
              session.playerId || selectedPlayer,
              session.sessionId,
              shot.timestamp,
              shot.timeTaken || shot.timerVal || '',
              shot.shotID || `shot_${index + 1}`,
              shot.shotZone || shot.location || shot.zone || '',
              shot.shotResult || (shot.made ? 'made' : 'missed')
            ]);
          });
        }
      } catch (error) {
        console.error(`Error getting shots for session ${session.sessionId}:`, error);
      }
    }

    return rows.map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className="download-results-container">
      <div className="download-results-content">
        <h1 className="download-results-title">Download Shooting Test Results</h1>
        
        {/* Search Form */}
        <div className="search-form">
          <div className="form-group">
            <label className="form-label">Select Player:</label>
            <select 
              className="form-select"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose a player...</option>
              {allPlayers.map(player => (
                <option key={player.id} value={player.playerID || player.id}>
                  {player.name} {player.jerseyNumber ? `#${player.jerseyNumber}` : ''} {player.position ? `(${player.position})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="date-range-group">
            <div className="form-group">
              <label className="form-label">Start Date (Optional):</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date (Optional):</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="button-group">
            <button 
              className="search-button"
              onClick={handleSearch}
              disabled={loading || !selectedPlayer}
            >
              {loading ? 'Searching...' : 'Search Sessions'}
            </button>
            <button 
              className="back-button"
              onClick={onBackToHome}
              disabled={loading}
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        {/* Download Options Modal */}
        {showDownloadModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Download Options</h3>
              <p>Found {searchResults.length} session(s) for {allPlayers.find(p => (p.playerID || p.id) === selectedPlayer)?.name}</p>
              <p>Would you like to download all data in this range or manually select sessions?</p>
              <div className="modal-buttons">
                <button className="modal-button primary" onClick={handleDownloadAll}>
                  Download All Data
                </button>
                <button className="modal-button secondary" onClick={handleManualSelection}>
                  Manual Selection
                </button>
                <button className="modal-button cancel" onClick={() => setShowDownloadModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Selection Table */}
        {showManualSelection && (
          <div className="manual-selection-container">
            <div className="manual-selection-header">
              <h3>Select Sessions to Download</h3>
              <button 
                className="download-selected-button"
                onClick={handleDownloadSelected}
                disabled={selectedSessions.size === 0}
              >
                Download Selected ({selectedSessions.size})
              </button>
            </div>
            
            <div className="sessions-table-container">
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Session Date</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                    <th>FGA</th>
                    <th>FGM</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map(session => (
                    <tr key={session.sessionId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedSessions.has(session.sessionId)}
                          onChange={() => toggleSessionSelection(session.sessionId)}
                        />
                      </td>
                      <td>{formatDate(session.startTime)}</td>
                      <td>{formatTime(session.startTime)}</td>
                      <td>{session.duration || 'N/A'}</td>
                      <td>{session.totalShots || 0}</td>
                      <td>{session.madeShots || 0}</td>
                      <td>{session.totalShots ? Math.round((session.madeShots / session.totalShots) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="manual-selection-footer">
              <button 
                className="cancel-button"
                onClick={() => setShowManualSelection(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadResults;
