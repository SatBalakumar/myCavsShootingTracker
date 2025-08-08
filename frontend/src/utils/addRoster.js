import { playersService } from '../firebase/services.js';

// Cleveland Cavaliers 2024-25 Roster
const cavsRoster = [
  { name: "Jarrett Allen", jerseyNumber: 31, position: "C" },
  { name: "Lonzo Ball", jerseyNumber: 2, position: "PG" },
  { name: "Emoni Bates", jerseyNumber: 21, position: "SF" },
  { name: "Darius Garland", jerseyNumber: 10, position: "PG" },
  { name: "Javonte Green", jerseyNumber: 8, position: "G" },
  { name: "De'Andre Hunter", jerseyNumber: 12, position: "SF" },
  { name: "Sam Merrill", jerseyNumber: 5, position: "SG" },
  { name: "Donovan Mitchell", jerseyNumber: 45, position: "SG" },
  { name: "Evan Mobley", jerseyNumber: 4, position: "PF" },
  { name: "Larry Nance Jr.", jerseyNumber: 22, position: "PF" },
  { name: "Saliou Niang", jerseyNumber: 77, position: "G" },
  { name: "Chuma Okeke", jerseyNumber: 18, position: "PF" },
  { name: "Craig Porter Jr.", jerseyNumber: 9, position: "G" },
  { name: "Tyrese Proctor", jerseyNumber: 24, position: "G" },
  { name: "Max Strus", jerseyNumber: 1, position: "SG" },
  { name: "Tristan Thompson", jerseyNumber: 13, position: "C" },
  { name: "Nae'Qwan Tomlin", jerseyNumber: 30, position: "F" },
  { name: "Luke Travers", jerseyNumber: 33, position: "PG" },
  { name: "Jaylon Tyson", jerseyNumber: 24, position: "F" },
  { name: "Dean Wade", jerseyNumber: 32, position: "PF" }
];

/**
 * Add all Cleveland Cavaliers roster players to the database
 * Run this after wiping the playerInformation collection
 */
export async function addCavsRoster() {
  console.log('Starting to add Cleveland Cavaliers roster...');
  
  const results = [];
  
  for (const player of cavsRoster) {
    try {
      console.log(`Adding ${player.name} #${player.jerseyNumber} (${player.position})`);
      
      const playerData = {
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        isActive: true
      };
      
      const result = await playersService.createPlayer(playerData);
      results.push(result);
      
      console.log(`Added ${player.name} with playerID: ${result.playerID}`);
      
      // Small delay to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error adding ${player.name}:`, error);
    }
  }
  
  console.log(`\nRoster import complete! Added ${results.length} players.`);
  console.log('\nPlayer Summary:');
  results.forEach(player => {
    console.log(`  - ${player.name} #${player.jerseyNumber} (${player.position}) - ${player.playerID}`);
  });
  
  return results;
}

// Function to run from browser console
window.addCavsRoster = addCavsRoster;
