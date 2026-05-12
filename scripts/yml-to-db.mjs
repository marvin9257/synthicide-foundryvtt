import { compilePack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_SRC_DIR = path.join(__dirname, '..', 'packs-src');
const PACKS_OUTPUT_DIR = path.join(__dirname, '..', 'packs');

async function main() {
  if (!await fs.stat(PACKS_SRC_DIR).catch(() => false)) {
    console.error('❌ Source packs directory does not exist:', PACKS_SRC_DIR);
    process.exit(1);
  }
  await fs.mkdir(PACKS_OUTPUT_DIR, { recursive: true });
  const allDirs = await fs.readdir(PACKS_SRC_DIR);
  const packDirs = [];
  for (const dir of allDirs) {
    const fullPath = path.join(PACKS_SRC_DIR, dir);
    if ((await fs.stat(fullPath)).isDirectory()) {
      packDirs.push(dir);
    }
  }
  if (packDirs.length === 0) {
    console.log('No pack directories found in', PACKS_SRC_DIR);
    return;
  }
  for (const packDir of packDirs) {
    const srcDir = path.join(PACKS_SRC_DIR, packDir);
    const outDir = path.join(PACKS_OUTPUT_DIR, packDir);
    await fs.mkdir(outDir, { recursive: true });
    console.log('Packing', packDir);
    await compilePack(srcDir, outDir, { yaml: true, recursive: true, log: true });
    console.log(`✅ Pack built: ${packDir}`);
  }
}

main().catch(err => {
  console.error('❌ Error building packs:', err);
  process.exit(1);
});
