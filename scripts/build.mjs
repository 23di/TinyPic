import { build } from 'esbuild';
import { build as viteBuild } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distBuildDir = path.join(rootDir, '.dist-build-tmp');
const sourceHtmlPath = path.join(rootDir, 'index.html');
const manifestPath = path.join(rootDir, 'manifest.json');

async function ensureCleanDir(directory) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
}

function escapeInlineScript(code) {
  return code.replace(/<\/script/gi, '<\\/script');
}

async function bundleUiScript() {
  const tmpDir = path.join(rootDir, '.ui-build-tmp');
  await viteBuild({
    configFile: false,
    root: rootDir,
    plugins: [wasm(), topLevelAwait()],
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    logLevel: 'warn',
    build: {
      lib: {
        entry: path.join(rootDir, 'src', 'main.js'),
        formats: ['es'],
        fileName: () => 'ui-bundle',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      outDir: tmpDir,
      emptyOutDir: true,
      minify: true,
      write: true,
    },
  });

  // Vite lib build outputs the entry file directly in outDir (may have no extension for ES format)
  const entries = await fs.readdir(tmpDir, { withFileTypes: true });
  const bundleEntry = entries.find(
    (e) => e.isFile() && (e.name === 'ui-bundle' || e.name.startsWith('ui-bundle.')),
  );
  if (!bundleEntry) {
    const names = entries.map((e) => e.name).join(', ');
    throw new Error(`Vite UI build did not produce ui-bundle. Found: ${names}`);
  }
  const script = await fs.readFile(path.join(tmpDir, bundleEntry.name), 'utf8');
  await fs.rm(tmpDir, { recursive: true, force: true });
  return script;
}

async function bundlePluginCode(outputDir) {
  await build({
    entryPoints: [path.join(rootDir, 'src', 'code.js')],
    bundle: true,
    outfile: path.join(outputDir, 'code.js'),
    format: 'iife',
    platform: 'browser',
    target: ['es2017'],
    minify: false,
    legalComments: 'none',
    charset: 'utf8',
  });
}

async function buildUiHtml(inlineScript, outputDir) {
  const sourceHtml = await fs.readFile(sourceHtmlPath, 'utf8');
  const scriptTagPattern = /<script[^>]+src="\.\/src\/main\.js"[^>]*><\/script>/;

  if (!scriptTagPattern.test(sourceHtml)) {
    throw new Error('Could not find the UI script tag to inline in index.html');
  }

  const builtHtml = sourceHtml.replace(
    scriptTagPattern,
    () => `<script type="module">${escapeInlineScript(inlineScript)}</script>`,
  );

  await fs.writeFile(path.join(outputDir, 'ui.html'), builtHtml, 'utf8');
}

async function writeDistManifest(outputDir) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const distManifest = {
    ...manifest,
    main: 'code.js',
    ui: 'ui.html',
  };
  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    `${JSON.stringify(distManifest, null, 2)}\n`,
    'utf8',
  );
}

async function publishBuild(outputDir) {
  await fs.mkdir(distDir, { recursive: true });

  await Promise.all([
    fs.rename(path.join(outputDir, 'code.js'), path.join(distDir, 'code.js')),
    fs.rename(path.join(outputDir, 'ui.html'), path.join(distDir, 'ui.html')),
    fs.rename(path.join(outputDir, 'manifest.json'), path.join(distDir, 'manifest.json')),
  ]);

  await fs.rm(outputDir, { recursive: true, force: true });
}

async function main() {
  await ensureCleanDir(distBuildDir);
  const [uiScript] = await Promise.all([bundleUiScript(), bundlePluginCode(distBuildDir)]);
  await buildUiHtml(uiScript, distBuildDir);
  await writeDistManifest(distBuildDir);
  await publishBuild(distBuildDir);
}

main().catch((error) => {
  fs.rm(distBuildDir, { recursive: true, force: true }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
