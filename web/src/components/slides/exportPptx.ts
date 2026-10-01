/** Download a deck as a PowerPoint file (.pptx). Loaded on demand so it does not slow the app. */
import type { Slide } from '@/api/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { themeById } from './SlideView';
import { graphicFor } from './graphics';

/** A built-in graphic as a PNG: the icon on a round gradient, like on screen. */
async function graphicPng(key: string | undefined, a: string, b: string, round = true): Promise<string | null> {
  const g = graphicFor(key);
  if (!g) return null;
  const paths = [...renderToStaticMarkup(createElement(g.Icon)).matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!paths.length) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>${round ? '<circle cx="100" cy="100" r="96" fill="url(#g)"/>' : '<rect x="4" y="4" width="192" height="192" rx="56" fill="url(#g)"/>'}<g transform="translate(52 52) scale(4)" fill="#fff">${paths.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 400;
      c.getContext('2d')!.drawImage(img, 0, 0, 400, 400);
      res(c.toDataURL('image/png'));
    };
    img.onerror = () => res(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
const plainText = (x?: string) => (x ?? '').replace(/\*\*(.+?)\*\*/g, '$1');

const hex = (c: string) => {
  const m = c.match(/#([0-9a-f]{6})/i);
  return m ? m[1].toUpperCase() : 'FFFFFF';
};

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

export async function exportPptx(title: string, slides: Slide[], themeId?: string) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const t = themeById(themeId);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.title = title;
  const W = 13.33;
  const bg = hex(t.bg);
  const ink = hex(t.ink);
  const muted = hex(t.muted);
  const accent = hex(t.accent);
  const accent2 = hex(t.accent2);
  const font = t.font.includes('Nunito') ? 'Nunito' : 'Inter';
  const bulletOpts = (size: number) => ({ fontFace: font, fontSize: size, color: ink, bullet: { code: '25CF' }, paraSpaceAfter: 10, valign: 'top' as const });

  for (const s of slides) {
    const sl = pptx.addSlide();
    sl.background = { color: s.background ? hex(s.background) : bg };
    if (s.notes && s.layout !== 'quiz') sl.addNotes(s.notes);
    const bullets = (items: string[] | undefined, x: number, y: number, w: number, h: number, size = 22) => {
      const list = (items ?? []).filter((b) => b.trim());
      if (list.length)
        sl.addText(
          list.map((b) => ({ text: plainText(b), options: bulletOpts(size) })),
          { x, y, w, h, valign: 'top' },
        );
    };
    const img = s.imageUrl ? await toDataUrl(s.imageUrl) : null;
    const art = !img && s.icon ? await graphicPng(s.icon, `#${accent}`, `#${accent2}`) : null;
    const pts = (s.bullets ?? []).filter((b) => b.trim());
    switch (s.layout) {
      case 'title':
        sl.addShape('rect', { x: 0.9, y: 2.3, w: 1.2, h: 0.12, fill: { color: accent } });
        sl.addText(s.title ?? '', { x: 0.9, y: 2.5, w: W - 2, h: 1.6, fontFace: font, fontSize: 48, bold: true, color: ink, valign: 'top' });
        if (s.subtitle) sl.addText(s.subtitle, { x: 0.9, y: 4.2, w: art || img ? 7 : W - 3, h: 0.9, fontFace: font, fontSize: 22, color: muted });
        if (art || img) sl.addImage({ data: (img ?? art)!, x: 8.6, y: 1.6, w: 4.2, h: 4.2, sizing: { type: 'contain', w: 4.2, h: 4.2 } });
        else sl.addShape('ellipse', { x: W - 4, y: 4.6, w: 4.5, h: 4.5, fill: { color: accent2, transparency: 78 } });
        break;
      case 'icons':
      case 'steps': {
        sl.addText(plainText(s.title), { x: 0.8, y: 0.5, w: W - 1.6, h: 1.1, fontFace: font, fontSize: 32, bold: true, color: ink });
        const n = Math.max(1, pts.length);
        const colW = (W - 1.6) / n;
        for (let k = 0; k < pts.length; k++) {
          const x = 0.8 + k * colW;
          const ic = await graphicPng(s.icons?.[k] ?? 'idea', `#${k % 2 ? accent2 : accent}`, `#${k % 2 ? accent : accent2}`, s.layout === 'steps');
          if (ic) sl.addImage({ data: ic, x: x + colW / 2 - 0.7, y: 2.2, w: 1.4, h: 1.4 });
          if (s.layout === 'steps') sl.addText(String(k + 1), { x: x + colW / 2 + 0.35, y: 2.0, w: 0.5, h: 0.5, fontFace: font, fontSize: 14, bold: true, color: 'FFFFFF', fill: { color: ink }, align: 'center', shape: pptx.ShapeType.ellipse });
          if (s.layout === 'steps' && k < pts.length - 1) sl.addShape('line', { x: x + colW / 2 + 0.85, y: 2.9, w: colW - 1.7, h: 0, line: { color: muted, width: 1.5, dashType: 'dash' } });
          sl.addText(plainText(pts[k]), { x: x + 0.1, y: 3.9, w: colW - 0.2, h: 2.4, fontFace: font, fontSize: n >= 5 ? 15 : 18, bold: true, color: ink, align: 'center', valign: 'top' });
        }
        break;
      }
      case 'fact':
        sl.addText('DID YOU KNOW?', { x: 0.9, y: 1.6, w: 7, h: 0.5, fontFace: font, fontSize: 14, bold: true, color: accent, charSpacing: 3 });
        sl.addText(plainText(s.title), { x: 0.9, y: 2.1, w: art || img ? 7.4 : W - 1.8, h: 1.8, fontFace: font, fontSize: 60, bold: true, color: accent });
        if (s.subtitle) sl.addText(s.subtitle, { x: 0.9, y: 4.0, w: art || img ? 7.4 : W - 1.8, h: 1.6, fontFace: font, fontSize: 22, color: ink, valign: 'top' });
        if (art || img) sl.addImage({ data: (img ?? art)!, x: 8.9, y: 1.8, w: 3.8, h: 3.8, sizing: { type: 'contain', w: 3.8, h: 3.8 } });
        break;
      case 'quiz':
        sl.addText('? Quick quiz', { x: 0.8, y: 0.5, w: 2.4, h: 0.5, fontFace: font, fontSize: 14, bold: true, color: 'FFFFFF', fill: { color: accent }, align: 'center' });
        sl.addText(plainText(s.title), { x: 0.8, y: 1.2, w: W - 1.6, h: 1.4, fontFace: font, fontSize: 30, bold: true, color: ink, valign: 'top' });
        pts.forEach((o, k) => {
          const x = 0.8 + (k % 2) * 6.05;
          const y = 3.0 + Math.floor(k / 2) * 1.6;
          sl.addText(`${'ABCD'[k]}.  ${plainText(o)}`, { x, y, w: 5.75, h: 1.25, fontFace: font, fontSize: 20, bold: true, color: ink, fill: { color: 'F3F4F8' }, margin: 12 });
        });
        sl.addNotes(`${s.notes ? `${s.notes}\n\n` : ''}Answer: ${'ABCD'[s.answer ?? 0]}. ${plainText(pts[s.answer ?? 0])}`);
        break;
      case 'section':
        sl.addText(s.title ?? '', { x: 0.8, y: 2.6, w: W - 1.6, h: 1.4, fontFace: font, fontSize: 44, bold: true, color: ink, align: 'center' });
        if (s.subtitle) sl.addText(s.subtitle, { x: 0.8, y: 4, w: W - 1.6, h: 0.8, fontFace: font, fontSize: 22, color: muted, align: 'center' });
        if (art) sl.addImage({ data: art, x: W / 2 - 0.9, y: 0.6, w: 1.8, h: 1.8 });
        break;
      case 'quote':
        sl.addText('“', { x: 1, y: 1, w: 1.5, h: 1.5, fontFace: 'Georgia', fontSize: 110, color: accent });
        sl.addText(s.title ?? '', { x: 1.2, y: 2.3, w: W - 2.4, h: 2.4, fontFace: font, fontSize: 34, bold: true, color: ink, valign: 'top' });
        if (s.subtitle) sl.addText(s.subtitle, { x: 1.2, y: 4.9, w: W - 2.4, h: 0.6, fontFace: font, fontSize: 20, bold: true, color: accent });
        break;
      case 'image-full':
        if (img) sl.addImage({ data: img, x: 0, y: 0, w: W, h: 7.5, sizing: { type: 'cover', w: W, h: 7.5 } });
        if (s.title) sl.addText(s.title, { x: 0.6, y: 5.9, w: W - 1.2, h: 0.8, fontFace: font, fontSize: 30, bold: true, color: 'FFFFFF', fill: { color: '000000', transparency: 45 } });
        break;
      case 'image-right':
        sl.addText(s.title ?? '', { x: 0.8, y: 0.6, w: 6.6, h: 1.1, fontFace: font, fontSize: 32, bold: true, color: ink });
        bullets(s.bullets, 0.8, 1.9, 6.6, 5, 20);
        if (img || art) sl.addImage({ data: (img ?? art)!, x: 7.8, y: 1.2, w: 4.8, h: 5.2, sizing: { type: 'contain', w: 4.8, h: 5.2 } });
        else sl.addText(s.imageAlt ? `Picture: ${s.imageAlt}` : '', { x: 7.8, y: 1.2, w: 4.8, h: 5.2, fontFace: font, fontSize: 16, color: muted, align: 'center', line: { color: muted, dashType: 'dash', width: 1 } });
        break;
      case 'two-column':
        sl.addText(s.title ?? '', { x: 0.8, y: 0.6, w: W - 1.6, h: 1.1, fontFace: font, fontSize: 32, bold: true, color: ink });
        [s.bullets, s.bullets2].forEach((col, k) => {
          const x = 0.8 + k * 6.05;
          sl.addShape('rect', { x, y: 1.9, w: 5.75, h: 0.1, fill: { color: k ? accent2 : accent } });
          bullets(col, x + 0.2, 2.2, 5.4, 4.6, 20);
        });
        break;
      default:
        sl.addText(s.title ?? '', { x: 0.9, y: 0.6, w: W - 1.8, h: 1.1, fontFace: font, fontSize: 34, bold: true, color: ink });
        bullets(s.bullets, 0.9, 1.9, W - 1.8, 5.2, 24);
    }
  }
  await pptx.writeFile({ fileName: `${title.replace(/[^\w\- ]+/g, '').trim() || 'presentation'}.pptx` });
}
