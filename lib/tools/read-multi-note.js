class ReadMultiNote {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(noteIds) {
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return 'Please provide an array of note IDs. Example: read_multinote note_ids=["id1", "id2", "id3"]';
    }

    // Validate that all IDs look like valid note IDs
    const invalidIds = noteIds.filter(id => !id || id.length < 10 || !id.match(/[a-f0-9]/i));
    if (invalidIds.length > 0) {
      return `Error: Some IDs do not appear to be valid note IDs: ${invalidIds.join(', ')}\n\nNote IDs are long alphanumeric strings like "58a0a29f68bc4141b49c99f5d367638a".\n\nUse search_notes to find notes and their IDs.`;
    }

    const resultLines = [];
    const notFound = [];
    const errors = [];
    const successful = [];

    // Add a header
    resultLines.push(`# Reading ${noteIds.length} notes\n`);

    // Process each note ID
    for (let i = 0; i < noteIds.length; i++) {
      const noteId = noteIds[i];
      resultLines.push(`## Note ${i + 1} of ${noteIds.length} (ID: ${noteId})\n`);
      
      try {
        // Get the note details with all relevant fields
        const note = await this.apiClient.get(`/notes/${noteId}`, {
          query: { 
            fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed,todo_due' 
          }
        });

        // Validate note response
        if (!note || typeof note !== 'object' || !note.id) {
          errors.push(noteId);
          resultLines.push(`Error: Unexpected response format from Joplin API when fetching note ${noteId}\n`);
          continue;
        }

        successful.push(noteId);

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
            console.error(`Error fetching notebook info for note ${noteId}:`, error);
            // Continue even if we can't get the notebook info
          }
        }

        // Add note metadata
        resultLines.push(`### Note: "${note.title}"`);
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
        
        // Add a separator after the note
        resultLines.push('\n---\n');
        
      } catch (error) {
        console.error(`Error reading note ${noteId}:`, error);
        if (error.response && error.response.status === 404) {
          notFound.push(noteId);
          resultLines.push(`Note with ID "${noteId}" not found.\n`);
        } else {
          errors.push(noteId);
          resultLines.push(`Error reading note: ${error.message || 'Unknown error'}\n`);
        }
      }
    }
    
    // Add a summary at the end
    resultLines.push('# Summary');
    resultLines.push(`Total notes requested: ${noteIds.length}`);
    resultLines.push(`Successfully retrieved: ${successful.length}`);
    
    if (notFound.length > 0) {
      resultLines.push(`Notes not found: ${notFound.length}`);
      resultLines.push(`IDs not found: ${notFound.join(', ')}`);
    }
    
    if (errors.length > 0) {
      resultLines.push(`Errors encountered: ${errors.length}`);
      resultLines.push(`IDs with errors: ${errors.join(', ')}`);
    }
    
    return resultLines.join('\n');
  }
}

export default ReadMultiNote;
