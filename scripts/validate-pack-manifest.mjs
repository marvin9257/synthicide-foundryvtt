import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const SYSTEM_JSON_PATH = path.join(ROOT_DIR, 'system.json');
const PACKS_SRC_DIR = path.join(ROOT_DIR, 'packs-src');

function toPackFolderName(packPath) {
  if (typeof packPath !== 'string' || packPath.trim() === '') return null;
  const normalized = packPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return path.posix.basename(normalized);
}

async function getSourcePackDirs() {
  const entries = await fs.readdir(PACKS_SRC_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function getDeclaredPackDirs() {
  const raw = await fs.readFile(SYSTEM_JSON_PATH, 'utf8');
  const json = JSON.parse(raw);
  const packs = Array.isArray(json.packs) ? json.packs : [];

  const dirs = packs
    .map(pack => toPackFolderName(pack?.path))
    .filter(Boolean);

  return [...new Set(dirs)].sort((a, b) => a.localeCompare(b));
}

async function main() {
  const srcStat = await fs.stat(PACKS_SRC_DIR).catch(() => null);
  if (!srcStat || !srcStat.isDirectory()) {
    console.error('ERROR: packs-src directory not found:', PACKS_SRC_DIR);
    process.exit(1);
  }

  const manifestStat = await fs.stat(SYSTEM_JSON_PATH).catch(() => null);
  if (!manifestStat || !manifestStat.isFile()) {
    console.error('ERROR: system.json not found:', SYSTEM_JSON_PATH);
    process.exit(1);
  }

  const sourceDirs = await getSourcePackDirs();
  const declaredDirs = await getDeclaredPackDirs();

  const sourceSet = new Set(sourceDirs);
  const declaredSet = new Set(declaredDirs);

  const undeclaredSourceDirs = sourceDirs.filter(dir => !declaredSet.has(dir));
  const missingSourceForDeclared = declaredDirs.filter(dir => !sourceSet.has(dir));

  if (undeclaredSourceDirs.length === 0 && missingSourceForDeclared.length === 0) {
    console.log('Pack manifest validation passed.');
    console.log(`Declared packs: ${declaredDirs.length}. Source folders: ${sourceDirs.length}.`);
    return;
  }

  console.error('Pack manifest validation failed.');

  if (undeclaredSourceDirs.length > 0) {
    console.error('Found folders in packs-src with no matching declaration in system.json packs[].path:');
    for (const dir of undeclaredSourceDirs) {
      console.error(`  - ${dir}`);
    }
  }

  if (missingSourceForDeclared.length > 0) {
    console.error('Found pack declarations in system.json packs[].path with no matching folder in packs-src:');
    for (const dir of missingSourceForDeclared) {
      console.error(`  - ${dir}`);
    }
  }

  process.exit(1);
}

main().catch(err => {
  console.error('ERROR: Failed to validate pack manifest:', err);
  process.exit(1);
});
