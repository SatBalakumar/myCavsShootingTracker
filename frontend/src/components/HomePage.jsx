import React from 'react';
import './HomePage.css';

const HomePage = ({ onStartNewTest, onDownloadResults }) => {
  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title">Cavs Shooting Tracker</h1>
        <div className="home-buttons">
          <button 
            className="home-button start-test-button"
            onClick={onStartNewTest}
          >
            Conduct New Shooting Test
          </button>
          <button 
            className="home-button download-button"
            onClick={onDownloadResults}
          >
            Download Shooting Test Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
