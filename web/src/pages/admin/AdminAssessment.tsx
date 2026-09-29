/** Assessment studio: the skill library, the item bank, skills missions per grade band and outcome tools. */
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import { useState } from 'react';
import { BAND_GRADES, type AssessmentForm, type AssessmentItem, type GradeBand, type ItemType, type Skill, type Tool } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { ConfirmDialog, DataTable, Empty, FormDialog, PageHeader, QueryState, StatusChip, UploadButton, fromNow } from '@/components/ui';
import { FilterSelect, FormError, RowMenu, TabBar, useTab } from '@/components/AdminCommon';
import { Tag } from '@/components/clarity';
import { ReviewQueue } from '@/pages/shared/ReviewPages';

const TABS = ['skills', 'items', 'missions', 'tools', 'reviews'] as const;
const BANDS: GradeBand[] = ['little', 'junior', 'senior'];
const TYPE_LABEL: Record<ItemType, string> = { single: 'One answer', multiple: 'Several answers', scale: 'Self-rating scale', open: 'Written answer', upload: 'Photo or file task' };

export default function AssessmentStudioPage() {
  const [tab, setTab] = useTab(TABS, 'skills');
  return (
    <>
      <PageHeader title="Assessment studio" subtitle="Choose the 21st-century skills, write the questions and tasks, and publish a skills mission for each age group" />
      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'skills', label: 'Skills' },
          { value: 'items', label: 'Item bank' },
          { value: 'missions', label: 'Skills missions' },
          { value: 'tools', label: 'Outcome tools' },
          { value: 'reviews', label: 'Review queue' },
        ]}
      />
      {tab === 'skills' && <SkillsTab />}
      {tab === 'items' && <ItemsTab />}
      {tab === 'missions' && <MissionsTab />}
      {tab === 'tools' && <ToolsTab />}
      {tab === 'reviews' && <ReviewQueue />}
    </>
  );
}

/* ------------------------------------------------------------------ Skills */

function SkillsTab() {
  const q = useGet<Skill[]>('/skills', { all: true });
  const [edit, setEdit] = useState<Partial<Skill> | null>(null);
  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography color="text.secondary">Each child gets a level per skill: Emerging, Developing, Proficient or Advanced.</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEdit({ name: '', active: true, minGrade: 1, maxGrade: 12 })}>
          New skill
        </Button>
      </Stack>
      <QueryState q={q}>
        {(rows) => (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {rows.length === 0 && <Empty title="No skills yet" hint="Run npm run demo:journey for the starting set of eight, or add your own." />}
            {rows.map((s) => (
              <Paper key={s._id} variant="outlined" sx={{ p: 2.5, opacity: s.active === false ? 0.55 : 1, position: 'relative' }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: s.color || '#C9B8F4' }} />
                  <Typography sx={{ fontWeight: 600, flex: 1 }}>{s.name}</Typography>
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
  const save = useSend<Partial<Skill>>(skill._id ? 'patch' : 'post', skill._id ? `/skills/${skill._id}` : '/skills', { success: 'Skill saved', invalidate: ['/skills'], onSuccess: onClose });
  const lv = s.levels ?? {};
  return (
    <FormDialog
      open
      title={skill._id ? 'Edit skill' : 'New skill'}
      onClose={onClose}
      loading={save.isPending}
      onSubmit={() => save.mutate({ name: s.name, description: s.description ?? '', levels: s.levels, color: s.color, minGrade: s.minGrade, maxGrade: s.maxGrade, active: s.active })}
    >
      <TextField label="Skill name" value={s.name ?? ''} onChange={(e) => setS({ ...s, name: e.target.value })} required autoFocus />
      <TextField label="What it means" value={s.description ?? ''} onChange={(e) => setS({ ...s, description: e.target.value })} multiline minRows={2} />
      <Stack direction="row" spacing={1.5}>
        <TextField label="From grade" type="number" value={s.minGrade ?? 1} onChange={(e) => setS({ ...s, minGrade: Number(e.target.value) })} slotProps={{ htmlInput: { min: 1, max: 12 } }} />
        <TextField label="To grade" type="number" value={s.maxGrade ?? 12} onChange={(e) => setS({ ...s, maxGrade: Number(e.target.value) })} slotProps={{ htmlInput: { min: 1, max: 12 } }} />
        <TextField label="Colour" type="color" value={s.color || '#C9B8F4'} onChange={(e) => setS({ ...s, color: e.target.value })} sx={{ width: 120 }} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        What each level looks like (shown to teachers and parents)
      </Typography>
      {(['emerging', 'developing', 'proficient', 'advanced'] as const).map((k) => (
        <TextField key={k} label={k[0].toUpperCase() + k.slice(1)} value={lv[k] ?? ''} onChange={(e) => setS({ ...s, levels: { ...lv, [k]: e.target.value } })} />
      ))}
      <FormControlLabel control={<Switch checked={s.active !== false} onChange={(e) => setS({ ...s, active: e.target.checked })} />} label="In use (turn off to retire the skill; past results are kept)" />
      <FormError error={save.error} />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Item bank */

function ItemsTab() {
  const [band, setBand] = useState('');
  const [skillId, setSkillId] = useState('');
  const skills = useGet<Skill[]>('/skills');
  const q = useGet<AssessmentItem[]>('/assessment-items', { ...(band ? { band } : {}), ...(skillId ? { skillId } : {}) });
  const [edit, setEdit] = useState<Partial<AssessmentItem> | null>(null);
  const [del, setDel] = useState<AssessmentItem | null>(null);
  const remove = useSend<string>('delete', (id) => `/assessment-items/${id}`, { success: 'Item deleted', invalidate: ['/assessment-items', '/assessment-forms'], onSuccess: () => setDel(null) });
  const name = (id: string) => skills.data?.find((s) => s._id === id)?.name ?? 'Skill';
  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { md: 'center' }, gap: 1.5, '& > *': { m: '0 !important' } }}>
        <FilterSelect label="Age group" value={band} onChange={setBand} allLabel="All" options={BANDS.map((b) => ({ value: b, label: BAND_GRADES[b] }))} />
        <FilterSelect label="Skill" value={skillId} onChange={setSkillId} allLabel="All skills" width={220} options={(skills.data ?? []).map((s) => ({ value: s._id, label: s.name }))} />
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />} onClick={() => setEdit({ type: 'single', prompt: '', options: [{ text: '', score: 1 }, { text: '', score: 0 }], skills: [], bands: band ? [band as GradeBand] : ['junior'], status: 'draft' })}>
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
                { key: 'prompt', label: 'Question or task', render: (r) => <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 520 }}>{r.prompt}</Typography> },
                { key: 'type', label: 'Type', nowrap: true, render: (r) => TYPE_LABEL[r.type] },
                { key: 'skills', label: 'Skills', render: (r) => <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{(r.skills ?? []).map((s) => <Tag key={s.skillId} label={name(s.skillId)} />)}</Stack> },
                { key: 'bands', label: 'Ages', nowrap: true, render: (r) => (r.bands ?? []).map((b) => BAND_GRADES[b].replace('Grades ', '')).join(', ') },
                { key: 'status', label: 'Status', nowrap: true, render: (r) => <StatusChip status={r.status ?? 'draft'} /> },
                { key: 'x', label: '', align: 'right', render: (r) => <span onClick={(e) => e.stopPropagation()}><RowMenu label="Item actions" actions={[{ label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => setEdit(r) }, { label: 'Delete', icon: <DeleteOutlined fontSize="small" />, danger: true, onClick: () => setDel(r) }]} /></span> },
              ]}
            />
          </Paper>
        )}
      </QueryState>
      {edit && <ItemDialog item={edit} skills={skills.data ?? []} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} danger title="Delete this item?" message="It is also removed from draft missions." confirmLabel="Delete" loading={remove.isPending} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del._id)} />
    </>
  );
}

function ItemDialog({ item, skills, onClose }: { item: Partial<AssessmentItem>; skills: Skill[]; onClose: () => void }) {
  const [it, setIt] = useState<Partial<AssessmentItem>>({ scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'], rubric: ['', '', '', ''], ...item });
  const [err, setErr] = useState<string | null>(null);
  const save = useSend<Record<string, unknown>>(item._id ? 'patch' : 'post', item._id ? `/assessment-items/${item._id}` : '/assessment-items', { success: 'Item saved', invalidate: ['/assessment-items'], onSuccess: onClose });
  const closed = it.type === 'single' || it.type === 'multiple';
  const open = it.type === 'open' || it.type === 'upload';
  const submit = () => {
    const v = !it.prompt?.trim() ? 'Write the question or task' : !(it.skills ?? []).length ? 'Tag at least one skill' : !(it.bands ?? []).length ? 'Choose at least one age group' : closed && (it.options ?? []).filter((o) => o.text.trim()).length < 2 ? 'Add at least two options' : null;
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
      bands: it.bands,
      status: it.status,
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
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <UploadButton folder="assessment" accept="image/*,audio/*,video/mp4" label={it.mediaUrl ? 'Replace picture or audio' : 'Add a picture or audio (optional)'} onUploaded={(url) => setIt({ ...it, mediaUrl: url })} />
        {it.mediaUrl && <Button size="small" onClick={() => setIt({ ...it, mediaUrl: '' })}>Remove</Button>}
      </Stack>
      {closed && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Options and credit (1 = full credit, 0.5 = partly right, 0 = no credit)
          </Typography>
          <Stack spacing={1}>
            {(it.options ?? []).map((o, i) => (
              <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField label={`Option ${i + 1}`} value={o.text} onChange={(e) => setIt({ ...it, options: it.options!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <TextField label="Credit" type="number" value={o.score ?? 0} onChange={(e) => setIt({ ...it, options: it.options!.map((x, j) => (j === i ? { ...x, score: Number(e.target.value) } : x)) })} sx={{ width: 110 }} slotProps={{ htmlInput: { min: 0, max: 1, step: 0.1 } }} />
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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {(it.scaleLabels ?? []).map((l, i) => (
            <TextField key={i} label={`Point ${i + 1}`} value={l} onChange={(e) => setIt({ ...it, scaleLabels: it.scaleLabels!.map((x, j) => (j === i ? e.target.value : x)) })} />
          ))}
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
          Skills it shows, and how strongly (weight)
        </Typography>
        <Stack spacing={1}>
          {skills.map((s) => {
            const cur = (it.skills ?? []).find((x) => x.skillId === s._id);
            return (
              <Stack key={s._id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <FormControlLabel
                  sx={{ flex: 1 }}
                  control={<Checkbox checked={!!cur} onChange={(e) => setIt({ ...it, skills: e.target.checked ? [...(it.skills ?? []), { skillId: s._id, weight: 1 }] : (it.skills ?? []).filter((x) => x.skillId !== s._id) })} />}
                  label={s.name}
                />
                {cur && <TextField label="Weight" type="number" value={cur.weight} onChange={(e) => setIt({ ...it, skills: (it.skills ?? []).map((x) => (x.skillId === s._id ? { ...x, weight: Number(e.target.value) || 1 } : x)) })} sx={{ width: 110 }} slotProps={{ htmlInput: { min: 0.1, max: 10, step: 0.5 } }} />}
              </Stack>
            );
          })}
        </Stack>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Age groups
        </Typography>
        {BANDS.map((b) => (
          <FormControlLabel key={b} control={<Checkbox checked={(it.bands ?? []).includes(b)} onChange={(e) => setIt({ ...it, bands: e.target.checked ? [...(it.bands ?? []), b] : (it.bands ?? []).filter((x) => x !== b) })} />} label={BAND_GRADES[b]} />
        ))}
      </Box>
      <FormError message={err} error={save.error} />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Missions */

function MissionsTab() {
  const q = useGet<AssessmentForm[]>('/assessment-forms');
  const [edit, setEdit] = useState<Partial<AssessmentForm> | null>(null);
  const publish = useSend<string>('post', (id) => `/assessment-forms/${id}/publish`, { success: 'Mission published', invalidate: ['/assessment-forms', '/assessment-items'] });
  return (
    <QueryState q={q}>
      {(rows) => (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {BANDS.map((b) => {
            const forms = rows.filter((f) => f.band === b);
            return (
              <Box key={b} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 600 }}>{BAND_GRADES[b]}</Typography>
                  <Button size="small" startIcon={<Add />} onClick={() => setEdit({ title: '', band: b, itemIds: [] })}>
                    New
                  </Button>
                </Stack>
                {forms.length === 0 && <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary', borderStyle: 'dashed' }}>No mission yet</Paper>}
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
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" startIcon={<EditOutlined />} onClick={() => setEdit(f)}>
                        Edit
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
            );
          })}
          {edit && <MissionDialog form={edit} onClose={() => setEdit(null)} />}
        </Box>
      )}
    </QueryState>
  );
}

function MissionDialog({ form, onClose }: { form: Partial<AssessmentForm>; onClose: () => void }) {
  const [f, setF] = useState<Partial<AssessmentForm>>(form);
  const items = useGet<AssessmentItem[]>('/assessment-items', { band: f.band });
  const save = useSend<Record<string, unknown>>(form._id ? 'patch' : 'post', form._id ? `/assessment-forms/${form._id}` : '/assessment-forms', { success: 'Mission saved', invalidate: ['/assessment-forms'], onSuccess: onClose });
  const ids = f.itemIds ?? [];
  return (
    <FormDialog
      open
      maxWidth="md"
      title={form._id ? 'Edit skills mission' : `New mission for ${BAND_GRADES[f.band as GradeBand]}`}
      onClose={onClose}
      loading={save.isPending}
      onSubmit={() => save.mutate({ title: f.title, band: f.band, intro: f.intro ?? '', itemIds: ids, timeLimitMin: f.timeLimitMin || null })}
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
            {rows.length === 0 && <Empty title="No items for this age group" hint="Add them in the Item bank tab." />}
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
          Secret key for <b>{secret.name}</b>: <code style={{ wordBreak: 'break-all' }}>{secret.secret}</code>. Copy it now and give it to the tool's developers; it is not shown again. They send results to <code>POST /api/tools/results</code> with the headers <code>X-Nanoskool-Tool</code> (the tool id) and <code>X-Nanoskool-Signature</code> (HMAC-SHA256 of the body, hex).
        </Alert>
      )}
      <QueryState q={q}>
        {(rows) => (
          <Paper variant="outlined" sx={{ px: 2.5, py: 1 }}>
            <DataTable
              rows={rows}
              empty={<Empty title="No tools yet" />}
              columns={[
                { key: 'name', label: 'Tool', render: (t) => <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{t.name}</Typography><Typography variant="caption" color="text.secondary">{t.description}</Typography></Box> },
                { key: 'id', label: 'Tool id', nowrap: true, render: (t) => <code style={{ fontSize: 12.5 }}>{t._id}</code> },
                { key: 'url', label: 'Launch', render: (t) => (t.launchUrl?.startsWith('builtin:') ? <Tag label="Built-in demo" tone="warn" /> : t.launchUrl ? <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>{t.launchUrl}</Typography> : <Tag label="Not connected" tone="bad" />) },
                { key: 'active', label: 'Status', nowrap: true, render: (t) => <StatusChip status={t.active ? 'active' : 'inactive'} /> },
                { key: 'x', label: '', align: 'right', render: (t) => <RowMenu label="Tool actions" actions={[{ label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => setEdit(t) }, { label: 'New secret key', icon: <KeyOutlined fontSize="small" />, onClick: () => regen.mutate(t) }]} /> },
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
    <FormDialog open title={tool._id ? 'Edit tool' : 'Register a tool'} onClose={onClose} loading={save.isPending} onSubmit={() => save.mutate({ name: t.name, kind: t.kind, description: t.description ?? '', launchUrl: t.launchUrl ?? '', active: t.active })}>
      <TextField label="Name" value={t.name ?? ''} onChange={(e) => setT({ ...t, name: e.target.value })} required autoFocus />
      <TextField select label="Kind" value={t.kind ?? 'other'} onChange={(e) => setT({ ...t, kind: e.target.value as Tool['kind'] })}>
        <MenuItem value="super_tutor">Super Tutor</MenuItem>
        <MenuItem value="debate">Debating App</MenuItem>
        <MenuItem value="other">Other</MenuItem>
      </TextField>
      <TextField label="Description" value={t.description ?? ''} onChange={(e) => setT({ ...t, description: e.target.value })} />
      <FormControlLabel control={<Checkbox checked={!!builtin} onChange={(e) => setT({ ...t, launchUrl: e.target.checked ? 'builtin:demo' : '' })} />} label="Use the built-in demo until the real app is connected" />
      {!builtin && <TextField label="Launch URL" value={t.launchUrl ?? ''} onChange={(e) => setT({ ...t, launchUrl: e.target.value })} placeholder="https://supertutor.nanoskool.in/launch" helperText="Nanoskool adds ?token=…&unit=…&objectives=… when a student opens it" />}
      <FormControlLabel control={<Switch checked={t.active !== false} onChange={(e) => setT({ ...t, active: e.target.checked })} />} label="Active" />
      <FormError error={save.error} />
      {tool._id && <Typography variant="caption" color="text.secondary">Updated {fromNow((tool as { updatedAt?: string }).updatedAt)}</Typography>}
    </FormDialog>
  );
}
