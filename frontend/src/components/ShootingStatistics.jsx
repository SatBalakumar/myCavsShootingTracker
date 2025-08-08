import React from 'react';

const ShootingStatistics = ({ shots, windowDimensions, sessionStarted }) => {
  // Zone information
  const zoneNames = {
    left_corner: 'Left Corner',
    left_wing: 'Left Wing',
    top_key: 'Top of Key',
    right_wing: 'Right Wing',
    right_corner: 'Right Corner'
  };

  // Calculate zone statistics
  const getZoneStats = () => {
    const stats = {};
    
    // Initialize all zones
    Object.keys(zoneNames).forEach(zoneId => {
      stats[zoneId] = {
        name: zoneNames[zoneId],
        made: 0,
        attempts: 0,
        percentage: 0
      };
    });

    // Count shots by zone
    shots.forEach(shot => {
      if (stats[shot.location]) {
        stats[shot.location].attempts++;
        if (shot.made) {
          stats[shot.location].made++;
        }
      }
    });

    // Calculate percentages
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
