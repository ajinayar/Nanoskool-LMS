/**
 * Reference files for "Create the whole unit with AI": the teacher attaches existing material
 * (PDF, Word, PowerPoint, Excel/CSV, text, images) and AI builds the unit from it.
 *
 * Text is pulled out of every document type here (so it also works offline); when the AI is on,
 * images and PDFs are also sent to it directly so it can see diagrams and layout.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { env } from '../config/env.js';

export interface RefFileIn {
  url: string;
  name?: string;
}
export interface RefFile {
  url: string;
  name: string;
  kind: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'text' | 'image' | 'other';
  text: string; // extracted text ('' for images)
  mime?: string;
  bytes?: Buffer; // images and PDFs, for the AI to look at
  note?: string; // why nothing could be read
}

const EXT_KIND: Record<string, RefFile['kind']> = { pdf: 'pdf', docx: 'docx', pptx: 'pptx', xlsx: 'xlsx', csv: 'csv', txt: 'text', md: 'text', png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image' };
const IMG_MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
const MAX_TEXT = 60_000; // per file
const cache = new Map<string, RefFile>();

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
const tidy = (s: string) =>
  s
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Word: one line per paragraph; headings marked with "## " so the planner sees the structure. */
async function docxText(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  const paras = xml.split(/<\/w:p>/).map((p) => {
    const heading = /<w:pStyle w:val="(Heading\d|Title)"/i.test(p);
    const list = /<w:numPr>/.test(p);
    const t = decode(Array.from(p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map((m) => m[1]).join('')).trim();
    return t ? `${heading ? '## ' : list ? '• ' : ''}${t}` : '';
  });
  return tidy(paras.filter(Boolean).join('\n'));
}

/** PowerPoint: "Slide N" then each text box; speaker notes too. */
async function pptxText(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  const num = (n: string) => Number(n.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => num(a) - num(b));
  const out: string[] = [];
  for (const s of slides) {
    const xml = await zip.file(s)!.async('string');
    const lines = xml.split(/<\/a:p>/).map((p) => decode(Array.from(p.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]).join('')).trim()).filter(Boolean);
    const notesXml = await zip.file(`ppt/notesSlides/notesSlide${num(s)}.xml`)?.async('string');
    const notes = notesXml ? decode(Array.from(notesXml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]).join(' ')).replace(/^\s*\d+\s*$/, '').trim() : '';
    if (lines.length || notes) out.push(`## Slide ${num(s)}: ${lines[0] ?? ''}\n${lines.slice(1).map((l) => `• ${l}`).join('\n')}${notes ? `\nNotes: ${notes}` : ''}`);
  }
  return tidy(out.join('\n\n'));
}

/** Excel: every sheet as rows of cells separated by " | ". */
async function xlsxText(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  const shared = Array.from(((await zip.file('xl/sharedStrings.xml')?.async('string')) ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)).map((m) => decode(Array.from(m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)).map((x) => x[1]).join('')));
  const wb = (await zip.file('xl/workbook.xml')?.async('string')) ?? '';
  const names = Array.from(wb.matchAll(/<sheet [^>]*name="([^"]+)"/g)).map((m) => decode(m[1]));
  const sheets = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  const out: string[] = [];
  for (const [i, s] of sheets.entries()) {
    const xml = await zip.file(s)!.async('string');
    const rows = Array.from(xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)).slice(0, 400).map((r) =>
      Array.from(r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g))
        .map((c) => {
          const v = c[2]?.match(/<v>([^<]*)<\/v>/)?.[1] ?? c[2]?.match(/<t[^>]*>([^<]*)<\/t>/)?.[1] ?? '';
          return /t="s"/.test(c[1]) ? (shared[Number(v)] ?? '') : decode(v);
        })
        .join(' | '),
    );
    out.push(`## Sheet: ${names[i] ?? i + 1}\n${rows.filter((r) => r.replace(/[|\s]/g, '')).join('\n')}`);
  }
  return tidy(out.join('\n\n'));
}

async function pdfText(buf: Buffer) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(doc, { mergePages: false });
  return tidy((Array.isArray(text) ? text : [text]).map((t, i) => `## Page ${i + 1}\n${t}`).join('\n\n'));
}

/** Reads a file this server stored (…/files/…), never anything else. */
async function readStored(url: string): Promise<Buffer | null> {
  const m = url.match(/\/files\/(.+?)(?:\?.*)?$/);
  if (!m) return null;
  const root = path.resolve(env.UPLOAD_DIR);
  const file = path.resolve(root, decodeURIComponent(m[1]));
  if (!file.startsWith(root + path.sep)) return null;
  try {
    return await fs.readFile(file);
  } catch {
    return null;
  }
}

export async function readRefFile(f: RefFileIn): Promise<RefFile> {
  const hit = cache.get(f.url);
  if (hit) return hit;
  const ext = path.extname(f.url.split('?')[0]).slice(1).toLowerCase();
  const name = f.name?.trim() || decodeURIComponent(f.url.split('/').pop() ?? 'file');
  const kind = EXT_KIND[ext] ?? 'other';
  const out: RefFile = { url: f.url, name, kind, text: '' };
  const buf = await readStored(f.url);
  if (!buf) out.note = 'The file could not be opened.';
  else {
    try {
      if (kind === 'pdf') {
        out.text = await pdfText(buf);
        if (buf.length <= 20_000_000) Object.assign(out, { bytes: buf, mime: 'application/pdf' });
        if (!out.text.replace(/## Page \d+/g, '').trim()) out.note = 'This PDF has no readable text (it may be scanned). With the AI key on, AI reads the pages as pictures.';
      } else if (kind === 'docx') out.text = await docxText(buf);
      else if (kind === 'pptx') out.text = await pptxText(buf);
      else if (kind === 'xlsx') out.text = await xlsxText(buf);
      else if (kind === 'csv' || kind === 'text') out.text = tidy(buf.toString('utf8'));
      else if (kind === 'image') {
        if (buf.length <= 4_500_000) Object.assign(out, { bytes: buf, mime: IMG_MIME[ext] });
        else out.note = 'The picture is too large for AI to look at (over 4.5 MB).';
      } else out.note = 'This file type can’t be read. Save Word, PowerPoint and Excel files in the newer .docx, .pptx and .xlsx formats.';
    } catch {
      out.note = 'The file could not be read. It may be damaged or password-protected.';
    }
  }
  out.text = out.text.slice(0, MAX_TEXT);
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  cache.set(f.url, out);
  return out;
}

export async function readRefFiles(files: RefFileIn[] = []) {
  return Promise.all(files.slice(0, 10).map(readRefFile));
}

/** All the reference text, labelled by file, cut to `max` characters. */
export function refText(files: RefFile[], max = 40_000) {
  const withText = files.filter((f) => f.text);
  if (!withText.length) return '';
  const each = Math.floor(max / withText.length);
  return withText.map((f) => `=== ${f.name} ===\n${f.text.slice(0, each)}`).join('\n\n');
}

/** Paragraphs of the reference that best match some words (for offline sections built from the teacher's material). */
export function refPassages(files: RefFile[], about: string, n = 5): string[] {
  const words = new Set(about.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const paras = files
    .flatMap((f) => f.text.split(/\n+/))
    .map((p) => p.replace(/^##\s*|^•\s*/, '').trim())
    .filter((p) => p.length > 40 && !/^(page|slide|sheet) \d+/i.test(p));
  const scored = paras.map((p, i) => ({ p, i, s: p.toLowerCase().split(/[^a-z0-9]+/).filter((w) => words.has(w)).length }));
  const best = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, n);
  return (best.length ? best : scored.slice(0, n)).sort((a, b) => a.i - b.i).map((x) => x.p);
}

/** The first heading or line of the reference, as a topic when the teacher wrote little. */
export function refTopic(files: RefFile[]): string | undefined {
  for (const f of files) {
    const line = f.text
      .split('\n')
      .map((l) => l.replace(/^##\s*(Slide \d+:|Page \d+|Sheet:)?\s*/, '').trim())
      .find((l) => l.length > 3 && l.length < 90);
    if (line) return line;
  }
  return files.find((f) => f.kind !== 'image')?.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
}

type Content = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

/** Message parts for the AI: images and PDFs as themselves (up to a few), everything else as text. */
export function refContent(files: RefFile[], maxText = 40_000): Content[] {
  const out: Content[] = [];
  let pdfs = 0;
  let imgs = 0;
  const sentAsDoc = new Set<string>();
  for (const f of files) {
    if (f.kind === 'pdf' && f.bytes && pdfs < 2) {
      pdfs++;
      sentAsDoc.add(f.url);
      out.push({ type: 'text', text: `Reference document: ${f.name}` }, { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.bytes.toString('base64') } });
    } else if (f.kind === 'image' && f.bytes && f.mime && imgs < 8) {
      imgs++;
      out.push({ type: 'text', text: `Reference picture: ${f.name}` }, { type: 'image', source: { type: 'base64', media_type: f.mime, data: f.bytes.toString('base64') } });
    }
  }
  const text = refText(
    files.filter((f) => !sentAsDoc.has(f.url)),
    maxText,
  );
  if (text) out.push({ type: 'text', text: `Reference material from the teacher's files:\n${text}` });
  return out;
}
