/** Renders a printable A4 worksheet (name/date line, instructions, numbered questions with answer lines) as a PDF. */
import PDFDocument from 'pdfkit';

export interface Worksheet {
  title: string;
  subtitle?: string;
  instructions?: string;
  sections: { heading: string; kind?: 'questions' | 'fill' | 'table' | 'draw' | 'checklist'; items: string[]; lines?: number }[];
}

/** The built-in PDF fonts only know Western characters; swap or drop anything else. */
const safe = (s: string) =>
  (s ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/[→⇒]/g, '->')
    .replace(/[×]/g, 'x')
    .replace(/[÷]/g, '/')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[^\x20-\x7E -ÿ–—‘’“”•…]/g, '')
    .trim();

export function worksheetPdf(w: Worksheet, color = '#5B3FD9'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 48, bottom: 56, left: 54, right: 54 }, info: { Title: safe(w.title), Creator: 'Nanoskool' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const ink = '#1F1D2B';
    const soft = '#6B6880';

    // Header band
    doc.save().roundedRect(left, 40, width, 74, 12).fill(color).restore();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(safe(w.title), left + 18, 56, { width: width - 36, ellipsis: true, height: 26 });
    if (w.subtitle) doc.font('Helvetica').fontSize(11).fillColor('#EDE9FF').text(safe(w.subtitle), left + 18, 84, { width: width - 36, height: 16, ellipsis: true });
    doc.y = 132;

    // Name / date
    doc.fillColor(ink).font('Helvetica').fontSize(11);
    const y = doc.y;
    doc.text('Name:', left, y);
    doc.moveTo(left + 40, y + 12).lineTo(left + width * 0.6, y + 12).strokeColor('#C9C5D8').lineWidth(0.8).stroke();
    doc.text('Date:', left + width * 0.65, y);
    doc.moveTo(left + width * 0.65 + 34, y + 12).lineTo(left + width, y + 12).stroke();
    doc.y = y + 30;

    if (w.instructions) {
      const top = doc.y;
      const h = doc.heightOfString(safe(w.instructions), { width: width - 28 }) + 18;
      doc.save().roundedRect(left, top, width, h, 8).fill('#F4F1FF').restore();
      doc.fillColor(ink).font('Helvetica-Oblique').fontSize(11).text(safe(w.instructions), left + 14, top + 9, { width: width - 28 });
      doc.y = top + h + 14;
    }

    let n = 0;
    const ensure = (space: number) => {
      if (doc.y + space > doc.page.height - doc.page.margins.bottom) doc.addPage();
    };
    for (const s of w.sections) {
      // Keep a heading with the start of its content
      ensure(s.kind === 'draw' ? 210 : s.kind === 'table' ? 24 * ((s.lines ?? 4) + 2) + 40 : 80);
      doc.fillColor(color).font('Helvetica-Bold').fontSize(13.5).text(safe(s.heading), left, doc.y);
      doc.moveDown(0.35);
      const kind = s.kind ?? 'questions';
      if (kind === 'table') {
        const cols = (s.items[0] ?? 'Item|Result').split('|').map(safe);
        const rows = Math.max(3, s.lines ?? 4);
        const cw = width / cols.length;
        ensure(24 * (rows + 1) + 10);
        let ty = doc.y + 4;
        doc.save().rect(left, ty, width, 24).fill('#EEEAFB').restore();
        cols.forEach((c, i) => doc.fillColor(ink).font('Helvetica-Bold').fontSize(10.5).text(c, left + i * cw + 8, ty + 7, { width: cw - 16, height: 14, ellipsis: true }));
        for (let r = 0; r <= rows; r++) doc.moveTo(left, ty + 24 * (r + 1)).lineTo(left + width, ty + 24 * (r + 1)).strokeColor('#D6D2E4').stroke();
        for (let i = 0; i <= cols.length; i++) doc.moveTo(left + i * cw, ty).lineTo(left + i * cw, ty + 24 * (rows + 1)).stroke();
        doc.rect(left, ty, width, 24 * (rows + 1)).stroke();
        ty += 24 * (rows + 1) + 16;
        doc.y = ty;
        continue;
      }
      if (kind === 'draw') {
        for (const it of s.items) {
          ensure(190);
          n++;
          doc.fillColor(ink).font('Helvetica').fontSize(11.5).text(`${n}. ${safe(it)}`, left, doc.y, { width });
          const by = doc.y + 6;
          doc.roundedRect(left, by, width, 150, 8).dash(4, { space: 3 }).strokeColor('#BDB8D0').stroke().undash();
          doc.y = by + 164;
        }
        continue;
      }
      for (const it of s.items) {
        const lines = kind === 'checklist' ? 0 : kind === 'fill' ? 0 : Math.max(1, s.lines ?? 2);
        ensure(22 + lines * 22);
        if (kind === 'checklist') {
          const cy = doc.y;
          doc.roundedRect(left, cy + 1, 11, 11, 2).strokeColor('#8C86A6').lineWidth(1).stroke();
          doc.fillColor(ink).font('Helvetica').fontSize(11.5).text(safe(it), left + 20, cy, { width: width - 20 });
          doc.moveDown(0.45);
          continue;
        }
        n++;
        doc.fillColor(ink).font('Helvetica').fontSize(11.5).text(`${n}. ${safe(it).replace(/_{2,}/g, '________________')}`, left, doc.y, { width });
        let ly = doc.y + 4;
        for (let l = 0; l < lines; l++) {
          ly += 22;
          doc.moveTo(left + 16, ly).lineTo(left + width, ly).strokeColor('#D6D2E4').lineWidth(0.8).stroke();
        }
        doc.y = ly + 12;
      }
      doc.moveDown(0.4);
    }

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc.fillColor(soft).font('Helvetica').fontSize(9).text(`Nanoskool · ${safe(w.title)} · page ${i + 1} of ${range.count}`, left, doc.page.height - 40, { width, align: 'center', lineBreak: false });
    }
    doc.end();
  });
}
