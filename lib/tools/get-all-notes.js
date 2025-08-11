import { 
  validateOptionalId, 
  validatePaginationParams, 
  validateOrderParams 
} from '../validators.js';

class GetAllNotes {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(folderId, page, limit, orderBy, orderDir) {
    try {
      // Validate inputs
      validateOptionalId(folderId, 'folder ID');
      validatePaginationParams(page, limit);
      validateOrderParams(orderBy, orderDir);

      // Set defaults
      const actualPage = page || 1;
      const actualLimit = Math.min(limit || 50, 100); // Cap at 100
      const actualOrderBy = orderBy || 'updated_time';
      const actualOrderDir = (orderDir || 'DESC').toUpperCase();

      // Build query parameters
      const queryParams = {
        fields: 'id,title,parent_id,is_todo,todo_completed,todo_due,created_time,updated_time,user_created_time,user_updated_time',
        page: actualPage,
        limit: actualLimit,
        order_by: actualOrderBy,
        order_dir: actualOrderDir
      };

      // Add folder filter if specified
      if (folderId) {
        queryParams.parent_id = folderId;
      }

      // Get the notes
      const response = await this.apiClient.get('/notes', { query: queryParams });

      // Validate API response
      if (!response || typeof response !== 'object') {
        return `Error: Unexpected response format from Joplin API when getting notes`;
      }

      const notes = response.items || [];
      const hasMore = response.has_more || false;

      // If no notes found
      if (notes.length === 0) {
        const resultLines = [];
        if (folderId) {
          resultLines.push(`📝 No notes found in the specified folder`);
          resultLines.push(`Folder ID: ${folderId}`);
        } else {
          resultLines.push(`📝 No notes found`);
        }
        
        resultLines.push('');
        resultLines.push('Suggestions:');
        resultLines.push('- Create a new note: create_note title="my note"');
        resultLines.push('- Search for notes: search_notes query="search term"');
        resultLines.push('- List all folders: list_notebooks');
        
        return resultLines.join('\n');
      }

      // Get folder names for display
      const folderCache = new Map();
      
      // Collect unique folder IDs
      const folderIds = [...new Set(notes.map(note => note.parent_id).filter(id => id))];
      
      // Fetch folder names in batch if possible
      if (folderIds.length > 0) {
        try {
          for (const id of folderIds) {
            try {
              const folder = await this.apiClient.get(`/folders/${id}`, {
                query: { fields: 'id,title' }
              });
              if (folder && folder.title) {
                folderCache.set(id, folder.title);
              }
            } catch (folderError) {
              // Continue without folder name if we can't fetch it
            }
          }
        } catch (error) {
          // Continue without folder names if batch fetch fails
        }
      }

      // Format success response
      const resultLines = [];
      
      // Header with summary
      if (folderId) {
        const folderName = folderCache.get(folderId) || 'Unknown folder';
        resultLines.push(`📝 Notes in "${folderName}" (${notes.length} of ${response.total || notes.length})`);
        resultLines.push(`Folder ID: ${folderId}`);
      } else {
        resultLines.push(`📝 All Notes (${notes.length} of ${response.total || notes.length})`);
      }
      
      resultLines.push(`Page: ${actualPage}, Limit: ${actualLimit}`);
      resultLines.push(`Sorted by: ${actualOrderBy} ${actualOrderDir}`);
      resultLines.push('');

      // List notes
      notes.forEach((note, index) => {
        const noteLines = [];
        noteLines.push(`${index + 1}. "${note.title}"`);
        noteLines.push(`   ID: ${note.id}`);
        
        // Show folder if not filtering by folder
        if (!folderId && note.parent_id) {
          const folderName = folderCache.get(note.parent_id) || note.parent_id;
          noteLines.push(`   Folder: ${folderName}`);
        }

        // Show todo status
        if (note.is_todo) {
          const status = note.todo_completed ? 'Completed' : 'Not completed';
          noteLines.push(`   Todo: ${status}`);
          
          if (note.todo_due) {
            const dueDate = new Date(note.todo_due).toLocaleString();
            noteLines.push(`   Due: ${dueDate}`);
          }
        }

        // Show dates
        noteLines.push(`   Updated: ${new Date(note.updated_time).toLocaleString()}`);
        
        resultLines.push(noteLines.join('\n'));
        
        // Add spacing between notes
        if (index < notes.length - 1) {
          resultLines.push('');
        }
      });

      // Add pagination info
      if (hasMore || actualPage > 1) {
        resultLines.push('');
        resultLines.push('📄 Pagination:');
        
        if (actualPage > 1) {
          const prevPage = actualPage - 1;
          const prevCommand = this.buildCommand(folderId, prevPage, actualLimit, actualOrderBy, actualOrderDir);
          resultLines.push(`   Previous: ${prevCommand}`);
        }
        
        if (hasMore) {
          const nextPage = actualPage + 1;
          const nextCommand = this.buildCommand(folderId, nextPage, actualLimit, actualOrderBy, actualOrderDir);
          resultLines.push(`   Next: ${nextCommand}`);
        }
      }

      // Add helpful commands
      resultLines.push('');
      resultLines.push('Related commands:');
      resultLines.push('- To read a note: read_note note_id="note-id"');
      resultLines.push('- To search notes: search_notes query="search term"');
      resultLines.push('- To create a note: create_note title="note title"');

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in get_all_notes:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Folder with ID "${folderId}" not found. Use list_notebooks to see available folders.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request parameters. ${error.response.data?.error || 'Please check your parameters.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in get_all_notes: ${error.message || 'Unknown error'}`;
    }
  }

  buildCommand(folderId, page, limit, orderBy, orderDir) {
    const parts = ['get_all_notes'];
    
    if (folderId) parts.push(`folder_id="${folderId}"`);
    if (page !== 1) parts.push(`page=${page}`);
    if (limit !== 50) parts.push(`limit=${limit}`);
    if (orderBy !== 'updated_time') parts.push(`order_by="${orderBy}"`);
    if (orderDir !== 'DESC') parts.push(`order_dir="${orderDir}"`);
    
    return parts.join(' ');
  }
}

export default GetAllNotes; 