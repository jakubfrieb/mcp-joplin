import dotenv from 'dotenv';
import JoplinAPIClient from './lib/joplin-api-client.js';
import { SearchNotes, ReadNote } from './lib/tools/index.js';

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
const readNote = new ReadNote(apiClient);

// Test the read note functionality
async function testReadNote() {
  try {
    // Check if Joplin is available
    const available = await apiClient.serviceAvailable();
    if (!available) {
      console.error('Error: Joplin service is not available');
      process.exit(1);
    }
    
    // If no note ID is provided, search for notes first
    const noteId = process.argv[2];
    if (!noteId) {
      console.log('No note ID provided. Searching for a sample note:');
      const searchQuery = process.argv[3] || 'todo'; // Default search term if none provided
      const searchResults = await searchNotes.call(searchQuery);
      console.log(searchResults);
      console.log('\nPlease run again with a note ID from the search results above.');
      console.log('Example: node test-read-note.js your-note-id');
      process.exit(0);
    }
    
    // Read the specified note
    console.log(`Reading note with ID: "${noteId}"`);
    const result = await readNote.call(noteId);
    console.log(result);
  } catch (error) {
    console.error('Error testing read note:', error);
  }
}

testReadNote();
