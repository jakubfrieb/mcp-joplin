class ReadNote {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(noteId) {
    if (!noteId) {
      return 'Please provide a note ID. Example: read_note note_id="your-note-id"';
    }
    
    // Check if the ID looks like a title instead of an actual ID
    if (noteId.length < 10 || !noteId.match(/[a-f0-9]/i)) {
      return `Error: "${noteId}" does not appear to be a valid note ID. \n\nNote IDs are long alphanumeric strings like "58a0a29f68bc4141b49c99f5d367638a".\n\nUse search_notes to find notes and their IDs.`;
    }

    try {
      // Get the note details with all relevant fields
      const note = await this.apiClient.get(`/notes/${noteId}`, {
        query: { 
          fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed,todo_due' 
        }
      });

      // Validate note response
      if (!note || typeof note !== 'object' || !note.id) {
        return `Error: Unexpected response format from Joplin API when fetching note`;
      }

      // Get the notebook info to show where this note is located
      let notebookInfo = "Unknown notebook";
      if (note.parent_id) {
        try {
          const notebook = await this.apiClient.get(`/folders/${note.parent_id}`, {
            query: { fields: 'id,title' }
          });
          if (notebook && notebook.title) {
            notebookInfo = `"${notebook.title}" (notebook_id: "${note.parent_id}")`;
          }
        } catch (error) {
          console.error('Error fetching notebook info:', error);
          // Continue even if we can't get the notebook info
        }
      }

      // Format the note content
      const resultLines = [];
      
      // Add note header with metadata
      resultLines.push(`# Note: "${note.title}"`);
      resultLines.push(`Note ID: ${note.id}`);
      resultLines.push(`Notebook: ${notebookInfo}`);
      
      // Add todo status if applicable
      if (note.is_todo) {
        const status = note.todo_completed ? 'Completed' : 'Not completed';
        resultLines.push(`Status: ${status}`);
        
        if (note.todo_due) {
          const dueDate = new Date(note.todo_due).toLocaleString();
          resultLines.push(`Due: ${dueDate}`);
        }
      }
      
      // Add timestamps
      const createdDate = new Date(note.created_time).toLocaleString();
      const updatedDate = new Date(note.updated_time).toLocaleString();
      resultLines.push(`Created: ${createdDate}`);
      resultLines.push(`Updated: ${updatedDate}`);
      
      // Add a separator before the note content
      resultLines.push('\n---\n');
      
      // Add the note body
      if (note.body) {
        resultLines.push(note.body);
      } else {
        resultLines.push('(This note has no content)');
      }
      
      // Add a footer with helpful commands
      resultLines.push('\n---\n');
      resultLines.push('Related commands:');
      resultLines.push(`- To view the notebook containing this note: read_notebook notebook_id="${note.parent_id}"`);
      resultLines.push('- To search for more notes: search_notes query="your search term"');
      
      return resultLines.join('\n');
    } catch (error) {
      console.error('Read note error:', error);
      if (error.response && error.response.status === 404) {
        return `Note with ID "${noteId}" not found.\n\nThis might happen if:\n1. The ID is incorrect\n2. You're using a notebook ID instead of a note ID\n3. The note has been deleted\n\nUse search_notes to find notes and their IDs.`;
      }
      return `Error reading note: ${error.message || 'Unknown error'}\n\nMake sure you're using a valid note ID.\nUse search_notes to find notes and their IDs.`;
    }
  }
}

export default ReadNote;
