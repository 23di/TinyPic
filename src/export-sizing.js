export const SIZING_MODES = ['scale', 'size', 'width', 'height'];

export const DEFAULT_QUICK_PRESETS = {
  scale: [0.5, 1, 1.5, 2, 4],
  size: [100, 200, 500, 1000],
  width: [320, 640, 1280, 1920],
  height: [240, 480, 720, 1080],
};

export function isValidQuickPreset(mode, value) {
  const max = mode === 'scale' ? 16 : mode === 'size' ? 102400 : 32768;
  return Number.isFinite(value) && value >= (mode === 'scale' ? 0.01 : 1)
    && value <= max && (mode === 'scale' || Number.isInteger(value));
}

export function normalizeQuickPresets(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(SIZING_MODES.map((mode) => [mode,
    Array.isArray(source[mode])
      ? [...new Set(source[mode].map(Number).filter((number) => isValidQuickPreset(mode, number)))].slice(0, 5)
      : [...DEFAULT_QUICK_PRESETS[mode]],
  ]));
}

export function positiveNumber(value, fallback, min, max, integer = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  const clamped = Math.max(min, Math.min(max, parsed));
  return integer ? Math.round(clamped) : clamped;
}

export function normalizeSizing(value = {}) {
  return {
    exportMode: SIZING_MODES.includes(value.exportMode) ? value.exportMode : 'scale',
    scale: positiveNumber(value.scale, 1, 0.01, 16),
    maxKB: positiveNumber(value.maxKB, 200, 1, 102400, true),
    maxWidth: positiveNumber(value.maxWidth, 1920, 1, 32768, true),
    maxHeight: positiveNumber(value.maxHeight, 1080, 1, 32768, true),
  };
}

export function resolveSizingScale(value, width, height) {
  const sizing = normalizeSizing(value);
  if (sizing.exportMode === 'width') return Math.min(1, sizing.maxWidth / Math.max(1, width));
  if (sizing.exportMode === 'height') return Math.min(1, sizing.maxHeight / Math.max(1, height));
  return sizing.exportMode === 'size' ? 1 : sizing.scale;
}
