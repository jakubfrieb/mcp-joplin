import { 
  validateFolderId, 
  validateOptionalTitle, 
  validateOptionalId,
  validateAtLeastOneUpdateField 
} from '../validators.js';

class UpdateFolder {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(folderId, title, parentId) {
    try {
      // Validate folder ID
      validateFolderId(folderId);

      // Validate optional parameters
      validateOptionalTitle(title);
      validateOptionalId(parentId, 'parent folder ID');

      // Validate at least one field is provided for update
      const updateFields = { title, parentId };
      validateAtLeastOneUpdateField(updateFields);

      // Check for circular reference (folder cannot be its own descendant)
      if (parentId && parentId !== folderId) {
        await this.checkCircularReference(folderId, parentId);
      }

      // If trying to move folder to itself, prevent it
      if (parentId === folderId) {
        throw new Error('A folder cannot be moved to itself.');
      }

      // Build request body with only provided fields
      const requestBody = {};

      if (title !== undefined && title !== null && title !== '') {
        requestBody.title = title.trim();
      }

      if (parentId !== undefined && parentId !== null && parentId !== '') {
        requestBody.parent_id = parentId;
      }

      // Update the folder
      const updatedFolder = await this.apiClient.put(`/folders/${folderId}`, requestBody);

      // Validate API response
      if (!updatedFolder || typeof updatedFolder !== 'object' || !updatedFolder.id) {
        return `Error: Unexpected response format from Joplin API when updating folder`;
      }

      // Get parent folder info if applicable
      let parentInfo = 'Root level';
      if (updatedFolder.parent_id) {
        try {
          const parentFolder = await this.apiClient.get(`/folders/${updatedFolder.parent_id}`, {
            query: { fields: 'id,title' }
          });
          if (parentFolder && parentFolder.title) {
            parentInfo = `Inside "${parentFolder.title}" (${updatedFolder.parent_id})`;
          }
        } catch (parentError) {
          // Continue without parent info if we can't fetch it
          parentInfo = `Inside parent folder (${updatedFolder.parent_id})`;
        }
      }

      // Format success response
      const resultLines = [];
      resultLines.push(`✅ Successfully updated folder "${updatedFolder.title}"`);
      resultLines.push(`Folder ID: ${updatedFolder.id}`);
      resultLines.push(`Location: ${parentInfo}`);
      resultLines.push(`Last updated: ${new Date(updatedFolder.updated_time).toLocaleString()}`);
      
      // Show what was updated
      const updatedFields = [];
      if (requestBody.title) updatedFields.push('title');
      if (requestBody.parent_id !== undefined) updatedFields.push('location');
      
      if (updatedFields.length > 0) {
        resultLines.push(`Updated fields: ${updatedFields.join(', ')}`);
      }
      
      // Add helpful next steps
      resultLines.push('');
      resultLines.push('Next steps:');
      resultLines.push(`- To view this folder: get_folder folder_id="${updatedFolder.id}"`);
      resultLines.push(`- To read folder contents: read_notebook notebook_id="${updatedFolder.id}"`);
      resultLines.push('- To see all folders: list_notebooks');

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in update_folder:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Folder with ID "${folderId}" not found. Use list_notebooks to see available folders.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request data. ${error.response.data?.error || 'Please check your input parameters.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in update_folder: ${error.message || 'Unknown error'}`;
    }
  }

  /**
   * Check if moving folderId to parentId would create a circular reference
   * This prevents a folder from becoming its own descendant
   */
  async checkCircularReference(folderId, parentId) {
    const visitedIds = new Set();
    let currentParentId = parentId;

    while (currentParentId) {
      // If we've already visited this ID, we have a cycle
      if (visitedIds.has(currentParentId)) {
        throw new Error('Circular reference detected in folder hierarchy.');
      }

      // If the parent we're checking is the folder we're trying to move, it's circular
      if (currentParentId === folderId) {
        throw new Error('Cannot move folder to be its own descendant.');
      }

      visitedIds.add(currentParentId);

      try {
        // Get the parent of the current folder
        const folder = await this.apiClient.get(`/folders/${currentParentId}`, {
          query: { fields: 'id,parent_id' }
        });
        
        currentParentId = folder.parent_id;
        
        // If parent_id is null or empty, we've reached the root
        if (!currentParentId) {
          break;
        }
      } catch (error) {
        // If we can't fetch a folder, it might not exist
        if (error.response && error.response.status === 404) {
          throw new Error(`Parent folder with ID "${currentParentId}" not found.`);
        }
        // For other errors, let them bubble up
        throw error;
      }
    }
  }
}

export default UpdateFolder; 