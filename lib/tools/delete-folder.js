import { validateFolderId } from '../validators.js';

class DeleteFolder {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(folderId) {
    try {
      // Validate folder ID
      validateFolderId(folderId);

      // First, get the folder details for confirmation message
      let folderTitle = 'Unknown folder';
      let parentInfo = '';
      let hasSubfolders = false;
      let noteCount = 0;
      
      try {
        const folder = await this.apiClient.get(`/folders/${folderId}`, {
          query: { fields: 'id,title,parent_id' }
        });
        
        if (folder && folder.title) {
          folderTitle = folder.title;
        }
        
        if (folder && folder.parent_id) {
          // Try to get parent folder name for better confirmation
          try {
            const parentFolder = await this.apiClient.get(`/folders/${folder.parent_id}`, {
              query: { fields: 'id,title' }
            });
            if (parentFolder && parentFolder.title) {
              parentInfo = ` inside "${parentFolder.title}"`;
            }
          } catch (parentError) {
            // Continue without parent info if we can't fetch it
          }
        }

        // Check for subfolders and notes to provide better information
        try {
          // Get all folders to check for children
          const allFolders = await this.apiClient.getAllItems('/folders', {
            query: { fields: 'id,title,parent_id' }
          });
          
          const subfolders = allFolders.filter(f => f.parent_id === folderId);
          hasSubfolders = subfolders.length > 0;

          // Get notes in this folder
          const notes = await this.apiClient.get(`/folders/${folderId}/notes`, {
            query: { fields: 'id' }
          });
          
          if (notes && notes.items) {
            noteCount = notes.items.length;
          }
        } catch (countError) {
          // Continue without count info if we can't fetch it
        }
        
      } catch (fetchError) {
        // If we can't fetch the folder details, we'll still try to delete it
        // The delete operation will return a proper 404 if the folder doesn't exist
      }

      // Delete the folder (soft delete - moves to trash)
      await this.apiClient.delete(`/folders/${folderId}`);

      // Format success response
      const resultLines = [];
      resultLines.push(`✅ Successfully moved folder "${folderTitle}" to trash`);
      resultLines.push(`Folder ID: ${folderId}`);
      
      if (parentInfo) {
        resultLines.push(`Location: ${parentInfo}`);
      }
      
      resultLines.push('');
      resultLines.push('ℹ️  Deletion Details:');
      resultLines.push('- The folder has been moved to the trash (soft deleted)');
      resultLines.push('- You can restore it from Joplin\'s trash if needed');
      resultLines.push('- The folder is no longer accessible via the API');
      
      if (noteCount > 0) {
        resultLines.push(`- ${noteCount} note(s) in this folder were also moved to trash`);
      }
      
      if (hasSubfolders) {
        resultLines.push('- Any sub-folders were also moved to trash');
      }
      
      if (noteCount === 0 && !hasSubfolders) {
        resultLines.push('- This folder was empty');
      }
      
      resultLines.push('');
      resultLines.push('⚠️  Important Notes:');
      resultLines.push('- Deleting a folder also moves all its contents to trash');
      resultLines.push('- This includes all notes and sub-folders within it');
      resultLines.push('- Use the Joplin desktop app to restore if needed');
      
      resultLines.push('');
      resultLines.push('Related commands:');
      resultLines.push('- To see all folders: list_notebooks');
      resultLines.push('- To create a new folder: create_folder title="folder name"');

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in delete_folder:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Folder with ID "${folderId}" not found. The folder may have already been deleted or the ID is incorrect. Use list_notebooks to see available folders.`;
      }
      
      if (error.response && error.response.status === 403) {
        return `Error: Permission denied. You may not have permission to delete this folder.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request. ${error.response.data?.error || 'Please check the folder ID format.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in delete_folder: ${error.message || 'Unknown error'}`;
    }
  }
}

export default DeleteFolder; 