import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { marked } from 'marked';
import path from 'path';
import process from 'process';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs', 'player-guide');
const README_PATH = path.join(DOCS_DIR, 'README.md');
const OUTPUT_DIR = path.join(ROOT_DIR, 'packs-src', 'player-guide-journal');
const PACK_ID = 'player-guide-journal';
const PACK_NAMESPACE = 'synthicide';
const JOURNAL_FORMAT_MARKDOWN = 2;
const DOCUMENT_OWNERSHIP_INHERIT = -1;

// Keep IDs stable across rebuilds so generated UUID links and compendium diffs do not churn.
// Foundry's built-in randomID helper is correct for runtime document creation, but not for this build step.
function buildStableId(seed) {
  const base = createHash('sha256').update(seed).digest('base64url').replace(/[^A-Za-z0-9]/g, '');
  if (base.length >= 16) return base.slice(0, 16);
  return `${base}${createHash('sha256').update(`${seed}:fallback`).digest('hex')}`.slice(0, 16);
}

function sanitizeFileStem(value) {
  return value
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'journal_entry';
}

function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function parseStartHereOrder(readmeContent) {
  const sectionMatch = readmeContent.match(/^## Start Here\s*([\s\S]*?)(?=^##\s|\s*$)/m);
  if (!sectionMatch) return [];

  const matches = [...sectionMatch[1].matchAll(/\(([^)]+\.md)\)/g)];
  return matches.map(match => match[1]);
}

function convertGuideLinks(markdown, docsByPath) {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+\.md)(#[^)]+)?\)/g, (_match, label, targetPath, anchor) => {
    const normalizedPath = targetPath.replace(/\\/g, '/');
    const target = docsByPath.get(normalizedPath);
    if (!target) return `[${label}](${targetPath}${anchor || ''})`;

    const uuid = `Compendium.${PACK_NAMESPACE}.${PACK_ID}.JournalEntry.${target.entryId}.JournalEntryPage.${target.pageId}`;
    const suffix = anchor || '';
    return `@UUID[${uuid}${suffix}]{${label}}`;
  });
}

function createJournalEntryDocument(doc, sort) {
  return {
    _id: doc.entryId,
    _key: `!journal!${doc.entryId}`,
    name: doc.title,
    folder: null,
    categories: [],
    pages: [
      {
        _id: doc.pageId,
        _key: `!journal.pages!${doc.entryId}.${doc.pageId}`,
        name: doc.title,
        type: 'text',
        sort: 0,
        flags: {},
        image: {},
        src: null,
        system: {},
        ownership: { default: DOCUMENT_OWNERSHIP_INHERIT },
        title: {
          show: false,
          level: 1
        },
        text: {
          format: JOURNAL_FORMAT_MARKDOWN,
          content: doc.html,
          markdown: doc.markdown
        },
        video: {
          autoplay: false,
          controls: true,
          height: 0,
          loop: false,
          timestamp: 0,
          volume: 0.5,
          width: 0
        }
      }
    ],
    flags: {},
    ownership: { default: 0 },
    sort
  };
}

async function getGuideFiles() {
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true });
  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (!markdownFiles.includes('README.md')) {
    throw new Error(`Missing player guide index at ${README_PATH}`);
  }

  const readmeContent = await fs.readFile(README_PATH, 'utf8');
  const orderedFromReadme = parseStartHereOrder(readmeContent);
  const remaining = markdownFiles.filter(file => file !== 'README.md' && !orderedFromReadme.includes(file));

  return ['README.md', ...orderedFromReadme, ...remaining];
}

async function buildGuideDocuments() {
  const guideFiles = await getGuideFiles();
  const docs = [];

  for (const relativePath of guideFiles) {
    const absolutePath = path.join(DOCS_DIR, relativePath);
    const rawMarkdown = await fs.readFile(absolutePath, 'utf8');
    const titleFallback = relativePath.replace(/\.md$/i, '').replace(/-/g, ' ');
    const title = extractTitle(rawMarkdown, titleFallback);
    const entryId = buildStableId(`entry:${relativePath}`);
    const pageId = buildStableId(`page:${relativePath}`);

    docs.push({
      relativePath,
      absolutePath,
      title,
      rawMarkdown,
      entryId,
      pageId
    });
  }

  const docsByPath = new Map(docs.map(doc => [doc.relativePath, doc]));

  return docs.map(doc => ({
    ...doc,
    markdown: convertGuideLinks(doc.rawMarkdown, docsByPath),
    html: ''
  }));
}

function renderMarkdown(markdown) {
  return marked.parse(markdown, {
    async: false,
    breaks: false,
    gfm: true,
    headerIds: false,
    mangle: false
  }).trim();
}

async function writeOutput(documents) {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const [index, doc] of documents.entries()) {
    const document = createJournalEntryDocument(doc, index * 100000);
    const fileName = `${sanitizeFileStem(doc.title)}_${doc.entryId}.yml`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const serialized = yaml.dump(document, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    await fs.writeFile(filePath, serialized, 'utf8');
  }
}

async function main() {
  const dirStat = await fs.stat(DOCS_DIR).catch(() => null);
  if (!dirStat?.isDirectory()) {
    throw new Error(`Player guide docs directory not found: ${DOCS_DIR}`);
  }

  const documents = await buildGuideDocuments();
  if (documents.length === 0) {
    throw new Error(`No markdown files found in ${DOCS_DIR}`);
  }

  for (const doc of documents) {
    doc.html = renderMarkdown(doc.markdown);
  }

  await writeOutput(documents);
  console.log(`Generated ${documents.length} player guide journal entries in ${OUTPUT_DIR}`);
}

main().catch(error => {
  console.error('Failed to build player guide journal source:', error);
  process.exit(1);
});