# Firebase Setup Guide for Cavs Shooting Tracker

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `cavs-shooting-tracker` (or your preferred name)
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In your Firebase project console, click the gear icon (Project settings)
2. Scroll down to "Your apps" section
3. Click the web icon `</>`
4. Register your app with a nickname like "Cavs Shooting Tracker Web"
5. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## Step 4: Update the Configuration File

1. Open `/src/firebase/config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-actual-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-actual-project.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to the player selection page
3. If no players are found, click "Load Sample Cavaliers Players"
4. The app should populate with current Cleveland Cavaliers players

## Database Structure

The app creates two collections in Firestore:

### Players Collection (`players`)
```javascript
{
  name: "Donovan Mitchell",
  jerseyNumber: 45,
  position: "SG",
  isActive: true,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
}
```

### Shooting Sessions Collection (`shootingSessions`)
```javascript
{
  playerId: "player-document-id",
  playerName: "Donovan Mitchell",
  shots: [...], // Array of shot objects
  totalShots: 50,
  totalMade: 32,
  totalMissed: 18,
  accuracy: 0.64,
  sessionDuration: 1800000, // milliseconds
  startTime: "2025-01-01T10:00:00.000Z",
  endTime: "2025-01-01T10:30:00.000Z",
  zoneStats: {...}, // Object with stats per zone
  createdAt: "2025-01-01T10:30:00.000Z"
}
```

## Security Rules (Optional for Development)

For development, you can use these permissive rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note:** For production, implement proper authentication and security rules.

## Troubleshooting

### Error: "Failed to load players"
- Check that your Firebase config is correct
- Ensure Firestore is enabled in your Firebase project
- Check browser console for detailed error messages

### Error: "Permission denied"
- Make sure Firestore security rules allow read/write access
- For development, use the permissive rules shown above

### Players don't load after initialization
- Check the Firestore console to see if documents were created
- Refresh the page and try again

## Next Steps

Once Firebase is set up and working:
1. Players will be loaded from Firebase instead of hardcoded
2. You can add/edit players through the Firebase console
3. Shooting session data can be saved to Firebase (feature coming soon)
4. Historical data and analytics will be available
