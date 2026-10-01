/**
 * The learning journey for students, styled by age band:
 *   UnitJourney        "Today you will…" objectives and the outcome activities on a lesson page
 *   MissionPage        the Genius Quest: the termly check of the 8 Genius Habits
 *   KnowYourselfPage   the psychometric profile (a separate part): answers, then "my profile"
 *   ToolDemoPage       the built-in stand-in for Super Tutor / Debating App until the real app is connected
 *   StudentPortfolioPage  my work, my skills, my outcomes, and choosing work for the year showcase
 *   NextTurnCard       "Your next turn" guidance for the home page
 */
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, FormControlLabel, LinearProgress, Slider, Stack, TextField, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircleRounded';
import Flag from '@mui/icons-material/FlagRounded';
import Quiz from '@mui/icons-material/QuizRounded';
import Construction from '@mui/icons-material/ConstructionRounded';
import CoPresent from '@mui/icons-material/CoPresentRounded';
import EditNote from '@mui/icons-material/EditNoteRounded';
import Extension from '@mui/icons-material/ExtensionRounded';
import Close from '@mui/icons-material/CloseRounded';
import StarOutline from '@mui/icons-material/StarOutlineRounded';
import Star from '@mui/icons-material/StarRounded';
import Explore from '@mui/icons-material/ExploreRounded';
import ArrowForward from '@mui/icons-material/ArrowForwardRounded';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '@/api/client';
import type { UnitDetail } from '@/api/types';
import {
  ACTIVITY_LABEL,
  BAND_LABEL,
  stageLabel,
  type Activity,
  type ActivityKind,
  type Advice,
  type Evidence,
  type EvidenceMedia,
  LANG_NAMES,
  type Framework,
  type MyMission,
  type Objective,
  type Portfolio,
  type PsyProfile,
  type CogProfile,
  type AssessmentItem,
  type Tool,
  type UnitOutcome,
} from '@/api/journey';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { QueryState, UploadButton } from '@/components/ui';
import { BandChip, GuidanceList, PortfolioView } from '@/components/JourneyViews';
import { QuestMedia, mediaKindOf } from '@/components/QuestMedia';
import { PsyProfileView } from '@/components/PsychometricViews';
import { CogProfileView } from '@/components/CognitiveViews';
import { NanoFor } from './art';
import { shade, tint, type Look } from './looks';
import { speak, useLook } from './useLook';
import { S } from './widgets';

type JourneyUnit = UnitDetail & { objectives?: Objective[]; activities?: Activity[]; outcome?: UnitOutcome | null; tools?: Tool[] };

const KIND_ICON: Record<ActivityKind, ReactNode> = { quiz: <Quiz />, project: <Construction />, presentation: <CoPresent />, reflection: <EditNote />, tool: <Extension /> };
const LITTLE_KIND: Record<ActivityKind, string> = { quiz: 'Quiz game', project: 'Make it!', presentation: 'Show and tell', reflection: 'Think about it', tool: 'Play and learn' };

function Panel({ look, title, icon, children }: { look: Look; title: string; icon: ReactNode; children: ReactNode }) {
  const little = look.band === 'little';
  return (
    <Card sx={{ mb: 3, ...(little ? { border: `3px solid ${tint(look.primary, 0.25)}` } : {}) }}>
      <CardContent sx={{ p: little ? { xs: 2.5, md: 3.5 } : { xs: 2.25, md: 3 } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: little ? 50 : 36,
              height: little ? 50 : 36,
              borderRadius: little ? '16px' : '10px',
              bgcolor: little ? look.primary : tint(look.primary, 0.12),
              color: little ? '#fff' : look.primary,
              display: 'grid',
              placeItems: 'center',
              boxShadow: little ? `0 4px 0 ${shade(look.primary, 0.25)}` : 'none',
              '& svg': { fontSize: little ? 28 : 21 },
            }}
          >
            {icon}
          </Box>
          <Typography variant={little ? 'h5' : 'h6'} component="h2">
            {title}
          </Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

/** "Today you will…": the unit's learning objectives with how far the student has got. */
export function UnitGoals({ look, u }: { look: Look; u: JourneyUnit }) {
  const objectives = u.objectives ?? [];
  if (!objectives.length) return null;
  const little = look.band === 'little';
  const out = new Map((u.outcome?.objectives ?? []).map((o) => [o.objectiveId, o]));
  return (
    <Panel look={look} title={little ? 'Today you will…' : look.band === 'senior' ? 'Learning objectives' : 'By the end you will be able to'} icon={<Flag />}>
      <Stack spacing={little ? 1.5 : 1}>
        {objectives.map((o, i) => {
          const x = out.get(o._id);
          const done = x?.band === 'mastered' || x?.band === 'achieved';
          return (
            <Stack
              key={o._id}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'flex-start', p: little ? 1.5 : 1.25, borderRadius: little ? '18px' : '10px', bgcolor: done ? tint('#2FB36B', 0.1) : little ? tint(look.tiles[i % look.tiles.length], 0.1) : look.soft }}
            >
              <Box
                sx={{
                  width: little ? 36 : 26,
                  height: little ? 36 : 26,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: little ? 18 : 13,
                  bgcolor: done ? '#2FB36B' : little ? look.tiles[i % look.tiles.length] : '#fff',
                  color: done || little ? '#fff' : look.ink,
                  border: done || little ? 'none' : `1.5px solid ${look.line}`,
                }}
              >
                {done ? <CheckCircle sx={{ fontSize: little ? 24 : 18 }} /> : i + 1}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: little ? 850 : 600, fontSize: little ? 19 : 15.5 }}>{o.title}</Typography>
                {o.description && !little && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {o.description}
                  </Typography>
                )}
                {o.criteria && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, fontSize: little ? 16 : 13.5 }}>
                    {little ? '⭐ ' : 'Success looks like: '}
                    {o.criteria}
                  </Typography>
                )}
              </Box>
              {x && x.band && (little ? <Chip label={done ? 'Done!' : BAND_LABEL[x.band]} sx={{ bgcolor: done ? '#2FB36B' : '#FFC928', color: done ? '#fff' : look.ink, fontWeight: 800 }} /> : <BandChip band={x.band} score={x.score} />)}
            </Stack>
          );
        })}
      </Stack>
      {u.outcome?.score != null && !little && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Outcome for this unit
          </Typography>
          <LinearProgress variant="determinate" value={u.outcome.score} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
          <BandChip band={u.outcome.band} score={u.outcome.score} />
        </Stack>
      )}
    </Panel>
  );
}

const kindOf = (url: string): EvidenceMedia['kind'] => (/\.(png|jpe?g|webp|gif|heic)$/i.test(url) ? 'photo' : /\.(mp4|mov|webm)$/i.test(url) ? 'video' : 'file');

/** The outcome activities: quizzes, projects, presentations, reflections and tools. */
export function UnitActivities({ look, u }: { look: Look; u: JourneyUnit }) {
  const acts = u.activities ?? [];
  const me = useMe();
  const mine = useGet<Evidence[]>(acts.length ? `/students/${me._id}/evidence` : null);
  if (!acts.length) return null;
  const little = look.band === 'little';
  const state = new Map((u.outcome?.activities ?? []).map((a) => [a.activityId, a]));
  const evidence = (mine.data ?? []).filter((e) => e.unitId === u._id);
  return (
    <Panel look={look} title={little ? 'Show what you learned' : 'Show what you learned'} icon={<Construction />}>
      <Stack spacing={little ? 2 : 1.5}>
        {acts.map((a, i) => (
          <ActivityCard key={a._id} look={look} u={u} a={a} i={i} state={state.get(a._id)} evidence={evidence.find((e) => e.activityId === a._id)} tool={u.tools?.find((t) => t._id === a.toolId)} />
        ))}
      </Stack>
    </Panel>
  );
}

function ActivityCard({ look, u, a, i, state, evidence, tool }: { look: Look; u: JourneyUnit; a: Activity; i: number; state?: UnitOutcome['activities'][number]; evidence?: Evidence; tool?: Tool }) {
  const little = look.band === 'little';
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const color = look.tiles[(i + 2) % look.tiles.length];
  const objectives = (u.objectives ?? []).filter((o) => a.objectiveIds.includes(o._id));
  const status = state?.status ?? 'not_started';
  const scored = status === 'scored';
  const launch = async () => {
    try {
      const r = await api.post<{ url: string; builtin: boolean }>(`/units/${u._id}/activities/${a._id}/launch`);
      if (r.data.builtin) navigate(r.data.url.replace(/^\/student/, S));
      else window.open(r.data.url, '_blank', 'noopener');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const statusChip = scored ? (
    <Chip icon={<CheckCircle />} label={state?.score != null ? `${state.score}%` : 'Done'} sx={{ bgcolor: '#D3EEDD', color: '#1D6B3E', fontWeight: 700, '& .MuiChip-icon': { color: '#1D6B3E' } }} />
  ) : status === 'pending' ? (
    <Chip label={little ? 'Teacher is looking' : 'Waiting for teacher'} sx={{ bgcolor: '#EEEEF2', fontWeight: 600 }} />
  ) : status === 'returned' ? (
    <Chip label="Try again" sx={{ bgcolor: '#FCE0B8', color: '#86500A', fontWeight: 700 }} />
  ) : a.required === false ? (
    <Chip label="Optional" variant="outlined" />
  ) : null;

  let action: ReactNode = null;
  if (a.kind === 'quiz' && a.quizId)
    action = (
      <Button variant={scored ? 'outlined' : 'contained'} component={RouterLink} to={`${S}/quizzes/${a.quizId}`}>
        {scored ? 'Try again' : little ? 'Play the quiz' : 'Take the quiz'}
      </Button>
    );
  else if (a.kind === 'tool')
    action =
      tool?.connected === false ? (
        <Chip label="Coming soon" />
      ) : (
        <Button variant="contained" onClick={launch} startIcon={<Extension />}>
          {scored ? 'Play again' : `Open ${tool?.name ?? 'tool'}`}
        </Button>
      );
  else if (status !== 'scored')
    action = (
      <Button variant={open ? 'text' : 'contained'} onClick={() => setOpen(!open)}>
        {open ? 'Close' : status === 'pending' ? 'Replace my work' : status === 'returned' ? 'Send it again' : little ? 'Show my work' : 'Submit evidence'}
      </Button>
    );

  return (
    <Box sx={{ p: little ? 2 : 1.75, borderRadius: little ? '22px' : '12px', border: little ? `3px solid ${tint(color, 0.3)}` : `1px solid ${look.line}`, bgcolor: '#fff' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75} sx={{ alignItems: { sm: 'center' } }}>
        <Box
          sx={{
            width: little ? 56 : 42,
            height: little ? 56 : 42,
            borderRadius: little ? '18px' : '11px',
            bgcolor: little ? color : tint(color, 0.14),
            color: little ? '#fff' : color,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            boxShadow: little ? `0 4px 0 ${shade(color, 0.25)}` : 'none',
            '& svg': { fontSize: little ? 30 : 23 },
          }}
        >
          {KIND_ICON[a.kind]}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: little ? 13 : 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{little ? LITTLE_KIND[a.kind] : a.kind === 'tool' && tool ? tool.name : ACTIVITY_LABEL[a.kind]}</Typography>
          <Typography sx={{ fontWeight: little ? 900 : 650, fontSize: little ? 20 : 16 }}>{a.title}</Typography>
          {a.instructions && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: little ? 16 : 14, mt: 0.25 }}>
              {a.instructions}
            </Typography>
          )}
          {objectives.length > 0 && !little && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              Shows: {objectives.map((o) => o.title).join(' · ')}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {statusChip}
          {action}
        </Stack>
      </Stack>
      {evidence?.feedback && (
        <Alert severity={evidence.status === 'returned' ? 'warning' : 'success'} icon={false} sx={{ mt: 1.5, borderRadius: 2 }}>
          <b>{little ? 'Your teacher says: ' : 'Teacher feedback: '}</b>
          {evidence.feedback}
        </Alert>
      )}
      {open && <EvidenceForm look={look} u={u} a={a} onDone={() => setOpen(false)} />}
    </Box>
  );
}

function EvidenceForm({ look, u, a, onDone }: { look: Look; u: JourneyUnit; a: Activity; onDone: () => void }) {
  const little = look.band === 'little';
  const [media, setMedia] = useState<EvidenceMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [link, setLink] = useState('');
  const types = a.mediaTypes?.length ? a.mediaTypes : a.kind === 'reflection' ? [] : ['photo', 'video', 'file'];
  const accept = [types.includes('photo') && 'image/*', types.includes('video') && 'video/mp4,video/quicktime,video/webm', types.includes('file') && '.pdf,.pptx,.docx'].filter(Boolean).join(',');
  const send = useSend<{ media: EvidenceMedia[]; caption?: string }>('post', `/units/${u._id}/activities/${a._id}/evidence`, {
    success: little ? 'Sent to your teacher! ⭐' : 'Sent to your teacher for checking',
    invalidate: [`/units/${u._id}`, '/students', '/rewards'],
    onSuccess: onDone,
  });
  const all = [...media, ...(link.trim() ? [{ kind: 'link' as const, url: link.trim() }] : [])];
  const ok = all.length > 0 || caption.trim().length >= 3;
  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${look.line}` }}>
      {accept && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <UploadButton
            folder="evidence"
            accept={accept}
            label={little ? 'Add a photo or video' : media.length ? 'Add another file' : 'Upload photo, video or file'}
            onUploaded={(url, name) => setMedia((m) => [...m, { kind: kindOf(url), url, name }])}
          />
          {media.map((m, i) => (
            <Chip key={m.url} label={m.name || m.kind} onDelete={() => setMedia(media.filter((_, j) => j !== i))} deleteIcon={<Close />} />
          ))}
        </Stack>
      )}
      {types.includes('link') && <TextField size="small" fullWidth label="Or paste a link (for example a slide deck)" value={link} onChange={(e) => setLink(e.target.value)} sx={{ mb: 1.5 }} />}
      <TextField
        fullWidth
        multiline
        minRows={a.kind === 'reflection' ? 4 : 2}
        label={a.kind === 'reflection' ? (little ? 'What did you learn today?' : 'Your reflection') : little ? 'Tell your teacher about it' : 'Describe what you did'}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'flex-end' }}>
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="contained" disabled={!ok || send.isPending} onClick={() => send.mutate({ media: all, caption: caption.trim() || undefined })}>
          {little ? 'Send it!' : 'Submit'}
        </Button>
      </Stack>
    </Box>
  );
}

/** Both panels, for dropping into the lesson page. */
export function UnitJourney({ look, u }: { look: Look; u: UnitDetail }) {
  return (
    <>
      <UnitGoals look={look} u={u as JourneyUnit} />
      <UnitActivities look={look} u={u as JourneyUnit} />
    </>
  );
}

/* ================================================================ Genius Quest */

type Answer = { selected?: number[]; value?: number; text?: string; fileUrl?: string };

/** Words for each part: the Genius Quest (8 Genius Habits) or Know Yourself (psychometric profile). */
const COPY = {
  genius: {
    chip: (little: boolean) => (little ? 'Genius Quest' : 'Genius Quest · 8 Genius Habits'),
    none: 'There is no Genius Quest for your grade yet.',
    done: (little: boolean) => (little ? 'Quest complete!' : 'Genius Quest complete'),
    scored: 'Your Genius Tree has grown! See which habits are sprouting, blooming or bearing fruit, and what to grow next.',
    pending: 'Thank you! Your teacher will read your written answers, then your Genius Tree will be ready.',
    see: 'See my Genius Tree',
    consent: 'A parent needs to say yes before you start. Ask them to open Nanoskool and allow the Genius Quest.',
    intro: 'There are no wrong answers here. This helps your teachers know how you think, work with others and solve problems, so they can guide you better.',
    start: (little: boolean) => (little ? "Let's go!" : 'Start the Genius Quest'),
    finish: (little: boolean) => (little ? 'Finish!' : 'Finish the quest'),
  },
  psychometric: {
    chip: (little: boolean) => (little ? 'Know Yourself' : 'Know Yourself · psychometric profile'),
    none: 'There is no Know Yourself profile for your grade yet.',
    done: (little: boolean) => (little ? 'All done!' : 'Know Yourself complete'),
    scored: 'Thank you for being honest! Your profile shows your strengths and what you can grow next.',
    pending: 'Thank you! Your profile will be ready soon.',
    see: 'See my profile',
    consent: 'A parent needs to say yes before you start. Ask them to open Nanoskool and allow Know Yourself.',
    intro: 'Tell us what you are really like — there are no good or bad answers for “me” questions. A few puzzles check how you notice and think. This is not a test for marks.',
    start: (little: boolean) => (little ? "Let's start!" : 'Start Know Yourself'),
    finish: (little: boolean) => (little ? 'Finish!' : 'Finish'),
  },
  cognitive: {
    chip: (little: boolean) => (little ? 'Thinking Puzzles' : 'Thinking Puzzles · cognitive profile'),
    none: 'There are no Thinking Puzzles for your grade yet.',
    done: (little: boolean) => (little ? 'Puzzles done! 🎉' : 'Thinking Puzzles complete'),
    scored: 'Great thinking! See your thinking super powers and what to grow next.',
    pending: 'Thank you! Your thinking profile will be ready soon.',
    see: 'See my thinking strengths',
    consent: 'A parent needs to say yes before you start. Ask them to open Nanoskool and allow Thinking Puzzles.',
    intro: 'Short puzzles about noticing, patterns, clues, words, numbers and memory. Some hide a picture after a few seconds and some are timed. It is fine to get some wrong — this is not a test for marks.',
    start: (little: boolean) => (little ? "Let's play!" : 'Start Thinking Puzzles'),
    finish: (little: boolean) => (little ? 'Finish!' : 'Finish'),
  },
} as const;

export function MissionPage({ fw = 'genius' }: { fw?: Framework }) {
  const look = useLook();
  const [lang, setLang] = useState('en');
  const q = useGet<MyMission>('/assessment/me', fw !== 'genius' ? { framework: fw, lang } : undefined);
  return <QueryState q={q}>{(m) => <Mission key={fw} look={look} m={m} fw={fw} lang={lang} setLang={setLang} />}</QueryState>;
}

/** Know Yourself: the psychometric profile, separate from the Genius Quest. */
export function KnowYourselfPage() {
  return <MissionPage fw="psychometric" />;
}

/** Thinking Puzzles: the cognitive profile (Part 3), separate from the Genius Quest and Know Yourself. */
export function ThinkingPuzzlesPage() {
  return <MissionPage fw="cognitive" />;
}

function MyCogProfile() {
  const me = useMe();
  const q = useGet<CogProfile>(`/students/${me._id}/cognitive`);
  // Every student sees it in their own words (playful names, no adult notes); staff and parents see the full detail
  return <QueryState q={q}>{(p) => <CogProfileView p={p} audience="child" />}</QueryState>;
}

/** Working memory: shows something for a few seconds, then hides it. */
function Remember({ text, secs, look, little, onDone }: { text: string; secs: number; look: Look; little: boolean; onDone: () => void }) {
  const [left, setLeft] = useState(secs);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (left <= 0) {
      done.current();
      return;
    }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
      <Typography sx={{ fontWeight: 900, color: look.primary, fontSize: little ? 22 : 18 }}>{little ? '🧠 Remember this!' : 'Remember this'}</Typography>
      <Box
        sx={{
          px: 4,
          py: 3,
          borderRadius: little ? '24px' : '16px',
          bgcolor: tint(look.primary, 0.08),
          border: `2px dashed ${tint(look.primary, 0.4)}`,
          fontSize: little ? 40 : 32,
          fontWeight: 800,
          letterSpacing: '0.04em',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.4,
        }}
      >
        {text}
      </Box>
      <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
        It hides in {left} second{left === 1 ? '' : 's'}…
      </Typography>
      <LinearProgress variant="determinate" value={(left / secs) * 100} sx={{ width: '60%', height: 8, borderRadius: 999 }} />
      <Button onClick={onDone}>{little ? 'I remember it!' : 'Ready'}</Button>
    </Stack>
  );
}

/** Attention & speed: a gentle countdown; when it ends the puzzle closes. */
function PuzzleTimer({ secs, look, onEnd }: { secs: number; look: Look; onEnd: () => void }) {
  const [left, setLeft] = useState(secs);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (left <= 0) {
      end.current();
      return;
    }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const low = left <= 5;
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
      <Typography sx={{ fontWeight: 800, color: low ? '#C2410C' : look.primary, minWidth: 64 }}>⏱ {left}s</Typography>
      <LinearProgress variant="determinate" value={(left / secs) * 100} sx={{ flex: 1, height: 6, borderRadius: 999, '& .MuiLinearProgress-bar': { bgcolor: low ? '#EA580C' : look.primary } }} />
    </Stack>
  );
}

function MyPsyProfile({ look }: { look: Look }) {
  const me = useMe();
  const q = useGet<PsyProfile>(`/students/${me._id}/psychometric`);
  return <QueryState q={q}>{(p) => <PsyProfileView p={p} audience={look.band === 'little' ? 'child' : 'adult'} />}</QueryState>;
}

function Mission({ look, m, fw, lang, setLang }: { look: Look; m: MyMission; fw: Framework; lang: string; setLang: (l: string) => void }) {
  const little = look.band === 'little';
  const T = COPY[fw];
  const psy = fw === 'psychometric';
  const cog = fw === 'cognitive';
  const guarded = psy || cog; // asks the child to agree; results become a profile, not a Genius Tree
  const qs = fw === 'genius' ? '' : `?framework=${fw}`;
  const [seen, setSeen] = useState<Set<string>>(() => new Set((m.attempt?.answers ?? []).map((a) => a.itemId)));
  const [expired, setExpired] = useState<Set<string>>(() => new Set());
  const shownAt = useRef<Record<string, number>>({});
  const toast = useToast();
  const navigate = useNavigate();
  const [started, setStarted] = useState(!!m.attempt);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries((m.attempt?.answers ?? []).map((a) => [a.itemId, a])));
  const [result, setResult] = useState<{ status: string } | null>(null);
  const [assent, setAssent] = useState(false);
  const start = useSend<Record<string, unknown>>('post', `/assessment/me/start${qs}`, { onSuccess: () => setStarted(true) });
  const submit = useSend<void, { status: string }>('post', `/assessment/me/submit${qs}`, { invalidate: ['/assessment', '/students'], onSuccess: (r) => setResult(r) });
  const items = m.items;
  const item = items[i];

  const save = async (itemId: string, a: Answer) => {
    if (expired.has(itemId)) return;
    setAnswers((x) => ({ ...x, [itemId]: a }));
    const ms = cog && shownAt.current[itemId] ? Math.min(3_600_000, Date.now() - shownAt.current[itemId]) : undefined;
    try {
      await api.put(`/assessment/me/answers${qs}`, { itemId, ...a, ...(ms != null ? { ms } : {}) });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const shell = (children: ReactNode) => (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Card sx={little ? { border: `4px solid ${tint(look.primary, 0.25)}` } : undefined}>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>{children}</CardContent>
      </Card>
    </Box>
  );

  if (result)
    return shell(
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        {(look.art || look.mascot) && <NanoFor look={look} size={120} />}
        <Typography variant="h4">{T.done(little)}</Typography>
        <Typography color="text.secondary">{result.status === 'scored' ? T.scored : T.pending}</Typography>
        <Button variant="contained" onClick={() => (guarded ? setResult(null) : navigate(`${S}/portfolio`))}>
          {T.see}
        </Button>
      </Stack>,
    );

  if (!m.form)
    return shell(
      <Typography sx={{ textAlign: 'center' }} color="text.secondary">
        {T.none}
      </Typography>,
    );

  if (!m.due && !m.attempt && cog)
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip icon={<Explore />} label={T.chip(little)} sx={{ bgcolor: tint(look.primary, 0.12), color: look.primary, fontWeight: 700 }} />
          <Typography variant="body2" color="text.secondary">
            New puzzles open next term, so you can see your thinking grow.
          </Typography>
        </Stack>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          {little ? 'My thinking super powers' : 'My thinking strengths'}
        </Typography>
        <MyCogProfile />
      </Box>
    );

  if (!m.due && !m.attempt && psy)
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <Chip icon={<Explore />} label={T.chip(little)} sx={{ bgcolor: tint(look.primary, 0.12), color: look.primary, fontWeight: 700 }} />
          <Typography variant="body2" color="text.secondary">
            You can take it again next term to see how you have grown.
          </Typography>
        </Stack>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          {little ? 'All about me' : 'My Know Yourself profile'}
        </Typography>
        <MyPsyProfile look={look} />
      </Box>
    );

  if (!m.due && !m.attempt)
    return shell(
      <Stack spacing={2}>
        <Typography variant="h5">{m.form.title}</Typography>
        <Typography color="text.secondary">You finished your Genius Quest! The next one opens next term, so you can see how much your Genius Tree has grown.</Typography>
        {m.lastResult?.skillScores?.length ? (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {m.lastResult.skillScores.map((s) => (
              <Chip key={s.skillId} label={stageLabel(s.level)} />
            ))}
          </Stack>
        ) : null}
        <Button variant="contained" component={RouterLink} to={`${S}/portfolio`} sx={{ alignSelf: 'flex-start' }}>
          See my skills
        </Button>
      </Stack>,
    );

  if (!m.consent)
    return shell(
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h5">{m.form.title}</Typography>
        <Alert severity="info">{T.consent}</Alert>
      </Stack>,
    );

  if (!started)
    return shell(
      <Stack spacing={2.5} sx={{ alignItems: little ? 'center' : 'flex-start', textAlign: little ? 'center' : 'left' }}>
        {(look.art || look.mascot) && <NanoFor look={look} size={little ? 150 : 90} />}
        <Chip icon={<Explore />} label={T.chip(little)} sx={{ bgcolor: tint(look.primary, 0.12), color: look.primary, fontWeight: 700 }} />
        <Typography variant="h4" component="h1">
          {m.form.title}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: little ? 19 : 16 }}>{m.form.intro || T.intro}</Typography>
        <Typography variant="body2" color="text.secondary">
          {m.form.questionCount} questions{m.form.timeLimitMin ? ` · about ${m.form.timeLimitMin} minutes` : ''} · your answers save as you go
        </Typography>
        {guarded && (m.languages?.length ?? 0) > 1 && (
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Language:
            </Typography>
            {m.languages!.map((l) => (
              <Chip key={l} label={LANG_NAMES[l] ?? l} onClick={() => setLang(l)} color={l === (m.lang ?? lang) ? 'primary' : 'default'} variant={l === (m.lang ?? lang) ? 'filled' : 'outlined'} />
            ))}
          </Stack>
        )}
        {guarded && (
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: tint(look.primary, 0.06), border: `1.5px solid ${tint(look.primary, 0.2)}`, width: '100%' }}>
            <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: little ? 18 : 15 }}>{little ? 'Before we start' : 'Before you start'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: little ? 16 : 14 }}>
              {cog
                ? little
                  ? 'These puzzles show how you think. Everyone gets some wrong, and that is OK! You can stop any time.'
                  : 'Your results are seen only by you, your parents and your teachers — never by classmates. There is no mark, rank or IQ. You may stop at any time.'
                : little
                  ? 'Your answers help your teachers and family help you. You can skip a question, stop any time, and ask a grown-up to read with you.'
                  : 'Your answers are seen only by you, your parents, your teachers and the school counsellor — never by classmates. They are not marks. You may skip questions or stop at any time.'}
            </Typography>
            <FormControlLabel control={<Checkbox checked={assent} onChange={(e) => setAssent(e.target.checked)} />} label={little ? 'Yes, I want to take part 🙂' : 'I understand and I am happy to take part'} />
            {little && (
              <Button
                size="small"
                onClick={() =>
                  speak(
                    cog
                      ? 'These puzzles show how you think. Everyone gets some wrong, and that is OK! You can stop any time. Tick yes if you want to play.'
                      : 'Your answers help your teachers and family help you. You can skip a question, stop any time, and ask a grown-up to read with you. Tick yes if you want to take part.',
                  )
                }
              >
                🔊 Read to me
              </Button>
            )}
          </Box>
        )}
        <Button size="large" variant="contained" onClick={() => start.mutate(guarded ? { assent, lang: m.lang ?? lang } : {})} disabled={start.isPending || (guarded && !assent)} endIcon={<ArrowForward />}>
          {T.start(little)}
        </Button>
      </Stack>,
    );

  const a = item ? (answers[item._id] ?? {}) : {};
  const it = item as (AssessmentItem & { stimulus?: string; stimulusSec?: number; timeSec?: number }) | undefined;
  const remembering = cog && !!it?.stimulus && !seen.has(it._id);
  const isExpired = !!it && expired.has(it._id);
  if (it && !remembering && !shownAt.current[it._id]) shownAt.current[it._id] = Date.now();
  const answered = items.filter((x) => answers[x._id] && (answers[x._id].selected?.length || answers[x._id].value || answers[x._id].text || answers[x._id].fileUrl)).length;
  const last = i === items.length - 1;
  return shell(
    <>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: look.primary, whiteSpace: 'nowrap' }}>
          {i + 1} / {items.length}
        </Typography>
        <LinearProgress variant="determinate" value={((i + 1) / items.length) * 100} sx={{ flex: 1, height: little ? 14 : 8, borderRadius: 999 }} />
      </Stack>
      {it && remembering && <Remember key={it._id} text={it.stimulus!} secs={it.stimulusSec ?? 5} look={look} little={little} onDone={() => setSeen((x) => new Set(x).add(it._id))} />}
      {item && !remembering && (
        <>
          {cog && !!it?.timeSec && !isExpired && !a.selected?.length && <PuzzleTimer key={item._id} secs={it.timeSec} look={look} onEnd={() => setExpired((x) => new Set(x).add(item._id))} />}
          {isExpired && !a.selected?.length && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {little ? '⏰ Time’s up! On to the next puzzle.' : 'Time’s up for this puzzle — move on to the next one.'}
            </Alert>
          )}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}>
            <Typography variant={little ? 'h4' : 'h5'} component="h1" sx={{ flex: 1, lineHeight: 1.25 }}>
              {item.prompt}
            </Typography>
            {little && (
              <Button onClick={() => speak([item.prompt, ...(item.options ?? []).map((o) => o.text), ...(item.scaleLabels ?? [])].join('. '))} aria-label="Listen">
                🔊
              </Button>
            )}
          </Stack>
          {item.mediaUrl && (
            <Box sx={{ mb: 2.5 }}>
              {little && (
                <Typography sx={{ fontWeight: 800, color: look.primary, mb: 0.75 }}>{mediaKindOf(item.mediaUrl) === 'image' ? '👀 Look carefully!' : mediaKindOf(item.mediaUrl) === 'audio' ? '👂 Listen carefully!' : '🎬 Watch carefully!'}</Typography>
              )}
              <QuestMedia url={item.mediaUrl} radius={little ? 22 : 14} />
            </Box>
          )}

          {(item.type === 'single' || item.type === 'multiple') && (
            <Stack spacing={1.25}>
              {item.type === 'multiple' && (
                <Typography variant="body2" color="text.secondary">
                  Choose all that fit
                </Typography>
              )}
              {(item.options ?? []).map((o, k) => {
                const on = a.selected?.includes(k);
                return (
                  <Box
                    key={k}
                    role="button"
                    tabIndex={0}
                    aria-disabled={isExpired}
                    onClick={() => save(item._id, { selected: item.type === 'single' ? [k] : on ? a.selected!.filter((x) => x !== k) : [...(a.selected ?? []), k] })}
                    sx={{
                      p: little ? 2 : 1.5,
                      borderRadius: little ? '18px' : '10px',
                      cursor: isExpired ? 'default' : 'pointer',
                      opacity: isExpired && !on ? 0.5 : 1,
                      fontSize: little ? 19 : 15.5,
                      fontWeight: little ? 800 : 500,
                      border: '2px solid',
                      borderColor: on ? look.primary : look.line,
                      bgcolor: on ? tint(look.primary, 0.1) : '#fff',
                      transition: 'all .15s',
                    }}
                  >
                    {o.text}
                  </Box>
                );
              })}
            </Stack>
          )}
          {item.type === 'scale' && psy && (
            <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: `repeat(${(item.scaleLabels ?? []).length || 5}, 1fr)` } }}>
              {(item.scaleLabels ?? []).map((l, k) => {
                const on = a.value === k + 1;
                const faces = (item.scaleLabels ?? []).length === 3 ? ['🙁', '🙂', '😄'] : ['1', '2', '3', '4', '5'];
                return (
                  <Box
                    key={k}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    onClick={() => save(item._id, { value: k + 1 })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && save(item._id, { value: k + 1 })}
                    sx={{
                      p: little ? 2 : 1.5,
                      textAlign: 'center',
                      borderRadius: little ? '18px' : '10px',
                      cursor: 'pointer',
                      fontSize: little ? 18 : 14.5,
                      fontWeight: little ? 800 : 600,
                      border: '2px solid',
                      borderColor: on ? look.primary : look.line,
                      bgcolor: on ? tint(look.primary, 0.1) : '#fff',
                      transition: 'all .15s',
                    }}
                  >
                    <Box sx={{ fontSize: little ? 34 : 18, fontWeight: 800, color: look.primary, lineHeight: 1.2 }}>{faces[k] ?? k + 1}</Box>
                    {l}
                  </Box>
                );
              })}
            </Box>
          )}
          {item.type === 'scale' && !psy && (
            <Box sx={{ px: 2, pt: 2 }}>
              <Slider
                value={a.value ?? 0}
                min={1}
                max={(item.scaleLabels ?? []).length || 5}
                step={1}
                marks={(item.scaleLabels ?? []).map((l, k) => ({ value: k + 1, label: l }))}
                onChange={(_, v) => setAnswers((x) => ({ ...x, [item._id]: { value: v as number } }))}
                onChangeCommitted={(_, v) => save(item._id, { value: v as number })}
                sx={{ '& .MuiSlider-markLabel': { fontSize: little ? 15 : 13 } }}
              />
            </Box>
          )}
          {item.type === 'open' && (
            <TextField
              fullWidth
              multiline
              minRows={4}
              value={a.text ?? ''}
              onChange={(e) => setAnswers((x) => ({ ...x, [item._id]: { text: e.target.value } }))}
              onBlur={(e) => save(item._id, { text: e.target.value })}
              placeholder={little ? 'Write or ask a grown-up to help you write' : 'Write your answer'}
            />
          )}
          {item.type === 'upload' && (
            <Stack spacing={1.5}>
              <UploadButton folder="assessment" accept="image/*,video/mp4,.pdf" label={a.fileUrl ? 'Replace my file' : 'Upload a photo or file'} onUploaded={(url) => save(item._id, { ...a, fileUrl: url })} />
              {a.fileUrl && <Chip label="File added" color="success" sx={{ alignSelf: 'flex-start' }} />}
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Tell us about it (optional)"
                value={a.text ?? ''}
                onChange={(e) => setAnswers((x) => ({ ...x, [item._id]: { ...a, text: e.target.value } }))}
                onBlur={(e) => save(item._id, { ...a, text: e.target.value })}
              />
            </Stack>
          )}
        </>
      )}
      <Stack direction="row" sx={{ mt: 4, justifyContent: 'space-between', alignItems: 'center' }}>
        <Button disabled={i === 0 || remembering} onClick={() => setI(i - 1)}>
          Back
        </Button>
        <Typography variant="caption" color="text.secondary">
          {answered} answered
        </Typography>
        {last ? (
          <Button variant="contained" onClick={() => submit.mutate()} disabled={submit.isPending}>
            {T.finish(little)}
          </Button>
        ) : (
          <Button variant="contained" disabled={remembering} onClick={() => setI(i + 1)} endIcon={<ArrowForward />}>
            Next
          </Button>
        )}
      </Stack>
    </>,
  );
}

/** Home card: invites the student to the Genius Quest when it is due. */
export function MissionCard({ look }: { look: Look }) {
  const q = useGet<MyMission>('/assessment/me');
  const m = q.data;
  if (!m?.form || !(m.due || m.attempt)) return null;
  const little = look.band === 'little';
  return (
    <Card sx={{ mb: 3, background: little ? `linear-gradient(120deg, ${look.tiles[0]} 0%, ${look.tiles[3]} 100%)` : undefined, color: little ? '#fff' : undefined, border: little ? 'none' : `1.5px solid ${tint(look.primary, 0.3)}` }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: { xs: 2.25, md: 3 } }}>
        <Box
          sx={{
            width: little ? 64 : 44,
            height: little ? 64 : 44,
            borderRadius: '14px',
            bgcolor: little ? 'rgba(255,255,255,0.25)' : tint(look.primary, 0.12),
            color: little ? '#fff' : look.primary,
            display: 'grid',
            placeItems: 'center',
            '& svg': { fontSize: little ? 38 : 26 },
          }}
        >
          <Explore />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: little ? 1000 : 700, fontSize: little ? 22 : 17 }}>{m.attempt ? 'Finish your Genius Quest' : little ? 'A Genius Quest for you!' : 'Your Genius Quest is ready'}</Typography>
          <Typography sx={{ opacity: little ? 0.92 : 1, color: little ? 'inherit' : 'text.secondary' }}>
            {m.consent ? `${m.form.questionCount} questions to grow your 8 Genius Habits: how you think, create and work with others.` : 'Ask a parent to allow it first.'}
          </Typography>
        </Box>
        {m.consent && (
          <Button variant="contained" component={RouterLink} to={`${S}/assessment`} sx={little ? { bgcolor: '#fff', color: look.ink, '&:hover': { bgcolor: '#fff' } } : undefined}>
            {m.attempt ? 'Continue' : "Let's go"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Home card: invites the student to Know Yourself (psychometric profile) when it is due. */
export function KnowYourselfCard({ look }: { look: Look }) {
  const q = useGet<MyMission>('/assessment/me', { framework: 'psychometric' });
  const m = q.data;
  if (!m?.form || !(m.due || m.attempt) || !m.consent) return null;
  const little = look.band === 'little';
  return (
    <Card sx={{ mb: 3, border: `1.5px solid ${tint(look.primary, 0.3)}` }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: { xs: 2.25, md: 3 } }}>
        <Box sx={{ width: little ? 64 : 44, height: little ? 64 : 44, borderRadius: '14px', bgcolor: tint(look.primary, 0.12), display: 'grid', placeItems: 'center', fontSize: little ? 36 : 24 }}>🧭</Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: little ? 1000 : 700, fontSize: little ? 22 : 17 }}>{m.attempt ? 'Finish Know Yourself' : little ? 'Tell us all about you!' : 'Know Yourself is ready'}</Typography>
          <Typography color="text.secondary">{m.form.questionCount} questions about you, your body and your heart.</Typography>
        </Box>
        <Button variant="contained" component={RouterLink} to={`${S}/know-yourself`}>
          {m.attempt ? 'Continue' : 'Start'}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Home card: invites the student to Thinking Puzzles (cognitive profile) when they are due. */
export function ThinkingPuzzlesCard({ look }: { look: Look }) {
  const q = useGet<MyMission>('/assessment/me', { framework: 'cognitive' });
  const m = q.data;
  if (!m?.form || !(m.due || m.attempt) || !m.consent) return null;
  const little = look.band === 'little';
  return (
    <Card sx={{ mb: 3, border: `1.5px solid ${tint(look.primary, 0.3)}` }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: { xs: 2.25, md: 3 } }}>
        <Box sx={{ width: little ? 64 : 44, height: little ? 64 : 44, borderRadius: '14px', bgcolor: tint(look.primary, 0.12), display: 'grid', placeItems: 'center', fontSize: little ? 36 : 24 }}>🧩</Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: little ? 1000 : 700, fontSize: little ? 22 : 17 }}>{m.attempt ? 'Finish your Thinking Puzzles' : little ? 'Puzzle time! 🧩' : 'Thinking Puzzles are ready'}</Typography>
          <Typography color="text.secondary">{m.form.questionCount} short puzzles: sharp eyes, patterns, clues, words, numbers and memory.</Typography>
        </Box>
        <Button variant="contained" component={RouterLink} to={`${S}/thinking`}>
          {m.attempt ? 'Continue' : little ? "Let's play" : 'Start'}
        </Button>
      </CardContent>
    </Card>
  );
}

/** "Your next turn": the first few guidance steps for the student. */
export function NextTurnCard({ look }: { look: Look }) {
  const me = useMe();
  const q = useGet<Advice[]>(`/students/${me._id}/guidance`);
  const list = (q.data ?? []).filter((a) => a.key !== 'mission' && a.key !== 'consent');
  if (!list.length) return null;
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <Explore sx={{ color: look.primary }} />
          <Typography sx={{ fontWeight: look.band === 'little' ? 900 : 700, fontSize: look.band === 'little' ? 20 : 16 }}>{look.band === 'little' ? 'What to do next' : 'Your next turn'}</Typography>
        </Stack>
        <GuidanceList advice={list} base={`${S}/`} limit={3} />
      </CardContent>
    </Card>
  );
}

/* ================================================================ Built-in tool demo */

/** A stand-in for Super Tutor / Debating App: a short self-check on each objective, scored and sent back. */
export function ToolDemoPage() {
  const look = useLook();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get('token') ?? '';
  const tool = sp.get('tool') ?? 'Learning tool';
  const unit = sp.get('unit') ?? '';
  const objectives = useMemo(
    () =>
      (sp.get('objectives') ?? '')
        .split('|')
        .filter(Boolean)
        .map((s) => {
          const [id, ...rest] = s.split(':');
          return { id, title: rest.join(':') };
        }),
    [sp],
  );
  const [scores, setScores] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState('');
  const [done, setDone] = useState<number | null>(null);
  const debate = /debat/i.test(tool);
  const send = useSend<{ objectiveScores: { objectiveId: string; score: number }[]; summary?: string }, { score: number }>('post', `/tool-launches/${token}/demo-result`, {
    invalidate: ['/units', '/students', '/rewards'],
    onSuccess: (r) => setDone(r.score),
  });
  useEffect(() => {
    setScores(Object.fromEntries(objectives.map((o) => [o.id, 3])));
  }, [objectives]);
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Chip label="Demo mode · the real app connects here later" size="small" sx={{ mb: 2 }} />
          <Typography variant="h4" component="h1">
            {tool}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {unit}
          </Typography>
          {done != null ? (
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Alert severity="success">Result sent: {done}%. It now counts toward your learning outcomes.</Alert>
              <Button variant="contained" onClick={() => navigate(-1)}>
                Back to the lesson
              </Button>
            </Stack>
          ) : (
            <>
              <Typography sx={{ mb: 2 }}>{debate ? 'Make your argument, then rate how well you did on each goal.' : 'Practise with the tutor, then rate how sure you feel on each goal.'}</Typography>
              {debate && <TextField fullWidth multiline minRows={3} label="Your opening argument" value={summary} onChange={(e) => setSummary(e.target.value)} sx={{ mb: 2.5 }} />}
              <Stack spacing={2.5}>
                {objectives.map((o) => (
                  <Box key={o.id}>
                    <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{o.title}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Button key={n} onClick={() => setScores((s) => ({ ...s, [o.id]: n }))} sx={{ minWidth: 44, color: '#FFB400' }} aria-label={`${n} stars`}>
                          {n <= (scores[o.id] ?? 0) ? <Star fontSize="large" /> : <StarOutline fontSize="large" />}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
              <Button
                variant="contained"
                size="large"
                sx={{ mt: 3, bgcolor: look.primary }}
                disabled={send.isPending || !token}
                onClick={() => send.mutate({ objectiveScores: objectives.map((o) => ({ objectiveId: o.id, score: (scores[o.id] ?? 0) * 20 })), summary: summary || undefined })}
              >
                Finish and send my result
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

/* ================================================================ Portfolio */

export function StudentPortfolioPage() {
  const look = useLook();
  const me = useMe();
  const q = useGet<Portfolio>(`/students/${me._id}/portfolio`);
  const feature = useSend<{ id: string; featured: boolean }>('patch', (b) => `/evidence/${b.id}`, { invalidate: [`/students/${me._id}/portfolio`] });
  const little = look.band === 'little';
  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
        {little ? 'My treasure box' : 'My portfolio'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {little ? 'All the things you made and learned this year.' : 'Your Genius Tree, your learning outcomes and the work you are proud of. Star up to 12 pieces for your year-end showcase.'}
      </Typography>
      <MissionCard look={look} />
      <QueryState q={q}>
        {(p) => (
          <PortfolioView
            audience="child"
            p={p}
            renderEvidenceFooter={(e) =>
              e.status === 'verified' ? (
                <Button size="small" sx={{ mt: 1, ml: -1 }} startIcon={e.featured ? <Star sx={{ color: '#FFB400' }} /> : <StarOutline />} onClick={() => feature.mutate({ id: e._id, featured: !e.featured })}>
                  {e.featured ? 'In my showcase' : 'Add to showcase'}
                </Button>
              ) : null
            }
          />
        )}
      </QueryState>
    </>
  );
}
