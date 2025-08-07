// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBa3QYhv_u3DsC5cxluVBTfCfwrgNHldJI",
  authDomain: "mycavsshootingtracker.firebaseapp.com",
  projectId: "mycavsshootingtracker",
  storageBucket: "mycavsshootingtracker.firebasestorage.app",
  messagingSenderId: "711852417023",
  appId: "1:711852417023:web:8fd2bb74c8ab08a81551ca",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
