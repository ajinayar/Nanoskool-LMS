/**
 * Plays a motion graphic: a Lottie animation (.json), an animated picture (GIF/WebP), a looping
 * .mp4/.webm, or an embed link (YouTube, Vimeo, LottieFiles, Canva and similar).
 */
import { Box, IconButton, Typography } from '@mui/material';
import PauseRounded from '@mui/icons-material/PauseRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import { useEffect, useRef, useState } from 'react';
import { toEmbed } from '@/lib/embed';

export type MotionKind = 'lottie' | 'image' | 'video' | 'embed';
export function motionKind(url?: string): MotionKind | null {
  if (!url) return null;
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.json')) return 'lottie';
  if (/\.(gif|webp|apng|png|svg)$/.test(clean)) return 'image';
  if (/\.(mp4|webm|mov)$/.test(clean)) return 'video';
  return 'embed';
}
export const MOTION_KIND_LABEL: Record<MotionKind, string> = { lottie: 'Lottie animation', image: 'Animated picture', video: 'Animation video', embed: 'Embedded animation' };

function Lottie({ url, loop, paused }: { url: string; loop: boolean; paused: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const anim = useRef<{ play: () => void; pause: () => void; destroy: () => void; goToAndPlay: (n: number, f?: boolean) => void } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let dead = false;
    setError(false);
    (async () => {
      try {
        const [{ default: lottie }, res] = await Promise.all([import('lottie-web/build/player/lottie_light'), fetch(url)]);
        if (!res.ok) throw new Error('fetch');
        const data = await res.json();
        if (dead || !box.current) return;
        anim.current = lottie.loadAnimation({ container: box.current, renderer: 'svg', loop, autoplay: true, animationData: data }) as never;
      } catch {
        if (!dead) setError(true);
      }
    })();
    return () => {
      dead = true;
      anim.current?.destroy();
      anim.current = null;
    };
  }, [url, loop]);
  useEffect(() => {
    if (paused) anim.current?.pause();
    else anim.current?.play();
  }, [paused]);
  if (error) return <Typography sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>This animation could not be loaded. Check that the file is a Lottie .json animation.</Typography>;
  return <Box ref={box} sx={{ width: '100%', height: '100%', '& svg': { display: 'block' } }} />;
}

export function MotionPlayer({ url, loop = true, radius = 16, title }: { url?: string; loop?: boolean; radius?: number; title?: string }) {
  const kind = motionKind(url);
  const [paused, setPaused] = useState(false);
  const [nonce, setNonce] = useState(0);
  const vid = useRef<HTMLVideoElement>(null);
  if (!url || !kind) return null;
  const frame = { position: 'relative' as const, borderRadius: `${radius}px`, overflow: 'hidden', bgcolor: '#F5F4FA', border: '1px solid rgba(0,0,0,0.06)' };
  if (kind === 'embed') {
    return (
      <Box sx={{ ...frame, pt: '56.25%', bgcolor: '#000' }}>
        <Box component="iframe" src={toEmbed(url)} title={title ?? 'Animation'} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
      </Box>
    );
  }
  const controls = kind !== 'image' && (
    <Box sx={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', gap: 0.75 }}>
      <IconButton
        size="small"
        aria-label={paused ? 'Play' : 'Pause'}
        onClick={() => {
          setPaused((p) => !p);
          if (vid.current) paused ? vid.current.play() : vid.current.pause();
        }}
        sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}
      >
        {paused ? <PlayArrowRounded /> : <PauseRounded />}
      </IconButton>
      <IconButton
        size="small"
        aria-label="Play from the start"
        onClick={() => {
          setPaused(false);
          setNonce((n) => n + 1);
          if (vid.current) {
            vid.current.currentTime = 0;
            vid.current.play();
          }
        }}
        sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}
      >
        <ReplayRounded />
      </IconButton>
    </Box>
  );
  return (
    <Box sx={{ ...frame, aspectRatio: kind === 'lottie' ? '16 / 9' : undefined }}>
      {kind === 'lottie' && <Lottie key={nonce} url={url} loop={loop} paused={paused} />}
      {kind === 'image' && <Box component="img" src={url} alt={title ?? ''} sx={{ display: 'block', width: '100%', maxHeight: 560, objectFit: 'contain', mx: 'auto' }} />}
      {kind === 'video' && <Box component="video" ref={vid} src={url} autoPlay muted playsInline loop={loop} sx={{ display: 'block', width: '100%', maxHeight: 560, bgcolor: '#000' }} />}
      {controls}
    </Box>
  );
}
