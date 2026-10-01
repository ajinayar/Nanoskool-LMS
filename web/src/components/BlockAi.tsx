/**
 * "Create with AI" for one lesson section: a small dialog (topic, what you want), then the section is filled in.
 * Presentations use the slide generator; every other kind uses /ai/blocks/generate.
 */
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesomeRounded';
import { useState } from 'react';
import { api, errorMessage } from '@/api/client';
import type { Slide, UnitBlock } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { BLOCK_META } from '@/lib/unitBlocks';

export interface BlockAiResult {
  patch: Partial<UnitBlock>;
  provider: 'anthropic' | 'openai' | 'offline';
  message?: string;
  searchUrl?: string;
}

const WHAT: Record<UnitBlock['kind'], string> = {
  text: 'writes this part of the lesson: a hook question, the explanation with an example, a key idea and check-yourself questions',
  activity: 'writes a hands-on activity: what you need, the steps, safety and a question to think about',
  video: 'writes a watching guide (before, while and after watching) and finds the right YouTube search for a video',
  presentation: 'makes a slide deck from the topic and the rest of the lesson',
  pdf: 'designs a printable worksheet and makes it into a PDF',
  link: 'picks a website from Nanoskool’s trusted list and writes what students should do there',
  motion: 'draws a short looping explainer animation',
  gallery: 'looks at your pictures and writes captions and alt text (or suggests pictures to add)',
  check: 'writes one question on what students have just learned, with a simpler explanation for anyone who gets it wrong',
  sim3d: 'picks a simulation from Nanoskool’s trusted list (PhET, GeoGebra) and writes what to explore',
};

const hasText = (b: UnitBlock) => !!(b.body ?? '').replace(/<[^>]+>/g, '').trim();

/** Runs the generation for a block; `merge` decides what happens to text that is already there. */
// At most two AI requests at a time, so "create the whole unit" doesn't flood the AI service
let running = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

const idle = async () => {
  while (running > 0 || waiting.length) await new Promise((r) => setTimeout(r, 400));
};

export async function runBlockAi(b: UnitBlock, o: { unitTitle: string; grade?: number; instructions?: string; contextHtml?: string; getContext?: () => string; merge?: 'replace' | 'append' }): Promise<BlockAiResult> {
  const instructions = [b.aiBrief, o.instructions].filter(Boolean).join('\n');
  // A quick check asks about the lesson, so it waits until the other sections have been written
  if (b.kind === 'check' && o.getContext) await idle();
  return slot(() => generate(b, { ...o, instructions, contextHtml: o.getContext?.() ?? o.contextHtml }));
}

async function generate(b: UnitBlock, o: { unitTitle: string; grade?: number; instructions?: string; contextHtml?: string; merge?: 'replace' | 'append' }): Promise<BlockAiResult> {
  const topic = (o.unitTitle || b.title || 'this lesson').trim();
  if (b.kind === 'presentation') {
    const r = await api.post<{ slides: Slide[]; provider: 'anthropic' | 'openai' | 'offline'; theme?: string }>('/ai/slides/generate', {
      topic: b.title?.trim() || topic,
      count: o.grade && o.grade <= 3 ? 6 : 8,
      grade: o.grade,
      sourceHtml: o.contextHtml && o.contextHtml.replace(/<[^>]+>/g, '').trim().length > 80 ? o.contextHtml : undefined,
      instructions: o.instructions || undefined,
      files: b.aiFiles?.length ? b.aiFiles : undefined,
    });
    return { patch: { slides: r.data.slides, ...(r.data.theme ? { deckTheme: r.data.theme } : {}) }, provider: r.data.provider, message: `${r.data.slides.length} slides made. Edit any slide, or use AI to improve one.` };
  }
  const r = await api.post<BlockAiResult>('/ai/blocks/generate', {
    kind: b.kind,
    topic: topic.length >= 2 ? topic : 'this lesson',
    sectionTitle: b.title?.trim() || undefined,
    grade: o.grade,
    instructions: o.instructions || undefined,
    contextHtml: o.contextHtml || undefined,
    files: b.aiFiles?.length ? b.aiFiles : undefined,
    gallery: b.kind === 'gallery' && b.gallery?.length ? b.gallery.map((g) => ({ url: g.url, caption: g.caption, alt: g.alt })) : undefined,
  });
  const patch = { ...r.data.patch };
  if (b.title?.trim()) delete patch.title; // keep the teacher's own title
  if (patch.body !== undefined && hasText(b) && o.merge === 'append') patch.body = `${b.body}${patch.body}`;
  return { ...r.data, patch };
}

export function BlockAiDialog({ open, onClose, b, unitTitle, grade, contextHtml, onDone }: { open: boolean; onClose: () => void; b: UnitBlock; unitTitle: string; grade?: number; contextHtml: string; onDone: (r: BlockAiResult) => void }) {
  const status = useGet<{ provider: 'anthropic' | 'openai' | 'offline' }>(open ? '/ai/slides/status' : null);
  const [instructions, setInstructions] = useState('');
  const [merge, setMerge] = useState<'replace' | 'append'>('replace');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const m = BLOCK_META[b.kind];
  const hasContent = hasText(b) || !!(b.slides?.length || b.fileUrl || b.linkUrl || b.simUrl || b.motionUrl);
  const replaces = b.kind === 'presentation' ? !!b.slides?.length : b.kind === 'pdf' ? !!b.fileUrl : b.kind === 'motion' ? !!b.motionUrl : b.kind === 'link' ? !!b.linkUrl : b.kind === 'sim3d' ? !!b.simUrl : false;
  const offline = status.data?.provider === 'offline';

  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await runBlockAi(b, { unitTitle, grade, instructions: instructions.trim(), contextHtml, merge });
      onDone(r);
      setInstructions('');
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesome sx={{ color: '#7C5CFA' }} /> Create {m.label.toLowerCase()} with AI
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            AI {WHAT[b.kind]} for <b>{b.title?.trim() || unitTitle || 'this unit'}</b>
            {grade ? `, pitched at Grade ${grade}` : ''}. You can edit everything afterwards.
          </Typography>
          <TextField
            label="Anything specific? (optional)"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            multiline
            minRows={2}
            placeholder={b.kind === 'pdf' ? 'e.g. 5 fill-in-the-blanks and a results table' : b.kind === 'motion' ? 'e.g. show current flowing round a circuit' : 'e.g. use cricket as the example; keep it short'}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            autoFocus
          />
          {hasText(b) && b.kind !== 'gallery' && (
            <RadioGroup row value={merge} onChange={(e) => setMerge(e.target.value as 'replace' | 'append')}>
              <FormControlLabel value="replace" control={<Radio size="small" />} label="Replace the text" />
              <FormControlLabel value="append" control={<Radio size="small" />} label="Add below the text" />
            </RadioGroup>
          )}
          {replaces && <Alert severity="info">This replaces the {b.kind === 'presentation' ? 'slides' : b.kind === 'pdf' ? 'document' : b.kind === 'motion' ? 'animation' : b.kind === 'sim3d' ? 'simulation' : 'link'} in this section.</Alert>}
          {offline && <Alert severity="warning">AI is offline, so you’ll get a ready-made starter draft to edit. Switch on Claude or OpenAI in Admin → AI settings for full AI writing.</Alert>}
          {err && <Alert severity="error">{err}</Alert>}
          {!hasContent && b.kind === 'gallery' && (
            <Typography variant="caption" color="text.secondary">
              Tip: upload the pictures first, then AI writes a caption and alt text for each one.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={go} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}>
          {busy ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
