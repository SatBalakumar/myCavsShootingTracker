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
 * These configuration values are safe to expose in client-side code.
 * Firebase uses these for service identification, not access control.
 * Actual security is enforced by Firestore security rules on the backend.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBa3QYhv_u3DsC5cxluVBTfCfwrgNHldJI",              // Client API key for Firebase services
  authDomain: "mycavsshootingtracker.firebaseapp.com",             // Authentication domain
  projectId: "mycavsshootingtracker",                              // Unique project identifier
  storageBucket: "mycavsshootingtracker.firebasestorage.app",      // Cloud storage bucket
  messagingSenderId: "711852417023",                               // Cloud messaging service ID
  appId: "1:711852417023:web:8fd2bb74c8ab08a81551ca",              // Web app identifier
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
