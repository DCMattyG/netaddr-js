import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const siteDir = path.join(repoRoot, '.site');
const docsDir = path.join(repoRoot, 'docs');
const playgroundDir = path.join(repoRoot, 'playground');
const bundledSrcDir = path.join(siteDir, 'src');

async function ensureInputDirs() {
  await fs.access(docsDir);
  await fs.access(playgroundDir);
}

async function resetSiteDir() {
  await fs.rm(siteDir, { recursive: true, force: true });
  await fs.mkdir(siteDir, { recursive: true });
}

async function copyStaticSiteContent() {
  await fs.cp(docsDir, siteDir, { recursive: true });
  await fs.cp(playgroundDir, path.join(siteDir, 'playground'), { recursive: true });
}

async function bundleLibraryForPlayground() {
  await fs.mkdir(bundledSrcDir, { recursive: true });

  await build({
    entryPoints: [path.join(repoRoot, 'src', 'index.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    outfile: path.join(bundledSrcDir, 'index.js'),
    minify: true,
    logLevel: 'info',
  });
}

async function main() {
  await ensureInputDirs();
  await resetSiteDir();
  await copyStaticSiteContent();
  await bundleLibraryForPlayground();

  process.stdout.write(`Built Pages artifact at ${siteDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
