import { 
  validateTitle, 
  validateOptionalId, 
  validateOptionalBody, 
  validateOptionalBoolean, 
  validateOptionalTimestamp 
} from '../validators.js';

class CreateNote {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(title, body, parentId, isTodo, todoDue) {
    try {
      // Validate inputs
      validateTitle(title);
      validateOptionalId(parentId, 'notebook ID');
      validateOptionalBody(body);
      validateOptionalBoolean(isTodo, 'is_todo');
      validateOptionalTimestamp(todoDue, 'todo_due');

      // If is_todo is false but todo_due is provided, reject it
      if (isTodo === false && todoDue !== undefined && todoDue !== null) {
        throw new Error('todo_due cannot be set when is_todo is false.');
      }

      // Build request body
      const requestBody = {
        title: title.trim()
      };

      // Add optional fields if provided
      if (body !== undefined && body !== null) {
        requestBody.body = body;
      }

      if (parentId) {
        requestBody.parent_id = parentId;
      }

      if (isTodo !== undefined && isTodo !== null) {
        requestBody.is_todo = isTodo ? 1 : 0;
      }

      if (todoDue !== undefined && todoDue !== null) {
        requestBody.todo_due = todoDue;
      }

      // Create the note
      const createdNote = await this.apiClient.post('/notes', requestBody);

      // Validate API response
      if (!createdNote || typeof createdNote !== 'object' || !createdNote.id) {
        return `Error: Unexpected response format from Joplin API when creating note`;
      }

      // Format success response
      const resultLines = [];
      resultLines.push(`✅ Successfully created note "${createdNote.title}"`);
      resultLines.push(`Note ID: ${createdNote.id}`);
      
      if (createdNote.parent_id) {
        resultLines.push(`Notebook ID: ${createdNote.parent_id}`);
      } else {
        resultLines.push(`Notebook: Default notebook`);
      }

      if (createdNote.is_todo) {
        resultLines.push(`Type: Todo item`);
        if (createdNote.todo_due) {
          const dueDate = new Date(createdNote.todo_due).toLocaleString();
          resultLines.push(`Due: ${dueDate}`);
        }
      } else {
        resultLines.push(`Type: Regular note`);
      }

      resultLines.push(`Created: ${new Date(createdNote.created_time).toLocaleString()}`);
      
      // Add helpful next steps
      resultLines.push('');
      resultLines.push('Next steps:');
      resultLines.push(`- To read this note: read_note note_id="${createdNote.id}"`);
      if (createdNote.parent_id) {
        resultLines.push(`- To view the notebook: read_notebook notebook_id="${createdNote.parent_id}"`);
      }
      resultLines.push(`- To update this note: update_note note_id="${createdNote.id}" title="new title" body="new content"`);

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in create_note:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Notebook with ID "${parentId}" not found. Use list_notebooks to see available notebooks.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request data. ${error.response.data?.error || 'Please check your input parameters.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in create_note: ${error.message || 'Unknown error'}`;
    }
  }
}

export default CreateNote; 