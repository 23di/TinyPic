// Black-box test harness for the built Figma plugin sandbox bundle (dist/code.js).
// It loads the real shipped bundle in a Node `vm` context with a mock `figma`
// global and drives it purely through the postMessage protocol — no source
// changes, no exports, no test code in src/.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SOURCE = readFileSync(new URL('../dist/code.js', import.meta.url), 'utf8');

const PNG_BYTES = () => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4, 5, 6, 7, 8]);
const SVG_BYTES = () => new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#000"/></svg>',
);

export function makeNode(id, name, overrides = {}) {
  return {
    id,
    name,
    type: 'FRAME',
    width: 48,
    height: 48,
    parent: { type: 'PAGE', name: 'Page 1' },
    exportAsync: async (settings) => (settings && settings.format === 'SVG' ? SVG_BYTES() : PNG_BYTES()),
    ...overrides,
  };
}

export function defaultNodes() {
  return [makeNode('n1', 'Icon'), makeNode('n2', 'Icon')];
}

export function createPlugin({ nodes = defaultNodes() } = {}) {
  const posted = [];
  const persisted = [];
  let onmsg = null;
  let closed = null;
  const storage = new Map();

  const figma = {
    currentPage: { selection: nodes, on() {}, name: 'Page 1' },
    root: { children: [{ type: 'PAGE', name: 'Page 1', children: nodes }] },
    ui: {
      postMessage: (m) => posted.push(m),
      get onmessage() { return onmsg; },
      set onmessage(f) { onmsg = f; },
      resize() {},
      on() {},
    },
    clientStorage: {
      getAsync: async (k) => storage.get(k),
      setAsync: async (k, v) => { storage.set(k, v); persisted.push({ key: k, value: v }); },
    },
    on() {},
    showUI() {},
    notify() {},
    closePlugin: (msg) => { closed = msg ?? ''; },
    mixed: Symbol('figma.mixed'),
    getNodeByIdAsync: async (id) => nodes.find((n) => n.id === id) || null,
  };

  const ctx = vm.createContext({
    figma, console, setTimeout, clearTimeout, queueMicrotask, Date,
    TextEncoder, TextDecoder, Promise, Uint8Array, ArrayBuffer, DataView,
    Math, JSON, Symbol, globalThis: {}, __html__: '',
  });
  vm.runInContext(SOURCE, ctx, { filename: 'dist/code.js' });

  const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
  const send = (m) => onmsg(m);
  const find = (t) => posted.find((m) => m.type === t);
  const all = (t) => posted.filter((m) => m.type === t);
  const clear = () => { posted.length = 0; };
  const waitFor = async (fn, ms = 3000) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const v = fn();
      if (v) return v;
      // eslint-disable-next-line no-await-in-loop
      await tick(5);
    }
    throw new Error('harness: timed out waiting for condition');
  };

  return { figma, posted, persisted, send, tick, find, all, clear, waitFor, closed: () => closed };
}

export async function bootstrap(p) {
  p.clear();
  await p.send({ type: 'ui-ready' });
  const b = await p.waitFor(() => p.find('bootstrap'));
  return b.state;
}

export function row(base, opts = {}) {
  const format = opts.format || base.defaults.format;
  const presets = base.defaults.presets || {};
  return {
    id: opts.id || 'r1',
    nodeId: opts.nodeId || 'n1',
    format,
    preset: opts.preset || presets[format],
    scale: opts.scale ?? base.defaults.scale,
  };
}

// Drive a full export, auto-acking every export-file the plugin emits.
export async function runExport(p, rows, { base, settings, perFile } = {}) {
  const b = base || await bootstrap(p);
  p.clear();
  const acked = new Set();
  const runP = p.send({
    type: 'run-export',
    defaults: b.defaults,
    settings: { ...b.settings, ...(settings || {}) },
    presetSettings: b.presetSettings,
    profiles: b.profiles,
    rows,
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ef = p.posted.find((m) => m.type === 'export-file' && !acked.has(m.deliveryId));
    if (ef) {
      acked.add(ef.deliveryId);
      const reply = perFile ? await perFile(ef) : { ok: true, bytesLength: 100 };
      // eslint-disable-next-line no-await-in-loop
      await p.send({ type: 'export-file-ack', sessionId: ef.sessionId, deliveryId: ef.deliveryId, ...reply });
      continue;
    }
    if (p.find('export-complete')) break;
    // eslint-disable-next-line no-await-in-loop
    await p.tick(5);
  }
  await runP;
  return { complete: p.find('export-complete'), files: p.all('export-file') };
}

// Drive an estimate request, auto-answering every estimate-raster the plugin emits.
export async function requestEstimates(p, rows, { base, rasterBytes = 50 } = {}) {
  const b = base || await bootstrap(p);
  p.clear();
  const answered = new Set();
  const reqP = p.send({
    type: 'request-estimates',
    requestId: 1,
    defaults: b.defaults,
    presetSettings: b.presetSettings,
    rows,
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const er = p.posted.find((m) => m.type === 'estimate-raster' && !answered.has(m.requestId));
    if (er) {
      answered.add(er.requestId);
      // eslint-disable-next-line no-await-in-loop
      await p.send({ type: 'estimate-raster-result', requestId: er.requestId, ok: true, bytesLength: rasterBytes });
      continue;
    }
    if (p.find('estimates-result')) break;
    // eslint-disable-next-line no-await-in-loop
    await p.tick(5);
  }
  await reqP;
  return { result: p.find('estimates-result'), rasterRequests: p.all('estimate-raster') };
}

// Start an export and cancel it after the first file is emitted.
export async function cancelExport(p, rows, { base } = {}) {
  const b = base || await bootstrap(p);
  p.clear();
  const runP = p.send({
    type: 'run-export',
    defaults: b.defaults,
    settings: b.settings,
    presetSettings: b.presetSettings,
    profiles: b.profiles,
    rows,
  });
  const ef = await p.waitFor(() => p.find('export-file'));
  await p.send({ type: 'cancel-export', sessionId: ef.sessionId });
  await runP;
  return { complete: p.find('export-complete') };
}
