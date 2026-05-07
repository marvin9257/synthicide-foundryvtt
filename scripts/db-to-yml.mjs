import { extractPack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_INPUT_DIR = path.join(__dirname, '..', 'packs');
const PACKS_EXPORT_DIR = path.join(__dirname, '..', 'packs-export');
const PACKS_SRC_DIR = path.join(__dirname, '..', 'packs-src');

const USAGE = `Usage: node db-to-yml.mjs [pack-name ...] [--out <dir>] [--no-clean]
Examples:
  node ./scripts/db-to-yml.mjs starter-items
  node ./scripts/db-to-yml.mjs starter-items --out ./packs-export-temp --no-clean
  npm run packs:export-yml -- starter-items
`;

async function main() {
  const args = process.argv.slice(2);
  let requestedPacks = null;
  let exportRoot = PACKS_EXPORT_DIR;
  let clean = true;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out' || a === '-o') {
      if (i + 1 >= args.length) {
        console.error('❌ Missing value for --out');
        console.log(USAGE);
        process.exit(1);
      }
      exportRoot = path.resolve(args[++i]);
    } else if (a === '--no-clean') {
      clean = false;
    } else if (a === '--help' || a === '-h') {
      console.log(USAGE);
      return;
    } else {
      requestedPacks = requestedPacks || [];
      requestedPacks.push(a);
    }
  }

  if (!await fs.stat(PACKS_INPUT_DIR).catch(() => false)) {
    console.error('❌ Packs directory does not exist:', PACKS_INPUT_DIR);
    process.exit(1);
  }

  // Prevent accidentally exporting into the input or packs-src directories.
  const relToInput = path.relative(PACKS_INPUT_DIR, exportRoot);
  if (!relToInput.startsWith('..')) {
    console.error('❌ Export directory must not be inside the packs input directory:', exportRoot);
    process.exit(1);
  }
  const relToSrc = path.relative(PACKS_SRC_DIR, exportRoot);
  if (!relToSrc.startsWith('..')) {
    console.error('❌ Export directory must not be inside packs-src:', exportRoot);
    process.exit(1);
  }

  await fs.mkdir(exportRoot, { recursive: true });
  const allDirs = await fs.readdir(PACKS_INPUT_DIR);
  const packDirs = [];
  for (const dir of allDirs) {
    const fullPath = path.join(PACKS_INPUT_DIR, dir);
    if ((await fs.stat(fullPath)).isDirectory()) {
      packDirs.push(dir);
    }
  }
  if (packDirs.length === 0) {
    console.log('No pack directories found in', PACKS_INPUT_DIR);
    return;
  }
  // If specific pack names were given, filter to those (and validate existence).
  let toExport = packDirs;
  if (requestedPacks) {
    toExport = packDirs.filter(p => requestedPacks.includes(p));
    const missing = requestedPacks.filter(p => !packDirs.includes(p));
    if (missing.length) {
      console.warn('⚠️  Requested pack(s) not found and will be skipped:', missing.join(', '));
    }
    if (toExport.length === 0) {
      console.log('No matching packs to export. Exiting.');
      return;
    }
  }

  for (const packDir of toExport) {
    const inputDir = path.join(PACKS_INPUT_DIR, packDir);
    const exportDir = path.join(exportRoot, packDir);
    await fs.mkdir(exportDir, { recursive: true });
    console.log('Exporting', packDir, '→', exportDir);
    await extractPack(inputDir, exportDir, { yaml: true, clean });
    console.log(`✅ Pack exported: ${packDir}`);
  }
}

main().catch(err => {
  console.error('❌ Error exporting packs:', err);
  process.exit(1);
});
