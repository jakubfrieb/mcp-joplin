import dotenv from 'dotenv';
import JoplinAPIClient from './lib/joplin-api-client.js';
import { ListNotebooks, ReadNotebook } from './lib/tools/index.js';

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
const listNotebooks = new ListNotebooks(apiClient);
const readNotebook = new ReadNotebook(apiClient);

// Test the read notebook functionality
async function testReadNotebook() {
  try {
    // Check if Joplin is available
    const available = await apiClient.serviceAvailable();
    if (!available) {
      console.error('Error: Joplin service is not available');
      process.exit(1);
    }
    
    // If no notebook ID is provided, list all notebooks first
    const notebookId = process.argv[2];
    if (!notebookId) {
      console.log('No notebook ID provided. Listing all notebooks:');
      const notebooks = await listNotebooks.call();
      console.log(notebooks);
      console.log('\nPlease run again with a notebook ID from the list above.');
      process.exit(0);
    }
    
    // Read the specified notebook
    console.log(`Reading notebook with ID: "${notebookId}"`);
    const result = await readNotebook.call(notebookId);
    console.log(result);
  } catch (error) {
    console.error('Error testing read notebook:', error);
  }
}

testReadNotebook();
