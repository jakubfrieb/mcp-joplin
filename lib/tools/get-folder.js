import { validateFolderId } from '../validators.js';

class GetFolder {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(folderId) {
    try {
      // Validate folder ID
      validateFolderId(folderId);

      // Get the folder details
      const folder = await this.apiClient.get(`/folders/${folderId}`, {
        query: { fields: 'id,title,parent_id,created_time,updated_time,user_created_time,user_updated_time' }
      });

      // Validate API response
      if (!folder || typeof folder !== 'object' || !folder.id) {
        return `Error: Unexpected response format from Joplin API when getting folder`;
      }

      // Get parent folder info if applicable
      let parentInfo = 'Root level';
      if (folder.parent_id) {
        try {
          const parentFolder = await this.apiClient.get(`/folders/${folder.parent_id}`, {
            query: { fields: 'id,title' }
          });
          if (parentFolder && parentFolder.title) {
            parentInfo = `"${parentFolder.title}" (${folder.parent_id})`;
          }
        } catch (parentError) {
          // Continue without parent info if we can't fetch it
          parentInfo = `Parent folder (${folder.parent_id})`;
        }
      }

      // Get sub-folders
      let subfolders = [];
      try {
        const allFolders = await this.apiClient.getAllItems('/folders', {
          query: { fields: 'id,title,created_time' }
        });
        subfolders = allFolders.filter(f => f.parent_id === folderId);
        // Sort by title
        subfolders.sort((a, b) => a.title.localeCompare(b.title));
      } catch (subfoldersError) {
        // Continue without subfolder info if we can't fetch it
      }

      // Get notes count and recent notes
      let noteCount = 0;
      let recentNotes = [];
      try {
        const notesResponse = await this.apiClient.get(`/folders/${folderId}/notes`, {
          query: { 
            fields: 'id,title,is_todo,todo_completed,updated_time',
            limit: 5,
            order_by: 'updated_time',
            order_dir: 'DESC'
          }
        });
        
        if (notesResponse && notesResponse.items) {
          noteCount = notesResponse.total || notesResponse.items.length;
          recentNotes = notesResponse.items;
        }
      } catch (notesError) {
        // Continue without notes info if we can't fetch it
      }

      // Format success response
      const resultLines = [];
      
      // Header
      resultLines.push(`📁 Folder: "${folder.title}"`);
      resultLines.push(`ID: ${folder.id}`);
      resultLines.push(`Location: ${parentInfo}`);
      
      // Timestamps
      resultLines.push(`Created: ${new Date(folder.created_time).toLocaleString()}`);
      resultLines.push(`Updated: ${new Date(folder.updated_time).toLocaleString()}`);
      
      resultLines.push('');
      
      // Contents summary
      resultLines.push('📊 Contents Summary:');
      resultLines.push(`- Notes: ${noteCount}`);
      resultLines.push(`- Sub-folders: ${subfolders.length}`);
      
      // Sub-folders list
      if (subfolders.length > 0) {
        resultLines.push('');
        resultLines.push('📁 Sub-folders:');
        subfolders.forEach((subfolder, index) => {
          resultLines.push(`   ${index + 1}. "${subfolder.title}" (${subfolder.id})`);
        });
      }

      // Recent notes
      if (recentNotes.length > 0) {
        resultLines.push('');
        resultLines.push('📝 Recent Notes:');
        recentNotes.forEach((note, index) => {
          const noteLines = [];
          noteLines.push(`   ${index + 1}. "${note.title}"`);
          noteLines.push(`      ID: ${note.id}`);
          
          if (note.is_todo) {
            const status = note.todo_completed ? 'Completed' : 'Not completed';
            noteLines.push(`      Todo: ${status}`);
          }
          
          noteLines.push(`      Updated: ${new Date(note.updated_time).toLocaleString()}`);
          
          resultLines.push(noteLines.join('\n'));
        });
        
        if (noteCount > recentNotes.length) {
          resultLines.push(`   ... and ${noteCount - recentNotes.length} more notes`);
        }
      }

      // Helpful commands
      resultLines.push('');
      resultLines.push('🔧 Related Commands:');
      resultLines.push(`- View all contents: read_notebook notebook_id="${folder.id}"`);
      resultLines.push(`- Get all notes in folder: get_all_notes folder_id="${folder.id}"`);
      resultLines.push(`- Create note in folder: create_note title="note title" parent_id="${folder.id}"`);
      resultLines.push(`- Create sub-folder: create_folder title="sub folder" parent_id="${folder.id}"`);
      resultLines.push(`- Update folder: update_folder folder_id="${folder.id}" title="new name"`);
      
      if (folder.parent_id) {
        resultLines.push(`- View parent folder: get_folder folder_id="${folder.parent_id}"`);
      }
      
      // Navigation commands
      if (subfolders.length > 0) {
        resultLines.push('');
        resultLines.push('📁 Navigate to sub-folders:');
        subfolders.slice(0, 3).forEach(subfolder => {
          resultLines.push(`- get_folder folder_id="${subfolder.id}"`);
        });
        if (subfolders.length > 3) {
          resultLines.push(`- ... and ${subfolders.length - 3} more sub-folders`);
        }
      }

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in get_folder:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Folder with ID "${folderId}" not found. Use list_notebooks to see available folders.`;
      }
      
      if (error.response && error.response.status === 403) {
        return `Error: Permission denied. You may not have permission to access this folder.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request. ${error.response.data?.error || 'Please check the folder ID format.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in get_folder: ${error.message || 'Unknown error'}`;
    }
  }
}

export default GetFolder; 