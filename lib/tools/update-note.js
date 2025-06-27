import { 
  validateNoteId, 
  validateOptionalTitle, 
  validateOptionalId, 
  validateOptionalBody, 
  validateOptionalBoolean, 
  validateOptionalTimestamp,
  validateAtLeastOneUpdateField 
} from '../validators.js';

class UpdateNote {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async call(noteId, title, body, parentId, isTodo, todoCompleted, todoDue) {
    try {
      // Validate note ID
      validateNoteId(noteId);

      // Validate optional parameters
      validateOptionalTitle(title);
      validateOptionalId(parentId, 'notebook ID');
      validateOptionalBody(body);
      validateOptionalBoolean(isTodo, 'is_todo');
      validateOptionalBoolean(todoCompleted, 'todo_completed');
      validateOptionalTimestamp(todoDue, 'todo_due');

      // Validate at least one field is provided for update
      const updateFields = { title, body, parentId, isTodo, todoCompleted, todoDue };
      validateAtLeastOneUpdateField(updateFields);

      // Build request body with only provided fields
      const requestBody = {};

      if (title !== undefined && title !== null && title !== '') {
        requestBody.title = title.trim();
      }

      if (body !== undefined && body !== null) {
        requestBody.body = body;
      }

      if (parentId !== undefined && parentId !== null && parentId !== '') {
        requestBody.parent_id = parentId;
      }

      if (isTodo !== undefined && isTodo !== null) {
        requestBody.is_todo = isTodo ? 1 : 0;
      }

      if (todoCompleted !== undefined && todoCompleted !== null) {
        requestBody.todo_completed = todoCompleted ? Date.now() : 0;
      }

      if (todoDue !== undefined && todoDue !== null) {
        requestBody.todo_due = todoDue;
      }

      // Update the note
      const updatedNote = await this.apiClient.put(`/notes/${noteId}`, requestBody);

      // Validate API response
      if (!updatedNote || typeof updatedNote !== 'object' || !updatedNote.id) {
        return `Error: Unexpected response format from Joplin API when updating note`;
      }

      // Format success response
      const resultLines = [];
      resultLines.push(`✅ Successfully updated note "${updatedNote.title}"`);
      resultLines.push(`Note ID: ${updatedNote.id}`);
      
      if (updatedNote.parent_id) {
        resultLines.push(`Notebook ID: ${updatedNote.parent_id}`);
      } else {
        resultLines.push(`Notebook: Default notebook`);
      }

      if (updatedNote.is_todo) {
        const status = updatedNote.todo_completed ? 'Completed' : 'Not completed';
        resultLines.push(`Type: Todo item (${status})`);
        
        if (updatedNote.todo_due) {
          const dueDate = new Date(updatedNote.todo_due).toLocaleString();
          resultLines.push(`Due: ${dueDate}`);
        }
        
        if (updatedNote.todo_completed) {
          const completedDate = new Date(updatedNote.todo_completed).toLocaleString();
          resultLines.push(`Completed: ${completedDate}`);
        }
      } else {
        resultLines.push(`Type: Regular note`);
      }

      resultLines.push(`Last updated: ${new Date(updatedNote.updated_time).toLocaleString()}`);
      
      // Show what was updated
      const updatedFields = [];
      if (requestBody.title) updatedFields.push('title');
      if (requestBody.body !== undefined) updatedFields.push('content');
      if (requestBody.parent_id) updatedFields.push('notebook');
      if (requestBody.is_todo !== undefined) updatedFields.push('todo status');
      if (requestBody.todo_completed !== undefined) updatedFields.push('completion status');
      if (requestBody.todo_due !== undefined) updatedFields.push('due date');
      
      if (updatedFields.length > 0) {
        resultLines.push(`Updated fields: ${updatedFields.join(', ')}`);
      }
      
      // Add helpful next steps
      resultLines.push('');
      resultLines.push('Next steps:');
      resultLines.push(`- To read this note: read_note note_id="${updatedNote.id}"`);
      if (updatedNote.parent_id) {
        resultLines.push(`- To view the notebook: read_notebook notebook_id="${updatedNote.parent_id}"`);
      }

      return resultLines.join('\n');

    } catch (error) {
      console.error('Error in update_note:', error);
      
      // Handle specific HTTP status codes
      if (error.response && error.response.status === 404) {
        return `Error: Note with ID "${noteId}" not found. Use search_notes to find valid note IDs.`;
      }
      
      if (error.response && error.response.status === 400) {
        return `Error: Invalid request data. ${error.response.data?.error || 'Please check your input parameters.'}`;
      }
      
      // Handle validation errors (from our validators)
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      // Handle unknown errors
      return `Error in update_note: ${error.message || 'Unknown error'}`;
    }
  }
}

export default UpdateNote; 