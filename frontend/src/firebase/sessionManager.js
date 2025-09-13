/**
 * FIREBASE SHOOTING SESSION MANAGER
 * 
 * Purpose: High-level orchestration service for basketball shooting session management
 * Responsibilities:
 * 1. Session lifecycle management (start, pause, resume, end)
 * 2. Data persistence coordination across multiple Firebase collections
 * 3. Real-time event tracking and sequencing
 * 4. Session state validation and error recovery
 * 5. Cross-service data relationship management
 * 
 * Architecture Design:
 * - Manages relationships between players, shooting logs, shots, and session events
 * - Provides atomic operations for complex multi-step session operations
 * - Ensures data consistency across distributed Firebase collections
 * - Handles both online and offline operation scenarios
 * 
 * Data Flow:
 * Player Selection → Session Creation → Shot Recording → Session Completion → Data Export
 * 
 * Dependencies:
 * - Firebase Firestore for data persistence
 * - Service layer for individual collection operations
 * - Timezone utilities for Eastern Time consistency (Cleveland Cavaliers timezone)
 */

import { playersService, shootingLogsService, shotsService, sessionEventsService } from './services';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';
import { getEasternTimeISO } from '../utils/timezone';

/**
 * SHOOTING SESSION MANAGER: Centralized session orchestration service
 * 
 * Design Pattern: Service Object with method-based API
 * Provides high-level operations that coordinate multiple lower-level services
 * Maintains session state consistency and handles complex multi-step operations
 */
export const shootingSessionManager = {
  
  /**
   * SEQUENCE MANAGEMENT: Ensures proper ordering of session events and shots
   * 
   * Why sequencing matters:
   * - Enables reconstruction of exact shot timeline
   * - Supports undo/redo operations with proper ordering
   * - Provides data integrity for analytics and performance review
   * - Allows for real-time collaboration features in future versions
   */
  _sequenceCounter: 0,                                    // Internal counter for maintaining event order
  
  /**
   * Get next sequence number and increment counter
   * Atomic operation ensures unique sequencing across concurrent operations
   */
  getNextSequence() {
    return ++this._sequenceCounter;
  },
  
  /**
   * Reset sequence counter for new session
   * Called at session start to ensure each session begins with sequence 1
   */
  resetSequence() {
    this._sequenceCounter = 0;
  },
  
  /**
   * START SHOOTING SESSION: Initialize new basketball shooting tracking session
   * 
   * Process Flow:
   * 1. Validate and resolve player identity
   * 2. Create shooting log record for session tracking
   * 3. Initialize session state with timing information
   * 4. Return session object for real-time tracking
   * 
   * @param {string} playerID - Player identifier (can be document ID or actual playerID)
   * @returns {Object} Session object with logID, playerID, and timing information
   */
  async startShootingSession(playerID) {
    try {
      // SEQUENCE INITIALIZATION: Reset counter for clean session start
      this.resetSequence();
      
      /**
       * PLAYER ID RESOLUTION: Handle both document IDs and actual player IDs
       * 
       * Why this complexity: The UI sometimes passes Firebase document IDs
       * instead of the actual playerID field. We need to resolve the correct
       * playerID for consistent data relationships and analytics.
       * 
       * Detection Strategy:
       * - Document IDs are long random alphanumeric strings (20+ chars)
       * - Player IDs follow structured format (e.g., "player_001", "cavs_23")
       */
      let actualPlayerID = playerID;
      
      // Heuristic detection: Does this look like a Firebase document ID?
      const isDocumentId = playerID.length > 15 && /^[a-zA-Z0-9]+$/.test(playerID) && !playerID.includes('_');
      
      if (isDocumentId) {
        // Resolve document ID to actual playerID for data consistency
        const player = await playersService.getPlayerById(playerID);
        actualPlayerID = player.playerID || playerID;
      }
      
      /**
       * SHOOTING LOG CREATION: Create persistent record for session tracking
       * 
       * Shooting logs serve as:
       * - Session containers for grouping related shots
       * - Historical records for performance analysis
       * - Reference points for data export and reporting
       */
      const shootingLog = await shootingLogsService.createShootingLog({
        playerID: actualPlayerID,
        sessionDate: getEasternTimeISO()        // Eastern Time for Cleveland Cavaliers timezone
      });
      
      /**
       * SESSION STATE INITIALIZATION: Create session tracking object
       * 
       * Session data structure provides:
       * - Unique identifiers for data relationships
       * - Timing information for duration calculations
       * - Player context for analytics and reporting
       */
      const sessionData = {
        logID: shootingLog.logID,               // Reference to shooting log record
        playerID: actualPlayerID,               // Resolved player identifier
        sessionStartTime: new Date().getTime() // High-precision timestamp for duration calculations
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
      
      // Get all shots for this log
      const shots = await shotsService.getLogShots(logID);
      
      // Find the last shot from the specified zone
      const zoneShots = shots.filter(shot => shot.shotZone === zoneId);
      
      if (zoneShots.length === 0) {
        return null; // Return null instead of throwing error
      }
      
      const lastZoneShot = zoneShots[zoneShots.length - 1];
      
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
      
      // Get all shooting logs for the player - use the correct field name
      const allLogs = await shootingLogsService.getShootingLogsByPlayer(playerId);
      
      
      if (!allLogs || allLogs.length === 0) {
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
            
            const shots = await shotsService.getLogShots(log.logID);
            const sessionEvents = await sessionEventsService.getEventsByLogID(log.logID);
            
            
            const startEvent = sessionEvents.find(event => event.eventType === 'session_start');
            const endEvent = sessionEvents.find(event => event.eventType === 'session_end');
            
            // Calculate duration using maximum timer value from shots
            let duration = 'N/A';
            if (shots && shots.length > 0) {
              // Find the maximum timeTaken value which represents the session duration
              const maxTimerValue = Math.max(...shots.map(shot => shot.timeTaken || 0));
              
              // Check if timeTaken appears to be in milliseconds (> 1000 suggests milliseconds)
              // For a reasonable shooting session, seconds should be < 3600 (1 hour)
              if (maxTimerValue > 3600) {
                duration = this.formatDuration(maxTimerValue);
              } else {
                duration = this.formatDuration(maxTimerValue * 1000);
              }

            } else if (startEvent && endEvent) {
              // Fallback to session events if no shots available
              const startTime = new Date(startEvent.timestamp).getTime();
              const endTime = new Date(endEvent.timestamp).getTime();
              const durationMs = endTime - startTime;

              duration = this.formatDuration(durationMs);

            } else if (log.sessionDuration) {
              // sessionDuration is stored in seconds, formatDuration expects milliseconds

              duration = this.formatDuration(log.sessionDuration * 1000);

            }
            
            const totalShots = shots ? shots.length : 0;
            const madeShots = shots ? shots.filter(shot => shot.shotResult === 'made').length : 0;
            const accuracy = totalShots > 0 ? ((madeShots / totalShots) * 100).toFixed(1) + '%' : '0%';
            

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
        return;
      }

      const { logID } = sessionData;

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
