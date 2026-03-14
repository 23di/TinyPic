import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PACKAGE_LOCK_PATH = new URL('../package-lock.json', import.meta.url);
const OUTPUT_MODULE_PATH = new URL('../src/open-source-libraries.js', import.meta.url);
const OUTPUT_NOTICE_PATH = new URL('../THIRD_PARTY_LICENSES.md', import.meta.url);
const NOTICE_FILE_NAME = 'THIRD_PARTY_LICENSES.md';
const LICENSE_BASENAME_PRIORITY = [
  'LICENSE',
  'LICENCE',
  'COPYING',
  'NOTICE',
];

function sanitizeUrl(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  let url = value.trim();
  if (!url) {
    return '';
  }

  if (url.startsWith('git+')) {
    url = url.slice(4);
  }

  if (url.startsWith('git://')) {
    url = `https://${url.slice('git://'.length)}`;
  }

  if (url.startsWith('git@github.com:')) {
    url = `https://github.com/${url.slice('git@github.com:'.length)}`;
  }

  if (url.startsWith('ssh://git@github.com/')) {
    url = `https://github.com/${url.slice('ssh://git@github.com/'.length)}`;
  }

  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#.+)?$/.test(url)) {
    url = `https://github.com/${url}`;
  }

  url = url.replace(/\.git(#.*)?$/i, '$1');
  url = url.replace(/#readme$/i, '');

  try {
    return new URL(url).toString();
  } catch {
    return '';
  }
}

function getPackageNameFromLockPath(lockPath) {
  const parts = lockPath.split('node_modules/');
  return parts[parts.length - 1];
}

function getRuntimePackages(lockfile) {
  const uniquePackages = new Map();

  Object.entries(lockfile.packages || {}).forEach(([lockPath, pkg]) => {
    if (!lockPath.startsWith('node_modules/') || pkg.dev) {
      return;
    }

    const name = getPackageNameFromLockPath(lockPath);
    const version = pkg.version;
    const key = `${name}@${version}`;

    if (!uniquePackages.has(key)) {
      uniquePackages.set(key, { name, version });
    }
  });

  return Array.from(uniquePackages.values()).sort((left, right) => (
    left.name.localeCompare(right.name) || left.version.localeCompare(right.version)
  ));
}

function getRepositoryUrl(meta) {
  if (typeof meta.repository === 'string') {
    return sanitizeUrl(meta.repository);
  }

  if (meta.repository && typeof meta.repository.url === 'string') {
    return sanitizeUrl(meta.repository.url);
  }

  return '';
}

function getHomepageUrl(meta) {
  if (typeof meta.homepage === 'string') {
    return sanitizeUrl(meta.homepage);
  }

  return '';
}

function getPackageUrl(name) {
  return `https://www.npmjs.com/package/${name}`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Tarball download failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
}

function isLicenseFileName(fileName) {
  const upper = fileName.toUpperCase();
  return LICENSE_BASENAME_PRIORITY.some((prefix) => (
    upper === prefix || upper.startsWith(`${prefix}.`) || upper.startsWith(`${prefix}-`)
  ));
}

function sortLicenseEntries(entries) {
  return entries.sort((left, right) => {
    const leftBase = path.posix.basename(left).toUpperCase();
    const rightBase = path.posix.basename(right).toUpperCase();
    const leftPriority = LICENSE_BASENAME_PRIORITY.findIndex((prefix) => leftBase === prefix || leftBase.startsWith(`${prefix}.`) || leftBase.startsWith(`${prefix}-`));
    const rightPriority = LICENSE_BASENAME_PRIORITY.findIndex((prefix) => rightBase === prefix || rightBase.startsWith(`${prefix}.`) || rightBase.startsWith(`${prefix}-`));
    const safeLeftPriority = leftPriority === -1 ? LICENSE_BASENAME_PRIORITY.length : leftPriority;
    const safeRightPriority = rightPriority === -1 ? LICENSE_BASENAME_PRIORITY.length : rightPriority;

    const depthDelta = left.split('/').length - right.split('/').length;
    if (depthDelta !== 0) {
      return depthDelta;
    }

    if (safeLeftPriority !== safeRightPriority) {
      return safeLeftPriority - safeRightPriority;
    }

    return left.localeCompare(right);
  });
}

function listArchiveEntries(archivePath) {
  const output = execFileSync('tar', ['-tzf', archivePath], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

  return output.split('\n').filter(Boolean);
}

function extractArchiveEntry(archivePath, archiveEntry) {
  return execFileSync('tar', ['-xOzf', archivePath, archiveEntry], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

async function extractLicenseFiles(packageMeta, tempDir) {
  const tarballUrl = packageMeta.dist && packageMeta.dist.tarball;
  if (!tarballUrl) {
    return [];
  }

  const archivePath = path.join(tempDir, `${packageMeta.name.replace(/[\\/]/g, '__')}-${packageMeta.version}.tgz`);
  await downloadFile(tarballUrl, archivePath);

  const entries = listArchiveEntries(archivePath);
  const candidates = sortLicenseEntries(entries.filter((entry) => {
    if (entry.endsWith('/')) {
      return false;
    }

    if (!entry.startsWith('package/')) {
      return false;
    }

    return isLicenseFileName(path.posix.basename(entry));
  }));

  const extracted = [];
  const seenNames = new Set();

  candidates.forEach((entry) => {
    const baseName = path.posix.basename(entry);
    if (seenNames.has(baseName)) {
      return;
    }

    seenNames.add(baseName);
    extracted.push({
      fileName: baseName,
      content: extractArchiveEntry(archivePath, entry).trim(),
    });
  });

  return extracted;
}

function normalizeLicense(value) {
  if (!value) {
    return 'Unknown';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && typeof value.type === 'string') {
    return value.type;
  }

  return 'Unknown';
}

function buildNoticeMarkdown(libraries) {
  const lines = [
    '# Third-Party Licenses',
    '',
    'This file lists the production open source packages bundled with the Fcompressor runtime.',
    `Generated from \`package-lock.json\` on ${new Date().toISOString().slice(0, 10)} by \`scripts/generate-third-party-licenses.mjs\`.`,
    '',
  ];

  libraries.forEach((library) => {
    lines.push(`## ${library.name} ${library.version}`);
    lines.push('');
    lines.push(`- License: ${library.license}`);
    lines.push(`- npm: ${library.packageUrl}`);

    if (library.repositoryUrl) {
      lines.push(`- Repository: ${library.repositoryUrl}`);
    }

    if (library.homepageUrl) {
      lines.push(`- Homepage: ${library.homepageUrl}`);
    }

    if (library.description) {
      lines.push(`- Description: ${library.description}`);
    }

    lines.push('');

    if (library.licenseFiles.length) {
      library.licenseFiles.forEach((licenseFile) => {
        lines.push(`### ${licenseFile.fileName}`);
        lines.push('');
        lines.push('````text');
        lines.push(licenseFile.content);
        lines.push('````');
        lines.push('');
      });
    } else {
      lines.push('No license file was found in the published package tarball. Refer to the package metadata and repository for details.');
      lines.push('');
    }
  });

  return lines.join('\n');
}
async function buildOpenSourceLibraries() {
  const lockfile = JSON.parse(await readFile(PACKAGE_LOCK_PATH, 'utf8'));
  const packages = getRuntimePackages(lockfile);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'fcompressor-licenses-'));

  try {
    const libraries = [];

    for (const pkg of packages) {
      const metadataUrl = `https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${pkg.version}`;
      const meta = await fetchJson(metadataUrl);
      const repositoryUrl = getRepositoryUrl(meta);
      const homepageUrl = getHomepageUrl(meta);

      libraries.push({
        name: pkg.name,
        version: pkg.version,
        description: typeof meta.description === 'string' ? meta.description : '',
        license: normalizeLicense(meta.license),
        packageUrl: getPackageUrl(pkg.name),
        repositoryUrl,
        homepageUrl,
        licenseFiles: await extractLicenseFiles(meta, tempDir),
      });
    }

    const noticeText = buildNoticeMarkdown(libraries);
    const librarySummaries = libraries.map(({ licenseFiles, ...library }) => ({
      ...library,
      noticeFiles: licenseFiles.map((licenseFile) => licenseFile.fileName),
    }));
    const moduleSource = [
      `export const OPEN_SOURCE_LIBRARY_SUMMARY = Object.freeze(${JSON.stringify({
        generatedAt: new Date().toISOString().slice(0, 10),
        totalLibraries: libraries.length,
      }, null, 2)});`,
      '',
      `export const OPEN_SOURCE_LIBRARIES = Object.freeze(${JSON.stringify(librarySummaries, null, 2)});`,
      '',
      `export const THIRD_PARTY_NOTICE_FILE_NAME = ${JSON.stringify(NOTICE_FILE_NAME)};`,
      `export const THIRD_PARTY_NOTICE_TEXT = ${JSON.stringify(noticeText)};`,
      '',
    ].join('\n');

    await writeFile(OUTPUT_MODULE_PATH, moduleSource);
    await writeFile(OUTPUT_NOTICE_PATH, noticeText);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

buildOpenSourceLibraries().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
