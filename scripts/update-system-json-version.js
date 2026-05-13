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

function rewriteDownloadUrl(downloadUrl, releaseVersion) {
  if (typeof downloadUrl !== 'string' || downloadUrl.trim() === '') return downloadUrl;
  return downloadUrl.replace(
    /\/releases\/(?:latest\/download|download\/[^/]+)\//,
    `/releases/download/${releaseVersion}/`
  );
}

const file = path.join(__dirname, '../system.json');
if (fs.existsSync(file)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.version = version;
  data.download = rewriteDownloadUrl(data.download, version);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated version and download URL in ${file} for ${version}`);
} else {
  console.warn(`File not found: ${file}`);
}
