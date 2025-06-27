import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import logger from './lib/logger.js';

import parseArgs from './lib/parse-args.js';
import JoplinAPIClient from './lib/joplin-api-client.js';
import { 
  ListNotebooks, 
  SearchNotes, 
  ReadNotebook, 
  ReadNote, 
  ReadMultiNote,
  CreateNote,
  UpdateNote,
  DeleteNote,
  CreateFolder,
  UpdateFolder,
  DeleteFolder,
  GetAllNotes,
  GetFolder
} from './lib/tools/index.js';

// Parse command line arguments
parseArgs();

// Check for required environment variables
const requiredEnvVars = ['JOPLIN_PORT', 'JOPLIN_TOKEN'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is required`);
    process.exit(1);
  }
}

// Create the Joplin API client
const apiClient = new JoplinAPIClient({
  port: process.env.JOPLIN_PORT,
  token: process.env.JOPLIN_TOKEN
});

// Create the MCP server
const server = new McpServer({
  name: 'joplin-mcp-server',
  version: '1.0.0'
});

// Register the list_notebooks tool
server.tool(
  'list_notebooks',
  {},
  async () => {
    const result = await new ListNotebooks(apiClient).call();
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Retrieve the complete notebook hierarchy from Joplin'
  }
);

// Register the search_notes tool
server.tool(
  'search_notes',
  { query: z.string() },
  async ({ query }) => {
    const result = await new SearchNotes(apiClient).call(query);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Search for notes in Joplin and return matching notebooks'
  }
);

// Register the read_notebook tool
server.tool(
  'read_notebook',
  { notebook_id: z.string() },
  async ({ notebook_id }) => {
    const result = await new ReadNotebook(apiClient).call(notebook_id);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Read the contents of a specific notebook'
  }
);

// Register the read_note tool
server.tool(
  'read_note',
  { note_id: z.string() },
  async ({ note_id }) => {
    const result = await new ReadNote(apiClient).call(note_id);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Read the full content of a specific note'
  }
);

// Register the read_multinote tool
server.tool(
  'read_multinote',
  { note_ids: z.array(z.string()) },
  async ({ note_ids }) => {
    const result = await new ReadMultiNote(apiClient).call(note_ids);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Read the full content of multiple notes at once'
  }
);

// Register the create_note tool
server.tool(
  'create_note',
  { 
    title: z.string(),
    body: z.string().optional(),
    parent_id: z.string().optional(),
    is_todo: z.boolean().optional(),
    todo_due: z.number().optional()
  },
  async ({ title, body, parent_id, is_todo, todo_due }) => {
    const result = await new CreateNote(apiClient).call(title, body, parent_id, is_todo, todo_due);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Create a new note with optional Markdown content, notebook assignment, and todo properties'
  }
);

// Register the update_note tool
server.tool(
  'update_note',
  { 
    note_id: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    parent_id: z.string().optional(),
    is_todo: z.boolean().optional(),
    todo_completed: z.boolean().optional(),
    todo_due: z.number().optional()
  },
  async ({ note_id, title, body, parent_id, is_todo, todo_completed, todo_due }) => {
    const result = await new UpdateNote(apiClient).call(note_id, title, body, parent_id, is_todo, todo_completed, todo_due);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Update an existing note\'s title, content, notebook, or todo properties'
  }
);

// Register the delete_note tool
server.tool(
  'delete_note',
  { note_id: z.string() },
  async ({ note_id }) => {
    const result = await new DeleteNote(apiClient).call(note_id);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Move a note to trash (soft delete). The note can be restored from Joplin\'s trash'
  }
);

// Register the create_folder tool
server.tool(
  'create_folder',
  { 
    title: z.string(),
    parent_id: z.string().optional()
  },
  async ({ title, parent_id }) => {
    const result = await new CreateFolder(apiClient).call(title, parent_id);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Create a new folder (notebook) with optional parent folder assignment'
  }
);

// Register the update_folder tool
server.tool(
  'update_folder',
  { 
    folder_id: z.string(),
    title: z.string().optional(),
    parent_id: z.string().optional()
  },
  async ({ folder_id, title, parent_id }) => {
    const result = await new UpdateFolder(apiClient).call(folder_id, title, parent_id);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Update a folder\'s title or move it to a different parent folder with circular reference prevention'
  }
);

// Register the delete_folder tool
server.tool(
  'delete_folder',
  { folder_id: z.string() },
  async ({ folder_id }) => {
    const result = await new DeleteFolder(apiClient).call(folder_id);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Move a folder and all its contents to trash (soft delete). Can be restored from Joplin\'s trash'
  }
);

// Register the get_all_notes tool
server.tool(
  'get_all_notes',
  { 
    folder_id: z.string().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    order_by: z.string().optional(),
    order_dir: z.string().optional()
  },
  async ({ folder_id, page, limit, order_by, order_dir }) => {
    const result = await new GetAllNotes(apiClient).call(folder_id, page, limit, order_by, order_dir);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Get all notes with optional folder filtering, pagination, and sorting. Supports todo status display'
  }
);

// Register the get_folder tool
server.tool(
  'get_folder',
  { folder_id: z.string() },
  async ({ folder_id }) => {
    const result = await new GetFolder(apiClient).call(folder_id);
    return {
      content: [{ type: 'text', text: result }]
    };
  },
  {
    description: 'Get detailed information about a specific folder including contents summary and recent notes'
  }
);

// Create logs directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a log file for this session
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `mcp-server-${timestamp}.log`);

// Log server startup
logger.info(`Starting MCP server (version ${server.version})`);
logger.info(`Log file: ${logFile}`);

// Create a custom transport wrapper to log commands and responses
class LoggingTransport extends StdioServerTransport {
  constructor() {
    super();
    this.commandCounter = 0;
  }

  async sendMessage(message) {
    // Log outgoing message (response)
    const logEntry = {
      timestamp: new Date().toISOString(),
      direction: 'RESPONSE',
      message
    };

    // Log to console
    logger.debug(`Sending response: ${JSON.stringify(message)}`);

    // Log to file
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

    // Call the original method
    return super.sendMessage(message);
  }

  async handleMessage(message) {
    // Log incoming message (command)
    this.commandCounter++;
    const logEntry = {
      timestamp: new Date().toISOString(),
      direction: 'COMMAND',
      commandNumber: this.commandCounter,
      message
    };

    // Log to console
    logger.info(`Received command #${this.commandCounter}: ${message.method || 'unknown method'}`);
    logger.debug(`Command details: ${JSON.stringify(message)}`);

    // Log to file
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

    // Call the original method
    return super.handleMessage(message);
  }
}

// Start the server with logging transport
const transport = new LoggingTransport();

// Log connection status
logger.info('Connecting to transport...');

try {
  await server.connect(transport);
  logger.info('MCP server started and ready to receive commands');
} catch (error) {
  logger.error(`Failed to start MCP server: ${error.message}`);
  process.exit(1);
}
