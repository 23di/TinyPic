// End-to-end black-box tests for the Figma plugin sandbox half (dist/code.js),
// driven entirely through the postMessage protocol. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlugin, bootstrap, runExport, requestEstimates, cancelExport, row, makeNode, defaultNodes,
} from './harness.mjs';

const T = {
  name: { type: 'var', key: 'name' },
  scale: { type: 'var', key: 'scale' },
  page: { type: 'var', key: 'page' },
  date: { type: 'var', key: 'date' },
  time: { type: 'var', key: 'time' },
  text: (value) => ({ type: 'text', value }),
};

// ---------------------------------------------------------------------------
test('ui-ready returns bootstrap with state, nodes, selection-sync and thumbnails', async () => {
  const p = createPlugin();
  await p.send({ type: 'ui-ready' });
  await p.waitFor(() => p.find('bootstrap'));
  const boot = p.find('bootstrap');
  assert.ok(boot.state, 'bootstrap carries state');
  assert.equal(boot.nodes.length, 2, 'two selected nodes surfaced');
  assert.ok(p.find('selection-sync'), 'selection-sync emitted');
  assert.ok(p.find('thumbnail'), 'thumbnails emitted');
});

// ---------------------------------------------------------------------------
test('persist-state normalizes and stores via clientStorage', async () => {
  const p = createPlugin();
  await p.send({ type: 'persist-state', state: { settings: {}, defaults: {}, presetSettings: {}, profiles: [] } });
  await p.tick(20);
  assert.equal(p.persisted.length, 1);
  assert.ok(p.persisted[0].value.settings, 'stored a normalized settings object');
});

test('legacy migration keeps a single {name} token (TP-08)', async () => {
  const p = createPlugin();
  // includeScale:false + no other legacy naming fields -> just the frame name
  await p.send({ type: 'persist-state', state: { settings: { includeScale: false } } });
  await p.tick(20);
  const tmpl = p.persisted.at(-1).value.settings.nameTemplate;
  // structural checks (vm-context objects have a different Object.prototype, so
  // deepStrictEqual would reject them despite identical shape)
  assert.equal(tmpl.length, 1, 'single token kept, not reset to name+scale');
  assert.equal(tmpl[0].type, 'var');
  assert.equal(tmpl[0].key, 'name');
});

// ---------------------------------------------------------------------------
test('exports one file per format with the correct extension', async () => {
  const formats = [
    ['PNG', 'png'], ['JPG', 'jpg'], ['WEBP', 'webp'], ['SVG', 'svg'], ['PDF', 'pdf'],
  ];
  for (const [format, ext] of formats) {
    const p = createPlugin();
    const base = await bootstrap(p);
    const { complete, files } = await runExport(
      p,
      [row(base, { nodeId: 'n1', format, preset: undefined })],
      { base, settings: { nameTemplate: [T.name] } },
    );
    assert.equal(files.length, 1, `${format}: one export-file`);
    assert.equal(files[0].fileName, `Icon.${ext}`, `${format}: extension`);
    assert.ok(files[0].bytes && files[0].bytes.byteLength > 0, `${format}: has bytes`);
    assert.equal(complete.exported, 1, `${format}: exported count`);
    assert.equal(complete.cancelled, false, `${format}: not cancelled`);
    assert.equal(complete.errors.length, 0, `${format}: no errors`);
  }
});

test('exports multiple frames concurrently and reports the full count', async () => {
  const p = createPlugin();
  const base = await bootstrap(p);
  const { complete, files } = await runExport(
    p,
    [row(base, { id: 'r1', nodeId: 'n1', format: 'PNG' }), row(base, { id: 'r2', nodeId: 'n2', format: 'PNG' })],
    { base, settings: { nameTemplate: [T.name, T.scale] } },
  );
  assert.equal(files.length, 2);
  assert.equal(complete.exported, 2);
  assert.equal(complete.total, 2);
});

// ---------------------------------------------------------------------------
test('filename template tokens resolve (name, scale, page)', async () => {
  const p = createPlugin();
  const base = await bootstrap(p);
  const { files } = await runExport(
    p,
    [row(base, { nodeId: 'n1', format: 'PNG' })],
    { base, settings: { nameTemplate: [T.page, T.text('/'), T.name, T.text(' '), T.scale] } },
  );
  assert.equal(files[0].fileName, 'Page 1/Icon @1x.png');
});

test('scale token is omitted for vector formats', async () => {
  const p = createPlugin();
  const base = await bootstrap(p);
  const { files } = await runExport(
    p,
    [row(base, { nodeId: 'n1', format: 'SVG' })],
    { base, settings: { nameTemplate: [T.name, T.scale] } },
  );
  assert.equal(files[0].fileName, 'Icon.svg', 'no @1x for SVG');
});

test('folder structure: "/" kept when preserveFolderStructure, flattened otherwise', async () => {
  const nodes = [makeNode('n1', 'section/icon')];
  for (const [preserve, expected] of [[true, 'section/icon.png'], [false, 'section-icon.png']]) {
    const p = createPlugin({ nodes });
    const base = await bootstrap(p);
    const { files } = await runExport(
      p,
      [row(base, { nodeId: 'n1', format: 'PNG' })],
      { base, settings: { nameTemplate: [T.name], preserveFolderStructure: preserve } },
    );
    assert.equal(files[0].fileName, expected, `preserve=${preserve}`);
  }
});

// ---------------------------------------------------------------------------
test('path traversal is sanitized — no ".." escapes (TP-02)', async () => {
  const nodes = [makeNode('n1', '../../evil')];
  const p = createPlugin({ nodes });
  const base = await bootstrap(p);
  const { files } = await runExport(
    p,
    [row(base, { nodeId: 'n1', format: 'PNG' })],
    { base, settings: { nameTemplate: [T.name], preserveFolderStructure: true } },
  );
  assert.ok(!files[0].fileName.includes('..'), `no traversal in "${files[0].fileName}"`);
  assert.equal(files[0].fileName, 'evil.png');
});

test('Windows-reserved device names are suffixed (TP-20)', async () => {
  const nodes = [makeNode('n1', 'CON')];
  const p = createPlugin({ nodes });
  const base = await bootstrap(p);
  const { files } = await runExport(
    p,
    [row(base, { nodeId: 'n1', format: 'PNG' })],
    { base, settings: { nameTemplate: [T.name] } },
  );
  assert.equal(files[0].fileName, 'CON_.png');
});

// ---------------------------------------------------------------------------
test('one timestamp for the whole batch — {date}/{time} stay consistent (TP-11)', async () => {
  const nodes = [makeNode('n1', 'A'), makeNode('n2', 'A'), makeNode('n3', 'A')];
  const p = createPlugin({ nodes });
  const base = await bootstrap(p);
  const { files } = await runExport(
    p,
    ['n1', 'n2', 'n3'].map((id, i) => row(base, { id: `r${i}`, nodeId: id, format: 'PNG' })),
    { base, settings: { nameTemplate: [T.name, T.text('-'), T.date, T.text('-'), T.time] } },
  );
  const unique = new Set(files.map((f) => f.fileName));
  assert.equal(unique.size, 1, `all files share one timestamp: ${[...unique].join(', ')}`);
});

// ---------------------------------------------------------------------------
test('estimates: only WebP routes through raster worker; PNG/JPG stay fast (TP-03/04)', async () => {
  const nodes = [makeNode('n1', 'A'), makeNode('n2', 'B'), makeNode('n3', 'C'), makeNode('n4', 'D')];
  const p = createPlugin({ nodes });
  const base = await bootstrap(p);
  const rows = [
    row(base, { id: 'r1', nodeId: 'n1', format: 'PNG' }),
    row(base, { id: 'r2', nodeId: 'n2', format: 'JPG' }),
    row(base, { id: 'r3', nodeId: 'n3', format: 'WEBP' }),
    row(base, { id: 'r4', nodeId: 'n4', format: 'SVG' }),
  ];
  const { result, rasterRequests } = await requestEstimates(p, rows, { base });
  const formats = rasterRequests.map((r) => r.format).sort();
  assert.deepEqual(formats, ['WEBP'], 'only WebP needs worker estimation');
  assert.ok(
    rasterRequests.every((r) => r.presetSettings && typeof r.presetSettings === 'object'),
    'estimate-raster carries presetSettings (TP-04)',
  );
  assert.ok(result.estimates.r1 && typeof result.estimates.r1.bytes === 'number', 'PNG estimate produced bytes');
  assert.ok(result.estimates.r2 && typeof result.estimates.r2.bytes === 'number', 'JPG estimate produced bytes');
  assert.ok(result.estimates.r3 && typeof result.estimates.r3.bytes === 'number', 'WEBP estimate produced bytes');
  assert.ok(result.estimates.r4 && typeof result.estimates.r4.bytes === 'number', 'SVG estimate produced bytes');
});

// ---------------------------------------------------------------------------
test('cancellation stops the export and reports cancelled (TP-19)', async () => {
  const p = createPlugin();
  const base = await bootstrap(p);
  const { complete } = await cancelExport(
    p,
    [row(base, { id: 'r1', nodeId: 'n1', format: 'PNG' }), row(base, { id: 'r2', nodeId: 'n2', format: 'PNG' })],
    { base },
  );
  assert.equal(complete.cancelled, true);
  assert.ok(complete.exported < 2, 'fewer than all files exported after cancel');
});

// ---------------------------------------------------------------------------
test('run-export with no rows completes with an error, not a hang (TP-06)', async () => {
  const p = createPlugin();
  const base = await bootstrap(p);
  const { complete } = await runExport(p, [], { base });
  assert.equal(complete.exported, 0);
  assert.ok(complete.errors.length >= 1);
});

test('a missing/deselected node is reported as a row error', async () => {
  const p = createPlugin();
  const base = await bootstrap(p);
  const { complete, files } = await runExport(
    p,
    [row(base, { nodeId: 'does-not-exist', format: 'PNG' })],
    { base },
  );
  assert.equal(files.length, 0, 'no file emitted for a missing node');
  assert.equal(complete.exported, 0);
  assert.equal(complete.errors.length, 1);
});

// ---------------------------------------------------------------------------
test('closeAfterExport closes the plugin once the export finishes', async () => {
  const p = createPlugin();
  const base = await bootstrap(p);
  await runExport(
    p,
    [row(base, { nodeId: 'n1', format: 'PNG' })],
    { base, settings: { closeAfterExport: true } },
  );
  await p.tick(700); // closeAfterExport uses a 500ms timer
  assert.notEqual(p.closed(), null, 'figma.closePlugin was called');
});
