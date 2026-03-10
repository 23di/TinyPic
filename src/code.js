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
      },
    },
    {
      value: 'review-pdf',
      settings: {
        contentsOnly: true,
        useAbsoluteBounds: true,
      },
    },
    {
      value: 'print-pdf',
      settings: {
        contentsOnly: false,
        useAbsoluteBounds: true,
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

const VALID_TEMPLATE_VAR_KEYS = new Set(['name', 'page', 'scale', 'width', 'height', 'date', 'time']);

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
let activeExportSession = null;
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
      await handleEstimateRequest(message);
      break;
    case 'run-export':
      await handleExport(message);
      break;
    case 'resize-ui':
      resizePluginUi(message.width, message.height);
      break;
    case 'export-file-ack':
      handleExportFileAck(message);
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
      if (key === 'contentsOnly' || key === 'useAbsoluteBounds') {
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
            return toks.length > 1 ? toks : DEFAULT_NAME_TEMPLATE.map((t) => ({ ...t }));
          })(),
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

function buildEstimateSettings(row, presetSettings) {
  if (row.format === 'PNG') {
    return buildRasterSourceSettings(row.scale);
  }

  if (row.format === 'JPG') {
    return {
      format: 'JPG',
      constraint: { type: 'SCALE', value: row.scale },
    };
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
  if (row.format === 'PNG' || row.format === 'JPG') {
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

function sanitizeFileSegment(value) {
  return String(value || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Untitled';
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
      .slice(0, 120))
    .filter((segment) => segment.length > 0);
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
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return DEFAULT_NAME_TEMPLATE.map((t) => ({ ...t }));
  }
  const normalized = [];
  for (const token of tokens) {
    if (!token || typeof token !== 'object') {
      continue;
    }
    if (token.type === 'var' && VALID_TEMPLATE_VAR_KEYS.has(token.key)) {
      normalized.push({ type: 'var', key: token.key });
    } else if (token.type === 'text' && typeof token.value === 'string') {
      normalized.push({ type: 'text', value: token.value });
    }
  }
  return normalized.length > 0 ? normalized : DEFAULT_NAME_TEMPLATE.map((t) => ({ ...t }));
}

function evaluateNameTemplate(nodeSummary, format, scale, template, date) {
  const d = date instanceof Date ? date : new Date();
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
          if (!isVectorFormat(format)) {
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

function buildFileName(nodeSummary, format, scale, settings) {
  const template = Array.isArray(settings.nameTemplate)
    ? normalizeNameTemplate(settings.nameTemplate)
    : DEFAULT_NAME_TEMPLATE.map((t) => ({ ...t }));
  const preserveFolders = settings.preserveFolderStructure !== false;
  const path = normalizeExportPath(
    evaluateNameTemplate(nodeSummary, format, scale, template, new Date()),
    preserveFolders,
  );
  return `${path}.${FORMAT_META[format].extension}`;
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

    try {
      const currentBytes = await node.exportAsync(buildEstimateSettings(row, presetSettings));
      if (requestId !== latestEstimateRequestId) {
        return;
      }
      const safeCurrentBytes = assertExportBytes(currentBytes);
      if (row.format === 'SVG') {
        baselineBytes = safeCurrentBytes.byteLength;
        bytes = optimiseSvgBytes(safeCurrentBytes, presetSettings).byteLength;
      } else {
        bytes = safeCurrentBytes.byteLength;
      }
    } catch (error) {
      bytes = null;
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
        baselineBytes = assertExportBytes(baselineBuffer).byteLength;
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
  };
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

  const resolve = activeExportSession.pendingAcks.get(message.deliveryId);
  if (!resolve) {
    return;
  }

  resolve({
    ok: Boolean(message.ok),
    detail: typeof message.detail === 'string' ? message.detail : '',
    bytesLength: typeof message.bytesLength === 'number' ? message.bytesLength : undefined,
  });
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
    const timer = setTimeout(() => {
      session.pendingAcks.delete(deliveryId);
      resolve({
        ok: false,
        detail: 'UI did not confirm that the download was queued in time.',
      });
    }, timeout);

    session.pendingAcks.set(deliveryId, (result) => {
      clearTimeout(timer);
      session.pendingAcks.delete(deliveryId);
      resolve(result);
    });
  });
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
  if (row.format === 'PNG' || row.format === 'JPG') {
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

  activeExportSession = session;

  postToUI({
    type: 'export-start',
    sessionId: session.id,
    total,
  });

  const tasks = rows.map((row) => async () => {
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
    const fileName = buildFileName(summary, row.format, row.scale, normalized.settings);
    const presetSettings = getPresetSettings(presetSettingsState, row.format, row.preset);

    postToUI({
      type: 'export-row-status',
      sessionId: session.id,
      rowId: row.id,
      status: 'processing',
      fileName,
    });

    try {
      const rawBytes = await node.exportAsync(buildExportSourceSettings(row, presetSettings));
      const exportedBytes = assertExportBytes(rawBytes);
      const baselineBytes = row.format === 'SVG' ? exportedBytes.byteLength : undefined;
      const bytes = row.format === 'SVG'
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
        mimeType: FORMAT_META[row.format].mimeType,
        sourceMimeType: getSourceMimeType(row),
        bytes,
        baselineBytes,
      });

      const ack = await waitForFileAck(session, deliveryId, EXPORT_FILE_ACK_TIMEOUT_MS);
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

    postToUI({
      type: 'export-complete',
      sessionId: session.id,
      exported,
      completed,
      total,
      errors,
    });

    if (errors.length) {
      figma.notify(`Export finished with ${errors.length} error(s)`, { error: true });
    } else {
      figma.notify(`${exported} file(s) exported`);
    }

    if (normalized.settings.closeAfterExport) {
      setTimeout(() => {
        figma.closePlugin(errors.length ? 'Export finished with errors' : 'Export complete');
      }, 500);
    }
  } finally {
    clearActiveExportSession(session);
  }
}
