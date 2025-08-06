import React, { useState } from 'react';
import './PlayerSelection.css';

const PlayerSelection = ({ onPlayerSelected, onBackToHome }) => {
  const [selectedPlayer, setSelectedPlayer] = useState('');

  const players = [
    'Player1', 'Player2', 'Player3', 'Player4', 'Player5',
    'Player6', 'Player7', 'Player8', 'Player9', 'Player10',
    'Player11', 'Player12', 'Player13', 'Player14'
  ];

  const handleStartTest = () => {
    if (selectedPlayer) {
      onPlayerSelected(selectedPlayer);
    }
  };

  return (
    <div className="player-selection">
      <div className="player-selection-content">
        <h1 className="player-selection-title">Select Player</h1>
        
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
              <option key={player} value={player}>
                {player}
              </option>
            ))}
          </select>
        </div>

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
      </div>
    </div>
  );
};

export default PlayerSelection;
