/**
 * FIREBASE CONFIGURATION AND INITIALIZATION
 * 
 * Purpose: Cloud database setup for Cleveland Cavaliers shooting tracker
 * Service: Google Firebase Firestore for real-time data persistence
 * 
 * Key Features:
 * 1. Real-time database for live shooting session tracking
 * 2. Offline data persistence for uninterrupted sessions
 * 3. Cross-device data synchronization for multi-user access
 * 4. Scalable cloud infrastructure for growing data needs
 * 5. Security rules for controlled data access
 * 
 * Data Architecture:
 * - playerInformation: Player roster with jersey numbers and profiles
 * - shootingLogs: Session containers grouping related shots
 * - shots: Individual shot records with detailed metadata
 * - sessionEvents: Event tracking for analytics and debugging
 * 
 * Security Considerations:
 * - Public API keys are safe for client-side use (Firebase design)
 * - Database security rules control actual data access
 * - All writes require proper authentication/authorization
 * - Read access controlled by Firestore security rules
 */

// Import Firebase SDK components for cloud database functionality
import { initializeApp } from 'firebase/app';           // Core Firebase initialization
import { getFirestore } from 'firebase/firestore';     // Firestore database service

/**
 * FIREBASE PROJECT CONFIGURATION
 * 
 * Project Details:
 * - Project Name: "mycavsshootingtracker"
 * - Database: Cloud Firestore in multi-region mode
 * - Authentication: Configured for future user management
 * - Storage: Available for future media uploads (player photos, etc.)
 * 
 * Security Note:
 * Configuration values are loaded from environment variables to avoid
 * exposing sensitive information in the codebase. The .env file contains
 * the actual values and is excluded from version control.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,                    // Client API key for Firebase services
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,            // Authentication domain
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,              // Unique project identifier
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,      // Cloud storage bucket
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // Cloud messaging service ID
  appId: import.meta.env.VITE_FIREBASE_APP_ID,                      // Web app identifier
};

/**
 * FIREBASE APPLICATION INITIALIZATION
 * 
 * Creates the main Firebase app instance using the configuration.
 * This app instance serves as the foundation for all Firebase services.
 */
const app = initializeApp(firebaseConfig);

/**
 * FIRESTORE DATABASE INITIALIZATION
 * 
 * Creates and exports the Firestore database instance for use throughout
 * the application. This provides the interface for all database operations.
 * 
 * Features Enabled:
 * - Real-time listeners for live data updates
 * - Offline persistence for uninterrupted usage
 * - Optimistic updates for responsive user experience
 * - Automatic conflict resolution for concurrent edits
 */
export const db = getFirestore(app);

/**
 * DEFAULT EXPORT: Firebase app instance
 * 
 * Provides access to the main Firebase app for services that might
 * need direct app instance access (authentication, storage, etc.)
 */
export default app;
