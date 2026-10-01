/**
 * Psychometric profile, staff side:
 *   TeacherObservationsPage  rate what you see once a term (with level descriptions), and enter PE fitness tests
 *   ConversationsPage        "suggest a conversation" requests: the counsellor's queue, or a teacher's own requests
 *   CounsellorSettings       school admins choose which teachers act as counsellor
 */
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Select, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { OBS_LEVELS, PSY_DOMAIN_INFO, type PsyDomain } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { Empty, PageHeader, QueryState, fmtDate } from '@/components/ui';
import { TabBar, useTab } from '@/components/AdminCommon';
import { useMyClasses } from './common';

interface Grid {
  term: string;
  dimensions: { _id: string; name: string; domain: PsyDomain; color?: string; description?: string; anchors?: Partial<Record<'1' | '2' | '3' | '4', string>> }[];
  students: { _id: string; name: string; rollNo?: string; consent: boolean }[];
  ratings: { studentId: string; skillId: string; level: number }[];
  otherRaters: number;
}
interface FitGrid {
  term: string;
  tests: { id: string; label: string; unit: string; better: 'lower' | 'higher'; min: number; max: number }[];
  students: { _id: string; name: string; rollNo?: string }[];
  records: { studentId: string; test: string; value: number }[];
}

const LEVEL_COLOR = ['#fff', '#FFF4E5', '#FEF9C3', '#ECFDF3', '#F3EEFF'];
const TABS = ['observe', 'fitness'] as const;

export function TeacherObservationsPage() {
  const classes = useMyClasses();
  const [classId, setClassId] = useState('');
  const [tab, setTab] = useTab(TABS, 'observe');
  const [guide, setGuide] = useState(false);
  useEffect(() => {
    if (!classId && classes.data?.length) setClassId(classes.data[0]._id);
  }, [classes.data, classId]);
  return (
    <>
      <PageHeader
        title="Observations"
        subtitle="Part of the psychometric profile (separate from the Genius Habits). Once a term, rate what you see each day, and enter PE fitness test results."
        actions={
          <Button variant="outlined" onClick={() => setGuide(true)}>
            How to rate fairly
          </Button>
        }
      />
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <TextField select size="small" label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ width: 220 }}>
          {(classes.data ?? []).map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <TabBar value={tab} onChange={setTab} tabs={[{ value: 'observe', label: 'What I observe' }, { value: 'fitness', label: 'PE fitness tests' }]} />
      {!classId ? <Empty title="No classes yet" /> : tab === 'observe' ? <ObservationGrid classId={classId} /> : <FitnessGrid classId={classId} />}
      <RatingGuide open={guide} onClose={() => setGuide(false)} />
    </>
  );
}

function RatingGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>How to rate fairly</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25} sx={{ '& li': { mb: 0.75 } }}>
          <Typography variant="body2">Ratings describe what you have seen over the last few weeks — not one incident, and not how you feel about the child.</Typography>
          <Box component="ol" sx={{ pl: 2.5, m: 0, fontSize: 14 }}>
            <li>Read the description of each level (hover a level in the list). Choose the level that matches most days.</li>
            <li>If you have not seen enough to judge, leave it blank. A blank is better than a guess.</li>
            <li>Rate one dimension across the whole class at a time, so you compare like with like.</li>
            <li>Watch for bias: a child who is quiet, from a different background, or whose sibling you taught deserves the same standard.</li>
            <li>Hygiene and grooming can reflect home circumstances. Rate what you see, but respond with care and privately — never in front of other children.</li>
            <li>Where possible, a second teacher (e.g. the PE or class teacher) rates the same children. Nanoskool compares the two ratings to check agreement.</li>
            <li>Ratings are seen only by staff and the child’s parents. They are never used for marks, ranks or streaming.</li>
          </Box>
          <Typography variant="body2" color="text.secondary">
            1 Rarely · 2 Sometimes · 3 Usually · 4 Always. You can change a rating any time this term.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Got it</Button>
      </DialogActions>
    </Dialog>
  );
}

function ObservationGrid({ classId }: { classId: string }) {
  const q = useGet<Grid>(`/classes/${classId}/observations`);
  const save = useSend<{ studentId: string; skillId: string; level: number }>('put', `/classes/${classId}/observations`, { invalidate: ['/students'] });
  const [local, setLocal] = useState<Record<string, number>>({});
  useEffect(() => {
    if (q.data) setLocal(Object.fromEntries(q.data.ratings.map((r) => [`${r.studentId}:${r.skillId}`, r.level])));
  }, [q.data]);
  return (
    <QueryState q={q}>
      {(g) => {
        if (!g.dimensions.length) return <Empty title="No observed dimensions" hint="An admin can mark dimensions as “Teacher observation” in Assessment studio → Psychometric profile." />;
        const allowed = g.students.filter((s) => s.consent);
        const done = allowed.filter((s) => g.dimensions.every((d) => local[`${s._id}:${d._id}`])).length;
        return (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Term {g.term.replace('-T', ' · Term ')} · you have fully rated {done} of {allowed.length} students.{g.otherRaters ? ` Another teacher has also added ${g.otherRaters} ratings for this class.` : ''}{' '}
              {g.students.length > allowed.length ? `${g.students.length - allowed.length} ${g.students.length - allowed.length === 1 ? "student is" : "students are"} greyed out: no parent permission yet.` : ''}
            </Alert>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', '& th, & td': { borderBottom: '1px solid #EEE', p: 0.75, fontSize: 13 }, '& th': { textAlign: 'left', fontWeight: 700, verticalAlign: 'bottom' } }}>
                <thead>
                  <tr>
                    <Box component="th" sx={{ position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 1, minWidth: 180 }}>
                      Student
                    </Box>
                    {g.dimensions.map((d) => (
                      <th key={d._id} style={{ minWidth: 126 }}>
                        <Tooltip title={d.description ?? ''}>
                          <span>
                            {PSY_DOMAIN_INFO[d.domain]?.icon} {d.name}
                          </span>
                        </Tooltip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.students.map((s) => (
                    <Box component="tr" key={s._id} sx={{ opacity: s.consent ? 1 : 0.45 }}>
                      <Box component="td" sx={{ position: 'sticky', left: 0, bgcolor: '#fff', fontWeight: 600 }}>
                        {s.rollNo ? `${s.rollNo}. ` : ''}
                        {s.name}
                      </Box>
                      {g.dimensions.map((d) => {
                        const k = `${s._id}:${d._id}`;
                        const v = local[k] ?? 0;
                        return (
                          <td key={d._id}>
                            <Select
                              size="small"
                              value={v}
                              disabled={!s.consent}
                              aria-label={`${d.name} for ${s.name}`}
                              onChange={(e) => {
                                const level = Number(e.target.value);
                                setLocal((x) => ({ ...x, [k]: level }));
                                save.mutate({ studentId: s._id, skillId: d._id, level });
                              }}
                              renderValue={(x) => (x ? `${x} ${OBS_LEVELS[x as number]}` : '—')}
                              sx={{ width: '100%', fontSize: 13, bgcolor: LEVEL_COLOR[v] }}
                            >
                              <MenuItem value={0}>— Not rated</MenuItem>
                              {[1, 2, 3, 4].map((l) => (
                                <MenuItem key={l} value={l} sx={{ display: 'block', whiteSpace: 'normal', maxWidth: 360 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {l} {OBS_LEVELS[l]}
                                  </Typography>
                                  {d.anchors?.[String(l) as '1'] && (
                                    <Typography variant="caption" color="text.secondary">
                                      {d.anchors[String(l) as '1']}
                                    </Typography>
                                  )}
                                </MenuItem>
                              ))}
                            </Select>
                          </td>
                        );
                      })}
                    </Box>
                  ))}
                </tbody>
              </Box>
            </Paper>
          </>
        );
      }}
    </QueryState>
  );
}

function FitnessGrid({ classId }: { classId: string }) {
  const q = useGet<FitGrid>(`/classes/${classId}/fitness`);
  const save = useSend<{ studentId: string; test: string; value: number | null }>('put', `/classes/${classId}/fitness`, { invalidate: ['/students'] });
  const [local, setLocal] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data) setLocal(Object.fromEntries(q.data.records.map((r) => [`${r.studentId}:${r.test}`, String(r.value)])));
  }, [q.data]);
  return (
    <QueryState q={q}>
      {(g) => (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Standard PE tests (no BMI or weight). Each result is compared with children of the same grade (and gender, when there are enough) to give a percentile. Leave a box empty if the child did not take the test.
          </Alert>
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', '& th, & td': { borderBottom: '1px solid #EEE', p: 0.75, fontSize: 13 }, '& th': { textAlign: 'left', fontWeight: 700, verticalAlign: 'bottom' } }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Student</th>
                  {g.tests.map((t) => (
                    <th key={t.id} style={{ minWidth: 118 }}>
                      {t.label}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400 }}>
                        {t.unit} · {t.better === 'lower' ? 'lower is better' : 'higher is better'}
                      </Typography>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.students.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>
                      {s.rollNo ? `${s.rollNo}. ` : ''}
                      {s.name}
                    </td>
                    {g.tests.map((t) => {
                      const k = `${s._id}:${t.id}`;
                      return (
                        <td key={t.id}>
                          <TextField
                            size="small"
                            type="number"
                            value={local[k] ?? ''}
                            onChange={(e) => setLocal((x) => ({ ...x, [k]: e.target.value }))}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              const prev = g.records.find((r) => r.studentId === s._id && r.test === t.id);
                              if ((v === '' && !prev) || (prev && String(prev.value) === v)) return;
                              save.mutate({ studentId: s._id, test: t.id, value: v === '' ? null : Number(v) });
                            }}
                            slotProps={{ htmlInput: { min: t.min, max: t.max, step: 0.1, 'aria-label': `${t.label} for ${s.name}` } }}
                            sx={{ width: 104 }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Box>
          </Paper>
        </>
      )}
    </QueryState>
  );
}

/* ------------------------------------------------------------------ Conversations */

interface Conversation {
  _id: string;
  studentId: { _id: string; name: string; rollNo?: string } | null;
  reason: string;
  areas?: string[];
  status: 'open' | 'in_progress' | 'closed';
  notes: { text: string; by?: { name: string }; at: string }[];
  by?: { name: string };
  createdAt: string;
}
const STATUS_LABEL = { open: 'New', in_progress: 'In progress', closed: 'Closed' } as const;

export function ConversationsPage({ extra }: { extra?: ReactNode }) {
  const [status, setStatus] = useState<'' | 'open' | 'in_progress' | 'closed'>('');
  const q = useGet<{ counsellor: boolean; items: Conversation[] }>('/psychometric/conversations', status ? { status } : undefined);
  return (
    <>
      <PageHeader title="Conversations" subtitle="“Suggest a conversation” requests about a child’s wellbeing. The school counsellor sees all of them; teachers see their own. Parents and other children never see them." />
      {extra}
      <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {(['', 'open', 'in_progress', 'closed'] as const).map((s) => (
          <Chip key={s} label={s ? STATUS_LABEL[s] : 'All'} onClick={() => setStatus(s)} color={status === s ? 'primary' : 'default'} />
        ))}
      </Stack>
      <QueryState q={q}>
        {(d) => (
          <Stack spacing={1.5}>
            {!d.counsellor && <Alert severity="info">You see the requests you made. To raise one, open a student’s page and choose “Suggest a conversation with the counsellor”.</Alert>}
            {d.items.length === 0 && <Empty title="No requests" />}
            {d.items.map((c) => (
              <ConversationCard key={c._id} c={c} counsellor={d.counsellor} />
            ))}
          </Stack>
        )}
      </QueryState>
    </>
  );
}

function ConversationCard({ c, counsellor }: { c: Conversation; counsellor: boolean }) {
  const [note, setNote] = useState('');
  const upd = useSend<{ status?: string; note?: string }>('patch', `/psychometric/conversations/${c._id}`, { success: 'Updated', invalidate: ['/psychometric/conversations'], onSuccess: () => setNote('') });
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 700 }}>{c.studentId?.name ?? 'Student'}</Typography>
        <Chip size="small" label={STATUS_LABEL[c.status]} color={c.status === 'open' ? 'warning' : c.status === 'closed' ? 'default' : 'info'} />
        <Typography variant="caption" color="text.secondary">
          from {c.by?.name ?? 'a teacher'} · {fmtDate(c.createdAt)}
        </Typography>
      </Stack>
      <Typography variant="body2">{c.reason}</Typography>
      {!!c.areas?.length && (
        <Typography variant="caption" color="text.secondary">
          Profile areas: {c.areas.join(', ')}
        </Typography>
      )}
      {counsellor && (
        <Box sx={{ mt: 1.5 }}>
          {c.notes.map((n, i) => (
            <Typography key={i} variant="body2" sx={{ pl: 1.5, borderLeft: '3px solid #E5E0F5', mb: 0.75 }}>
              {n.text}{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                — {n.by?.name}, {fmtDate(n.at)}
              </Typography>
            </Typography>
          ))}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
            <TextField size="small" fullWidth placeholder="Private counsellor note" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="small" variant="outlined" disabled={!note.trim() || upd.isPending} onClick={() => upd.mutate({ note, status: c.status === 'open' ? 'in_progress' : undefined })}>
              Add note
            </Button>
            {c.status !== 'closed' ? (
              <Button size="small" onClick={() => upd.mutate({ status: 'closed' })}>
                Close
              </Button>
            ) : (
              <Button size="small" onClick={() => upd.mutate({ status: 'open' })}>
                Reopen
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}

/** School admins choose which teachers act as the school counsellor. */
export function CounsellorSettings() {
  const q = useGet<{ _id: string; name: string; email?: string; isCounsellor?: boolean }[]>('/psychometric/counsellors');
  const set = useSend<{ id: string; isCounsellor: boolean }>('patch', (b) => `/psychometric/counsellors/${b.id}`, { success: 'Saved', invalidate: ['/psychometric/counsellors'] });
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>School counsellors</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Counsellors see every conversation request in the school and can add private notes. School admins can always see them.
      </Typography>
      <QueryState q={q}>
        {(rows) => (
          <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 3 }}>
            {rows.length === 0 && <Typography color="text.secondary">No teachers yet.</Typography>}
            {rows.map((t) => (
              <FormControlLabel key={t._id} control={<Switch checked={!!t.isCounsellor} onChange={(e) => set.mutate({ id: t._id, isCounsellor: e.target.checked })} />} label={t.name} />
            ))}
          </Stack>
        )}
      </QueryState>
    </Paper>
  );
}

export function SchoolWellbeingPage() {
  return (
<ConversationsPage extra={<CounsellorSettings />} />
  );
}
