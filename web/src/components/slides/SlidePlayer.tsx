/**
 * Plays a deck: arrows, keyboard, swipe, dots, full screen and optional speaker notes.
 * With animations on, each slide glides in and its points appear one per click (quiz answers too).
 */
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeftRounded';
import ChevronRight from '@mui/icons-material/ChevronRightRounded';
import Fullscreen from '@mui/icons-material/FullscreenRounded';
import FullscreenExit from '@mui/icons-material/FullscreenExitRounded';
import SpeakerNotes from '@mui/icons-material/SpeakerNotesOutlined';
import AutoAwesomeMotion from '@mui/icons-material/AutoAwesomeMotionOutlined';
import Close from '@mui/icons-material/CloseRounded';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Slide } from '@/api/types';
import { SlideView, buildSteps } from './SlideView';

export function SlidePlayer({
  slides,
  theme,
  start = 0,
  showNotes = false,
  onClose,
  radius = 16,
  onIndex,
}: {
  slides: Slide[];
  theme?: string;
  start?: number;
  showNotes?: boolean;
  onClose?: () => void;
  radius?: number;
  onIndex?: (i: number) => void;
}) {
  const [i, setIState] = useState(start);
  const [step, setStep] = useState(0);
  const [anim, setAnim] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [notes, setNotes] = useState(showNotes);
  const [fs, setFs] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const setI = useCallback((k: number) => {
    setIState(k);
    setStep(0);
  }, []);
  const stepsOf = useCallback((k: number) => (slides[k] ? buildSteps(slides[k]) : 0), [slides]);
  // Forward reveals the next point first; back goes to the previous slide fully shown
  const go = useCallback(
    (d: number) => {
      if (d > 0 && anim && step < stepsOf(i)) return setStep(step + 1);
      const k = Math.max(0, Math.min(n - 1, i + d));
      if (k === i) return;
      setIState(k);
      setStep(d < 0 ? stepsOf(k) : 0);
    },
    [anim, step, i, n, stepsOf],
  );

  useEffect(() => {
    onIndex?.(i);
  }, [i, onIndex]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (!fs && !onClose && !box.current?.contains(document.activeElement)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Home') setI(0);
      else if (e.key === 'End') setI(n - 1);
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setStep(stepsOf(i));
      } else if (e.key === 'Escape' && onClose && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, n, fs, onClose, setI, stepsOf, i]);
  useEffect(() => {
    const f = () => setFs(document.fullscreenElement === box.current);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const toggleFs = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.());

  if (!n) return null;
  const s = slides[Math.min(i, n - 1)];
  const big = fs || !!onClose;
  return (
    <Box
      ref={box}
      tabIndex={0}
      aria-label={`Slide ${i + 1} of ${n}`}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
      sx={{ outline: 'none', ...(big ? { bgcolor: '#0E0E12', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', p: fs ? 0 : 2 } : {}) }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: big ? 'min(100%, calc((100vh - 120px) * 16 / 9))' : 'none',
          mx: 'auto',
          borderRadius: fs ? 0 : `${radius}px`,
          overflow: 'hidden',
          boxShadow: big ? 'none' : '0 1px 2px rgba(20,20,50,0.06), 0 8px 28px rgba(20,20,50,0.10)',
        }}
      >
        <Box
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            go(e.clientX - r.left > r.width / 3 ? 1 : -1);
          }}
          sx={{ cursor: 'pointer' }}
        >
          <Box key={i} sx={anim ? { '@keyframes spIn': { from: { opacity: 0, transform: 'scale(1.02)' }, to: { opacity: 1, transform: 'none' } }, animation: 'spIn .45s ease both' } : undefined}>
            <SlideView slide={s} theme={theme} index={i} total={n} animate={anim} step={anim ? step : undefined} />
          </Box>
        </Box>
        {i > 0 && (
          <IconButton aria-label="Previous slide" onClick={() => go(-1)} sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: '#fff' }, boxShadow: 2 }}>
            <ChevronLeft />
          </IconButton>
        )}
        {(i < n - 1 || (anim && step < stepsOf(i))) && (
          <IconButton aria-label="Next slide" onClick={() => go(1)} sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: '#fff' }, boxShadow: 2 }}>
            <ChevronRight />
          </IconButton>
        )}
      </Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1.25, px: 1, color: big ? '#fff' : 'text.secondary' }}>
        <Stack direction="row" sx={{ gap: 0.6, flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
          {slides.map((_, k) => (
            <Box
              key={k}
              component="button"
              aria-label={`Go to slide ${k + 1}`}
              onClick={() => setI(k)}
              sx={{ border: 0, p: 0, cursor: 'pointer', width: k === i ? 22 : 8, height: 8, borderRadius: 9, bgcolor: k === i ? (big ? '#fff' : 'primary.main') : big ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.18)', transition: 'width .2s' }}
            />
          ))}
        </Stack>
        <Typography variant="caption" sx={{ minWidth: 44, textAlign: 'right' }}>
          {i + 1} / {n}
        </Typography>
        <Tooltip title={anim ? 'Animations on: points appear one by one' : 'Animations off'}>
          <IconButton size="small" onClick={() => setAnim(!anim)} sx={{ color: 'inherit', opacity: anim ? 1 : 0.5 }} aria-pressed={anim} aria-label="Animations">
            <AutoAwesomeMotion fontSize="small" />
          </IconButton>
        </Tooltip>
        {showNotes && (
          <Tooltip title="Speaker notes">
            <IconButton size="small" onClick={() => setNotes(!notes)} sx={{ color: 'inherit' }} aria-pressed={notes}>
              <SpeakerNotes fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={fs ? 'Exit full screen' : 'Full screen'}>
          <IconButton size="small" onClick={toggleFs} sx={{ color: 'inherit' }}>
            {fs ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
        </Tooltip>
        {onClose && (
          <Tooltip title="Close (Esc)">
            <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }}>
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {notes && s.notes && <Box sx={{ mt: 1, mx: 'auto', maxWidth: 900, p: 1.5, borderRadius: 2, bgcolor: big ? 'rgba(255,255,255,0.08)' : '#FFF8E6', color: big ? '#fff' : 'text.primary', fontSize: 14.5, lineHeight: 1.6 }}>{s.notes}</Box>}
    </Box>
  );
}
