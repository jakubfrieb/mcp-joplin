import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import JoplinAPIClient from '../lib/joplin-api-client.js';
import { SearchNotes } from '../lib/tools/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
dotenv.config({ path: resolve(__dirname, '../.env.test.local') });

describe('SearchNotes', () => {
  let client;
  let searchNotes;

  before(() => {
    // Check for required environment variables
    const requiredEnvVars = ['JOPLIN_PORT', 'JOPLIN_TOKEN'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`Error: ${envVar} environment variable is required for tests`);
        process.exit(1);
      }
    }

    client = new JoplinAPIClient({
      port: process.env.JOPLIN_PORT,
      token: process.env.JOPLIN_TOKEN
    });
    
    searchNotes = new SearchNotes(client);
  });

  it('returns an error message when no query is provided', async () => {
    const result = await searchNotes.call();
    assert.strictEqual(result, 'Please provide a search query.');
  });

  it('can search for notes', async () => {
    // Create a test note with a unique title
    const uniqueTitle = `Test Note ${Date.now()}`;
    await client.post('/notes', { 
      title: uniqueTitle, 
      body: 'This is a test note for search functionality' 
    });

    // Search for the note
    const result = await searchNotes.call(uniqueTitle);
    
    // Check that the search found our note
    assert.ok(result.includes(`Found`), 'Search result should indicate notes were found');
    assert.ok(result.includes(uniqueTitle), 'Search result should include the note title');
  });
});
