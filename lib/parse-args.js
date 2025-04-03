import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.includes('--env-file')) {
    const envFileIndex = args.indexOf('--env-file');
    const envFile = args[envFileIndex + 1];
    
    // Remove the --env-file and its value from args
    args.splice(envFileIndex, 2);
    
    // Load the environment variables from the specified file
    dotenv.config({ path: resolve(process.cwd(), envFile) });
  } else {
    // Load from default .env file
    dotenv.config();
  }
  
  return args;
}

export default parseArgs;
