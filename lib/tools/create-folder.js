import { validateTitle, validateOptionalId } from '../validators.js';

class CreateFolder {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(title, parentId) {
    try {
      // Validate inputs
      validateTitle(title);
      validateOptionalId(parentId, 'parent folder ID');

      // Build request body
      const requestBody = {
        title: title.trim()
      };

      // Add parent_id if provided
      if (parentId) {
        requestBody.parent_id = parentId;
      }

      // Create the folder
      const createdFolder = await this.apiClient.post('/folders', requestBody);

      // Validate API response
      if (!createdFolder || typeof createdFolder !== 'object' || !createdFolder.id) {
        return `Error: Unexpected response format from Joplin API when creating folder`;
      }

      // Get parent folder info if applicable
      let parentInfo = 'Root level';
      if (createdFolder.parent_id) {
        try {
          const parentFolder = await this.apiClient.get(`/folders/${createdFolder.parent_id}`, {
            query: { fields: 'id,title' }
          });
          if (parentFolder && parentFolder.title) {
            parentInfo = `Inside "${parentFolder.title}" (${createdFolder.parent_id})`;
          }
        } catch (parentError) {
          // Continue without parent info if we can't fetch it
          parentInfo = `Inside parent folder (${createdFolder.parent_id})`;
        }
      }

      // Format success response
      const resultLines = [];
      resultLines.push(`✅ Successfully created folder "${createdFolder.title}"`);
      resultLines.push(`Folder ID: ${createdFolder.id}`);
      resultLines.push(`Location: ${parentInfo}`);
      resultLines.push(`Created: ${new Date(createdFolder.created_time).toLocaleString()}`);
      
      resultLines.push('');
      resultLines.push('ℹ️  Folder Details:');
      resultLines.push('- This folder can now contain notes and sub-folders');
      resultLines.push('- Use this folder ID when creating notes to organize them');
      
      // Add helpful next steps
      resultLines.push('');
      resultLines.push('Next steps:');
      resultLines.push(`- To view this folder: get_folder folder_id="${createdFolder.id}"`);
      resultLines.push(`- To read folder contents: read_notebook notebook_id="${createdFolder.id}"`);
      resultLines.push(`- To create a note in this folder: create_note title="note title" parent_id="${createdFolder.id}"`);
      resultLines.push(`- To create a sub-folder: create_folder title="sub folder name" parent_id="${createdFolder.id}"`);
      resultLines.push('- To see all folders: list_notebooks');

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in create_folder:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Parent folder with ID "${parentId}" not found. Use list_notebooks to see available folders.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request data. ${error.response.data?.error || 'Please check your input parameters.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in create_folder: ${error.message || 'Unknown error'}`;
    }
  }
}

export default CreateFolder; 