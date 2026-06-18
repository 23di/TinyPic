import LibImageQuant from '@fe-daily/libimagequant-wasm';
import * as wasmModuleNamespace from '@fe-daily/libimagequant-wasm/wasm/libimagequant_wasm.js';
import initOxipng, { optimise as optimisePngSync } from '@jsquash/oxipng/codec/pkg/squoosh_oxipng.js';
import { encode as encodeWebp } from '@jsquash/webp';

let pngQuantizer = null;
let oxipngInitPromise = null;
const WEBP_FIXED_ENCODER_OPTIONS = Object.freeze({
  method: 4,
  alpha_quality: 100,
  alpha_compression: 1,
});

function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array();
}

function toErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
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
    // Reset the cache on failure so a transient init error can be retried.
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
      // Drop the cached quantizer so a failed WASM init can be rebuilt on the
      // next request instead of throwing the same rejection for the session.
      pngQuantizer = null;
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

async function loadRasterSource(bytes, mimeType) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Worker raster decode is unavailable.');
  }

  const blob = new Blob([bytes], { type: mimeType || 'image/png' });
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

function createRasterCanvas(source, fillBackground) {
  if (typeof OffscreenCanvas !== 'function') {
    throw new Error('Worker canvas is unavailable.');
  }

  const canvas = new OffscreenCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context is not available.');
  }

  if (fillBackground) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(source.image, 0, 0);
  return { canvas, ctx };
}

async function canvasToBytes(canvas, mimeType, quality) {
  if (typeof canvas.convertToBlob !== 'function') {
    throw new Error('Worker canvas export is unavailable.');
  }

  const blob = await canvas.convertToBlob({ type: mimeType, quality });
  return new Uint8Array(await blob.arrayBuffer());
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
    const encodeCanvasToPngBytes = () => canvasToBytes(canvas, 'image/png');

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

async function prepareJpgPayload(sourceBytes, sourceMimeType, presetSettings) {
  const source = await loadRasterSource(sourceBytes, sourceMimeType || 'image/png');
  try {
    const { canvas } = createRasterCanvas(source, true);
    return {
      bytes: await canvasToBytes(canvas, 'image/jpeg', (presetSettings.quality || 84) / 100),
      mimeType: 'image/jpeg',
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
    return {
      bytes: new Uint8Array(await encodeWebp(imageData, buildWebpEncodeOptions(presetSettings))),
      mimeType: 'image/webp',
    };
  } finally {
    source.dispose();
  }
}

async function processRasterRequest(message) {
  const sourceBytes = toUint8Array(message.bytes);
  if (!sourceBytes.byteLength) {
    throw new Error('Worker received an empty file payload.');
  }

  if (message.format === 'PNG') {
    return preparePngPayload(
      sourceBytes,
      message.sourceMimeType || 'image/png',
      message.presetSettings || {},
    );
  }

  if (message.format === 'JPG') {
    return prepareJpgPayload(
      sourceBytes,
      message.sourceMimeType || 'image/png',
      message.presetSettings || {},
    );
  }

  if (message.format === 'WEBP') {
    return prepareWebpPayload(
      sourceBytes,
      message.sourceMimeType || 'image/png',
      message.presetSettings || {},
    );
  }

  throw new Error(`Unsupported raster format: ${message.format || 'unknown'}.`);
}

self.onmessage = async (event) => {
  const message = event.data;
  if (!message || message.type !== 'process-raster') {
    return;
  }

  try {
    const result = await processRasterRequest(message);
    self.postMessage(
      {
        type: 'process-raster-result',
        requestId: message.requestId,
        ok: true,
        mimeType: result.mimeType,
        bytes: result.bytes.buffer,
      },
      [result.bytes.buffer],
    );
  } catch (error) {
    self.postMessage({
      type: 'process-raster-result',
      requestId: message.requestId,
      ok: false,
      error: toErrorMessage(error),
    });
  }
};
