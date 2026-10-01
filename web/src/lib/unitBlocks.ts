/** Helpers for learning units built from content blocks (text, video, slides, activity, document, link, animation, gallery, 3D). */
import type { BlockKind, Unit, UnitBlock } from '@/api/types';

export const BLOCK_META: Record<BlockKind, { label: string; hint: string; color: string; student: string }> = {
  text: {
    label: 'Text Editor',
    hint: 'Write with text, pictures, tables and videos',
    color: '#7C5CFA',
    student: 'Read',
  },
  video: {
    label: 'Video',
    hint: 'A YouTube, Vimeo or .mp4 video',
    color: '#E8590C',
    student: 'Watch',
  },
  presentation: {
    label: 'Presentation',
    hint: 'Slides you build here, with AI help',
    color: '#C04CD8',
    student: 'Slides',
  },
  activity: {
    label: 'Hands-on activity',
    hint: 'Steps to build or try, with a worksheet',
    color: '#2F9E44',
    student: 'Try it',
  },
  pdf: {
    label: 'PDF / document',
    hint: 'A worksheet, reading or handout to open',
    color: '#D92D20',
    student: 'Document',
  },
  link: {
    label: 'External link',
    hint: 'A website or online tool students open',
    color: '#1C7ED6',
    student: 'Visit',
  },
  motion: {
    label: 'Motion graphics',
    hint: 'An animation: Lottie, GIF, looping video or embed',
    color: '#F08C00',
    student: 'Animation',
  },
  gallery: {
    label: 'Image gallery',
    hint: 'A set of pictures with captions to explore',
    color: '#0CA678',
    student: 'Pictures',
  },
  sim3d: {
    label: '3D simulation',
    hint: 'A 3D model to turn and zoom, or a PhET/Sketchfab simulation',
    color: '#3B5BDB',
    student: 'Explore in 3D',
  },
  check: {
    label: 'Quick check',
    hint: 'One question students answer before the next part opens',
    color: '#D6336C',
    student: 'Quick check',
  },
};
export const BLOCK_ORDER: BlockKind[] = ['text', 'video', 'presentation', 'activity', 'check', 'pdf', 'link', 'motion', 'gallery', 'sim3d'];

let n = 0;
export const blockKey = () => `b${Date.now().toString(36)}${(n++).toString(36)}`;

export function newBlock(kind: BlockKind): UnitBlock {
  return {
    key: blockKey(),
    kind,
    title: '',
    body: '',
    ...(kind === 'presentation' ? { slides: [], deckTheme: 'clarity' } : {}),
    ...(kind === 'gallery' ? { gallery: [] } : {}),
    ...(kind === 'motion' ? { motionLoop: true } : {}),
    ...(kind === 'check' ? { title: 'Quick check', question: '', choices: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }], explain: '', help: '' } : {}),
  };
}

/** The unit's blocks; older units (one type, fixed fields) are turned into blocks in the order students used to see them. */
export function blocksOf(u: Partial<Unit>): UnitBlock[] {
  if (u.blocks?.length) return u.blocks.map((b) => ({ ...b, key: b.key ?? b._id ?? blockKey() }));
  const out: UnitBlock[] = [];
  const t = u.type ?? 'lesson';
  if (t === 'presentation' && (u.slides ?? []).length)
    out.push({
      key: blockKey(),
      kind: 'presentation',
      slides: u.slides,
      deckTheme: u.deckTheme,
    });
  if (t === 'motion' && u.motionUrl)
    out.push({
      key: blockKey(),
      kind: 'motion',
      motionUrl: u.motionUrl,
      motionLoop: u.motionLoop,
    });
  if (t === 'gallery' && (u.gallery ?? []).length) out.push({ key: blockKey(), kind: 'gallery', gallery: u.gallery });
  if (t === 'sim3d' && u.simUrl) out.push({ key: blockKey(), kind: 'sim3d', simUrl: u.simUrl });
  if (u.videoUrl && t !== 'presentation') out.push({ key: blockKey(), kind: 'video', videoUrl: u.videoUrl });
  if (t === 'activity')
    out.push({
      key: blockKey(),
      kind: 'activity',
      body: u.body ?? '',
      fileUrl: u.fileUrl,
      linkUrl: u.linkUrl,
    });
  else {
    if ((u.body ?? '').replace(/<[^>]+>/g, '').trim() || /<img|<iframe/.test(u.body ?? '')) out.push({ key: blockKey(), kind: 'text', body: u.body });
    if (u.fileUrl) out.push({ key: blockKey(), kind: 'pdf', fileUrl: u.fileUrl });
    if (u.linkUrl) out.push({ key: blockKey(), kind: 'link', linkUrl: u.linkUrl });
  }
  return out;
}

export const wordsIn = (html?: string) =>
  (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

/** All the writing in the unit (headings included), e.g. for objective ideas and AI slides. */
export const textOf = (blocks: UnitBlock[]) => blocks.map((b) => `${b.title ? `<h2>${b.title}</h2>` : ''}${b.body ?? ''}`).join('');

/** What is missing in a block before students can use it. */
export function blockProblem(b: UnitBlock): string | null {
  switch (b.kind) {
    case 'text':
      return wordsIn(b.body) === 0 && !/<img|<iframe/.test(b.body ?? '') ? 'write the text' : null;
    case 'video':
      return b.videoUrl?.trim() ? null : 'add the video link';
    case 'presentation':
      return (b.slides ?? []).length ? null : 'add at least one slide';
    case 'activity':
      return wordsIn(b.body) === 0 ? 'write the steps' : null;
    case 'pdf':
      return b.fileUrl ? null : 'upload the document';
    case 'link':
      return b.linkUrl?.trim() ? null : 'add the website link';
    case 'motion':
      return b.motionUrl?.trim() ? null : 'add the animation';
    case 'gallery':
      return (b.gallery ?? []).length ? null : 'add at least one picture';
    case 'sim3d':
      return b.simUrl?.trim() ? null : 'add the 3D model or simulation link';
    case 'check': {
      const c = (b.choices ?? []).filter((x) => x.text.trim());
      if (!b.question?.trim()) return 'write the question';
      if (c.length < 2) return 'add at least two choices';
      if (c.filter((x) => x.correct).length !== 1) return 'mark exactly one right answer';
      return null;
    }
  }
}

/** Minutes estimate for the helper panel: reading at ~150 words a minute plus a few minutes per media block. */
export function estimateMinutes(blocks: UnitBlock[]) {
  const words = blocks.reduce((s, b) => s + wordsIn(b.body), 0);
  const media = blocks.filter((b) => b.kind !== 'text').length;
  return Math.max(1, Math.round(words / 150) + media * 3);
}
