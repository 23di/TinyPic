export const JPG_BACKGROUNDS = ['#ffffff', '#000000', '#f5f5f5', '#262626'];
export const PDF_PAGE_SIZES = ['original', 'a4', 'letter', 'a3'];
export const PDF_ORIENTATIONS = ['auto', 'portrait', 'landscape'];
export const PDF_MARGINS = [0, 5, 10, 15, 20];

export function normalizeFormatOption(format, key, value, fallback) {
  if (format === 'JPG') {
    if (key === 'useAbsoluteBounds') return Boolean(value);
    if (key === 'background') return JPG_BACKGROUNDS.includes(value) ? value : '#ffffff';
  }
  if (format === 'PDF') {
    const options = { pageSize: PDF_PAGE_SIZES, orientation: PDF_ORIENTATIONS, marginMM: PDF_MARGINS }[key];
    if (options) {
      const parsed = key === 'marginMM' ? Number(value) : value;
      return options.includes(parsed) ? parsed : options.includes(fallback) ? fallback : options[0];
    }
  }
  return undefined;
}

export function needsJpgProcessing(settings) {
  return Boolean(settings.background && settings.background !== '#ffffff');
}

export function needsPdfLayout(settings) {
  return Boolean((settings.pageSize && settings.pageSize !== 'original') || Number(settings.marginMM) > 0);
}

export function drawJpgSource(canvas, ctx, source, settings) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = JPG_BACKGROUNDS.includes(settings.background) ? settings.background : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source.image, 0, 0);
}
