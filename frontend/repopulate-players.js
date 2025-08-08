// Script to repopulate Cavaliers players in Firebase
import { initializeSampleData } from './src/firebase/services.js';

async function repopulatePlayers() {
  console.log('Starting to repopulate Cavaliers players...');
  
  try {
    const result = await initializeSampleData();
    
    if (result) {
      console.log('Successfully added all 14 Cavaliers players to Firebase!');
      console.log('Players added:');
      console.log('- Donovan Mitchell #45 (SG)');
      console.log('- Darius Garland #10 (PG)');
      console.log('- Jarrett Allen #31 (C)');
      console.log('- Evan Mobley #4 (PF)');
      console.log('- Caris LeVert #3 (SG)');
      console.log('- Isaac Okoro #35 (SF)');
      console.log('- Max Strus #1 (SF)');
      console.log('- Georges Niang #20 (PF)');
      console.log('- Craig Porter Jr. #9 (PG)');
      console.log('- Tristan Thompson #13 (C)');
      console.log('- Sam Merrill #5 (SG)');
      console.log('- Dean Wade #32 (PF)');
      console.log('- Damian Jones #21 (C)');
      console.log('- Luke Travers #12 (SF)');
    } else {
      console.log('ℹ️ Players already exist in the database');
    }
  } catch (error) {
    console.error('Error repopulating players:', error.message);
    console.error('Full error:', error);
  }
}

repopulatePlayers();
