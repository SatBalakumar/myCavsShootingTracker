import { playersService, shootingLogsService, shotsService, sessionEventsService } from './services';

// High-level service to manage shooting sessions with proper relationships and event tracking
export const shootingSessionManager = {
  
  // Internal sequence counter for events and shots
  _sequenceCounter: 0,
  
  // Helper method to get and increment sequence
  getNextSequence() {
    return ++this._sequenceCounter;
  },
  
  // Reset sequence counter for new session
  resetSequence() {
    this._sequenceCounter = 0;
  },
  
  // Start a new shooting session
  async startShootingSession(playerID) {
    try {
      // Reset sequence counter for new session
      this.resetSequence();
      
      // Create a new shooting log
      const shootingLog = await shootingLogsService.createShootingLog({
        playerID: playerID,
        sessionDate: new Date().toISOString()
      });
      
      const sessionData = {
        logID: shootingLog.logID,
        playerID: playerID,
        sessionStartTime: new Date().getTime()
      };
      
      // Log session start event
      await sessionEventsService.addEvent({
        logID: shootingLog.logID,
        playerID: playerID,
        eventType: 'session_start',
        eventData: {
          playerID: playerID,
          sessionDate: new Date().toISOString()
        },
        sessionElapsedTime: 0,
        sequenceNumber: this.getNextSequence()
      });
      
      console.log('Session started with event logging:', sessionData);
      return sessionData;
    } catch (error) {
      console.error('Error starting shooting session:', error);
      throw error;
    }
  },

  // Record a shot
  async recordShot(sessionData, shotData) {
    try {
      const { logID, playerID, sessionStartTime } = sessionData;
      
      // Calculate elapsed time since session start
      const currentTime = new Date().getTime();
      const elapsedTime = Math.floor((currentTime - sessionStartTime) / 1000);
      
      // Add the shot to the shots collection
      const shot = await shotsService.addShot({
        logID: logID,
        playerID: playerID,
        shotResult: shotData.made ? 'made' : 'missed',
        shotZone: shotData.location,
        timeTaken: shotData.timeTaken || elapsedTime,
        sequenceNumber: this.getNextSequence()
      });

      // Log shot event
      await sessionEventsService.addEvent({
        logID: logID,
        playerID: playerID,
        eventType: shotData.made ? 'shot_made' : 'shot_missed',
        eventData: {
          shotID: shot.shotID,
          shotZone: shotData.location,
          shotResult: shotData.made ? 'made' : 'missed',
          timeTaken: shotData.timeTaken || elapsedTime
        },
        sessionElapsedTime: elapsedTime,
        sequenceNumber: this._sequenceCounter // Use current sequence since shot already incremented it
      });

      // Get current shooting log
      const currentLog = await shootingLogsService.getShootingLog(logID);
      
      // Update shooting log with new shot ID
      const updatedShots = [...currentLog.shots, shot.shotID];
      
      // Calculate updated stats
      const newStats = this.calculateStats(currentLog, shotData);
      
      // Update the shooting log
      await shootingLogsService.updateShootingLogStats(logID, {
        shots: updatedShots,
        totalShots: newStats.totalShots,
        totalMade: newStats.totalMade,
        totalMissed: newStats.totalMissed,
        accuracy: newStats.accuracy,
        zoneStats: newStats.zoneStats
      });

      console.log('Shot recorded with event:', shot);
      return shot;
    } catch (error) {
      console.error('Error recording shot:', error);
      throw error;
    }
  },

  // Log session pause event
  async pauseSession(sessionData) {
    try {
      const { logID, playerID, sessionStartTime } = sessionData;
      const currentTime = new Date().getTime();
      const elapsedTime = Math.floor((currentTime - sessionStartTime) / 1000);
      
      await sessionEventsService.addEvent({
        logID: logID,
        playerID: playerID,
        eventType: 'session_pause',
        eventData: {
          pausedAt: new Date().toISOString()
        },
        sessionElapsedTime: elapsedTime,
        sequenceNumber: this.getNextSequence()
      });
      
      console.log('Session pause event logged');
    } catch (error) {
      console.error('Error logging pause event:', error);
      throw error;
    }
  },

  // Log session resume event
  async resumeSession(sessionData, totalPausedTime = 0) {
    try {
      const { logID, playerID, sessionStartTime } = sessionData;
      const currentTime = new Date().getTime();
      const elapsedTime = Math.floor((currentTime - sessionStartTime) / 1000) - totalPausedTime;
      
      await sessionEventsService.addEvent({
        logID: logID,
        playerID: playerID,
        eventType: 'session_resume',
        eventData: {
          resumedAt: new Date().toISOString(),
          totalPausedTime: totalPausedTime
        },
        sessionElapsedTime: elapsedTime,
        sequenceNumber: this.getNextSequence()
      });
      
      console.log('Session resume event logged');
    } catch (error) {
      console.error('Error logging resume event:', error);
      throw error;
    }
  },

  // End shooting session and log final event
  async endShootingSession(sessionData, finalStats = {}) {
    try {
      const { logID, playerID, sessionStartTime } = sessionData;
      const currentTime = new Date().getTime();
      const totalSessionTime = Math.floor((currentTime - sessionStartTime) / 1000);
      
      // Log session end event
      await sessionEventsService.addEvent({
        logID: logID,
        playerID: playerID,
        eventType: 'session_end',
        eventData: {
          endedAt: new Date().toISOString(),
          totalSessionTime: totalSessionTime,
          finalStats: finalStats
        },
        sessionElapsedTime: totalSessionTime,
        sequenceNumber: this.getNextSequence()
      });
      
      // Update final session duration in the shooting log
      await shootingLogsService.updateShootingLogStats(logID, {
        sessionDuration: totalSessionTime,
        ...finalStats
      });
      
      console.log('Session ended with event logging');
      return { logID, totalSessionTime };
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  },

  // Log undo shot event
  async undoLastShot(sessionData, zoneId) {
    try {
      // Validate session data
      if (!sessionData || !sessionData.logID || !sessionData.playerID) {
        throw new Error('Invalid session data provided');
      }

      const { logID, playerID, sessionStartTime } = sessionData;
      const currentTime = new Date().getTime();
      const elapsedTime = Math.floor((currentTime - sessionStartTime) / 1000);
      
      console.log('Attempting to undo shot for zone:', zoneId, 'in session:', logID);
      
      // Get all shots for this log
      const shots = await shotsService.getLogShots(logID);
      console.log('Found shots:', shots.length);
      
      // Find the last shot from the specified zone
      const zoneShots = shots.filter(shot => shot.shotZone === zoneId);
      console.log('Zone shots found:', zoneShots.length, 'for zone:', zoneId);
      
      if (zoneShots.length === 0) {
        console.log('No shots found for zone:', zoneId);
        return null; // Return null instead of throwing error
      }
      
      const lastZoneShot = zoneShots[zoneShots.length - 1];
      console.log('Last zone shot to undo:', lastZoneShot.shotID);
      
      // Log undo event before deleting the shot
      await sessionEventsService.addEvent({
        logID: logID,
        playerID: playerID,
        eventType: 'shot_undo',
        eventData: {
          undoShotID: lastZoneShot.shotID,
          undoShotZone: zoneId,
          undoShotResult: lastZoneShot.shotResult
        },
        sessionElapsedTime: elapsedTime,
        sequenceNumber: this.getNextSequence()
      });
      
      // Delete the shot
      await shotsService.deleteShot(lastZoneShot.shotID);
      console.log('Shot deleted successfully');
      
      // Update shooting log
      const currentLog = await shootingLogsService.getShootingLog(logID);
      const updatedShots = currentLog.shots.filter(shotID => shotID !== lastZoneShot.shotID);
      
      // Recalculate stats
      const remainingShots = shots.filter(shot => shot.shotID !== lastZoneShot.shotID);
      const newStats = this.recalculateStatsFromShots(remainingShots);
      
      await shootingLogsService.updateShootingLogStats(logID, {
        shots: updatedShots,
        ...newStats
      });

      console.log('Shot undone with event logging:', lastZoneShot);
      return { undoShot: lastZoneShot, newStats };
    } catch (error) {
      console.error('Error undoing shot:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  },

  // Helper method to calculate stats
  calculateStats(currentLog, newShot) {
    const stats = {
      totalShots: currentLog.totalShots + 1,
      totalMade: currentLog.totalMade + (newShot.made ? 1 : 0),
      totalMissed: currentLog.totalMissed + (newShot.made ? 0 : 1),
      zoneStats: { ...currentLog.zoneStats }
    };

    // Update zone stats
    if (!stats.zoneStats[newShot.location]) {
      stats.zoneStats[newShot.location] = { made: 0, attempts: 0 };
    }
    
    stats.zoneStats[newShot.location].attempts += 1;
    if (newShot.made) {
      stats.zoneStats[newShot.location].made += 1;
    }

    stats.accuracy = stats.totalShots > 0 ? stats.totalMade / stats.totalShots : 0;

    return stats;
  },

  // Helper method to recalculate stats from shot array
  recalculateStatsFromShots(shots) {
    const stats = {
      totalShots: shots.length,
      totalMade: 0,
      totalMissed: 0,
      zoneStats: {
        left_corner: { made: 0, attempts: 0 },
        left_wing: { made: 0, attempts: 0 },
        top_key: { made: 0, attempts: 0 },
        right_wing: { made: 0, attempts: 0 },
        right_corner: { made: 0, attempts: 0 }
      }
    };

    shots.forEach(shot => {
      if (shot.shotResult === 'made') {
        stats.totalMade += 1;
        stats.zoneStats[shot.shotZone].made += 1;
      } else {
        stats.totalMissed += 1;
      }
      stats.zoneStats[shot.shotZone].attempts += 1;
    });

    stats.accuracy = stats.totalShots > 0 ? stats.totalMade / stats.totalShots : 0;

    return stats;
  },

  // Get complete session timeline with events and shots
  async getSessionTimeline(logID) {
    try {
      return await sessionEventsService.getSessionTimeline(logID);
    } catch (error) {
      console.error('Error getting session timeline:', error);
      throw error;
    }
  },

  // Get session events by type
  async getSessionEventsByType(logID, eventType) {
    try {
      return await sessionEventsService.getEventsByType(logID, eventType);
    } catch (error) {
      console.error('Error getting events by type:', error);
      throw error;
    }
  }
};
