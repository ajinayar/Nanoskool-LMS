/**
 * "Create with AI" for presentations, in three steps (like Gamma):
 *   1. What it is about  →  2. The outline (edit, reorder, add or remove cards)  →  3. The look
 * then AI writes every slide in the chosen style and, when an OpenAI key is set, paints pictures for them.
 */
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Add from '@mui/icons-material/Add';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Close from '@mui/icons-material/Close';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '@/api/client';
import type { Slide, SlideLayout } from '@/api/types';
import { DECK_THEMES, LAYOUTS, SlideView, themeForGrade } from './SlideView';

type Card = { title: string; layout: SlideLayout };
const AGE = (g?: number) => (!g ? 'any age' : g <= 3 ? 'big pictures, few words' : g <= 7 ? 'lively and visual' : 'clean and professional');

export function DeckWizard({
  open,
  onClose,
  onDone,
  defaultTopic,
  grade,
  lessonHtml,
  provider,
  images,
  hasSlides,
  currentTheme,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (s: Slide[], mode: 'replace' | 'append', theme?: string) => void;
  defaultTopic: string;
  grade?: number;
  lessonHtml?: string;
  provider?: 'anthropic' | 'openai' | 'offline';
  images?: boolean;
  hasSlides: boolean;
  currentTheme?: string;
}) {
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState(defaultTopic);
  const [count, setCount] = useState(8);
  const [g, setG] = useState<number | ''>(grade ?? '');
  const [useLesson, setUseLesson] = useState(!!lessonHtml);
  const [notes, setNotes] = useState('');
  const [outline, setOutline] = useState<Card[]>([]);
  const [theme, setTheme] = useState(themeForGrade(grade));
  const [pictures, setPictures] = useState(!!images);
  const [mode, setMode] = useState<'replace' | 'append'>(hasSlides ? 'append' : 'replace');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setStep(0);
      setTopic((t) => t || defaultTopic);
      setMode(hasSlides ? 'append' : 'replace');
      setErr(null);
      setPictures(!!images);
    }
  }, [open, defaultTopic, hasSlides, images]);
  useEffect(() => setTheme(themeForGrade(g || undefined)), [g]);
  const hasLesson = !!lessonHtml && lessonHtml.replace(/<[^>]+>/g, '').trim().length > 40;
  const source = useLesson && hasLesson ? lessonHtml : undefined;

  const writeOutline = async () => {
    setBusy('Planning your slides…');
    setErr(null);
    try {
      const r = await api.post<{ outline: Card[] }>('/ai/slides/outline', { topic: topic.trim(), count, grade: g || undefined, sourceHtml: source, instructions: notes.trim() || undefined });
      setOutline(r.data.outline);
      setStep(1);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    setBusy('Writing your slides…');
    setErr(null);
    setProgress(null);
    try {
      const r = await api.post<{ slides: Slide[] }>('/ai/slides/generate', {
        topic: topic.trim(),
        count: outline.length,
        grade: g || undefined,
        sourceHtml: source,
        instructions: notes.trim() || undefined,
        outline: outline.filter((c) => c.title.trim()),
      });
      let slides = r.data.slides;
      // Paint pictures for the slides that show one (title, picture slides), a few at a time
      if (pictures && images) {
        const want = slides
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => ['title', 'image-right', 'image-full'].includes(s.layout))
          .slice(0, 6);
        let done = 0;
        setProgress(0);
        setBusy(`Painting pictures 0 of ${want.length}…`);
        const out = [...slides];
        const queue = [...want];
        const worker = async () => {
          for (let job = queue.shift(); job; job = queue.shift()) {
            try {
              const p = await api.post<{ url: string }>('/ai/slides/image', { prompt: job.s.imageAlt || job.s.title || topic, topic, grade: g || undefined });
              out[job.i] = { ...out[job.i], imageUrl: p.data.url, imageAlt: job.s.imageAlt || job.s.title };
            } catch {
              /* keep the built-in graphic for this slide */
            }
            done++;
            setProgress((done / want.length) * 100);
            setBusy(`Painting pictures ${done} of ${want.length}…`);
          }
        };
        await Promise.all([worker(), worker()]);
        slides = out;
      }
      onDone(slides, mode, theme);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const setCard = (i: number, p: Partial<Card>) => setOutline(outline.map((c, k) => (k === i ? { ...c, ...p } : c)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= outline.length) return;
    const n = [...outline];
    [n[i], n[j]] = [n[j], n[i]];
    setOutline(n);
  };
  const sample = useMemo<Slide>(() => ({ layout: 'title', title: topic || 'Your topic', subtitle: g ? `Grade ${g}` : 'A Nanoskool lesson', icon: 'idea' }), [topic, g]);
  const sample2 = useMemo<Slide>(() => ({ layout: 'icons', title: 'Key ideas', bullets: ['First idea', 'Second idea', 'Third idea'], icons: ['bulb', 'gear', 'star'] }), []);
  const recommended = themeForGrade(g || undefined);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth={step === 2 ? 'md' : 'sm'} scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AutoAwesome sx={{ color: '#7C5CFA' }} /> Create a presentation with AI
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} disabled={!!busy} aria-label="Close" size="small">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper activeStep={step} alternativeLabel>
          {['Topic', 'Outline', 'Look'].map((l) => (
            <Step key={l}>
              <StepLabel>{l}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
      <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
        {provider === 'offline' && step === 0 && <Alert severity="info">AI is offline, so slides are drafted from the lesson content or a teaching template. Switch on Claude or OpenAI in Admin → AI settings for full AI-written slides.</Alert>}
        {step === 0 && (
          <>
            <TextField label="What is the presentation about?" value={topic} onChange={(e) => setTopic(e.target.value)} autoFocus required placeholder="e.g. How a simple circuit works" />
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <TextField select label="Grade" value={g} onChange={(e) => setG(e.target.value ? Number(e.target.value) : '')} sx={{ width: 140 }}>
                <MenuItem value="">Any</MenuItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    Grade {i + 1}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ flex: 1, px: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Slides: <b>{count}</b>
                </Typography>
                <Slider value={count} min={3} max={20} step={1} onChange={(_, v) => setCount(v as number)} />
              </Box>
            </Stack>
            {hasLesson && <FormControlLabel control={<Checkbox checked={useLesson} onChange={(e) => setUseLesson(e.target.checked)} />} label="Use this learning unit’s lesson content" />}
            <TextField label="Anything else? (optional)" placeholder="e.g. include a hands-on activity, use Indian examples, end with 3 quiz questions" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} />
          </>
        )}

        {step === 1 && (
          <>
            <Typography variant="body2" color="text.secondary">
              Here is the plan. Change any title, choose how a slide looks, reorder, add or remove slides. AI then writes each one.
            </Typography>
            <Stack spacing={1}>
              {outline.map((c, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center', p: 1, pl: 1.5, borderRadius: 2, bgcolor: '#F7F5FF', border: '1px solid #ECE8FB' }}>
                  <Typography sx={{ width: 22, fontWeight: 800, color: '#7C5CFA' }}>{i + 1}</Typography>
                  <TextField
                    variant="standard"
                    value={c.title}
                    onChange={(e) => setCard(i, { title: e.target.value })}
                    fullWidth
                    slotProps={{ input: { disableUnderline: true, sx: { fontWeight: 600 } }, htmlInput: { 'aria-label': `Slide ${i + 1} title`, maxLength: 200 } }}
                  />
                  <TextField
                    select
                    variant="standard"
                    value={c.layout}
                    onChange={(e) => setCard(i, { layout: e.target.value as SlideLayout })}
                    sx={{ minWidth: 150 }}
                    slotProps={{ input: { disableUnderline: true, sx: { fontSize: 13, color: 'text.secondary' } } }}
                  >
                    {LAYOUTS.map((l) => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => move(i, 1)} disabled={i === outline.length - 1} aria-label="Move down">
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setOutline(outline.filter((_, k) => k !== i))} aria-label="Remove slide">
                    <Close fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Box>
              <Button startIcon={<Add />} onClick={() => setOutline([...outline, { title: '', layout: 'bullets' }])} disabled={outline.length >= 20}>
                Add a slide
              </Button>
            </Box>
          </>
        )}

        {step === 2 && (
          <>
            <Typography variant="body2" color="text.secondary">
              Choose a look. {g ? `For Grade ${g} we suggest ${DECK_THEMES.find((t) => t.id === recommended)?.name} (${AGE(g || undefined)}).` : ''} You can change it any time.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
              {DECK_THEMES.map((t) => {
                const on = t.id === theme;
                return (
                  <ButtonBase
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    aria-pressed={on}
                    sx={{ flexDirection: 'column', alignItems: 'stretch', borderRadius: 2.5, overflow: 'hidden', border: '2.5px solid', borderColor: on ? '#7C5CFA' : '#ECEDF3', textAlign: 'left', position: 'relative' }}
                  >
                    <SlideView slide={sample} theme={t.id} />
                    <Box sx={{ borderTop: '1px solid #EEE' }}>
                      <SlideView slide={sample2} theme={t.id} />
                    </Box>
                    <Box sx={{ p: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.audience}
                      </Typography>
                    </Box>
                    {t.id === recommended && g !== '' && <Chip size="small" label="Suggested" color="secondary" sx={{ position: 'absolute', top: 6, left: 6, height: 20, fontSize: 11 }} />}
                    {on && <CheckCircle sx={{ position: 'absolute', top: 6, right: 6, color: '#7C5CFA', bgcolor: '#fff', borderRadius: '50%' }} />}
                  </ButtonBase>
                );
              })}
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: images ? '#F5F3FF' : '#F6F6F8' }}>
              <ImageOutlined sx={{ color: images ? '#7C5CFA' : 'text.disabled' }} />
              <Box sx={{ flex: 1 }}>
                <FormControlLabel disabled={!images} control={<Checkbox checked={pictures && !!images} onChange={(e) => setPictures(e.target.checked)} />} label={<Typography sx={{ fontWeight: 600 }}>Make pictures with AI</Typography>} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5, ml: 4 }}>
                  {images
                    ? 'Up to 6 illustrations for the title and picture slides, in a style for the age group. Takes about a minute.'
                    : 'Add an OpenAI key in Admin → AI settings to make pictures. Until then, slides use built-in graphics in the deck’s colours.'}
                </Typography>
              </Box>
            </Stack>
            {hasSlides && (
              <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as 'replace' | 'append')}>
                <FormControlLabel value="append" control={<Radio />} label="Add after my slides" />
                <FormControlLabel value="replace" control={<Radio />} label="Replace all slides" />
              </RadioGroup>
            )}
          </>
        )}
        {busy && (
          <Box>
            <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
              {busy}
            </Typography>
            <LinearProgress variant={progress == null ? 'indeterminate' : 'determinate'} value={progress ?? 0} />
          </Box>
        )}
        {err && <Alert severity="error">{err}</Alert>}
      </DialogContent>
      <DialogActions>
        {step > 0 && (
          <Button onClick={() => setStep(step - 1)} disabled={!!busy}>
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
          {provider === 'anthropic' ? 'Claude AI' : provider === 'openai' ? 'OpenAI' : 'Offline drafts'} · always check facts before students see them
        </Typography>
        {step === 0 && (
          <Button variant="contained" onClick={writeOutline} disabled={!!busy || topic.trim().length < 2} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}>
            Plan the slides
          </Button>
        )}
        {step === 1 && (
          <Button variant="contained" onClick={() => setStep(2)} disabled={!outline.some((c) => c.title.trim())}>
            Choose the look
          </Button>
        )}
        {step === 2 && (
          <Tooltip title={currentTheme && currentTheme !== theme && hasSlides && mode === 'append' ? 'The whole deck will switch to this look' : ''}>
            <span>
              <Button variant="contained" onClick={generate} disabled={!!busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />} sx={{ background: 'linear-gradient(90deg,#7C5CFA,#C04CD8)' }}>
                Create {outline.length} slides
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );
}
