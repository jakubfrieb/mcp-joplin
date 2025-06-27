import { validateNoteId } from '../validators.js';

class DeleteNote {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(noteId) {
    try {
      // Validate note ID
      validateNoteId(noteId);

      // First, get the note details for confirmation message
      let noteTitle = 'Unknown note';
      let notebookInfo = '';
      
      try {
        const note = await this.apiClient.get(`/notes/${noteId}`, {
          query: { fields: 'id,title,parent_id' }
        });
        
        if (note && note.title) {
          noteTitle = note.title;
        }
        
        if (note && note.parent_id) {
          // Try to get notebook name for better confirmation
          try {
            const notebook = await this.apiClient.get(`/folders/${note.parent_id}`, {
              query: { fields: 'id,title' }
            });
            if (notebook && notebook.title) {
              notebookInfo = ` from notebook "${notebook.title}"`;
            }
          } catch (notebookError) {
            // Continue without notebook info if we can't fetch it
          }
        }
      } catch (fetchError) {
        // If we can't fetch the note details, we'll still try to delete it
        // The delete operation will return a proper 404 if the note doesn't exist
      }

      // Delete the note (soft delete - moves to trash)
      await this.apiClient.delete(`/notes/${noteId}`);

      // Format success response
      const resultLines = [];
      resultLines.push(`✅ Successfully moved note "${noteTitle}" to trash`);
      resultLines.push(`Note ID: ${noteId}`);
      
      if (notebookInfo) {
        resultLines.push(`Location: ${notebookInfo}`);
      }
      
      resultLines.push('');
      resultLines.push('ℹ️  Note Details:');
      resultLines.push('- The note has been moved to the trash (soft deleted)');
      resultLines.push('- You can restore it from Joplin\'s trash if needed');
      resultLines.push('- The note is no longer accessible via the API');
      
      resultLines.push('');
      resultLines.push('Related commands:');
      resultLines.push('- To see all notes: get_all_notes');
      resultLines.push('- To search for notes: search_notes query="your search term"');
      if (notebookInfo) {
        resultLines.push('- To view remaining notes in this notebook: read_notebook notebook_id="notebook-id"');
      }

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in delete_note:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Note with ID "${noteId}" not found. The note may have already been deleted or the ID is incorrect. Use search_notes to find valid note IDs.`;
      }
      
      if (error.response && error.response.status === 403) {
        return `Error: Permission denied. You may not have permission to delete this note.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request. ${error.response.data?.error || 'Please check the note ID format.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in delete_note: ${error.message || 'Unknown error'}`;
    }
  }
}

export default DeleteNote; 