import dotenv from 'dotenv';
import JoplinAPIClient from './lib/joplin-api-client.js';
import { SearchNotes, ReadMultiNote } from './lib/tools/index.js';

// Load environment variables
dotenv.config();

// Check for required environment variables
const requiredEnvVars = ['JOPLIN_PORT', 'JOPLIN_TOKEN'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is required`);
    process.exit(1);
  }
}

// Create the Joplin API client
const apiClient = new JoplinAPIClient({
  port: process.env.JOPLIN_PORT,
  token: process.env.JOPLIN_TOKEN
});

// Create the tools
const searchNotes = new SearchNotes(apiClient);
const readMultiNote = new ReadMultiNote(apiClient);

// Test the read multinote functionality
async function testReadMultiNote() {
  try {
    // Check if Joplin is available
    const available = await apiClient.serviceAvailable();
    if (!available) {
      console.error('Error: Joplin service is not available');
      process.exit(1);
    }
    
    // Get note IDs from command line arguments
    const noteIds = process.argv.slice(2);
    
    // If no note IDs are provided, search for some notes first
    if (noteIds.length === 0) {
      console.log('No note IDs provided. Searching for sample notes:');
      const searchQuery = 'todo'; // Default search term
      const searchResults = await searchNotes.call(searchQuery);
      console.log(searchResults);
      console.log('\nPlease run again with note IDs from the search results above.');
      console.log('Example: node test-read-multinote.js id1 id2 id3');
      process.exit(0);
    }
    
    // Read the specified notes
    console.log(`Reading ${noteIds.length} notes with IDs: ${noteIds.join(', ')}`);
    const result = await readMultiNote.call(noteIds);
    console.log(result);
  } catch (error) {
    console.error('Error testing read multinote:', error);
  }
}

testReadMultiNote();
