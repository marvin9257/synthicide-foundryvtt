#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from CLI argument only
const version = (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.argv && globalThis.process.argv[2]) ? globalThis.process.argv[2] : undefined;
if (!version) {
  throw new Error('No version specified. Usage: node update-system-json-version.js <version>');
}

const filesToUpdate = [
  path.join(__dirname, '../system.json'),
  path.join(__dirname, '../dist/system.json'),
];

filesToUpdate.forEach((file) => {
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.version = version;
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated version in ${file} to ${version}`);
  } else {
    console.warn(`File not found: ${file}`);
  }
});
