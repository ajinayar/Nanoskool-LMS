/** Assessment studio, in three separate parts: the 8 Genius Habits (Genius Quests), the psychometric profile (Know Yourself) and the cognitive profile (Thinking Puzzles). */
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import {
  GRADES_1_10,
  LANG_NAMES,
  PSY_DOMAINS,
  PSY_DOMAIN_INFO,
  STAGES,
  STAGE_INFO,
  gradesLabel,
  type AssessmentForm,
  type AssessmentItem,
  type Framework,
  type ItemTranslation,
  type ItemType,
  type PsyDomain,
  type Skill,
  type Tool,
} from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { ConfirmDialog, DataTable, Empty, FormDialog, PageHeader, QueryState, StatusChip, UploadButton, fromNow } from '@/components/ui';
import { FilterSelect, FormError, RowMenu, TabBar, useTab } from '@/components/AdminCommon';
import { Tag } from '@/components/clarity';
import { QuestMedia, mediaKindOf } from '@/components/QuestMedia';
import { ReviewQueue } from '@/pages/shared/ReviewPages';
import { CognitiveNormsTab, ThinkingAreasTab } from './CognitiveStudio';

const TABS = ['skills', 'items', 'missions', 'quality', 'tools', 'reviews'] as const;
const TYPE_LABEL: Record<ItemType, string> = { single: 'One answer', multiple: 'Several answers', scale: 'Self-rating scale', open: 'Written answer', upload: 'Photo or file task' };

const PARTS: { id: Framework; icon: string; title: string; text: string }[] = [
  { id: 'genius', icon: '🌳', title: 'Part 1 · Genius Habits', text: 'The 8 Genius Habits, checked each term by the Genius Quest. Seed → Sprout → Sapling → Bloom → Fruit.' },
  { id: 'psychometric', icon: '🧭', title: 'Part 2 · Personal profile', text: 'Know Yourself (psychometric): personality, physical and spiritual (values) — child, parent, teacher observation and PE tests.' },
  { id: 'cognitive', icon: '🧩', title: 'Part 3 · Cognitive profile', text: 'Thinking Puzzles: attention, patterns, logic, words, numbers and memory — puzzles with right answers, shown as a strengths shape.' },
];
const PART_BG: Record<Framework, string> = { genius: '#F4FAEE', psychometric: '#EEF4FF', cognitive: '#F6F0FF' };
const WORD = {
  genius: { quest: 'Genius Quest', quests: 'Genius Quests', dim: 'Genius Habit', dims: 'Genius Habits' },
  psychometric: { quest: 'Know Yourself profile', quests: 'Know Yourself profiles', dim: 'Dimension', dims: 'Dimensions' },
  cognitive: { quest: 'Thinking Puzzles set', quests: 'Puzzle sets', dim: 'Thinking area', dims: 'Thinking areas' },
} as const;

export default function AssessmentStudioPage() {
  const [params, setParams] = useSearchParams();
  const part: Framework = params.get('part') === 'psychometric' ? 'psychometric' : params.get('part') === 'cognitive' ? 'cognitive' : 'genius';
  const [tab, setTab] = useTab(TABS, 'skills');
  const setPart = (p: Framework) => {
    const next = new URLSearchParams(params);
    next.set('part', p);
    if ((p !== 'genius' && (tab === 'tools' || tab === 'reviews')) || (p === 'genius' && tab === 'quality')) next.set('tab', 'skills');
    setParams(next, { replace: true });
  };
  const w = WORD[part];
  const tabs: { value: (typeof TABS)[number]; label: string }[] = [
    { value: 'skills', label: w.dims },
    { value: 'items', label: 'Item bank' },
    { value: 'missions', label: w.quests },
    ...(part === 'genius'
      ? ([
          { value: 'tools', label: 'Outcome tools' },
          { value: 'reviews', label: 'Review queue' },
        ] as const)
      : ([{ value: 'quality', label: part === 'cognitive' ? 'Norms' : 'Quality & norms' }] as const)),
  ];
  const shown = tabs.some((t) => t.value === tab) ? tab : 'skills';
  return (
    <>
      <PageHeader title="Assessment studio" subtitle="Three separate parts: what each student habitually does, who they are, and how they think." />
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, mb: 2.5 }}>
        {PARTS.map((p) => {
          const on = p.id === part;
          return (
            <Paper
              key={p.id}
              variant="outlined"
              component="button"
              onClick={() => setPart(p.id)}
              aria-pressed={on}
              sx={{ p: 2, textAlign: 'left', font: 'inherit', cursor: 'pointer', display: 'flex', gap: 1.5, alignItems: 'flex-start', borderWidth: 2, borderColor: on ? '#17171C' : 'divider', bgcolor: on ? PART_BG[p.id] : '#fff' }}
            >
              <Box sx={{ fontSize: 30, lineHeight: 1 }}>{p.icon}</Box>
              <Box>
                <Typography sx={{ fontWeight: 750 }}>{p.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {p.text}
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>
      <TabBar value={shown} onChange={setTab} tabs={tabs} />
      {shown === 'skills' && (part === 'genius' ? <SkillsTab /> : part === 'cognitive' ? <ThinkingAreasTab /> : <DimensionsTab />)}
      {shown === 'items' && <ItemsTab key={part} fw={part} />}
      {shown === 'missions' && <MissionsTab key={part} fw={part} />}
      {shown === 'quality' && (part === 'cognitive' ? <CognitiveNormsTab /> : <QualityTab />)}
      {shown === 'tools' && <ToolsTab />}
      {shown === 'reviews' && <ReviewQueue />}
    </>
  );
}

/* ------------------------------------------------------------------ Psychometric dimensions */

const ASSESSED_LABEL = { quest: 'Questions', observation: 'Teacher observation', both: 'Questions + observation' } as const;

function DimensionsTab() {
  const raw = useGet<Skill[]>('/skills', { all: true, framework: 'psychometric' });
  // Only psychometric dimensions belong here — never the 8 Genius Habits
  const q = { ...raw, data: raw.data?.filter((s) => s.framework === 'psychometric') };
  const oldServer = !!raw.data?.length && !raw.data.some((s) => s.framework === 'psychometric');
  const [edit, setEdit] = useState<Partial<Skill> | null>(null);
  return (
    <>
      {oldServer && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The server is still running the previous version, so the psychometric dimensions are not loaded yet. Please use Stop Nanoskool, then Start Nanoskool.
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        The psychometric profile is a screening tool to understand and support each child. It is not a clinical test or a diagnosis, and children are never labelled. “Spiritual” means values and inner life, not religion.
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}>
        <Typography color="text.secondary">Things you can see (hygiene, grooming, fitness) are rated by the class teacher each term; the rest come from the student’s Know Yourself answers.</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEdit({ name: '', domain: 'personality', assessedBy: 'both', active: true, framework: 'psychometric' })} sx={{ flexShrink: 0 }}>
          New dimension
        </Button>
      </Stack>
      <QueryState q={q}>
        {(rows) => (
          <Stack spacing={2.5}>
            {rows.length === 0 && <Empty title="No dimensions yet" hint="Restart Nanoskool to add the starting set of 16, or add your own." />}
            {PSY_DOMAINS.map((d) => {
              const list = rows.filter((r) => (r.domain ?? 'personality') === d);
              if (!list.length) return null;
              const info = PSY_DOMAIN_INFO[d];
              return (
                <Box key={d}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'baseline' }, mb: 1 }}>
                    <Typography sx={{ fontWeight: 750, fontSize: 17 }}>
                      {info.icon} {info.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {info.about}
                    </Typography>
                  </Stack>
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
                    {list.map((s) => (
                      <Paper key={s._id} variant="outlined" sx={{ p: 2, borderLeft: `4px solid ${s.color || info.color}`, bgcolor: info.soft, opacity: s.active === false ? 0.55 : 1 }}>
                        <Stack direction="row" sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 700, flex: 1 }}>{s.name}</Typography>
                          <IconButton size="small" aria-label={`Edit ${s.name}`} onClick={() => setEdit(s)}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {s.description || 'No description'}
                        </Typography>
                        <Stack direction="row" spacing={0.75}>
                          <Tag label={ASSESSED_LABEL[s.assessedBy ?? 'quest']} tone={s.assessedBy === 'quest' ? 'info' : 'good'} />
                          {s.active === false && <Tag label="Retired" tone="bad" />}
                        </Stack>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </QueryState>
      {edit && <DimensionDialog dim={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function DimensionDialog({ dim, onClose }: { dim: Partial<Skill>; onClose: () => void }) {
  const [s, setS] = useState<Partial<Skill>>(dim);
  const save = useSend<Partial<Skill>>(dim._id ? 'patch' : 'post', dim._id ? `/skills/${dim._id}` : '/skills', { success: 'Dimension saved', invalidate: ['/skills'], onSuccess: onClose });
  return (
    <FormDialog
      open
      title={dim._id ? 'Edit dimension' : 'New dimension'}
      onClose={onClose}
      loading={save.isPending}
      onSubmit={() => save.mutate({ name: s.name, framework: 'psychometric', domain: s.domain, assessedBy: s.assessedBy, description: s.description ?? '', color: s.color, active: s.active, anchors: s.anchors })}
    >
      <TextField label="Name" value={s.name ?? ''} onChange={(e) => setS({ ...s, name: e.target.value })} required autoFocus placeholder="Personal hygiene" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField select label="Area" value={s.domain ?? 'personality'} onChange={(e) => setS({ ...s, domain: e.target.value as PsyDomain })} sx={{ minWidth: 220 }}>
          {PSY_DOMAINS.map((d) => (
            <MenuItem key={d} value={d}>
              {PSY_DOMAIN_INFO[d].icon} {PSY_DOMAIN_INFO[d].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="How it is assessed" value={s.assessedBy ?? 'quest'} onChange={(e) => setS({ ...s, assessedBy: e.target.value as Skill['assessedBy'] })} sx={{ minWidth: 220 }}>
          {(Object.keys(ASSESSED_LABEL) as (keyof typeof ASSESSED_LABEL)[]).map((k) => (
            <MenuItem key={k} value={k}>
              {ASSESSED_LABEL[k]}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Colour" type="color" value={s.color || PSY_DOMAIN_INFO[s.domain ?? 'personality'].color} onChange={(e) => setS({ ...s, color: e.target.value })} sx={{ width: 120 }} />
      </Stack>
      <TextField label="What it looks like (teachers and parents see this)" value={s.description ?? ''} onChange={(e) => setS({ ...s, description: e.target.value })} multiline minRows={2} />
      {s.assessedBy !== 'quest' && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            What each observation level looks like — teachers see this when they rate, so ratings mean the same thing in every class
          </Typography>
          <Stack spacing={1}>
            {(['1', '2', '3', '4'] as const).map((l) => (
              <TextField key={l} size="small" label={`${l} ${['', 'Rarely', 'Sometimes', 'Usually', 'Always'][Number(l)]}`} value={s.anchors?.[l] ?? ''} onChange={(e) => setS({ ...s, anchors: { ...s.anchors, [l]: e.target.value } })} />
            ))}
          </Stack>
        </Box>
      )}
      <FormControlLabel control={<Switch checked={s.active !== false} onChange={(e) => setS({ ...s, active: e.target.checked })} />} label="In use (turn off to retire; past results are kept)" />
      <FormError error={save.error} />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Skills */

function SkillsTab() {
  const q = useGet<Skill[]>('/skills', { all: true });
  const [edit, setEdit] = useState<Partial<Skill> | null>(null);
  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography color="text.secondary">Each habit has a child-friendly Genius Habit name and an academic name for teachers and reports.</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEdit({ name: '', habit: '', active: true, minGrade: 1, maxGrade: 12 })}>
          New habit
        </Button>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5, background: 'linear-gradient(90deg,#F4FAEE,#FFF6EF)' }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>How every habit grows</Typography>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' } }}>
          {STAGES.map((st, i) => (
            <Box key={st}>
              <Typography sx={{ fontWeight: 700 }}>
                {STAGE_INFO[st].icon} {i + 1}. {STAGE_INFO[st].label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {STAGE_INFO[st].adult}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: STAGE_INFO[st].color }}>
                Score {STAGE_INFO[st].range}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
      <QueryState q={q}>
        {(rows) => (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {rows.length === 0 && <Empty title="No Genius Habits yet" hint="Run npm run demo:journey for the starting set of eight, or add your own." />}
            {rows.map((s) => (
              <Paper key={s._id} variant="outlined" sx={{ p: 2.5, opacity: s.active === false ? 0.55 : 1, position: 'relative' }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: s.color || '#C9B8F4' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{s.habit || s.name}</Typography>
                    {s.habit && (
                      <Typography variant="caption" color="text.secondary">
                        {s.name}
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small" aria-label={`Edit ${s.name}`} onClick={() => setEdit(s)}>
                    <EditOutlined fontSize="small" />
                  </IconButton>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {s.description || 'No description'}
                </Typography>
                <Stack direction="row" spacing={0.75}>
                  <Tag label={`Grades ${s.minGrade ?? 1}–${s.maxGrade ?? 12}`} tone="info" />
                  {s.active === false && <Tag label="Retired" tone="bad" />}
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </QueryState>
      {edit && <SkillDialog skill={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function SkillDialog({ skill, onClose }: { skill: Partial<Skill>; onClose: () => void }) {
  const [s, setS] = useState<Partial<Skill>>(skill);
  const save = useSend<Partial<Skill>>(skill._id ? 'patch' : 'post', skill._id ? `/skills/${skill._id}` : '/skills', { success: 'Genius Habit saved', invalidate: ['/skills'], onSuccess: onClose });
  const lv = s.levels ?? {};
  return (
    <FormDialog
      open
      title={skill._id ? 'Edit Genius Habit' : 'New Genius Habit'}
      onClose={onClose}
      loading={save.isPending}
      onSubmit={() => save.mutate({ name: s.name, habit: s.habit ?? '', description: s.description ?? '', levels: s.levels, color: s.color, minGrade: s.minGrade, maxGrade: s.maxGrade, active: s.active })}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField label="Genius Habit name (children and parents see this)" value={s.habit ?? ''} onChange={(e) => setS({ ...s, habit: e.target.value })} placeholder="Sharp Thinker" autoFocus />
        <TextField label="Academic name (teachers and reports)" value={s.name ?? ''} onChange={(e) => setS({ ...s, name: e.target.value })} required placeholder="Critical thinking" />
      </Stack>
      <TextField label="What it means" value={s.description ?? ''} onChange={(e) => setS({ ...s, description: e.target.value })} multiline minRows={2} />
      <Stack direction="row" spacing={1.5}>
        <TextField label="From grade" type="number" value={s.minGrade ?? 1} onChange={(e) => setS({ ...s, minGrade: Number(e.target.value) })} slotProps={{ htmlInput: { min: 1, max: 12 } }} />
        <TextField label="To grade" type="number" value={s.maxGrade ?? 12} onChange={(e) => setS({ ...s, maxGrade: Number(e.target.value) })} slotProps={{ htmlInput: { min: 1, max: 12 } }} />
        <TextField label="Colour" type="color" value={s.color || '#C9B8F4'} onChange={(e) => setS({ ...s, color: e.target.value })} sx={{ width: 120 }} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        What each growth stage looks like for this habit (shown to teachers and parents)
      </Typography>
      {STAGES.map((k) => (
        <TextField
          key={k}
          label={`${STAGE_INFO[k].icon} ${STAGE_INFO[k].label}`}
          value={lv[k] ?? ''}
          onChange={(e) => setS({ ...s, levels: { ...lv, [k]: e.target.value } })}
          placeholder={STAGE_INFO[k].adult}
          helperText={k === 'fruit' ? 'Reached only with a score of 85+ and teacher-verified work for this habit' : undefined}
        />
      ))}
      <FormControlLabel control={<Switch checked={s.active !== false} onChange={(e) => setS({ ...s, active: e.target.checked })} />} label="In use (turn off to retire the habit; past results are kept)" />
      <FormError error={save.error} />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Item bank */

function ItemsTab({ fw }: { fw: Framework }) {
  const w = WORD[fw];
  const [grade, setGrade] = useState('');
  const [skillId, setSkillId] = useState('');
  const skillsRaw = useGet<Skill[]>('/skills', { framework: fw });
  const skills = { ...skillsRaw, data: skillsRaw.data?.filter((s) => (fw === 'genius' ? s.framework !== 'psychometric' && s.framework !== 'cognitive' : s.framework === fw)) };
  const [who, setWho] = useState<'self' | 'parent'>('self');
  const q = useGet<AssessmentItem[]>('/assessment-items', { framework: fw, ...(fw === 'psychometric' ? { informant: who } : {}), ...(grade ? { grade } : {}), ...(skillId ? { skillId } : {}) });
  const [edit, setEdit] = useState<Partial<AssessmentItem> | null>(null);
  const [del, setDel] = useState<AssessmentItem | null>(null);
  const remove = useSend<string>('delete', (id) => `/assessment-items/${id}`, { success: 'Item deleted', invalidate: ['/assessment-items', '/assessment-forms'], onSuccess: () => setDel(null) });
  const name = (id: string) => {
    const k = skills.data?.find((s) => s._id === id);
    return k?.habit || k?.name || 'Habit';
  };
  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { md: 'center' }, gap: 1.5, '& > *': { m: '0 !important' } }}>
        {fw === 'psychometric' && (
          <Stack direction="row" spacing={0.75}>
            <Chip label="Child’s form" onClick={() => setWho('self')} color={who === 'self' ? 'primary' : 'default'} />
            <Chip label="Parent questionnaire" onClick={() => setWho('parent')} color={who === 'parent' ? 'primary' : 'default'} />
          </Stack>
        )}
        <FilterSelect label="Grade" value={grade} onChange={setGrade} allLabel="All grades" options={GRADES_1_10.map((g) => ({ value: String(g), label: `Grade ${g}` }))} />
        <FilterSelect label={w.dim} value={skillId} onChange={setSkillId} allLabel={`All ${w.dims.toLowerCase()}`} width={240} options={(skills.data ?? []).map((s) => ({ value: s._id, label: s.habit || s.name }))} />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() =>
            setEdit(
              fw === 'psychometric'
                ? { type: 'scale', prompt: '', scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'], skills: [], grades: grade ? [Number(grade)] : [], status: 'draft', reverse: false, informant: who }
                : fw === 'cognitive'
                  ? {
                      type: 'single',
                      prompt: '',
                      options: [
                        { text: '', score: 1 },
                        { text: '', score: 0 },
                        { text: '', score: 0 },
                        { text: '', score: 0 },
                      ],
                      skills: skillId ? [{ skillId, weight: 1 }] : [],
                      grades: grade ? [Number(grade)] : [],
                      status: 'draft',
                    }
                  : {
                      type: 'single',
                      prompt: '',
                      options: [
                        { text: '', score: 1 },
                        { text: '', score: 0 },
                      ],
                      skills: [],
                      grades: grade ? [Number(grade)] : [],
                      status: 'draft',
                    },
            )
          }
        >
          New item
        </Button>
      </Stack>
      <QueryState q={q}>
        {(rows) => (
          <Paper variant="outlined" sx={{ px: 2.5, py: 1 }}>
            <DataTable
              rows={rows}
              onRowClick={(r) => setEdit(r)}
              empty={<Empty title="No items" hint="Add questions, scenarios and short tasks. Tag each to the skills it shows." />}
              columns={[
                {
                  key: 'prompt',
                  label: 'Question or task',
                  render: (r) => (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', maxWidth: 540 }}>
                      {r.mediaUrl && (
                        <Tooltip title={{ image: 'Has a picture', video: 'Has a video', youtube: 'Has a YouTube video', audio: 'Has a sound' }[mediaKindOf(r.mediaUrl) ?? 'image']}>
                          <Box component="span" sx={{ fontSize: 16, lineHeight: 1.4 }}>
                            {mediaKindOf(r.mediaUrl) === 'image' ? '🖼️' : mediaKindOf(r.mediaUrl) === 'audio' ? '🔊' : '🎬'}
                          </Box>
                        </Tooltip>
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {r.prompt}
                      </Typography>
                      {r.validity === 'desirability' && (
                        <Tooltip title="Answer-quality check: not scored">
                          <Box component="span">
                            <Tag label="Check" tone="info" />
                          </Box>
                        </Tooltip>
                      )}
                      {!!r.translations?.some((x) => x.status === 'approved') && (
                        <Tag
                          label={r
                            .translations!.filter((x) => x.status === 'approved')
                            .map((x) => x.lang.toUpperCase())
                            .join(' ')}
                          tone="good"
                        />
                      )}
                      {r.reverse && (
                        <Tooltip title="Reverse-scored: agreeing means less of the trait">
                          <Box component="span">
                            <Tag label="Reverse" tone="warn" />
                          </Box>
                        </Tooltip>
                      )}
                      {r.stimulus && (
                        <Tooltip title={`Shows “${r.stimulus}” for ${r.stimulusSec ?? 5} s, then hides it`}>
                          <Box component="span">
                            <Tag label="Memory" tone="info" />
                          </Box>
                        </Tooltip>
                      )}
                      {!!r.timeSec && (
                        <Tooltip title={`${r.timeSec} seconds to answer`}>
                          <Box component="span">
                            <Tag label={`${r.timeSec} s`} tone="warn" />
                          </Box>
                        </Tooltip>
                      )}
                    </Stack>
                  ),
                },
                { key: 'type', label: 'Type', nowrap: true, render: (r) => TYPE_LABEL[r.type] },
                {
                  key: 'skills',
                  label: w.dims,
                  render: (r) => (
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {(r.skills ?? []).map((s) => (
                        <Tag key={s.skillId} label={name(s.skillId)} />
                      ))}
                    </Stack>
                  ),
                },
                { key: 'grades', label: 'Grades', nowrap: true, render: (r) => gradesLabel(r.grades) },
                { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusChip status={r.status ?? 'draft'} /> },
                {
                  key: 'x',
                  label: '',
                  align: 'right',
                  render: (r) => (
                    <span onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        label="Item actions"
                        actions={[
                          { label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => setEdit(r) },
                          { label: 'Delete', icon: <DeleteOutlined fontSize="small" />, danger: true, onClick: () => setDel(r) },
                        ]}
                      />
                    </span>
                  ),
                },
              ]}
            />
          </Paper>
        )}
      </QueryState>
      {edit && <ItemDialog fw={fw} item={edit} skills={skills.data ?? []} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} danger title="Delete this item?" message="It is also removed from draft missions." confirmLabel="Delete" loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del._id)} />
    </>
  );
}

function ItemDialog({ fw, item, skills, onClose }: { fw: Framework; item: Partial<AssessmentItem>; skills: Skill[]; onClose: () => void }) {
  const [it, setIt] = useState<Partial<AssessmentItem>>({ scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'], rubric: ['', '', '', ''], ...item });
  const [err, setErr] = useState<string | null>(null);
  const save = useSend<Record<string, unknown>>(item._id ? 'patch' : 'post', item._id ? `/assessment-items/${item._id}` : '/assessment-items', { success: 'Item saved', invalidate: ['/assessment-items'], onSuccess: onClose });
  const closed = it.type === 'single' || it.type === 'multiple';
  const open = it.type === 'open' || it.type === 'upload';
  const submit = () => {
    const v = !it.prompt?.trim()
      ? 'Write the question or task'
      : !(it.skills ?? []).length && !it.validity
        ? 'Tag at least one skill'
        : !(it.grades ?? []).length
          ? 'Choose at least one grade'
          : closed && (it.options ?? []).filter((o) => o.text.trim()).length < 2
            ? 'Add at least two options'
            : null;
    setErr(v);
    if (v) return;
    save.mutate({
      type: it.type,
      prompt: it.prompt!.trim(),
      mediaUrl: it.mediaUrl ?? '',
      ...(closed ? { options: (it.options ?? []).filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), score: Math.max(0, Math.min(1, o.score ?? 0)) })) } : {}),
      ...(it.type === 'scale' ? { scaleLabels: (it.scaleLabels ?? []).filter((x) => x.trim()) } : {}),
      ...(open ? { rubric: (it.rubric ?? []).map((x) => x.trim()) } : {}),
      skills: it.skills,
      grades: [...(it.grades ?? [])].sort((a, b) => a - b),
      status: it.status,
      framework: fw,
      reverse: it.type === 'scale' ? !!it.reverse : false,
      ...(fw === 'psychometric' ? { informant: it.informant ?? 'self', validity: it.validity ?? '', pairKey: it.pairKey ?? '', translations: (it.translations ?? []).filter((x) => x.prompt?.trim()) } : {}),
      ...(fw === 'cognitive' ? { stimulus: it.stimulus?.trim() ?? '', stimulusSec: it.stimulus?.trim() ? (it.stimulusSec ?? 5) : null, timeSec: it.timeSec || null, translations: (it.translations ?? []).filter((x) => x.prompt?.trim()) } : {}),
    });
  };
  return (
    <FormDialog open title={item._id ? 'Edit item' : 'New item'} maxWidth="md" onClose={onClose} onSubmit={submit} loading={save.isPending}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField select label="Type" value={it.type} onChange={(e) => setIt({ ...it, type: e.target.value as ItemType })} sx={{ width: { sm: 240 } }}>
          {(Object.keys(TYPE_LABEL) as ItemType[]).map((t) => (
            <MenuItem key={t} value={t}>
              {TYPE_LABEL[t]}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Status" value={it.status ?? 'draft'} onChange={(e) => setIt({ ...it, status: e.target.value as 'draft' })} sx={{ width: { sm: 180 } }}>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="published">Published</MenuItem>
        </TextField>
      </Stack>
      <TextField label="Question, scenario or task" value={it.prompt ?? ''} onChange={(e) => setIt({ ...it, prompt: e.target.value })} multiline minRows={2} required autoFocus />
      {fw === 'psychometric' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <TextField select size="small" label="Answered by" value={it.informant ?? 'self'} onChange={(e) => setIt({ ...it, informant: e.target.value as 'self' })} sx={{ width: 200 }}>
            <MenuItem value="self">The child</MenuItem>
            <MenuItem value="parent">A parent</MenuItem>
          </TextField>
          <TextField size="small" label="Pair code (optional)" value={it.pairKey ?? ''} onChange={(e) => setIt({ ...it, pairKey: e.target.value })} helperText="Same code on a statement and its reverse, to check consistency" sx={{ flex: 1 }} />
          <FormControlLabel control={<Switch checked={it.validity === 'desirability'} onChange={(e) => setIt({ ...it, validity: e.target.checked ? 'desirability' : '' })} />} label="“Too good to be true” check (not scored)" />
        </Stack>
      )}
      {fw === 'cognitive' && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#F8F5FF' }}>
          <Typography sx={{ fontWeight: 650, mb: 0.25 }}>Puzzle settings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Give exactly one option full credit. For working memory, add something to remember: children see it first, then it hides before the question appears. For attention & speed, set a time limit.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField size="small" label="Show first, then hide (memory)" placeholder="e.g. 7   2   9   4" value={it.stimulus ?? ''} onChange={(e) => setIt({ ...it, stimulus: e.target.value })} sx={{ flex: 1 }} />
            <TextField
              size="small"
              type="number"
              label="Seconds shown"
              value={it.stimulusSec ?? 5}
              disabled={!it.stimulus?.trim()}
              onChange={(e) => setIt({ ...it, stimulusSec: Number(e.target.value) || 5 })}
              sx={{ width: 140 }}
              slotProps={{ htmlInput: { min: 1, max: 60 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Time limit (seconds)"
              value={it.timeSec ?? ''}
              onChange={(e) => setIt({ ...it, timeSec: e.target.value ? Number(e.target.value) : null })}
              helperText="Empty = no limit"
              sx={{ width: 170 }}
              slotProps={{ htmlInput: { min: 3, max: 300 } }}
            />
          </Stack>
        </Paper>
      )}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#FBFAF7' }}>
        <Typography sx={{ fontWeight: 650, mb: 0.25 }}>Picture or video to answer from (optional)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Students see it above the question and answer based on it. Upload a picture, video or sound, or paste a YouTube link.
        </Typography>
        {it.mediaUrl ? (
          <Stack spacing={1.25}>
            <Box sx={{ maxWidth: 480 }}>
              <QuestMedia url={it.mediaUrl} radius={12} maxHeight={260} />
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip size="small" label={{ image: 'Picture', video: 'Video', youtube: 'YouTube video', audio: 'Sound' }[mediaKindOf(it.mediaUrl) ?? 'image']} />
              <UploadButton folder="assessment" accept="image/*,video/mp4,video/quicktime,video/webm,audio/mpeg" label="Replace" onUploaded={(url) => setIt({ ...it, mediaUrl: url })} />
              <Button size="small" color="error" onClick={() => setIt({ ...it, mediaUrl: '' })}>
                Remove
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <UploadButton folder="assessment" accept="image/*,video/mp4,video/quicktime,video/webm,audio/mpeg" label="Upload a file" onUploaded={(url) => setIt({ ...it, mediaUrl: url })} />
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
            <TextField
              size="small"
              fullWidth
              label="Paste a YouTube or picture link"
              placeholder="https://www.youtube.com/watch?v=…"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (/^https:\/\//.test(v)) setIt({ ...it, mediaUrl: v });
              }}
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === 'Enter' && /^https:\/\//.test(v)) {
                  e.preventDefault();
                  setIt({ ...it, mediaUrl: v });
                }
              }}
            />
          </Stack>
        )}
      </Paper>
      {closed && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Options and credit (1 = full credit, 0.5 = partly right, 0 = no credit)
          </Typography>
          <Stack spacing={1}>
            {(it.options ?? []).map((o, i) => (
              <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField label={`Option ${i + 1}`} value={o.text} onChange={(e) => setIt({ ...it, options: it.options!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <TextField
                  label="Credit"
                  type="number"
                  value={o.score ?? 0}
                  onChange={(e) => setIt({ ...it, options: it.options!.map((x, j) => (j === i ? { ...x, score: Number(e.target.value) } : x)) })}
                  sx={{ width: 110 }}
                  slotProps={{ htmlInput: { min: 0, max: 1, step: 0.1 } }}
                />
                <IconButton aria-label="Remove option" onClick={() => setIt({ ...it, options: it.options!.filter((_, j) => j !== i) })}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={() => setIt({ ...it, options: [...(it.options ?? []), { text: '', score: 0 }] })} disabled={(it.options?.length ?? 0) >= 8}>
            Add option
          </Button>
        </Box>
      )}
      {it.type === 'scale' && (
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {(it.scaleLabels ?? []).map((l, i) => (
              <TextField key={i} label={`Point ${i + 1}`} value={l} onChange={(e) => setIt({ ...it, scaleLabels: it.scaleLabels!.map((x, j) => (j === i ? e.target.value : x)) })} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setIt({ ...it, scaleLabels: ['Not like me', 'A bit like me', 'Just like me'] })}>
              3-point (Grades 1–3)
            </Button>
            <Button size="small" onClick={() => setIt({ ...it, scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] })}>
              5-point
            </Button>
          </Stack>
          <FormControlLabel control={<Switch checked={!!it.reverse} onChange={(e) => setIt({ ...it, reverse: e.target.checked })} />} label="Reverse-scored (agreeing means less of the trait, e.g. “Small problems make me lose my temper”)" />
        </Stack>
      )}
      {open && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Rubric: what each level looks like (the teacher picks one)
          </Typography>
          <Stack spacing={1}>
            {[0, 1, 2, 3].map((i) => (
              <TextField key={i} label={`Level ${i + 1}`} value={it.rubric?.[i] ?? ''} onChange={(e) => setIt({ ...it, rubric: [0, 1, 2, 3].map((j) => (j === i ? e.target.value : (it.rubric?.[j] ?? ''))) })} />
            ))}
          </Stack>
        </Box>
      )}
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {fw === 'psychometric' ? 'Dimensions it measures, and how strongly (weight)' : fw === 'cognitive' ? 'Thinking area it measures (usually just one)' : 'Genius Habits it shows, and how strongly (weight)'}
        </Typography>
        <Stack spacing={1}>
          {skills.map((s) => {
            const cur = (it.skills ?? []).find((x) => x.skillId === s._id);
            return (
              <Stack key={s._id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <FormControlLabel
                  sx={{ flex: 1 }}
                  control={<Checkbox checked={!!cur} onChange={(e) => setIt({ ...it, skills: e.target.checked ? [...(it.skills ?? []), { skillId: s._id, weight: 1 }] : (it.skills ?? []).filter((x) => x.skillId !== s._id) })} />}
                  label={fw === 'psychometric' && s.domain ? `${PSY_DOMAIN_INFO[s.domain].icon} ${s.name}` : s.habit || s.name}
                />
                {cur && (
                  <TextField
                    label="Weight"
                    type="number"
                    value={cur.weight}
                    onChange={(e) => setIt({ ...it, skills: (it.skills ?? []).map((x) => (x.skillId === s._id ? { ...x, weight: Number(e.target.value) || 1 } : x)) })}
                    sx={{ width: 110 }}
                    slotProps={{ htmlInput: { min: 0.1, max: 10, step: 0.5 } }}
                  />
                )}
              </Stack>
            );
          })}
        </Stack>
      </Box>
      {fw !== 'genius' && <TranslationsEditor it={it} onChange={(translations) => setIt({ ...it, translations })} />}
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Grades it suits (tap each grade)
        </Typography>
        <GradePicker value={it.grades ?? []} onChange={(grades) => setIt({ ...it, grades })} />
      </Box>
      <FormError message={err} error={save.error} />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Missions */

/** Tap grades 1–10 on and off, with quick picks. */
function GradePicker({ value, onChange }: { value: number[]; onChange: (g: number[]) => void }) {
  const toggle = (g: number) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
        {GRADES_1_10.map((g) => {
          const on = value.includes(g);
          return <Chip key={g} label={`Grade ${g}`} onClick={() => toggle(g)} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} sx={{ fontWeight: 600, minWidth: 82 }} />;
        })}
      </Stack>
      <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          Quick pick:
        </Typography>
        {(
          [
            ['1–3', [1, 2, 3]],
            ['4–7', [4, 5, 6, 7]],
            ['8–10', [8, 9, 10]],
            ['All', GRADES_1_10],
          ] as [string, number[]][]
        ).map(([l, g]) => (
          <Button key={l} size="small" onClick={() => onChange([...new Set([...value, ...g])])} sx={{ minWidth: 0, px: 1 }}>
            + {l}
          </Button>
        ))}
        {value.length > 0 && (
          <Button size="small" color="inherit" onClick={() => onChange([])} sx={{ minWidth: 0, px: 1, color: 'text.secondary' }}>
            Clear
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function MissionsTab({ fw }: { fw: Framework }) {
  const [who, setWho] = useState<'self' | 'parent'>('self');
  const w = fw === 'psychometric' && who === 'parent' ? { ...WORD.psychometric, quest: 'parent questionnaire', quests: 'parent questionnaires' } : WORD[fw];
  const all = useGet<AssessmentForm[]>('/assessment-forms', { framework: fw });
  const q = { ...all, data: all.data?.filter((f) => (fw !== 'psychometric' ? true : who === 'parent' ? f.informant === 'parent' : f.informant !== 'parent')) };
  const [grade, setGrade] = useState(1);
  const [edit, setEdit] = useState<Partial<AssessmentForm> | null>(null);
  const [copy, setCopy] = useState<AssessmentForm | null>(null);
  const publish = useSend<string>('post', (id) => `/assessment-forms/${id}/publish`, { success: `${w.quest} published`, invalidate: ['/assessment-forms', '/assessment-items'] });
  return (
    <QueryState q={q}>
      {(rows) => {
        const forms = rows.filter((f) => f.grade === grade);
        return (
          <>
            {fw === 'psychometric' && (
              <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }}>
                <Chip label="Child’s forms" onClick={() => setWho('self')} color={who === 'self' ? 'primary' : 'default'} />
                <Chip label="Parent questionnaires" onClick={() => setWho('parent')} color={who === 'parent' ? 'primary' : 'default'} />
              </Stack>
            )}
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              Each grade has its own {w.quest}, taken once a term. A green dot means one is published for that grade.
            </Typography>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(5, 1fr)', md: 'repeat(10, 1fr)' }, mb: 2.5 }}>
              {GRADES_1_10.map((g) => {
                const live = rows.some((f) => f.grade === g && f.status === 'published');
                const drafts = rows.filter((f) => f.grade === g && f.status === 'draft').length;
                const on = g === grade;
                return (
                  <Paper
                    key={g}
                    variant="outlined"
                    component="button"
                    onClick={() => setGrade(g)}
                    sx={{ cursor: 'pointer', p: 1.25, textAlign: 'center', font: 'inherit', bgcolor: on ? '#17171C' : '#fff', color: on ? '#fff' : 'text.primary', borderColor: on ? '#17171C' : 'divider', position: 'relative' }}
                  >
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', lineHeight: 1 }}>
                      Grade
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>{g}</Typography>
                    <Box sx={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', bgcolor: live ? '#2F9E44' : drafts ? '#F59F00' : '#D0CFD6' }} />
                  </Paper>
                );
              })}
            </Box>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
                Grade {grade} {w.quests}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() =>
                  setEdit({
                    title:
                      fw === 'psychometric' ? (who === 'parent' ? `Know Yourself — parent questionnaire, Grade ${grade}` : `Know Yourself — Grade ${grade}`) : fw === 'cognitive' ? `Thinking Puzzles — Grade ${grade}` : `Genius Quest · Grade ${grade}`,
                    grade,
                    itemIds: [],
                    informant: who,
                  })
                }
              >
                New {w.quest} for Grade {grade}
              </Button>
            </Stack>
            {forms.length === 0 && (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary', borderStyle: 'dashed' }}>
                No {w.quest} for Grade {grade} yet. Create one, or copy another grade’s here.
              </Paper>
            )}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
              {forms.map((f) => (
                <Paper key={f._id} variant="outlined" sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
                    <StatusChip status={f.status === 'retired' ? 'archived' : f.status} label={f.status} />
                    <Tag label={`Version ${f.version}`} tone="info" />
                  </Stack>
                  <Typography sx={{ fontWeight: 600 }}>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {f.itemIds.length} questions · {f.attemptCount ?? 0} children took it{f.timeLimitMin ? ` · ${f.timeLimitMin} min` : ''}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<EditOutlined />} onClick={() => setEdit(f)}>
                      Edit
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => setCopy(f)}>
                      Copy to other grades
                    </Button>
                    {f.status !== 'published' && (
                      <Button size="small" variant="contained" startIcon={<PublishOutlined />} onClick={() => publish.mutate(f._id)} disabled={publish.isPending}>
                        Publish
                      </Button>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Box>
            {edit && <MissionDialog fw={fw} form={edit} onClose={() => setEdit(null)} />}
            {copy && <CopyMissionDialog fw={fw} form={copy} onClose={() => setCopy(null)} />}
          </>
        );
      }}
    </QueryState>
  );
}

function CopyMissionDialog({ fw, form, onClose }: { fw: Framework; form: AssessmentForm; onClose: () => void }) {
  const [grades, setGrades] = useState<number[]>([]);
  const create = useSend<Record<string, unknown>>('post', '/assessment-forms', { invalidate: ['/assessment-forms'] });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      for (const g of grades.filter((x) => x !== form.grade)) {
        await create.mutateAsync({
          title: form.title.replace(/Grade \d+/i, `Grade ${g}`).includes(`Grade ${g}`) ? form.title.replace(/Grade \d+/i, `Grade ${g}`) : `${form.title} · Grade ${g}`,
          grade: g,
          intro: form.intro ?? '',
          itemIds: form.itemIds,
          timeLimitMin: form.timeLimitMin ?? null,
          framework: fw,
          ...(fw === 'psychometric' ? { informant: form.informant ?? 'self' } : {}),
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormDialog open title={`Copy “${form.title}”`} onClose={onClose} onSubmit={go} loading={busy} submitLabel={`Copy to ${grades.filter((x) => x !== form.grade).length || ''} grade${grades.length === 1 ? '' : 's'}`}>
      <Typography color="text.secondary">The copies are saved as drafts with the same questions. Change them for each grade, then publish.</Typography>
      <GradePicker value={grades.filter((g) => g !== form.grade)} onChange={(g) => setGrades(g.filter((x) => x !== form.grade))} />
    </FormDialog>
  );
}

function MissionDialog({ fw, form, onClose }: { fw: Framework; form: Partial<AssessmentForm>; onClose: () => void }) {
  const w = WORD[fw];
  const [f, setF] = useState<Partial<AssessmentForm>>(form);
  const items = useGet<AssessmentItem[]>('/assessment-items', { grade: f.grade, framework: fw, ...(fw === 'psychometric' ? { informant: f.informant ?? 'self' } : {}) });
  const save = useSend<Record<string, unknown>>(form._id ? 'patch' : 'post', form._id ? `/assessment-forms/${form._id}` : '/assessment-forms', { success: `${w.quest} saved`, invalidate: ['/assessment-forms'], onSuccess: onClose });
  const ids = f.itemIds ?? [];
  return (
    <FormDialog
      open
      maxWidth="md"
      title={form._id ? `Edit ${w.quest}` : `New ${w.quest} for Grade ${f.grade}`}
      onClose={onClose}
      loading={save.isPending}
      onSubmit={() => save.mutate({ title: f.title, grade: f.grade, intro: f.intro ?? '', itemIds: ids, timeLimitMin: f.timeLimitMin || null, framework: fw, ...(fw === 'psychometric' ? { informant: f.informant ?? 'self' } : {}) })}
    >
      {form.status === 'published' && (form.attemptCount ?? 0) > 0 && <Alert severity="info">Children have taken this mission. Changing the questions creates a new version so old and new results are never mixed up.</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField label="Title" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} required autoFocus />
        <TextField label="Time limit (minutes, optional)" type="number" value={f.timeLimitMin ?? ''} onChange={(e) => setF({ ...f, timeLimitMin: e.target.value ? Number(e.target.value) : null })} sx={{ width: { sm: 240 } }} />
      </Stack>
      <TextField label="Welcome message" value={f.intro ?? ''} onChange={(e) => setF({ ...f, intro: e.target.value })} multiline minRows={2} />
      <Typography variant="body2" color="text.secondary">
        Questions in this mission ({ids.length}) · tick to include, in this order
      </Typography>
      <QueryState q={items}>
        {(rows) => (
          <Stack spacing={0.5}>
            {rows.length === 0 && <Empty title="No items for this grade yet" hint="Add them in the Item bank tab." />}
            {rows.map((r) => (
              <FormControlLabel
                key={r._id}
                control={<Checkbox checked={ids.includes(r._id)} onChange={(e) => setF({ ...f, itemIds: e.target.checked ? [...ids, r._id] : ids.filter((x) => x !== r._id) })} />}
                label={
                  <span>
                    {r.prompt} <Chip size="small" label={TYPE_LABEL[r.type]} sx={{ ml: 0.5 }} />
                  </span>
                }
              />
            ))}
          </Stack>
        )}
      </QueryState>
      <FormError error={save.error} />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Tools */

function ToolsTab() {
  const q = useGet<Tool[]>('/tools');
  const [edit, setEdit] = useState<Partial<Tool> | null>(null);
  const [secret, setSecret] = useState<{ name: string; secret: string } | null>(null);
  const regen = useSend<Tool, { secret: string }>('post', (t) => `/tools/${t._id}/secret`, { onSuccess: (r, t) => setSecret({ name: t.name, secret: r.secret }) });
  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography color="text.secondary">Tools open with a one-time link and send their score back, signed with the tool's secret key.</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEdit({ name: '', kind: 'other', launchUrl: '', active: true })}>
          Register tool
        </Button>
      </Stack>
      {secret && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setSecret(null)}>
          Secret key for <b>{secret.name}</b>: <code style={{ wordBreak: 'break-all' }}>{secret.secret}</code>. Copy it now and give it to the tool's developers; it is not shown again. They send results to <code>POST /api/tools/results</code> with
          the headers <code>X-Nanoskool-Tool</code> (the tool id) and <code>X-Nanoskool-Signature</code> (HMAC-SHA256 of the body, hex).
        </Alert>
      )}
      <QueryState q={q}>
        {(rows) => (
          <Paper variant="outlined" sx={{ px: 2.5, py: 1 }}>
            <DataTable
              rows={rows}
              empty={<Empty title="No tools yet" />}
              columns={[
                {
                  key: 'name',
                  label: 'Tool',
                  render: (t) => (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.description}
                      </Typography>
                    </Box>
                  ),
                },
                { key: 'id', label: 'Tool id', nowrap: true, render: (t) => <code style={{ fontSize: 12.5 }}>{t._id}</code> },
                {
                  key: 'url',
                  label: 'Launch',
                  render: (t) =>
                    t.launchUrl?.startsWith('builtin:') ? (
                      <Tag label="Built-in demo" tone="warn" />
                    ) : t.launchUrl ? (
                      <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                        {t.launchUrl}
                      </Typography>
                    ) : (
                      <Tag label="Not connected" tone="bad" />
                    ),
                },
                { key: 'active', label: 'Status', nowrap: true, render: (t) => <StatusChip status={t.active ? 'active' : 'inactive'} /> },
                {
                  key: 'x',
                  label: '',
                  align: 'right',
                  render: (t) => (
                    <RowMenu
                      label="Tool actions"
                      actions={[
                        { label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => setEdit(t) },
                        { label: 'New secret key', icon: <KeyOutlined fontSize="small" />, onClick: () => regen.mutate(t) },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Paper>
        )}
      </QueryState>
      {edit && <ToolDialog tool={edit} onClose={() => setEdit(null)} onSecret={(name, s) => setSecret({ name, secret: s })} />}
    </>
  );
}

function ToolDialog({ tool, onClose, onSecret }: { tool: Partial<Tool>; onClose: () => void; onSecret: (name: string, secret: string) => void }) {
  const [t, setT] = useState<Partial<Tool>>(tool);
  const builtin = t.launchUrl?.startsWith('builtin:');
  const save = useSend<Partial<Tool>, Tool>(tool._id ? 'patch' : 'post', tool._id ? `/tools/${tool._id}` : '/tools', {
    success: 'Tool saved',
    invalidate: ['/tools'],
    onSuccess: (r) => {
      if (r.secret) onSecret(r.name, r.secret);
      onClose();
    },
  });
  return (
    <FormDialog
      open
      title={tool._id ? 'Edit tool' : 'Register a tool'}
      onClose={onClose}
      loading={save.isPending}
      onSubmit={() => save.mutate({ name: t.name, kind: t.kind, description: t.description ?? '', launchUrl: t.launchUrl ?? '', active: t.active })}
    >
      <TextField label="Name" value={t.name ?? ''} onChange={(e) => setT({ ...t, name: e.target.value })} required autoFocus />
      <TextField select label="Kind" value={t.kind ?? 'other'} onChange={(e) => setT({ ...t, kind: e.target.value as Tool['kind'] })}>
        <MenuItem value="super_tutor">Super Tutor</MenuItem>
        <MenuItem value="debate">Debating App</MenuItem>
        <MenuItem value="other">Other</MenuItem>
      </TextField>
      <TextField label="Description" value={t.description ?? ''} onChange={(e) => setT({ ...t, description: e.target.value })} />
      <FormControlLabel control={<Checkbox checked={!!builtin} onChange={(e) => setT({ ...t, launchUrl: e.target.checked ? 'builtin:demo' : '' })} />} label="Use the built-in demo until the real app is connected" />
      {!builtin && (
        <TextField
          label="Launch URL"
          value={t.launchUrl ?? ''}
          onChange={(e) => setT({ ...t, launchUrl: e.target.value })}
          placeholder="https://supertutor.nanoskool.in/launch"
          helperText="Nanoskool adds ?token=…&unit=…&objectives=… when a student opens it"
        />
      )}
      <FormControlLabel control={<Switch checked={t.active !== false} onChange={(e) => setT({ ...t, active: e.target.checked })} />} label="Active" />
      <FormError error={save.error} />
      {tool._id && (
        <Typography variant="caption" color="text.secondary">
          Updated {fromNow((tool as { updatedAt?: string }).updatedAt)}
        </Typography>
      )}
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Psychometric: translations */

const LANG_CODES = ['hi', 'ml', 'ta', 'kn', 'te', 'mr', 'bn', 'gu', 'pa', 'or'] as const;

/** ITC adaptation: a translator writes the version, a second person translates it back to English, then it is approved. */
function TranslationsEditor({ it, onChange }: { it: Partial<AssessmentItem>; onChange: (t: ItemTranslation[]) => void }) {
  const list = it.translations ?? [];
  const [lang, setLang] = useState<string>(list[0]?.lang ?? 'hi');
  const cur: ItemTranslation = list.find((x) => x.lang === lang) ?? { lang, status: 'draft' };
  const set = (patch: Partial<ItemTranslation>) => onChange([...list.filter((x) => x.lang !== lang), { ...cur, ...patch }]);
  const labels = it.type === 'scale' ? (it.scaleLabels ?? []) : (it.options ?? []).map((o) => o.text);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#FBFAF7' }}>
      <Typography sx={{ fontWeight: 650, mb: 0.25 }}>Translations</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Following the ITC test-adaptation guidelines: a qualified translator writes the version, a second person translates it back to English without seeing the original, and you approve it only when the meaning matches. Children see only approved
        translations, and only when the whole form is translated.
      </Typography>
      <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
        {LANG_CODES.map((l) => {
          const t = list.find((x) => x.lang === l);
          return <Chip key={l} size="small" label={`${LANG_NAMES[l]}${t?.status === 'approved' ? ' ✓' : t?.prompt ? ' ·' : ''}`} onClick={() => setLang(l)} color={l === lang ? 'primary' : 'default'} variant={l === lang ? 'filled' : 'outlined'} />;
        })}
      </Stack>
      <Stack spacing={1.25}>
        <TextField size="small" label={`Question in ${LANG_NAMES[lang]}`} value={cur.prompt ?? ''} onChange={(e) => set({ prompt: e.target.value, status: 'draft' })} multiline />
        {labels.map((l, k) => (
          <TextField
            key={k}
            size="small"
            label={`${it.type === 'scale' ? 'Point' : 'Option'} ${k + 1} (${l})`}
            value={(it.type === 'scale' ? cur.scaleLabels : cur.options)?.[k] ?? ''}
            onChange={(e) => {
              const arr = [...((it.type === 'scale' ? cur.scaleLabels : cur.options) ?? labels.map(() => ''))];
              arr[k] = e.target.value;
              set(it.type === 'scale' ? { scaleLabels: arr, status: 'draft' } : { options: arr, status: 'draft' });
            }}
          />
        ))}
        <TextField size="small" label="Back-translation into English (by a second person)" value={cur.backTranslation ?? ''} onChange={(e) => set({ backTranslation: e.target.value })} multiline />
        <FormControlLabel
          control={<Switch checked={cur.status === 'approved'} disabled={!cur.prompt?.trim() || !cur.backTranslation?.trim()} onChange={(e) => set({ status: e.target.checked ? 'approved' : 'draft' })} />}
          label="Approved — the back-translation keeps the meaning"
        />
      </Stack>
    </Paper>
  );
}

/* ------------------------------------------------------------------ Psychometric: quality and norms */

interface QualityItem {
  _id: string;
  prompt: string;
  reverse?: boolean;
  n: number;
  mean: number | null;
  itemRest: number | null;
  difGender: number | null;
  difLang: number | null;
  problems: string[];
}
interface QualityDim {
  _id: string;
  name: string;
  domain: PsyDomain;
  items: number;
  n: number;
  alpha: number | null;
  status: 'pilot' | 'good' | 'fair' | 'weak';
  tooFewItems: boolean;
  itemStats: QualityItem[];
}
interface Quality {
  families: { informant: string; grades: number[]; label: string; attempts: number; flagRate: Record<string, number>; dimensions: QualityDim[] }[];
  raters: { skillId: string; name: string; pairs: number; exact: number; within1: number }[];
  norms: { skillId: string; grade: number; n: number; mean: number; sd: number; alpha: number | null; builtAt: string }[];
}
const STATUS_TONE = { pilot: ['Needs pilot data', 'info'], good: ['Reliable', 'good'], fair: ['Fair', 'warn'], weak: ['Weak — revise items', 'bad'] } as const;
const FLAG_NAMES: Record<string, string> = { too_fast: 'Too fast', same_answer: 'Same answer', inconsistent: 'Contradictions', desirability: 'Too good to be true' };

function QualityTab() {
  const q = useGet<Quality>('/psychometric/quality');
  const rebuild = useSend<void, { tables: number; children: number }>('post', '/psychometric/norms/rebuild', {
    invalidate: ['/psychometric/quality'],
    onSuccess: (r) => setMsg(`Norms rebuilt: ${r.tables} tables from ${r.children} children (answers flagged for quality are left out).`),
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <QueryState q={q}>
      {(d) => (
        <Stack spacing={2.5}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Standards checklist</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 14, '& li': { mb: 0.5 } }}>
              <li>Reliability: aim for α ≥ 0.70 per dimension, from at least 30 children per form.</li>
              <li>Norms: percentiles per grade replace the provisional bands once 30+ children in a grade have taken it. Rebuild each term.</li>
              <li>Fairness: items where girls and boys (or English and translated versions) score differently at the same overall level are flagged for review.</li>
              <li>Several sources: child, parent, teachers (two raters where possible) and PE tests. Young children’s self-report counts less.</li>
              <li>Pilot first: run a term in 2–3 schools, review items flagged here, then publish norms. See the technical manual for the full procedure.</li>
            </Box>
          </Paper>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Button variant="contained" onClick={() => rebuild.mutate()} disabled={rebuild.isPending}>
              Rebuild norms
            </Button>
            <Typography variant="body2" color="text.secondary">
              {d.norms.length ? `${d.norms.filter((n) => n.n >= 30).length} of ${d.norms.length} norm tables have 30+ children.` : 'No norms yet.'}
            </Typography>
          </Stack>
          {msg && (
            <Alert severity="success" onClose={() => setMsg(null)}>
              {msg}
            </Alert>
          )}
          {d.families.map((f) => (
            <Paper key={f.label} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                <Typography sx={{ fontWeight: 750 }}>{f.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {f.attempts} completed
                  {Object.keys(f.flagRate).length
                    ? ` · answer-quality flags: ${Object.entries(f.flagRate)
                        .map(([k, v]) => `${FLAG_NAMES[k] ?? k} ${Math.round((v / Math.max(1, f.attempts)) * 100)}%`)
                        .join(', ')}`
                    : ''}
                </Typography>
              </Stack>
              <DataTable
                rows={f.dimensions}
                onRowClick={(r) => setOpen(open === `${f.label}:${r._id}` ? null : `${f.label}:${r._id}`)}
                columns={[
                  {
                    key: 'name',
                    label: 'Dimension',
                    render: (r) => (
                      <span>
                        {PSY_DOMAIN_INFO[r.domain]?.icon} {r.name}
                      </span>
                    ),
                  },
                  { key: 'items', label: 'Items', nowrap: true, render: (r) => (r.tooFewItems ? <Tag label={`${r.items} — too few`} tone="bad" /> : r.items) },
                  { key: 'n', label: 'Children', nowrap: true, render: (r) => r.n },
                  { key: 'alpha', label: 'Reliability (α)', nowrap: true, render: (r) => (r.alpha == null ? '—' : r.alpha.toFixed(2)) },
                  { key: 'status', label: 'Status', nowrap: true, render: (r) => <Tag label={STATUS_TONE[r.status][0]} tone={STATUS_TONE[r.status][1]} /> },
                  {
                    key: 'p',
                    label: 'Items to review',
                    render: (r) => {
                      const n = r.itemStats.filter((i) => i.problems.length).length;
                      return n ? <Tag label={`${n} flagged`} tone="warn" /> : '—';
                    },
                  },
                ]}
              />
              {f.dimensions
                .filter((r) => open === `${f.label}:${r._id}`)
                .map((r) => (
                  <Box key={r._id} sx={{ mt: 1.5, p: 1.5, bgcolor: '#FBFAF7', borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 650, mb: 1 }}>{r.name}: item statistics</Typography>
                    {r.itemStats.map((i) => (
                      <Box key={i._id} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          {i.prompt} {i.reverse ? '(reverse)' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          n {i.n} · mean {i.mean ?? '—'} · item–rest r {i.itemRest ?? '—'} · gender gap {i.difGender ?? '—'} · language gap {i.difLang ?? '—'}
                        </Typography>
                        {i.problems.map((p) => (
                          <Typography key={p} variant="caption" sx={{ display: 'block', color: '#B45309' }}>
                            ⚠ {p}
                          </Typography>
                        ))}
                      </Box>
                    ))}
                  </Box>
                ))}
            </Paper>
          ))}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Teacher agreement</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              When two teachers rate the same child in the same term. Aim for 80%+ within one level; lower means the level descriptions or rater training need work.
            </Typography>
            {d.raters.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No double ratings yet.
              </Typography>
            ) : (
              <DataTable
                rows={d.raters.map((r) => ({ ...r, _id: r.skillId }))}
                columns={[
                  { key: 'name', label: 'Dimension', render: (r) => r.name },
                  { key: 'pairs', label: 'Pairs', render: (r) => r.pairs },
                  { key: 'exact', label: 'Same level', render: (r) => `${r.exact}%` },
                  { key: 'within1', label: 'Within one level', render: (r) => <Tag label={`${r.within1}%`} tone={r.within1 >= 80 ? 'good' : 'warn'} /> },
                ]}
              />
            )}
          </Paper>
        </Stack>
      )}
    </QueryState>
  );
}
