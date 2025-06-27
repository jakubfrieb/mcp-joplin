/**
 * Validation utilities for Joplin MCP server tools
 * These validators throw exceptions that will be caught by tool methods
 */

export function validateNoteId(id) {
  if (!id || typeof id !== 'string' || id.length !== 32 || !id.match(/^[a-f0-9]{32}$/i)) {
    throw new Error('Invalid note ID format. Must be 32-character hexadecimal string.');
  }
}

export function validateFolderId(id) {
  if (!id || typeof id !== 'string' || id.length !== 32 || !id.match(/^[a-f0-9]{32}$/i)) {
    throw new Error('Invalid folder ID format. Must be 32-character hexadecimal string.');
  }
}

export function validateTitle(title) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title is required and cannot be empty.');
  }
  if (title.length > 255) {
    throw new Error('Title cannot exceed 255 characters.');
  }
}

export function validateOptionalId(id, type = 'ID') {
  if (id !== undefined && id !== null && id !== '') {
    if (typeof id !== 'string' || id.length !== 32 || !id.match(/^[a-f0-9]{32}$/i)) {
      throw new Error(`Invalid ${type} format. Must be 32-character hexadecimal string.`);
    }
  }
}

export function validateOptionalTitle(title) {
  if (title !== undefined && title !== null && title !== '') {
    if (typeof title !== 'string') {
      throw new Error('Title must be a string.');
    }
    if (title.length > 255) {
      throw new Error('Title cannot exceed 255 characters.');
    }
  }
}

export function validateOptionalBody(body) {
  if (body !== undefined && body !== null) {
    if (typeof body !== 'string') {
      throw new Error('Note body must be a string.');
    }
  }
}

export function validateOptionalBoolean(value, fieldName) {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'boolean') {
      throw new Error(`${fieldName} must be a boolean (true/false).`);
    }
  }
}

export function validateOptionalTimestamp(timestamp, fieldName) {
  if (timestamp !== undefined && timestamp !== null) {
    if (typeof timestamp !== 'number' || timestamp < 0) {
      throw new Error(`${fieldName} must be a valid Unix timestamp (positive number).`);
    }
  }
}

export function validatePaginationParams(page, limit) {
  if (page !== undefined && page !== null) {
    if (typeof page !== 'number' || page < 1) {
      throw new Error('Page must be a positive number starting from 1.');
    }
  }
  
  if (limit !== undefined && limit !== null) {
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new Error('Limit must be a number between 1 and 100.');
    }
  }
}

export function validateOrderParams(orderBy, orderDir) {
  const validOrderFields = ['id', 'title', 'created_time', 'updated_time', 'user_created_time', 'user_updated_time'];
  const validOrderDirections = ['ASC', 'DESC'];
  
  if (orderBy !== undefined && orderBy !== null && orderBy !== '') {
    if (typeof orderBy !== 'string' || !validOrderFields.includes(orderBy)) {
      throw new Error(`Order by must be one of: ${validOrderFields.join(', ')}`);
    }
  }
  
  if (orderDir !== undefined && orderDir !== null && orderDir !== '') {
    if (typeof orderDir !== 'string' || !validOrderDirections.includes(orderDir.toUpperCase())) {
      throw new Error(`Order direction must be ASC or DESC`);
    }
  }
}

export function validateAtLeastOneUpdateField(fields) {
  const definedFields = Object.keys(fields).filter(key => 
    fields[key] !== undefined && fields[key] !== null && fields[key] !== ''
  );
  
  if (definedFields.length === 0) {
    throw new Error('At least one property must be provided for update.');
  }
} 