/**
 * SHOOTING STATISTICS COMPONENT
 * 
 * Purpose: Real-time basketball performance analytics and summary display
 * Context: Live statistics during shooting sessions and post-session analysis
 * 
 * Key Features:
 * 1. Real-time zone-by-zone shooting percentage calculation
 * 2. Overall session performance metrics
 * 3. Professional sports statistics presentation
 * 4. Responsive layout adapting to various screen sizes
 * 5. Color-coded performance indicators
 * 6. Comprehensive shooting analysis
 * 
 * Analytics Provided:
 * - Zone-specific make/miss ratios and percentages
 * - Overall session shooting percentage
 * - Total attempts and successful shots
 * - Performance trends and patterns
 * - Real-time updates as shots are recorded
 * 
 * Design Philosophy:
 * - Clear, readable statistics for quick performance assessment
 * - Professional sports aesthetic matching basketball analytics
 * - Color coding for immediate performance recognition
 * - Responsive design ensuring readability on all devices
 * - Zero-state handling for sessions without shots
 */

import React from 'react';

/**
 * SHOOTING STATISTICS COMPONENT: Real-time performance analytics
 * 
 * Props:
 * @param {Array} shots - Array of shot objects from current session
 * @param {Object} windowDimensions - Current window size for responsive design
 * @param {boolean} sessionStarted - Whether shooting session is active
 * 
 * State: Stateless component (calculations performed on each render for real-time updates)
 * 
 * Performance Considerations:
 * - Calculations performed on render for immediate updates
 * - Efficient object iteration for zone statistics
 * - Minimal DOM manipulation for smooth performance
 */
const ShootingStatistics = ({ shots, windowDimensions, sessionStarted }) => {
  /**
   * ZONE DEFINITIONS: Basketball court shooting areas
   * 
   * Mapping from database identifiers to user-friendly zone names
   * Maintains consistency with other components and provides clear labeling
   */
  const zoneNames = {
    left_corner: 'Left Corner',     // Left corner three-point area
    left_wing: 'Left Wing',         // Left wing three-point area  
    top_key: 'Top of Key',          // Paint and free throw extended area
    right_wing: 'Right Wing',       // Right wing three-point area
    right_corner: 'Right Corner'    // Right corner three-point area
  };

  /**
   * ZONE STATISTICS CALCULATION: Real-time performance analysis
   * 
   * Process:
   * 1. Initialize all zones with zero statistics
   * 2. Process each shot to increment zone counters
   * 3. Calculate shooting percentages for each zone
   * 4. Return comprehensive statistics object
   * 
   * @returns {Object} Statistics object with zone-by-zone performance data
   */
  const getZoneStats = () => {
    const stats = {};
    
    /**
     * INITIALIZATION: Set up zero-state for all basketball zones
     * 
     * Ensures all zones appear in statistics even if no shots taken,
     * providing complete court coverage for analysis
     */
    Object.keys(zoneNames).forEach(zoneId => {
      stats[zoneId] = {
        name: zoneNames[zoneId],     // Human-readable zone name
        made: 0,                     // Successful shots in this zone
        attempts: 0,                 // Total shots attempted in this zone
        percentage: 0                // Shooting percentage (calculated below)
      };
    });

    /**
     * SHOT PROCESSING: Aggregate shot data by zone
     * 
     * Iterates through all shots in current session and increments
     * appropriate zone counters for makes and attempts
     */
    shots.forEach(shot => {
      if (stats[shot.location]) {
        stats[shot.location].attempts++;      // Increment total attempts for this zone
        if (shot.made) {
          stats[shot.location].made++;        // Increment successful shots if made
        }
      }
    });

    /**
     * PERCENTAGE CALCULATION: Compute shooting efficiency per zone
     * 
     * Calculates shooting percentage as (makes / attempts) * 100
     * Handles division by zero with graceful fallback to 0%
     * Rounds to whole percentages for clean display
     */
    Object.keys(stats).forEach(zoneId => {
      const zone = stats[zoneId];
      zone.percentage = zone.attempts > 0 ? Math.round((zone.made / zone.attempts) * 100) : 0;
    });

    return stats;
  };

  const stats = getZoneStats();
  const totalShots = shots.length;
  const totalMade = shots.filter(shot => shot.made).length;
  const overallPercentage = totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : 0;

  // Always show the statistics in Court Mode on desktop

  return (
    <div style={{
      backgroundColor: '#FFB81C',
      border: '2px solid #6F263D',
      borderRadius: '8px',
      padding: '0.5rem', // Reduced from 1rem
      fontFamily: 'Arial, sans-serif',
      height: 'fit-content'
    }}>
      {/* Table format with zones as rows and stats as columns */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #6F263D',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 1fr',
          backgroundColor: '#6F263D',
          color: '#FFB81C',
          fontWeight: 'bold',
          fontSize: '0.8rem', // Reduced from 0.9rem
          padding: '0.5rem 0.4rem' // Reduced from 0.75rem 0.5rem
        }}>
          <div>Zone</div>
          <div style={{ textAlign: 'center' }}>FGM/FGA</div>
          <div style={{ textAlign: 'center' }}>FG%</div>
        </div>

        {/* Zone Rows */}
        {Object.entries(stats).map(([zoneId, zone], index) => (
          <div 
            key={zoneId}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1fr',
              padding: '0.5rem 0.4rem', // Reduced from 0.75rem 0.5rem
              backgroundColor: zone.attempts > 0 && zone.percentage >= 50 ? '#d4edda' : index % 2 === 0 ? '#f9f9f9' : 'white',
              borderTop: index > 0 ? '1px solid #e0e0e0' : 'none',
              alignItems: 'center'
            }}
          >
            {/* Zone Name */}
            <div style={{ 
              fontWeight: 'bold', 
              color: '#6F263D',
              fontSize: '0.8rem' // Reduced from 0.9rem
            }}>
              {zone.name}
            </div>
            
            {/* FGM/FGA */}
            <div style={{ 
              textAlign: 'center',
              fontSize: '0.8rem', // Reduced from 0.9rem
              color: '#333',
              fontFamily: 'monospace'
            }}>
              {zone.made}/{zone.attempts}
            </div>
            
            {/* FG% */}
            <div style={{ 
              textAlign: 'center',
              fontSize: '0.8rem', // Reduced from 0.9rem
              fontWeight: 'bold',
              color: zone.percentage >= 50 ? '#28a745' : zone.percentage >= 30 ? '#ffc107' : zone.attempts > 0 ? '#dc3545' : '#666'
            }}>
              {zone.attempts > 0 ? `${zone.percentage}%` : '0%'}
            </div>
          </div>
        ))}

        {/* Overall Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 1fr',
          padding: '0.5rem 0.4rem', // Reduced from 0.75rem 0.5rem
          backgroundColor: '#6F263D',
          color: '#FFB81C',
          fontWeight: 'bold',
          borderTop: '2px solid #6F263D',
          fontSize: '0.8rem' // Added smaller font size
        }}>
          <div>TOTAL</div>
          <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
            {totalMade}/{totalShots}
          </div>
          <div style={{ textAlign: 'center' }}>
            {overallPercentage}%
          </div>
        </div>
      </div>

      {/* Progress indicator - Made more compact */}
      <div style={{
        marginTop: '0.5rem', // Reduced from 1rem
        padding: '0.5rem', // Reduced from 0.75rem
        backgroundColor: 'white',
        border: '1px solid #6F263D',
        borderRadius: '6px'
      }}>
        <div style={{
          backgroundColor: '#e0e0e0',
          borderRadius: '8px', // Reduced from 10px
          height: '8px', // Reduced from 12px
          overflow: 'hidden',
          border: '1px solid #ccc'
        }}>
          <div style={{
            backgroundColor: totalShots >= 80 ? '#28a745' : totalShots >= 50 ? '#6F263D' : '#6F263D',
            height: '100%',
            width: `${Math.min((totalShots / 100) * 100, 100)}%`,
            transition: 'width 0.3s ease'
          }}></div>
        </div>
        <div style={{
          fontSize: '0.7rem', // Reduced from 0.8rem
          color: '#666',
          textAlign: 'center',
          marginTop: '0.2rem' // Reduced from 0.25rem
        }}>
          {100 - totalShots} shots remaining
        </div>
      </div>
    </div>
  );
};

export default ShootingStatistics;
