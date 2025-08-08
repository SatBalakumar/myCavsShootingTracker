import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from './config';
import { getEasternTimeISO } from '../utils/timezone';

// Collection references
const PLAYERS_COLLECTION = 'playerInformation';
const SHOOTING_LOGS_COLLECTION = 'shootingLogs';
const SHOTS_COLLECTION = 'shots';
const SESSION_EVENTS_COLLECTION = 'sessionEvents';

// Player operations
export const playersService = {
  // Get all players
  async getAllPlayers() {
    try {
      const playersRef = collection(db, PLAYERS_COLLECTION);
      
      // Use simple query to avoid index issues, then sort in JavaScript
      const querySnapshot = await getDocs(playersRef);
      
      const players = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by jersey number, then by name for players without jersey numbers
      return players.sort((a, b) => {
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
    } catch (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
  },

  // Add a new player
  async addPlayer(playerData) {
    try {
      const playersRef = collection(db, PLAYERS_COLLECTION);
      
      // Generate unique player ID
      const playerID = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const docRef = await addDoc(playersRef, {
        playerID: playerID,
        name: playerData.name,
        jerseyNumber: playerData.jerseyNumber || null,
        position: playerData.position || '',
        isActive: playerData.isActive !== undefined ? playerData.isActive : true,
        shootingLogs: []                // Array to store logIDs of saved shooting logs
      });
      
      return { id: docRef.id, playerID, ...playerData };
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  },

  // Get player by document ID
  async getPlayerById(playerId) {
    try {
      const playerRef = doc(db, PLAYERS_COLLECTION, playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (!playerDoc.exists()) {
        throw new Error('Player not found');
      }
      
      return {
        id: playerDoc.id,
        ...playerDoc.data()
      };
    } catch (error) {
      console.error('Error fetching player by ID:', error);
      throw error;
    }
  },

  // Update player
  async updatePlayer(playerId, updates) {
    try {
      const playerRef = doc(db, PLAYERS_COLLECTION, playerId);
      await updateDoc(playerRef, updates);
      
      return { id: playerId, ...updates };
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  },

  // Delete player
  async deletePlayer(playerId) {
    try {
      const playerRef = doc(db, PLAYERS_COLLECTION, playerId);
      await deleteDoc(playerRef);
    } catch (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  },

  // Get active players only
  async getActivePlayers() {
    try {
      const playersRef = collection(db, PLAYERS_COLLECTION);
      
      // First try a simple query without compound indexes
      const simpleQuery = query(playersRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(simpleQuery);
      
      const players = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by jersey number, then by name for players without jersey numbers
      return players.sort((a, b) => {
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
    } catch (error) {
      console.error('Error fetching active players:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Fallback: try getting all players if the where query fails
      try {
        console.log('Trying fallback query - getting all players...');
        const fallbackQuery = query(playersRef);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const allPlayers = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter active players in JavaScript and sort by jersey number
        const activePlayers = allPlayers.filter(player => player.isActive !== false);
        return activePlayers.sort((a, b) => {
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
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  },

  // Test function to verify Firebase connection
  async testConnection() {
    try {
      console.log('Testing Firebase connection...');
      const playersRef = collection(db, PLAYERS_COLLECTION);
      const snapshot = await getDocs(playersRef);
      
      console.log('Connection successful!');
      console.log('Number of documents:', snapshot.size);
      console.log('Documents:', snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
      
      return { success: true, count: snapshot.size };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// Shooting logs operations
export const shootingLogsService = {
  // Create a new shooting log
  async createShootingLog(logData) {
    try {
      const logsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      
      // Generate unique log ID
      const logID = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const docRef = await addDoc(logsRef, {
        logID: logID,
        playerID: logData.playerID,
        sessionDate: logData.sessionDate || getEasternTimeISO(),
        sessionDuration: logData.sessionDuration || 0,
        totalShots: 0,
        totalMade: 0,
        totalMissed: 0,
        accuracy: 0,
        shots: [],                       // Initialize empty array
        zoneStats: {
          left_corner: { made: 0, attempts: 0 },
          left_wing: { made: 0, attempts: 0 },
          top_key: { made: 0, attempts: 0 },
          right_wing: { made: 0, attempts: 0 },
          right_corner: { made: 0, attempts: 0 }
        },
        createdAt: getEasternTimeISO()
      });
      
      // Update the player's shootingLogs array with the new logID
      try {
        const playersRef = collection(db, PLAYERS_COLLECTION);
        const playerQuery = query(playersRef, where('playerID', '==', logData.playerID));
        const playerSnapshot = await getDocs(playerQuery);
        
        if (!playerSnapshot.empty) {
          const playerDoc = playerSnapshot.docs[0];
          const currentLogs = playerDoc.data().shootingLogs || [];
          
          // Add the new logID to the player's shootingLogs array
          await updateDoc(doc(db, PLAYERS_COLLECTION, playerDoc.id), {
            shootingLogs: [...currentLogs, logID]
          });
          
          console.log(`Updated player ${logData.playerID} with new shooting log: ${logID}`);
        } else {
          console.warn(`Player with ID ${logData.playerID} not found when trying to update shootingLogs`);
        }
      } catch (updateError) {
        console.error('Error updating player shootingLogs:', updateError);
        // Don't throw here - the log was created successfully, just the player update failed
      }
      
      return { id: docRef.id, logID, ...logData };
    } catch (error) {
      console.error('Error creating shooting log:', error);
      throw error;
    }
  },

  // Get shooting log by ID
  async getShootingLog(logID) {
    try {
      const logsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      const q = query(logsRef, where('logID', '==', logID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Shooting log not found');
      }
      
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error fetching shooting log:', error);
      throw error;
    }
  },

  // Update shooting log stats
  async updateShootingLogStats(logID, stats) {
    try {
      const logsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      const q = query(logsRef, where('logID', '==', logID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Shooting log not found');
      }
      
      const docRef = doc(db, SHOOTING_LOGS_COLLECTION, querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...stats,
        updatedAt: getEasternTimeISO()
      });
      
      return { logID, ...stats };
    } catch (error) {
      console.error('Error updating shooting log stats:', error);
      throw error;
    }
  },

  // Get all logs for a player
  async getPlayerLogs(playerID) {
    try {
      const logsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      
      // First try with orderBy
      try {
        const q = query(
          logsRef,
          where('playerID', '==', playerID),
          orderBy('sessionDate', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        console.log('Index not available for player logs, falling back to simple query...');
        
        // Fallback: simple query without orderBy, then sort in JavaScript
        const simpleQuery = query(logsRef, where('playerID', '==', playerID));
        const querySnapshot = await getDocs(simpleQuery);
        
        const logs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in JavaScript instead of Firestore (most recent first)
        return logs.sort((a, b) => new Date(b.sessionDate || 0) - new Date(a.sessionDate || 0));
      }
    } catch (error) {
      console.error('Error fetching player logs:', error);
      throw error;
    }
  },

  // Get shooting logs by player ID
  async getShootingLogsByPlayer(playerID) {
    try {
      console.log('Services: Searching for shooting logs with playerID:', playerID);
      const logsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      
      // Search using the correct field name: playerID (not playerId)
      let q = query(logsRef, where('playerID', '==', playerID));
      let querySnapshot = await getDocs(q);
      
      console.log('Services: Found', querySnapshot.size, 'logs for playerID:', playerID);
      
      if (querySnapshot.empty) {
        console.log(`Services: No shooting logs found for player: ${playerID}`);
        return [];
      }
      
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Services: Returning ${logs.length} logs for player: ${playerID}`);
      
      // Sort by session date (most recent first)
      return logs.sort((a, b) => new Date(b.sessionDate || 0) - new Date(a.sessionDate || 0));
    } catch (error) {
      console.error('Error fetching shooting logs by player:', error);
      throw error;
    }
  },

  // Delete shooting log
  async deleteShootingLog(logID) {
    try {
      const logsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      const q = query(logsRef, where('logID', '==', logID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('Shooting log not found for deletion');
        return;
      }
      
      // Delete the document
      const docRef = doc(db, SHOOTING_LOGS_COLLECTION, querySnapshot.docs[0].id);
      await deleteDoc(docRef);
      
      console.log('Shooting log deleted successfully');
    } catch (error) {
      console.error('Error deleting shooting log:', error);
      throw error;
    }
  }
};

// Shots operations
export const shotsService = {
  // Add a new shot
  async addShot(shotData) {
    try {
      const shotsRef = collection(db, SHOTS_COLLECTION);
      
      // Generate unique shot ID
      const shotID = `shot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const docRef = await addDoc(shotsRef, {
        shotID: shotID,
        logID: shotData.logID,
        playerID: shotData.playerID,
        shotResult: shotData.shotResult,    // "made" or "missed"
        shotZone: shotData.shotZone,
        timeTaken: shotData.timeTaken || 0,
        timestamp: getEasternTimeISO(),
        sequenceNumber: shotData.sequenceNumber || 1
      });
      
      return { id: docRef.id, shotID, ...shotData };
    } catch (error) {
      console.error('Error adding shot:', error);
      throw error;
    }
  },

  // Get all shots for a shooting log
  async getLogShots(logID) {
    try {
      const shotsRef = collection(db, SHOTS_COLLECTION);
      
      // First try with orderBy
      try {
        const q = query(
          shotsRef,
          where('logID', '==', logID),
          orderBy('sequenceNumber', 'asc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        console.log('Index not available, falling back to simple query...');
        
        // Fallback: simple query without orderBy, then sort in JavaScript
        const simpleQuery = query(shotsRef, where('logID', '==', logID));
        const querySnapshot = await getDocs(simpleQuery);
        
        const shots = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in JavaScript instead of Firestore
        return shots.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
      }
    } catch (error) {
      console.error('Error fetching log shots:', error);
      throw error;
    }
  },

  // Delete a shot (for undo functionality)
  async deleteShot(shotID) {
    try {
      const shotsRef = collection(db, SHOTS_COLLECTION);
      const q = query(shotsRef, where('shotID', '==', shotID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Shot not found');
      }
      
      const shotDoc = querySnapshot.docs[0];
      await deleteDoc(doc(db, SHOTS_COLLECTION, shotDoc.id));
      
      return { shotID };
    } catch (error) {
      console.error('Error deleting shot:', error);
      throw error;
    }
  }
};

// Legacy shooting session operations (keep for compatibility)
export const shootingSessionsService = {
  // Save shooting session
  async saveShootingSession(sessionData) {
    try {
      const sessionsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      const docRef = await addDoc(sessionsRef, {
        playerId: sessionData.playerId,
        playerName: sessionData.playerName,
        shots: sessionData.shots,
        totalShots: sessionData.totalShots,
        totalMade: sessionData.totalMade,
        totalMissed: sessionData.totalMissed,
        accuracy: sessionData.accuracy,
        sessionDuration: sessionData.sessionDuration,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        zoneStats: sessionData.zoneStats,
        createdAt: getEasternTimeISO()
      });
      
      return { id: docRef.id, ...sessionData };
    } catch (error) {
      console.error('Error saving shooting session:', error);
      throw error;
    }
  },

  // Get sessions for a specific player
  async getPlayerSessions(playerId) {
    try {
      const sessionsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      const q = query(
        sessionsRef,
        where('playerId', '==', playerId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching player sessions:', error);
      throw error;
    }
  },

  // Get all sessions
  async getAllSessions() {
    try {
      const sessionsRef = collection(db, SHOOTING_LOGS_COLLECTION);
      const q = query(sessionsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching all sessions:', error);
      throw error;
    }
  },

  // Get shots by log ID
  async getShotsByLogID(logID) {
    try {
      const shotsRef = collection(db, SHOTS_COLLECTION);
      const q = query(shotsRef, where('logID', '==', logID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      const shots = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by timestamp
      return shots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.error('Error fetching shots by log ID:', error);
      throw error;
    }
  }
};

// Session Events operations - Track all session activities
export const sessionEventsService = {
  // Add a session event
  async addEvent(eventData) {
    try {
      const eventsRef = collection(db, SESSION_EVENTS_COLLECTION);
      
      // Generate unique event ID
      const eventID = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const docRef = await addDoc(eventsRef, {
        eventID: eventID,
        logID: eventData.logID,
        playerID: eventData.playerID,
        eventType: eventData.eventType,      // 'session_start', 'session_pause', 'session_resume', 'session_end', 'shot_made', 'shot_missed', 'shot_undo'
        eventData: eventData.eventData || {}, // Additional event-specific data
        timestamp: getEasternTimeISO(),
        sessionElapsedTime: eventData.sessionElapsedTime || 0, // Time since session started (in seconds)
        sequenceNumber: eventData.sequenceNumber || 1
      });
      
      return { id: docRef.id, eventID, ...eventData };
    } catch (error) {
      console.error('Error adding session event:', error);
      throw error;
    }
  },

  // Get all events for a shooting log (session timeline)
  async getSessionEvents(logID) {
    try {
      const eventsRef = collection(db, SESSION_EVENTS_COLLECTION);
      
      // First try with orderBy
      try {
        const q = query(
          eventsRef,
          where('logID', '==', logID),
          orderBy('sequenceNumber', 'asc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        console.log('Index not available for events, falling back to simple query...');
        
        // Fallback: simple query without orderBy, then sort in JavaScript
        const simpleQuery = query(eventsRef, where('logID', '==', logID));
        const querySnapshot = await getDocs(simpleQuery);
        
        const events = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in JavaScript instead of Firestore
        return events.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
      }
    } catch (error) {
      console.error('Error fetching session events:', error);
      throw error;
    }
  },

  // Get events by type for analysis
  async getEventsByType(logID, eventType) {
    try {
      const eventsRef = collection(db, SESSION_EVENTS_COLLECTION);
      
      // Use simple query to avoid compound index requirement
      const q = query(eventsRef, where('logID', '==', logID));
      const querySnapshot = await getDocs(q);
      
      // Filter and sort in JavaScript
      const events = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(event => event.eventType === eventType)
        .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
      
      return events;
    } catch (error) {
      console.error('Error fetching events by type:', error);
      throw error;
    }
  },

  // Get session timeline with events and shots combined
  async getSessionTimeline(logID) {
    try {
      const [events, shots] = await Promise.all([
        this.getSessionEvents(logID),
        shotsService.getLogShots(logID)
      ]);
      
      // Combine and sort by sequence number
      const timeline = [
        ...events.map(event => ({ ...event, type: 'event' })),
        ...shots.map(shot => ({ ...shot, type: 'shot', eventType: shot.shotResult === 'made' ? 'shot_made' : 'shot_missed' }))
      ].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      
      return timeline;
    } catch (error) {
      console.error('Error fetching session timeline:', error);
      throw error;
    }
  },

  // Delete an event (for undo functionality)
  async deleteEvent(eventID) {
    try {
      const eventsRef = collection(db, SESSION_EVENTS_COLLECTION);
      const q = query(eventsRef, where('eventID', '==', eventID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Event not found');
      }
      
      const eventDoc = querySnapshot.docs[0];
      await deleteDoc(doc(db, SESSION_EVENTS_COLLECTION, eventDoc.id));
      
      return { eventID };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },

  // Get events by log ID
  async getEventsByLogID(logID) {
    try {
      const eventsRef = collection(db, SESSION_EVENTS_COLLECTION);
      const q = query(eventsRef, where('logID', '==', logID));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by sequence number
      return events.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    } catch (error) {
      console.error('Error fetching events by log ID:', error);
      throw error;
    }
  }
};

// Utility function to initialize Cleveland Cavaliers roster
export const initializeSampleData = async () => {
  try {
    const existingPlayers = await playersService.getAllPlayers();
    
    if (existingPlayers.length === 0) {
      // Cleveland Cavaliers players
      const cavsRoster = [
        { name: 'Jarrett Allen', jerseyNumber: 31, position: 'C', isActive: true },
        { name: 'Lonzo Ball', jerseyNumber: 2, position: 'PG', isActive: true },
        { name: 'Emoni Bates', jerseyNumber: 21, position: 'SF', isActive: true },
        { name: 'Darius Garland', jerseyNumber: 10, position: 'PG', isActive: true },
        { name: 'Javonte Green', jerseyNumber: 8, position: 'SG', isActive: true },
        { name: 'De\'Andre Hunter', jerseyNumber: 12, position: 'SF', isActive: true },
        { name: 'Sam Merrill', jerseyNumber: 5, position: 'SG', isActive: true },
        { name: 'Donovan Mitchell', jerseyNumber: 45, position: 'SG', isActive: true },
        { name: 'Evan Mobley', jerseyNumber: 4, position: 'PF', isActive: true },
        { name: 'Larry Nance Jr.', jerseyNumber: 22, position: 'PF', isActive: true },
        { name: 'Saliou Niang', jerseyNumber: 77, position: 'PG', isActive: true },
        { name: 'Chuma Okeke', jerseyNumber: 18, position: 'PF', isActive: true },
        { name: 'Craig Porter Jr.', jerseyNumber: 9, position: 'SG', isActive: true },
        { name: 'Tyrese Proctor', jerseyNumber: 24, position: 'G', isActive: true },
        { name: 'Max Strus', jerseyNumber: 1, position: 'SG', isActive: true },
        { name: 'Tristan Thompson', jerseyNumber: 13, position: 'C', isActive: true },
        { name: 'Nae\'Qwan Tomlin', jerseyNumber: 30, position: 'SF', isActive: true },
        { name: 'Luke Travers', jerseyNumber: 33, position: 'PG', isActive: true },
        { name: 'Jaylon Tyson', jerseyNumber: 20, position: 'SF', isActive: true }
      ];

      console.log('Adding Cleveland Cavaliers roster to database...');
      let successCount = 0;
      
      for (const player of cavsRoster) {
        try {
          await playersService.addPlayer(player);
          successCount++;
          console.log(`Added ${player.name} (#${player.jerseyNumber})`);
        } catch (error) {
          console.error(`Failed to add ${player.name}:`, error.message);
        }
      }
      
      console.log(`Successfully added ${successCount}/${cavsRoster.length} players to Firebase!`);
      return { success: true, playersAdded: successCount, totalPlayers: cavsRoster.length };
    }
    
    console.log(`Database already contains ${existingPlayers.length} players. Skipping initialization.`);
    return { success: false, message: 'Players already exist', existingCount: existingPlayers.length };
  } catch (error) {
    console.error('Error initializing Cleveland Cavaliers roster:', error);
    return { success: false, error: error.message };
  }
};
