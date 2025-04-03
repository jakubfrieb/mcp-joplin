class ReadNotebook {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(notebookId) {
    if (!notebookId) {
      return 'Please provide a notebook ID. Example: read_notebook notebook_id="your-notebook-id"';
    }

    // Check if the ID looks like a title instead of an actual ID
    if (notebookId.length < 10 || !notebookId.match(/[a-f0-9]/i)) {
      return `Error: "${notebookId}" does not appear to be a valid notebook ID. \n\nNotebook IDs are long alphanumeric strings like "58a0a29f68bc4141b49c99f5d367638a".\n\nUse list_notebooks to see all available notebooks with their IDs.`;
    }

    try {
      // First, get the notebook details
      const notebook = await this.apiClient.get(`/folders/${notebookId}`, {
        query: { fields: 'id,title,parent_id' }
      });

      // Validate notebook response
      if (!notebook || typeof notebook !== 'object' || !notebook.id) {
        return `Error: Unexpected response format from Joplin API when fetching notebook`;
      }

      // Get all notes in this notebook
      const notes = await this.apiClient.get(`/folders/${notebookId}/notes`, {
        query: { fields: 'id,title,updated_time,is_todo,todo_completed' }
      });

      // Validate notes response
      if (!notes || typeof notes !== 'object') {
        return `Error: Unexpected response format from Joplin API when fetching notes`;
      }

      if (!notes.items || !Array.isArray(notes.items) || notes.items.length === 0) {
        return `Notebook "${notebook.title}" (notebook_id: "${notebook.id}") is empty.\n\nTry another notebook ID or use list_notebooks to see all available notebooks.`;
      }

      // Format the notebook contents
      const resultLines = [];
      resultLines.push(`# Notebook: "${notebook.title}" (notebook_id: "${notebook.id}")`);
      resultLines.push(`Contains ${notes.items.length} notes:\n`);
      resultLines.push(`NOTE: This is showing the contents of notebook "${notebook.title}", not a specific note.\n`);

      // If multiple notes were found, add a hint about read_multinote
      if (notes.items.length > 1) {
        const noteIds = notes.items.map(note => note.id);
        resultLines.push(`TIP: To read all ${notes.items.length} notes at once, use:\n`);
        resultLines.push(`read_multinote note_ids=${JSON.stringify(noteIds)}\n`);
      }

      // Sort notes by updated_time (newest first)
      const sortedNotes = [...notes.items].sort((a, b) => b.updated_time - a.updated_time);

      sortedNotes.forEach(note => {
        const updatedDate = new Date(note.updated_time).toLocaleString();

        // Add checkbox for todos
        if (note.is_todo) {
          const checkboxStatus = note.todo_completed ? '✅' : '☐';
          resultLines.push(`- ${checkboxStatus} Note: "${note.title}" (note_id: "${note.id}")`);
        } else {
          resultLines.push(`- Note: "${note.title}" (note_id: "${note.id}")`);
        }

        resultLines.push(`  Updated: ${updatedDate}`);
        resultLines.push(`  To read this note: read_note note_id="${note.id}"`);
        resultLines.push(''); // Empty line between notes
      });

      return resultLines.join('\n');
    } catch (error) {
      console.error('Read notebook error:', error);
      if (error.response && error.response.status === 404) {
        return `Notebook with ID "${notebookId}" not found.\n\nThis might happen if:\n1. The ID is incorrect\n2. You're using a note title instead of a notebook ID\n3. The notebook has been deleted\n\nUse list_notebooks to see all available notebooks with their IDs.`;
      }
      return `Error reading notebook: ${error.message || 'Unknown error'}\n\nMake sure you're using a valid notebook ID, not a note title.\nUse list_notebooks to see all available notebooks with their IDs.`;
    }
  }
}

export default ReadNotebook;
