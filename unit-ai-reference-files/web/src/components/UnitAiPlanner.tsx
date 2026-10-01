/**
 * "Create the whole unit with AI": the teacher describes the unit in their own words, AI proposes a plan
 * (title, summary, time, objectives and which kinds of sections to use, with reasons), the teacher ticks,
 * reorders or adds sections, and then every section is written by AI in the Content step.
 */
import { Alert, Box, Button, ButtonBase, Checkbox, Chip, CircularProgress, Collapse, FormControlLabel, IconButton, Radio, RadioGroup, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesomeRounded';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Close from '@mui/icons-material/Close';
import AddRounded from '@mui/icons-material/AddRounded';
import { useState } from 'react';
import { api, errorMessage, uploadFile } from '@/api/client';
import AttachFile from '@mui/icons-material/AttachFileRounded';
import PictureAsPdf from '@mui/icons-material/PictureAsPdfOutlined';
import Description from '@mui/icons-material/DescriptionOutlined';
import Slideshow from '@mui/icons-material/SlideshowOutlined';
import TableChart from '@mui/icons-material/TableChartOutlined';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import { useRef } from 'react';
import type { BlockKind } from '@/api/types';
import { BLOCK_META, BLOCK_ORDER } from '@/lib/unitBlocks';
import { BLOCK_ICON } from '@/components/UnitBlocksView';

export interface PlanSection {
  kind: BlockKind;
  title: string;
  brief: string;
  why: string;
  include: boolean;
  fileUrl?: string;
  gallery?: { url: string; caption?: string; alt?: string }[];
}
export interface RefFile {
  url: string;
  name: string;
}
export interface UnitPlan {
  title: string;
  summary: string;
  durationMin: number;
  grade?: number;
  objectives: { title: string; criteria: string; include?: boolean }[];
  sections: PlanSection[];
  provider: 'anthropic' | 'offline';
  files?: { name: string; kind: string; words: number; note?: string }[];
}
export interface PlanChoice {
  files: RefFile[];
  prompt: string;
  title: string;
  summary: string;
  durationMin: number;
  sections: PlanSection[];
  objectives: { title: string; criteria: string }[];
  mode: 'replace' | 'append';
}

const ACCEPT = '.pdf,.docx,.pptx,.xlsx,.csv,.txt,image/png,image/jpeg,image/webp,image/gif';
const MAX_FILES = 10;
function fileIcon(name: string) {
  const e = name.split('.').pop()?.toLowerCase();
  if (e === 'pdf') return <PictureAsPdf sx={{ color: '#D92D20' }} />;
  if (e === 'pptx') return <Slideshow sx={{ color: '#E8590C' }} />;
  if (e === 'xlsx' || e === 'csv') return <TableChart sx={{ color: '#2F9E44' }} />;
  if (/png|jpe?g|webp|gif/.test(e ?? '')) return <ImageIcon sx={{ color: '#0CA678' }} />;
  return <Description sx={{ color: '#1C7ED6' }} />;
}

const EXAMPLE = 'e.g. Conductors and insulators for Grade 6, 40 minutes. Students test everyday objects in a bulb circuit and learn why wires are covered in plastic. Include a video, a hands-on experiment and a worksheet.';

export function UnitAiPlanner({ grades, hasContent, onApply }: { grades?: number[]; hasContent: boolean; onApply: (c: PlanChoice) => void }) {
  const [open, setOpen] = useState(!hasContent);
  const [prompt, setPrompt] = useState('');
  const [grade, setGrade] = useState<number | undefined>(grades?.length ? Math.min(...grades) : undefined);
  const [plan, setPlan] = useState<UnitPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [files, setFiles] = useState<RefFile[]>([]);
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | File[]) => {
    const all = Array.from(list);
    const old = all.filter((f) => /\.(doc|ppt|xls)$/i.test(f.name));
    if (old.length) setErr(`${old.map((f) => f.name).join(', ')}: please save as the newer .docx / .pptx / .xlsx format (File → Save As), then attach again.`);
    const ok = all.filter((f) => !/\.(doc|ppt|xls)$/i.test(f.name)).slice(0, MAX_FILES - files.length);
    for (const f of ok) {
      setUploading((n) => n + 1);
      try {
        const r = await uploadFile(f, 'content');
        setFiles((x) => [...x, { url: r.url, name: f.name }]);
      } catch (e) {
        setErr(`${f.name}: ${errorMessage(e, 'upload failed')}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const makePlan = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<UnitPlan>('/ai/units/plan', { prompt: prompt.trim(), grade, files });
      setPlan({ ...r.data, objectives: r.data.objectives.map((o) => ({ ...o, include: true })) });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const setSec = (i: number, p: Partial<PlanSection>) => setPlan((x) => x && { ...x, sections: x.sections.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const move = (i: number, d: number) =>
    setPlan((x) => {
      if (!x) return x;
      const next = [...x.sections];
      const [s] = next.splice(i, 1);
      next.splice(i + d, 0, s);
      return { ...x, sections: next };
    });
  const addKind = (k: BlockKind) => setPlan((x) => x && { ...x, sections: [...x.sections, { kind: k, title: BLOCK_META[k].label, brief: `${BLOCK_META[k].hint} about ${x.title}.`, why: 'Added by you', include: true }] });
  const chosen = plan?.sections.filter((s) => s.include) ?? [];

  const apply = () => {
    if (!plan) return;
    onApply({
      files,
      prompt: prompt.trim(),
      title: plan.title.trim(),
      summary: plan.summary.trim(),
      durationMin: plan.durationMin,
      sections: chosen,
      objectives: plan.objectives.filter((o) => o.include !== false && o.title.trim()).map(({ title, criteria }) => ({ title, criteria })),
      mode: hasContent ? mode : 'replace',
    });
    setPlan(null);
    setPrompt('');
    setFiles([]);
    setOpen(false);
  };

  return (
    <Box sx={{ mb: 2.5, borderRadius: 3, p: '2px', background: 'linear-gradient(135deg, #7C5CFA, #C04CD8 45%, #F08C00)' }}>
      <Box sx={{ bgcolor: '#fff', borderRadius: '22px', p: { xs: 2, md: 3 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #7C5CFA, #C04CD8)', color: '#fff', flexShrink: 0 }}>
            <AutoAwesome />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Create the whole unit with AI</Typography>
            <Typography variant="body2" color="text.secondary">
              Describe the unit. AI suggests the parts to use, you choose, and AI writes every part.
            </Typography>
          </Box>
          {!open && (
            <Button variant="contained" onClick={() => setOpen(true)} startIcon={<AutoAwesome />} sx={{ background: 'linear-gradient(135deg, #7C5CFA, #C04CD8)' }}>
              Start
            </Button>
          )}
          {open && hasContent && (
            <IconButton aria-label="Close" onClick={() => setOpen(false)}>
              <Close />
            </IconButton>
          )}
        </Stack>

        <Collapse in={open} unmountOnExit>
          {!plan ? (
            <Stack spacing={2} sx={{ mt: 2.5 }}>
              <TextField
                label="What should this unit teach?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                multiline
                minRows={4}
                placeholder={EXAMPLE}
                slotProps={{ htmlInput: { maxLength: 3000 } }}
                helperText="Topic, grade, time, what students should do, and anything to include (video, slides, experiment, worksheet, animation, pictures, simulation…)"
              />
              {/* Reference files */}
              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
                }}
                sx={{ border: '2px dashed', borderColor: drag ? '#7C5CFA' : 'divider', bgcolor: drag ? '#F4F0FF' : '#FBFAF7', borderRadius: 2.5, p: 1.75, transition: 'all .15s' }}
              >
                <input
                  ref={picker}
                  type="file"
                  hidden
                  multiple
                  accept={ACCEPT}
                  onChange={(e) => {
                    if (e.target.files) void addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, alignItems: { sm: 'center' } }}>
                  <Button variant="outlined" startIcon={uploading ? <CircularProgress size={16} /> : <AttachFile />} onClick={() => picker.current?.click()} disabled={files.length >= MAX_FILES} sx={{ whiteSpace: 'nowrap', bgcolor: '#fff', flexShrink: 0 }}>
                    {uploading ? 'Uploading…' : 'Attach reference files'}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Optional. Drop your notes, textbook pages or old lessons here — PDF, Word, PowerPoint, Excel, text or pictures (up to {MAX_FILES}). AI reads them and builds the unit from them.
                  </Typography>
                </Stack>
                {files.length > 0 && (
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                    {files.map((f) => (
                      <Chip key={f.url} icon={fileIcon(f.name)} label={f.name} onDelete={() => setFiles((x) => x.filter((y) => y.url !== f.url))} sx={{ bgcolor: '#fff', border: '1px solid', borderColor: 'divider', maxWidth: 280 }} />
                    ))}
                  </Stack>
                )}
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, alignItems: { sm: 'center' } }}>
                {!!grades?.length && (
                  <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Grade
                    </Typography>
                    {grades.map((g) => (
                      <Chip key={g} size="small" label={g} color={grade === g ? 'primary' : 'default'} variant={grade === g ? 'filled' : 'outlined'} onClick={() => setGrade(g)} />
                    ))}
                  </Stack>
                )}
                <Box sx={{ flex: grades?.length ? 0 : 1 }} />
                <Button
                  variant="contained"
                  size="large"
                  onClick={makePlan}
                  disabled={busy || uploading > 0 || (prompt.trim().length < 5 && !files.length)}
                  startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <AutoAwesome />}
                  sx={{ background: 'linear-gradient(135deg, #7C5CFA, #C04CD8)', whiteSpace: 'nowrap' }}
                >
                  {busy ? 'Planning…' : 'Plan my unit'}
                </Button>
              </Stack>
              {err && <Alert severity="error">{err}</Alert>}
            </Stack>
          ) : (
            <Stack spacing={2.25} sx={{ mt: 2.5 }}>
              {plan.provider === 'offline' && (
                <Alert severity="warning">
                  AI is offline, so this is a ready-made plan{files.length ? ' — sections will be written from the text of your files' : ' from your description'}. Add an Anthropic API key in server/.env for a plan written by AI.
                </Alert>
              )}
              {!!plan.files?.length && (
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F7F5F0' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    Read from your files
                  </Typography>
                  <Stack spacing={0.5}>
                    {plan.files.map((f) => (
                      <Stack key={f.name} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                        {fileIcon(f.name)}
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                          {f.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: f.note ? 'warning.main' : 'text.secondary', textAlign: 'right' }}>
                          {f.note ?? (f.kind === 'image' ? 'picture — added to the gallery' : `${f.words.toLocaleString()} words read`)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Title" value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 200 } }} />
                <TextField label="Minutes" type="number" value={plan.durationMin} onChange={(e) => setPlan({ ...plan, durationMin: Number(e.target.value) || 0 })} sx={{ width: { sm: 110 } }} slotProps={{ htmlInput: { min: 5, max: 600 } }} />
              </Stack>
              <TextField label="Summary for students" value={plan.summary} onChange={(e) => setPlan({ ...plan, summary: e.target.value })} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 1000 } }} />

              <Box>
                <Typography sx={{ fontWeight: 750 }}>Which parts should the unit have?</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                  AI ticked the ones it recommends. Tick or untick, rename, and use the arrows to change the order.
                </Typography>
                <Stack spacing={1}>
                  {plan.sections.map((s, i) => {
                    const m = BLOCK_META[s.kind];
                    const n = plan.sections.slice(0, i + 1).filter((x) => x.include).length;
                    return (
                      <Stack
                        key={i}
                        direction="row"
                        sx={{ alignItems: 'center', gap: 1, p: 1, pr: 0.5, borderRadius: 2.5, border: '2px solid', borderColor: s.include ? `${m.color}66` : 'divider', bgcolor: s.include ? `${m.color}0A` : '#FAFAF8', opacity: s.include ? 1 : 0.75 }}
                      >
                        <Checkbox checked={s.include} onChange={(e) => setSec(i, { include: e.target.checked })} slotProps={{ input: { 'aria-label': `Include ${s.title}` } }} sx={{ p: 0.5 }} />
                        <Box sx={{ width: 26, textAlign: 'center', fontWeight: 800, color: s.include ? m.color : 'text.disabled', fontSize: 14 }}>{s.include ? n : '–'}</Box>
                        <Tooltip title={m.label}>
                          <Box sx={{ width: 34, height: 34, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: `${m.color}1A`, color: m.color, flexShrink: 0, '& svg': { fontSize: 20 } }}>{BLOCK_ICON[s.kind]}</Box>
                        </Tooltip>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <TextField
                            variant="standard"
                            fullWidth
                            value={s.title}
                            onChange={(e) => setSec(i, { title: e.target.value })}
                            slotProps={{ htmlInput: { maxLength: 200, 'aria-label': 'Section title' }, input: { disableUnderline: true, sx: { fontWeight: 700, fontSize: 15 } } }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                            <b style={{ color: m.color }}>{m.label}</b> · {s.why}
                          </Typography>
                        </Box>
                        <IconButton size="small" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUpward fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Move down" disabled={i === plan.sections.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDownward fontSize="small" />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1.25, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                    Add another:
                  </Typography>
                  {BLOCK_ORDER.map((k) => (
                    <ButtonBase
                      key={k}
                      onClick={() => addKind(k)}
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        alignItems: 'center',
                        px: 1,
                        py: 0.4,
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: 'divider',
                        fontSize: 13,
                        fontWeight: 600,
                        color: BLOCK_META[k].color,
                        '& svg': { fontSize: 16 },
                        '&:hover': { borderColor: BLOCK_META[k].color },
                      }}
                    >
                      <AddRounded /> {BLOCK_META[k].label}
                    </ButtonBase>
                  ))}
                </Stack>
              </Box>

              {plan.objectives.length > 0 && (
                <Box>
                  <Typography sx={{ fontWeight: 750, mb: 0.5 }}>Learning objectives</Typography>
                  {plan.objectives.map((o, i) => (
                    <FormControlLabel
                      key={i}
                      sx={{ display: 'flex', alignItems: 'flex-start', m: 0, mb: 0.5 }}
                      control={<Checkbox size="small" checked={o.include !== false} onChange={(e) => setPlan({ ...plan, objectives: plan.objectives.map((x, k) => (k === i ? { ...x, include: e.target.checked } : x)) })} sx={{ pt: 0.25 }} />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            {o.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {o.criteria}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </Box>
              )}

              {hasContent && (
                <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as 'replace' | 'append')}>
                  <FormControlLabel value="replace" control={<Radio size="small" />} label="Replace the sections already in this unit" />
                  <FormControlLabel value="append" control={<Radio size="small" />} label="Add after them" />
                </RadioGroup>
              )}

              <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button onClick={() => setPlan(null)}>Change the description</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" size="large" onClick={apply} disabled={!chosen.length || !plan.title.trim()} startIcon={<AutoAwesome />} sx={{ background: 'linear-gradient(135deg, #7C5CFA, #C04CD8)' }}>
                  Create the unit ({chosen.length} part{chosen.length === 1 ? '' : 's'})
                </Button>
              </Stack>
            </Stack>
          )}
        </Collapse>
      </Box>
    </Box>
  );
}
