import { extractPack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_INPUT_DIR = path.join(__dirname, '..', 'packs');
const PACKS_EXPORT_DIR = path.join(__dirname, '..', 'packs-export');

async function main() {
  if (!await fs.stat(PACKS_INPUT_DIR).catch(() => false)) {
    console.error('❌ Packs directory does not exist:', PACKS_INPUT_DIR);
    process.exit(1);
  }
  await fs.mkdir(PACKS_EXPORT_DIR, { recursive: true });
  const allDirs = await fs.readdir(PACKS_INPUT_DIR);
  const packDirs = [];
  for (const dir of allDirs) {
    const fullPath = path.join(PACKS_INPUT_DIR, dir);
    if ((await fs.stat(fullPath)).isDirectory()) {
      console.log('[TRACE] db-to-yml.mjs: checking if dir startsWith .', { dir });
      if (!dir.startsWith('.')) {
        console.log('[TRACE] db-to-yml.mjs: dir does NOT startWith .', { dir });
      } else {
        console.log('[TRACE] db-to-yml.mjs: dir startsWith .', { dir });
      }
      packDirs.push(dir);
    }
  }
  if (packDirs.length === 0) {
    console.log('No pack directories found in', PACKS_INPUT_DIR);
    return;
  }
  for (const packDir of packDirs) {
    const inputDir = path.join(PACKS_INPUT_DIR, packDir);
    const exportDir = path.join(PACKS_EXPORT_DIR, packDir);
    await fs.mkdir(exportDir, { recursive: true });
    console.log('Exporting', packDir);
    await extractPack(inputDir, exportDir, { yaml: true, clean: true });
    console.log(`✅ Pack exported: ${packDir}`);
  }
}

main().catch(err => {
  console.error('❌ Error exporting packs:', err);
  process.exit(1);
});
