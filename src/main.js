import LibImageQuant from '@fe-daily/libimagequant-wasm';
import * as wasmModuleNamespace from '@fe-daily/libimagequant-wasm/wasm/libimagequant_wasm.js';
import initOxipng, { optimise as optimisePngSync } from '@jsquash/oxipng/codec/pkg/squoosh_oxipng.js';
import { encode as encodeWebp } from '@jsquash/webp';
import { PDFDocument } from 'pdf-lib';
import {
  OPEN_SOURCE_LIBRARIES,
} from './open-source-libraries.js';
import {
  AUTO_LOCALE,
  LOCALE_STORAGE_KEY,
  getLocaleOptions,
  normalizeLocalePreference,
  resolveLocalePreference,
  t,
  tp,
} from './i18n.js';
import RasterExportWorker from './raster-export-worker.js?worker&inline';

(function () {
  let activeLocale = resolveLocalePreference(loadLocalePreference());

  function tr(key, params) {
    return t(activeLocale, key, params);
  }

  function trp(key, count, params) {
    return tp(activeLocale, key, count, params);
  }

  function loadLocalePreference() {
    try {
      return localStorage.getItem(LOCALE_STORAGE_KEY) || AUTO_LOCALE;
    } catch {
      return AUTO_LOCALE;
    }
  }

  function saveLocalePreference(preference) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocalePreference(preference));
    } catch {
      // ignore storage failures
    }
  }

  function syncActiveLocale() {
    activeLocale = resolveLocalePreference(state.settings.locale);
    document.documentElement.lang = activeLocale;
  }

  const FORMAT_OPTIONS = [
    { value: 'PNG', labelKey: 'format.PNG' },
    { value: 'JPG', labelKey: 'format.JPG' },
    { value: 'WEBP', labelKey: 'format.WEBP' },
    { value: 'SVG', labelKey: 'format.SVG' },
    { value: 'PDF', labelKey: 'format.PDF' },
  ];
  const SVG_SVGO_PLUGIN_KEYS = [
    'cleanupAttrs',
    'cleanupEnableBackground',
    'cleanupIds',
    'cleanupListOfValues',
    'cleanupNumericValues',
    'collapseGroups',
    'convertColors',
    'convertEllipseToCircle',
    'convertOneStopGradients',
    'convertPathData',
    'convertShapeToPath',
    'convertStyleToAttrs',
    'convertTransform',
    'inlineStyles',
    'mergePaths',
    'mergeStyles',
    'minifyStyles',
    'moveElemsAttrsToGroup',
    'moveGroupAttrsToElems',
    'prefixIds',
    'removeComments',
    'removeDeprecatedAttrs',
    'removeDesc',
    'removeDimensions',
    'removeDoctype',
    'removeEditorsNSData',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'removeEmptyText',
    'removeHiddenElems',
    'removeMetadata',
    'removeNonInheritableGroupAttrs',
    'removeOffCanvasPaths',
    'removeRasterImages',
    'removeScripts',
    'removeStyleElement',
    'removeTitle',
    'removeUnknownsAndDefaults',
    'removeUnusedNS',
    'removeUselessDefs',
    'removeUselessStrokeAndFill',
    'removeViewBox',
    'removeXlink',
    'removeXMLNS',
    'removeXMLProcInst',
    'reusePaths',
    'sortAttrs',
    'sortDefsChildren',
  ];
  const SVG_SVGO_FLOAT_PRECISION_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  const SVG_EDITABLE_SVGO_KEYS = [
    'cleanupAttrs',
    'cleanupEnableBackground',
    'cleanupListOfValues',
    'cleanupNumericValues',
    'convertColors',
    'mergeStyles',
    'minifyStyles',
    'removeComments',
    'removeDesc',
    'removeDoctype',
    'removeEditorsNSData',
    'removeMetadata',
    'removeScripts',
    'removeXMLProcInst',
    'removeUnusedNS',
    'sortAttrs',
    'sortDefsChildren',
  ];
  const SVG_CLEAN_SVGO_KEYS = [
    'cleanupAttrs',
    'cleanupEnableBackground',
    'cleanupIds',
    'cleanupListOfValues',
    'cleanupNumericValues',
    'collapseGroups',
    'convertColors',
    'convertEllipseToCircle',
    'convertOneStopGradients',
    'convertPathData',
    'convertShapeToPath',
    'convertStyleToAttrs',
    'convertTransform',
    'inlineStyles',
    'mergePaths',
    'mergeStyles',
    'minifyStyles',
    'moveElemsAttrsToGroup',
    'moveGroupAttrsToElems',
    'removeComments',
    'removeDeprecatedAttrs',
    'removeDesc',
    'removeDoctype',
    'removeEditorsNSData',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'removeEmptyText',
    'removeHiddenElems',
    'removeMetadata',
    'removeNonInheritableGroupAttrs',
    'removeScripts',
    'removeUnknownsAndDefaults',
    'removeUnusedNS',
    'removeUselessDefs',
    'removeUselessStrokeAndFill',
    'removeXlink',
    'reusePaths',
    'sortAttrs',
    'sortDefsChildren',
  ];
  const SVG_OUTLINED_SVGO_KEYS = [
    ...SVG_CLEAN_SVGO_KEYS,
    'removeDimensions',
    'removeTitle',
  ];

  const PRESET_DEFINITIONS = {
    PNG: [
      {
        value: 'original',
        settings: {
          alphaEnabled: true,
          quantizeEnabled: false,
          maxColors: 256,
          qualityMin: 100,
          qualityTarget: 100,
          dithering: 0,
          quantizeSpeed: 3,
          oxipngLevel: 0,
          optimiseAlpha: false,
        },
      },
      {
        value: 'balanced',
        settings: {
          alphaEnabled: true,
          quantizeEnabled: false,
          maxColors: 256,
          qualityMin: 100,
          qualityTarget: 100,
          dithering: 0,
          quantizeSpeed: 3,
          oxipngLevel: 3,
          optimiseAlpha: true,
        },
      },
      {
        value: 'ui-png',
        settings: {
          alphaEnabled: true,
          quantizeEnabled: true,
          maxColors: 256,
          qualityMin: 95,
          qualityTarget: 100,
          dithering: 0,
          quantizeSpeed: 2,
          oxipngLevel: 3,
          optimiseAlpha: true,
        },
      },
      {
        value: 'web',
        settings: {
          alphaEnabled: true,
          quantizeEnabled: true,
          maxColors: 256,
          qualityMin: 84,
          qualityTarget: 95,
          dithering: 0.35,
          quantizeSpeed: 3,
          oxipngLevel: 4,
          optimiseAlpha: true,
        },
      },
      {
        value: 'smallest',
        settings: {
          alphaEnabled: true,
          quantizeEnabled: true,
          maxColors: 128,
          qualityMin: 56,
          qualityTarget: 72,
          dithering: 0.15,
          quantizeSpeed: 5,
          oxipngLevel: 6,
          optimiseAlpha: true,
        },
      },
    ],
    JPG: [
      { value: 'photo-high', settings: { quality: 92 } },
      { value: 'photo-balanced', settings: { quality: 84 } },
      { value: 'web-jpg', settings: { quality: 74 } },
      { value: 'preview-jpg', settings: { quality: 62 } },
    ],
    WEBP: [
      {
        value: 'lossless-webp',
        settings: {
          quality: 100,
          lossless: true,
        },
      },
      {
        value: 'balanced-webp',
        settings: {
          quality: 84,
          lossless: false,
        },
      },
      {
        value: 'web-webp',
        settings: {
          quality: 74,
          lossless: false,
        },
      },
      {
        value: 'preview-webp',
        settings: {
          quality: 62,
          lossless: false,
        },
      },
    ],
    SVG: [
      {
        value: 'editable-svg',
        settings: {
          svgOutlineText: false,
          svgIdAttribute: true,
          svgSimplifyStroke: false,
          svgoEnabled: true,
          svgoMultipass: false,
          svgoFloatPrecision: 3,
          svgoOverrides: '',
          svgoPlugins: createSvgSvgoPluginState(SVG_EDITABLE_SVGO_KEYS),
        },
      },
      {
        value: 'clean-svg',
        settings: {
          svgOutlineText: false,
          svgIdAttribute: false,
          svgSimplifyStroke: true,
          svgoEnabled: true,
          svgoMultipass: true,
          svgoFloatPrecision: 3,
          svgoOverrides: '',
          svgoPlugins: createSvgSvgoPluginState(SVG_CLEAN_SVGO_KEYS),
        },
      },
      {
        value: 'outlined-svg',
        settings: {
          svgOutlineText: true,
          svgIdAttribute: false,
          svgSimplifyStroke: true,
          svgoEnabled: true,
          svgoMultipass: true,
          svgoFloatPrecision: 2,
          svgoOverrides: '',
          svgoPlugins: createSvgSvgoPluginState(SVG_OUTLINED_SVGO_KEYS),
        },
      },
    ],
    PDF: [
      {
        value: 'document-pdf',
        settings: {
          contentsOnly: true,
          useAbsoluteBounds: false,
          mergePdfs: true,
        },
      },
      {
        value: 'review-pdf',
        settings: {
          contentsOnly: true,
          useAbsoluteBounds: true,
          mergePdfs: true,
        },
      },
      {
        value: 'print-pdf',
        settings: {
          contentsOnly: false,
          useAbsoluteBounds: true,
          mergePdfs: true,
        },
      },
    ],
  };

  const PNG_MAX_COLOR_OPTIONS = [256, 192, 128, 96, 64, 48, 32, 16];
  const PNG_QUALITY_OPTIONS = [100, 98, 95, 92, 88, 84, 78, 72, 64, 56];
  const PNG_DITHERING_OPTIONS = [0, 0.15, 0.35, 0.65, 1];
  const JPG_QUALITY_OPTIONS = [96, 92, 88, 84, 78, 74, 68, 62, 56];
  const WEBP_FIXED_ENCODER_OPTIONS = Object.freeze({
    method: 4,
    alpha_quality: 100,
    alpha_compression: 1,
  });
  const DEFAULT_PRESET_BY_FORMAT = {
    PNG: 'web',
    JPG: 'web-jpg',
    WEBP: 'web-webp',
    SVG: 'clean-svg',
    PDF: 'document-pdf',
  };

  function createDefaultPresetMap() {
    return { ...DEFAULT_PRESET_BY_FORMAT };
  }

  function createSvgSvgoPluginState(enabledKeys) {
    const enabledSet = new Set(Array.isArray(enabledKeys) ? enabledKeys : []);
    return Object.fromEntries(
      SVG_SVGO_PLUGIN_KEYS.map((key) => [key, enabledSet.has(key)]),
    );
  }

  function getFormatLabel(format) {
    return tr(`format.${normalizeFormat(format)}`);
  }

  function getPresetLabel(format, definition) {
    return tr(`preset.${normalizeFormat(format)}.${definition.value}.label`);
  }

  function getPresetHint(format, definition) {
    const key = `preset.${normalizeFormat(format)}.${definition.value}.hint`;
    const value = tr(key);
    return value === key ? '' : value;
  }

  function getTemplateVarLabel(item) {
    return tr(item.labelKey || `template.var.${item.key}`);
  }

  function formatSvgoPluginLabel(key) {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\bsvg\b/gi, 'SVG')
      .replace(/\bxml\b/gi, 'XML')
      .replace(/\bns\b/gi, 'NS')
      .replace(/\bid(s?)\b/gi, 'ID$1')
      .replace(/\battrs\b/gi, 'Attrs')
      .replace(/\bdefs\b/gi, 'Defs')
      .replace(/\bpaths\b/gi, 'Paths')
      .replace(/\bxlink\b/gi, 'XLink')
      .replace(/\bsvgo\b/gi, 'SVGO')
      .replace(/^./, (char) => char.toUpperCase());
  }

  const SCALE_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
  const EXPORT_CONCURRENCY_OPTIONS = [1, 2, 3, 4, 5, 6];
  const VECTOR_FORMATS = new Set(['SVG', 'PDF']);
  const UI_SIZE_LIMITS = {
    minWidth: 420,
    maxWidth: 1200,
    minHeight: 420,
    maxHeight: 1200,
  };
  const DEFAULT_NAME_TEMPLATE = [
    { type: 'var', key: 'name' },
    { type: 'var', key: 'scale' },
  ];
  const DEFAULT_ARCHIVE_NAME_TEMPLATE = [
    { type: 'var', key: 'page' },
    { type: 'text', value: ' ' },
    { type: 'var', key: 'date' },
  ];
  const NAME_TEMPLATE_VARS = [
    { key: 'name', labelKey: 'template.var.name' },
    { key: 'page', labelKey: 'template.var.page' },
    { key: 'scale', labelKey: 'template.var.scale' },
    { key: 'width', labelKey: 'template.var.width' },
    { key: 'height', labelKey: 'template.var.height' },
    { key: 'date', labelKey: 'template.var.date' },
    { key: 'time', labelKey: 'template.var.time' },
  ];
  const ARCHIVE_NAME_TEMPLATE_VARS = [
    ...NAME_TEMPLATE_VARS,
    { key: 'count', labelKey: 'template.var.count' },
  ];
  const VALID_TEMPLATE_VAR_KEYS = new Set(['name', 'page', 'scale', 'width', 'height', 'date', 'time']);
  const VALID_ARCHIVE_TEMPLATE_VAR_KEYS = new Set([...VALID_TEMPLATE_VAR_KEYS, 'count']);
  const DEFAULT_SETTINGS = {
    autoEstimateSize: true,
    closeAfterExport: false,
    exportConcurrency: 3,
    locale: loadLocalePreference(),
    nameTemplate: DEFAULT_NAME_TEMPLATE,
    archiveNameTemplate: DEFAULT_ARCHIVE_NAME_TEMPLATE,
    preserveFolderStructure: true,
  };
  const DEFAULT_DEFAULTS = {
    format: 'PNG',
    preset: 'web',
    presets: createDefaultPresetMap(),
    scale: 1,
  };
  const SETTINGS_GENERAL_TABS = [
    { value: 'defaults', labelKey: 'tab.defaults' },
    { value: 'export', labelKey: 'tab.export' },
    { value: 'language', labelKey: 'tab.language' },
    { value: 'data', labelKey: 'tab.data' },
    { value: 'libraries', labelKey: 'tab.libraries' },
  ];
  const EXPORT_BUTTON_BUSY_FRAMES = [
    '✱', '✲', '✳', '✴', '✳', '✲', '✱', '✲', '✳', '✴', '✳', '✲',
    '░', '░', '▒', '▒', '▓', '▓', '█', '▓', '▒', '░',
    '░', '░', '▒', '▒', '▓', '▓', '█', '▓', '▒', '░',
    '▖', '▘', '▝', '▗', '▚', '▞', '▛', '▜', '▟', '▙',
    '▖', '▘', '▝', '▗', '▚', '▞', '▛', '▜', '▟', '▙',
  ];
  const EXPORT_BUTTON_BUSY_INTERVAL_MS = 80;
  const WARNING_TOOLTIP_OFFSET_PX = 10;
  const WARNING_TOOLTIP_EDGE_PADDING_PX = 12;
  const LARGE_RASTER_WARNING_SINGLE_BYTES = 4 * 1024 * 1024;
  const LARGE_RASTER_WARNING_SINGLE_PIXELS = 8_000_000;

  let estimateTimer = null;
  let persistTimer = null;
  let activeEstimateRequestId = 0;
  let pendingSelectionMessage = null;
  let rowSeed = 0;
  let activeResize = null;

  const previewUrls = new Map();
  let activeExportTarget = null;
  let exportFileQueue = Promise.resolve();
  let zipBuffer = null;
  let pdfMergeBuffer = null;
  let pngQuantizer = null;
  let oxipngInitPromise = null;
  let exportButtonAnimationTimer = null;
  let exportButtonAnimationIndex = 0;
  let exportButtonLockedWidth = 0;
  let activeWarningTooltipTarget = null;
  let rasterExportWorker = null;
  let rasterExportRequestSeed = 0;
  const pendingRasterExportRequests = new Map();
  const expandedPresetCards = new Set();

  const PROFILE_STORAGE_KEY = 'fcompressor_v1_profile';

  function saveProfileToStorage(profile) {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        format: profile.format,
        preset: profile.preset,
        scale: profile.scale,
      }));
    } catch { /* ignore */ }
  }

  function loadProfileFromStorage() {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const storedProfile = loadProfileFromStorage();

  const state = {
    defaults: {
      format: DEFAULT_DEFAULTS.format,
      preset: DEFAULT_DEFAULTS.preset,
      presets: createDefaultPresetMap(),
      scale: DEFAULT_DEFAULTS.scale,
    },
    settings: { ...DEFAULT_SETTINGS },
    presetSettings: createDefaultPresetSettings(),
    profiles: [createDefaultProfile(storedProfile ? { ...DEFAULT_DEFAULTS, ...storedProfile } : undefined)],
    frames: [],
    rows: [],
    isEstimating: false,
    isExporting: false,
    isCancelling: false,
    exportProgress: {
      completed: 0,
      total: 0,
      fileName: '',
      sessionId: '',
    },
    uiSize: {
      width: window.innerWidth,
      height: window.innerHeight,
      ...UI_SIZE_LIMITS,
    },
    footerNote: '',
    view: 'export',
    settingsFormat: DEFAULT_DEFAULTS.format,
    settingsTab: 'defaults',
  };

  const dom = {
    settingsToggleButton: document.getElementById('settingsToggleButton'),
    settingsCloseButton: document.getElementById('settingsCloseButton'),
    profileStack: document.getElementById('profileStack'),
    exportButton: document.getElementById('exportButton'),
    settingsPanel: document.getElementById('settingsPanel'),
    exportPanel: document.getElementById('exportPanel'),
    settingsNavTabs: document.getElementById('settingsNavTabs'),
    defaultsSection: document.getElementById('defaultsSection'),
    exportSettingsSection: document.getElementById('exportSettingsSection'),
    languageSection: document.getElementById('languageSection'),
    settingsDataSection: document.getElementById('settingsDataSection'),
    openSourceSection: document.getElementById('openSourceSection'),
    presetEditorSection: document.getElementById('presetEditorSection'),
    defaultsControls: document.getElementById('defaultsControls'),
    exportSettingsControls: document.getElementById('exportSettingsControls'),
    languageControls: document.getElementById('languageControls'),
    settingsDataControls: document.getElementById('settingsDataControls'),
    openSourceControls: document.getElementById('openSourceControls'),
    settingsImportInput: document.getElementById('settingsImportInput'),
    presetSettingsControls: document.getElementById('presetSettingsControls'),
    exportTableBody: document.getElementById('exportTableBody'),
    emptyState: document.getElementById('emptyState'),
    footerStatus: document.getElementById('footerStatus'),
    footerMeta: document.getElementById('footerMeta'),
    overlayTooltip: document.getElementById('overlayTooltip'),
    resizeGrip: document.getElementById('resizeGrip'),
  };

  function sendPluginMessage(message) {
    parent.postMessage({ pluginMessage: message }, '*');
  }

  function clampUiDimension(value, minValue, maxValue, fallbackValue) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) {
      return fallbackValue;
    }
    return Math.max(minValue, Math.min(maxValue, parsed));
  }

  function normalizeUiSize(value) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const fallback = state.uiSize;
    return {
      minWidth: UI_SIZE_LIMITS.minWidth,
      maxWidth: UI_SIZE_LIMITS.maxWidth,
      minHeight: UI_SIZE_LIMITS.minHeight,
      maxHeight: UI_SIZE_LIMITS.maxHeight,
      width: clampUiDimension(
        safeValue.width,
        UI_SIZE_LIMITS.minWidth,
        UI_SIZE_LIMITS.maxWidth,
        fallback.width,
      ),
      height: clampUiDimension(
        safeValue.height,
        UI_SIZE_LIMITS.minHeight,
        UI_SIZE_LIMITS.maxHeight,
        fallback.height,
      ),
    };
  }

  function requestUiResize(width, height) {
    const nextSize = normalizeUiSize({ width, height });
    state.uiSize = nextSize;
    sendPluginMessage({
      type: 'resize-ui',
      width: nextSize.width,
      height: nextSize.height,
    });
  }

  function stopUiResize(pointerId) {
    if (
      pointerId !== undefined
      && dom.resizeGrip
      && typeof dom.resizeGrip.hasPointerCapture === 'function'
      && dom.resizeGrip.hasPointerCapture(pointerId)
    ) {
      try {
        dom.resizeGrip.releasePointerCapture(pointerId);
      } catch {
        // ignore capture release failures
      }
    }

    activeResize = null;
    document.body.classList.remove('is-resizing');
  }

  function handleResizeGripPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    activeResize = {
      pointerId: event.pointerId,
      startWidth: state.uiSize.width,
      startHeight: state.uiSize.height,
      startScreenX: event.screenX,
      startScreenY: event.screenY,
    };

    document.body.classList.add('is-resizing');

    if (typeof dom.resizeGrip.setPointerCapture === 'function') {
      dom.resizeGrip.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  }

  function handleResizeGripPointerMove(event) {
    if (!activeResize || event.pointerId !== activeResize.pointerId) {
      return;
    }

    requestUiResize(
      activeResize.startWidth + (event.screenX - activeResize.startScreenX),
      activeResize.startHeight + (event.screenY - activeResize.startScreenY),
    );
  }

  function handleResizeGripPointerUp(event) {
    if (!activeResize || event.pointerId !== activeResize.pointerId) {
      return;
    }

    stopUiResize(event.pointerId);
  }

  function getPngQuantizer() {
    if (!pngQuantizer) {
      const wasmModule = typeof wasmModuleNamespace.default === 'function'
        ? wasmModuleNamespace
        : { ...wasmModuleNamespace, default: wasmModuleNamespace };
      pngQuantizer = new LibImageQuant({ wasmModule });
    }
    return pngQuantizer;
  }

  async function optimisePng(bytes, options) {
    if (!oxipngInitPromise) {
      // Reset the cache on failure so a transient init error can be retried
      // instead of permanently disabling PNG optimization for the session.
      oxipngInitPromise = initOxipng().catch((error) => {
        oxipngInitPromise = null;
        throw error;
      });
    }
    await oxipngInitPromise;
    return optimisePngSync(
      toUint8Array(bytes),
      options.level ?? 2,
      Boolean(options.interlace),
      Boolean(options.optimiseAlpha),
    );
  }

  function getRasterExportWorker() {
    if (!rasterExportWorker) {
      rasterExportWorker = new RasterExportWorker({ name: 'raster-export-worker' });
      rasterExportWorker.addEventListener('message', handleRasterExportWorkerMessage);
      rasterExportWorker.addEventListener('error', handleRasterExportWorkerError);
      rasterExportWorker.addEventListener('messageerror', handleRasterExportWorkerMessageError);
    }
    return rasterExportWorker;
  }

  function settleRasterExportRequest(requestId, result) {
    const pending = pendingRasterExportRequests.get(requestId);
    if (!pending) {
      return;
    }
    pendingRasterExportRequests.delete(requestId);
    pending.resolve(result);
  }

  function handleRasterExportWorkerMessage(event) {
    const message = event.data;
    if (!message || message.type !== 'process-raster-result') {
      return;
    }

    if (message.ok) {
      settleRasterExportRequest(message.requestId, {
        ok: true,
        mimeType: message.mimeType || 'application/octet-stream',
        bytes: toUint8Array(message.bytes),
      });
      return;
    }

    settleRasterExportRequest(message.requestId, {
      ok: false,
      error: typeof message.error === 'string' ? message.error : tr('error.workerCompression'),
    });
  }

  function rejectAllRasterExportRequests(message) {
    const errorMessage = typeof message === 'string' && message ? message : tr('error.workerCompression');
    pendingRasterExportRequests.forEach((pending, requestId) => {
      pending.reject(new Error(errorMessage));
      pendingRasterExportRequests.delete(requestId);
    });
  }

  function teardownRasterExportWorker() {
    if (!rasterExportWorker) {
      return;
    }
    rasterExportWorker.removeEventListener('message', handleRasterExportWorkerMessage);
    rasterExportWorker.removeEventListener('error', handleRasterExportWorkerError);
    rasterExportWorker.removeEventListener('messageerror', handleRasterExportWorkerMessageError);
    // A worker 'error' event does not kill the thread; terminate it so faults
    // don't leak zombie workers (and their WASM heaps) across a session.
    rasterExportWorker.terminate();
    rasterExportWorker = null;
  }

  function handleRasterExportWorkerError(event) {
    rejectAllRasterExportRequests(
      event && event.message
        ? tr('error.workerCompressionMessage', { message: event.message })
        : tr('error.workerCompression'),
    );
    teardownRasterExportWorker();
  }

  function handleRasterExportWorkerMessageError() {
    rejectAllRasterExportRequests(tr('error.workerResponse'));
    teardownRasterExportWorker();
  }

  function createNode(tagName, className, textContent) {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (textContent !== undefined) {
      node.textContent = textContent;
    }
    return node;
  }

  function createExternalLink(label, href) {
    const link = createNode('a', 'library-link', label);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    return link;
  }

  function createChevronIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 6');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M1 1l4 4 4-4');
    svg.appendChild(path);
    return svg;
  }

  function getPresetDefinitions(format) {
    return PRESET_DEFINITIONS[format] || PRESET_DEFINITIONS[DEFAULT_DEFAULTS.format];
  }

  function getDefaultPresetValue(format) {
    const preferred = DEFAULT_PRESET_BY_FORMAT[format];
    return getPresetDefinition(format, preferred) ? preferred : getPresetDefinitions(format)[0].value;
  }

  function normalizeDefaultPresetMap(rawPresets, fallbackFormat, fallbackPreset) {
    const safePresets = rawPresets && typeof rawPresets === 'object' ? rawPresets : {};
    const defaults = createDefaultPresetMap();
    const safeFallbackFormat = normalizeFormat(fallbackFormat);

    FORMAT_OPTIONS.forEach((option) => {
      defaults[option.value] = normalizePreset(option.value, safePresets[option.value]);
    });

    if (!safePresets[safeFallbackFormat] && fallbackPreset) {
      defaults[safeFallbackFormat] = normalizePreset(safeFallbackFormat, fallbackPreset);
    }

    return defaults;
  }

  function getDefaultPresetForFormat(defaults, format) {
    const safeDefaults = defaults && typeof defaults === 'object' ? defaults : DEFAULT_DEFAULTS;
    const safeFormat = normalizeFormat(format);
    const storedPresets = normalizeDefaultPresetMap(
      safeDefaults.presets,
      safeDefaults.format,
      safeDefaults.preset,
    );
    return storedPresets[safeFormat];
  }

  function getPresetDefinition(format, preset) {
    return getPresetDefinitions(format).find((definition) => definition.value === preset) || null;
  }

  function isPresetSettingsTab(value) {
    return FORMAT_OPTIONS.some((option) => option.value === value);
  }

  function normalizeSettingsTab(value) {
    if (SETTINGS_GENERAL_TABS.some((tab) => tab.value === value) || isPresetSettingsTab(value)) {
      return value;
    }
    return SETTINGS_GENERAL_TABS[0].value;
  }

  function getSettingsNavItems() {
    const leadingTabs = SETTINGS_GENERAL_TABS.filter((tab) => (
      tab.value === 'defaults' || tab.value === 'export'
    ));
    const trailingTabs = SETTINGS_GENERAL_TABS.filter((tab) => (
      tab.value !== 'defaults' && tab.value !== 'export'
    ));
    return [
      ...leadingTabs,
      ...FORMAT_OPTIONS.map((option) => ({
        value: option.value,
        label: getFormatLabel(option.value),
      })),
      ...trailingTabs,
    ];
  }

  function normalizeFormat(value) {
    return FORMAT_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_DEFAULTS.format;
  }

  function normalizePreset(format, value) {
    return getPresetDefinition(format, value) ? value : getDefaultPresetValue(format);
  }

  function normalizeScale(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return DEFAULT_DEFAULTS.scale;
    }

    let closest = SCALE_OPTIONS[0];
    let minDistance = Math.abs(parsed - closest);
    SCALE_OPTIONS.forEach((option) => {
      const distance = Math.abs(parsed - option);
      if (distance < minDistance) {
        closest = option;
        minDistance = distance;
      }
    });
    return closest;
  }

  function normalizeExportConcurrency(value) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) {
      return DEFAULT_SETTINGS.exportConcurrency;
    }
    return Math.max(1, Math.min(6, parsed));
  }

  function resolveLegacyScale(rawState) {
    if (rawState && Array.isArray(rawState.presets) && rawState.presets.length) {
      return rawState.presets[0].scale;
    }
    return DEFAULT_DEFAULTS.scale;
  }

  function createDefaultPresetSettings() {
    const result = {};

    Object.keys(PRESET_DEFINITIONS).forEach((format) => {
      result[format] = {};
      PRESET_DEFINITIONS[format].forEach((definition) => {
        result[format][definition.value] = normalizePresetSettingBundle(
          format,
          definition.settings,
          definition.settings,
        );
      });
    });

    return result;
  }

  function normalizeSvgSvgoPluginState(value, fallbackValue) {
    const safeValue = value && typeof value === 'object' ? value : {};
    const safeFallback = fallbackValue && typeof fallbackValue === 'object'
      ? fallbackValue
      : createSvgSvgoPluginState();

    return Object.fromEntries(
      SVG_SVGO_PLUGIN_KEYS.map((key) => [key, Boolean(
        safeValue[key] !== undefined ? safeValue[key] : safeFallback[key],
      )]),
    );
  }

  function normalizeClosestOption(value, options, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    let closest = options[0];
    let minDistance = Math.abs(parsed - closest);
    options.forEach((option) => {
      const distance = Math.abs(parsed - option);
      if (distance < minDistance) {
        closest = option;
        minDistance = distance;
      }
    });

    return closest;
  }

  function normalizePresetSettingValue(format, key, value, fallbackValue) {
    switch (format) {
      case 'PNG':
        if (key === 'alphaEnabled') {
          return Boolean(value);
        }
        if (key === 'quantizeEnabled' || key === 'optimiseAlpha') {
          return Boolean(value);
        }
        if (key === 'maxColors') {
          return normalizeClosestOption(
            value,
            PNG_MAX_COLOR_OPTIONS,
            normalizeClosestOption(fallbackValue, PNG_MAX_COLOR_OPTIONS, 256),
          );
        }
        if (key === 'qualityMin') {
          return normalizeClosestOption(
            value,
            PNG_QUALITY_OPTIONS,
            normalizeClosestOption(fallbackValue, PNG_QUALITY_OPTIONS, 84),
          );
        }
        if (key === 'qualityTarget') {
          return normalizeClosestOption(
            value,
            PNG_QUALITY_OPTIONS,
            normalizeClosestOption(fallbackValue, PNG_QUALITY_OPTIONS, 95),
          );
        }
        if (key === 'dithering') {
          return normalizeClosestOption(
            value,
            PNG_DITHERING_OPTIONS,
            normalizeClosestOption(fallbackValue, PNG_DITHERING_OPTIONS, 0),
          );
        }
        if (key === 'quantizeSpeed') {
          const parsed = Math.round(Number(value));
          if (!Number.isFinite(parsed)) {
            const fallbackParsed = Math.round(Number(fallbackValue));
            return Number.isFinite(fallbackParsed) ? Math.max(1, Math.min(10, fallbackParsed)) : 3;
          }
          return Math.max(1, Math.min(10, parsed));
        }
        if (key === 'oxipngLevel') {
          const parsed = Math.round(Number(value));
          if (!Number.isFinite(parsed)) {
            const fallbackParsed = Math.round(Number(fallbackValue));
            return Number.isFinite(fallbackParsed) ? Math.max(0, Math.min(6, fallbackParsed)) : 3;
          }
          return Math.max(0, Math.min(6, parsed));
        }
        break;
      case 'JPG':
        if (key === 'quality') {
          const parsed = Math.round(Number(value));
          if (JPG_QUALITY_OPTIONS.includes(parsed)) {
            return parsed;
          }
          const fallbackParsed = Math.round(Number(fallbackValue));
          return JPG_QUALITY_OPTIONS.includes(fallbackParsed) ? fallbackParsed : 84;
        }
        break;
      case 'WEBP':
        if (key === 'quality') {
          const parsed = Math.round(Number(value));
          if (parsed === 100 || JPG_QUALITY_OPTIONS.includes(parsed)) {
            return parsed;
          }
          const fallbackParsed = Math.round(Number(fallbackValue));
          if (fallbackParsed === 100 || JPG_QUALITY_OPTIONS.includes(fallbackParsed)) {
            return fallbackParsed;
          }
          return 74;
        }
        if (key === 'lossless') {
          return Boolean(value);
        }
        break;
      case 'SVG':
        if (
          key === 'svgOutlineText'
          || key === 'svgIdAttribute'
          || key === 'svgSimplifyStroke'
          || key === 'svgoEnabled'
          || key === 'svgoMultipass'
        ) {
          return Boolean(value);
        }
        if (key === 'svgoFloatPrecision') {
          return normalizeClosestOption(
            value,
            SVG_SVGO_FLOAT_PRECISION_OPTIONS,
            normalizeClosestOption(fallbackValue, SVG_SVGO_FLOAT_PRECISION_OPTIONS, 3),
          );
        }
        if (key === 'svgoOverrides') {
          return typeof value === 'string'
            ? value
            : typeof fallbackValue === 'string' ? fallbackValue : '';
        }
        if (key === 'svgoPlugins') {
          return normalizeSvgSvgoPluginState(value, fallbackValue);
        }
        break;
      case 'PDF':
        if (key === 'contentsOnly' || key === 'useAbsoluteBounds' || key === 'mergePdfs') {
          return Boolean(value);
        }
        break;
      default:
        break;
    }

    return value;
  }

  function normalizePresetSettingBundle(format, settings, fallbackSettings) {
    const safeSettings = settings && typeof settings === 'object' ? settings : {};
    const safeFallback = fallbackSettings && typeof fallbackSettings === 'object' ? fallbackSettings : safeSettings;
    const normalized = {};

    Object.keys(safeSettings).forEach((key) => {
      normalized[key] = normalizePresetSettingValue(
        format,
        key,
        safeSettings[key],
        safeFallback[key],
      );
    });

    if (format === 'PNG' && normalized.qualityMin > normalized.qualityTarget) {
      normalized.qualityMin = normalized.qualityTarget;
    }

    return normalized;
  }

  function normalizePresetSettings(rawSettings) {
    const defaults = createDefaultPresetSettings();
    const safeSettings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

    Object.keys(PRESET_DEFINITIONS).forEach((format) => {
      const safeFormat = safeSettings[format] && typeof safeSettings[format] === 'object'
        ? safeSettings[format]
        : {};

      PRESET_DEFINITIONS[format].forEach((definition) => {
        const safePreset = safeFormat[definition.value] && typeof safeFormat[definition.value] === 'object'
          ? safeFormat[definition.value]
          : {};
        defaults[format][definition.value] = normalizePresetSettingBundle(
          format,
          {
            ...definition.settings,
            ...safePreset,
          },
          definition.settings,
        );
      });
    });

    return defaults;
  }

  function normalizeIncomingState(rawState) {
    const safeState = rawState && typeof rawState === 'object' ? rawState : {};
    const safeDefaults = safeState.defaults && typeof safeState.defaults === 'object'
      ? safeState.defaults
      : safeState;
    const safeFormat = normalizeFormat(safeDefaults.format);
    const safePresets = normalizeDefaultPresetMap(
      safeDefaults.presets,
      safeFormat,
      safeDefaults.preset,
    );
    const safeScale = normalizeScale(
      safeDefaults.scale !== undefined ? safeDefaults.scale : resolveLegacyScale(safeState),
    );
    const safeSettings = safeState.settings && typeof safeState.settings === 'object'
      ? safeState.settings
      : {};

    return {
      defaults: {
        format: safeFormat,
        preset: safePresets[safeFormat],
        presets: safePresets,
        scale: safeScale,
      },
      settings: {
        autoEstimateSize: safeSettings.autoEstimateSize !== undefined
          ? Boolean(safeSettings.autoEstimateSize)
          : DEFAULT_SETTINGS.autoEstimateSize,
        closeAfterExport: Boolean(safeSettings.closeAfterExport),
        exportConcurrency: normalizeExportConcurrency(safeSettings.exportConcurrency),
        locale: normalizeLocalePreference(
          safeSettings.locale !== undefined ? safeSettings.locale : loadLocalePreference(),
        ),
        nameTemplate: Array.isArray(safeSettings.nameTemplate)
          ? normalizeNameTemplate(safeSettings.nameTemplate)
          : (() => {
              // Legacy migration: reconstruct template from old fields
              const sep = typeof safeSettings.nameSeparator === 'string'
                ? safeSettings.nameSeparator
                : ' - ';
              const toks = [];
              if (safeSettings.namePrefix) {
                toks.push({ type: 'text', value: String(safeSettings.namePrefix) });
              }
              if (safeSettings.includePageName) {
                toks.push({ type: 'var', key: 'page' });
                toks.push({ type: 'text', value: sep });
              }
              toks.push({ type: 'var', key: 'name' });
              if (safeSettings.includeScale !== false) {
                toks.push({ type: 'text', value: sep });
                toks.push({ type: 'var', key: 'scale' });
              }
              if (safeSettings.nameSuffix) {
                toks.push({ type: 'text', value: String(safeSettings.nameSuffix) });
              }
              // A single {name} token is a valid template (e.g. scale was disabled),
              // so only fall back to the default when nothing was reconstructed.
              return toks.length >= 1 ? toks : DEFAULT_NAME_TEMPLATE.map((t) => ({ ...t }));
            })(),
        archiveNameTemplate: Array.isArray(safeSettings.archiveNameTemplate)
          ? normalizeArchiveNameTemplate(safeSettings.archiveNameTemplate)
          : DEFAULT_ARCHIVE_NAME_TEMPLATE.map((t) => ({ ...t })),
        preserveFolderStructure: safeSettings.preserveFolderStructure !== false,
      },
      presetSettings: normalizePresetSettings(safeState.presetSettings),
      profiles: normalizeProfiles(safeState.profiles, {
        format: safeFormat,
        preset: safePresets[safeFormat],
        presets: safePresets,
        scale: safeScale,
      }),
    };
  }

  function nextProfileId() {
    rowSeed += 1;
    return `profile-${rowSeed}`;
  }

  function normalizeScaleForFormat(format, value, fallbackValue = DEFAULT_DEFAULTS.scale) {
    const safeFormat = normalizeFormat(format);
    if (isVectorFormat(safeFormat)) {
      return 1;
    }
    return normalizeScale(value !== undefined ? value : fallbackValue);
  }

  function createDefaultProfile(baseDefaults) {
    const safeDefaults = baseDefaults && typeof baseDefaults === 'object' ? baseDefaults : DEFAULT_DEFAULTS;
    const format = normalizeFormat(safeDefaults.format);
    return {
      id: nextProfileId(),
      format,
      preset: getDefaultPresetForFormat(safeDefaults, format),
      scale: normalizeScaleForFormat(format, safeDefaults.scale),
    };
  }

  function normalizeProfiles(rawProfiles, fallbackDefaults) {
    if (!Array.isArray(rawProfiles) || !rawProfiles.length) {
      return [createDefaultProfile(fallbackDefaults)];
    }

    const safeProfile = rawProfiles[0] && typeof rawProfiles[0] === 'object' ? rawProfiles[0] : {};
    const format = normalizeFormat(safeProfile.format);
    return [{
      id: typeof safeProfile.id === 'string' && safeProfile.id ? safeProfile.id : nextProfileId(),
      format,
      preset: normalizePreset(
        format,
        safeProfile.preset !== undefined ? safeProfile.preset : getDefaultPresetForFormat(fallbackDefaults, format),
      ),
      scale: normalizeScaleForFormat(
        format,
        safeProfile.scale !== undefined ? safeProfile.scale : fallbackDefaults.scale,
      ),
    }];
  }

  function getPresetSettings(settingsState, format, preset) {
    const safeFormat = settingsState[format] && typeof settingsState[format] === 'object'
      ? settingsState[format]
      : {};
    const safePreset = safeFormat[preset] && typeof safeFormat[preset] === 'object'
      ? safeFormat[preset]
      : {};
    const fallback = getPresetDefinition(format, preset);
    return normalizePresetSettingBundle(
      format,
      {
        ...(fallback ? fallback.settings : {}),
        ...safePreset,
      },
      fallback ? fallback.settings : {},
    );
  }

  function formatScale(value) {
    const normalized = normalizeScale(value);
    return `${String(normalized).replace(/\.0$/, '')}x`;
  }

  function fitSelectToContent(select) {
    if (!(select instanceof HTMLSelectElement) || !select.options.length) {
      return;
    }

    const computed = window.getComputedStyle(select);
    const measureNode = document.createElement('span');
    measureNode.style.position = 'absolute';
    measureNode.style.visibility = 'hidden';
    measureNode.style.whiteSpace = 'pre';
    measureNode.style.font = computed.font;
    measureNode.style.letterSpacing = computed.letterSpacing;
    measureNode.style.fontKerning = computed.fontKerning;
    measureNode.style.textTransform = computed.textTransform;
    measureNode.style.pointerEvents = 'none';

    document.body.appendChild(measureNode);

    const selectedOption = select.options[select.selectedIndex] || select.options[0];
    measureNode.textContent = selectedOption ? selectedOption.textContent || '' : '';
    const textWidth = Math.ceil(measureNode.getBoundingClientRect().width);

    measureNode.remove();

    const horizontalInsets = (
      parseFloat(computed.paddingLeft) || 0
    ) + (
      parseFloat(computed.paddingRight) || 0
    ) + (
      parseFloat(computed.borderLeftWidth) || 0
    ) + (
      parseFloat(computed.borderRightWidth) || 0
    );

    select.style.width = `${Math.ceil(textWidth + horizontalInsets + 8)}px`;
  }

  function formatScaleSuffix(value) {
    const normalized = normalizeScale(value);
    return `@${String(normalized).replace(/\.0$/, '')}x`;
  }

  function formatDimensions(width, height) {
    return `${Math.max(1, Math.round(width))} × ${Math.max(1, Math.round(height))} px`;
  }

  function formatBytes(bytes) {
    if (bytes === null) {
      return tr('status.failed');
    }
    if (bytes === undefined) {
      return tr('status.estimatingSize');
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function toErrorMessage(error) {
    if (!error) {
      return tr('error.unknown');
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error.message === 'string') {
      return error.message;
    }
    return tr('error.unknown');
  }

  function formatPngDitheringLabel(value) {
    const normalized = normalizeClosestOption(value, PNG_DITHERING_OPTIONS, 0);
    if (normalized === 0) {
      return tr('dither.off');
    }
    if (normalized === 0.15) {
      return tr('dither.low');
    }
    if (normalized === 0.35) {
      return tr('dither.soft');
    }
    if (normalized === 0.65) {
      return tr('dither.medium');
    }
    return tr('dither.strong');
  }

  function isAbortError(error) {
    return Boolean(error && typeof error === 'object' && error.name === 'AbortError');
  }

  function createBrowserDownloadTarget() {
    return {
      mode: 'browser-download',
      label: tr('delivery.browserDownloads'),
      usedNames: new Set(),
      namingLock: Promise.resolve(),
    };
  }

  function createDirectoryExportTarget(directoryHandle) {
    return {
      mode: 'directory',
      label: directoryHandle && directoryHandle.name
        ? tr('delivery.folderName', { name: directoryHandle.name })
        : tr('delivery.selectedFolder'),
      directoryHandle,
      usedNames: new Set(),
      namingLock: Promise.resolve(),
      // Files written this session, so a Stop can remove them again.
      writtenFiles: [],
      // Subfolders this session created (not pre-existing ones), for the same reason.
      createdDirs: [],
      createdDirPaths: new Set(),
    };
  }

  async function ensureDirectoryWritePermission(directoryHandle) {
    if (!directoryHandle || typeof directoryHandle.requestPermission !== 'function') {
      return;
    }

    const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error(tr('error.folderDenied'));
    }
  }

  async function prepareExportTarget() {
    if (typeof window.showDirectoryPicker !== 'function') {
      return createBrowserDownloadTarget();
    }

    const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await ensureDirectoryWritePermission(directoryHandle);
    return createDirectoryExportTarget(directoryHandle);
  }

  function isVectorFormat(format) {
    return VECTOR_FORMATS.has(format);
  }

  function getFramePreviewUrl(nodeId) {
    return previewUrls.get(nodeId) || '';
  }

  function getFrameInitial(frameName) {
    const trimmed = String(frameName || '').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'F';
  }

  const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  function sanitizeFileSegment(value) {
    let sanitized = String(value || 'Untitled')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
      // Strip trailing dots/spaces (invalid on Windows).
      .replace(/[ .]+$/, '')
      .trim();
    // Neutralize "."/".."/"..." so a segment can never traverse directories.
    if (sanitized === '' || /^\.+$/.test(sanitized)) {
      sanitized = 'Untitled';
    }
    // Avoid Windows reserved device names (CON, NUL, COM1, ...).
    if (WINDOWS_RESERVED_NAME.test(sanitized)) {
      sanitized = `${sanitized}_`;
    }
    return sanitized;
  }

  function sanitizeVarValue(value) {
    // Preserve "/" as a folder separator while sanitizing each segment.
    const segments = String(value || 'Untitled')
      .replace(/\\/g, '/')
      .split('/')
      .map((segment) => segment
        .replace(/[:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[ .]+$/, '')
        .slice(0, 120))
      // Drop empty and dot-only ("."/"..") segments to prevent path traversal.
      .filter((segment) => segment.length > 0 && !/^\.+$/.test(segment));
    return segments.join('/') || 'Untitled';
  }

  function normalizeExportPath(path, preserveFolders) {
    const rawPath = String(path || 'Untitled');
    if (!preserveFolders) {
      return sanitizeFileSegment(rawPath.replace(/[\\/]+/g, '-'));
    }

    const segments = rawPath
      .replace(/\\/g, '/')
      .split('/')
      .filter((segment) => segment.trim().length > 0)
      .map((segment) => sanitizeFileSegment(segment))
      .filter((segment) => segment.length > 0);

    return segments.join('/') || 'Untitled';
  }

  function normalizeNameTemplate(tokens) {
    return normalizeTemplateTokens(tokens, VALID_TEMPLATE_VAR_KEYS, DEFAULT_NAME_TEMPLATE);
  }

  function normalizeArchiveNameTemplate(tokens) {
    return normalizeTemplateTokens(tokens, VALID_ARCHIVE_TEMPLATE_VAR_KEYS, DEFAULT_ARCHIVE_NAME_TEMPLATE);
  }

  function normalizeTemplateTokens(tokens, validVarKeys, fallbackTemplate) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return fallbackTemplate.map((t) => ({ ...t }));
    }
    const normalized = [];
    for (const token of tokens) {
      if (!token || typeof token !== 'object') {
        continue;
      }
      if (token.type === 'var' && validVarKeys.has(token.key)) {
        normalized.push({ type: 'var', key: token.key });
      } else if (token.type === 'text' && typeof token.value === 'string') {
        normalized.push({ type: 'text', value: token.value });
      }
    }
    return normalized.length > 0 ? normalized : fallbackTemplate.map((t) => ({ ...t }));
  }

  function padTwo(n) {
    return String(n).padStart(2, '0');
  }

  function formatExportDate(date) {
    return `${date.getFullYear()}${padTwo(date.getMonth() + 1)}${padTwo(date.getDate())}`;
  }

  function formatExportTime(date) {
    return `${padTwo(date.getHours())}${padTwo(date.getMinutes())}${padTwo(date.getSeconds())}`;
  }

  function evaluateNameTemplate(row, template, date) {
    const d = date instanceof Date ? date : new Date();
    let result = '';
    for (const token of template) {
      if (token.type === 'text') {
        result += token.value;
      } else if (token.type === 'var') {
        switch (token.key) {
          case 'name':
            result += sanitizeVarValue(row.name);
            break;
          case 'page':
            result += sanitizeVarValue(row.pageName || '');
            break;
          case 'scale':
            if (!isVectorFormat(row.format)) {
              result += formatScaleSuffix(row.scale);
            }
            break;
          case 'width':
            result += String(row.width || '');
            break;
          case 'height':
            result += String(row.height || '');
            break;
          case 'date':
            result += formatExportDate(d);
            break;
          case 'time':
            result += formatExportTime(d);
            break;
          case 'count':
            result += String(row.count || '');
            break;
        }
      }
    }
    return result;
  }

  function getFormatExtension(format) {
    switch (format) {
      case 'JPG':
        return 'jpg';
      case 'WEBP':
        return 'webp';
      case 'SVG':
        return 'svg';
      case 'PDF':
        return 'pdf';
      case 'PNG':
      default:
        return 'png';
    }
  }

  function buildRowFileName(row) {
    const template = state.settings.nameTemplate || DEFAULT_NAME_TEMPLATE;
    const preserveFolders = state.settings.preserveFolderStructure !== false;
    const path = normalizeExportPath(
      evaluateNameTemplate(row, template, new Date()),
      preserveFolders,
    );
    return `${path}.${getFormatExtension(row.format)}`;
  }

  function buildArchiveBaseName(template, date = new Date(), context = {}) {
    const safeTemplate = Array.isArray(template)
      ? normalizeArchiveNameTemplate(template)
      : DEFAULT_ARCHIVE_NAME_TEMPLATE.map((token) => ({ ...token }));
    const safeContext = context && typeof context === 'object' ? context : {};
    const baseName = evaluateNameTemplate(
      {
        name: safeContext.name || '',
        pageName: safeContext.pageName || '',
        scale: safeContext.scale !== undefined ? safeContext.scale : 1,
        width: safeContext.width || '',
        height: safeContext.height || '',
        format: safeContext.format || 'PNG',
        count: safeContext.count || '',
      },
      safeTemplate,
      date,
    );
    // sanitizeFileSegment never returns empty, so guard the empty template here.
    return baseName.trim() ? sanitizeFileSegment(baseName) : 'Images';
  }

  function buildArchiveFileName(template, date = new Date(), context = {}) {
    return `${buildArchiveBaseName(template, date, context)}.zip`;
  }

  function buildArchivePdfFileName(template, date = new Date(), context = {}) {
    return `${buildArchiveBaseName(template, date, context)}.pdf`;
  }

  function shouldMergePdfExport(rows) {
    if (!Array.isArray(rows) || rows.length <= 1) {
      return false;
    }

    return rows.every((row) => {
      if (!row || row.format !== 'PDF') {
        return false;
      }
      const presetSettings = getPresetSettings(state.presetSettings, 'PDF', row.preset);
      return Boolean(presetSettings.mergePdfs);
    });
  }

  function getExportOutputCount(rows = state.rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0) {
      return 0;
    }
    return shouldMergePdfExport(safeRows) ? 1 : safeRows.length;
  }

  function sortPdfMergeFiles(files) {
    const rowOrder = new Map(state.rows.map((row, index) => [row.id, index]));
    return files.slice().sort((a, b) => {
      const aIndex = rowOrder.has(a.rowId) ? rowOrder.get(a.rowId) : Number.MAX_SAFE_INTEGER;
      const bIndex = rowOrder.has(b.rowId) ? rowOrder.get(b.rowId) : Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }

  async function mergePdfFiles(files) {
    const mergedPdf = await PDFDocument.create();

    for (const file of sortPdfMergeFiles(files)) {
      const sourcePdf = await PDFDocument.load(toUint8Array(file.bytes));
      const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return new Uint8Array(await mergedPdf.save());
  }

  async function flushPdfMergeBuffer(buffer) {
    if (!buffer || !Array.isArray(buffer.files) || buffer.files.length === 0) {
      return null;
    }

    const bytes = await mergePdfFiles(buffer.files);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    if (!blob.size) {
      throw new Error(tr('error.pdfEmpty'));
    }

    await deliverExportFile(buffer.fileName || 'frame-export.pdf', blob);
    return bytes.byteLength;
  }

  function getSerializableSettingsState() {
    return {
      defaults: {
        ...state.defaults,
        presets: { ...state.defaults.presets },
      },
      settings: { ...state.settings },
      presetSettings: state.presetSettings,
      profiles: state.profiles.map((profile) => ({ ...profile })),
    };
  }

  function resetRowRuntime(row) {
    return {
      ...row,
      status: 'queued',
      estimateBytes: undefined,
      baselineBytes: undefined,
      exportedBytes: null,
      error: '',
    };
  }

  function buildRows(options) {
    const settings = options && typeof options === 'object'
      ? {
        preserveRuntime: Boolean(options.preserveRuntime),
        preserveOverrides: Boolean(options.preserveOverrides),
      }
      : {
        preserveRuntime: Boolean(options),
        preserveOverrides: false,
      };
    const previousRowsById = new Map(state.rows.map((row) => [row.id, row]));
    const nextRows = [];

    state.frames.forEach((frame) => {
      state.profiles.forEach((profile) => {
        const rowId = `${frame.id}::${profile.id}`;
        const existingRow = previousRowsById.get(rowId);
        const format = settings.preserveOverrides && existingRow
          ? normalizeFormat(existingRow.format)
          : profile.format;
        const preset = settings.preserveOverrides && existingRow
          ? normalizePreset(format, existingRow.preset)
          : profile.preset;
        const scale = settings.preserveOverrides && existingRow
          ? normalizeScaleForFormat(format, existingRow.scale, profile.scale)
          : normalizeScaleForFormat(format, profile.scale, state.defaults.scale);
        const baseRow = {
          id: rowId,
          nodeId: frame.id,
          profileId: profile.id,
          name: frame.name || 'Untitled',
          pageName: frame.pageName || 'Page',
          type: frame.type || 'FRAME',
          width: Number(frame.width) || 0,
          height: Number(frame.height) || 0,
          format,
          preset,
          scale,
        };
        const shouldPreserveRuntime = Boolean(existingRow) && settings.preserveRuntime && state.isExporting;

        nextRows.push({
          ...resetRowRuntime(baseRow),
          status: shouldPreserveRuntime ? existingRow.status : 'queued',
          estimateBytes: shouldPreserveRuntime ? existingRow.estimateBytes : undefined,
          baselineBytes: shouldPreserveRuntime ? existingRow.baselineBytes : undefined,
          exportedBytes: shouldPreserveRuntime ? existingRow.exportedBytes : null,
          error: shouldPreserveRuntime ? existingRow.error : '',
        });
      });
    });

    return nextRows;
  }

  function rebuildRows(options) {
    state.rows = buildRows(options);
  }

  function buildRequestRows() {
    return state.rows.map((row) => ({
      id: row.id,
      nodeId: row.nodeId,
      format: row.format,
      preset: row.preset,
      scale: row.scale,
    }));
  }

  function invalidateEstimates() {
    activeEstimateRequestId += 1;
    if (estimateTimer) {
      window.clearTimeout(estimateTimer);
      estimateTimer = null;
    }
    state.isEstimating = false;
    state.rows = state.rows.map((row) => (state.isExporting ? row : resetRowRuntime(row)));
  }

  function scheduleEstimate(delay) {
    if (estimateTimer) {
      window.clearTimeout(estimateTimer);
      estimateTimer = null;
    }

    if (!state.rows.length || state.isExporting || !state.settings.autoEstimateSize) {
      state.isEstimating = false;
      render();
      return;
    }

    state.isEstimating = true;
    render();

    estimateTimer = window.setTimeout(() => {
      requestEstimates();
    }, delay);
  }

  function requestEstimates() {
    if (!state.rows.length || state.isExporting) {
      return;
    }

    activeEstimateRequestId += 1;
    state.isEstimating = true;
    render();

    sendPluginMessage({
      type: 'request-estimates',
      requestId: activeEstimateRequestId,
      defaults: {
        ...state.defaults,
        presets: { ...state.defaults.presets },
      },
      presetSettings: state.presetSettings,
      rows: buildRequestRows(),
    });
  }

  function persistStateSoon() {
    if (persistTimer) {
      window.clearTimeout(persistTimer);
    }

    persistTimer = window.setTimeout(() => {
      sendPluginMessage({
        type: 'persist-state',
        state: getSerializableSettingsState(),
      });
    }, 120);
  }

  function updateFooterStatus(note) {
    state.footerNote = note;
    renderFooter();
  }

  function setSettingsTab(value) {
    const nextTab = normalizeSettingsTab(value);
    state.settingsTab = nextTab;
    if (isPresetSettingsTab(nextTab)) {
      state.settingsFormat = normalizeFormat(nextTab);
    }
    render();
  }

  function setView(nextView) {
    state.view = nextView === 'settings' ? 'settings' : 'export';
    render();
  }

  function setDefaultFormat(value) {
    const nextFormat = normalizeFormat(value);
    state.defaults.format = nextFormat;
    state.defaults.preset = getDefaultPresetForFormat(state.defaults, nextFormat);
    state.settingsFormat = nextFormat;
    render();
    persistStateSoon();
  }

  function setDefaultPresetForFormat(format, value) {
    const safeFormat = normalizeFormat(format);
    const nextPreset = normalizePreset(safeFormat, value);
    state.defaults.presets = {
      ...state.defaults.presets,
      [safeFormat]: nextPreset,
    };
    if (state.defaults.format === safeFormat) {
      state.defaults.preset = nextPreset;
    }
    render();
    persistStateSoon();
  }

  function setDefaultScale(value) {
    state.defaults.scale = normalizeScale(value);
    render();
    persistStateSoon();
  }

  function updateExportSetting(key, value) {
    if (key === 'autoEstimateSize') {
      state.settings.autoEstimateSize = Boolean(value);
    } else if (key === 'closeAfterExport') {
      state.settings.closeAfterExport = Boolean(value);
    } else if (key === 'exportConcurrency') {
      state.settings.exportConcurrency = normalizeExportConcurrency(value);
    } else if (key === 'locale') {
      state.settings.locale = normalizeLocalePreference(value);
      saveLocalePreference(state.settings.locale);
      syncActiveLocale();
    } else if (key === 'nameTemplate') {
      state.settings.nameTemplate = normalizeNameTemplate(value);
    } else if (key === 'archiveNameTemplate') {
      state.settings.archiveNameTemplate = normalizeArchiveNameTemplate(value);
    } else if (key === 'preserveFolderStructure') {
      state.settings.preserveFolderStructure = Boolean(value);
    } else {
      return;
    }

    render();
    persistStateSoon();

    if (key === 'autoEstimateSize') {
      scheduleEstimate(0);
    }
  }

  function updateProfileValue(profileId, key, value) {
    state.profiles = state.profiles.map((profile) => {
      if (profile.id !== profileId) {
        return profile;
      }

      if (key === 'format') {
        const nextFormat = normalizeFormat(value);
        return {
          ...profile,
          format: nextFormat,
          preset: getDefaultPresetForFormat(state.defaults, nextFormat),
          scale: normalizeScaleForFormat(nextFormat, profile.scale, state.defaults.scale),
        };
      }

      if (key === 'preset') {
        return {
          ...profile,
          preset: normalizePreset(profile.format, value),
        };
      }

      return {
        ...profile,
        scale: normalizeScaleForFormat(profile.format, value, state.defaults.scale),
      };
    });

    rebuildRows({ preserveRuntime: false, preserveOverrides: false });
    invalidateEstimates();
    render();
    persistStateSoon();
    scheduleEstimate(120);
    if (state.profiles[0]) saveProfileToStorage(state.profiles[0]);
  }

  function updatePresetSetting(format, preset, key, value) {
    const currentSettings = getPresetSettings(state.presetSettings, format, preset);
    const nextSettings = normalizePresetSettingBundle(format, {
      ...currentSettings,
      [key]: value,
    }, currentSettings);

    const hasChanges = Object.keys(nextSettings).some((settingKey) => (
      currentSettings[settingKey] !== nextSettings[settingKey]
    ));

    if (!hasChanges) {
      return;
    }

    state.presetSettings = {
      ...state.presetSettings,
      [format]: {
        ...state.presetSettings[format],
        [preset]: nextSettings,
      },
    };

    state.rows = state.rows.map((row) => (
      row.format === format && row.preset === preset ? resetRowRuntime(row) : row
    ));

    invalidateEstimates();
    render();
    persistStateSoon();
    scheduleEstimate(120);
  }

  function resetPresetToDefault(format, preset) {
    const definition = getPresetDefinition(format, preset);
    if (!definition) {
      return;
    }

    const normalizedSettings = normalizePresetSettingBundle(
      format,
      definition.settings,
      definition.settings,
    );

    state.presetSettings = {
      ...state.presetSettings,
      [format]: {
        ...state.presetSettings[format],
        [preset]: normalizedSettings,
      },
    };

    state.rows = state.rows.map((row) => (
      row.format === format && row.preset === preset ? resetRowRuntime(row) : row
    ));

    invalidateEstimates();
    render();
    persistStateSoon();
    scheduleEstimate(120);
  }

  function applyImportedSettings(rawState, sourceLabel) {
    const nextState = normalizeIncomingState(rawState);
    state.defaults = nextState.defaults;
    state.settings = nextState.settings;
    saveLocalePreference(state.settings.locale);
    syncActiveLocale();
    state.presetSettings = nextState.presetSettings;
    state.profiles = nextState.profiles;
    state.settingsTab = normalizeSettingsTab(state.settingsTab);
    state.settingsFormat = isPresetSettingsTab(state.settingsTab)
      ? normalizeFormat(state.settingsTab)
      : nextState.defaults.format;
    rebuildRows({ preserveRuntime: false, preserveOverrides: false });
    invalidateEstimates();
    render();
    persistStateSoon();
    scheduleEstimate(120);
    updateFooterStatus(
      sourceLabel
        ? tr('status.settingsImportedFrom', { source: sourceLabel })
        : tr('status.settingsImported'),
    );
  }

  function exportSettingsToFile() {
    const payload = JSON.stringify(getSerializableSettingsState(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    downloadBlob('tinypic-image-compressor-settings.json', blob);
    updateFooterStatus(tr('status.settingsExported'));
  }

  function resetAllSettings() {
    if (state.isExporting) {
      return;
    }

    applyImportedSettings({
      defaults: { ...DEFAULT_DEFAULTS },
      settings: { ...DEFAULT_SETTINGS },
      presetSettings: createDefaultPresetSettings(),
      profiles: [createDefaultProfile()],
    });
    updateFooterStatus(tr('status.settingsReset'));
  }

  function revokeRemovedPreviews(nextFrames) {
    const allowedIds = new Set(nextFrames.map((frame) => frame.id));
    Array.from(previewUrls.keys()).forEach((frameId) => {
      if (allowedIds.has(frameId)) {
        return;
      }
      URL.revokeObjectURL(previewUrls.get(frameId));
      previewUrls.delete(frameId);
    });
  }

  function toUint8Array(value) {
    if (value instanceof Uint8Array) {
      return value;
    }
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    if (Array.isArray(value)) {
      return Uint8Array.from(value);
    }
    return new Uint8Array();
  }

  function buildZip(files) {
    const enc = new TextEncoder();
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[i] = c;
    }
    function crc32(data) {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i++) {
        c = crcTable[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
      }
      return (c ^ 0xFFFFFFFF) >>> 0;
    }
    const entries = files.map(({ fileName, bytes }) => {
      const name = enc.encode(String(fileName || 'file'));
      const data = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
      // Set general-purpose bit 11 to signal UTF-8 filenames when non-ASCII.
      const flag = name.some((b) => b > 0x7f) ? 0x0800 : 0;
      return { name, data, crc: crc32(data), flag };
    });
    const localOffsets = [];
    let off = 0;
    for (const e of entries) {
      localOffsets.push(off);
      off += 30 + e.name.length + e.data.length;
    }
    const cdOffset = off;
    const cdSize = entries.reduce((s, e) => s + 46 + e.name.length, 0);
    const buf = new Uint8Array(cdOffset + cdSize + 22);
    const dv = new DataView(buf.buffer);
    let p = 0;
    function w16(v) { dv.setUint16(p, v, true); p += 2; }
    function w32(v) { dv.setUint32(p, v, true); p += 4; }
    function wb(b) { buf.set(b, p); p += b.length; }
    for (const e of entries) {
      w32(0x04034B50); w16(20); w16(e.flag); w16(0); w16(0); w16(0);
      w32(e.crc); w32(e.data.length); w32(e.data.length);
      w16(e.name.length); w16(0); wb(e.name); wb(e.data);
    }
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      w32(0x02014B50); w16(20); w16(20); w16(e.flag); w16(0); w16(0); w16(0);
      w32(e.crc); w32(e.data.length); w32(e.data.length);
      w16(e.name.length); w16(0); w16(0); w16(0); w16(0); w32(0);
      w32(localOffsets[i]); wb(e.name);
    }
    w32(0x06054B50); w16(0); w16(0);
    w16(entries.length); w16(entries.length);
    w32(cdSize); w32(cdOffset); w16(0);
    return buf;
  }

  async function loadRasterSource(bytes, mimeType) {
    const blob = new Blob([bytes], { type: mimeType || 'image/png' });

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose() {
          if (typeof bitmap.close === 'function') {
            bitmap.close();
          }
        },
      };
    }

    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error(tr('error.decodeRaster')));
        element.src = url;
      });

      return {
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        dispose() {
          URL.revokeObjectURL(url);
        },
      };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function createRasterCanvas(source, fillBackground) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(tr('error.canvasContext'));
    }

    if (fillBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(source.image, 0, 0);
    return { canvas, ctx };
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(tr('error.canvasEmpty')));
          return;
        }
        resolve(blob);
      }, mimeType, quality);
    });
  }

  function buildWebpEncodeOptions(presetSettings) {
    const quality = Math.round(Number(presetSettings.quality));
    const normalizedQuality = Number.isFinite(quality)
      ? Math.max(0, Math.min(100, quality))
      : 74;
    return {
      ...WEBP_FIXED_ENCODER_OPTIONS,
      quality: normalizedQuality,
      lossless: presetSettings.lossless ? 1 : 0,
    };
  }

  function downloadBlob(fileName, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 8000);
  }

  function reserveUniqueZipEntryName(usedNames, requestedFileName) {
    const { baseName, extension } = splitFileName(requestedFileName);
    let candidate = `${baseName}${extension}`;
    let suffix = 2;
    while (usedNames.has(candidate)) {
      candidate = `${baseName} (${suffix})${extension}`;
      suffix += 1;
    }
    usedNames.add(candidate);
    return candidate;
  }

  function splitFileName(fileName) {
    const normalized = String(fileName || 'export.bin');
    const dotIndex = normalized.lastIndexOf('.');
    if (dotIndex <= 0) {
      return {
        baseName: normalized,
        extension: '',
      };
    }

    return {
      baseName: normalized.slice(0, dotIndex),
      extension: normalized.slice(dotIndex),
    };
  }

  async function directoryContainsFile(directoryHandle, fileName) {
    try {
      await directoryHandle.getFileHandle(fileName);
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && error.name === 'NotFoundError') {
        return false;
      }
      throw error;
    }
  }

  async function reserveDirectoryFileName(target, requestedFileName, dirHandle, scopePath) {
    const resolvedDirHandle = dirHandle || target.directoryHandle;
    // Scope the in-memory dedup key by the full relative folder path, not just the
    // leaf directory name, so identically-named files in distinct subfolders don't
    // collide (e.g. "2024/icons/a.png" vs "2025/icons/a.png").
    const scopePrefix = scopePath ? `${scopePath}/` : '';
    const reserve = async () => {
      const { baseName, extension } = splitFileName(requestedFileName);
      let candidate = `${baseName}${extension}`;
      let suffix = 2;

      while (
        target.usedNames.has(scopePrefix + candidate)
        || await directoryContainsFile(resolvedDirHandle, candidate)
      ) {
        candidate = `${baseName} (${suffix})${extension}`;
        suffix += 1;
      }

      target.usedNames.add(scopePrefix + candidate);
      return candidate;
    };

    const reservation = target.namingLock.then(reserve, reserve);
    target.namingLock = reservation.then(() => undefined, () => undefined);
    return reservation;
  }

  async function writeBlobToDirectory(target, fileName, blob) {
    if (!target || target.mode !== 'directory' || !target.directoryHandle) {
      throw new Error(tr('error.noFolder'));
    }

    let dirHandle = target.directoryHandle;
    let leafName = fileName;
    let scopePath = '';

    if (state.settings.preserveFolderStructure && fileName.includes('/')) {
      const parts = fileName.split('/').filter((p) => p.length > 0 && p !== '.' && p !== '..');
      leafName = parts.pop();
      let pathSoFar = '';
      for (const part of parts) {
        pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
        // Probe first so we only track folders this session actually created
        // (pre-existing folders must never be deleted on Stop).
        let existed = true;
        try {
          // eslint-disable-next-line no-await-in-loop
          await dirHandle.getDirectoryHandle(part);
        } catch (error) {
          if (error && error.name === 'NotFoundError') {
            existed = false;
          }
        }
        const parentHandle = dirHandle;
        // eslint-disable-next-line no-await-in-loop
        dirHandle = await parentHandle.getDirectoryHandle(part, { create: true });
        if (!existed && Array.isArray(target.createdDirs) && !target.createdDirPaths.has(pathSoFar)) {
          target.createdDirPaths.add(pathSoFar);
          target.createdDirs.push({ parentHandle, name: part, path: pathSoFar });
        }
      }
      scopePath = parts.join('/');
    }

    const resolvedFileName = await reserveDirectoryFileName(target, leafName, dirHandle, scopePath);
    const fileHandle = await dirHandle.getFileHandle(resolvedFileName, { create: true });
    const writable = await fileHandle.createWritable();

    try {
      await writable.write(blob);
      await writable.close();
      // Track what we wrote so a Stop can delete exactly these files.
      if (Array.isArray(target.writtenFiles)) {
        target.writtenFiles.push({ dirHandle, name: resolvedFileName });
      }
    } catch (error) {
      try {
        await writable.abort();
      } catch (abortError) {
        // Ignore abort failures and surface the original write error.
      }
      throw error;
    }
  }

  async function deliverExportFile(fileName, blob) {
    if (activeExportTarget && activeExportTarget.mode === 'directory') {
      await writeBlobToDirectory(activeExportTarget, fileName, blob);
      return {
        detail: tr('delivery.savedTo', { target: activeExportTarget.label }),
      };
    }

    downloadBlob(fileName, blob);
    return {
      detail: tr('delivery.browserQueued'),
    };
  }

  function buildPngQuantizeOptions(presetSettings) {
    return {
      maxColors: presetSettings.maxColors || 256,
      quality: {
        min: presetSettings.qualityMin || 84,
        target: presetSettings.qualityTarget || 95,
      },
      dithering: presetSettings.dithering ?? 0,
      speed: presetSettings.quantizeSpeed || 3,
    };
  }

  function isRecoverablePngQuantizeError(error) {
    return /\bQualityTooLow\b/i.test(toErrorMessage(error));
  }

  async function quantizePngBytesWithFallback(quantizeWithOptions, presetSettings, getFallbackBytes) {
    const initialOptions = buildPngQuantizeOptions(presetSettings);
    try {
      const result = await quantizeWithOptions(initialOptions);
      return toUint8Array(result.pngBytes);
    } catch (error) {
      if (!isRecoverablePngQuantizeError(error)) {
        throw error;
      }

      console.warn(
        'PNG quantization skipped because the requested quality could not be reached for this image.',
        error,
      );
      return toUint8Array(await getFallbackBytes());
    }
  }

  async function finalisePngBytes(bytes, presetSettings) {
    const optimiseAlpha = Boolean(presetSettings.optimiseAlpha && presetSettings.alphaEnabled !== false);
    const requestedLevel = Math.max(0, Math.min(6, Number(presetSettings.oxipngLevel) || 0));
    const level = requestedLevel > 0 ? requestedLevel : (optimiseAlpha ? 1 : 0);

    if (level <= 0) {
      return toUint8Array(bytes);
    }

    const optimized = await optimisePng(bytes, {
      level,
      optimiseAlpha,
    });

    return new Uint8Array(optimized);
  }

  async function preparePngPayload(sourceBytes, sourceMimeType, presetSettings) {
    const shouldQuantize = Boolean(presetSettings.quantizeEnabled);
    const keepAlpha = presetSettings.alphaEnabled !== false;

    if (!shouldQuantize && keepAlpha && sourceMimeType === 'image/png') {
      return {
        bytes: await finalisePngBytes(sourceBytes, presetSettings),
        mimeType: 'image/png',
      };
    }

    if (shouldQuantize && keepAlpha && sourceMimeType === 'image/png') {
      const pngBytes = await quantizePngBytesWithFallback(
        (options) => getPngQuantizer().quantizePng(sourceBytes, options),
        presetSettings,
        async () => sourceBytes,
      );
      return {
        bytes: await finalisePngBytes(pngBytes, presetSettings),
        mimeType: 'image/png',
      };
    }

    const source = await loadRasterSource(sourceBytes, sourceMimeType || 'image/png');
    try {
      const { canvas, ctx } = createRasterCanvas(source, !keepAlpha);
      const encodeCanvasToPngBytes = async () => {
        const blob = await canvasToBlob(canvas, 'image/png');
        return new Uint8Array(await blob.arrayBuffer());
      };

      if (shouldQuantize) {
        const pngBytes = await quantizePngBytesWithFallback(
          (options) => getPngQuantizer().quantizeImageData(
            ctx.getImageData(0, 0, canvas.width, canvas.height),
            options,
          ),
          presetSettings,
          encodeCanvasToPngBytes,
        );
        return {
          bytes: await finalisePngBytes(pngBytes, presetSettings),
          mimeType: 'image/png',
        };
      }

      return {
        bytes: await finalisePngBytes(await encodeCanvasToPngBytes(), presetSettings),
        mimeType: 'image/png',
      };
    } finally {
      source.dispose();
    }
  }

  async function prepareWebpPayload(sourceBytes, sourceMimeType, presetSettings) {
    const source = await loadRasterSource(sourceBytes, sourceMimeType || 'image/png');
    try {
      const { canvas, ctx } = createRasterCanvas(source, false);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const encoded = await encodeWebp(imageData, buildWebpEncodeOptions(presetSettings));
      return {
        bytes: new Uint8Array(encoded),
        mimeType: 'image/webp',
      };
    } finally {
      source.dispose();
    }
  }

  async function prepareRasterPayloadInWorker(message, presetSettings) {
    const requestId = `raster-${++rasterExportRequestSeed}`;
    const sourceBytes = toUint8Array(message.bytes);
    const transferableBytes = new Uint8Array(sourceBytes);
    const worker = getRasterExportWorker();

    const resultPromise = new Promise((resolve, reject) => {
      pendingRasterExportRequests.set(requestId, { resolve, reject });
    });

    worker.postMessage(
      {
        type: 'process-raster',
        requestId,
        format: message.format,
        sourceMimeType: message.sourceMimeType || 'image/png',
        presetSettings,
        bytes: transferableBytes.buffer,
      },
      [transferableBytes.buffer],
    );

    const result = await resultPromise;
    if (!result.ok) {
      throw new Error(result.error || tr('error.workerCompression'));
    }

    return {
      bytes: result.bytes,
      mimeType: result.mimeType,
    };
  }

  async function prepareDownloadPayload(message) {
    const sourceBytes = toUint8Array(message.bytes);
    if (!sourceBytes.byteLength) {
      throw new Error(tr('error.emptyPayload'));
    }

    if (message.skipProcessing) {
      return {
        bytes: sourceBytes,
        mimeType: message.mimeType || message.sourceMimeType || 'application/octet-stream',
      };
    }

    if (message.format !== 'PNG' && message.format !== 'JPG' && message.format !== 'WEBP') {
      return {
        bytes: sourceBytes,
        mimeType: message.mimeType || message.sourceMimeType || 'application/octet-stream',
      };
    }

    // The estimate path (estimate-raster) ships the already-resolved preset in
    // message.presetSettings without a `preset` key; prefer it so estimates honor
    // the selected preset instead of falling back to defaults.
    const presetSettings = message.presetSettings && typeof message.presetSettings === 'object'
      ? normalizePresetSettingBundle(message.format, message.presetSettings, message.presetSettings)
      : getPresetSettings(state.presetSettings, message.format, message.preset);
    try {
      return await prepareRasterPayloadInWorker(message, presetSettings);
    } catch (error) {
      console.warn('Raster export worker failed, falling back to main thread.', error);
    }

    if (message.format === 'PNG') {
      return preparePngPayload(
        sourceBytes,
        message.sourceMimeType || 'image/png',
        presetSettings,
      );
    }

    if (message.format === 'WEBP') {
      return prepareWebpPayload(
        sourceBytes,
        message.sourceMimeType || 'image/png',
        presetSettings,
      );
    }

    const source = await loadRasterSource(sourceBytes, message.sourceMimeType || 'image/png');
    try {
      const { canvas } = createRasterCanvas(
        source,
        message.format === 'JPG' || presetSettings.alphaEnabled === false,
      );

      const blob = await canvasToBlob(
        canvas,
        message.format === 'JPG' ? 'image/jpeg' : 'image/png',
        message.format === 'JPG' ? (presetSettings.quality || 84) / 100 : undefined,
      );

      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: message.format === 'JPG' ? 'image/jpeg' : 'image/png',
      };
    } finally {
      source.dispose();
    }
  }

  async function estimateRasterPayload(message) {
    const payload = await prepareDownloadPayload(message);
    return {
      ok: true,
      bytesLength: payload.bytes.byteLength,
    };
  }

  async function queueDownload(message) {
    try {
      const payload = await prepareDownloadPayload(message);
      const blob = new Blob([payload.bytes], { type: payload.mimeType || 'application/octet-stream' });
      if (!blob.size) {
        throw new Error(tr('error.emptyBlob'));
      }

      if (zipBuffer) {
        const entryName = reserveUniqueZipEntryName(
          zipBuffer.usedNames,
          message.fileName || 'export.bin',
        );
        zipBuffer.files.push({ fileName: entryName, bytes: payload.bytes });
        return {
          ok: true,
          detail: tr('delivery.bufferedZip'),
          bytesLength: payload.bytes.byteLength,
        };
      }

      if (pdfMergeBuffer && message.format === 'PDF') {
        pdfMergeBuffer.files.push({
          rowId: message.rowId || '',
          fileName: message.fileName || 'export.pdf',
          bytes: payload.bytes,
        });
        return {
          ok: true,
          detail: tr('delivery.bufferedPdf'),
          bytesLength: payload.bytes.byteLength,
        };
      }

      const delivery = await deliverExportFile(message.fileName || 'export.bin', blob);

      return {
        ok: true,
        detail: delivery.detail,
        bytesLength: payload.bytes.byteLength,
      };
    } catch (error) {
      return {
        ok: false,
        detail: toErrorMessage(error),
      };
    }
  }

  function sendExportFileAck(message, result) {
    if (!message.sessionId) {
      return;
    }

    sendPluginMessage({
      type: 'export-file-ack',
      sessionId: message.sessionId,
      deliveryId: message.deliveryId || '',
      ok: Boolean(result.ok),
      cancelled: Boolean(result.cancelled),
      detail: typeof result.detail === 'string' ? result.detail : '',
      bytesLength: typeof result.bytesLength === 'number' ? result.bytesLength : undefined,
    });
  }

  function createNameTemplateCard(initialTemplate, onChange, disabled, options = {}) {
    let tokens = initialTemplate.map((t) => ({ ...t }));
    const config = options && typeof options === 'object' ? options : {};
    const label = typeof config.label === 'string' && config.label
      ? config.label
      : tr('template.filename');
    const availableVars = Array.isArray(config.availableVars) && config.availableVars.length > 0
      ? config.availableVars
      : NAME_TEMPLATE_VARS;
    const extensionLabel = typeof config.extensionLabel === 'string' && config.extensionLabel
      ? config.extensionLabel
      : '.ext';
    const customTextValue = typeof config.customTextValue === 'string'
      ? config.customTextValue
      : 'text';
    const buildPreviewText = typeof config.buildPreviewText === 'function'
      ? config.buildPreviewText
      : null;

    const card = createNode('div', 'setting-card name-template-card');
    const labelNode = createNode('span', 'setting-card-label', label);
    const chipsWrap = createNode('div', 'token-chips');
    const preview = createNode('p', 'token-preview');
    const insertMarker = createNode('div', 'token-insert-marker');
    const tokenKeys = new WeakMap();
    let tokenKeyId = 0;
    let chipAnimationFrame = null;
    let pointerMoveFrame = null;
    let pendingPointerPosition = null;

    function updatePreview() {
      if (buildPreviewText) {
        preview.textContent = buildPreviewText(tokens);
        return;
      }

      const exampleRow = state.rows[0] || {
        name: 'Frame 1',
        pageName: 'Page 1',
        scale: 2,
        width: 800,
        height: 600,
        format: 'PNG',
      };
      const path = normalizeExportPath(
        evaluateNameTemplate(exampleRow, tokens, new Date()),
        state.settings.preserveFolderStructure !== false,
      );
      const ext = getFormatExtension(exampleRow.format);
      preview.textContent = tr('template.preview', { value: `${path}.${ext}` });
    }

    let pointerDrag = null;

    function clearDragStyles() {
      chipsWrap.querySelectorAll('.is-dragging').forEach((chip) => chip.classList.remove('is-dragging'));
    }

    function hideInsertMarker() {
      insertMarker.classList.remove('is-visible');
      insertMarker.style.left = '';
      insertMarker.style.top = '';
      insertMarker.style.height = '';
    }

    function getTokenKey(token) {
      if (!token || typeof token !== 'object') {
        return '';
      }

      let key = tokenKeys.get(token);
      if (!key) {
        tokenKeyId += 1;
        key = `token-${tokenKeyId}`;
        tokenKeys.set(token, key);
      }
      return key;
    }

    function captureChipRects() {
      const rects = new Map();
      chipsWrap.querySelectorAll('.token-chip[data-token-key]').forEach((chip) => {
        rects.set(chip.dataset.tokenKey, chip.getBoundingClientRect());
      });
      return rects;
    }

    function animateChipReorder(previousRects) {
      if (!(previousRects instanceof Map) || previousRects.size === 0) {
        return;
      }

      const animatedChips = [];
      chipsWrap.querySelectorAll('.token-chip[data-token-key]').forEach((chip) => {
        const previousRect = previousRects.get(chip.dataset.tokenKey);
        if (!previousRect) {
          return;
        }

        const nextRect = chip.getBoundingClientRect();
        const deltaX = previousRect.left - nextRect.left;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
          return;
        }

        chip.style.transition = 'none';
        chip.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        animatedChips.push(chip);
      });

      if (animatedChips.length === 0) {
        return;
      }

      if (chipAnimationFrame !== null) {
        window.cancelAnimationFrame(chipAnimationFrame);
      }

      chipAnimationFrame = window.requestAnimationFrame(() => {
        animatedChips.forEach((chip) => {
          chip.style.transition = '';
          chip.style.transform = '';
          const clearAnimation = () => {
            chip.style.transition = '';
            chip.style.transform = '';
          };
          chip.addEventListener('transitionend', clearAnimation, { once: true });
        });
        chipAnimationFrame = null;
      });
    }

    function syncTemplateDraft(commit = false, previousRects = null) {
      rebuildChips();
      animateChipReorder(previousRects);
      updatePreview();
      if (commit) {
        onChange([...tokens]);
      }
    }

    function moveToken(fromIndex, toIndex) {
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) {
        return false;
      }

      if (fromIndex === tokens.length - 1 && toIndex >= tokens.length) {
        return false;
      }

      const boundedFrom = Math.max(0, Math.min(tokens.length - 1, fromIndex));
      const boundedTo = Math.max(0, Math.min(tokens.length, toIndex));
      const previousRects = captureChipRects();
      const [moved] = tokens.splice(boundedFrom, 1);

      if (!moved) {
        return false;
      }

      tokens.splice(Math.max(0, Math.min(tokens.length, boundedTo)), 0, moved);
      syncTemplateDraft(false, previousRects);
      return true;
    }

    function getInsertTargetFromPoint(clientX, clientY) {
      const containerRect = chipsWrap.getBoundingClientRect();
      if (
        clientX < containerRect.left - 12
        || clientX > containerRect.right + 12
        || clientY < containerRect.top - 12
        || clientY > containerRect.bottom + 12
      ) {
        return null;
      }

      const chips = Array.from(chipsWrap.querySelectorAll('.token-chip[data-token-index]:not(.ext-chip)'));
      if (chips.length === 0) {
        return null;
      }

      const chipItems = chips.map((chip) => ({
        chip,
        index: Number(chip.dataset.tokenIndex),
        rect: chip.getBoundingClientRect(),
      })).filter((item) => Number.isInteger(item.index));

      if (chipItems.length === 0) {
        return null;
      }

      let rowItems = chipItems.filter((item) => clientY >= item.rect.top - 6 && clientY <= item.rect.bottom + 6);
      if (rowItems.length === 0) {
        const nearestItem = chipItems.reduce((best, item) => {
          const bestDistance = Math.abs(clientY - ((best.rect.top + best.rect.bottom) / 2));
          const itemDistance = Math.abs(clientY - ((item.rect.top + item.rect.bottom) / 2));
          return itemDistance < bestDistance ? item : best;
        });
        rowItems = chipItems.filter((item) => Math.abs(item.rect.top - nearestItem.rect.top) < 6);
      }

      rowItems.sort((a, b) => a.rect.left - b.rect.left);
      const firstItem = rowItems[0];
      const lastItem = rowItems[rowItems.length - 1];
      const baseTop = firstItem.rect.top - containerRect.top + 2;
      const baseHeight = Math.max(18, firstItem.rect.height - 4);

      if (clientX <= firstItem.rect.left + (firstItem.rect.width / 2)) {
        return {
          index: firstItem.index,
          left: Math.max(2, firstItem.rect.left - containerRect.left - 2),
          top: baseTop,
          height: baseHeight,
        };
      }

      for (const item of rowItems) {
        const midpoint = item.rect.left + (item.rect.width / 2);
        if (clientX <= midpoint) {
          return {
            index: item.index,
            left: Math.max(2, item.rect.left - containerRect.left - 2),
            top: item.rect.top - containerRect.top + 2,
            height: Math.max(18, item.rect.height - 4),
          };
        }
      }

      return {
        index: lastItem.index + 1,
        left: Math.min(containerRect.width - 2, lastItem.rect.right - containerRect.left + 2),
        top: lastItem.rect.top - containerRect.top + 2,
        height: Math.max(18, lastItem.rect.height - 4),
      };
    }

    function stopPointerDrag(pointerId, shouldCommit = false) {
      const captureTarget = pointerDrag ? pointerDrag.captureTarget : null;
      if (
        captureTarget
        && pointerId !== undefined
        && typeof captureTarget.hasPointerCapture === 'function'
        && captureTarget.hasPointerCapture(pointerId)
      ) {
        try {
          captureTarget.releasePointerCapture(pointerId);
        } catch {
          // Ignore capture release failures from stale nodes.
        }
      }

      document.removeEventListener('pointermove', handleTokenPointerMove);
      document.removeEventListener('pointerup', handleTokenPointerUp);
      document.removeEventListener('pointercancel', handleTokenPointerUp);
      if (pointerMoveFrame !== null) {
        window.cancelAnimationFrame(pointerMoveFrame);
        pointerMoveFrame = null;
      }
      pendingPointerPosition = null;
      hideInsertMarker();
      clearDragStyles();
      pointerDrag = null;

      if (shouldCommit) {
        onChange([...tokens]);
      }
    }

    function processTokenPointerMove() {
      pointerMoveFrame = null;
      if (!pointerDrag || !pendingPointerPosition) {
        return;
      }

      const { clientX, clientY } = pendingPointerPosition;
      const target = getInsertTargetFromPoint(clientX, clientY);
      if (!target || !Number.isInteger(target.index)) {
        pointerDrag.targetIndex = null;
        hideInsertMarker();
        return;
      }

      const sourceIndex = pointerDrag.sourceIndex;
      let targetIndex = target.index;
      if (targetIndex > sourceIndex) {
        targetIndex -= 1;
      }

      if (!Number.isInteger(targetIndex) || targetIndex === sourceIndex) {
        pointerDrag.targetIndex = null;
        hideInsertMarker();
        return;
      }

      pointerDrag.targetIndex = targetIndex;
      insertMarker.style.left = `${target.left}px`;
      insertMarker.style.top = `${target.top}px`;
      insertMarker.style.height = `${target.height}px`;
      insertMarker.classList.add('is-visible');
    }

    function handleTokenPointerMove(event) {
      if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) {
        return;
      }

      pendingPointerPosition = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (pointerMoveFrame === null) {
        pointerMoveFrame = window.requestAnimationFrame(processTokenPointerMove);
      }
    }

    function handleTokenPointerUp(event) {
      if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) {
        return;
      }

      pendingPointerPosition = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (pointerMoveFrame !== null) {
        window.cancelAnimationFrame(pointerMoveFrame);
        pointerMoveFrame = null;
      }
      processTokenPointerMove();
      const sourceIndex = pointerDrag.sourceIndex;
      const targetIndex = pointerDrag.targetIndex;
      const didMove = Number.isInteger(sourceIndex)
        && Number.isInteger(targetIndex)
        && targetIndex !== sourceIndex
        && moveToken(sourceIndex, targetIndex);
      stopPointerDrag(event.pointerId, didMove);
    }

    function handleTokenHandlePointerDown(event, index, chip) {
      if (disabled || event.button !== 0) {
        return;
      }

      event.preventDefault();

      pointerDrag = {
        pointerId: event.pointerId,
        sourceIndex: index,
        draggedToken: tokens[index],
        captureTarget: chipsWrap,
        targetIndex: null,
      };

      clearDragStyles();
      chip.classList.add('is-dragging');

      if (typeof chipsWrap.setPointerCapture === 'function') {
        try {
          chipsWrap.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture can fail on some embedded webviews.
        }
      }

      document.addEventListener('pointermove', handleTokenPointerMove);
      document.addEventListener('pointerup', handleTokenPointerUp);
      document.addEventListener('pointercancel', handleTokenPointerUp);
    }

    function rebuildChips() {
      chipsWrap.replaceChildren();
      tokens.forEach((token, index) => {
        const chip = createNode('span', `token-chip ${token.type === 'var' ? 'var-chip' : 'text-chip'}`);
        chip.dataset.tokenIndex = String(index);
        chip.dataset.tokenKey = getTokenKey(token);
        if (pointerDrag && token === pointerDrag.draggedToken) {
          chip.classList.add('is-dragging');
        }

        if (!disabled) {
          const handle = document.createElement('button');
          handle.className = 'token-chip-handle';
          handle.type = 'button';
          handle.title = tr('template.drag');
          handle.setAttribute('aria-label', tr('template.drag'));
          handle.textContent = '::';
          handle.addEventListener('pointerdown', (event) => {
            handleTokenHandlePointerDown(event, index, chip);
          });
          chip.appendChild(handle);
        }

        if (token.type === 'var') {
          const label = createNode('span', 'token-chip-label', `{${token.key}}`);
          chip.appendChild(label);
        } else {
          const label = document.createElement('span');
          label.className = 'token-chip-label';
          label.contentEditable = disabled ? 'false' : 'true';
          label.textContent = token.value;
          label.spellcheck = false;

          let removeBtn = null;

          label.addEventListener('input', () => {
            tokens[index] = { type: 'text', value: label.textContent };
            updatePreview();
          });

          label.addEventListener('blur', (e) => {
            if (removeBtn && e.relatedTarget === removeBtn) {
              return;
            }
            // Preserve surrounding spaces — they're meaningful for separators
            // like " - "; only drop a token that is completely empty.
            const value = label.textContent || '';
            if (!value) {
              tokens.splice(index, 1);
            } else {
              tokens[index] = { type: 'text', value };
            }
            onChange([...tokens]);
          });

          label.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              label.blur();
            }
          });

          chip.appendChild(label);

          if (!disabled) {
            removeBtn = document.createElement('button');
            removeBtn.className = 'token-chip-remove';
            removeBtn.type = 'button';
            removeBtn.tabIndex = 0;
            removeBtn.title = tr('template.remove');
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
              tokens.splice(index, 1);
              onChange([...tokens]);
            });
            chip.appendChild(removeBtn);
          }

          chipsWrap.appendChild(chip);
          return;
        }

        if (!disabled) {
          const removeBtn = document.createElement('button');
          removeBtn.className = 'token-chip-remove';
          removeBtn.type = 'button';
          removeBtn.title = tr('template.remove');
          removeBtn.textContent = '×';
          removeBtn.addEventListener('click', () => {
            tokens.splice(index, 1);
            onChange([...tokens]);
          });
          chip.appendChild(removeBtn);
        }

        chipsWrap.appendChild(chip);
      });

      const extChip = createNode('span', 'token-chip ext-chip', extensionLabel);
      chipsWrap.appendChild(extChip);
      chipsWrap.appendChild(insertMarker);
    }

    rebuildChips();
    updatePreview();

    const addRow = createNode('div', 'token-add-row');

    availableVars.forEach((item) => {
      const { key } = item;
      const btn = createNode('button', 'token-add-btn');
      btn.type = 'button';
      btn.textContent = `+ ${getTemplateVarLabel(item)}`;
      btn.disabled = disabled;
      btn.addEventListener('click', () => {
        tokens.push({ type: 'var', key });
        onChange([...tokens]);
      });
      addRow.appendChild(btn);
    });

    const textBtn = createNode('button', 'token-add-btn');
    textBtn.type = 'button';
    textBtn.textContent = `+ ${tr('template.customText')}`;
    textBtn.disabled = disabled;
    textBtn.addEventListener('click', () => {
      tokens.push({ type: 'text', value: customTextValue });
      onChange([...tokens]);
      window.setTimeout(() => {
        const chips = chipsWrap.querySelectorAll(
          '.text-chip .token-chip-label[contenteditable="true"]',
        );
        if (chips.length > 0) {
          const last = chips[chips.length - 1];
          last.focus();
          const range = document.createRange();
          range.selectNodeContents(last);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 0);
    });
    addRow.appendChild(textBtn);

    card.append(labelNode, chipsWrap, addRow, preview);
    return card;
  }

  function createToggleSettingCard(label, checked, onChange, disabled) {
    const card = createNode('div', 'setting-card toggle-card');
    const row = createNode('div', 'toggle-row');
    const value = createNode('span', 'toggle-value', label);
    const toggle = createNode('label', 'toggle-pill');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.disabled = disabled;
    const track = document.createElement('span');
    input.addEventListener('change', () => {
      onChange(input.checked);
    });
    toggle.append(input, track);
    row.append(value, toggle);
    card.append(row);
    return card;
  }

  function createSelectSettingCard(label, options, value, onChange, disabled) {
    const card = createNode('div', 'setting-card');
    const labelNode = createNode('span', 'setting-card-label', label);
    const select = document.createElement('select');
    options.forEach((option) => {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    });
    select.value = value;
    select.disabled = disabled;
    select.addEventListener('change', () => {
      onChange(select.value);
    });
    card.append(labelNode, select);
    return card;
  }

  function createTextSettingCard(label, value, placeholder, onChange, disabled) {
    const card = createNode('div', 'setting-card');
    const labelNode = createNode('span', 'setting-card-label', label);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = placeholder || '';
    input.disabled = disabled;
    input.addEventListener('input', () => {
      onChange(input.value);
    });
    card.append(labelNode, input);
    return card;
  }

  function createActionCard() {
    const card = createNode('div', 'setting-card action-card');
    const labelNode = createNode('span', 'setting-card-label', tr('settings.file'));
    const note = createNode('p', 'inline-note', tr('settings.fileNote'));
    const actions = createNode('div', 'action-row');
    const controlsDisabled = state.isExporting;

    const exportButton = createNode('button', 'ghost-btn', tr('settings.exportJson'));
    exportButton.type = 'button';
    exportButton.disabled = controlsDisabled;
    exportButton.addEventListener('click', exportSettingsToFile);

    const importButton = createNode('button', 'ghost-btn', tr('settings.importJson'));
    importButton.type = 'button';
    importButton.disabled = controlsDisabled;
    importButton.addEventListener('click', () => {
      dom.settingsImportInput.click();
    });

    const resetButton = createNode('button', 'ghost-btn', tr('settings.resetAll'));
    resetButton.type = 'button';
    resetButton.disabled = controlsDisabled;
    resetButton.addEventListener('click', resetAllSettings);

    actions.append(exportButton, importButton, resetButton);
    card.append(labelNode, note, actions);
    return card;
  }

  function createOpenSourceLibraryCard(library) {
    const card = createNode('article', 'setting-card library-card');
    const head = createNode('div', 'library-card-head');
    const titleRow = createNode('div', 'library-title-row');
    const title = createNode('strong', 'library-card-title', library.name);
    const version = createNode('span', 'library-card-version', `v${library.version}`);
    const licenseBadge = createNode('span', 'library-license-badge', library.license);

    titleRow.append(title, version);
    head.append(titleRow, licenseBadge);
    card.append(head);

    if (library.description) {
      card.append(createNode('p', 'inline-note library-inline-note', library.description));
    }

    const metaRow = createNode('div', 'library-meta-row');
    const noticeLabel = createNode(
      'span',
      'library-meta-chip',
      library.noticeFiles.length
        ? tr('library.noticeFiles', { files: library.noticeFiles.join(', ') })
        : tr('library.noNotice'),
    );
    metaRow.append(noticeLabel);
    card.append(metaRow);

    const linkRow = createNode('div', 'library-link-row');
    linkRow.append(createExternalLink('npm', library.packageUrl));

    if (library.repositoryUrl) {
      linkRow.append(createExternalLink(tr('library.repository'), library.repositoryUrl));
    }

    if (library.homepageUrl && library.homepageUrl !== library.repositoryUrl) {
      linkRow.append(createExternalLink(tr('library.homepage'), library.homepageUrl));
    }

    card.append(linkRow);
    return card;
  }

  function createPresetToggleControl(label, checked, onChange, disabled) {
    const control = createNode('div', 'preset-control toggle');
    const row = createNode('div', 'toggle-row');
    const value = createNode('span', 'toggle-value', label);
    const toggle = createNode('label', 'toggle-pill');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.disabled = disabled;
    const track = document.createElement('span');
    input.addEventListener('change', () => {
      onChange(input.checked);
    });
    toggle.append(input, track);
    row.append(value, toggle);
    control.append(row);
    return control;
  }

  function createPresetSelectControl(label, options, value, onChange, disabled) {
    const control = createNode('div', 'preset-control');
    const labelNode = createNode('span', 'preset-control-label', label);
    const select = document.createElement('select');
    options.forEach((option) => {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    });
    select.value = value;
    select.disabled = disabled;
    select.addEventListener('change', () => {
      onChange(select.value);
    });
    control.append(labelNode, select);
    return control;
  }

  function createPresetTextareaControl(label, value, placeholder, onChange, disabled) {
    const control = createNode('div', 'preset-control');
    const labelNode = createNode('span', 'preset-control-label', label);
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.placeholder = placeholder;
    textarea.disabled = disabled;
    textarea.spellcheck = false;
    textarea.addEventListener('change', () => {
      onChange(textarea.value);
    });
    control.append(labelNode, textarea);
    return control;
  }

  function renderDefaultsControls() {
    const controlsDisabled = state.isExporting;
    const cards = [
      createSelectSettingCard(
        tr('settings.defaultFormat'),
        FORMAT_OPTIONS.map((option) => ({ value: option.value, label: getFormatLabel(option.value) })),
        state.defaults.format,
        setDefaultFormat,
        controlsDisabled,
      ),
      createSelectSettingCard(
        tr('settings.defaultScale'),
        SCALE_OPTIONS.map((value) => ({ value: String(value), label: formatScale(value) })),
        String(state.defaults.scale),
        setDefaultScale,
        controlsDisabled,
      ),
    ];

    FORMAT_OPTIONS.forEach((option) => {
      const presetCard = createSelectSettingCard(
          tr('settings.formatPreset', { format: getFormatLabel(option.value) }),
          getPresetDefinitions(option.value).map((definition) => ({
            value: definition.value,
            label: getPresetLabel(option.value, definition),
          })),
          getDefaultPresetForFormat(state.defaults, option.value),
          (value) => setDefaultPresetForFormat(option.value, value),
          controlsDisabled,
        );
      presetCard.classList.add('default-preset-card');
      cards.push(presetCard);
    });

    dom.defaultsControls.replaceChildren(...cards);
  }

  function renderLanguageControls() {
    const controlsDisabled = state.isExporting;
    dom.languageControls.replaceChildren(
      createSelectSettingCard(
        tr('settings.language'),
        getLocaleOptions(activeLocale),
        state.settings.locale,
        (value) => updateExportSetting('locale', value),
        controlsDisabled,
      ),
    );
  }

  function renderExportSettingsControls() {
    const controlsDisabled = state.isExporting;
    const template = state.settings.nameTemplate || DEFAULT_NAME_TEMPLATE;
    const archiveTemplate = state.settings.archiveNameTemplate || DEFAULT_ARCHIVE_NAME_TEMPLATE;
    dom.exportSettingsControls.replaceChildren(
      createNameTemplateCard(
        template,
        (nextTemplate) => updateExportSetting('nameTemplate', nextTemplate),
        controlsDisabled,
      ),
      createNameTemplateCard(
        archiveTemplate,
        (nextTemplate) => updateExportSetting('archiveNameTemplate', nextTemplate),
        controlsDisabled,
        {
          label: tr('template.archive'),
          availableVars: ARCHIVE_NAME_TEMPLATE_VARS,
          extensionLabel: '.zip',
          customTextValue: 'Images ',
          buildPreviewText: (tokens) => tr('template.preview', {
            value: buildArchiveFileName(
              tokens,
              new Date(),
              {
                ...(state.rows[0] || {}),
                count: state.rows.length,
              },
            ),
          }),
        },
      ),
      createToggleSettingCard(
        tr('settings.preserveFolders'),
        state.settings.preserveFolderStructure !== false,
        (checked) => updateExportSetting('preserveFolderStructure', checked),
        controlsDisabled,
      ),
      createToggleSettingCard(
        tr('settings.autoEstimate'),
        state.settings.autoEstimateSize,
        (checked) => updateExportSetting('autoEstimateSize', checked),
        controlsDisabled,
      ),
      createToggleSettingCard(
        tr('settings.closeAfterExport'),
        state.settings.closeAfterExport,
        (checked) => updateExportSetting('closeAfterExport', checked),
        controlsDisabled,
      ),
      createSelectSettingCard(
        tr('settings.concurrency'),
        EXPORT_CONCURRENCY_OPTIONS.map((value) => ({
          value: String(value),
          label: tr('settings.atATime', { count: value }),
        })),
        String(state.settings.exportConcurrency),
        (value) => updateExportSetting('exportConcurrency', value),
        controlsDisabled,
      ),
    );
  }

  function renderSettingsDataControls() {
    dom.settingsDataControls.replaceChildren(createActionCard());
  }

  function renderOpenSourceControls() {
    dom.openSourceControls.replaceChildren(
      ...OPEN_SOURCE_LIBRARIES.map((library) => createOpenSourceLibraryCard(library)),
    );
  }

  function getActivePresetSettingsFormat() {
    if (isPresetSettingsTab(state.settingsTab)) {
      return normalizeFormat(state.settingsTab);
    }
    return normalizeFormat(state.settingsFormat);
  }

  function renderSettingsNavTabs() {
    const activeTab = normalizeSettingsTab(state.settingsTab);
    state.settingsTab = activeTab;
    dom.settingsNavTabs.replaceChildren();
    const fragment = document.createDocumentFragment();

    getSettingsNavItems().forEach((item) => {
      const button = createNode(
        'button',
        `settings-nav-btn${activeTab === item.value ? ' is-active' : ''}`,
      );
      button.type = 'button';
      button.addEventListener('click', () => {
        setSettingsTab(item.value);
      });

      button.appendChild(createNode('span', 'settings-nav-title', item.label || tr(item.labelKey)));
      fragment.appendChild(button);
    });

    dom.settingsNavTabs.appendChild(fragment);
  }

  function renderSettingsSectionVisibility() {
    const activeTab = normalizeSettingsTab(state.settingsTab);
    state.settingsTab = activeTab;

    dom.defaultsSection.hidden = activeTab !== 'defaults';
    dom.exportSettingsSection.hidden = activeTab !== 'export';
    dom.languageSection.hidden = activeTab !== 'language';
    dom.settingsDataSection.hidden = activeTab !== 'data';
    dom.openSourceSection.hidden = activeTab !== 'libraries';
    dom.presetEditorSection.hidden = !isPresetSettingsTab(activeTab);
  }

  function renderPresetCard(format, definition) {
    const controlsDisabled = state.isExporting;
    const presetSettings = getPresetSettings(state.presetSettings, format, definition.value);
    const presetCardKey = `${format}:${definition.value}`;
    const card = createNode(
      'article',
      `preset-card${expandedPresetCards.has(presetCardKey) ? '' : ' is-collapsed'}`,
    );
    const head = createNode('div', 'preset-card-head');
    const toggleButton = createNode('button', 'preset-card-toggle');
    toggleButton.type = 'button';
    const title = createNode('h3', 'preset-card-title', getPresetLabel(format, definition));
    const chevron = createNode('span', 'preset-card-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    chevron.appendChild(createChevronIcon());
    const resetButton = createNode('button', 'ghost-btn preset-card-reset', tr('settings.reset'));
    resetButton.type = 'button';
    resetButton.disabled = controlsDisabled;
    resetButton.addEventListener('click', (e) => {
      e.stopPropagation();
      resetPresetToDefault(format, definition.value);
    });
    toggleButton.addEventListener('click', () => {
      const isCollapsed = card.classList.toggle('is-collapsed');
      if (isCollapsed) {
        expandedPresetCards.delete(presetCardKey);
      } else {
        expandedPresetCards.add(presetCardKey);
      }
    });

    toggleButton.append(title, chevron);
    head.appendChild(toggleButton);
    card.appendChild(head);

    const body = createNode('div', 'preset-card-body');

    const presetHint = getPresetHint(format, definition);
    if (presetHint) {
      body.appendChild(createNode('p', 'inline-note', presetHint));
    }

    const controlGrid = createNode('div', 'preset-control-grid');

    if (format === 'PNG') {
      const quantizeControlDisabled = controlsDisabled || !presetSettings.quantizeEnabled;
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.alpha'),
          presetSettings.alphaEnabled !== false,
          (checked) => updatePresetSetting(format, definition.value, 'alphaEnabled', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.palette'),
          Boolean(presetSettings.quantizeEnabled),
          (checked) => updatePresetSetting(format, definition.value, 'quantizeEnabled', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetSelectControl(
          tr('control.maxColors'),
          PNG_MAX_COLOR_OPTIONS.map((value) => ({ value: String(value), label: `${value}` })),
          String(presetSettings.maxColors || 256),
          (value) => updatePresetSetting(format, definition.value, 'maxColors', value),
          quantizeControlDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetSelectControl(
          tr('control.minQuality'),
          PNG_QUALITY_OPTIONS.map((value) => ({ value: String(value), label: `${value}%` })),
          String(presetSettings.qualityMin || 84),
          (value) => updatePresetSetting(format, definition.value, 'qualityMin', value),
          quantizeControlDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetSelectControl(
          tr('control.targetQuality'),
          PNG_QUALITY_OPTIONS.map((value) => ({ value: String(value), label: `${value}%` })),
          String(presetSettings.qualityTarget || 95),
          (value) => updatePresetSetting(format, definition.value, 'qualityTarget', value),
          quantizeControlDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetSelectControl(
          tr('control.dithering'),
          PNG_DITHERING_OPTIONS.map((value) => ({
            value: String(value),
            label: formatPngDitheringLabel(value),
          })),
          String(presetSettings.dithering ?? 0),
          (value) => updatePresetSetting(format, definition.value, 'dithering', value),
          quantizeControlDisabled,
        ),
      );
    } else if (format === 'JPG') {
      controlGrid.appendChild(
        createPresetSelectControl(
          tr('control.quality'),
          JPG_QUALITY_OPTIONS.map((value) => ({ value: String(value), label: `${value}` })),
          String(presetSettings.quality || 84),
          (value) => updatePresetSetting(format, definition.value, 'quality', value),
          controlsDisabled,
        ),
      );
    } else if (format === 'WEBP') {
      const qualityControlDisabled = controlsDisabled || Boolean(presetSettings.lossless);
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.lossless'),
          Boolean(presetSettings.lossless),
          (checked) => updatePresetSetting(format, definition.value, 'lossless', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetSelectControl(
          tr('control.quality'),
          [100, ...JPG_QUALITY_OPTIONS].map((value) => ({ value: String(value), label: `${value}` })),
          String(presetSettings.quality || 74),
          (value) => updatePresetSetting(format, definition.value, 'quality', value),
          qualityControlDisabled,
        ),
      );
    } else if (format === 'SVG') {
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.outlineText'),
          Boolean(presetSettings.svgOutlineText),
          (checked) => updatePresetSetting(format, definition.value, 'svgOutlineText', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.idAttributes'),
          Boolean(presetSettings.svgIdAttribute),
          (checked) => updatePresetSetting(format, definition.value, 'svgIdAttribute', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.simplifyStrokes'),
          Boolean(presetSettings.svgSimplifyStroke),
          (checked) => updatePresetSetting(format, definition.value, 'svgSimplifyStroke', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.svgoEnabled'),
          Boolean(presetSettings.svgoEnabled),
          (checked) => updatePresetSetting(format, definition.value, 'svgoEnabled', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.svgoMultipass'),
          Boolean(presetSettings.svgoMultipass),
          (checked) => updatePresetSetting(format, definition.value, 'svgoMultipass', checked),
          controlsDisabled || !presetSettings.svgoEnabled,
        ),
      );
      controlGrid.appendChild(
        createPresetSelectControl(
          tr('control.floatPrecision'),
          SVG_SVGO_FLOAT_PRECISION_OPTIONS.map((value) => ({
            value: String(value),
            label: `${value}`,
          })),
          String(presetSettings.svgoFloatPrecision ?? 3),
          (value) => updatePresetSetting(format, definition.value, 'svgoFloatPrecision', value),
          controlsDisabled || !presetSettings.svgoEnabled,
        ),
      );
      controlGrid.appendChild(
        createPresetTextareaControl(
          tr('control.svgoOverride'),
          presetSettings.svgoOverrides || '',
          '{\n  "plugins": [\n    {\n      "name": "prefixIds"\n    }\n  ]\n}',
          (value) => updatePresetSetting(format, definition.value, 'svgoOverrides', value),
          controlsDisabled || !presetSettings.svgoEnabled,
        ),
      );

      SVG_SVGO_PLUGIN_KEYS.forEach((pluginKey) => {
        controlGrid.appendChild(
          createPresetToggleControl(
            formatSvgoPluginLabel(pluginKey),
            Boolean(presetSettings.svgoPlugins && presetSettings.svgoPlugins[pluginKey]),
            (checked) => updatePresetSetting(
              format,
              definition.value,
              'svgoPlugins',
              {
                ...(presetSettings.svgoPlugins || createSvgSvgoPluginState()),
                [pluginKey]: checked,
              },
            ),
            controlsDisabled || !presetSettings.svgoEnabled,
          ),
        );
      });
    } else if (format === 'PDF') {
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.mergePdf'),
          Boolean(presetSettings.mergePdfs),
          (checked) => updatePresetSetting(format, definition.value, 'mergePdfs', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.contentsOnly'),
          Boolean(presetSettings.contentsOnly),
          (checked) => updatePresetSetting(format, definition.value, 'contentsOnly', checked),
          controlsDisabled,
        ),
      );
      controlGrid.appendChild(
        createPresetToggleControl(
          tr('control.absoluteBounds'),
          Boolean(presetSettings.useAbsoluteBounds),
          (checked) => updatePresetSetting(format, definition.value, 'useAbsoluteBounds', checked),
          controlsDisabled,
        ),
      );
    }

    body.appendChild(controlGrid);
    body.appendChild(resetButton);
    card.appendChild(body);
    return card;
  }

  function renderPresetSettingsControls() {
    const format = getActivePresetSettingsFormat();
    state.settingsFormat = format;
    dom.presetSettingsControls.replaceChildren();

    const fragment = document.createDocumentFragment();
    getPresetDefinitions(format).forEach((definition) => {
      fragment.appendChild(renderPresetCard(format, definition));
    });

    dom.presetSettingsControls.appendChild(fragment);
  }

  function handleBootstrap(message) {
    const nextState = normalizeIncomingState(message.state || {});
    state.defaults = nextState.defaults;
    state.settings = nextState.settings;
    syncActiveLocale();
    state.presetSettings = nextState.presetSettings;
    state.profiles = nextState.profiles;
    if (state.profiles[0]) saveProfileToStorage(state.profiles[0]);
    state.settingsTab = normalizeSettingsTab(state.settingsTab);
    state.settingsFormat = isPresetSettingsTab(state.settingsTab)
      ? normalizeFormat(state.settingsTab)
      : nextState.defaults.format;
    if (Array.isArray(message.nodes)) {
      state.frames = message.nodes.map((frame) => ({
        id: frame.id,
        name: frame.name || 'Untitled',
        pageName: frame.pageName || 'Page',
        type: frame.type || 'LAYER',
        width: Number(frame.width) || 0,
        height: Number(frame.height) || 0,
      }));
    }
    rebuildRows({ preserveRuntime: false, preserveOverrides: false });
    invalidateEstimates();
    render();
  }

  function handleSelectionSync(message) {
    if (state.isExporting) {
      pendingSelectionMessage = message;
      return;
    }

    const frames = Array.isArray(message.nodes) ? message.nodes : [];
    revokeRemovedPreviews(frames);
    state.frames = frames.map((frame) => ({
      id: frame.id,
      name: frame.name || 'Untitled',
      pageName: frame.pageName || 'Page',
      type: frame.type || 'FRAME',
      width: Number(frame.width) || 0,
      height: Number(frame.height) || 0,
    }));
    rebuildRows({ preserveRuntime: false, preserveOverrides: true });
    invalidateEstimates();
    render();

    if (state.rows.length) {
      updateFooterStatus('');
      scheduleEstimate(160);
    } else {
      updateFooterStatus('');
    }
  }

  function handleThumbnail(message) {
    if (!message.nodeId) {
      return;
    }

    const nextBytes = toUint8Array(message.bytes);
    const nextUrl = URL.createObjectURL(new Blob([nextBytes], { type: 'image/png' }));
    const currentUrl = previewUrls.get(message.nodeId);
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
    }
    previewUrls.set(message.nodeId, nextUrl);
    renderRows();
  }

  function handleEstimatesResult(message) {
    if (Number(message.requestId) !== activeEstimateRequestId) {
      return;
    }

    const estimates = message.estimates && typeof message.estimates === 'object' ? message.estimates : {};
    state.rows = state.rows.map((row) => {
      const estimate = estimates[row.id];
      if (!estimate || typeof estimate !== 'object') {
        return row;
      }

      return {
        ...row,
        estimateBytes: typeof estimate.bytes === 'number' || estimate.bytes === null ? estimate.bytes : row.estimateBytes,
        baselineBytes: typeof estimate.baselineBytes === 'number' || estimate.baselineBytes === null
          ? estimate.baselineBytes
          : row.baselineBytes,
      };
    });

    state.isEstimating = false;
    render();
  }

  function handleExportStart(message) {
    exportFileQueue = Promise.resolve();
    const totalFiles = Number(message.total) || 0;
    const isDirectoryMode = activeExportTarget && activeExportTarget.mode === 'directory';
    const shouldMergePdfs = shouldMergePdfExport(state.rows);
    pdfMergeBuffer = shouldMergePdfs
      ? {
        files: [],
        fileName: buildArchivePdfFileName(
          state.settings.archiveNameTemplate,
          new Date(),
          {
            ...(state.rows[0] || {}),
            count: totalFiles,
          },
        ),
      }
      : null;
    zipBuffer = (!pdfMergeBuffer && !isDirectoryMode && totalFiles > 1)
      ? {
        files: [],
        usedNames: new Set(),
        fileName: buildArchiveFileName(
          state.settings.archiveNameTemplate,
          new Date(),
          {
            ...(state.rows[0] || {}),
            count: totalFiles,
          },
        ),
      }
      : null;
    lockExportButtonWidth();
    state.isExporting = true;
    state.exportProgress = {
      completed: 0,
      total: Number(message.total) || 0,
      fileName: '',
      sessionId: message.sessionId || '',
    };
    state.rows = state.rows.map((row) => ({
      ...row,
      status: 'queued',
      exportedBytes: null,
      error: '',
    }));
    updateFooterStatus('');
    render();
  }

  function handleExportRowStatus(message) {
    if (state.exportProgress.sessionId && message.sessionId && message.sessionId !== state.exportProgress.sessionId) {
      return;
    }

    const nextStatus = typeof message.status === 'string' ? message.status.toLowerCase() : '';
    state.rows = state.rows.map((row) => {
      if (row.id !== message.rowId) {
        return row;
      }

      if (nextStatus === 'processing') {
        return {
          ...row,
          status: 'processing',
          error: '',
        };
      }

      if (nextStatus === 'done') {
        return {
          ...row,
          status: 'done',
          exportedBytes: typeof message.bytes === 'number' ? message.bytes : row.exportedBytes,
          error: '',
        };
      }

      if (nextStatus === 'error') {
        return {
          ...row,
          status: 'error',
          error: typeof message.detail === 'string' ? message.detail : tr('status.failed'),
        };
      }

      return row;
    });
    render();
  }

  function handleExportProgress(message) {
    if (state.exportProgress.sessionId && message.sessionId && message.sessionId !== state.exportProgress.sessionId) {
      return;
    }

    state.exportProgress = {
      completed: Number(message.completed) || 0,
      total: Number(message.total) || 0,
      fileName: message.fileName || '',
      sessionId: state.exportProgress.sessionId,
    };
    renderFooter();
  }

  async function handleExportComplete(message) {
    if (state.exportProgress.sessionId && message.sessionId && message.sessionId !== state.exportProgress.sessionId) {
      return;
    }

    let pdfMergeError = '';
    if (pdfMergeBuffer && pdfMergeBuffer.files.length > 0 && !message.cancelled) {
      try {
        await flushPdfMergeBuffer(pdfMergeBuffer);
      } catch (error) {
        pdfMergeError = toErrorMessage(error);
      }
    }
    pdfMergeBuffer = null;

    let zipError = '';
    if (zipBuffer && zipBuffer.files.length > 0 && !message.cancelled) {
      try {
        const zipBytes = buildZip(zipBuffer.files);
        downloadBlob(
          zipBuffer.fileName || 'frame-export.zip',
          new Blob([zipBytes], { type: 'application/zip' }),
        );
      } catch (error) {
        zipError = toErrorMessage(error);
      }
    }
    zipBuffer = null;

    if (message.cancelled && activeExportTarget && activeExportTarget.mode === 'directory') {
      // Files stream to disk during export; on Stop, drain any in-flight write then
      // remove the files this session already wrote so nothing is left behind.
      try { await exportFileQueue; } catch (error) { /* ignore */ }
      const written = activeExportTarget.writtenFiles || [];
      for (const entry of written) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await entry.dirHandle.removeEntry(entry.name);
        } catch (error) {
          // File may have been moved/removed already — best-effort cleanup.
        }
      }
      // Then remove the (now-empty) folders this session created, deepest first.
      const createdDirs = (activeExportTarget.createdDirs || [])
        .slice()
        .sort((a, b) => b.path.length - a.path.length);
      for (const dir of createdDirs) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await dir.parentHandle.removeEntry(dir.name);
        } catch (error) {
          // Folder not empty / already gone — leave it, never force-delete.
        }
      }
    }

    activeExportTarget = null;
    state.isExporting = false;
    state.isCancelling = false;
    state.exportProgress = {
      completed: Number(message.completed) || state.exportProgress.completed || 0,
      total: Number(message.total) || state.exportProgress.total || 0,
      fileName: '',
      sessionId: '',
    };

    const errors = Array.isArray(message.errors) ? message.errors : [];
    const exported = Number(message.exported) || 0;
    const total = Number(message.total) || state.rows.length;

    if (message.cancelled) {
      updateFooterStatus(
        errors.length
          ? tr('status.exportStoppedError', { exported, total, error: errors[0] })
          : tr('status.exportStopped', { exported, total }),
      );
    } else if (pdfMergeError) {
      updateFooterStatus(tr('status.pdfMergeFailed', { error: pdfMergeError }));
    } else if (zipError) {
      updateFooterStatus(tr('status.zipFailed', { error: zipError }));
    } else if (errors.length) {
      updateFooterStatus(tr('status.exportErrors', { error: errors[0] }));
    } else {
      updateFooterStatus('');
    }

    render();

    if (pendingSelectionMessage) {
      const nextMessage = pendingSelectionMessage;
      pendingSelectionMessage = null;
      handleSelectionSync(nextMessage);
    }
  }

  function getResultText(row) {
    if (row.status === 'error') {
      return row.error || tr('status.failed');
    }

    const value = row.exportedBytes !== null ? row.exportedBytes : row.estimateBytes;
    if (typeof value === 'number') {
      return formatBytes(value);
    }
    if (row.status === 'processing' || state.isEstimating) {
      return tr('status.estimatingSize');
    }
    if (value === undefined || value === null) {
      return tr('status.ready');
    }
    return String(value);
  }

  function getCompressionValue(row) {
    if (isVectorFormat(row.format)) {
      return 0;
    }

    if (typeof row.exportedBytes !== 'number' || typeof row.baselineBytes !== 'number' || row.baselineBytes <= 0) {
      return 0;
    }

    return Math.round((1 - (row.exportedBytes / row.baselineBytes)) * 100);
  }

  function getCompressionLabel(row) {
    if (row.status === 'error' || typeof row.exportedBytes !== 'number' || typeof row.baselineBytes !== 'number') {
      return '—';
    }
    const compressionValue = getCompressionValue(row);
    if (compressionValue > 0) {
      return `-${compressionValue}%`;
    }
    if (compressionValue < 0) {
      return `+${Math.abs(compressionValue)}%`;
    }
    return '0%';
  }

  function getRowReferenceBytes(row) {
    if (typeof row.baselineBytes === 'number' && row.baselineBytes > 0) {
      return row.baselineBytes;
    }
    if (typeof row.estimateBytes === 'number' && row.estimateBytes > 0) {
      return row.estimateBytes;
    }
    if (typeof row.exportedBytes === 'number' && row.exportedBytes > 0) {
      return row.exportedBytes;
    }
    return null;
  }

  function getRowScaledPixelCount(row) {
    if (isVectorFormat(row.format)) {
      return 0;
    }

    const width = Math.max(1, Number(row.width) || 0);
    const height = Math.max(1, Number(row.height) || 0);
    const scale = normalizeScale(row.scale);
    return Math.round(width * height * scale * scale);
  }

  function getLargeRasterWarningForRow(row) {
    if (!row || isVectorFormat(row.format)) {
      return '';
    }

    const rowBytes = getRowReferenceBytes(row);
    const rowPixels = getRowScaledPixelCount(row);
    if (rowBytes < LARGE_RASTER_WARNING_SINGLE_BYTES && rowPixels < LARGE_RASTER_WARNING_SINGLE_PIXELS) {
      return '';
    }

    const parts = [];
    if (rowBytes >= LARGE_RASTER_WARNING_SINGLE_BYTES) {
      parts.push(formatBytes(rowBytes));
    }
    if (rowPixels >= LARGE_RASTER_WARNING_SINGLE_PIXELS) {
      parts.push(formatDimensions(
        Math.max(1, Math.round((Number(row.width) || 0) * normalizeScale(row.scale))),
        Math.max(1, Math.round((Number(row.height) || 0) * normalizeScale(row.scale))),
      ));
    }
    return tr('warning.largeRaster', {
      name: row.name || tr('warning.defaultRasterName'),
      details: parts.length ? ` (${parts.join(' • ')})` : '',
    });
  }

  function createWarningBadge(message) {
    const badge = createNode('span', 'warning-badge', 'i');
    badge.setAttribute('role', 'img');
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('aria-label', message);
    badge.setAttribute('title', message);
    badge.dataset.tooltip = message;
    badge.addEventListener('mouseenter', () => {
      showWarningTooltip(badge);
    });
    badge.addEventListener('mouseleave', () => {
      hideWarningTooltip(badge);
    });
    badge.addEventListener('focus', () => {
      showWarningTooltip(badge);
    });
    badge.addEventListener('blur', () => {
      hideWarningTooltip(badge);
    });
    return badge;
  }

  function positionWarningTooltip(target) {
    if (!(target instanceof HTMLElement) || dom.overlayTooltip.hidden) {
      return;
    }

    const tooltipRect = dom.overlayTooltip.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.max(
      WARNING_TOOLTIP_EDGE_PADDING_PX,
      Math.min(
        targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2),
        viewportWidth - WARNING_TOOLTIP_EDGE_PADDING_PX - tooltipRect.width,
      ),
    );

    const availableAbove = targetRect.top - WARNING_TOOLTIP_EDGE_PADDING_PX;
    const availableBelow = viewportHeight - targetRect.bottom - WARNING_TOOLTIP_EDGE_PADDING_PX;
    const prefersBelow = availableBelow >= tooltipRect.height + WARNING_TOOLTIP_OFFSET_PX || availableBelow >= availableAbove;
    let top = prefersBelow
      ? targetRect.bottom + WARNING_TOOLTIP_OFFSET_PX
      : targetRect.top - tooltipRect.height - WARNING_TOOLTIP_OFFSET_PX;

    top = Math.max(
      WARNING_TOOLTIP_EDGE_PADDING_PX,
      Math.min(top, viewportHeight - WARNING_TOOLTIP_EDGE_PADDING_PX - tooltipRect.height),
    );

    dom.overlayTooltip.style.left = `${Math.round(left)}px`;
    dom.overlayTooltip.style.top = `${Math.round(top)}px`;
  }

  function showWarningTooltip(target) {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const message = target.dataset.tooltip;
    if (!message) {
      return;
    }

    activeWarningTooltipTarget = target;
    dom.overlayTooltip.textContent = message;
    dom.overlayTooltip.hidden = false;
    positionWarningTooltip(target);
    dom.overlayTooltip.classList.add('is-visible');
  }

  function hideWarningTooltip(target) {
    if (target && activeWarningTooltipTarget && target !== activeWarningTooltipTarget) {
      return;
    }

    activeWarningTooltipTarget = null;
    dom.overlayTooltip.classList.remove('is-visible');
    dom.overlayTooltip.hidden = true;
    dom.overlayTooltip.textContent = '';
    dom.overlayTooltip.style.left = '0px';
    dom.overlayTooltip.style.top = '0px';
  }

  function repositionWarningTooltip() {
    if (!activeWarningTooltipTarget || dom.overlayTooltip.hidden) {
      return;
    }

    if (!document.body.contains(activeWarningTooltipTarget)) {
      hideWarningTooltip();
      return;
    }

    positionWarningTooltip(activeWarningTooltipTarget);
  }

  function getMetricClass(baseClass, stateName) {
    if (stateName === 'error') {
      return `${baseClass} is-error`;
    }
    if (stateName === 'positive') {
      return `${baseClass} is-positive`;
    }
    if (stateName === 'negative') {
      return `${baseClass} is-negative`;
    }
    if (stateName === 'muted') {
      return `${baseClass} is-muted`;
    }
    return baseClass;
  }

  function applyStaticTranslations() {
    document.title = tr('app.title');
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = tr(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((node) => {
      node.setAttribute('title', tr(node.dataset.i18nTitle));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      node.setAttribute('aria-label', tr(node.dataset.i18nAriaLabel));
    });
  }

  function renderProfileStack() {
    dom.profileStack.replaceChildren();

    const profile = state.profiles[0];
    if (!profile) {
      return;
    }

    const row = createNode('div', 'profile-row');
    const fields = createNode('div', 'profile-row-fields');

    const formatField = createNode('label', 'profile-field');
    const formatSelect = document.createElement('select');
    formatSelect.setAttribute('aria-label', tr('settings.defaultFormat'));
    FORMAT_OPTIONS.forEach((option) => {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = getFormatLabel(option.value);
      formatSelect.appendChild(node);
    });
    formatSelect.value = profile.format;
    formatSelect.disabled = state.isExporting;
    formatSelect.addEventListener('change', () => {
      updateProfileValue(profile.id, 'format', formatSelect.value);
    });
    formatField.appendChild(formatSelect);

    const presetField = createNode('label', 'profile-field');
    const presetSelect = document.createElement('select');
    presetSelect.setAttribute('aria-label', tr('settings.formatPreset', { format: getFormatLabel(profile.format) }));
    getPresetDefinitions(profile.format).forEach((definition) => {
      const node = document.createElement('option');
      node.value = definition.value;
      node.textContent = getPresetLabel(profile.format, definition);
      presetSelect.appendChild(node);
    });
    presetSelect.value = profile.preset;
    presetSelect.disabled = state.isExporting;
    presetSelect.addEventListener('change', () => {
      updateProfileValue(profile.id, 'preset', presetSelect.value);
    });
    presetField.appendChild(presetSelect);

    fields.append(formatField, presetField);

    let scaleSelect = null;
    if (profile.format !== 'PDF') {
      const scaleField = createNode('label', 'profile-field');
      scaleSelect = document.createElement('select');
      scaleSelect.setAttribute('aria-label', tr('template.var.scale'));
      SCALE_OPTIONS.forEach((value) => {
        const node = document.createElement('option');
        node.value = String(value);
        node.textContent = formatScale(value);
        scaleSelect.appendChild(node);
      });
      scaleSelect.value = String(profile.scale);
      scaleSelect.disabled = state.isExporting || isVectorFormat(profile.format);
      scaleSelect.addEventListener('change', () => {
        updateProfileValue(profile.id, 'scale', scaleSelect.value);
      });
      scaleField.appendChild(scaleSelect);
      fields.appendChild(scaleField);
    }
    row.appendChild(fields);
    dom.profileStack.appendChild(row);

    fitSelectToContent(formatSelect);
    fitSelectToContent(presetSelect);
    if (scaleSelect) {
      fitSelectToContent(scaleSelect);
    }
  }

  function renderRow(row) {
    const tableRow = document.createElement('tr');

    const previewCell = document.createElement('td');
    previewCell.dataset.label = tr('table.preview');
    const preview = createNode('div', 'preview-shell');
    const previewUrl = getFramePreviewUrl(row.nodeId);
    if (previewUrl) {
      const image = document.createElement('img');
      image.src = previewUrl;
      image.alt = '';
      preview.appendChild(image);
    } else {
      preview.textContent = getFrameInitial(row.name);
    }
    previewCell.appendChild(preview);

    const fileCell = document.createElement('td');
    fileCell.className = 'file-cell';
    fileCell.dataset.label = tr('table.file');
    const fileContentRow = createNode('div', 'file-content-row');
    const fileStack = createNode('div', 'file-stack');
    const fileName = createNode('p', 'file-name', buildRowFileName(row));
    const fileWarning = getLargeRasterWarningForRow(row);
    const resultText = getResultText(row);
    const resultLabel = row.status === 'error' ? tr('status.failed') : resultText;
    const resultClass = row.status === 'error'
      ? 'muted'
      : resultText === tr('status.ready') || resultText === tr('status.estimatingSize')
        ? 'muted'
        : '';
    const compressionValue = getCompressionValue(row);
    const compressionState = row.status === 'error'
      ? 'muted'
      : compressionValue > 0
        ? 'positive'
        : compressionValue < 0
          ? 'negative'
          : 'muted';
    const fileMeta = createNode('p', 'file-meta');
    const metaSegments = [
      createNode('span', 'meta-segment', formatDimensions(row.width, row.height)),
      createNode('span', 'meta-segment', row.format),
      createNode('span', getMetricClass('metric-cell meta-segment', resultClass), resultLabel),
      createNode('span', getMetricClass('metric-cell meta-segment', compressionState), getCompressionLabel(row)),
    ];
    if (!isVectorFormat(row.format)) {
      metaSegments.splice(2, 0, createNode('span', 'meta-segment', formatScale(row.scale)));
    }

    metaSegments.forEach((segment, index) => {
      if (index > 0) {
        fileMeta.appendChild(createNode('span', 'meta-divider', '･'));
      }
      fileMeta.appendChild(segment);
    });

    fileStack.append(fileName, fileMeta);

    if (row.status === 'error') {
      fileStack.appendChild(createNode('p', 'file-error', resultText));
    }

    fileContentRow.appendChild(fileStack);
    if (fileWarning) {
      fileContentRow.appendChild(createWarningBadge(fileWarning));
    }

    fileCell.appendChild(fileContentRow);

    tableRow.append(previewCell, fileCell);

    return tableRow;
  }

  function renderRows() {
    hideWarningTooltip();
    dom.exportTableBody.replaceChildren();

    if (!state.rows.length) {
      dom.emptyState.hidden = false;
      return;
    }

    dom.emptyState.hidden = true;
    const fragment = document.createDocumentFragment();
    state.rows.forEach((row) => {
      fragment.appendChild(renderRow(row));
    });
    dom.exportTableBody.appendChild(fragment);
  }

  function renderFooter() {
    dom.footerStatus.replaceChildren();
    dom.footerStatus.hidden = true;
    dom.footerStatus.className = 'footer-status';

    const counts = {
      queued: 0,
      processing: 0,
      done: 0,
      error: 0,
    };

    state.rows.forEach((row) => {
      if (counts[row.status] !== undefined) {
        counts[row.status] += 1;
      }
    });

    if (state.rows.length === 0) {
      dom.footerMeta.textContent = tr('status.selectLayers');
      return;
    }

    const parts = [];
    const anyExportActivity = state.isExporting || counts.done > 0 || counts.error > 0;

    if (anyExportActivity) {
      const active = counts.queued + counts.processing;
      if (active > 0) parts.push(trp('status.queued', active));
      if (counts.done > 0) parts.push(trp('status.done', counts.done));
      if (counts.error > 0) parts.push(trp('status.error', counts.error));

      const totalSize = state.rows.reduce((sum, row) => {
        const b = row.exportedBytes ?? row.estimateBytes;
        return b != null ? sum + b : sum;
      }, 0);
      const totalBaseline = state.rows.reduce((sum, row) =>
        row.baselineBytes != null ? sum + row.baselineBytes : sum, 0);

      if (totalSize > 0) parts.push(formatBytes(totalSize));
      if (totalBaseline > totalSize && totalSize > 0) {
        parts.push(tr('status.saved', { size: formatBytes(totalBaseline - totalSize) }));
      }
    } else {
      const outputCount = getExportOutputCount();
      parts.push(trp('status.export', outputCount));
      if (state.isEstimating) parts.push(tr('status.estimating'));
    }

    const footerSummary = createNode('span', 'footer-meta-text', parts.join(' • '));
    dom.footerMeta.replaceChildren(footerSummary);

    if (state.footerNote) {
      dom.footerStatus.textContent = state.footerNote;
      dom.footerStatus.hidden = false;
    }
  }

  function renderTopbar() {
    const isSettingsView = state.view === 'settings';
    dom.profileStack.hidden = isSettingsView;
    dom.settingsToggleButton.classList.toggle('is-active', isSettingsView);
    dom.settingsToggleButton.setAttribute(
      'aria-label',
      isSettingsView ? tr('settings.back') : tr('settings.open'),
    );
    dom.settingsToggleButton.title = isSettingsView ? tr('settings.back') : tr('settings.open');
  }

  function lockExportButtonWidth() {
    const hasRows = state.rows.length > 0;
    const outputCount = getExportOutputCount();
    // Only the idle label and the spinner labels are shown on the button, so the
    // lock keeps the button at its idle size (no growth when export starts).
    const labels = [
      hasRows && outputCount > 1
        ? tr('button.exportCount', { count: outputCount })
        : tr('button.export'),
      ...EXPORT_BUTTON_BUSY_FRAMES.map((frame) => formatExportButtonBusyLabel(frame, 100)),
    ];
    const measuredWidth = labels.reduce(
      (maxWidth, label) => Math.max(maxWidth, measureButtonLabelWidth(label)),
      Math.ceil(dom.exportButton.getBoundingClientRect().width),
    );
    exportButtonLockedWidth = Math.ceil(measuredWidth);
    dom.exportButton.style.width = `${exportButtonLockedWidth}px`;
  }

  function unlockExportButtonWidth() {
    exportButtonLockedWidth = 0;
    dom.exportButton.style.width = '';
  }

  function clampExportProgressPercent(completed, total) {
    const safeTotal = Number(total) || 0;
    if (safeTotal <= 0) {
      return 0;
    }

    const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
    return Math.round((safeCompleted / safeTotal) * 100);
  }

  function formatExportButtonBusyLabel(frame, percent) {
    return `${frame} ${percent}%`;
  }

  function measureButtonLabelWidth(label) {
    const probe = document.createElement('button');
    probe.className = dom.exportButton.className;
    probe.type = 'button';
    probe.disabled = dom.exportButton.disabled;
    probe.textContent = label;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.left = '-9999px';
    probe.style.top = '0';
    probe.style.width = 'auto';
    probe.style.minWidth = '0';
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }

  function getExportButtonLabel(hasRows) {
    if (state.isExporting) {
      const frame = EXPORT_BUTTON_BUSY_FRAMES[
        exportButtonAnimationIndex % EXPORT_BUTTON_BUSY_FRAMES.length
      ];
      const percent = clampExportProgressPercent(
        state.exportProgress.completed,
        state.exportProgress.total,
      );
      // Animated spinner + progress throughout, including while cancelling (the
      // button greys out and the footer shows "Stopping export…"). Keeping the same
      // compact label avoids any width change mid-export.
      return formatExportButtonBusyLabel(frame, percent);
    }

    if (hasRows) {
      const outputCount = getExportOutputCount();
      return outputCount > 1 ? tr('button.exportCount', { count: outputCount }) : tr('button.export');
    }

    return tr('button.export');
  }

  function updateExportButtonLabel() {
    const hasRows = state.rows.length > 0;
    dom.exportButton.textContent = getExportButtonLabel(hasRows);
  }

  function stopExportButtonAnimation() {
    if (exportButtonAnimationTimer) {
      window.clearInterval(exportButtonAnimationTimer);
      exportButtonAnimationTimer = null;
    }
    exportButtonAnimationIndex = 0;
    unlockExportButtonWidth();
  }

  function syncExportButtonAnimation() {
    if (!state.isExporting) {
      stopExportButtonAnimation();
      return;
    }

    if (exportButtonAnimationTimer) {
      return;
    }

    exportButtonAnimationTimer = window.setInterval(() => {
      if (!state.isExporting) {
        stopExportButtonAnimation();
        return;
      }

      exportButtonAnimationIndex = (exportButtonAnimationIndex + 1) % EXPORT_BUTTON_BUSY_FRAMES.length;
      updateExportButtonLabel();
    }, EXPORT_BUTTON_BUSY_INTERVAL_MS);
  }

  function render() {
    const hasRows = state.rows.length > 0;
    const isSettingsView = state.view === 'settings';
    syncActiveLocale();
    applyStaticTranslations();
    document.body.classList.toggle('is-settings-view', isSettingsView);
    document.body.classList.toggle('is-queue-view', !isSettingsView);

    renderTopbar();

    dom.settingsPanel.hidden = !isSettingsView;
    dom.exportPanel.hidden = isSettingsView;
    dom.exportButton.hidden = isSettingsView;
    // While exporting the button acts as Stop (enabled), except once a stop is in
    // flight; otherwise it's the Export button (enabled only when there are rows).
    dom.exportButton.disabled = state.isExporting ? state.isCancelling : !hasRows;
    dom.exportButton.classList.toggle('is-stop', state.isExporting && !state.isCancelling);
    dom.exportButton.style.width = exportButtonLockedWidth > 0 ? `${exportButtonLockedWidth}px` : '';
    syncExportButtonAnimation();
    updateExportButtonLabel();

    renderDefaultsControls();
    renderExportSettingsControls();
    renderLanguageControls();
    renderSettingsDataControls();
    renderOpenSourceControls();
    renderSettingsNavTabs();
    renderSettingsSectionVisibility();
    renderPresetSettingsControls();
    renderProfileStack();
    renderRows();
    renderFooter();
  }

  function handleExportFileMessage(message) {
    exportFileQueue = exportFileQueue.then(async () => {
      try {
        const isStaleSession = state.exportProgress.sessionId
          && message.sessionId
          && message.sessionId !== state.exportProgress.sessionId;

        if (!isStaleSession && message.rowId) {
          const rawByteLen = typeof message.baselineBytes === 'number'
            ? message.baselineBytes
            : message.bytes instanceof Uint8Array || message.bytes instanceof ArrayBuffer
              ? message.bytes.byteLength
              : Array.isArray(message.bytes) ? message.bytes.length : 0;
          if (rawByteLen > 0) {
            state.rows = state.rows.map((row) =>
              row.id === message.rowId ? { ...row, baselineBytes: rawByteLen } : row,
            );
          }
        }

        if (!isStaleSession && message.deliveryId) {
          // Tell the plugin we've started processing so it restarts the ack
          // timeout from now rather than from dispatch.
          sendPluginMessage({
            type: 'export-file-processing',
            sessionId: message.sessionId,
            deliveryId: message.deliveryId,
          });
        }

        const result = isStaleSession
          ? { ok: false, detail: tr('error.staleSession') }
          : await queueDownload(message);
        sendExportFileAck(message, result);
      } catch (error) {
        // Never let a single delivery reject the shared queue, which would skip
        // every subsequent file's ACK and stall the whole export.
        sendExportFileAck(message, { ok: false, detail: toErrorMessage(error) });
      }
    }).catch(() => {});
  }

  function sendEstimateRasterResult(message, result) {
    sendPluginMessage({
      type: 'estimate-raster-result',
      requestId: message.requestId || '',
      ok: Boolean(result.ok),
      detail: typeof result.detail === 'string' ? result.detail : '',
      bytesLength: typeof result.bytesLength === 'number' ? result.bytesLength : undefined,
    });
  }

  function handleEstimateRasterMessage(message) {
    Promise.resolve()
      .then(() => estimateRasterPayload(message))
      .catch((error) => ({
        ok: false,
        detail: toErrorMessage(error),
      }))
      .then((result) => {
        sendEstimateRasterResult(message, result);
      });
  }

  function handleWindowMessage(event) {
    const message = event.data && event.data.pluginMessage;
    if (!message || typeof message.type !== 'string') {
      return;
    }

    switch (message.type) {
      case 'bootstrap':
        handleBootstrap(message);
        break;
      case 'selection-sync':
        handleSelectionSync(message);
        break;
      case 'thumbnail':
        handleThumbnail(message);
        break;
      case 'estimates-result':
        handleEstimatesResult(message);
        break;
      case 'estimate-raster':
        handleEstimateRasterMessage(message);
        break;
      case 'export-start':
        handleExportStart(message);
        break;
      case 'export-row-status':
        handleExportRowStatus(message);
        break;
      case 'export-progress':
        handleExportProgress(message);
        break;
      case 'export-file':
        handleExportFileMessage(message);
        break;
      case 'export-complete':
        handleExportComplete(message);
        break;
      default:
        break;
    }
  }

  function handleExportButtonClick() {
    if (state.isExporting) {
      handleStopClick();
    } else {
      handleExportClick();
    }
  }

  function handleStopClick() {
    if (!state.isExporting || state.isCancelling) {
      return;
    }
    state.isCancelling = true;
    sendPluginMessage({
      type: 'cancel-export',
      sessionId: state.exportProgress.sessionId || '',
    });
    updateFooterStatus(tr('status.stopping'));
    render();
  }

  async function handleExportClick() {
    if (!state.rows.length || state.isExporting) {
      return;
    }

    // Claim the exporting state synchronously so a fast second click can't re-enter
    // during the awaited directory picker and launch a second export.
    state.isExporting = true;
    state.isCancelling = false;

    try {
      activeExportTarget = await prepareExportTarget();
    } catch (error) {
      activeExportTarget = null;
      state.isExporting = false;
      state.isCancelling = false;
      updateFooterStatus(
        isAbortError(error)
          ? tr('status.exportCancelled')
          : tr('status.exportSetupFailed', { error: toErrorMessage(error) }),
      );
      return;
    }

    lockExportButtonWidth();
    render();

    sendPluginMessage({
      type: 'run-export',
      defaults: {
        ...state.defaults,
        presets: { ...state.defaults.presets },
      },
      settings: { ...state.settings },
      presetSettings: state.presetSettings,
      profiles: state.profiles.map((profile) => ({ ...profile })),
      rows: buildRequestRows(),
    });
  }

  async function handleSettingsImportChange() {
    const files = dom.settingsImportInput.files;
    const file = files && files[0];
    dom.settingsImportInput.value = '';

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      applyImportedSettings(parsed, file.name);
    } catch (error) {
      updateFooterStatus(tr('status.importFailed', { error: toErrorMessage(error) }));
      renderFooter();
    }
  }

  function wireEvents() {
    dom.settingsToggleButton.addEventListener('click', () => {
      setView(state.view === 'settings' ? 'export' : 'settings');
    });

    dom.settingsCloseButton.addEventListener('click', () => setView('export'));
    dom.exportButton.addEventListener('click', handleExportButtonClick);
    dom.settingsImportInput.addEventListener('change', handleSettingsImportChange);
    dom.resizeGrip.addEventListener('pointerdown', handleResizeGripPointerDown);
    dom.resizeGrip.addEventListener('pointermove', handleResizeGripPointerMove);
    dom.resizeGrip.addEventListener('pointerup', handleResizeGripPointerUp);
    dom.resizeGrip.addEventListener('pointercancel', handleResizeGripPointerUp);
    dom.resizeGrip.addEventListener('lostpointercapture', () => {
      stopUiResize();
    });

    window.addEventListener('message', handleWindowMessage);
    window.addEventListener('resize', repositionWarningTooltip);
    document.addEventListener('scroll', repositionWarningTooltip, true);
    window.addEventListener('beforeunload', () => {
      hideWarningTooltip();
      stopExportButtonAnimation();
      Array.from(previewUrls.values()).forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
      teardownRasterExportWorker();
    });
  }

  wireEvents();
  render();
  sendPluginMessage({ type: 'ui-ready' });
})();
