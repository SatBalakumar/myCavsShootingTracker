import { playersService, shootingLogsService, shotsService, sessionEventsService } from './services';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';
import { getEasternTimeISO } from '../utils/timezone';

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
      
      // Get the actual playerID from the player document (in case we're passed a document ID)
      let actualPlayerID = playerID;
      
      // Check if this looks like a Firebase document ID (random string format)
      // Document IDs are typically 20+ characters of random alphanumeric
      const isDocumentId = playerID.length > 15 && /^[a-zA-Z0-9]+$/.test(playerID) && !playerID.includes('_');
      
      if (isDocumentId) {
        // This might be a document ID, so let's get the actual playerID
        const player = await playersService.getPlayerById(playerID);
        actualPlayerID = player.playerID || playerID;
      }
      
      // Create a new shooting log with the actual playerID
      const shootingLog = await shootingLogsService.createShootingLog({
        playerID: actualPlayerID,
        sessionDate: getEasternTimeISO()
      });
      
      const sessionData = {
        logID: shootingLog.logID,
        playerID: actualPlayerID,
        sessionStartTime: new Date().getTime()
      };
      
      // Log session start event
      await sessionEventsService.addEvent({
        logID: shootingLog.logID,
        playerID: actualPlayerID,
        eventType: 'session_start',
        eventData: {
          playerID: actualPlayerID,
          sessionDate: getEasternTimeISO()
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
          pausedAt: getEasternTimeISO()
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
          resumedAt: getEasternTimeISO(),
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
          endedAt: getEasternTimeISO(),
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
  },

  // Get all players for download interface
  async getAllPlayers() {
    try {
      return await playersService.getAllPlayers();
    } catch (error) {
      console.error('Error getting all players:', error);
      throw error;
    }
  },

  // Get player sessions in date range
  async getPlayerSessions({ playerId, startDate, endDate }) {
    try {
      console.log('SessionManager: Getting sessions for playerId:', playerId);
      
      // Get all shooting logs for the player - use the correct field name
      const allLogs = await shootingLogsService.getShootingLogsByPlayer(playerId);
      
      console.log('SessionManager: Found logs:', allLogs.length);
      
      if (!allLogs || allLogs.length === 0) {
        console.log('SessionManager: No logs found for this player');
        return [];
      }

      // Filter by date range if provided
      let filteredLogs = allLogs;
      if (startDate || endDate) {
        filteredLogs = allLogs.filter(log => {
          const sessionDate = new Date(log.sessionDate);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          
          if (start && end) {
            return sessionDate >= start && sessionDate <= end;
          } else if (start) {
            return sessionDate >= start;
          } else if (end) {
            return sessionDate <= end;
          }
          return true;
        });
      }

      // Enrich with session statistics
      const enrichedSessions = await Promise.all(
        filteredLogs.map(async (log) => {
          try {
            console.log(`Processing session ${log.logID} for enrichment`);
            
            const shots = await shotsService.getLogShots(log.logID);
            const sessionEvents = await sessionEventsService.getEventsByLogID(log.logID);
            
            console.log(`Session ${log.logID}: Found ${shots ? shots.length : 0} shots, ${sessionEvents ? sessionEvents.length : 0} events`);
            
            const startEvent = sessionEvents.find(event => event.eventType === 'session_start');
            const endEvent = sessionEvents.find(event => event.eventType === 'session_end');
            
            // Calculate duration using maximum timer value from shots
            let duration = 'N/A';
            if (shots && shots.length > 0) {
              // Find the maximum timeTaken value which represents the session duration
              const maxTimerValue = Math.max(...shots.map(shot => shot.timeTaken || 0));
              console.log(`Duration calculation - maxTimerValue: ${maxTimerValue}`);
              
              // Check if timeTaken appears to be in milliseconds (> 1000 suggests milliseconds)
              // For a reasonable shooting session, seconds should be < 3600 (1 hour)
              if (maxTimerValue > 3600) {
                console.log(`timeTaken appears to be in milliseconds`);
                duration = this.formatDuration(maxTimerValue);
              } else {
                console.log(`timeTaken appears to be in seconds`);
                duration = this.formatDuration(maxTimerValue * 1000);
              }
              console.log(`Duration calculation - formatted duration: ${duration}`);
            } else if (startEvent && endEvent) {
              // Fallback to session events if no shots available
              const startTime = new Date(startEvent.timestamp).getTime();
              const endTime = new Date(endEvent.timestamp).getTime();
              const durationMs = endTime - startTime;
              console.log(`Duration calculation - event-based duration: ${durationMs}ms`);
              duration = this.formatDuration(durationMs);
              console.log(`Duration calculation - formatted duration: ${duration}`);
            } else if (log.sessionDuration) {
              // sessionDuration is stored in seconds, formatDuration expects milliseconds
              console.log(`Duration calculation - log.sessionDuration: ${log.sessionDuration} seconds`);
              duration = this.formatDuration(log.sessionDuration * 1000);
              console.log(`Duration calculation - formatted duration: ${duration}`);
            }
            
            const totalShots = shots ? shots.length : 0;
            const madeShots = shots ? shots.filter(shot => shot.shotResult === 'made').length : 0;
            const accuracy = totalShots > 0 ? ((madeShots / totalShots) * 100).toFixed(1) + '%' : '0%';
            
            console.log(`Session ${log.logID}: Duration=${duration}, Shots=${totalShots}, Made=${madeShots}, Accuracy=${accuracy}`);
            
            return {
              sessionId: log.logID,
              playerId: log.playerID,
              startTime: log.sessionDate,
              duration: duration,
              totalShots: totalShots,
              madeShots: madeShots,
              accuracy: accuracy
            };
          } catch (error) {
            console.error(`Error enriching session ${log.logID}:`, error);
            return {
              sessionId: log.logID,
              playerId: log.playerID,
              startTime: log.sessionDate,
              duration: 'N/A',
              totalShots: 0,
              madeShots: 0,
              accuracy: '0%'
            };
          }
        })
      );

      return enrichedSessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    } catch (error) {
      console.error('Error getting player sessions:', error);
      throw error;
    }
  },

  // Get shots for a specific session
  async getSessionShots(sessionId) {
    try {
      return await shotsService.getLogShots(sessionId);
    } catch (error) {
      console.error('Error getting session shots:', error);
      throw error;
    }
  },

  // Discard a session (delete all related data)
  async discardSession(sessionData) {
    try {
      if (!sessionData || !sessionData.logID) {
        console.log('No session to discard');
        return;
      }

      const { logID } = sessionData;
      console.log('Discarding session with logID:', logID);

      // Delete all shots for this session
      const shots = await shotsService.getLogShots(logID);
      for (const shot of shots) {
        await shotsService.deleteShot(shot.shotID);
      }

      // Delete all session events for this session
      const events = await sessionEventsService.getEventsByLogID(logID);
      for (const event of events) {
        await sessionEventsService.deleteEvent(event.eventID);
      }

      // Delete the shooting log itself
      await shootingLogsService.deleteShootingLog(logID);

      console.log('Session discarded successfully');
    } catch (error) {
      console.error('Error discarding session:', error);
      throw error;
    }
  },

  // Helper method to format duration
  formatDuration(milliseconds) {
    if (!milliseconds) return 'N/A';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};
