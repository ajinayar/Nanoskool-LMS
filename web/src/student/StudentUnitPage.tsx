/**
 * The lesson page for students. The same lesson content is laid out differently by age:
 *   little (1–3)  each part of the lesson becomes its own colourful card with a picture icon,
 *                 bigger letters, highlighted key words, "Listen" buttons, a big "I finished!"
 *                 button and a celebration with stars
 *   junior (4–7)  tidy section cards with icons, a chapter progress bar, "+10 XP" on finishing
 *   senior (8–10) a calm reading layout with an "On this page" outline and the chapter list
 */
import { BLOCK_ICON, BlockMedia } from '@/components/UnitBlocksView';
import { LockedRest, QuickCheck } from '@/components/QuickCheck';
import { LANGUAGES } from '@/lib/languages';
import { TEXT_SCALE, usePrefs } from '@/lib/prefs';
import Translate from '@mui/icons-material/TranslateRounded';
import { LearnSettingsButton } from './LearnSettings';
import { BLOCK_META, blocksOf } from '@/lib/unitBlocks';
import { Box, Button, ButtonBase, Card, CardContent, Chip, Dialog, DialogContent, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBackRounded';
import ArrowForward from '@mui/icons-material/ArrowForwardRounded';
import CheckCircle from '@mui/icons-material/CheckCircleRounded';
import PlayCircle from '@mui/icons-material/PlayCircleRounded';
import Forum from '@mui/icons-material/ForumRounded';
import Science from '@mui/icons-material/ScienceRounded';
import Lightbulb from '@mui/icons-material/LightbulbRounded';
import MenuBook from '@mui/icons-material/MenuBookRounded';
import Star from '@mui/icons-material/StarRounded';
import VolumeUp from '@mui/icons-material/VolumeUpRounded';
import Schedule from '@mui/icons-material/ScheduleRounded';
import SmartToy from '@mui/icons-material/SmartToyRounded';
import Home from '@mui/icons-material/HomeRounded';
import DOMPurify from 'dompurify';
import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '@/api/client';
import type { AiChat, CourseDetail, UnitBlock, UnitDetail } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { QueryState } from '@/components/ui';
import { richContentSx } from '@/components/richContent';
import { NanoFor, StarIcon } from './art';
import { shade, tint, type Look } from './looks';
import { speak, useLook } from './useLook';
import { S } from './widgets';
import { UnitActivities, UnitGoals } from './journey';

type JU = Parameters<typeof UnitGoals>[0]['u'];

interface Section {
  id: string;
  title?: string;
  html: string;
  text: string;
}

/** Split the lesson into parts at each heading, so each part can get its own card. */
function splitSections(html?: string): Section[] {
  if (!html) return [];
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder'],
  });
  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;
  const out: Section[] = [];
  let cur: { title?: string; nodes: Element[] } = { nodes: [] };
  const push = () => {
    const html = cur.nodes.map((n) => n.outerHTML).join('');
    const text = cur.nodes
      .map((n) => n.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cur.title || text || /<(img|iframe)/.test(html)) out.push({ id: `part-${out.length + 1}`, title: cur.title, html, text });
  };
  for (const el of Array.from(root.children)) {
    if (/^H[1-4]$/.test(el.tagName)) {
      push();
      cur = { title: el.textContent?.trim() ?? '', nodes: [] };
    } else cur.nodes.push(el);
  }
  push();
  return out;
}

/** One thing on the lesson page, in the teacher's order: a part of the text, or a media section (video, slides, gallery…). */
type Part =
  | ({ kind: 'text' } & Section)
  | { kind: 'check'; id: string; title?: string; b: UnitBlock; text: string }
  | {
      kind: 'media';
      id: string;
      title?: string;
      b: UnitBlock;
      notes?: Section[];
      text: string;
    };

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function lessonParts(u: UnitDetail): Part[] {
  const out: Part[] = [];
  blocksOf(u).forEach((b, bi) => {
    const html = `${b.title?.trim() ? `<h2>${esc(b.title.trim())}</h2>` : ''}${b.body ?? ''}`;
    if (b.kind === 'text') {
      splitSections(html).forEach((sec, i) => out.push({ kind: 'text', ...sec, id: `part-${bi + 1}-${i + 1}` }));
      return;
    }
    if (b.kind === 'check') {
      out.push({ kind: 'check', id: `part-${bi + 1}`, title: b.title?.trim() || undefined, b, text: [b.question, ...(b.choices ?? []).map((c) => c.text)].join('. ') });
      return;
    }
    const notes = splitSections(b.body);
    out.push({
      kind: 'media',
      id: `part-${bi + 1}`,
      title: b.title?.trim() || undefined,
      b,
      notes,
      text: notes.map((n) => `${n.title ?? ''}. ${n.text}`).join(' '),
    });
  });
  return out;
}

/** Pick a picture and colour for a lesson part from its heading. */
function partStyle(look: Look, title = '', i: number): { icon: ReactNode; color: string; label: string } {
  const t = title.toLowerCase();
  if (/watch|video|see/.test(t)) return { icon: <PlayCircle />, color: look.tiles[3], label: 'Watch' };
  if (/think|talk|discuss|question|answer/.test(t)) return { icon: <Forum />, color: look.tiles[4], label: 'Think' };
  if (/try|activity|do it|make|build|experiment|lab/.test(t)) return { icon: <Science />, color: look.tiles[2], label: 'Try it' };
  if (/remember|summary|key|recap/.test(t)) return { icon: <Star />, color: look.tiles[1], label: 'Remember' };
  if (/where|what|why|how|when|who/.test(t)) return { icon: <Lightbulb />, color: look.tiles[1], label: 'Learn' };
  return {
    icon: <MenuBook />,
    color: i === 0 ? look.primary : look.tiles[i % look.tiles.length],
    label: 'Read',
  };
}

/** Rich-text styles for each age band. */
function contentSx(look: Look, color: string) {
  return { ...richContentSx, ...bandContentSx(look, color) };
}

function bandContentSx(look: Look, color: string) {
  if (look.band === 'little') {
    return {
      fontSize: 19,
      lineHeight: 1.75,
      '& p': { m: '0 0 0.9em' },
      '& strong, & b': {
        fontWeight: 900,
        background: 'linear-gradient(transparent 55%, #FFE58A 55%)',
        px: 0.25,
      },
      '& ul': { listStyle: 'none', p: 0, m: '0 0 1em' },
      '& ul > li': { position: 'relative', pl: '2.1em', mb: 1.25 },
      '& ul > li::before': {
        content: '""',
        position: 'absolute',
        left: 4,
        top: '0.45em',
        width: 16,
        height: 16,
        borderRadius: '50%',
        bgcolor: color,
        boxShadow: `0 3px 0 ${shade(color, 0.25)}`,
      },
      '& ol': { listStyle: 'none', p: 0, m: '0 0 1em', counterReset: 'step' },
      '& ol > li': {
        position: 'relative',
        pl: '2.6em',
        mb: 1.5,
        counterIncrement: 'step',
        minHeight: 34,
      },
      '& ol > li::before': {
        content: 'counter(step)',
        position: 'absolute',
        left: 0,
        top: 0,
        width: 34,
        height: 34,
        borderRadius: '50%',
        bgcolor: color,
        color: '#fff',
        fontWeight: 900,
        display: 'grid',
        placeItems: 'center',
        fontSize: 17,
        boxShadow: `0 3px 0 ${shade(color, 0.25)}`,
      },
      '& blockquote': {
        position: 'relative',
        m: '1em 0',
        p: '16px 18px 16px 64px',
        borderRadius: '20px',
        bgcolor: '#FFF1E0',
        color: '#8A3B00',
        fontWeight: 800,
        border: '3px solid #FFD2A8',
      },
      '& blockquote::before': {
        content: '"!"',
        position: 'absolute',
        left: 16,
        top: 14,
        width: 34,
        height: 34,
        borderRadius: '50%',
        bgcolor: '#FF8A1F',
        color: '#fff',
        fontWeight: 900,
        display: 'grid',
        placeItems: 'center',
        fontSize: 20,
      },
      '& img': {
        maxWidth: '100%',
        borderRadius: '22px',
        border: '5px solid #fff',
        boxShadow: '0 6px 0 rgba(40,30,80,0.08), 0 4px 18px rgba(40,30,80,0.12)',
        display: 'block',
        my: 1.5,
      },
      '& a': { color: look.primary, fontWeight: 800 },
      '& > :last-child': { mb: 0 },
    };
  }
  if (look.band === 'junior') {
    return {
      fontSize: 16.5,
      lineHeight: 1.75,
      '& p': { m: '0 0 0.85em' },
      '& strong, & b': { fontWeight: 750, color: look.ink },
      '& ul, & ol': { pl: '1.3em', m: '0 0 1em' },
      '& li': { mb: 0.75, pl: 0.5 },
      '& li::marker': { color, fontWeight: 800 },
      '& blockquote': {
        m: '1em 0',
        p: '12px 16px',
        borderRadius: '14px',
        bgcolor: '#FFF4E5',
        borderLeft: '4px solid #F59E0B',
        color: '#7A4A00',
        fontWeight: 600,
      },
      '& img': {
        maxWidth: '100%',
        borderRadius: '16px',
        display: 'block',
        my: 1.5,
      },
      '& a': { color: look.primary, fontWeight: 700 },
      '& > :last-child': { mb: 0 },
    };
  }
  return {
    fontSize: 16,
    lineHeight: 1.75,
    color: look.ink,
    '& p': { m: '0 0 1em' },
    '& strong, & b': { fontWeight: 650 },
    '& ul, & ol': { pl: '1.4em', m: '0 0 1em' },
    '& li': { mb: 0.5 },
    '& blockquote': {
      m: '1.2em 0',
      p: '12px 16px',
      borderLeft: `3px solid ${look.accent}`,
      bgcolor: look.soft,
      borderRadius: '0 8px 8px 0',
      color: look.ink,
    },
    '& img': {
      maxWidth: '100%',
      borderRadius: '10px',
      display: 'block',
      my: 2,
      border: `1px solid ${look.line}`,
    },
    '& a': { color: look.primary === '#18181B' ? look.accent : look.primary },
    '& > :last-child': { mb: 0 },
  };
}

function Html({ html, sx }: { html: string; sx: object }) {
  return <Box className="lesson-text" sx={sx} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function StudentUnitPage() {
  const { id } = useParams();
  const look = useLook();
  const { setPrefs } = usePrefs();
  const [lang, setLang] = useState<string | undefined>();
  const q = useGet<UnitDetail>(`/units/${id}`, lang ? { lang } : undefined);
  const onLang = (l: string) => {
    setLang(l);
    // Remember it for the next lessons and for NanoBot
    void setPrefs({ language: l }).catch(() => undefined);
  };
  return <QueryState q={q}>{(u) => <Lesson key={`${u._id}-${u.lang ?? 'en'}`} look={look} u={u} onLang={onLang} />}</QueryState>;
}

/** "Read in: English · हिन्दी" — only languages a teacher has approved for this unit. */
function LangSwitch({ u, look, onLang }: { u: UnitDetail; look: Look; onLang: (l: string) => void }) {
  const many = (u.languages?.length ?? 0) > 1;
  return (
    <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mb: 2 }} role="group" aria-label="Lesson language and settings">
      {many && <Translate sx={{ fontSize: 18, color: look.ink2 }} />}
      {(many ? u.languages! : []).map((l) => {
        const on = (u.lang ?? 'en') === l;
        return (
          <ButtonBase key={l} onClick={() => !on && onLang(l)} aria-pressed={on} lang={l} sx={{ px: 1.5, py: 0.5, borderRadius: 999, fontWeight: 800, fontSize: 14, border: `2px solid ${on ? look.primary : look.line}`, bgcolor: on ? look.primary : '#fff', color: on ? '#fff' : look.ink }}>
            {LANGUAGES[l]?.native ?? l}
          </ButtonBase>
        );
      })}
      <Box sx={{ flex: 1 }} />
      <LearnSettingsButton look={look} />
    </Stack>
  );
}

/** Pictures-first learners see the start of long text, with "Read more". */
function ShortText({ html, sx, on }: { html: string; sx: object; on: boolean }) {
  const [open, setOpen] = useState(false);
  const plain = html.replace(/<[^>]+>/g, '');
  const first = html.match(/^[\s\S]*?<\/(p|ul|ol|blockquote|table)>/)?.[0];
  if (!on || open || plain.length < 380 || !first || first.length >= html.length - 20) return <Html html={html} sx={sx} />;
  return (
    <>
      <Html html={first} sx={sx} />
      <Button size="small" onClick={() => setOpen(true)} sx={{ mt: 1 }}>
        Read more
      </Button>
    </>
  );
}

const scaled = (sx: Record<string, unknown>, k: number) => (k === 1 ? sx : { ...sx, fontSize: typeof sx.fontSize === 'number' ? Math.round(sx.fontSize * k) : sx.fontSize });

function Lesson({ look, u, onLang }: { look: Look; u: UnitDetail; onLang: (l: string) => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const course = useGet<CourseDetail>(`/courses/${u.course._id}`);
  const parts = useMemo(() => lessonParts(u), [u]);
  const [celebrate, setCelebrate] = useState(false);
  const inv = [`/units/${u._id}`, '/courses', '/dashboard', '/rewards'];
  const complete = useSend<{ done: boolean }>('post', () => `/units/${u._id}/complete`, { invalidate: inv });
  const undo = useSend<{ done: boolean }>('delete', () => `/units/${u._id}/complete`, { invalidate: inv });
  const chapter = course.data?.chapters.find((c) => c._id === u.chapter._id);
  const units = chapter?.units ?? [];
  const index = units.findIndex((x) => x._id === u._id);
  const doneCount = units.filter((x) => x.completed || (x._id === u._id && u.completed)).length;
  const little = look.band === 'little';
  const senior = look.band === 'senior';
  const color = look.tiles[parseInt(u.course._id.slice(-2), 16) % look.tiles.length];
  // Personal settings: language, listening, text size, pictures first, calm
  const { prefs } = usePrefs();
  const listen = little || prefs.readAloud || prefs.learnWay === 'listening';
  const pictures = prefs.learnWay === 'pictures';
  const textScale = TEXT_SCALE[prefs.textSize] ?? 1;
  const csx = (c: string): object => scaled(contentSx(look, c) as Record<string, unknown>, textScale);
  const sayIt = (t: string) => {
    if (!speak(t, u.lang)) toast.info(`This device has no ${LANGUAGES[u.lang ?? 'en']?.name ?? ''} voice yet, so it may read in English.`);
  };
  // Quick checks: the lesson opens part by part as each check is answered
  const [passed, setPassed] = useState<Set<string>>(() => new Set(Object.entries(u.checks ?? {}).filter(([, v]) => v.passed).map(([k]) => k)));
  const gateAt = parts.findIndex((p) => p.kind === 'check' && !passed.has(p.b._id ?? ''));
  const shown = gateAt >= 0 ? parts.slice(0, gateAt + 1) : parts;
  const locked = gateAt >= 0;
  const hiddenCount = locked ? parts.length - gateAt - 1 : 0;
  const pass = (p: Extract<Part, { kind: 'check' }>) => {
    setPassed((x) => new Set([...x, p.b._id ?? '']));
    const next = parts[parts.indexOf(p) + 1];
    if (next) setTimeout(() => document.getElementById(next.id)?.scrollIntoView({ behavior: prefs.calm ? 'auto' : 'smooth', block: 'start' }), 350);
  };
  const checkCard = (p: Extract<Part, { kind: 'check' }>, c: string) => (
    <Card key={p.id} id={p.id} sx={{ scrollMarginTop: 80, border: `${little ? 3 : 2}px solid ${tint(c, 0.35)}`, bgcolor: tint(c, 0.04) }}>
      <CardContent sx={{ p: little ? { xs: 2.5, md: 3.5 } : { xs: 2.25, md: 3 } }}>
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: c, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          {p.title ?? 'Quick check'}
        </Typography>
        <QuickCheck b={p.b} unitId={u._id} lang={u.lang} passed={passed.has(p.b._id ?? '')} onPassed={() => pass(p)} color={c} radius={radius} big={little} calm={prefs.calm} onListen={listen ? sayIt : undefined} onAskNano={askNano} />
      </CardContent>
    </Card>
  );

  const askNano = async () => {
    try {
      const r = await api.post<AiChat>('/ai/chats', { unitId: u._id });
      navigate(`${S}/nanobot?chat=${r.data._id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const finish = () =>
    complete.mutate(
      { done: true },
      {
        onSuccess: () => {
          if (little) setCelebrate(true);
          else {
            toast.success(`Lesson complete · +10 ${look.words.points}`);
            if (u.next) navigate(`${S}/units/${u.next._id}`);
          }
        },
      },
    );
  const readAll = () => sayIt([u.title, u.summary, ...shown.map((s) => `${s.title ?? ''}. ${s.text}`)].filter(Boolean).join('. '));
  const radius = little ? 26 : senior ? 10 : 16;
  const mediaLabel = (b: UnitBlock) => (little ? BLOCK_META[b.kind].student : BLOCK_META[b.kind].label);
  const notesHtml = (p: Extract<Part, { kind: 'media' }>, c: string) =>
    (p.notes ?? []).map((n) => (
      <Box key={n.id} sx={{ mt: 2 }}>
        {n.title && (
          <Typography
            component="h3"
            sx={{
              fontWeight: little ? 900 : 700,
              fontSize: little ? 19 : 16.5,
              mb: 1,
            }}
          >
            {n.title}
          </Typography>
        )}
        <Html html={n.html} sx={csx(c)} />
      </Box>
    ));
  // An activity's steps come before its worksheet buttons; other media come before their notes
  const mediaBody = (p: Extract<Part, { kind: 'media' }>, c: string) => {
    const media = <BlockMedia b={p.b} radius={radius} title={p.title ?? u.title} little={little} />;
    const buttonsLast = p.b.kind === 'activity' || p.b.kind === 'pdf' || p.b.kind === 'link';
    return (
      <>
        {!buttonsLast && media}
        {p.b.kind === 'activity' ? (p.notes ?? []).map((n) => <Html key={n.id} html={`${n.title ? `<h3>${esc(n.title)}</h3>` : ''}${n.html}`} sx={csx(c)} />) : notesHtml(p, c)}
        {buttonsLast && media && <Box sx={{ mt: p.notes?.length ? 2 : 0 }}>{media}</Box>}
      </>
    );
  };

  /* ---------------------------------------------------------------- Grades 8–10 */
  if (senior) {
    return (
      <Box
        sx={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 280px' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0, maxWidth: 820 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            <Box component={RouterLink} to={`${S}/courses/${u.course._id}`} sx={{ color: 'inherit' }}>
              {u.course.title}
            </Box>{' '}
            / {u.chapter.title}
          </Typography>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            {u.title}
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              color: 'text.secondary',
              mb: 3,
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="body2">
              Lesson {index + 1 || '–'} of {units.length || '–'} · about {u.durationMin ?? 10} min
            </Typography>
            {u.completed && <Chip size="small" color="success" variant="outlined" icon={<CheckCircle />} label="Completed" />}
          </Stack>
          {u.summary && (
            <Typography
              sx={{
                fontSize: 17.5,
                color: 'text.secondary',
                mb: 3,
                lineHeight: 1.6,
              }}
            >
              {u.summary}
            </Typography>
          )}
          <LangSwitch u={u} look={look} onLang={onLang} />
          <UnitGoals look={look} u={u as JU} />
          {shown.map((s) => (
            <Box key={s.id} id={s.id} sx={{ scrollMarginTop: 80, mb: s.kind === 'media' || s.kind === 'check' ? 4 : 3 }}>
              {s.kind === 'check' ? (
                checkCard(s, look.accent)
              ) : s.kind === 'media' ? (
                <>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
                    <Box
                      sx={{
                        color: look.accent,
                        display: 'flex',
                        '& svg': { fontSize: 20 },
                      }}
                    >
                      {BLOCK_ICON[s.b.kind]}
                    </Box>
                    <Typography variant="h6" component="h2" sx={{ fontSize: '1.15rem' }}>
                      {s.title ?? BLOCK_META[s.b.kind].label}
                    </Typography>
                  </Stack>
                  {mediaBody(s, color)}
                </>
              ) : (
                <>
                  {s.title && (
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.25 }}>
                      <Typography variant="h6" component="h2" sx={{ fontSize: '1.15rem', flex: 1 }}>
                        {s.title}
                      </Typography>
                      {listen && s.text && (
                        <Tooltip title="Listen">
                          <IconButton size="small" onClick={() => sayIt(`${s.title}. ${s.text}`)} aria-label={`Listen to ${s.title}`}>
                            <VolumeUp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                  <ShortText html={s.html} sx={csx(color)} on={pictures} />
                </>
              )}
            </Box>
          ))}
          {locked && (
            <Box sx={{ mb: 3 }}>
              <LockedRest color={look.accent} radius={radius} count={hiddenCount} />
            </Box>
          )}
          {!locked && <UnitActivities look={look} u={u as JU} />}
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${look.line}`,
              pt: 2.5,
              mt: 1,
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Button startIcon={<ArrowBack />} disabled={!u.prev} component={RouterLink} to={u.prev ? `${S}/units/${u.prev._id}` : '#'}>
              Previous
            </Button>
            {locked ? (
              <Typography variant="body2" color="text.secondary">
                Answer the quick check to finish
              </Typography>
            ) : u.completed ? (
              <Button color="inherit" onClick={() => undo.mutate({ done: false })} sx={{ color: 'text.secondary' }}>
                Mark as not done
              </Button>
            ) : (
              <Button variant="contained" startIcon={<CheckCircle />} onClick={finish} disabled={complete.isPending}>
                Mark as complete{u.next ? ' and continue' : ''}
              </Button>
            )}
            <Button endIcon={<ArrowForward />} disabled={!u.next} component={RouterLink} to={u.next ? `${S}/units/${u.next._id}` : '#'}>
              Next
            </Button>
          </Stack>
        </Box>
        <Stack spacing={2.5} sx={{ position: { lg: 'sticky' }, top: { lg: 84 } }}>
          {parts.length > 1 && (
            <Card>
              <CardContent>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  On this page
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                  {shown
                    .filter((s) => s.title || s.kind === 'media')
                    .map((s) => (
                      <Box
                        key={s.id}
                        component="a"
                        href={`#${s.id}`}
                        sx={{
                          py: 0.5,
                          fontSize: 14,
                          color: 'text.secondary',
                          textDecoration: 'none',
                          display: 'flex',
                          gap: 0.75,
                          alignItems: 'center',
                          '&:hover': { color: 'text.primary' },
                          '& svg': { fontSize: 16 },
                        }}
                      >
                        {s.kind === 'media' && BLOCK_ICON[s.b.kind]}
                        {s.title ?? (s.kind === 'media' ? BLOCK_META[s.b.kind].label : '')}
                      </Box>
                    ))}
                </Stack>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {u.chapter.title}
              </Typography>
              <LinearProgress variant="determinate" value={units.length ? (doneCount / units.length) * 100 : 0} sx={{ my: 1 }} />
              <Stack spacing={0.25}>
                {units.map((x, i) => (
                  <Box
                    key={x._id}
                    component={RouterLink}
                    to={`${S}/units/${x._id}`}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      py: 0.5,
                      fontSize: 14,
                      textDecoration: 'none',
                      color: x._id === u._id ? 'text.primary' : 'text.secondary',
                      fontWeight: x._id === u._id ? 600 : 400,
                    }}
                  >
                    {x.completed || (x._id === u._id && u.completed) ? <CheckCircle sx={{ fontSize: 17, color: 'success.main' }} /> : <Box sx={{ width: 17, textAlign: 'center', fontSize: 12.5 }}>{i + 1}</Box>}
                    <span>{x.title}</span>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
          <Button variant="outlined" startIcon={<SmartToy />} onClick={askNano}>
            Ask the AI tutor about this lesson
          </Button>
        </Stack>
      </Box>
    );
  }

  /* ---------------------------------------------------------------- Grades 1–7 */
  return (
    <Box sx={{ maxWidth: little ? 1000 : 960, mx: 'auto' }}>
      {/* Top: back + where you are in the chapter */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Button
          component={RouterLink}
          to={`${S}/courses/${u.course._id}`}
          startIcon={<ArrowBack />}
          variant={little ? 'contained' : 'text'}
          sx={
            little
              ? {
                  bgcolor: '#fff',
                  color: look.ink,
                  boxShadow: '0 4px 0 rgba(40,30,80,0.08)',
                  '&:hover': { bgcolor: '#fff' },
                }
              : { ml: -1 }
          }
        >
          {little ? 'Back' : u.course.title}
        </Button>
        <Box sx={{ flex: 1 }} />
        {units.length > 0 && (
          <Stack direction="row" spacing={little ? 0.75 : 0.5} sx={{ alignItems: 'center' }} aria-label={`Lesson ${index + 1} of ${units.length}`}>
            {units.map((x, i) => {
              const done = x.completed || (x._id === u._id && u.completed);
              const here = x._id === u._id;
              return little ? (
                <Tooltip key={x._id} title={x.title}>
                  <ButtonBase
                    component={RouterLink}
                    to={`${S}/units/${x._id}`}
                    sx={{
                      width: here ? 44 : 34,
                      height: here ? 44 : 34,
                      borderRadius: '50%',
                      bgcolor: done ? '#FFC928' : here ? color : '#fff',
                      color: here && !done ? '#fff' : look.ink,
                      fontWeight: 900,
                      fontSize: 15,
                      boxShadow: '0 3px 0 rgba(40,30,80,0.1)',
                      border: here ? '3px solid #fff' : 'none',
                    }}
                  >
                    {done ? <StarIcon size={here ? 26 : 22} color="#fff" /> : i + 1}
                  </ButtonBase>
                </Tooltip>
              ) : (
                <Tooltip key={x._id} title={x.title}>
                  <Box
                    component={RouterLink}
                    to={`${S}/units/${x._id}`}
                    sx={{
                      width: here ? 28 : 18,
                      height: 8,
                      borderRadius: 999,
                      bgcolor: done ? look.primary : here ? tint(look.primary, 0.5) : look.line,
                    }}
                  />
                </Tooltip>
              );
            })}
          </Stack>
        )}
      </Stack>

      {/* Lesson title */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: `${look.radius}px`,
          bgcolor: little ? color : '#fff',
          color: little ? '#fff' : look.ink,
          p: { xs: 2.5, md: little ? 4 : 3 },
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          boxShadow: little ? `0 8px 0 ${shade(color, 0.2)}` : '0 1px 2px rgba(20,20,50,0.05), 0 4px 16px rgba(20,20,50,0.05)',
        }}
      >
        {little && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              right: -60,
              top: -60,
              width: 240,
              height: 240,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.14)',
            }}
          />
        )}
        <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: little ? 900 : 700,
              opacity: little ? 0.9 : 1,
              color: little ? 'inherit' : look.primary,
              mb: 0.5,
              fontSize: little ? 16 : 14,
            }}
          >
            {little ? `Lesson ${index + 1 || ''}` : `${u.chapter.title} · Lesson ${index + 1 || '–'} of ${units.length || '–'}`}
          </Typography>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              color: 'inherit',
              fontSize: little ? { xs: '2rem', md: '2.6rem' } : undefined,
              lineHeight: 1.1,
              mb: 1.5,
            }}
          >
            {u.title}
          </Typography>
          {u.summary && (
            <Typography
              sx={{
                fontSize: little ? 18 : 16,
                opacity: little ? 0.95 : 1,
                color: little ? 'inherit' : 'text.secondary',
                mb: 2,
                maxWidth: 600,
              }}
            >
              {u.summary}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip
              icon={<Schedule />}
              label={`${u.durationMin ?? 10} min`}
              sx={
                little
                  ? {
                      bgcolor: 'rgba(255,255,255,0.22)',
                      color: '#fff',
                      '& .MuiChip-icon': { color: '#fff' },
                    }
                  : undefined
              }
            />
            {u.completed && (
              <Chip
                icon={<CheckCircle />}
                label={little ? 'Done!' : 'Completed'}
                color="success"
                sx={
                  little
                    ? {
                        bgcolor: '#fff',
                        color: '#178A52',
                        '& .MuiChip-icon': { color: '#23B26D' },
                      }
                    : undefined
                }
              />
            )}
            {listen && (
              <Button
                onClick={readAll}
                startIcon={<VolumeUp />}
                sx={{
                  bgcolor: '#fff',
                  color: color,
                  '&:hover': { bgcolor: '#fff' },
                  minHeight: 40,
                }}
              >
                Listen to the lesson
              </Button>
            )}
          </Stack>
        </Box>
        {(look.art || look.mascot) && (
          <Box
            sx={{
              position: 'relative',
              display: { xs: 'none', sm: 'block' },
              flexShrink: 0,
            }}
          >
            <NanoFor look={look} size={little ? 170 : 100} />
          </Box>
        )}
      </Box>

      <LangSwitch u={u} look={look} onLang={onLang} />
      <UnitGoals look={look} u={u as JU} />

      {/* Lesson parts */}
      <Stack spacing={little ? 3 : 2.5} sx={{ mb: 3 }}>
        {shown.map((s, i) => {
          if (s.kind === 'check') return checkCard(s, look.tiles[(i + 4) % look.tiles.length]);
          if (s.kind === 'media') {
            const c = look.tiles[(i + 2) % look.tiles.length];
            return (
              <Card
                key={s.id}
                id={s.id}
                sx={{
                  scrollMarginTop: 80,
                  ...(little ? { border: `3px solid ${tint(c, 0.3)}` } : {}),
                }}
              >
                <CardContent
                  sx={{
                    p: little ? { xs: 2.5, md: 3.5 } : { xs: 2.25, md: 3 },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: little ? 2 : 1.5 }}>
                    <Box
                      sx={{
                        width: little ? 52 : 38,
                        height: little ? 52 : 38,
                        borderRadius: little ? '16px' : '11px',
                        bgcolor: little ? c : tint(c, 0.13),
                        color: little ? '#fff' : c,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        boxShadow: little ? `0 4px 0 ${shade(c, 0.25)}` : 'none',
                        '& svg': { fontSize: little ? 30 : 22 },
                      }}
                    >
                      {BLOCK_ICON[s.b.kind]}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {s.title && (
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: c,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            lineHeight: 1.2,
                          }}
                        >
                          {mediaLabel(s.b)}
                        </Typography>
                      )}
                      <Typography variant={little ? 'h5' : 'h6'} component="h2" sx={{ lineHeight: 1.2 }}>
                        {s.title ?? mediaLabel(s.b)}
                      </Typography>
                    </Box>
                    {listen && s.text.replace(/[.\s]/g, '') && (
                      <Tooltip title="Listen">
                        <IconButton
                          onClick={() => sayIt(`${s.title ?? ''}. ${s.text}`)}
                          aria-label={`Listen to ${s.title ?? mediaLabel(s.b)}`}
                          sx={{
                            bgcolor: tint(c, 0.12),
                            color: c,
                            width: 46,
                            height: 46,
                          }}
                        >
                          <VolumeUp />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  {mediaBody(s, c)}
                </CardContent>
              </Card>
            );
          }
          const st = partStyle(look, s.title, i);
          return (
            <Card
              key={s.id}
              id={s.id}
              sx={{
                scrollMarginTop: 80,
                ...(little ? { border: `3px solid ${tint(st.color, 0.3)}` } : {}),
              }}
            >
              <CardContent sx={{ p: little ? { xs: 2.5, md: 3.5 } : { xs: 2.25, md: 3 } }}>
                {s.title && (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: little ? 2 : 1.5 }}>
                    <Box
                      sx={{
                        width: little ? 52 : 38,
                        height: little ? 52 : 38,
                        borderRadius: little ? '16px' : '11px',
                        bgcolor: little ? st.color : tint(st.color, 0.13),
                        color: little ? '#fff' : st.color,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        boxShadow: little ? `0 4px 0 ${shade(st.color, 0.25)}` : 'none',
                        '& svg': { fontSize: little ? 30 : 22 },
                      }}
                    >
                      {st.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {little && st.label.toLowerCase() !== (s.title ?? '').toLowerCase() && (
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: st.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            lineHeight: 1.2,
                          }}
                        >
                          {st.label}
                        </Typography>
                      )}
                      <Typography variant={little ? 'h5' : 'h6'} component="h2" sx={{ lineHeight: 1.2 }}>
                        {s.title}
                      </Typography>
                    </Box>
                    {listen && s.text && (
                      <Tooltip title="Listen">
                        <IconButton
                          onClick={() => sayIt(`${s.title}. ${s.text}`)}
                          aria-label={`Listen to ${s.title}`}
                          sx={{
                            bgcolor: tint(st.color, 0.12),
                            color: st.color,
                            width: 46,
                            height: 46,
                          }}
                        >
                          <VolumeUp />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                )}
                <ShortText html={s.html} sx={csx(st.color)} on={pictures} />
              </CardContent>
            </Card>
          );
        })}
        {locked && <LockedRest color={look.primary} radius={look.radius} count={hiddenCount} />}
      </Stack>

      {!locked && <UnitActivities look={look} u={u as JU} />}

      {/* Stuck? Ask Nano */}
      <Card
        sx={{
          mb: 3,
          bgcolor: little ? '#F3EEFF' : look.soft,
          boxShadow: 'none',
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            {look.art || look.mascot ? <NanoFor look={look} size={little ? 76 : 48} wave={false} /> : <SmartToy sx={{ color: look.primary, fontSize: 36 }} />}
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontWeight: little ? 900 : 700,
                  fontSize: little ? 18 : 16,
                }}
              >
                {little ? 'Stuck? Ask Nano!' : 'Have a question?'}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{little ? 'Nano can explain this lesson in easy words.' : `${look.words.nanobot} can explain this lesson or quiz you on it.`}</Typography>
            </Box>
            <Button variant="outlined" onClick={askNano} startIcon={<SmartToy />}>
              {look.words.nanobot}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Finish */}
      <Stack spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
        {locked ? (
          <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>{little ? 'Answer the question above to finish 🔒' : 'Answer the quick check to finish this lesson'}</Typography>
        ) : u.completed ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CheckCircle sx={{ color: '#23B26D', fontSize: little ? 36 : 26 }} />
            <Typography
              sx={{
                fontWeight: little ? 900 : 700,
                fontSize: little ? 20 : 16,
              }}
            >
              {little ? 'You finished this lesson!' : 'Lesson complete'}
            </Typography>
            {!little && (
              <Button size="small" color="inherit" sx={{ color: 'text.secondary' }} onClick={() => undo.mutate({ done: false })}>
                Undo
              </Button>
            )}
          </Stack>
        ) : (
          <Button
            variant="contained"
            onClick={finish}
            disabled={complete.isPending}
            startIcon={little ? <StarIcon size={30} /> : <CheckCircle />}
            sx={
              little
                ? {
                    bgcolor: '#23B26D',
                    color: '#fff',
                    fontSize: 22,
                    py: 2,
                    px: 5,
                    boxShadow: '0 6px 0 #178A52',
                    '&:hover': {
                      bgcolor: '#1FA262',
                      boxShadow: '0 6px 0 #178A52',
                    },
                  }
                : { px: 3 }
            }
          >
            {little ? 'I finished! +10 stars' : `Mark complete · +10 XP`}
          </Button>
        )}
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <LessonNav dir="prev" look={look} to={u.prev ? `${S}/units/${u.prev._id}` : undefined} title={u.prev?.title} />
        <LessonNav dir="next" look={look} to={u.next ? `${S}/units/${u.next._id}` : undefined} title={u.next?.title} />
      </Stack>

      {little && (
        <Dialog open={celebrate} onClose={() => setCelebrate(false)} maxWidth="xs" fullWidth>
          <DialogContent
            sx={{
              textAlign: 'center',
              pt: 4,
              pb: 3.5,
              background: `linear-gradient(180deg, ${tint(look.accent, 0.25)} 0%, #fff 60%)`,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mb: 1 }}>
              <StarIcon size={34} />
              <StarIcon size={48} />
              <StarIcon size={34} />
            </Stack>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <NanoFor look={look} size={150} />
            </Box>
            <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
              Great job!
            </Typography>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                color: 'text.secondary',
                mb: 3,
              }}
            >
              You earned 10 stars.
            </Typography>
            <Stack spacing={1.5}>
              {u.next && (
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => {
                    setCelebrate(false);
                    navigate(`${S}/units/${u.next!._id}`);
                  }}
                >
                  Next lesson
                </Button>
              )}
              <Button
                size="large"
                startIcon={<Home />}
                onClick={() => {
                  setCelebrate(false);
                  navigate(S);
                }}
              >
                Go home
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}

function LessonNav({ dir, look, to, title }: { dir: 'prev' | 'next'; look: Look; to?: string; title?: string }) {
  const little = look.band === 'little';
  if (!to) return <Box sx={{ flex: 1 }} />;
  return (
    <ButtonBase
      component={RouterLink}
      to={to}
      sx={{
        flex: 1,
        maxWidth: 380,
        justifyContent: dir === 'prev' ? 'flex-start' : 'flex-end',
        textAlign: dir === 'prev' ? 'left' : 'right',
        gap: 1.5,
        p: little ? 1.5 : 1.25,
        borderRadius: little ? 4 : 2,
        bgcolor: '#fff',
        boxShadow: little ? '0 4px 0 rgba(40,30,80,0.07)' : `inset 0 0 0 1px ${look.line}`,
      }}
    >
      {dir === 'prev' && <ArrowBack sx={{ color: look.primary }} />}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 700 }}>{dir === 'prev' ? 'Previous' : 'Next'}</Typography>
        <Typography noWrap sx={{ fontWeight: little ? 900 : 700 }}>
          {title}
        </Typography>
      </Box>
      {dir === 'next' && <ArrowForward sx={{ color: look.primary }} />}
    </ButtonBase>
  );
}
