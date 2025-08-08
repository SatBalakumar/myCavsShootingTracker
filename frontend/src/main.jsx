/**
 * MAIN APPLICATION ENTRY POINT
 * 
 * Purpose: React application bootstrap and DOM mounting for basketball shooting tracker
 * Framework: React 18 with Vite build system
 * 
 * Key Components:
 * 1. React StrictMode for development-time checks and warnings
 * 2. Root element mounting with createRoot API (React 18)
 * 3. Global CSS imports for application-wide styling
 * 4. Main App component initialization
 * 
 * Development Features:
 * - StrictMode enables additional development checks
 * - Hot module replacement (HMR) support via Vite
 * - Production optimizations through Vite build process
 * 
 * Deployment Considerations:
 * - Single-page application (SPA) architecture
 * - Client-side routing handled within App component
 * - Static asset serving optimized for basketball court images
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'                    // Global application styles
import App from './App.jsx'             // Main application component

/**
 * APPLICATION INITIALIZATION: Mount React application to DOM
 * 
 * React 18 Features:
 * - createRoot API enables concurrent features and improved performance
 * - StrictMode provides development-time safety checks and warnings
 * - Automatic batching for better performance in React 18
 * 
 * DOM Target: 'root' element defined in index.html
 * Production: StrictMode removed automatically in production builds
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
