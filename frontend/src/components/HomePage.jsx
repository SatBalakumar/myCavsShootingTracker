/**
 * HOME PAGE COMPONENT
 * 
 * Purpose: Landing page and primary navigation hub for basketball shooting tracker
 * Context: Entry point for all user interactions and workflow initiation
 * 
 * Design Philosophy:
 * - Clean, professional interface reflecting Cleveland Cavaliers branding
 * - Clear call-to-action buttons for primary user workflows
 * - Minimal cognitive load with focused functionality
 * - Responsive design for consistent experience across devices
 * 
 * User Workflows:
 * 1. Conduct New Shooting Test: Player Selection → Shooting Session → Results
 * 2. Download Results: Historical Data → Export Options → CSV Download
 * 
 * Visual Design:
 * - Cavaliers wine (#6F263D) and gold (#FFB81C) color scheme
 * - Large, touch-friendly buttons for mobile accessibility
 * - Centered layout with clear visual hierarchy
 * - Professional typography matching sports application standards
 */

import React from 'react';
import './HomePage.css';

/**
 * HOME PAGE COMPONENT: Primary navigation and workflow initiation
 * 
 * Props:
 * @param {Function} onStartNewTest - Callback to initiate new shooting session workflow
 * @param {Function} onDownloadResults - Callback to access historical data and export functionality
 * 
 * State: Stateless component focusing on navigation and user flow direction
 * 
 * Accessibility Features:
 * - Semantic HTML structure for screen readers
 * - High contrast color scheme for visual accessibility
 * - Large button targets for touch interface compatibility
 * - Clear, descriptive button labels for cognitive accessibility
 */
const HomePage = ({ onStartNewTest, onDownloadResults }) => {
  return (
    <div className="home-page">
      <div className="home-content">
        {/* MAIN TITLE: Application branding and identification */}
        <h1 className="home-title">Cavs Shooting Tracker</h1>
        
        {/* PRIMARY NAVIGATION: Core application workflows */}
        <div className="home-buttons">
          {/* NEW SESSION WORKFLOW: Start fresh shooting session */}
          <button 
            className="home-button start-test-button"
            onClick={onStartNewTest}
            title="Begin a new shooting session with player selection and real-time tracking"
          >
            Conduct New Shooting Test
          </button>
          
          {/* DATA EXPORT WORKFLOW: Access historical results */}
          <button 
            className="home-button download-button"
            onClick={onDownloadResults}
            title="View, analyze, and export historical shooting session data"
          >
            Download Shooting Test Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
