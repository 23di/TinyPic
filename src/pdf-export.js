import { PDFDocument, PageSizes } from 'pdf-lib';
import { needsPdfLayout } from './format-options.js';

export async function preparePdfBytes(bytes, settings) {
  if (!needsPdfLayout(settings)) return bytes;
  const source = await PDFDocument.load(bytes);
  const output = await PDFDocument.create();
  const margin = Number(settings.marginMM || 0) * 72 / 25.4;
  for (const sourcePage of source.getPages()) {
    const crop = sourcePage.getCropBox();
    let [width, height] = { a4: PageSizes.A4, letter: PageSizes.Letter, a3: PageSizes.A3 }[settings.pageSize]
      || [crop.width + margin * 2, crop.height + margin * 2];
    const landscape = settings.orientation === 'landscape'
      || (settings.orientation === 'auto' && crop.width > crop.height);
    if (settings.pageSize !== 'original' && landscape) [width, height] = [height, width];
    const page = output.addPage([width, height]);
    if (sourcePage.node.Contents()) {
      const embedded = await output.embedPage(sourcePage, {
        left: crop.x, bottom: crop.y, right: crop.x + crop.width, top: crop.y + crop.height,
      });
      const scale = Math.min((width - margin * 2) / embedded.width, (height - margin * 2) / embedded.height);
      const drawWidth = embedded.width * scale;
      const drawHeight = embedded.height * scale;
      page.drawPage(embedded, { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight });
    }
  }
  return new Uint8Array(await output.save());
}
