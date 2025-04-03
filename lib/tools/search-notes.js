class SearchNotes {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(query) {
    if (!query) {
      return 'Please provide a search query.';
    }

    try {
      // Search for notes with the given query
      const searchResults = await this.apiClient.get('/search', {
        query: {
          query,
          fields: 'id,title,body,parent_id,updated_time'
        }
      });

      // Handle case where the API doesn't return the expected structure
      if (!searchResults || typeof searchResults !== 'object') {
        return `Error: Unexpected response format from Joplin API`;
      }

      // Handle case where no items were found
      if (!searchResults.items || !Array.isArray(searchResults.items) || searchResults.items.length === 0) {
        return `No notes found matching query: "${query}"`;
      }

      // Get all folders to be able to show notebook names
      const folders = await this.apiClient.getAllItems('/folders', {
        query: {
          fields: 'id,title'
        }
      });

      // Create a map of folder IDs to folder titles for quick lookup
      const folderMap = {};
      folders.forEach(folder => {
        folderMap[folder.id] = folder.title;
      });

      // Format the search results
      const resultLines = [];
      resultLines.push(`Found ${searchResults.items.length} notes matching query: "${query}"\n`);
      resultLines.push(`NOTE: To read a notebook, use the notebook ID (not the note title)\n`);

      // If multiple notes were found, add a hint about read_multinote
      if (searchResults.items.length > 1) {
        const noteIds = searchResults.items.map(note => note.id);
        resultLines.push(`TIP: To read all ${searchResults.items.length} notes at once, use:\n`);
        resultLines.push(`read_multinote note_ids=${JSON.stringify(noteIds)}\n`);
      }

      searchResults.items.forEach(note => {
        const notebookTitle = folderMap[note.parent_id] || 'Unknown notebook';
        const notebookId = note.parent_id || 'unknown';
        const updatedDate = new Date(note.updated_time).toLocaleString();

        resultLines.push(`- Note: "${note.title}" (note_id: "${note.id}")`);
        resultLines.push(`  Notebook: "${notebookTitle}" (notebook_id: "${notebookId}")`);
        resultLines.push(`  Updated: ${updatedDate}`);

        // Add a snippet of the note body if available
        if (note.body) {
          const snippet = note.body.substring(0, 100).replace(/\n/g, ' ') +
                         (note.body.length > 100 ? '...' : '');
          resultLines.push(`  Snippet: ${snippet}`);
        }

        // Add hints for using related commands
        resultLines.push(`  To read this note: read_note note_id="${note.id}"`);
        resultLines.push(`  To read this notebook: read_notebook notebook_id="${notebookId}"`);

        resultLines.push(''); // Empty line between notes
      });

      return resultLines.join('\n');
    } catch (error) {
      console.error('Search notes error:', error);
      return `Error searching notes: ${error.message || 'Unknown error'}`;
    }
  }
}

export default SearchNotes;
