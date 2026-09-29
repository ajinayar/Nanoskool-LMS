/**
 * The learning journey for students, styled by age band:
 *   UnitJourney        "Today you will…" objectives and the outcome activities on a lesson page
 *   MissionPage        the 21st-century skills mission (entry assessment)
 *   ToolDemoPage       the built-in stand-in for Super Tutor / Debating App until the real app is connected
 *   StudentPortfolioPage  my work, my skills, my outcomes, and choosing work for the year showcase
 *   NextTurnCard       "Your next turn" guidance for the home page
 */
import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, Slider, Stack, TextField, Typography } from '@mui/material';
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
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '@/api/client';
import type { UnitDetail } from '@/api/types';
import { ACTIVITY_LABEL, BAND_LABEL, LEVEL_LABEL, type Activity, type ActivityKind, type Advice, type Evidence, type EvidenceMedia, type MyMission, type Objective, type Portfolio, type Tool, type UnitOutcome } from '@/api/journey';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { QueryState, UploadButton } from '@/components/ui';
import { BandChip, GuidanceList, PortfolioView } from '@/components/JourneyViews';
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
          <Box sx={{ width: little ? 50 : 36, height: little ? 50 : 36, borderRadius: little ? '16px' : '10px', bgcolor: little ? look.primary : tint(look.primary, 0.12), color: little ? '#fff' : look.primary, display: 'grid', placeItems: 'center', boxShadow: little ? `0 4px 0 ${shade(look.primary, 0.25)}` : 'none', '& svg': { fontSize: little ? 28 : 21 } }}>{icon}</Box>
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
            <Stack key={o._id} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', p: little ? 1.5 : 1.25, borderRadius: little ? '18px' : '10px', bgcolor: done ? tint('#2FB36B', 0.1) : little ? tint(look.tiles[i % look.tiles.length], 0.1) : look.soft }}>
              <Box sx={{ width: little ? 36 : 26, height: little ? 36 : 26, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: little ? 18 : 13, bgcolor: done ? '#2FB36B' : little ? look.tiles[i % look.tiles.length] : '#fff', color: done || little ? '#fff' : look.ink, border: done || little ? 'none' : `1.5px solid ${look.line}` }}>
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
  if (a.kind === 'quiz' && a.quizId) action = <Button variant={scored ? 'outlined' : 'contained'} component={RouterLink} to={`${S}/quizzes/${a.quizId}`}>{scored ? 'Try again' : little ? 'Play the quiz' : 'Take the quiz'}</Button>;
  else if (a.kind === 'tool')
    action = tool?.connected === false ? <Chip label="Coming soon" /> : <Button variant="contained" onClick={launch} startIcon={<Extension />}>{scored ? 'Play again' : `Open ${tool?.name ?? 'tool'}`}</Button>;
  else if (status !== 'scored') action = <Button variant={open ? 'text' : 'contained'} onClick={() => setOpen(!open)}>{open ? 'Close' : status === 'pending' ? 'Replace my work' : status === 'returned' ? 'Send it again' : little ? 'Show my work' : 'Submit evidence'}</Button>;

  return (
    <Box sx={{ p: little ? 2 : 1.75, borderRadius: little ? '22px' : '12px', border: little ? `3px solid ${tint(color, 0.3)}` : `1px solid ${look.line}`, bgcolor: '#fff' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75} sx={{ alignItems: { sm: 'center' } }}>
        <Box sx={{ width: little ? 56 : 42, height: little ? 56 : 42, borderRadius: little ? '18px' : '11px', bgcolor: little ? color : tint(color, 0.14), color: little ? '#fff' : color, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: little ? `0 4px 0 ${shade(color, 0.25)}` : 'none', '& svg': { fontSize: little ? 30 : 23 } }}>{KIND_ICON[a.kind]}</Box>
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
          <UploadButton folder="evidence" accept={accept} label={little ? 'Add a photo or video' : media.length ? 'Add another file' : 'Upload photo, video or file'} onUploaded={(url, name) => setMedia((m) => [...m, { kind: kindOf(url), url, name }])} />
          {media.map((m, i) => (
            <Chip key={m.url} label={m.name || m.kind} onDelete={() => setMedia(media.filter((_, j) => j !== i))} deleteIcon={<Close />} />
          ))}
        </Stack>
      )}
      {types.includes('link') && <TextField size="small" fullWidth label="Or paste a link (for example a slide deck)" value={link} onChange={(e) => setLink(e.target.value)} sx={{ mb: 1.5 }} />}
      <TextField fullWidth multiline minRows={a.kind === 'reflection' ? 4 : 2} label={a.kind === 'reflection' ? (little ? 'What did you learn today?' : 'Your reflection') : little ? 'Tell your teacher about it' : 'Describe what you did'} value={caption} onChange={(e) => setCaption(e.target.value)} />
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

/* ================================================================ Skills mission */

type Answer = { selected?: number[]; value?: number; text?: string; fileUrl?: string };

export function MissionPage() {
  const look = useLook();
  const q = useGet<MyMission>('/assessment/me');
  return <QueryState q={q}>{(m) => <Mission look={look} m={m} />}</QueryState>;
}

function Mission({ look, m }: { look: Look; m: MyMission }) {
  const little = look.band === 'little';
  const toast = useToast();
  const navigate = useNavigate();
  const [started, setStarted] = useState(!!m.attempt);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries((m.attempt?.answers ?? []).map((a) => [a.itemId, a])));
  const [result, setResult] = useState<{ status: string } | null>(null);
  const start = useSend<void>('post', '/assessment/me/start', { onSuccess: () => setStarted(true) });
  const submit = useSend<void, { status: string }>('post', '/assessment/me/submit', { invalidate: ['/assessment', '/students'], onSuccess: (r) => setResult(r) });
  const items = m.items;
  const item = items[i];

  const save = async (itemId: string, a: Answer) => {
    setAnswers((x) => ({ ...x, [itemId]: a }));
    try {
      await api.put('/assessment/me/answers', { itemId, ...a });
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
        <Typography variant="h4">{little ? 'Mission complete!' : 'Mission complete'}</Typography>
        <Typography color="text.secondary">{result.status === 'scored' ? 'Your skills map is ready. Your teacher and parents can see where you shine and what to grow next.' : 'Thank you! Your teacher will read your written answers, then your skills map will be ready.'}</Typography>
        <Button variant="contained" onClick={() => navigate(`${S}/portfolio`)}>
          See my portfolio
        </Button>
      </Stack>,
    );

  if (!m.form)
    return shell(
      <Typography sx={{ textAlign: 'center' }} color="text.secondary">
        There is no skills mission for your grade yet.
      </Typography>,
    );

  if (!m.due && !m.attempt)
    return shell(
      <Stack spacing={2}>
        <Typography variant="h5">{m.form.title}</Typography>
        <Typography color="text.secondary">You finished your skills mission. The next one opens next term, so you can see how much you have grown.</Typography>
        {m.lastResult?.skillScores?.length ? (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {m.lastResult.skillScores.map((s) => (
              <Chip key={s.skillId} label={LEVEL_LABEL[s.level]} />
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
        <Alert severity="info">A parent needs to say yes before you start. Ask them to open Nanoskool and allow the skills mission.</Alert>
      </Stack>,
    );

  if (!started)
    return shell(
      <Stack spacing={2.5} sx={{ alignItems: little ? 'center' : 'flex-start', textAlign: little ? 'center' : 'left' }}>
        {(look.art || look.mascot) && <NanoFor look={look} size={little ? 150 : 90} />}
        <Chip icon={<Explore />} label={little ? 'Skills mission' : '21st-century skills mission'} sx={{ bgcolor: tint(look.primary, 0.12), color: look.primary, fontWeight: 700 }} />
        <Typography variant="h4" component="h1">{m.form.title}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: little ? 19 : 16 }}>{m.form.intro || 'There are no wrong answers here. This helps your teachers know how you think, work with others and solve problems, so they can guide you better.'}</Typography>
        <Typography variant="body2" color="text.secondary">
          {m.form.questionCount} questions{m.form.timeLimitMin ? ` · about ${m.form.timeLimitMin} minutes` : ''} · your answers save as you go
        </Typography>
        <Button size="large" variant="contained" onClick={() => start.mutate()} disabled={start.isPending} endIcon={<ArrowForward />}>
          {little ? "Let's go!" : 'Start the mission'}
        </Button>
      </Stack>,
    );

  const a = item ? (answers[item._id] ?? {}) : {};
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
      {item && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}>
            <Typography variant={little ? 'h4' : 'h5'} component="h1" sx={{ flex: 1, lineHeight: 1.25 }}>
              {item.prompt}
            </Typography>
            {little && (
              <Button onClick={() => speak(item.prompt)} aria-label="Listen">
                🔊
              </Button>
            )}
          </Stack>
          {item.mediaUrl && (/\.(mp3|wav|m4a|ogg)$/i.test(item.mediaUrl) ? <audio src={item.mediaUrl} controls style={{ width: '100%', marginBottom: 16 }} /> : <Box component="img" src={item.mediaUrl} alt="" sx={{ maxWidth: '100%', maxHeight: 280, borderRadius: 3, mb: 2 }} />)}

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
                    onClick={() => save(item._id, { selected: item.type === 'single' ? [k] : on ? a.selected!.filter((x) => x !== k) : [...(a.selected ?? []), k] })}
                    sx={{ p: little ? 2 : 1.5, borderRadius: little ? '18px' : '10px', cursor: 'pointer', fontSize: little ? 19 : 15.5, fontWeight: little ? 800 : 500, border: '2px solid', borderColor: on ? look.primary : look.line, bgcolor: on ? tint(look.primary, 0.1) : '#fff', transition: 'all .15s' }}
                  >
                    {o.text}
                  </Box>
                );
              })}
            </Stack>
          )}
          {item.type === 'scale' && (
            <Box sx={{ px: 2, pt: 2 }}>
              <Slider value={a.value ?? 0} min={1} max={(item.scaleLabels ?? []).length || 5} step={1} marks={(item.scaleLabels ?? []).map((l, k) => ({ value: k + 1, label: l }))} onChange={(_, v) => setAnswers((x) => ({ ...x, [item._id]: { value: v as number } }))} onChangeCommitted={(_, v) => save(item._id, { value: v as number })} sx={{ '& .MuiSlider-markLabel': { fontSize: little ? 15 : 13 } }} />
            </Box>
          )}
          {item.type === 'open' && <TextField fullWidth multiline minRows={4} value={a.text ?? ''} onChange={(e) => setAnswers((x) => ({ ...x, [item._id]: { text: e.target.value } }))} onBlur={(e) => save(item._id, { text: e.target.value })} placeholder={little ? 'Write or ask a grown-up to help you write' : 'Write your answer'} />}
          {item.type === 'upload' && (
            <Stack spacing={1.5}>
              <UploadButton folder="assessment" accept="image/*,video/mp4,.pdf" label={a.fileUrl ? 'Replace my file' : 'Upload a photo or file'} onUploaded={(url) => save(item._id, { ...a, fileUrl: url })} />
              {a.fileUrl && <Chip label="File added" color="success" sx={{ alignSelf: 'flex-start' }} />}
              <TextField fullWidth multiline minRows={2} label="Tell us about it (optional)" value={a.text ?? ''} onChange={(e) => setAnswers((x) => ({ ...x, [item._id]: { ...a, text: e.target.value } }))} onBlur={(e) => save(item._id, { ...a, text: e.target.value })} />
            </Stack>
          )}
        </>
      )}
      <Stack direction="row" sx={{ mt: 4, justifyContent: 'space-between', alignItems: 'center' }}>
        <Button disabled={i === 0} onClick={() => setI(i - 1)}>
          Back
        </Button>
        <Typography variant="caption" color="text.secondary">
          {answered} answered
        </Typography>
        {last ? (
          <Button variant="contained" onClick={() => submit.mutate()} disabled={submit.isPending}>
            {little ? 'Finish!' : 'Finish mission'}
          </Button>
        ) : (
          <Button variant="contained" onClick={() => setI(i + 1)} endIcon={<ArrowForward />}>
            Next
          </Button>
        )}
      </Stack>
    </>,
  );
}

/** Home card: invites the student to the skills mission when it is due. */
export function MissionCard({ look }: { look: Look }) {
  const q = useGet<MyMission>('/assessment/me');
  const m = q.data;
  if (!m?.form || !(m.due || m.attempt)) return null;
  const little = look.band === 'little';
  return (
    <Card sx={{ mb: 3, background: little ? `linear-gradient(120deg, ${look.tiles[0]} 0%, ${look.tiles[3]} 100%)` : undefined, color: little ? '#fff' : undefined, border: little ? 'none' : `1.5px solid ${tint(look.primary, 0.3)}` }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: { xs: 2.25, md: 3 } }}>
        <Box sx={{ width: little ? 64 : 44, height: little ? 64 : 44, borderRadius: '14px', bgcolor: little ? 'rgba(255,255,255,0.25)' : tint(look.primary, 0.12), color: little ? '#fff' : look.primary, display: 'grid', placeItems: 'center', '& svg': { fontSize: little ? 38 : 26 } }}>
          <Explore />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: little ? 1000 : 700, fontSize: little ? 22 : 17 }}>{m.attempt ? 'Finish your skills mission' : little ? 'A new mission for you!' : 'Your skills mission is ready'}</Typography>
          <Typography sx={{ opacity: little ? 0.92 : 1, color: little ? 'inherit' : 'text.secondary' }}>{m.consent ? `${m.form.questionCount} questions about how you think, create and work with others.` : 'Ask a parent to allow it first.'}</Typography>
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
  const send = useSend<{ objectiveScores: { objectiveId: string; score: number }[]; summary?: string }, { score: number }>('post', `/tool-launches/${token}/demo-result`, { invalidate: ['/units', '/students', '/rewards'], onSuccess: (r) => setDone(r.score) });
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
              <Button variant="contained" size="large" sx={{ mt: 3, bgcolor: look.primary }} disabled={send.isPending || !token} onClick={() => send.mutate({ objectiveScores: objectives.map((o) => ({ objectiveId: o.id, score: (scores[o.id] ?? 0) * 20 })), summary: summary || undefined })}>
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
        {little ? 'All the things you made and learned this year.' : 'Your skills, your learning outcomes and the work you are proud of. Star up to 12 pieces for your year-end showcase.'}
      </Typography>
      <MissionCard look={look} />
      <QueryState q={q}>
        {(p) => (
          <PortfolioView
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
