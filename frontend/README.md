# Cleveland Cavaliers Basketball Shooting Tracker

A React-based basketball shooting performance tracking application for the Cleveland Cavaliers.

## Features

- Interactive basketball court for shot tracking
- Zone-based button interface for mobile devices
- Real-time shooting statistics and analytics
- Firebase integration for data persistence
- CSV export functionality
- Responsive design for desktop and mobile

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd myCavsShootingTracker/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Copy `.env.example` to `.env`
   - Fill in your Firebase project configuration values
   - Get these from your Firebase Console: https://console.firebase.google.com/
   
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase config values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain  
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Your Firebase app ID

## Deployment

For production deployment (Netlify, Vercel, etc.), add these environment variables to your deployment platform's environment configuration.

## Tech Stack

- React 18 + Vite
- Firebase Firestore
- Material-UI components
- Responsive CSS
