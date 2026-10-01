/**
 * Presentation maker for 'presentation' learning units: slide list, live canvas, slide form,
 * themes, AI drafting and AI rewrite, present mode and PowerPoint download.
 */
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Add from '@mui/icons-material/Add';
import ContentCopy from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Slideshow from '@mui/icons-material/SlideshowOutlined';
import Download from '@mui/icons-material/FileDownloadOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import ChildCare from '@mui/icons-material/ChildCareOutlined';
import ShortText from '@mui/icons-material/ShortText';
import Lightbulb from '@mui/icons-material/LightbulbOutlined';
import HelpOutline from '@mui/icons-material/HelpOutlineOutlined';
import SpeakerNotes from '@mui/icons-material/SpeakerNotesOutlined';
import EditNote from '@mui/icons-material/EditNote';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/api/client';
import type { Slide, SlideLayout } from '@/api/types';
import { newId } from '@/api/journey';
import { useGet } from '@/lib/hooks';
import { useToast } from '../Toast';
import { UploadButton } from '../ui';
import { DECK_THEMES, LAYOUTS, SlideView, themeById } from './SlideView';
import { GRAPHIC_KEYS, GRAPHICS, Graphic, IconBadge, graphicFor } from './graphics';
import { SlidePlayer } from './SlidePlayer';
import { DeckWizard } from './DeckWizard';
import { exportPptx } from './exportPptx';

const lines = (a?: string[]) => (a ?? []).join('\n');
const unlines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.replace(/^\s*[-•*]\s*/, ''))
    .filter((x, i, arr) => x.trim() || i < arr.length - 1);
const POINTS: SlideLayout[] = ['bullets', 'image-right', 'two-column', 'icons', 'steps', 'quiz'];
const blank = (layout: SlideLayout): Slide => ({
  _id: newId(),
  layout,
  title: '',
  subtitle: '',
  bullets: layout === 'quiz' ? ['', '', ''] : layout === 'icons' || layout === 'steps' ? ['', '', ''] : POINTS.includes(layout) ? [''] : [],
  bullets2: layout === 'two-column' ? [''] : [],
  icons: layout === 'icons' || layout === 'steps' ? ['idea', 'target', 'check'] : undefined,
  icon: ['title', 'section', 'image-right', 'fact', 'bullets'].includes(layout) ? 'idea' : undefined,
  answer: layout === 'quiz' ? 0 : undefined,
  imageUrl: '',
  notes: '',
});

function LayoutIcon({ id }: { id: SlideLayout }) {
  const bar = (w: string, h = 3, mt = 0, c = '#9A93B8') => <Box sx={{ width: w, height: h, bgcolor: c, borderRadius: 1, mt: `${mt}px` }} />;
  const box = { width: 44, height: 26, borderRadius: '4px', border: '1.5px solid #CFC8E8', bgcolor: '#fff', p: '4px', display: 'flex', flexDirection: 'column' } as const;
  switch (id) {
    case 'title':
      return (
        <Box sx={{ ...box, justifyContent: 'center' }}>
          {bar('70%', 4, 0, '#7C5CFA')}
          {bar('45%', 2, 3)}
        </Box>
      );
    case 'section':
      return <Box sx={{ ...box, justifyContent: 'center', alignItems: 'center' }}>{bar('60%', 4, 0, '#7C5CFA')}</Box>;
    case 'quote':
      return (
        <Box sx={{ ...box, justifyContent: 'center' }}>
          <Box sx={{ fontSize: 12, lineHeight: 0.6, color: '#7C5CFA', fontWeight: 900 }}>“</Box>
          {bar('80%', 2, 2)}
          {bar('55%', 2, 2)}
        </Box>
      );
    case 'image-full':
      return <Box sx={{ ...box, p: 0, background: 'linear-gradient(135deg,#B6A6F5,#FFC98A)' }} />;
    case 'image-right':
      return (
        <Box sx={{ ...box, flexDirection: 'row', gap: '3px' }}>
          <Box sx={{ flex: 1 }}>
            {bar('90%', 3, 0, '#7C5CFA')}
            {bar('80%', 2, 3)}
            {bar('70%', 2, 2)}
          </Box>
          <Box sx={{ width: 14, bgcolor: '#E3DCFA', borderRadius: '2px' }} />
        </Box>
      );
    case 'icons':
      return (
        <Box sx={box}>
          {bar('55%', 3, 0, '#7C5CFA')}
          <Stack direction="row" sx={{ gap: '3px', mt: '4px' }}>
            {[0, 1, 2].map((k) => (
              <Box key={k} sx={{ flex: 1, height: 9, borderRadius: '2px', bgcolor: '#EEE9FC', display: 'grid', placeItems: 'center' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '30%', bgcolor: k % 2 ? '#FFB44D' : '#7C5CFA' }} />
              </Box>
            ))}
          </Stack>
        </Box>
      );
    case 'steps':
      return (
        <Box sx={box}>
          {bar('55%', 3, 0, '#7C5CFA')}
          <Stack direction="row" sx={{ alignItems: 'center', mt: '5px', gap: '1px' }}>
            {[0, 1, 2].map((k) => (
              <Stack key={k} direction="row" sx={{ alignItems: 'center', flex: 1 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: k % 2 ? '#FFB44D' : '#7C5CFA' }} />
                {k < 2 && <Box sx={{ flex: 1, borderTop: '1px dashed #9A93B8' }} />}
              </Stack>
            ))}
          </Stack>
        </Box>
      );
    case 'fact':
      return (
        <Box sx={{ ...box, justifyContent: 'center' }}>
          <Box sx={{ fontSize: 11, fontWeight: 900, lineHeight: 1, color: '#7C5CFA' }}>42%</Box>
          {bar('70%', 2, 2)}
        </Box>
      );
    case 'quiz':
      return (
        <Box sx={box}>
          {bar('70%', 3, 0, '#7C5CFA')}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', mt: '3px' }}>
            {[0, 1, 2, 3].map((k) => (
              <Box key={k} sx={{ height: 5, borderRadius: '2px', bgcolor: k === 1 ? '#9BE3B5' : '#EEE9FC' }} />
            ))}
          </Box>
        </Box>
      );
    case 'two-column':
      return (
        <Box sx={box}>
          {bar('60%', 3, 0, '#7C5CFA')}
          <Stack direction="row" sx={{ gap: '3px', mt: '3px', flex: 1 }}>
            <Box sx={{ flex: 1, bgcolor: '#EEE9FC', borderRadius: '2px' }} />
            <Box sx={{ flex: 1, bgcolor: '#FFF0DC', borderRadius: '2px' }} />
          </Stack>
        </Box>
      );
    default:
      return (
        <Box sx={box}>
          {bar('60%', 3, 0, '#7C5CFA')}
          {bar('85%', 2, 3)}
          {bar('75%', 2, 2)}
          {bar('65%', 2, 2)}
        </Box>
      );
  }
}

export function DeckEditor({
  slides,
  onChange,
  theme,
  onTheme,
  unitTitle,
  lessonHtml,
  grades,
}: {
  slides: Slide[];
  onChange: (s: Slide[]) => void;
  theme?: string;
  onTheme: (t: string) => void;
  unitTitle: string;
  lessonHtml?: string;
  grades?: number[];
}) {
  const toast = useToast();
  const [sel, setSel] = useState(0);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [aiAnchor, setAiAnchor] = useState<HTMLElement | null>(null);
  const [genOpen, setGenOpen] = useState(slides.length === 0 ? false : false);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [present, setPresent] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const status = useGet<{ provider: 'anthropic' | 'openai' | 'offline'; images?: boolean }>('/ai/slides/status');
  const grade = grades?.length ? Math.min(...grades) : undefined;

  useEffect(() => {
    if (sel > slides.length - 1) setSel(Math.max(0, slides.length - 1));
  }, [slides.length, sel]);

  const cur = slides[sel];
  const update = (p: Partial<Slide>) => onChange(slides.map((s, i) => (i === sel ? { ...s, ...p } : s)));
  const insert = (s: Slide, at = sel + 1) => {
    const next = [...slides.slice(0, at), s, ...slides.slice(at)];
    onChange(next);
    setSel(at);
  };
  const remove = () => {
    onChange(slides.filter((_, i) => i !== sel));
    setSel(Math.max(0, sel - 1));
  };
  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= slides.length || from === to) return;
    const next = [...slides];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
    setSel(to);
  };

  const improve = async (action: string, instruction?: string) => {
    if (!cur) return;
    setAiAnchor(null);
    setBusy(true);
    try {
      const { _id, ...slide } = cur;
      const r = await api.post<{ slide: Slide }>('/ai/slides/improve', { slide: { ...slide, imageUrl: slide.imageUrl || '' }, action, instruction, grade, topic: unitTitle });
      update({ ...r.data.slide, _id, imageUrl: cur.imageUrl, background: cur.background });
      toast.success('Slide updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      await exportPptx(unitTitle || 'Presentation', slides, theme);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create the PowerPoint file'));
    } finally {
      setBusy(false);
    }
  };

  const layoutUsesBullets = cur && POINTS.includes(cur.layout);
  const layoutUsesImage = cur && ['image-right', 'image-full', 'title', 'fact'].includes(cur.layout);
  const layoutUsesGraphic = cur && ['title', 'section', 'bullets', 'image-right', 'image-full', 'fact'].includes(cur.layout);
  const perPointIcons = cur && (cur.layout === 'icons' || cur.layout === 'steps');
  const [pick, setPick] = useState<{ point?: number } | null>(null);

  return (
    <Box>
      {/* Top bar */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Button variant="contained" startIcon={<AutoAwesome />} onClick={() => setGenOpen(true)} sx={{ background: 'linear-gradient(90deg,#7C5CFA,#C04CD8)', '&:hover': { background: 'linear-gradient(90deg,#6B4AE8,#AE3CC6)' } }}>
          Create with AI
        </Button>
        <Button variant="outlined" startIcon={<Add />} onClick={(e) => setAddAnchor(e.currentTarget)}>
          Add slide
        </Button>
        <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}>
          {LAYOUTS.map((l) => (
            <MenuItem
              key={l.id}
              onClick={() => {
                insert(blank(l.id), slides.length ? sel + 1 : 0);
                setAddAnchor(null);
              }}
            >
              <ListItemIcon sx={{ mr: 1.5 }}>
                <LayoutIcon id={l.id} />
              </ListItemIcon>
              {l.name}
            </MenuItem>
          ))}
        </Menu>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            Theme
          </Typography>
          {DECK_THEMES.map((t) => (
            <Tooltip key={t.id} title={`${t.name}${t.audience ? ` · ${t.audience}` : ''}`}>
              <ButtonBase
                aria-label={`${t.name} theme`}
                onClick={() => onTheme(t.id)}
                sx={{ width: 26, height: 26, borderRadius: '50%', background: t.bg, border: '2px solid', borderColor: themeById(theme).id === t.id ? '#17171C' : 'rgba(0,0,0,0.12)', position: 'relative', overflow: 'hidden' }}
              >
                <Box sx={{ position: 'absolute', right: 3, bottom: 3, width: 9, height: 9, borderRadius: '50%', bgcolor: t.accent }} />
              </ButtonBase>
            </Tooltip>
          ))}
        </Stack>
        <Divider orientation="vertical" flexItem />
        <Button startIcon={<Slideshow />} onClick={() => setPresent(true)} disabled={!slides.length}>
          Present
        </Button>
        <Button startIcon={busy ? <CircularProgress size={16} /> : <Download />} onClick={download} disabled={!slides.length || busy}>
          PowerPoint
        </Button>
      </Stack>

      {slides.length === 0 ? (
        <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 5, textAlign: 'center' }}>
          <AutoAwesome sx={{ fontSize: 40, color: '#7C5CFA', mb: 1 }} />
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Start your presentation
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 520, mx: 'auto' }}>
            Let AI draft the slides from the topic{lessonHtml ? ' or from this lesson’s content' : ''}, then edit anything. Or add slides yourself.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
            <Button variant="contained" startIcon={<AutoAwesome />} onClick={() => setGenOpen(true)}>
              Create with AI
            </Button>
            <Button variant="outlined" onClick={() => insert(blank('title'), 0)}>
              Start blank
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '170px minmax(0,1fr)' }, gap: 2, alignItems: 'start' }}>
          {/* Thumbnails */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: 1, overflow: 'auto', maxHeight: { md: 640 }, pr: { md: 0.5 }, pb: { xs: 1, md: 0 } }}>
            {slides.map((s, i) => (
              <Box
                key={s._id ?? i}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag != null) moveTo(drag, i);
                  setDrag(null);
                }}
                onClick={() => setSel(i)}
                sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', cursor: 'pointer', flexShrink: 0, width: { xs: 150, md: 'auto' }, opacity: drag === i ? 0.4 : 1 }}
              >
                <Typography variant="caption" sx={{ width: 16, textAlign: 'right', color: 'text.secondary', mt: 0.5 }}>
                  {i + 1}
                </Typography>
                <Box sx={{ flex: 1, borderRadius: '8px', overflow: 'hidden', outline: i === sel ? '2.5px solid #7C5CFA' : '1px solid rgba(0,0,0,0.12)', outlineOffset: i === sel ? 1 : 0 }}>
                  <SlideView slide={s} theme={theme} />
                </Box>
              </Box>
            ))}
            <ButtonBase
              onClick={(e) => setAddAnchor(e.currentTarget)}
              sx={{ ml: { md: 3 }, flexShrink: 0, width: { xs: 120, md: 'auto' }, aspectRatio: '16 / 9', borderRadius: '8px', border: '1.5px dashed', borderColor: 'divider', color: 'text.secondary' }}
            >
              <Add />
            </ButtonBase>
          </Box>

          {/* Canvas + form */}
          {cur && (
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.06)', mb: 1.5 }}>
                <SlideView slide={cur} theme={theme} index={sel} total={slides.length} />
                {busy && (
                  <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.6)', display: 'grid', placeItems: 'center' }}>
                    <CircularProgress />
                  </Box>
                )}
              </Box>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                {LAYOUTS.map((l) => (
                  <Tooltip key={l.id} title={l.name}>
                    <ButtonBase
                      onClick={() =>
                        update({
                          layout: l.id,
                          bullets: cur.bullets?.length ? cur.bullets : l.id === 'quiz' ? ['', '', ''] : [''],
                          bullets2: l.id === 'two-column' && !cur.bullets2?.length ? [''] : cur.bullets2,
                          icons: (l.id === 'icons' || l.id === 'steps') && !cur.icons?.length ? (cur.bullets ?? ['']).map((_, k) => GRAPHIC_KEYS[(k * 7) % GRAPHIC_KEYS.length]) : cur.icons,
                          icon: cur.icon ?? (['title', 'section', 'image-right', 'fact', 'bullets'].includes(l.id) ? 'idea' : undefined),
                          answer: l.id === 'quiz' ? (cur.answer ?? 0) : cur.answer,
                        })
                      }
                      sx={{ p: 0.5, borderRadius: '8px', outline: cur.layout === l.id ? '2px solid #7C5CFA' : 'none', bgcolor: cur.layout === l.id ? '#F4F0FF' : 'transparent' }}
                      aria-label={`${l.name} layout`}
                    >
                      <LayoutIcon id={l.id} />
                    </ButtonBase>
                  </Tooltip>
                ))}
                <Box sx={{ flex: 1 }} />
                <Button size="small" startIcon={<AutoAwesome />} onClick={(e) => setAiAnchor(e.currentTarget)} disabled={busy} sx={{ color: '#7C5CFA' }}>
                  Improve with AI
                </Button>
                <Menu anchorEl={aiAnchor} open={!!aiAnchor} onClose={() => setAiAnchor(null)}>
                  {[
                    ['simplify', 'Make it simpler for the age group', <ChildCare key="a" fontSize="small" />],
                    ['shorten', 'Make it shorter', <ShortText key="b" fontSize="small" />],
                    ['example', 'Add an everyday example', <Lightbulb key="c" fontSize="small" />],
                    ['question', 'Add a check question', <HelpOutline key="d" fontSize="small" />],
                    ['notes', 'Write speaker notes', <SpeakerNotes key="e" fontSize="small" />],
                  ].map(([a, label, icon]) => (
                    <MenuItem key={a as string} onClick={() => improve(a as string)}>
                      <ListItemIcon>{icon}</ListItemIcon>
                      {label}
                    </MenuItem>
                  ))}
                  <MenuItem
                    onClick={() => {
                      setAiAnchor(null);
                      setCustom(true);
                    }}
                  >
                    <ListItemIcon>
                      <EditNote fontSize="small" />
                    </ListItemIcon>
                    Tell AI what to change…
                  </MenuItem>
                </Menu>
                <Tooltip title="Move up">
                  <span>
                    <IconButton size="small" onClick={() => moveTo(sel, sel - 1)} disabled={sel === 0}>
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton size="small" onClick={() => moveTo(sel, sel + 1)} disabled={sel === slides.length - 1}>
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Duplicate slide">
                  <IconButton size="small" onClick={() => insert({ ...cur, _id: newId() })}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete slide">
                  <IconButton size="small" color="error" onClick={remove}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Stack spacing={1.75}>
                <TextField
                  label={cur.layout === 'quote' ? 'Big question or quote' : cur.layout === 'quiz' ? 'Question' : cur.layout === 'fact' ? 'The number or short fact (e.g. 3,00,000 km/s)' : 'Title'}
                  value={cur.title ?? ''}
                  onChange={(e) => update({ title: e.target.value })}
                  multiline={cur.layout === 'quote'}
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                />
                {cur.layout !== 'quiz' && (
                  <TextField
                    label={cur.layout === 'quote' ? 'Who said it / prompt' : cur.layout === 'two-column' ? 'Column labels (Left | Right)' : cur.layout === 'fact' ? 'What it means' : 'Subtitle (optional)'}
                    value={cur.subtitle ?? ''}
                    onChange={(e) => update({ subtitle: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 600 } }}
                  />
                )}
                {layoutUsesBullets && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={cur.layout === 'quiz' ? 3 : 4}
                      label={
                        cur.layout === 'two-column'
                          ? 'Left column (one point per line)'
                          : cur.layout === 'quiz'
                            ? 'Answer options (one per line)'
                            : cur.layout === 'steps'
                              ? 'Steps, in order (one per line)'
                              : cur.layout === 'icons'
                                ? 'Ideas (one per line, 3–4 is best)'
                                : 'Points (one per line)'
                      }
                      value={lines(cur.bullets)}
                      onChange={(e) => {
                        const b = unlines(e.target.value).slice(0, cur.layout === 'quiz' ? 4 : cur.layout === 'steps' || cur.layout === 'icons' ? 6 : 12);
                        update({ bullets: b, ...(perPointIcons ? { icons: b.map((_, k) => cur.icons?.[k] ?? GRAPHIC_KEYS[(k * 7) % GRAPHIC_KEYS.length]) } : {}) });
                      }}
                      helperText={cur.layout === 'quiz' ? 'Up to 4 options' : 'Keep it to 3–5 short points'}
                    />
                    {cur.layout === 'two-column' && <TextField fullWidth multiline minRows={4} label="Right column (one point per line)" value={lines(cur.bullets2)} onChange={(e) => update({ bullets2: unlines(e.target.value).slice(0, 12) })} />}
                  </Stack>
                )}
                {cur.layout === 'quiz' && (
                  <TextField select label="Right answer" value={cur.answer ?? 0} onChange={(e) => update({ answer: Number(e.target.value) })} sx={{ maxWidth: 360 }} helperText="In Present mode the answer shows after one more click">
                    {(cur.bullets ?? []).map((o, k) => (
                      <MenuItem key={k} value={k}>
                        {'ABCD'[k]}. {o || `Option ${k + 1}`}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {perPointIcons && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                      Pictures for each {cur.layout === 'steps' ? 'step' : 'idea'}
                    </Typography>
                    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                      {(cur.bullets ?? []).map((b, k) => (
                        <Tooltip key={k} title={`Change the picture for “${b || `point ${k + 1}`}”`}>
                          <ButtonBase onClick={() => setPick({ point: k })} sx={{ gap: 1, pl: 0.5, pr: 1.25, py: 0.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <IconBadge k={cur.icons?.[k]} t={themeById(theme)} i={k} size="30px" />
                            <Typography variant="caption" sx={{ maxWidth: 110 }} noWrap>
                              {b || `Point ${k + 1}`}
                            </Typography>
                          </ButtonBase>
                        </Tooltip>
                      ))}
                    </Stack>
                  </Box>
                )}
                {layoutUsesGraphic && !cur.imageUrl && (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 56 }}>
                      <Graphic k={cur.icon} t={themeById(theme)} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Graphic: {graphicFor(cur.icon)?.label ?? 'none'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Drawn in the deck’s colours. Upload a photo below to use that instead.
                      </Typography>
                    </Box>
                    <Button size="small" onClick={() => setPick({})}>
                      Change
                    </Button>
                    {cur.icon && (
                      <Button size="small" color="inherit" onClick={() => update({ icon: undefined })}>
                        Remove
                      </Button>
                    )}
                  </Stack>
                )}
                {layoutUsesImage && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                    <UploadButton folder="content" accept="image/*" label={cur.imageUrl ? 'Replace picture' : 'Upload picture'} onUploaded={(url) => update({ imageUrl: url })} />
                    <TextField
                      size="small"
                      fullWidth
                      label="…or picture link (https://)"
                      value={cur.imageUrl ?? ''}
                      onChange={(e) => update({ imageUrl: e.target.value.trim() })}
                      slotProps={{ input: { startAdornment: <ImageOutlined fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> } }}
                    />
                    <TextField size="small" fullWidth label="Describe the picture" value={cur.imageAlt ?? ''} onChange={(e) => update({ imageAlt: e.target.value })} helperText="Read aloud for students who cannot see it" />
                  </Stack>
                )}
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Background
                  </Typography>
                  {['', '#FFFFFF', '#FFF7E6', '#EAF6FF', '#F1ECFF', '#EAF7EC', '#17171C'].map((c) => (
                    <ButtonBase
                      key={c || 'theme'}
                      aria-label={c ? `Background ${c}` : 'Theme background'}
                      onClick={() => update({ background: c })}
                      sx={{ width: 24, height: 24, borderRadius: '6px', background: c || themeById(theme).bg, border: '2px solid', borderColor: (cur.background ?? '') === c ? '#17171C' : 'rgba(0,0,0,0.12)', fontSize: 9, color: '#666' }}
                    >
                      {c ? '' : 'T'}
                    </ButtonBase>
                  ))}
                </Stack>
                <TextField label="Speaker notes (only teachers see these)" multiline minRows={2} value={cur.notes ?? ''} onChange={(e) => update({ notes: e.target.value })} slotProps={{ htmlInput: { maxLength: 4000 } }} />
              </Stack>
            </Box>
          )}
        </Box>
      )}

      <DeckWizard
        images={status.data?.images}
        currentTheme={theme}
        open={genOpen}
        onClose={() => setGenOpen(false)}
        defaultTopic={unitTitle}
        grade={grade}
        lessonHtml={lessonHtml}
        provider={status.data?.provider}
        hasSlides={slides.length > 0}
        onDone={(generated, mode, style) => {
          const withIds = generated.map((s) => ({ ...s, _id: newId() }));
          if (style) onTheme(style);
          if (mode === 'replace') {
            onChange(withIds);
            setSel(0);
          } else {
            onChange([...slides, ...withIds]);
            setSel(slides.length);
          }
          setGenOpen(false);
          toast.success(`${generated.length} slides created. Check and edit them before saving.`);
        }}
      />
      <CustomDialog
        open={custom}
        onClose={() => setCustom(false)}
        onSubmit={(text) => {
          setCustom(false);
          improve('custom', text);
        }}
      />
      <GraphicPicker
        open={!!pick}
        theme={theme}
        current={pick?.point != null ? cur?.icons?.[pick.point] : cur?.icon}
        onClose={() => setPick(null)}
        onPick={(key) => {
          if (!cur || !pick) return;
          if (pick.point != null) update({ icons: (cur.bullets ?? []).map((_, k) => (k === pick.point ? key : (cur.icons?.[k] ?? 'idea'))) });
          else update({ icon: key });
          setPick(null);
        }}
      />
      <Dialog open={present} onClose={() => setPresent(false)} fullScreen slotProps={{ paper: { sx: { bgcolor: '#0E0E12' } } }}>
        <SlidePlayer slides={slides} theme={theme} start={sel} showNotes onClose={() => setPresent(false)} />
      </Dialog>
    </Box>
  );
}

function CustomDialog({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (t: string) => void }) {
  const [t, setT] = useState('');
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>What should AI change?</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <TextField fullWidth autoFocus multiline minRows={2} value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. turn this into 3 steps of an experiment" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={t.trim().length < 3} onClick={() => onSubmit(t.trim())}>
          Change slide
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GraphicPicker({ open, onClose, onPick, theme, current }: { open: boolean; onClose: () => void; onPick: (k: string) => void; theme?: string; current?: string }) {
  const [q, setQ] = useState('');
  const t = themeById(theme);
  const list = GRAPHIC_KEYS.filter((k) => !q.trim() || k.includes(q.trim().toLowerCase()) || GRAPHICS[k].label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>Choose a graphic</DialogTitle>
      <DialogContent dividers>
        <TextField fullWidth size="small" autoFocus placeholder="Search, e.g. battery, plant, rocket" value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 1 }}>
          {list.map((k) => (
            <ButtonBase key={k} onClick={() => onPick(k)} sx={{ flexDirection: 'column', p: 1, borderRadius: 2, border: '2px solid', borderColor: k === current ? 'primary.main' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
              <Box sx={{ width: 64 }}>
                <Graphic k={k} t={t} />
              </Box>
              <Typography variant="caption" sx={{ mt: 0.5 }}>
                {GRAPHICS[k].label}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
        {!list.length && <Typography color="text.secondary">No graphic matches “{q}”.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
