// Black-box UI tests against the built dist/ui.html in real Chromium.
// A mock "plugin" speaks the postMessage protocol to the real main.js bundle —
// no source changes. Run with: npm run test:ui
import { test, expect } from '@playwright/test';

// Installs the mock-plugin harness on window.__h and bootstraps two frames so the
// Export button is enabled and the ZIP path (>1 output, download mode) is active.
async function setup(page, options = {}) {
  await page.goto('/ui.html');
  if (options.locale) {
    await page.evaluate((locale) => {
      localStorage.setItem('tinypic_locale', locale);
    }, options.locale);
    await page.reload();
  }
  await page.waitForFunction(() => !!document.getElementById('exportButton'));

  await page.evaluate(() => {
    try { window.showDirectoryPicker = undefined; } catch (e) {} // force browser-download (ZIP) path
    const h = (window.__h = { captured: [], zipBlobs: [] });
    const UI_TYPES = new Set([
      'ui-ready', 'persist-state', 'request-estimates', 'run-export', 'cancel-export',
      'export-file-ack', 'export-file-processing', 'estimate-raster-result', 'resize-ui',
    ]);
    window.addEventListener('message', (e) => {
      const m = e && e.data && e.data.pluginMessage;
      if (m && UI_TYPES.has(m.type)) h.captured.push(m);
    });
    h.pluginSend = (msg) => window.postMessage({ pluginMessage: msg }, '*');
    const origCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      try { if (blob && blob.type === 'application/zip') h.zipBlobs.push(blob); } catch (e) {}
      return origCreate(blob);
    };
    h.pluginSend({
      type: 'bootstrap',
      state: {},
      nodes: [
        { id: 'n1', name: 'm.youtube.com_watch_v=3mgItdLogl8(Screenshot Mobile) 1@1x', pageName: 'Page 1', type: 'FRAME', width: 48, height: 48 },
        { id: 'n2', name: 'Icon', pageName: 'Page 1', type: 'FRAME', width: 48, height: 48 },
      ],
    });
  });

  if (options.locale) {
    await expect(page.locator('#exportButton')).not.toHaveText('');
  } else {
    await expect(page.locator('#exportButton')).toHaveText('Export 2');
  }
}

async function visibleLayoutProblems(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const selectors = [
      'button',
      'select',
      '.topbar',
      '.settings-panel',
      '.table-panel',
      '.footer',
      '.setting-card',
      '.preset-card',
      '.settings-nav-btn',
      '.token-add-btn',
      '.ghost-btn',
      '.primary-btn',
      '.file-name',
    ];

    return Array.from(document.querySelectorAll(selectors.join(',')))
      .flatMap((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (
          style.display === 'none'
          || style.visibility === 'hidden'
          || rect.width <= 0
          || rect.height <= 0
        ) {
          return [];
        }

        const issues = [];
        if (rect.left < -1 || rect.right > viewportWidth + 1) {
          issues.push('viewport');
        }
        if (
          style.overflowX !== 'visible'
          && style.whiteSpace === 'nowrap'
          && el.scrollWidth > el.clientWidth + 2
        ) {
          issues.push('clipped');
        }

        return issues.length
          ? [{
            tag: el.tagName.toLowerCase(),
            className: el.className,
            text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            issues,
            rect: {
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
            },
          }]
          : [];
      });
  });
}

async function visibleFileRowOverlaps(page) {
  return page.evaluate(() => {
    const previewRect = document.querySelector('.preview-shell')?.getBoundingClientRect();
    if (!previewRect) return [];
    return Array.from(document.querySelectorAll('.file-name, .file-meta'))
      .flatMap((el) => {
        const rect = el.getBoundingClientRect();
        const intersectsPreview = rect.left < previewRect.right
          && rect.right > previewRect.left
          && rect.top < previewRect.bottom
          && rect.bottom > previewRect.top;
        return intersectsPreview
          ? [{
            className: el.className,
            text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            rect: {
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
            },
            preview: {
              left: Math.round(previewRect.left),
              right: Math.round(previewRect.right),
              top: Math.round(previewRect.top),
              bottom: Math.round(previewRect.bottom),
            },
          }]
          : [];
      });
  });
}

async function visibleFileRowGap(page) {
  return page.evaluate(() => {
    const previewRect = document.querySelector('.preview-shell')?.getBoundingClientRect();
    const nameRect = document.querySelector('.file-name')?.getBoundingClientRect();
    if (!previewRect || !nameRect) return null;
    return Math.round(nameRect.left - previewRect.right);
  });
}

test.beforeEach(async ({ page }) => {
  await setup(page);
});

test('Stop button cancels an in-flight export (TP-19)', async ({ page }) => {
  // start export
  await page.evaluate(() => { window.__h.captured.length = 0; document.getElementById('exportButton').click(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__h.pluginSend({ type: 'export-start', sessionId: 'sess', total: 3 }));

  const btn = page.locator('#exportButton');
  // During export the button shows the animated spinner + progress (no "Stop" text)
  // and is styled/clickable as a Stop control.
  await expect(btn).toHaveText(/\b0%/);
  await expect(btn).toHaveClass(/is-stop/);

  // click Stop -> sends cancel-export; button greys out (disabled, no longer red)
  // and keeps the same compact spinner label (no width change).
  await btn.click();
  await expect(btn).toBeDisabled();
  await expect(btn).not.toHaveClass(/is-stop/);
  await expect(page.locator('body')).toContainText('Stopping export…');
  const cancel = await page.evaluate(() => window.__h.captured.find((m) => m.type === 'cancel-export'));
  expect(cancel).toBeTruthy();
  expect(cancel.sessionId).toBe('sess');

  // plugin confirms cancellation
  await page.evaluate(() => window.__h.pluginSend({
    type: 'export-complete', sessionId: 'sess', cancelled: true, exported: 1, completed: 1, total: 3, errors: [],
  }));

  await expect(page.locator('body')).toContainText('Export stopped after 1 of 3 files.');
  await expect(btn).toHaveText('Export 2');
  await expect(btn).not.toHaveClass(/is-stop/);
});

test('ZIP dedup keeps both same-named files, with the UTF-8 flag (TP-01/TP-10)', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = window.__h;
    const sid = 'zip-sess';
    h.zipBlobs.length = 0;
    document.getElementById('exportButton').click();          // isExporting + zipBuffer path
    await new Promise((r) => setTimeout(r, 150));
    h.pluginSend({ type: 'export-start', sessionId: sid, total: 2 });
    await new Promise((r) => setTimeout(r, 60));
    const mk = (deliveryId, rowId) => ({
      type: 'export-file', sessionId: sid, deliveryId, rowId,
      format: 'PNG', fileName: 'Кнопка.png', mimeType: 'image/png', sourceMimeType: 'image/png',
      skipProcessing: true, bytes: [137, 80, 78, 71, 13, 10, 26, 10],
    });
    h.pluginSend(mk('d1', 'n1'));
    h.pluginSend(mk('d2', 'n2'));
    await new Promise((r) => setTimeout(r, 300));
    h.pluginSend({ type: 'export-complete', sessionId: sid, exported: 2, completed: 2, total: 2, errors: [] });
    await new Promise((r) => setTimeout(r, 250));

    if (!h.zipBlobs.length) return { error: 'no zip produced' };
    const buf = new Uint8Array(await h.zipBlobs[0].arrayBuffer());
    const dv = new DataView(buf.buffer);
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    const total = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder('utf-8');
    const entries = [];
    for (let n = 0; n < total; n++) {
      const flag = dv.getUint16(off + 8, true);
      const nameLen = dv.getUint16(off + 28, true);
      const extraLen = dv.getUint16(off + 30, true);
      const commLen = dv.getUint16(off + 32, true);
      entries.push({ name: dec.decode(buf.subarray(off + 46, off + 46 + nameLen)), utf8: (flag & 0x0800) === 0x0800 });
      off += 46 + nameLen + extraLen + commLen;
    }
    return { total, entries };
  });

  expect(result.error).toBeFalsy();
  expect(result.total).toBe(2);
  expect(result.entries.map((e) => e.name)).toEqual(['Кнопка.png', 'Кнопка (2).png']);
  expect(result.entries.every((e) => e.utf8)).toBe(true);
});

test('the button keeps its idle size during export (no width jump)', async ({ page }) => {
  const btn = page.locator('#exportButton');
  const idle = await btn.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  await page.evaluate(() => document.getElementById('exportButton').click());
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    window.__h.pluginSend({ type: 'export-start', sessionId: 'w', total: 4 });
    window.__h.pluginSend({ type: 'export-progress', sessionId: 'w', completed: 2, total: 4 });
  });
  const widths = await page.evaluate(async () => {
    const el = document.getElementById('exportButton');
    const ws = [];
    for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 90)); ws.push(Math.round(el.getBoundingClientRect().width)); }
    return ws;
  });
  expect(new Set(widths).size).toBe(1); // constant while the spinner animates
  expect(widths[0]).toBeLessThanOrEqual(idle + 1); // and no growth vs the idle "Export 2"
});

test('folder export streams to disk, but a Stop deletes the files AND folders it created', async ({ page }) => {
  // Mock the File System Access API with an in-memory filesystem (Sets of paths)
  // so prepareExportTarget enters directory mode and we can observe writes/deletes.
  // "existing/" is pre-seeded to prove pre-existing folders are never deleted.
  await page.evaluate(() => {
    window.__fs = new Set();
    window.__dirs = new Set(['existing']);
    const makeDir = (prefix) => ({
      name: prefix.split('/').filter(Boolean).pop() || 'root',
      kind: 'directory',
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      getDirectoryHandle: async (n, opts) => {
        const path = `${prefix}${n}`;
        if (!opts || !opts.create) {
          if (window.__dirs.has(path)) return makeDir(`${path}/`);
          throw new DOMException('not found', 'NotFoundError');
        }
        window.__dirs.add(path);
        return makeDir(`${path}/`);
      },
      getFileHandle: async (n, opts) => {
        const path = `${prefix}${n}`;
        if (!opts || !opts.create) {
          if (window.__fs.has(path)) return { name: n, kind: 'file' };
          throw new DOMException('not found', 'NotFoundError'); // dedup probe
        }
        return { name: n, kind: 'file', createWritable: async () => ({ write: async () => { window.__fs.add(path); }, close: async () => {}, abort: async () => {} }) };
      },
      removeEntry: async (n) => { window.__fs.delete(`${prefix}${n}`); window.__dirs.delete(`${prefix}${n}`); },
    });
    window.showDirectoryPicker = async () => makeDir('');
  });

  const drive = (cancel) => page.evaluate(async (isCancel) => {
    const h = window.__h;
    window.__fs = new Set();
    window.__dirs = new Set(['existing']);
    document.getElementById('exportButton').click(); // -> prepareExportTarget -> directory mode
    await new Promise((r) => setTimeout(r, 250));
    const sid = isCancel ? 'dir-cancel' : 'dir-ok';
    h.pluginSend({ type: 'export-start', sessionId: sid, total: 2 });
    await new Promise((r) => setTimeout(r, 60));
    const mk = (d, row, name) => ({ type: 'export-file', sessionId: sid, deliveryId: d, rowId: row, format: 'PNG', fileName: name, mimeType: 'image/png', sourceMimeType: 'image/png', skipProcessing: true, bytes: [1, 2, 3, 4] });
    h.pluginSend(mk('d1', 'n1', 'sub/A.png')); // into a folder the export must create
    h.pluginSend(mk('d2', 'n2', 'sub/B.png'));
    await new Promise((r) => setTimeout(r, 300));
    h.pluginSend({ type: 'export-complete', sessionId: sid, cancelled: isCancel, exported: isCancel ? 0 : 2, completed: isCancel ? 0 : 2, total: 2, errors: [] });
    await new Promise((r) => setTimeout(r, 400));
    return { files: [...window.__fs].sort(), dirs: [...window.__dirs].sort() };
  }, cancel);

  const stopped = await drive(true);
  expect(stopped.files).toEqual([]); // files removed
  expect(stopped.dirs).toEqual(['existing']); // created "sub" removed, pre-existing folder untouched

  const finished = await drive(false);
  expect(finished.files).toEqual(['sub/A.png', 'sub/B.png']); // files kept
  expect(finished.dirs).toEqual(['existing', 'sub']); // created folder kept
});

test('a failed estimate renders "Ready", never the literal "null" (TP-17)', async ({ page }) => {
  const out = await page.evaluate(async () => {
    const h = window.__h;
    h.captured.length = 0;
    h.pluginSend({ type: 'selection-sync', nodes: [{ id: 'n9', name: 'Badge', pageName: 'Page 1', type: 'FRAME', width: 24, height: 24 }] });
    let req = null;
    for (let i = 0; i < 20 && !req; i++) {
      await new Promise((r) => setTimeout(r, 100));
      req = h.captured.find((m) => m.type === 'request-estimates');
    }
    if (!req) return { error: 'no request-estimates' };
    const rowId = req.rows[0].id;
    h.pluginSend({ type: 'estimates-result', requestId: req.requestId, estimates: { [rowId]: { bytes: null, baselineBytes: null } } });
    await new Promise((r) => setTimeout(r, 250));
    return { text: document.body.innerText };
  });

  expect(out.error).toBeFalsy();
  expect(out.text).toMatch(/\bReady\b/);
  expect(out.text).not.toMatch(/(^|\s)null(\s|$)/);
});

test('all supported Figma locales render without visible layout overflow', async ({ page }) => {
  const locales = [
    ['en', 'Settings'],
    ['ja', '設定'],
    ['ko', '설정'],
    ['fr', 'Paramètres'],
    ['de', 'Einstellungen'],
    ['es-ES', 'Ajustes'],
    ['es-419', 'Ajustes'],
    ['pt-BR', 'Configurações'],
  ];

  for (const [locale, settingsTitle] of locales) {
    await setup(page, { locale });
    expect(await visibleLayoutProblems(page), locale).toEqual([]);
    expect(await visibleFileRowOverlaps(page), `${locale}: file row overlap`).toEqual([]);
    expect(await visibleFileRowGap(page), `${locale}: file row gap`).toBe(16);

    await page.locator('#settingsToggleButton').click();
    await expect(page.locator('.settings-header-title')).toHaveText(settingsTitle);
    expect(await visibleLayoutProblems(page), `${locale}: settings defaults`).toEqual([]);

    const tabCount = await page.locator('.settings-nav-btn').count();
    for (let index = 0; index < tabCount; index += 1) {
      await page.locator('.settings-nav-btn').nth(index).click();
      expect(await visibleLayoutProblems(page), `${locale}: tab ${index}`).toEqual([]);
    }
  }
});
