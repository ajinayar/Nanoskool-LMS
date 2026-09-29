/** Teacher / school / admin views: the evidence review queue, open answers from the skills mission, and the class outcome heatmap. */
import { Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { refName, type ClassSection, type Ref } from '@/api/types';
import { ACTIVITY_LABEL, type Evidence, type OutcomeBand } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { Empty, PageHeader, QueryState, fromNow } from '@/components/ui';
import { FormError, TabBar, useTab } from '@/components/AdminCommon';
import { BandChip, EvidenceMediaView, bandColor } from '@/components/JourneyViews';

const RUBRIC = ['Beginning', 'Developing', 'Secure', 'Excellent'];

interface OpenAnswer {
  attemptId: string;
  student: Ref & { rollNo?: string };
  class?: Ref;
  submittedAt: string;
  itemId: string;
  prompt: string;
  type: string;
  rubric: string[];
  text?: string;
  fileUrl?: string;
}

/** Tabs: uploads waiting for a check, and open answers from the skills mission. */
export function ReviewQueue() {
  const [tab, setTab] = useTab(['evidence', 'answers', 'done'] as const, 'evidence');
  const pending = useGet<Evidence[]>('/evidence', { status: 'pending' });
  const answers = useGet<OpenAnswer[]>('/assessment-reviews');
  return (
    <>
      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'evidence', label: `Projects and uploads${pending.data ? ` (${pending.data.length})` : ''}` },
          { value: 'answers', label: `Skills mission answers${answers.data ? ` (${answers.data.length})` : ''}` },
          { value: 'done', label: 'Recently checked' },
        ]}
      />
      {tab === 'evidence' && <EvidenceList q={pending} emptyTitle="Nothing to check" />}
      {tab === 'answers' && <AnswerList q={answers} />}
      {tab === 'done' && <DoneList />}
    </>
  );
}

function DoneList() {
  const q = useGet<Evidence[]>('/evidence', { status: 'verified', limit: 40 });
  return <EvidenceList q={q} emptyTitle="Nothing checked yet" />;
}

function EvidenceList({ q, emptyTitle }: { q: ReturnType<typeof useGet<Evidence[]>>; emptyTitle: string }) {
  const [open, setOpen] = useState<Evidence | null>(null);
  return (
    <QueryState q={q}>
      {(rows) =>
        rows.length === 0 ? (
          <Empty title={emptyTitle} hint="When students upload projects, presentations or reflections, they appear here for a rubric score." />
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {rows.map((e) => {
              const st = e.studentId as Ref & { avatarUrl?: string };
              return (
                <Card key={e._id} variant="outlined" sx={{ overflow: 'hidden', cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => setOpen(e)}>
                  <EvidenceMediaView e={e} height={140} />
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                      <Avatar src={st?.avatarUrl} sx={{ width: 26, height: 26, fontSize: 13, bgcolor: '#8B6CEF', color: '#fff' }}>
                        {refName(st)[0]}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                        {refName(st)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fromNow(e.updatedAt)}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 650, fontSize: 14.5 }} noWrap>
                      {e.activity?.title ?? 'Activity'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {e.unit?.title} · {refName(e.classId as Ref)}
                    </Typography>
                    {e.status === 'verified' && (
                      <Chip size="small" label={`${e.score}%${e.rubricLevel ? ` · ${RUBRIC[e.rubricLevel - 1]}` : ''}`} sx={{ mt: 1, bgcolor: '#D3EEDD', color: '#1D6B3E' }} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {open && <ReviewDialog e={open} onClose={() => setOpen(null)} />}
          </Box>
        )
      }
    </QueryState>
  );
}

function ReviewDialog({ e, onClose }: { e: Evidence; onClose: () => void }) {
  const rating = e.activity?.scoring === 'rating';
  const [level, setLevel] = useState<number | null>(e.rubricLevel ?? null);
  const [score, setScore] = useState<string>(e.score != null && !e.rubricLevel ? String(e.score) : '');
  const [feedback, setFeedback] = useState(e.feedback ?? '');
  const review = useSend<{ status: 'verified' | 'returned'; rubricLevel?: number; score?: number; feedback?: string }>('post', `/evidence/${e._id}/review`, {
    success: 'Saved',
    invalidate: ['/evidence', '/classes', '/students'],
    onSuccess: onClose,
  });
  const verify = () => review.mutate({ status: 'verified', ...(rating && score !== '' ? { score: Number(score) } : level ? { rubricLevel: level } : {}), feedback: feedback || undefined });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {e.activity?.title}
        <Typography variant="body2" color="text.secondary">
          {refName(e.studentId as Ref)} · {e.unit?.title} · {e.activity ? ACTIVITY_LABEL[e.activity.kind] : ''}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' } }}>
        <Box>
          <Stack spacing={1.25}>
            {(e.media.length ? e.media : [null]).map((m, i) => (
              <Paper key={i} variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                <EvidenceMediaView e={{ ...e, media: m ? [m] : [] }} height={m ? 280 : 120} />
              </Paper>
            ))}
          </Stack>
          {e.caption && <Typography sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{e.caption}</Typography>}
        </Box>
        <Box>
          {e.activity?.instructions && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {e.activity.instructions}
            </Typography>
          )}
          <Typography variant="overline" color="text.secondary">
            Objectives this shows
          </Typography>
          <Stack spacing={0.75} sx={{ mb: 2 }}>
            {(e.objectives ?? []).map((o) => (
              <Box key={o._id} sx={{ p: 1, borderRadius: 1.5, bgcolor: '#FAFAFB', border: '1px solid #EEEEF2' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {o.title}
                </Typography>
                {o.criteria && (
                  <Typography variant="caption" color="text.secondary">
                    Success looks like: {o.criteria}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
          {rating ? (
            <TextField label="Score out of 100" type="number" value={score} onChange={(x) => setScore(x.target.value)} fullWidth slotProps={{ htmlInput: { min: 0, max: 100 } }} sx={{ mb: 2 }} />
          ) : (
            <>
              <Typography variant="overline" color="text.secondary">
                Rubric level
              </Typography>
              <ToggleButtonGroup exclusive value={level} onChange={(_, v) => setLevel(v)} fullWidth size="small" sx={{ mb: 2, mt: 0.5 }}>
                {RUBRIC.map((r, i) => (
                  <ToggleButton key={r} value={i + 1} sx={{ flexDirection: 'column', py: 1, textTransform: 'none' }}>
                    <b>{i + 1}</b>
                    <span style={{ fontSize: 11.5 }}>{r}</span>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </>
          )}
          <TextField label="Feedback for the student" value={feedback} onChange={(x) => setFeedback(x.target.value)} multiline minRows={3} fullWidth />
          <FormError error={review.error} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Box sx={{ flex: 1 }} />
        <Button color="warning" onClick={() => review.mutate({ status: 'returned', feedback: feedback || undefined })} disabled={review.isPending || !feedback.trim()}>
          Ask to redo
        </Button>
        <Button variant="contained" onClick={verify} disabled={review.isPending || (rating ? score === '' : !level)}>
          Verify
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AnswerList({ q }: { q: ReturnType<typeof useGet<OpenAnswer[]>> }) {
  return (
    <QueryState q={q}>
      {(rows) =>
        rows.length === 0 ? (
          <Empty title="No answers waiting" hint="Written and photo answers from the skills mission appear here." />
        ) : (
          <Stack spacing={1.5}>
            {rows.map((a) => (
              <AnswerRow key={`${a.attemptId}-${a.itemId}`} a={a} />
            ))}
          </Stack>
        )
      }
    </QueryState>
  );
}

function AnswerRow({ a }: { a: OpenAnswer }) {
  const [level, setLevel] = useState<number | null>(null);
  const score = useSend<{ itemId: string; level: number }>('post', `/assessment-reviews/${a.attemptId}/score`, { success: 'Scored', invalidate: ['/assessment-reviews', '/students'] });
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' } }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {refName(a.student)} · {refName(a.class)} · {fromNow(a.submittedAt)}
        </Typography>
        <Typography sx={{ fontWeight: 650, my: 0.5 }}>{a.prompt}</Typography>
        {a.text && <Typography sx={{ whiteSpace: 'pre-wrap', p: 1.25, bgcolor: '#FAFAFB', borderRadius: 1.5 }}>{a.text}</Typography>}
        {a.fileUrl && (/\.(png|jpe?g|webp|gif)$/i.test(a.fileUrl) ? <Box component="img" src={a.fileUrl} alt="Answer" sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: 1.5, mt: 1 }} /> : <Button href={a.fileUrl} target="_blank">Open file</Button>)}
      </Box>
      <Box>
        <Stack spacing={0.75}>
          {[1, 2, 3, 4].map((n) => (
            <Box key={n} onClick={() => setLevel(n)} sx={{ p: 1, borderRadius: 1.5, cursor: 'pointer', border: '1.5px solid', borderColor: level === n ? '#17171C' : '#EEEEF2', bgcolor: level === n ? '#F4F1FF' : '#fff' }}>
              <Typography variant="body2">
                <b>{n}.</b> {a.rubric[n - 1] || RUBRIC[n - 1]}
              </Typography>
            </Box>
          ))}
        </Stack>
        <Button variant="contained" size="small" sx={{ mt: 1.25 }} disabled={!level || score.isPending} onClick={() => level && score.mutate({ itemId: a.itemId, level })}>
          Save score
        </Button>
      </Box>
    </Paper>
  );
}

/** Page wrapper for teachers and school admins. */
export function ReviewPage() {
  return (
    <>
      <PageHeader title="Evidence to check" subtitle="Verify projects, videos and written answers with a rubric. Only verified work counts toward learning outcomes." />
      <ReviewQueue />
    </>
  );
}

/* ---------------------------------------------------------------- Class outcomes */

interface Heatmap {
  courses: { _id: string; title: string }[];
  course: string | null;
  units: { _id: string; title: string; objectives: { _id: string; title: string }[]; activityCount: number }[];
  students: { _id: string; name: string; rollNo?: string; units: { unitId: string; score: number | null; band: OutcomeBand | null; objectives: { objectiveId: string; score: number | null; band: OutcomeBand | null }[] }[] }[];
}
interface ClassGuidance {
  reteach: { unitId: string; unit: string; objective: string; students: string[] }[];
  pendingEvidence: number;
  noConsent: string[];
  notAssessed: string[];
}

export function ClassOutcomes({ classId, studentBase }: { classId: string; studentBase?: string }) {
  const [courseId, setCourseId] = useState<string>('');
  const [view, setView] = useState<'units' | 'objectives'>('units');
  const q = useGet<Heatmap>(`/classes/${classId}/outcomes`, courseId ? { courseId } : {});
  const g = useGet<ClassGuidance>(`/classes/${classId}/guidance`, courseId ? { courseId } : {});
  return (
    <QueryState q={q}>
      {(h) => {
        if (!h.course) return <Empty title="No courses in this class" />;
        const cols = view === 'units' ? h.units.map((u) => ({ key: u._id, title: u.title, sub: '' })) : h.units.flatMap((u) => u.objectives.map((o) => ({ key: `${u._id}:${o._id}`, title: o.title, sub: u.title })));
        const cell = (s: Heatmap['students'][number], key: string) => {
          if (view === 'units') return s.units.find((x) => x.unitId === key);
          const [uid, oid] = key.split(':');
          return s.units.find((x) => x.unitId === uid)?.objectives.find((o) => o.objectiveId === oid);
        };
        return (
          <Stack spacing={2.5}>
            {g.data && (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
                <Card>
                  <CardContent>
                    <Typography sx={{ fontWeight: 650, mb: 1 }}>Where to reteach</Typography>
                    {g.data.reteach.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No objective has a large group still approaching it. Keep going.
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {g.data.reteach.map((r) => (
                          <Box key={r.unitId + r.objective} sx={{ p: 1.25, borderRadius: 2, bgcolor: '#FFF6EA' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {r.objective}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {r.unit} · {r.students.length} students: {r.students.slice(0, 6).join(', ')}
                              {r.students.length > 6 ? '…' : ''}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography sx={{ fontWeight: 650, mb: 1 }}>To do</Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <b>{g.data.pendingEvidence}</b> uploads waiting for a check
                      </Typography>
                      <Tooltip title={g.data.notAssessed.join(', ')}>
                        <Typography variant="body2">
                          <b>{g.data.notAssessed.length}</b> students have not taken the skills mission
                        </Typography>
                      </Tooltip>
                      <Tooltip title={g.data.noConsent.join(', ')}>
                        <Typography variant="body2">
                          <b>{g.data.noConsent.length}</b> students still need parent consent
                        </Typography>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <TextField select size="small" label="Course" value={courseId || h.course} onChange={(e) => setCourseId(e.target.value)} sx={{ minWidth: 240 }}>
                {h.courses.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.title}
                  </MenuItem>
                ))}
              </TextField>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
                <ToggleButton value="units" sx={{ whiteSpace: "nowrap" }}>By learning unit</ToggleButton>
                <ToggleButton value="objectives" sx={{ whiteSpace: "nowrap" }}>By objective</ToggleButton>
              </ToggleButtonGroup>
              <Box sx={{ flex: 1 }} />
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {(['mastered', 'achieved', 'approaching', 'not_yet'] as OutcomeBand[]).map((b) => (
                  <BandChip key={b} band={b} />
                ))}
              </Stack>
            </Stack>
            <Paper variant="outlined" sx={{ overflow: 'auto', maxHeight: 640 }}>
              <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 3, minWidth: '100%', fontSize: 13, p: 1 }}>
                <thead>
                  <tr>
                    <Box component="th" sx={{ position: 'sticky', left: 0, top: 0, zIndex: 2, bgcolor: '#fff', textAlign: 'left', minWidth: 170, p: 1 }}>
                      Student
                    </Box>
                    {cols.map((c) => (
                      <Box component="th" key={c.key} sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: '#fff', p: 0.5, fontWeight: 600, minWidth: 64, maxWidth: 120, verticalAlign: 'bottom' }}>
                        <Tooltip title={c.sub ? `${c.sub}: ${c.title}` : c.title}>
                          <Box sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 12 }}>{c.title}</Box>
                        </Tooltip>
                      </Box>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {h.students.map((s) => (
                    <tr key={s._id}>
                      <Box component="td" sx={{ position: 'sticky', left: 0, bgcolor: '#fff', p: 1, whiteSpace: 'nowrap' }}>
                        {studentBase ? (
                          <Box component={RouterLink} to={`${studentBase}${s._id}`} sx={{ color: 'inherit', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                            {s.name}
                          </Box>
                        ) : (
                          s.name
                        )}
                      </Box>
                      {cols.map((c) => {
                        const x = cell(s, c.key);
                        const [bg, fg] = bandColor(x?.band);
                        return (
                          <Box component="td" key={c.key} sx={{ bgcolor: bg, color: fg, textAlign: 'center', borderRadius: 1, height: 34, fontWeight: 650 }}>
                            {x?.score ?? '·'}
                          </Box>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Paper>
          </Stack>
        );
      }}
    </QueryState>
  );
}

/** Page: choose a class, then see its outcome heatmap and what to reteach. */
export function ClassOutcomesPage({ studentBase }: { studentBase?: string }) {
  const { id } = useParams();
  const classes = useGet<ClassSection[]>('/classes');
  const [pick, setPick] = useState('');
  const list = useMemo(() => classes.data ?? [], [classes.data]);
  const classId = id ?? (pick || list[0]?._id);
  return (
    <>
      <PageHeader
        title="Learning outcomes"
        subtitle="How much of each learning objective every student has shown, from verified evidence"
        actions={
          !id && list.length > 1 ? (
            <TextField select size="small" label="Class" value={classId ?? ''} onChange={(e) => setPick(e.target.value)} sx={{ minWidth: 200 }}>
              {list.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          ) : undefined
        }
      />
      <QueryState q={classes}>{() => (classId ? <ClassOutcomes key={classId} classId={classId} studentBase={studentBase} /> : <Empty title="No classes yet" />)}</QueryState>
    </>
  );
}
