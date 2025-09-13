// Script to repopulate Cavaliers players in Firebase
import { initializeSampleData } from './src/firebase/services.js';

async function repopulatePlayers() {
  
  try {
    const result = await initializeSampleData();
    
    if (result) {
      
    } else {
      
    }
  } catch (error) {
    console.error('Error repopulating players:', error.message);
    console.error('Full error:', error);
  }
}

repopulatePlayers();
