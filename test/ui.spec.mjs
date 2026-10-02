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


test('sizing dropdown accepts custom values and remembers each mode', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 360, height: 520 });
  async function apply(mode, value) {
    await page.locator('.sizing-control:not(.profile-choice) > .sizing-summary').click();
    await page.locator(`.sizing-mode input[value="${mode}"]`).check();
    const presets = page.locator('.sizing-presets button');
    const count = await presets.count();
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(5);
    const presetValue = await presets.last().locator('.sizing-preset-number').textContent();
    await presets.last().click();
    await expect(page.locator('form.sizing-panel .sizing-value-input')).toHaveValue(presetValue);
    await page.locator('form.sizing-panel .sizing-value-input').fill(String(value));
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
  }
  await page.locator('.sizing-control:not(.profile-choice) > .sizing-summary').click();
  await page.getByRole('button', { name: '2x', exact: true }).click();
  await expect(page.locator('form.sizing-panel .sizing-value-input')).toHaveValue('2');
  const valueField = page.locator('form.sizing-panel .sizing-value-field');
  const applyBounds = await page.getByRole('button', { name: 'Apply', exact: true }).boundingBox();
  const inputBounds = await valueField.boundingBox();
  expect(applyBounds.width).toBeLessThan(inputBounds.width);
  expect(applyBounds.height).toBeLessThanOrEqual(32);
  await expect(valueField).toHaveCSS('box-shadow', 'none');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(valueField).not.toHaveCSS('box-shadow', 'none');
  await page.locator('form.sizing-panel .sizing-value-input').click();
  await expect(valueField).toHaveCSS('box-shadow', 'none');
  await expect(page.getByRole('button', { name: '2x', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('form.sizing-panel .sizing-value-input').fill('2.25');
  await expect(page.getByRole('button', { name: '2x', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('.sizing-control:not(.profile-choice) > .sizing-summary')).toHaveText('2.25x');
  await apply('scale', 1.75);
  await expect(page.locator('.sizing-control:not(.profile-choice) > .sizing-summary')).toHaveText('1.75x');
  await apply('size', 200);
  await expect(page.locator('.sizing-control:not(.profile-choice) > .sizing-summary')).toHaveText('≤ 200 KB');
  await apply('width', 320);
  await apply('height', 240);
  const summaryBounds = await page.locator('.sizing-control:not(.profile-choice) > .sizing-summary').boundingBox();
  const exportBounds = await page.locator('#exportButton').boundingBox();
  expect(exportBounds.y + exportBounds.height <= summaryBounds.y || exportBounds.x >= summaryBounds.x + summaryBounds.width).toBe(true);
  await page.locator('.sizing-control:not(.profile-choice) > .sizing-summary').click();
  await page.locator('form.sizing-panel .sizing-value-input').fill('241');
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    const request = window.__h.captured.filter((m) => m.type === 'request-estimates').at(-1);
    window.__h.pluginSend({ type: 'estimates-result', requestId: request.requestId, estimates: {} });
  });
  await expect(page.locator('form.sizing-panel .sizing-value-input')).toHaveValue('241');
  await expect(page.locator('.sizing-control:not(.profile-choice)')).toHaveAttribute('open', '');
  await page.locator('form.sizing-panel .sizing-value-input').fill('240');
  const panelBounds = await page.locator('form.sizing-panel').boundingBox();
  expect(panelBounds.x).toBeGreaterThanOrEqual(16);
  expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(344);
  await expect(page.locator('.sizing-panel select')).toHaveCount(0);
  await expect(page.locator('form.sizing-panel .sizing-unit')).toHaveText('px');
  const field = await page.locator('form.sizing-panel .sizing-value-field').evaluate((field) => {
    const input = field.querySelector('input');
    const unit = field.querySelector('.sizing-unit');
    return { gap: unit.getBoundingClientRect().left - input.getBoundingClientRect().right,
      inputFont: getComputedStyle(input).fontSize, unitFont: getComputedStyle(unit).fontSize,
      inputColor: getComputedStyle(input).color, unitColor: getComputedStyle(unit).color };
  });
  expect(field.gap).toBeLessThanOrEqual(3);
  expect(field.unitFont).toBe(field.inputFont);
  expect(field.unitColor).not.toBe(field.inputColor);
  await page.screenshot({ path: 'test-results/sizing-dropdown.png' });
  await page.getByRole('radio', { name: 'Multiplier', exact: true }).check();
  await expect(page.locator('form.sizing-panel .sizing-value-input')).toHaveValue('1.75');
  await expect(page.locator('.sizing-mode-value, .sizing-panel-header')).toHaveCount(0);
  const modeBounds = await page.locator('.sizing-mode').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top, left: rect.left, right: rect.right };
  }));
  expect(new Set(modeBounds.map((rect) => rect.top)).size).toBe(1);
  expect(modeBounds.every((rect, index) => index === 0 || rect.left >= modeBounds[index - 1].right)).toBe(true);
  await page.screenshot({ path: 'test-results/sizing-multiplier.png' });
  await page.setViewportSize({ width: 360, height: 320 });
  const fixedPanel = await page.locator('form.sizing-panel').boundingBox();
  const anchor = await page.locator('.sizing-control:not(.profile-choice) > .sizing-summary').boundingBox();
  expect(fixedPanel.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
  expect(fixedPanel.y).toBe(panelBounds.y);
  expect(fixedPanel.y + fixedPanel.height).toBeLessThanOrEqual(304);
  await page.setViewportSize({ width: 360, height: 520 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.sizing-control:not(.profile-choice)')).not.toHaveAttribute('open', '');
  await page.waitForTimeout(250);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('fcompressor_v1_profile')));
  expect(profile).toMatchObject({ scale: 1.75, exportMode: 'height', maxKB: 200, maxWidth: 320, maxHeight: 240 });
  await page.locator('[data-choice="format"] > summary').click();
  await page.getByRole('menuitemradio', { name: 'SVG', exact: true }).click();
  await expect(page.locator('.sizing-control:not(.profile-choice)')).toHaveCount(0);
});

for (const format of ['PNG', 'JPG', 'WEBP']) {
  test(`file limit compresses a real ${format} payload below the requested bytes`, async ({ page }) => {
    await setup(page);
    await page.evaluate(async (format) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      const data = ctx.createImageData(400, 200);
      let seed = 12345;
      for (let i = 0; i < data.data.length; i += 4) {
        for (let j = 0; j < 3; j += 1) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          data.data[i + j] = seed >>> 24;
        }
        data.data[i + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      window.__h.sourceSize = bytes.length;
      window.__h.sourceBytes = bytes;
      const originalURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        if (blob.type === { PNG: 'image/png', JPG: 'image/jpeg', WEBP: 'image/webp' }[format]) {
          window.__h.deliveredBlob = blob;
        }
        return originalURL(blob);
      };
      window.__h.pluginSend({ type: 'estimate-raster', requestId: 900, format,
        exportMode: 'size', maxKB: 8, sourceMimeType: 'image/png', bytes });
    }, format);
    await expect.poll(() => page.evaluate(() => window.__h.captured.find((m) => m.type === 'estimate-raster-result' && m.requestId === 900)), { timeout: 30000 }).toBeTruthy();
    const result = await page.evaluate(() => ({ sourceSize: window.__h.sourceSize,
      result: window.__h.captured.find((m) => m.type === 'estimate-raster-result' && m.requestId === 900) }));
    expect(result.sourceSize).toBeGreaterThan(8 * 1024);
    expect(result.result.ok).toBe(true);
    expect(result.result.bytesLength).toBeLessThanOrEqual(8 * 1024);
    expect(result.result.bytesLength).toBeGreaterThan(0);
    await page.evaluate((format) => window.__h.pluginSend({ type: 'export-file',
      sessionId: 'sizing-test', deliveryId: 'sizing-file', rowId: 'n1', format,
      fileName: `limited.${format.toLowerCase()}`, sourceMimeType: 'image/png',
      exportMode: 'size', maxKB: 8, bytes: window.__h.sourceBytes,
    }), format);
    await expect.poll(() => page.evaluate(() => window.__h.captured.find((m) => m.type === 'export-file-ack' && m.deliveryId === 'sizing-file')), { timeout: 30000 }).toBeTruthy();
    const delivered = await page.evaluate(async () => {
      const blob = window.__h.deliveredBlob;
      const bitmap = blob ? await createImageBitmap(blob) : null;
      const dimensions = bitmap ? { width: bitmap.width, height: bitmap.height } : null;
      bitmap?.close();
      return { ack: window.__h.captured.find((m) => m.type === 'export-file-ack' && m.deliveryId === 'sizing-file'), size: blob?.size, dimensions };
    });
    expect(delivered.ack.ok).toBe(true);
    expect(delivered.size).toBeLessThanOrEqual(8 * 1024);
    expect(delivered.dimensions.width).toBeLessThan(400);
    expect(Math.abs(delivered.dimensions.width / delivered.dimensions.height - 2)).toBeLessThan(0.1);
  });
}


test('format and preset menus open below their triggers in a short window', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 360, height: 320 });
  const format = page.locator('[data-choice="format"]');
  await format.locator('summary').click();
  await expect(format.locator('[role="menu"]')).toBeVisible();
  const anchor = await format.locator('summary').boundingBox();
  const menu = await format.locator('[role="menu"]').boundingBox();
  expect(menu.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
  expect(menu.y + menu.height).toBeLessThanOrEqual(304);
  await page.screenshot({ path: 'test-results/format-dropdown.png' });
  await page.getByRole('menuitemradio', { name: 'JPG', exact: true }).click();
  await expect(format.locator('summary')).toHaveText('JPG');
  const preset = page.locator('[data-choice="preset"]');
  await preset.locator('summary').click();
  await expect(preset.locator('[role="menu"]')).toBeVisible();
  const presetAnchor = await preset.locator('summary').boundingBox();
  const presetMenu = await preset.locator('[role="menu"]').boundingBox();
  expect(presetMenu.y).toBeGreaterThanOrEqual(presetAnchor.y + presetAnchor.height);
  await page.getByRole('menuitemradio', { name: 'High', exact: true }).click();
  await expect(preset.locator('summary')).toHaveText('High');
  await format.locator('summary').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(format.locator('summary')).toHaveText('WebP');
  await format.locator('summary').click();
  await page.keyboard.press('Escape');
  await expect(format).not.toHaveAttribute('open', '');
});

test('shared settings menus save values and Original files fits its main control', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 360, height: 520 });
  const preset = page.locator('[data-choice="preset"]');
  await preset.locator('summary').click();
  await page.getByRole('menuitemradio', { name: 'Original files', exact: true }).click();
  await expect(preset.locator('summary')).toHaveText('Original files');
  const fits = await preset.locator('.choice-selected-label').evaluate((label) => label.scrollWidth <= label.clientWidth);
  expect(fits).toBe(true);
  await page.locator('#settingsToggleButton').click();
  await expect(page.locator('#settingsPanel select')).toHaveCount(0);
  const format = page.locator('#defaultsControls .settings-choice').first();
  await format.locator('summary').click();
  await expect(format.locator('[role="menu"]')).toBeVisible();
  const anchor = await format.locator('summary').boundingBox();
  const menu = await format.locator('[role="menu"]').boundingBox();
  expect(menu.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
  expect(menu.x).toBeGreaterThanOrEqual(16);
  expect(menu.x + menu.width).toBeLessThanOrEqual(344);
  expect(menu.y).toBeCloseTo(anchor.y + anchor.height + 8, 0);
  await page.screenshot({ path: 'test-results/settings-dropdown.png' });
  await page.getByRole('menuitemradio', { name: 'JPG', exact: true }).click();
  await expect(format.locator('summary')).toHaveText('JPG');
  await expect.poll(() => page.evaluate(() => window.__h.captured.filter((m) => m.type === 'persist-state').at(-1)?.state.defaults.format)).toBe('JPG');
  const scale = page.locator('#defaultsControls .settings-choice').nth(1);
  await scale.locator('summary').click();
  await page.getByRole('menuitemradio', { name: '2x', exact: true }).click();
  await expect(scale.locator('summary')).toHaveText('2x');
  await expect.poll(() => page.evaluate(() => window.__h.captured.filter((m) => m.type === 'persist-state').at(-1)?.state.defaults.scale)).toBe(2);
  await page.getByRole('button', { name: 'JPG', exact: true }).click();
  await page.locator('.preset-card-toggle').first().click();
  const quality = page.locator('.preset-card').first().locator('.settings-choice');
  await quality.locator('summary').click();
  await page.getByRole('menuitemradio', { name: '62', exact: true }).click();
  await expect(quality.locator('summary')).toHaveText('62');
  await expect.poll(() => page.evaluate(() => window.__h.captured.filter((m) => m.type === 'persist-state').at(-1)?.state.presetSettings.JPG['photo-high'].quality)).toBe(62);
});


test('Export becomes a download icon, then moves above dropdowns when space runs out', async ({ page }) => {
  await setup(page);
  const button = page.locator('#exportButton');
  await page.setViewportSize({ width: 640, height: 520 });
  await expect(button).toHaveText('Export 2');
  await page.setViewportSize({ width: 360, height: 520 });
  await expect(button).toHaveClass(/is-export-icon/);
  await expect(button.locator('svg')).toBeVisible();
  await expect(button).toHaveAttribute('aria-label', 'Export 2');
  const controls = page.locator('#profileStack');
  let exportBox = await button.boundingBox();
  let controlBox = await controls.boundingBox();
  expect(exportBox.y).toBe(controlBox.y);
  await page.screenshot({ path: 'test-results/export-icon.png' });
  await page.locator('[data-choice="preset"] > summary').click();
  await page.getByRole('menuitemradio', { name: 'Original files', exact: true }).click();
  await expect(page.locator('.topbar-head')).toHaveClass(/is-stacked-export/);
  exportBox = await button.boundingBox();
  controlBox = await controls.boundingBox();
  expect(exportBox.y + exportBox.height).toBeLessThan(controlBox.y);
  expect(exportBox.x).toBe(controlBox.x);
  await page.screenshot({ path: 'test-results/export-above.png' });
  await page.setViewportSize({ width: 640, height: 520 });
  await expect(button).toHaveText('Export 2');
  await expect(page.locator('.topbar-head')).not.toHaveClass(/is-stacked-export/);
  await page.setViewportSize({ width: 360, height: 520 });
  await expect(button).toHaveClass(/is-export-icon/);
  await button.click();
  await expect(button).toHaveClass(/is-stop/);
  await expect(button).toHaveAttribute('aria-label', /Stop export/);
  expect((await button.boundingBox()).width).toBe(36);
  await button.click();
  await expect.poll(() => page.evaluate(() => window.__h.captured.some((message) => message.type === 'cancel-export'))).toBe(true);
});

test('quick presets can be edited, removed, added and restored from saved settings', async ({ page }) => {
  await setup(page);
  await page.locator('#settingsToggleButton').click();
  await page.getByRole('button', { name: 'Sizing', exact: true }).click();
  const scale = page.locator('#quickPresetsSection [data-mode="scale"]');
  await expect(scale.locator('input')).toHaveCount(5);
  await expect(scale.getByRole('button', { name: 'Add preset', exact: true })).toBeDisabled();
  await scale.locator('input').first().fill('0.75');
  await scale.locator('input').first().press('Tab');
  await expect.poll(() => page.evaluate(() => window.__h.captured.filter(m => m.type === 'persist-state').at(-1)?.state.quickPresets.scale[0])).toBe(0.75);
  await scale.locator('.quick-preset-remove').last().click();
  await expect(scale.locator('input')).toHaveCount(4);
  await scale.getByRole('button', { name: 'Add preset', exact: true }).click();
  await expect(scale.locator('input')).toHaveCount(5);
  await scale.locator('input').last().fill('3');
  await scale.locator('input').last().press('Tab');
  const size = page.locator('#quickPresetsSection [data-mode="size"]');
  while (await size.locator('input').count()) await size.locator('.quick-preset-remove').first().click();
  await page.setViewportSize({ width: 360, height: 520 });
  await page.screenshot({ path: 'test-results/quick-presets-settings.png' });
  await expect.poll(() => page.evaluate(() => window.__h.captured.filter(m => m.type === 'persist-state').at(-1)?.state.quickPresets.scale)).toEqual([0.75, 1, 1.5, 2, 3]);
  const saved = await page.evaluate(() => window.__h.captured.filter(m => m.type === 'persist-state').at(-1).state);
  expect(saved.quickPresets.size).toEqual([]);
  await page.evaluate((state) => window.__h.pluginSend({ type: 'bootstrap', state, nodes: [] }), saved);
  await page.locator('#settingsCloseButton').click();
  await page.locator('.sizing-control:not(.profile-choice) > summary').click();
  await expect(page.locator('.sizing-preset')).toHaveCount(5);
  await expect(page.getByRole('button', { name: '0.75x', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '3x', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'File Size', exact: true }).check();
  await expect(page.locator('.sizing-preset')).toHaveCount(0);
});
