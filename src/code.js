import { optimize as optimizeSvg } from 'svgo/browser';

const STORAGE_KEY = 'frame-exporter-plugin-state-v1';
const PREVIEW_WIDTH = 128;
const DEFAULT_EXPORT_CONCURRENCY = 3;
const MAX_EXPORT_CONCURRENCY = 6;
const EXPORT_FILE_ACK_TIMEOUT_MS = 120000;
const SCALE_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const FORMAT_META = {
  PNG: { extension: 'png', mimeType: 'image/png', vector: false },
  JPG: { extension: 'jpg', mimeType: 'image/jpeg', vector: false },
  WEBP: { extension: 'webp', mimeType: 'image/webp', vector: false },
  SVG: { extension: 'svg', mimeType: 'image/svg+xml', vector: true },
  PDF: { extension: 'pdf', mimeType: 'application/pdf', vector: true },
};
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
    { value: 'lossless-webp', settings: { quality: 100, lossless: true } },
    { value: 'balanced-webp', settings: { quality: 84, lossless: false } },
    { value: 'web-webp', settings: { quality: 74, lossless: false } },
    { value: 'preview-webp', settings: { quality: 62, lossless: false } },
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
const JPG_QUALITY_OPTIONS = new Set([96, 92, 88, 84, 78, 74, 68, 62, 56]);
const DEFAULT_UI_WIDTH = 460;
const DEFAULT_UI_HEIGHT = 640;
const MIN_UI_WIDTH = 420;
const MAX_UI_WIDTH = 1200;
const MIN_UI_HEIGHT = 420;
const MAX_UI_HEIGHT = 1200;
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

const DEFAULT_NAME_TEMPLATE = [
  { type: 'var', key: 'name' },
  { type: 'var', key: 'scale' },
];

const DEFAULT_ARCHIVE_NAME_TEMPLATE = [
  { type: 'var', key: 'page' },
  { type: 'text', value: ' ' },
  { type: 'var', key: 'date' },
];

const VALID_TEMPLATE_VAR_KEYS = new Set(['name', 'page', 'scale', 'width', 'height', 'date', 'time']);
const VALID_ARCHIVE_TEMPLATE_VAR_KEYS = new Set([...VALID_TEMPLATE_VAR_KEYS, 'count']);

const DEFAULT_STATE = {
  defaults: {
    format: 'PNG',
    preset: 'web',
    presets: createDefaultPresetMap(),
    scale: 1,
  },
  settings: {
    autoEstimateSize: true,
    closeAfterExport: false,
    exportConcurrency: DEFAULT_EXPORT_CONCURRENCY,
    nameTemplate: DEFAULT_NAME_TEMPLATE,
    archiveNameTemplate: DEFAULT_ARCHIVE_NAME_TEMPLATE,
    preserveFolderStructure: true,
  },
  presetSettings: createDefaultPresetSettings(),
  profiles: [
    {
      id: 'profile-1',
      format: 'PNG',
      preset: 'web',
      scale: 1,
    },
  ],
};

let uiIsReady = false;
let selectionVersion = 0;
let latestEstimateRequestId = 0;
let exportSessionSeed = 0;
let rasterEstimateRequestSeed = 0;
let activeExportSession = null;
const pendingRasterEstimateRequests = new Map();
let latestStoredState = normalizeState(DEFAULT_STATE);
let currentUiSize = {
  width: DEFAULT_UI_WIDTH,
  height: DEFAULT_UI_HEIGHT,
};

figma.showUI(__html__, {
  width: currentUiSize.width,
  height: currentUiSize.height,
  themeColors: true,
});

figma.on('selectionchange', () => {
  if (!uiIsReady) {
    return;
  }
  syncSelectionToUI();
});

figma.ui.onmessage = async (message) => {
  if (!message || typeof message.type !== 'string') {
    return;
  }

  switch (message.type) {
    case 'ui-ready':
      uiIsReady = true;
      latestStoredState = await loadState();
      postToUI({
        type: 'bootstrap',
        state: latestStoredState,
        nodes: getSelectedExportNodes().map(toNodeSummary),
      });
      await syncSelectionToUI();
      break;
    case 'persist-state':
      latestStoredState = normalizeState(message.state);
      try {
        await figma.clientStorage.setAsync(STORAGE_KEY, latestStoredState);
      } catch {
        // clientStorage unavailable (e.g. no plugin ID in dev mode)
      }
      break;
    case 'request-estimates':
      try {
        await handleEstimateRequest(message);
      } catch {
        // Estimates are best-effort; never let a failure become an unhandled rejection.
      }
      break;
    case 'run-export':
      try {
        await handleExport(message);
      } catch (error) {
        // A pre-session failure (e.g. reading the selection) would otherwise strand
        // the UI in the "exporting" state with no export-complete message.
        if (activeExportSession) {
          clearActiveExportSession(activeExportSession);
        }
        postToUI({
          type: 'export-complete',
          exported: 0,
          completed: 0,
          total: 0,
          errors: [toErrorMessage(error)],
        });
        figma.notify('Export failed to start', { error: true });
      }
      break;
    case 'resize-ui':
      resizePluginUi(message.width, message.height);
      break;
    case 'export-file-ack':
      handleExportFileAck(message);
      break;
    case 'export-file-processing':
      handleExportFileProcessing(message);
      break;
    case 'cancel-export':
      cancelExportSession(message);
      break;
    case 'estimate-raster-result':
      handleRasterEstimateResult(message);
      break;
    default:
      break;
  }
};

function postToUI(payload) {
  if (!uiIsReady) {
    return;
  }
  figma.ui.postMessage(payload);
}

function clampUiDimension(value, minValue, maxValue, fallbackValue) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) {
    return fallbackValue;
  }
  return Math.max(minValue, Math.min(maxValue, parsed));
}

function normalizeUiSize(width, height) {
  return {
    width: clampUiDimension(width, MIN_UI_WIDTH, MAX_UI_WIDTH, currentUiSize.width),
    height: clampUiDimension(height, MIN_UI_HEIGHT, MAX_UI_HEIGHT, currentUiSize.height),
  };
}

function resizePluginUi(width, height) {
  const nextSize = normalizeUiSize(width, height);
  currentUiSize = nextSize;
  figma.ui.resize(nextSize.width, nextSize.height);
}

function getPresetDefinitions(format) {
  return PRESET_DEFINITIONS[format] || PRESET_DEFINITIONS[DEFAULT_STATE.defaults.format];
}

function getDefaultPresetValue(format) {
  const preferred = DEFAULT_PRESET_BY_FORMAT[format];
  return getPresetDefinition(format, preferred) ? preferred : getPresetDefinitions(format)[0].value;
}

function normalizeDefaultPresetMap(rawPresets, fallbackFormat, fallbackPreset) {
  const safePresets = rawPresets && typeof rawPresets === 'object' ? rawPresets : {};
  const defaults = createDefaultPresetMap();
  const safeFallbackFormat = FORMAT_META[fallbackFormat] ? fallbackFormat : DEFAULT_STATE.defaults.format;

  Object.keys(FORMAT_META).forEach((format) => {
    defaults[format] = normalizePreset(format, safePresets[format]);
  });

  if (!safePresets[safeFallbackFormat] && fallbackPreset) {
    defaults[safeFallbackFormat] = normalizePreset(safeFallbackFormat, fallbackPreset);
  }

  return defaults;
}

function getDefaultPresetForFormat(defaults, format) {
  const safeDefaults = defaults && typeof defaults === 'object' ? defaults : DEFAULT_STATE.defaults;
  const safeFormat = FORMAT_META[format] ? format : DEFAULT_STATE.defaults.format;
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

function normalizeScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_STATE.defaults.scale;
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
    return DEFAULT_EXPORT_CONCURRENCY;
  }
  return Math.max(1, Math.min(MAX_EXPORT_CONCURRENCY, parsed));
}

function normalizePreset(format, value) {
  return getPresetDefinition(format, value) ? value : getDefaultPresetValue(format);
}

function createDefaultProfile(defaults, id) {
  const safeDefaults = defaults && typeof defaults === 'object' ? defaults : DEFAULT_STATE.defaults;
  const format = FORMAT_META[safeDefaults.format] ? safeDefaults.format : DEFAULT_STATE.defaults.format;
  return {
    id: typeof id === 'string' && id ? id : 'profile-1',
    format,
    preset: getDefaultPresetForFormat(safeDefaults, format),
    scale: normalizeScale(safeDefaults.scale),
  };
}

function normalizeProfiles(rawProfiles, defaults) {
  if (!Array.isArray(rawProfiles) || !rawProfiles.length) {
    return [createDefaultProfile(defaults, 'profile-1')];
  }

  return rawProfiles.map((profile, index) => {
    const safeProfile = profile && typeof profile === 'object' ? profile : {};
    const format = FORMAT_META[safeProfile.format] ? safeProfile.format : defaults.format;
    return {
      id: typeof safeProfile.id === 'string' && safeProfile.id ? safeProfile.id : `profile-${index + 1}`,
      format,
      preset: normalizePreset(
        format,
        safeProfile.preset !== undefined ? safeProfile.preset : getDefaultPresetForFormat(defaults, format),
      ),
      scale: normalizeScale(
        safeProfile.scale !== undefined ? safeProfile.scale : defaults.scale,
      ),
    };
  });
}

function resolveLegacyScale(state) {
  if (state && Array.isArray(state.presets) && state.presets.length) {
    return state.presets[0].scale;
  }
  return DEFAULT_STATE.defaults.scale;
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
        if (JPG_QUALITY_OPTIONS.has(parsed)) {
          return parsed;
        }
        const fallbackParsed = Math.round(Number(fallbackValue));
        return JPG_QUALITY_OPTIONS.has(fallbackParsed) ? fallbackParsed : 84;
      }
      break;
    case 'WEBP':
      if (key === 'quality') {
        const parsed = Math.round(Number(value));
        if (parsed === 100 || JPG_QUALITY_OPTIONS.has(parsed)) {
          return parsed;
        }
        const fallbackParsed = Math.round(Number(fallbackValue));
        if (fallbackParsed === 100 || JPG_QUALITY_OPTIONS.has(fallbackParsed)) {
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

  if (format === 'PNG') {
    if (normalized.qualityMin > normalized.qualityTarget) {
      normalized.qualityMin = normalized.qualityTarget;
    }
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

function normalizeState(state) {
  const safeState = state && typeof state === 'object' ? state : {};
  const safeDefaults = safeState.defaults && typeof safeState.defaults === 'object'
    ? safeState.defaults
    : safeState;
  const format = FORMAT_META[safeDefaults.format] ? safeDefaults.format : DEFAULT_STATE.defaults.format;
  const presets = normalizeDefaultPresetMap(
    safeDefaults.presets,
    format,
    safeDefaults.preset,
  );
  const scale = normalizeScale(
    safeDefaults.scale !== undefined ? safeDefaults.scale : resolveLegacyScale(safeState),
  );
  const defaults = {
    format,
    preset: presets[format],
    presets,
    scale,
  };
  const safeSettings = safeState.settings && typeof safeState.settings === 'object'
    ? safeState.settings
    : {};

  return {
    defaults,
    settings: {
      autoEstimateSize: safeSettings.autoEstimateSize !== undefined
        ? Boolean(safeSettings.autoEstimateSize)
        : DEFAULT_STATE.settings.autoEstimateSize,
      closeAfterExport: Boolean(safeSettings.closeAfterExport),
      exportConcurrency: normalizeExportConcurrency(safeSettings.exportConcurrency),
      nameTemplate: Array.isArray(safeSettings.nameTemplate)
        ? normalizeNameTemplate(safeSettings.nameTemplate)
        : (() => {
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
    profiles: normalizeProfiles(safeState.profiles, defaults),
  };
}

function getPresetSettings(settingsState, format, preset) {
  const safeFormat = settingsState[format] && typeof settingsState[format] === 'object'
    ? settingsState[format]
    : {};
  const safePreset = safeFormat[preset] && typeof safeFormat[preset] === 'object'
    ? safeFormat[preset]
    : {};
  const fallback = getPresetDefinition(format, preset);
  return {
    ...normalizePresetSettingBundle(
      format,
      {
        ...(fallback ? fallback.settings : {}),
        ...safePreset,
      },
      fallback ? fallback.settings : {},
    ),
  };
}

async function loadState() {
  try {
    const state = await figma.clientStorage.getAsync(STORAGE_KEY);
    return normalizeState(state || DEFAULT_STATE);
  } catch {
    return normalizeState(DEFAULT_STATE);
  }
}

function isVectorFormat(format) {
  return Boolean(FORMAT_META[format] && FORMAT_META[format].vector);
}

function isExportableSelectionNode(node) {
  return Boolean(
    node
    && typeof node.exportAsync === 'function'
    && typeof node.width === 'number'
    && typeof node.height === 'number',
  );
}

function getSelectedExportNodes() {
  return figma.currentPage.selection.filter((node) => isExportableSelectionNode(node));
}

function getSelectedNodeMap() {
  return new Map(getSelectedExportNodes().map((node) => [node.id, node]));
}

function findPageName(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'PAGE') {
      return current.name;
    }
    current = current.parent;
  }
  return figma.currentPage.name;
}

function roundDimension(value) {
  return Math.max(1, Math.round(Number(value) || 0));
}

function toNodeSummary(node) {
  return {
    id: node.id,
    name: node.name || node.type,
    type: node.type,
    width: roundDimension(node.width),
    height: roundDimension(node.height),
    pageName: findPageName(node),
  };
}

function buildPreviewSettings() {
  return {
    format: 'PNG',
    constraint: {
      type: 'WIDTH',
      value: PREVIEW_WIDTH,
    },
  };
}

function buildRasterSourceSettings(scale) {
  return {
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
  };
}

function isOriginalFilesPreset(row) {
  return Boolean(row && row.format === 'PNG' && row.preset === 'original');
}

function matchesSignature(bytes, signature, offset = 0) {
  if (!(bytes instanceof Uint8Array) || bytes.length < offset + signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

function sniffOriginalFileType(bytes) {
  const safeBytes = assertExportBytes(bytes);

  if (matchesSignature(safeBytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: 'png', mimeType: 'image/png' };
  }

  if (matchesSignature(safeBytes, [0xff, 0xd8, 0xff])) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }

  if (
    matchesSignature(safeBytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
    || matchesSignature(safeBytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return { extension: 'gif', mimeType: 'image/gif' };
  }

  if (
    matchesSignature(safeBytes, [0x52, 0x49, 0x46, 0x46])
    && matchesSignature(safeBytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  if (matchesSignature(safeBytes, [0x42, 0x4d])) {
    return { extension: 'bmp', mimeType: 'image/bmp' };
  }

  if (
    matchesSignature(safeBytes, [0x49, 0x49, 0x2a, 0x00])
    || matchesSignature(safeBytes, [0x4d, 0x4d, 0x00, 0x2a])
  ) {
    return { extension: 'tif', mimeType: 'image/tiff' };
  }

  const header = decodeUtf8Bytes(safeBytes.subarray(0, Math.min(safeBytes.length, 512))).trimStart();
  if (header.startsWith('<svg') || (header.startsWith('<?xml') && header.includes('<svg'))) {
    return { extension: 'svg', mimeType: 'image/svg+xml' };
  }

  return { extension: 'bin', mimeType: 'application/octet-stream' };
}

function collectImageHashesFromNode(node, hashes, visited) {
  if (!node || !hashes || !visited) {
    return;
  }

  if (visited.has(node.id) || ('visible' in node && node.visible === false)) {
    return;
  }
  visited.add(node.id);

  if ('fills' in node && Array.isArray(node.fills)) {
    for (const paint of node.fills) {
      if (
        paint
        && paint.type === 'IMAGE'
        && paint.visible !== false
        && typeof paint.imageHash === 'string'
        && paint.imageHash
      ) {
        hashes.add(paint.imageHash);
      }
    }
  }

  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collectImageHashesFromNode(child, hashes, visited);
    }
  }
}

async function extractOriginalFileAsset(node) {
  const hashes = new Set();
  collectImageHashesFromNode(node, hashes, new Set());

  if (hashes.size !== 1) {
    return null;
  }

  if (typeof figma.getImageByHash !== 'function') {
    return null;
  }

  const [imageHash] = Array.from(hashes);
  const image = figma.getImageByHash(imageHash);
  if (!image || typeof image.getBytesAsync !== 'function') {
    return null;
  }

  const bytes = assertExportBytes(await image.getBytesAsync());
  const fileType = sniffOriginalFileType(bytes);
  return {
    bytes,
    extension: fileType.extension,
    mimeType: fileType.mimeType,
  };
}

function buildEstimateSettings(row, presetSettings) {
  // Export a lossless PNG source for every raster format (PNG/JPG/WEBP) so the
  // estimate is compressed by the same worker pipeline used for the real export.
  if (row.format === 'PNG' || row.format === 'WEBP' || row.format === 'JPG') {
    return buildRasterSourceSettings(row.scale);
  }

  if (row.format === 'SVG') {
    return {
      format: 'SVG',
      svgOutlineText: Boolean(presetSettings.svgOutlineText),
      svgIdAttribute: Boolean(presetSettings.svgIdAttribute),
      svgSimplifyStroke: Boolean(presetSettings.svgSimplifyStroke),
    };
  }

  if (row.format === 'PDF') {
    return {
      format: 'PDF',
      contentsOnly: Boolean(presetSettings.contentsOnly),
      useAbsoluteBounds: Boolean(presetSettings.useAbsoluteBounds),
    };
  }

  return buildRasterSourceSettings(1);
}

function buildExportSourceSettings(row, presetSettings) {
  if (row.format === 'PNG' || row.format === 'JPG' || row.format === 'WEBP') {
    return buildRasterSourceSettings(row.scale);
  }

  if (row.format === 'SVG') {
    return {
      format: 'SVG',
      svgOutlineText: Boolean(presetSettings.svgOutlineText),
      svgIdAttribute: Boolean(presetSettings.svgIdAttribute),
      svgSimplifyStroke: Boolean(presetSettings.svgSimplifyStroke),
    };
  }

  if (row.format === 'PDF') {
    return {
      format: 'PDF',
      contentsOnly: Boolean(presetSettings.contentsOnly),
      useAbsoluteBounds: Boolean(presetSettings.useAbsoluteBounds),
    };
  }

  return buildRasterSourceSettings(1);
}

function buildSvgSvgoConfig(presetSettings, path) {
  if (!presetSettings.svgoEnabled) {
    return null;
  }

  const pluginState = normalizeSvgSvgoPluginState(
    presetSettings.svgoPlugins,
    createSvgSvgoPluginState(),
  );
  const plugins = SVG_SVGO_PLUGIN_KEYS.filter((key) => pluginState[key]);

  if (!plugins.length) {
    return null;
  }

  return {
    multipass: Boolean(presetSettings.svgoMultipass),
    floatPrecision: normalizeClosestOption(
      presetSettings.svgoFloatPrecision,
      SVG_SVGO_FLOAT_PRECISION_OPTIONS,
      3,
    ),
    plugins,
    path,
  };
}

function parseSvgSvgoOverrides(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function optimiseSvgBytes(bytes, presetSettings, path) {
  const baseConfig = buildSvgSvgoConfig(presetSettings, path);
  const overrides = parseSvgSvgoOverrides(presetSettings.svgoOverrides);
  const config = overrides
    ? {
      ...(baseConfig || {}),
      ...overrides,
      plugins: overrides.plugins !== undefined
        ? overrides.plugins
        : baseConfig ? baseConfig.plugins : undefined,
    }
    : baseConfig;
  if (!config) {
    return assertExportBytes(bytes);
  }

  try {
    const input = decodeUtf8Bytes(bytes);
    const optimized = optimizeSvg(input, config);
    return encodeUtf8String(optimized.data);
  } catch {
    return assertExportBytes(bytes);
  }
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

function formatScale(scale) {
  const normalized = normalizeScale(scale);
  return `@${String(normalized).replace(/\.0$/, '')}x`;
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

function evaluateNameTemplate(nodeSummary, format, scale, template, date, options = {}) {
  const d = date instanceof Date ? date : new Date();
  const ignoreScale = Boolean(options.ignoreScale);
  let result = '';
  for (const token of template) {
    if (token.type === 'text') {
      result += token.value;
    } else if (token.type === 'var') {
      switch (token.key) {
        case 'name':
          result += sanitizeVarValue(nodeSummary.name);
          break;
        case 'page':
          result += sanitizeVarValue(nodeSummary.pageName || '');
          break;
        case 'scale':
          if (!ignoreScale && !isVectorFormat(format)) {
            result += formatScale(scale);
          }
          break;
        case 'width':
          result += String(nodeSummary.width || '');
          break;
        case 'height':
          result += String(nodeSummary.height || '');
          break;
        case 'date':
          result += formatExportDate(d);
          break;
        case 'time':
          result += formatExportTime(d);
          break;
      }
    }
  }
  return result;
}

function sanitizeFileExtension(value) {
  const normalized = String(value || 'bin')
    .trim()
    .replace(/^\.+/, '')
    .toLowerCase();
  return normalized.replace(/[^a-z0-9]+/g, '') || 'bin';
}

function buildFileNameWithExtension(nodeSummary, extension, settings, options = {}) {
  const template = Array.isArray(settings.nameTemplate)
    ? normalizeNameTemplate(settings.nameTemplate)
    : DEFAULT_NAME_TEMPLATE.map((t) => ({ ...t }));
  const preserveFolders = settings.preserveFolderStructure !== false;
  const path = normalizeExportPath(
    evaluateNameTemplate(
      nodeSummary,
      options.format || 'PNG',
      options.scale !== undefined ? options.scale : 1,
      template,
      options.date instanceof Date ? options.date : new Date(),
      options,
    ),
    preserveFolders,
  );
  return `${path}.${sanitizeFileExtension(extension)}`;
}

function buildFileName(nodeSummary, format, scale, settings, date) {
  return buildFileNameWithExtension(
    nodeSummary,
    FORMAT_META[format].extension,
    settings,
    { format, scale, date },
  );
}

function buildOriginalFileName(nodeSummary, extension, settings, date) {
  return buildFileNameWithExtension(
    nodeSummary,
    extension,
    settings,
    { format: 'PNG', scale: 1, ignoreScale: true, date },
  );
}

function normalizeRow(row, defaults) {
  const safeRow = row && typeof row === 'object' ? row : {};
  const nodeId = typeof safeRow.nodeId === 'string' && safeRow.nodeId
    ? safeRow.nodeId
    : typeof safeRow.id === 'string'
      ? safeRow.id
      : '';
  const format = FORMAT_META[safeRow.format] ? safeRow.format : defaults.format;

  return {
    id: typeof safeRow.id === 'string' && safeRow.id ? safeRow.id : nodeId,
    nodeId,
    format,
    preset: normalizePreset(format, safeRow.preset),
    scale: normalizeScale(safeRow.scale !== undefined ? safeRow.scale : defaults.scale),
  };
}

function normalizeRows(rows, defaults) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => normalizeRow(row, defaults))
    .filter((row) => row.id && row.nodeId);
}

async function runTaskPool(tasks, limit) {
  const queue = tasks.slice();
  const workerCount = Math.max(1, Math.min(limit, queue.length || 1));
  const workers = [];

  async function worker() {
    while (queue.length) {
      const task = queue.shift();
      await task();
    }
  }

  for (let index = 0; index < workerCount; index += 1) {
    workers.push(worker());
  }

  await Promise.all(workers);
}

async function syncSelectionToUI() {
  const currentVersion = ++selectionVersion;
  const selectedNodes = getSelectedExportNodes();
  const summaries = selectedNodes.map(toNodeSummary);

  postToUI({
    type: 'selection-sync',
    nodes: summaries,
  });

  if (!selectedNodes.length) {
    return;
  }

  const previewTasks = selectedNodes.map((node) => async () => {
    try {
      const bytes = await node.exportAsync(buildPreviewSettings());
      if (currentVersion !== selectionVersion) {
        return;
      }
      postToUI({
        type: 'thumbnail',
        nodeId: node.id,
        bytes,
      });
    } catch (error) {
      if (currentVersion !== selectionVersion) {
        return;
      }
    }
  });

  await runTaskPool(previewTasks, 2);
}

async function handleEstimateRequest(message) {
  const requestId = Number(message.requestId) || 0;
  latestEstimateRequestId = requestId;

  const normalizedState = normalizeState({
    defaults: message.defaults || latestStoredState.defaults,
    settings: latestStoredState.settings,
    presetSettings: message.presetSettings || latestStoredState.presetSettings,
  });
  const rows = normalizeRows(message.rows, normalizedState.defaults);
  const presetSettingsState = normalizePresetSettings(message.presetSettings || normalizedState.presetSettings);
  const nodeMap = getSelectedNodeMap();
  const estimates = {};

  const tasks = rows.map((row) => async () => {
    if (requestId !== latestEstimateRequestId) {
      return;
    }

    const node = nodeMap.get(row.nodeId);
    if (!node) {
      estimates[row.id] = {
        bytes: null,
        baselineBytes: null,
      };
      return;
    }

    const presetSettings = getPresetSettings(presetSettingsState, row.format, row.preset);
    let bytes = null;
    let baselineBytes = null;

    if (isOriginalFilesPreset(row)) {
      try {
        const originalAsset = await extractOriginalFileAsset(node);
        if (requestId !== latestEstimateRequestId) {
          return;
        }
        if (originalAsset) {
          bytes = originalAsset.bytes.byteLength;
          baselineBytes = originalAsset.bytes.byteLength;
        }
      } catch (error) {
        bytes = null;
        baselineBytes = null;
      }
    }

    if (bytes === null) {
      try {
        const currentBytes = await node.exportAsync(buildEstimateSettings(row, presetSettings));
        if (requestId !== latestEstimateRequestId) {
          return;
        }
        const safeCurrentBytes = assertExportBytes(currentBytes);
        if (row.format === 'WEBP' || row.format === 'PNG' || row.format === 'JPG') {
          bytes = await requestRasterEstimateBytes(
            safeCurrentBytes,
            row.format,
            getSourceMimeType(row),
            presetSettings,
          );
          if (requestId !== latestEstimateRequestId) {
            return;
          }
        } else if (row.format === 'SVG') {
          baselineBytes = safeCurrentBytes.byteLength;
          // Pass the same filename the export uses so SVGO (e.g. prefixIds) is
          // configured identically and the estimate matches the delivered file.
          const svgFileName = buildFileName(
            toNodeSummary(node),
            row.format,
            row.scale,
            normalizedState.settings,
          );
          bytes = optimiseSvgBytes(safeCurrentBytes, presetSettings, svgFileName).byteLength;
        } else {
          bytes = safeCurrentBytes.byteLength;
        }
      } catch (error) {
        bytes = null;
      }
    }

    try {
      if (baselineBytes === null && bytes !== null && (isVectorFormat(row.format) || row.scale === 1)) {
        baselineBytes = bytes;
      } else if (baselineBytes === null) {
        const baselineBuffer = await node.exportAsync(
          buildEstimateSettings(
            {
              ...row,
              scale: isVectorFormat(row.format) ? row.scale : 1,
            },
            presetSettings,
          ),
        );
        if (requestId !== latestEstimateRequestId) {
          return;
        }
        const safeBaselineBytes = assertExportBytes(baselineBuffer);
        baselineBytes = row.format === 'WEBP'
          ? await requestRasterEstimateBytes(
            safeBaselineBytes,
            row.format,
            getSourceMimeType(row),
            presetSettings,
          )
          : safeBaselineBytes.byteLength;
        if (requestId !== latestEstimateRequestId) {
          return;
        }
      }
    } catch (error) {
      baselineBytes = null;
    }

    estimates[row.id] = {
      bytes,
      baselineBytes,
    };
  });

  await runTaskPool(tasks, 2);

  if (requestId !== latestEstimateRequestId) {
    return;
  }

  postToUI({
    type: 'estimates-result',
    requestId,
    estimates,
  });
}

function toErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error.message === 'string') {
    return error.message;
  }
  return 'Unknown error';
}

function createExportSession() {
  exportSessionSeed += 1;
  return {
    id: `export-${Date.now()}-${exportSessionSeed}`,
    deliverySeed: 0,
    pendingAcks: new Map(),
    cancelled: false,
  };
}

function cancelExportSession(message) {
  if (!activeExportSession) {
    return;
  }
  if (message.sessionId && message.sessionId !== activeExportSession.id) {
    return;
  }
  activeExportSession.cancelled = true;
  // Wake any in-flight ack waits so the export winds down promptly instead of
  // blocking until the per-file timeout.
  const entries = Array.from(activeExportSession.pendingAcks.values());
  activeExportSession.pendingAcks.clear();
  entries.forEach((entry) => entry.settle({ ok: false, detail: 'Export cancelled.' }));
}

function clearActiveExportSession(session) {
  if (activeExportSession && activeExportSession.id === session.id) {
    activeExportSession = null;
  }
}

function handleExportFileAck(message) {
  if (!activeExportSession) {
    return;
  }

  if (message.sessionId !== activeExportSession.id) {
    return;
  }

  if (!message.deliveryId) {
    return;
  }

  const entry = activeExportSession.pendingAcks.get(message.deliveryId);
  if (!entry) {
    return;
  }

  entry.settle({
    ok: Boolean(message.ok),
    detail: typeof message.detail === 'string' ? message.detail : '',
    bytesLength: typeof message.bytesLength === 'number' ? message.bytesLength : undefined,
  });
}

function handleExportFileProcessing(message) {
  // The UI signals when it actually starts processing a queued file; restart the
  // ack timeout from that point so files waiting behind slow encodes (under high
  // concurrency) don't time out against a clock that began at dispatch.
  if (!activeExportSession || message.sessionId !== activeExportSession.id) {
    return;
  }
  const entry = activeExportSession.pendingAcks.get(message.deliveryId);
  if (entry) {
    entry.refresh();
  }
}

function handleRasterEstimateResult(message) {
  if (!message.requestId) {
    return;
  }

  const resolve = pendingRasterEstimateRequests.get(message.requestId);
  if (!resolve) {
    return;
  }

  resolve({
    ok: Boolean(message.ok),
    detail: typeof message.detail === 'string' ? message.detail : '',
    bytesLength: typeof message.bytesLength === 'number' ? message.bytesLength : undefined,
  });
}

function createRasterEstimateId() {
  rasterEstimateRequestSeed += 1;
  return `estimate-${Date.now()}-${rasterEstimateRequestSeed}`;
}

function createDeliveryId(session) {
  session.deliverySeed += 1;
  return `${session.id}-file-${session.deliverySeed}`;
}

async function waitForFileAck(session, deliveryId, timeoutMs) {
  if (session.pendingAcks.has(deliveryId)) {
    throw new Error('Previous export confirmation is still pending for this file.');
  }

  const timeout = Number.isFinite(timeoutMs) ? timeoutMs : 4000;

  return new Promise((resolve) => {
    let timer = null;
    const settle = (result) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      session.pendingAcks.delete(deliveryId);
      resolve(result);
    };
    const refresh = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        session.pendingAcks.delete(deliveryId);
        resolve({
          ok: false,
          detail: 'UI did not confirm that the download was queued in time.',
        });
      }, timeout);
    };
    refresh();
    session.pendingAcks.set(deliveryId, { settle, refresh });
  });
}

async function requestRasterEstimateBytes(bytes, format, sourceMimeType, presetSettings, timeoutMs = 12000) {
  const requestId = createRasterEstimateId();
  const sourceBytes = assertExportBytes(bytes);
  const timeout = Number.isFinite(timeoutMs) ? timeoutMs : 12000;

  const result = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingRasterEstimateRequests.delete(requestId);
      resolve({
        ok: false,
        detail: 'UI did not return a raster estimate in time.',
      });
    }, timeout);

    pendingRasterEstimateRequests.set(requestId, (response) => {
      clearTimeout(timer);
      pendingRasterEstimateRequests.delete(requestId);
      resolve(response);
    });

    postToUI({
      type: 'estimate-raster',
      requestId,
      format,
      sourceMimeType: sourceMimeType || 'image/png',
      presetSettings,
      bytes: sourceBytes,
    });
  });

  if (!result.ok) {
    throw new Error(result.detail || 'Raster estimate failed.');
  }

  if (typeof result.bytesLength !== 'number') {
    throw new Error('Raster estimate did not return a byte length.');
  }

  return result.bytesLength;
}

function normalizeExportBytes(bytes) {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }

  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }

  if (Array.isArray(bytes)) {
    return Uint8Array.from(bytes);
  }

  return new Uint8Array();
}

function assertExportBytes(bytes) {
  const normalized = normalizeExportBytes(bytes);

  if (!normalized.byteLength) {
    throw new Error('Figma returned an empty file.');
  }

  return normalized;
}

function decodeUtf8Bytes(bytes) {
  const safeBytes = assertExportBytes(bytes);
  let result = '';

  for (let index = 0; index < safeBytes.length; index += 1) {
    const byte1 = safeBytes[index];

    if (byte1 <= 0x7f) {
      result += String.fromCharCode(byte1);
      continue;
    }

    if (byte1 >= 0xc2 && byte1 <= 0xdf && index + 1 < safeBytes.length) {
      const byte2 = safeBytes[index + 1];
      if ((byte2 & 0xc0) === 0x80) {
        result += String.fromCharCode(
          ((byte1 & 0x1f) << 6) | (byte2 & 0x3f),
        );
        index += 1;
        continue;
      }
    }

    if (byte1 >= 0xe0 && byte1 <= 0xef && index + 2 < safeBytes.length) {
      const byte2 = safeBytes[index + 1];
      const byte3 = safeBytes[index + 2];
      if ((byte2 & 0xc0) === 0x80 && (byte3 & 0xc0) === 0x80) {
        result += String.fromCharCode(
          ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f),
        );
        index += 2;
        continue;
      }
    }

    if (byte1 >= 0xf0 && byte1 <= 0xf4 && index + 3 < safeBytes.length) {
      const byte2 = safeBytes[index + 1];
      const byte3 = safeBytes[index + 2];
      const byte4 = safeBytes[index + 3];
      if (
        (byte2 & 0xc0) === 0x80
        && (byte3 & 0xc0) === 0x80
        && (byte4 & 0xc0) === 0x80
      ) {
        const codePoint = ((byte1 & 0x07) << 18)
          | ((byte2 & 0x3f) << 12)
          | ((byte3 & 0x3f) << 6)
          | (byte4 & 0x3f);
        const safeCodePoint = codePoint - 0x10000;
        result += String.fromCharCode(
          0xd800 + (safeCodePoint >> 10),
          0xdc00 + (safeCodePoint & 0x3ff),
        );
        index += 3;
        continue;
      }
    }

    result += '\uFFFD';
  }

  return result;
}

function encodeUtf8String(value) {
  const input = String(value || '');
  const bytes = [];

  for (let index = 0; index < input.length; index += 1) {
    const codePoint = input.codePointAt(index);

    if (!Number.isFinite(codePoint)) {
      continue;
    }

    if (codePoint > 0xffff) {
      index += 1;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint <= 0x7ff) {
      bytes.push(
        0xc0 | (codePoint >> 6),
        0x80 | (codePoint & 0x3f),
      );
      continue;
    }

    // A lone/unpaired surrogate is not valid UTF-8; emit U+FFFD instead.
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      bytes.push(0xef, 0xbf, 0xbd);
      continue;
    }

    if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
      continue;
    }

    bytes.push(
      0xf0 | (codePoint >> 18),
      0x80 | ((codePoint >> 12) & 0x3f),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    );
  }

  return Uint8Array.from(bytes);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getSourceMimeType(row) {
  if (row.format === 'PNG' || row.format === 'JPG' || row.format === 'WEBP') {
    return 'image/png';
  }
  return FORMAT_META[row.format].mimeType;
}

async function handleExport(message) {
  if (activeExportSession) {
    figma.notify('Export is already running', { error: true });
    return;
  }

  const normalized = normalizeState({
    defaults: message.defaults,
    settings: message.settings,
    presetSettings: message.presetSettings,
    profiles: message.profiles,
  });

  latestStoredState = normalized;
  try {
    await figma.clientStorage.setAsync(STORAGE_KEY, normalized);
  } catch {
    // clientStorage unavailable (e.g. no plugin ID in dev mode)
  }

  const rows = normalizeRows(message.rows, normalized.defaults);
  if (!rows.length) {
    figma.notify('No rows to export', { error: true });
    postToUI({
      type: 'export-complete',
      exported: 0,
      completed: 0,
      total: 0,
      errors: ['No export rows were provided.'],
    });
    return;
  }

  const presetSettingsState = normalizePresetSettings(message.presetSettings || normalized.presetSettings);
  const nodeMap = getSelectedNodeMap();
  const total = rows.length;
  const errors = [];
  let completed = 0;
  let exported = 0;
  const session = createExportSession();
  const concurrency = normalized.settings.exportConcurrency;
  // One timestamp for the whole batch so {date}/{time} tokens stay consistent across files.
  const exportDate = new Date();

  activeExportSession = session;

  postToUI({
    type: 'export-start',
    sessionId: session.id,
    total,
  });

  const tasks = rows.map((row) => async () => {
    // Stop pulling new work once the user has cancelled.
    if (session.cancelled) {
      return;
    }

    const node = nodeMap.get(row.nodeId);
    const missingFileName = `${sanitizeFileSegment(row.id)}.${FORMAT_META[row.format].extension}`;

    if (!node) {
      completed += 1;
      errors.push(`${missingFileName}: Layer is no longer selected.`);
      postToUI({
        type: 'export-row-status',
        sessionId: session.id,
        rowId: row.id,
        status: 'error',
        detail: 'Layer is no longer selected.',
      });
      postToUI({
        type: 'export-progress',
        sessionId: session.id,
        rowId: row.id,
        completed,
        total,
        fileName: missingFileName,
      });
      return;
    }

    const summary = toNodeSummary(node);
    const presetSettings = getPresetSettings(presetSettingsState, row.format, row.preset);
    let originalAsset = null;

    if (isOriginalFilesPreset(row)) {
      try {
        originalAsset = await extractOriginalFileAsset(node);
      } catch (error) {
        originalAsset = null;
      }
    }

    const fileName = originalAsset
      ? buildOriginalFileName(summary, originalAsset.extension, normalized.settings, exportDate)
      : buildFileName(summary, row.format, row.scale, normalized.settings, exportDate);

    postToUI({
      type: 'export-row-status',
      sessionId: session.id,
      rowId: row.id,
      status: 'processing',
      fileName,
    });

    try {
      const rawBytes = originalAsset
        ? originalAsset.bytes
        : await node.exportAsync(buildExportSourceSettings(row, presetSettings));
      const exportedBytes = assertExportBytes(rawBytes);
      const baselineBytes = originalAsset
        ? exportedBytes.byteLength
        : row.format === 'SVG'
          ? exportedBytes.byteLength
          : undefined;
      const bytes = originalAsset
        ? exportedBytes
        : row.format === 'SVG'
          ? optimiseSvgBytes(exportedBytes, presetSettings, fileName)
          : exportedBytes;
      const deliveryId = createDeliveryId(session);

      postToUI({
        type: 'export-file',
        sessionId: session.id,
        deliveryId,
        rowId: row.id,
        format: row.format,
        preset: row.preset,
        scale: row.scale,
        fileName,
        mimeType: originalAsset ? originalAsset.mimeType : FORMAT_META[row.format].mimeType,
        sourceMimeType: originalAsset ? originalAsset.mimeType : getSourceMimeType(row),
        skipProcessing: Boolean(originalAsset),
        bytes,
        baselineBytes,
      });

      const ack = await waitForFileAck(session, deliveryId, EXPORT_FILE_ACK_TIMEOUT_MS);
      if (session.cancelled) {
        // Cancelled while awaiting confirmation — wind down without counting or
        // reporting this file as an error.
        return;
      }
      if (!ack.ok) {
        throw new Error(ack.detail || 'The UI did not confirm the download.');
      }

      exported += 1;
      completed += 1;

      postToUI({
        type: 'export-row-status',
        sessionId: session.id,
        rowId: row.id,
        status: 'done',
        fileName,
        bytes: typeof ack.bytesLength === 'number' ? ack.bytesLength : bytes.byteLength,
      });

      postToUI({
        type: 'export-progress',
        sessionId: session.id,
        rowId: row.id,
        completed,
        total,
        fileName,
      });
    } catch (error) {
      if (session.cancelled) {
        // Errors caused by tearing down a cancelled export aren't real failures.
        return;
      }
      const detail = toErrorMessage(error);
      completed += 1;
      errors.push(`${fileName}: ${detail}`);

      postToUI({
        type: 'export-row-status',
        sessionId: session.id,
        rowId: row.id,
        status: 'error',
        fileName,
        detail,
      });

      postToUI({
        type: 'export-progress',
        sessionId: session.id,
        rowId: row.id,
        completed,
        total,
        fileName,
      });
    }

    await delay(0);
  });

  try {
    await runTaskPool(tasks, concurrency);

    const cancelled = session.cancelled;

    postToUI({
      type: 'export-complete',
      sessionId: session.id,
      exported,
      completed,
      total,
      errors,
      cancelled,
    });

    if (cancelled) {
      figma.notify(`Export stopped after ${exported} of ${total} file(s)`);
    } else if (errors.length) {
      figma.notify(`Export finished with ${errors.length} error(s)`, { error: true });
    } else {
      figma.notify(`${exported} file(s) exported`);
    }

    if (!cancelled && normalized.settings.closeAfterExport) {
      setTimeout(() => {
        figma.closePlugin(errors.length ? 'Export finished with errors' : 'Export complete');
      }, 500);
    }
  } finally {
    clearActiveExportSession(session);
  }
}
