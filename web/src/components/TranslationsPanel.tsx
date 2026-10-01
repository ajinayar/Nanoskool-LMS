/**
 * Lesson builder → Languages. AI translates the unit into an Indian language as a draft; a teacher reviews it
 * side by side with the English and approves it. Students only ever see approved translations.
 * "Out of date" means the English changed after the translation was approved.
 */
import { Alert, Box, Button, Chip, CircularProgress, Dialog, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesomeRounded';
import Close from '@mui/icons-material/Close';
import Translate from '@mui/icons-material/TranslateRounded';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import CheckCircle from '@mui/icons-material/CheckCircleRounded';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/api/client';
import { useGet } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { RichEditor } from '@/components/RichEditor';
import { RichText } from '@/components/ui';
import { BLOCK_META } from '@/lib/unitBlocks';
import type { BlockKind } from '@/api/types';

interface LangRow {
  code: string;
  name: string;
  native: string;
  status: 'draft' | 'approved' | null;
  by: 'ai' | 'copy' | 'teacher' | null;
  updatedAt: string | null;
  outOfDate: boolean;
}
interface TSlide {
  title?: string;
  subtitle?: string;
  bullets?: string[];
  bullets2?: string[];
  notes?: string;
  imageAlt?: string;
}
interface TBlock {
  id: string;
  kind?: string;
  title?: string;
  body?: string;
  slides?: TSlide[];
  gallery?: { caption?: string; alt?: string }[];
  question?: string;
  choices?: string[];
  explain?: string;
  help?: string;
}
interface TContent {
  title: string;
  summary?: string;
  objectives: { id: string; title?: string; criteria?: string }[];
  blocks: TBlock[];
}
interface Detail {
  lang: string;
  language: { name: string; native: string };
  source: TContent;
  translation: (TContent & { status: 'draft' | 'approved'; by: string; outOfDate: boolean }) | null;
}

export function LanguagesPanel({ unitId, dirty, onSave }: { unitId?: string; dirty: boolean; onSave: () => void }) {
  const toast = useToast();
  const list = useGet<{ languages: LangRow[] }>(unitId ? `/units/${unitId}/translations` : null);
  const status = useGet<{ provider: string }>('/ai/slides/status');
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const aiOff = status.data?.provider === 'offline';

  if (!unitId)
    return (
      <Alert severity="info" action={<Button onClick={onSave}>Save now</Button>}>
        Save the learning unit first, then translate it.
      </Alert>
    );

  const generate = async (l: LangRow) => {
    if (l.status && !window.confirm(`Replace the ${l.name} translation with a new ${aiOff ? 'copy of the English' : 'AI translation'}? Your edits to it will be lost.`)) return;
    setBusy(l.code);
    try {
      const r = await api.post<{ by: string }>(`/units/${unitId}/translations/${l.code}/generate`);
      toast.success(r.data.by === 'ai' ? `${l.name} draft ready — review it, then approve` : `English copied — translate it into ${l.name}, then approve`);
      await list.refetch();
      setEdit(l.code);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const remove = async (l: LangRow) => {
    if (!window.confirm(`Remove the ${l.name} translation? Students will see English.`)) return;
    await api.delete(`/units/${unitId}/translations/${l.code}`);
    await list.refetch();
  };

  const rows = list.data?.languages ?? [];
  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
            Languages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Children learn best in the language they think in. {aiOff ? 'AI is off, so the English is copied for you to translate by hand.' : 'AI writes a draft in simple, everyday words with the English term in brackets for key science words.'} Students only see a language after you approve it.
          </Typography>
        </Box>
      </Stack>
      {dirty && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button onClick={onSave}>Save</Button>}>
          You have unsaved changes. Save first so the translation includes them.
        </Alert>
      )}
      {aiOff && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Switch on Claude or OpenAI in Admin → AI settings to get AI translations.
        </Alert>
      )}
      {list.isLoading && <LinearProgress />}
      <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {rows.map((l) => (
          <Stack key={l.code} direction="row" sx={{ alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2.5, bgcolor: '#fff', border: '1px solid', borderColor: l.status === 'approved' && !l.outOfDate ? '#B2F2BB' : 'divider' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: '#F1ECFF', color: '#5F3DC4', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{l.native.slice(0, 1)}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {l.native} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>· {l.name}</Box>
              </Typography>
              <Stack direction="row" sx={{ gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
                {!l.status && <Chip size="small" label="Not translated" variant="outlined" />}
                {l.status === 'draft' && <Chip size="small" color="warning" label={l.by === 'copy' ? 'Draft · to translate by hand' : 'Draft · needs review'} />}
                {l.status === 'approved' && <Chip size="small" color="success" icon={<CheckCircle />} label="Students can read it" />}
                {l.outOfDate && <Chip size="small" color="error" variant="outlined" label="English changed since" />}
              </Stack>
            </Box>
            {l.status ? (
              <Button size="small" variant="outlined" onClick={() => setEdit(l.code)}>
                Review
              </Button>
            ) : null}
            <Tooltip title={l.status ? 'Translate again' : aiOff ? 'Copy the English to translate by hand' : 'Translate with AI'}>
              <span>
                <IconButton onClick={() => generate(l)} disabled={!!busy || dirty} aria-label={`Translate into ${l.name}`} sx={{ color: '#6741D9' }}>
                  {busy === l.code ? <CircularProgress size={20} /> : aiOff ? <Translate /> : <AutoAwesome />}
                </IconButton>
              </span>
            </Tooltip>
            {l.status && (
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => remove(l)} aria-label={`Remove ${l.name}`}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Box>
      {edit && <TranslationEditor unitId={unitId} lang={edit} onClose={() => (setEdit(null), list.refetch())} />}
    </Box>
  );
}

/** One line of the editor (kept outside the editor so typing doesn't lose focus). */
function Row({ label, en, children, lang }: { label: string; en?: React.ReactNode; children: React.ReactNode; lang: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label} · English
        </Typography>
        <Box sx={{ color: 'text.secondary', mt: 0.5 }}>{en}</Box>
      </Box>
      <Box sx={{ minWidth: 0 }} lang={lang}>
        {children}
      </Box>
    </Box>
  );
}

/** Side by side: English on the left, the translation (editable) on the right. */
function TranslationEditor({ unitId, lang, onClose }: { unitId: string; lang: string; onClose: () => void }) {
  const toast = useToast();
  const q = useGet<Detail>(`/units/${unitId}/translations/${lang}`);
  const [t, setT] = useState<TContent | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (q.data && !t) setT(q.data.translation ?? q.data.source);
  }, [q.data, t]);
  const src = q.data?.source;
  const L = q.data?.language;

  const setBlock = (id: string, p: Partial<TBlock>) => setT((x) => x && { ...x, blocks: x.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  const save = async (status: 'draft' | 'approved') => {
    if (!t) return;
    setSaving(true);
    try {
      await api.put(`/units/${unitId}/translations/${lang}`, { ...t, status });
      toast.success(status === 'approved' ? `Approved — students who choose ${L?.name} now see this` : 'Draft saved');
      if (status === 'approved') onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };


  return (
    <Dialog open fullScreen onClose={onClose} slotProps={{ paper: { sx: { bgcolor: '#F7F5F0' } } }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, px: 2.5, height: 64, bgcolor: '#fff', borderBottom: '1px solid #E8E4DA', flexShrink: 0 }}>
        <IconButton onClick={onClose} aria-label="Close">
          <Close />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Review translation
          </Typography>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {L ? `${L.native} · ${L.name}` : ''}
          </Typography>
        </Box>
        <Button onClick={() => save('draft')} disabled={!t || saving}>
          Save draft
        </Button>
        <Button variant="contained" color="success" onClick={() => save('approved')} disabled={!t || saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}>
          Approve for students
        </Button>
      </Stack>
      {!t || !src ? (
        <LinearProgress />
      ) : (
        <Box sx={{ overflowY: 'auto' }}>
          <Box sx={{ maxWidth: 1300, mx: 'auto', p: { xs: 2, md: 3 } }}>
            {q.data?.translation?.outOfDate && <Alert severity="warning" sx={{ mb: 2 }}>The English has changed since this was approved. Check the parts below, or translate it again from the Languages step.</Alert>}
            {q.data?.translation?.by === 'copy' && <Alert severity="info" sx={{ mb: 2 }}>This is a copy of the English. Type the {L?.name} over it, then approve.</Alert>}
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid', borderColor: 'divider', px: { xs: 2, md: 3 }, py: 1 }}>
              <Row lang={lang} label="Title" en={src.title}>
                <TextField fullWidth size="small" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} slotProps={{ htmlInput: { maxLength: 200, lang } }} />
              </Row>
              {src.summary && (
                <Row lang={lang} label="Summary" en={src.summary}>
                  <TextField fullWidth size="small" multiline value={t.summary ?? ''} onChange={(e) => setT({ ...t, summary: e.target.value })} slotProps={{ htmlInput: { maxLength: 1000, lang } }} />
                </Row>
              )}
              {src.objectives.map((o) => {
                const to = t.objectives.find((x) => x.id === o.id) ?? o;
                const setO = (p: Partial<typeof o>) => setT({ ...t, objectives: t.objectives.some((x) => x.id === o.id) ? t.objectives.map((x) => (x.id === o.id ? { ...x, ...p } : x)) : [...t.objectives, { ...o, ...p }] });
                return (
                  <Row lang={lang} key={o.id} label="Objective" en={<>{o.title}{o.criteria && <Box sx={{ fontSize: 13 }}>{o.criteria}</Box>}</>}>
                    <Stack spacing={1}>
                      <TextField fullWidth size="small" value={to.title ?? ''} onChange={(e) => setO({ title: e.target.value })} />
                      {o.criteria && <TextField fullWidth size="small" label="I can…" value={to.criteria ?? ''} onChange={(e) => setO({ criteria: e.target.value })} />}
                    </Stack>
                  </Row>
                );
              })}
            </Box>

            {src.blocks.map((sb, i) => {
              const tb = t.blocks.find((x) => x.id === sb.id) ?? sb;
              const meta = BLOCK_META[(sb.kind ?? 'text') as BlockKind];
              const has = sb.title || sb.body || sb.slides || sb.gallery?.some((g) => g.caption || g.alt) || sb.question || sb.help;
              if (!has) return null;
              return (
                <Box key={sb.id} sx={{ mt: 2.5, bgcolor: '#fff', borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: `5px solid ${meta?.color ?? '#999'}`, px: { xs: 2, md: 3 }, py: 1 }}>
                  <Typography sx={{ fontWeight: 800, pt: 1, color: meta?.color }}>
                    {i + 1}. {meta?.label}
                  </Typography>
                  {sb.title && (
                    <Row lang={lang} label="Section title" en={sb.title}>
                      <TextField fullWidth size="small" value={tb.title ?? ''} onChange={(e) => setBlock(sb.id, { title: e.target.value })} />
                    </Row>
                  )}
                  {sb.question && (
                    <Row lang={lang} label="Question" en={sb.question}>
                      <TextField fullWidth size="small" multiline value={tb.question ?? ''} onChange={(e) => setBlock(sb.id, { question: e.target.value })} />
                    </Row>
                  )}
                  {sb.choices?.map((c, k) => (
                    <Row lang={lang} key={k} label={`Choice ${String.fromCharCode(65 + k)}`} en={c}>
                      <TextField fullWidth size="small" value={tb.choices?.[k] ?? ''} onChange={(e) => setBlock(sb.id, { choices: (sb.choices ?? []).map((_, j) => (j === k ? e.target.value : (tb.choices?.[j] ?? ''))) })} />
                    </Row>
                  ))}
                  {sb.explain && (
                    <Row lang={lang} label="Why it's right" en={sb.explain}>
                      <TextField fullWidth size="small" multiline value={tb.explain ?? ''} onChange={(e) => setBlock(sb.id, { explain: e.target.value })} />
                    </Row>
                  )}
                  {sb.help && (
                    <Row lang={lang} label="Simpler explanation" en={<RichText html={sb.help} />}>
                      <RichEditor value={tb.help ?? ''} onChange={(help) => setBlock(sb.id, { help })} minHeight={120} />
                    </Row>
                  )}
                  {sb.body && (
                    <Row lang={lang} label="Text" en={<RichText html={sb.body} />}>
                      <RichEditor value={tb.body ?? ''} onChange={(body) => setBlock(sb.id, { body })} minHeight={160} />
                    </Row>
                  )}
                  {sb.slides?.map((s, k) => {
                    const ts = tb.slides?.[k] ?? {};
                    const setS = (p: Partial<TSlide>) => setBlock(sb.id, { slides: (sb.slides ?? []).map((orig, j) => (j === k ? { ...(tb.slides?.[j] ?? orig), ...p } : (tb.slides?.[j] ?? orig))) });
                    return (
                      <Row lang={lang} key={k} label={`Slide ${k + 1}`} en={<>{s.title && <b>{s.title}</b>}{s.subtitle && <Box>{s.subtitle}</Box>}{s.bullets && <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{s.bullets.map((x, j) => <li key={j}>{x}</li>)}</Box>}</>}>
                        <Stack spacing={1}>
                          {s.title !== undefined && <TextField size="small" label="Title" value={ts.title ?? ''} onChange={(e) => setS({ title: e.target.value })} />}
                          {s.subtitle !== undefined && <TextField size="small" label="Subtitle" value={ts.subtitle ?? ''} onChange={(e) => setS({ subtitle: e.target.value })} />}
                          {s.bullets && <TextField size="small" label="Points (one per line)" multiline value={(ts.bullets ?? []).join('\n')} onChange={(e) => setS({ bullets: e.target.value.split('\n') })} />}
                          {s.bullets2 && <TextField size="small" label="Right column (one per line)" multiline value={(ts.bullets2 ?? []).join('\n')} onChange={(e) => setS({ bullets2: e.target.value.split('\n') })} />}
                          {s.notes !== undefined && <TextField size="small" label="Speaker notes" multiline value={ts.notes ?? ''} onChange={(e) => setS({ notes: e.target.value })} />}
                        </Stack>
                      </Row>
                    );
                  })}
                  {sb.gallery?.map((g, k) =>
                    g.caption || g.alt ? (
                      <Row lang={lang} key={k} label={`Picture ${k + 1}`} en={<>{g.caption}{g.alt && <Box sx={{ fontSize: 13 }}>Alt: {g.alt}</Box>}</>}>
                        <Stack spacing={1}>
                          <TextField size="small" label="Caption" value={tb.gallery?.[k]?.caption ?? ''} onChange={(e) => setBlock(sb.id, { gallery: (sb.gallery ?? []).map((orig, j) => (j === k ? { ...(tb.gallery?.[j] ?? orig), caption: e.target.value } : (tb.gallery?.[j] ?? orig))) })} />
                          <TextField size="small" label="Alt text" value={tb.gallery?.[k]?.alt ?? ''} onChange={(e) => setBlock(sb.id, { gallery: (sb.gallery ?? []).map((orig, j) => (j === k ? { ...(tb.gallery?.[j] ?? orig), alt: e.target.value } : (tb.gallery?.[j] ?? orig))) })} />
                        </Stack>
                      </Row>
                    ) : null,
                  )}
                </Box>
              );
            })}
            <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5, mt: 3, mb: 4 }}>
              <Button onClick={() => save('draft')} disabled={saving}>
                Save draft
              </Button>
              <Button variant="contained" color="success" onClick={() => save('approved')} disabled={saving} startIcon={<CheckCircle />}>
                Approve for students
              </Button>
            </Stack>
          </Box>
        </Box>
      )}
    </Dialog>
  );
}
