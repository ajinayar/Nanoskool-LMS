/**
 * The psychometric profile ("Know Yourself"), kept apart from the Genius Habits.
 *   PsyProfileView       four areas, each dimension with its sources (child · parent · teacher · PE test), score range and band
 *   PsychometricSection  staff view of one student, with "Suggest a conversation"
 *   ParentKnowYourself   the parent's tab: permission, the home questionnaire, the profile and erasing data
 */
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, LinearProgress, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { api, errorMessage } from '@/api/client';
import { LANG_NAMES, OBS_LEVELS, PSY_BAND_INFO, PSY_DOMAIN_INFO, type PsyBand, type PsyProfile } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { ConfirmDialog, FormDialog, QueryState, fmtDate } from '@/components/ui';
import { useToast } from '@/components/Toast';

export function PsyBandChip({ band, child }: { band: PsyBand | null; child?: boolean }) {
  if (!band) return <Box component="span" sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>Not yet</Box>;
  const b = PSY_BAND_INFO[band];
  return <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 999, fontSize: 12, fontWeight: 700, color: b.color, bgcolor: b.soft, whiteSpace: 'nowrap' }}>{child ? b.child : b.label}</Box>;
}

const SOURCE_LABEL = { self: 'Child', parent: 'Parent', teacher: 'Teacher', fitness: 'PE test' } as const;

export function PsyProfileView({ p, audience = 'adult' }: { p: PsyProfile; audience?: 'adult' | 'child' }) {
  const child = audience === 'child';
  if (p.withheld) return <Alert severity="info">A parent has not given permission for the Know Yourself profile, so it is not shown.</Alert>;
  const empty = p.domains.every((d) => d.score == null);
  return (
    <Stack spacing={2}>
      {empty && <Alert severity="info">{child ? 'Take Know Yourself to see your profile here.' : 'No results yet. The profile fills in from the child’s Know Yourself answers, the parent questionnaire, teacher observations and PE fitness tests.'}</Alert>}
      {!child && !!p.flagText?.length && (
        <Alert severity="warning">
          <b>Interpret with care.</b> The child’s answers showed: {p.flagText.join('; ')}. Talk with the child before drawing conclusions; they may retake it next term.
        </Alert>
      )}
      {!child && !!p.attention?.length && (
        <Alert severity="info">
          Low from two or more sources: <b>{p.attention.join(', ')}</b>. This is not a diagnosis — it may be worth a gentle conversation with the child, or with the school counsellor.
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {p.domains.map((d) => {
          const info = PSY_DOMAIN_INFO[d.id];
          return (
            <Card key={d.id} variant="outlined" sx={{ borderTop: `4px solid ${info.color}` }}>
              <CardContent>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: info.soft, display: 'grid', placeItems: 'center', fontSize: 22 }}>{info.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 750 }}>{child ? info.child : info.label}</Typography>
                    {!child && <Typography variant="caption" color="text.secondary">{info.about}</Typography>}
                  </Box>
                  <PsyBandChip band={d.band} child={child} />
                </Stack>
                <Stack spacing={1.5}>
                  {d.dimensions.map((x) => {
                    const src = (Object.keys(SOURCE_LABEL) as (keyof typeof SOURCE_LABEL)[]).filter((k) => x.sources?.[k] != null);
                    return (
                      <Box key={x._id}>
                        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.4 }}>
                          <Tooltip title={x.description ?? ''} placement="top-start">
                            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                              {x.name}
                            </Typography>
                          </Tooltip>
                          {!child && x.range && (
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                              {x.percentile != null ? `Percentile ${x.percentile} · ` : ''}about {x.range[0]}–{x.range[1]}
                            </Typography>
                          )}
                          <PsyBandChip band={x.band} child={child} />
                        </Stack>
                        <LinearProgress variant="determinate" value={x.score ?? 0} sx={{ height: child ? 10 : 7, borderRadius: 999, bgcolor: '#EFEFF3', '& .MuiLinearProgress-bar': { bgcolor: x.band ? PSY_BAND_INFO[x.band].color : '#D0CFD6', borderRadius: 999 } }} />
                        {!child && src.length > 0 && (
                          <Stack direction="row" sx={{ gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                            {src.map((k) => (
                              <Box key={k} component="span" sx={{ fontSize: 11, px: 0.75, py: 0.1, borderRadius: 1, bgcolor: '#F4F4F6', color: 'text.secondary' }}>
                                {SOURCE_LABEL[k]} {k === 'teacher' && x.observedLevel ? `${OBS_LEVELS[x.observedLevel]}${x.sources.raters > 1 ? ` (${x.sources.raters} teachers)` : ''}` : x.sources[k]}
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      {!child && !!p.fitnessTests?.length && (
        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>PE fitness tests ({p.fitnessTests[0].term.replace('-T', ' · Term ')})</Typography>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {p.fitnessTests.map((t) => (
                <Chip key={t.test} label={`${t.label}: ${t.value} ${t.unit}${t.percentile != null ? ` · better than ${t.percentile}% of the grade` : ''}`} variant="outlined" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
      <Typography variant="caption" color="text.secondary">
        {child
          ? 'Everyone has strengths and things to grow. This shows where you are today — it will change as you grow!'
          : `A screening profile to understand and support the child — not a clinical test or diagnosis, and never used for admissions, streaming or ranking. ${p.normed ? 'Bands compare with children of the same grade (percentiles).' : 'Bands are provisional until enough children in this grade have taken it.'} The range shows the likely true score.${p.assessedAt ? ` Child’s answers ${fmtDate(p.assessedAt)}.` : ''}${p.parentAt ? ` Parent questionnaire ${fmtDate(p.parentAt)}.` : ''}${p.observedAt ? ` Teacher observation ${fmtDate(p.observedAt)}.` : ''}`}
      </Typography>
    </Stack>
  );
}

/** Staff: the profile of one student, and a way to ask the counsellor for a conversation. */
export function PsychometricSection({ studentId, canRefer = true }: { studentId: string; canRefer?: boolean }) {
  const q = useGet<PsyProfile>(`/students/${studentId}/psychometric`);
  const [open, setOpen] = useState(false);
  return (
    <QueryState q={q}>
      {(p) => (
        <Stack spacing={1.5}>
          {canRefer && !p.withheld && (
            <Box>
              <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
                💬 Suggest a conversation with the counsellor
              </Button>
            </Box>
          )}
          <PsyProfileView p={p} />
          {open && <ConversationDialog studentId={studentId} areas={p.attention ?? []} onClose={() => setOpen(false)} />}
        </Stack>
      )}
    </QueryState>
  );
}

function ConversationDialog({ studentId, areas, onClose }: { studentId: string; areas: string[]; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const send = useSend<{ reason: string; areas: string[] }>('post', `/students/${studentId}/conversations`, { success: 'Sent to the school counsellor', invalidate: ['/psychometric/conversations', `/students/${studentId}/conversations`], onSuccess: onClose });
  return (
    <FormDialog open title="Suggest a conversation" onClose={onClose} onSubmit={() => send.mutate({ reason, areas })} loading={send.isPending} submitLabel="Send to counsellor">
      <Typography variant="body2" color="text.secondary">
        Describe what you have noticed, in plain words and without labels (e.g. “Has been quiet and alone at break for two weeks”). Only the counsellor and school leaders see this — never parents or other children.
      </Typography>
      <TextField label="What you noticed" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={3} required autoFocus />
      {areas.length > 0 && <Typography variant="caption">Areas flagged in the profile: {areas.join(', ')}</Typography>}
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Parent */

interface ParentForm {
  consent: boolean;
  childName: string;
  due: boolean;
  form: { _id: string; title: string; intro?: string; questionCount: number } | null;
  items: { _id: string; type: string; prompt: string; options?: { text: string }[]; scaleLabels?: string[] }[];
  languages: string[];
  attempt: { answers: { itemId: string; value?: number }[] } | null;
  lastDoneAt: string | null;
  answeredBy: string | null;
}

export function ParentKnowYourself({ studentId }: { studentId: string }) {
  const [lang, setLang] = useState('en');
  const f = useGet<ParentForm>(`/students/${studentId}/parent-form`, { lang });
  const consent = useSend<{ psychometric: boolean }>('patch', `/students/${studentId}/consent`, { success: 'Saved', invalidate: [`/students/${studentId}`] });
  const erase = useSend<void>('delete', `/students/${studentId}/psychometric`, { success: 'All Know Yourself data was deleted', invalidate: [`/students/${studentId}`], onSuccess: () => setConfirm(false) });
  const [confirm, setConfirm] = useState(false);
  return (
    <QueryState q={f}>
      {(d) => (
        <Stack spacing={2.5}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Know Yourself — a profile of {d.childName.split(' ')[0]}’s strengths</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Once a term your child answers short questions about themselves; you answer a home questionnaire; teachers note what they see (hygiene, grooming, manners, fitness); the PE teacher adds fitness tests. It is a screening profile to support your child — not a diagnosis, not marks, and never used for admissions or ranking. Your child is also asked if they agree before starting. Data is kept for at most 3 years; you can delete it at any time.
              </Typography>
              <FormControlLabel control={<Switch checked={d.consent} onChange={(e) => consent.mutate({ psychometric: e.target.checked })} />} label="I allow the Know Yourself profile for my child" />
            </CardContent>
          </Card>

          {d.consent && d.form && (d.due || d.attempt) && <ParentQuestionnaire studentId={studentId} d={d} lang={lang} setLang={setLang} />}
          {d.consent && !d.due && !d.attempt && d.lastDoneAt && <Alert severity="success">Thank you — the home questionnaire was answered by {d.answeredBy} on {fmtDate(d.lastDoneAt)}. It opens again next term.</Alert>}

          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>The profile</Typography>
          <ParentProfile studentId={studentId} />
          <Box>
            <Button color="error" size="small" onClick={() => setConfirm(true)}>
              Delete all Know Yourself data about my child
            </Button>
          </Box>
          <ConfirmDialog
            open={confirm}
            danger
            title="Delete all Know Yourself data?"
            message="This permanently removes your child’s answers, your questionnaire, teacher observations, PE fitness results and counsellor requests, and turns the permission off. Genius Habits and schoolwork are not affected."
            confirmLabel="Delete permanently"
            loading={erase.isPending}
            onClose={() => setConfirm(false)}
            onConfirm={() => erase.mutate()}
          />
        </Stack>
      )}
    </QueryState>
  );
}

function ParentProfile({ studentId }: { studentId: string }) {
  const q = useGet<PsyProfile>(`/students/${studentId}/psychometric`);
  return <QueryState q={q}>{(p) => <PsyProfileView p={{ ...p, attention: undefined }} />}</QueryState>;
}

function ParentQuestionnaire({ studentId, d, lang, setLang }: { studentId: string; d: ParentForm; lang: string; setLang: (l: string) => void }) {
  const toast = useToast();
  const [started, setStarted] = useState(!!d.attempt);
  const [answers, setAnswers] = useState<Record<string, number>>(() => Object.fromEntries((d.attempt?.answers ?? []).filter((a) => a.value).map((a) => [a.itemId, a.value!])));
  const start = useSend<{ lang: string }>('post', `/students/${studentId}/parent-form/start`, { onSuccess: () => setStarted(true) });
  const submit = useSend<void>('post', `/students/${studentId}/parent-form/submit`, { success: 'Thank you! Your answers were saved.', invalidate: [`/students/${studentId}`] });
  const pick = async (itemId: string, value: number) => {
    setAnswers((a) => ({ ...a, [itemId]: value }));
    try {
      await api.put(`/students/${studentId}/parent-form/answers`, { itemId, value });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const n = Object.keys(answers).length;
  return (
    <Card sx={{ border: '1.5px solid #D9CFF5' }}>
      <CardContent>
        <Typography sx={{ fontWeight: 700 }}>{d.form!.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {d.form!.intro} · {d.form!.questionCount} questions, about 5 minutes. Skip anything you are not sure about.
        </Typography>
        {d.languages.length > 1 && (
          <Stack direction="row" sx={{ gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            {d.languages.map((l) => (
              <Chip key={l} size="small" label={LANG_NAMES[l] ?? l} onClick={() => setLang(l)} color={l === lang ? 'primary' : 'default'} />
            ))}
          </Stack>
        )}
        {!started ? (
          <Button variant="contained" onClick={() => start.mutate({ lang })} disabled={start.isPending}>
            Start the questionnaire
          </Button>
        ) : (
          <Stack spacing={1.75}>
            {d.items.map((it, i) => (
              <Box key={it._id}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                  {i + 1}. {it.prompt}
                </Typography>
                <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                  {(it.scaleLabels ?? []).map((l, k) => (
                    <Chip key={k} label={l} onClick={() => pick(it._id, k + 1)} color={answers[it._id] === k + 1 ? 'primary' : 'default'} variant={answers[it._id] === k + 1 ? 'filled' : 'outlined'} />
                  ))}
                </Stack>
              </Box>
            ))}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Button variant="contained" onClick={() => submit.mutate()} disabled={submit.isPending || n === 0}>
                Submit ({n} of {d.items.length} answered)
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
