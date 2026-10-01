/**
 * One 16:9 slide. Everything is sized in container units (cqw), so the same component renders
 * a tiny thumbnail, the editor canvas, the full-screen player and matches the PowerPoint export.
 * In the player, `step` reveals points one at a time and `animate` plays the entrance animation.
 */
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import type { Slide } from '@/api/types';
import { Graphic, IconBadge } from './graphics';

export interface DeckTheme {
  id: string;
  name: string;
  bg: string; // CSS background
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  panel: string; // card / section background
  font: string;
  headingFont: string;
  headingWeight: number;
  scale?: number; // text size (bigger for the youngest)
  radius?: number; // card roundness in cqw
  deco?: 'blobs' | 'confetti' | 'lines' | 'stars';
  audience?: string; // shown in the theme picker
}

const INTER = '"Inter Variable", Inter, system-ui, sans-serif';
const NUNITO = '"Nunito Variable", Nunito, "Inter Variable", system-ui, sans-serif';

export const DECK_THEMES: DeckTheme[] = [
  {
    id: 'playful',
    name: 'Playful',
    audience: 'Grades 1–3',
    bg: 'linear-gradient(160deg, #FFF8E1 0%, #FFE9F1 55%, #E6F4FF 100%)',
    ink: '#2A2440',
    muted: '#6B6385',
    accent: '#FF7A1A',
    accent2: '#7C5CFA',
    panel: '#FFFFFF',
    font: NUNITO,
    headingFont: NUNITO,
    headingWeight: 900,
    scale: 1.1,
    radius: 2.6,
    deco: 'confetti',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    audience: 'Grades 4–7',
    bg: 'linear-gradient(135deg, #E6F7FF 0%, #D0EEFF 100%)',
    ink: '#0B3654',
    muted: '#3F6B87',
    accent: '#0A84C6',
    accent2: '#FF8A5B',
    panel: '#FFFFFF',
    font: NUNITO,
    headingFont: NUNITO,
    headingWeight: 900,
    radius: 2,
    deco: 'blobs',
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    audience: 'Grades 4–7',
    bg: 'linear-gradient(135deg, #FFF4E0 0%, #FFE1E8 100%)',
    ink: '#3A1D2E',
    muted: '#7A5566',
    accent: '#F25C54',
    accent2: '#FFB703',
    panel: '#FFFFFF',
    font: NUNITO,
    headingFont: NUNITO,
    headingWeight: 900,
    radius: 2,
    deco: 'blobs',
  },
  { id: 'pro', name: 'Professional', audience: 'Grades 8–12', bg: '#FFFFFF', ink: '#111827', muted: '#4B5563', accent: '#2563EB', accent2: '#0EA5A4', panel: '#F3F6FB', font: INTER, headingFont: INTER, headingWeight: 750, radius: 1, deco: 'lines' },
  { id: 'clarity', name: 'Clarity', audience: 'Any', bg: '#FBF8F3', ink: '#17171C', muted: '#5D6275', accent: '#7C5CFA', accent2: '#FFB44D', panel: '#F1ECFF', font: INTER, headingFont: INTER, headingWeight: 700, radius: 1.6, deco: 'blobs' },
  { id: 'forest', name: 'Forest', audience: 'Any', bg: '#F2F8F1', ink: '#16311F', muted: '#4C6B55', accent: '#2F9E44', accent2: '#F08C00', panel: '#E3F2E1', font: INTER, headingFont: INTER, headingWeight: 750, radius: 1.6, deco: 'blobs' },
  {
    id: 'midnight',
    name: 'Midnight',
    audience: 'Grades 8–12',
    bg: 'linear-gradient(135deg, #10132B 0%, #1E2350 100%)',
    ink: '#F4F5FF',
    muted: '#A8AED6',
    accent: '#8C7CFF',
    accent2: '#4FD1C5',
    panel: 'rgba(255,255,255,0.07)',
    font: INTER,
    headingFont: INTER,
    headingWeight: 700,
    radius: 1.4,
    deco: 'stars',
  },
  {
    id: 'chalk',
    name: 'Chalkboard',
    audience: 'Any',
    bg: '#233B34',
    ink: '#F4F1E8',
    muted: '#BFD1C7',
    accent: '#FFD166',
    accent2: '#FF8FAB',
    panel: 'rgba(255,255,255,0.08)',
    font: NUNITO,
    headingFont: NUNITO,
    headingWeight: 800,
    radius: 1.6,
    deco: 'blobs',
  },
];

export const themeById = (id?: string) => DECK_THEMES.find((t) => t.id === id) ?? DECK_THEMES.find((t) => t.id === 'clarity')!;
/** The deck style that suits a grade (also chosen by the AI). */
export const themeForGrade = (g?: number) => (!g ? 'clarity' : g <= 3 ? 'playful' : g <= 7 ? 'ocean' : 'pro');

export const LAYOUTS: { id: Slide['layout']; name: string }[] = [
  { id: 'title', name: 'Title' },
  { id: 'section', name: 'Section' },
  { id: 'bullets', name: 'Points' },
  { id: 'image-right', name: 'Points + picture' },
  { id: 'icons', name: 'Ideas with pictures' },
  { id: 'steps', name: 'Steps' },
  { id: 'fact', name: 'Big fact' },
  { id: 'quiz', name: 'Quick quiz' },
  { id: 'two-column', name: 'Compare' },
  { id: 'image-full', name: 'Big picture' },
  { id: 'quote', name: 'Big question' },
];

/** How many reveal steps a slide has in the player (points appear one at a time). */
export function buildSteps(s: Slide) {
  const n = (s.bullets ?? []).filter((x) => x.trim()).length;
  if (s.layout === 'quiz') return n ? 1 : 0; // the answer is revealed
  if (['bullets', 'image-right', 'icons', 'steps'].includes(s.layout)) return n;
  if (s.layout === 'two-column') return 2;
  return 0;
}

/** **bold** in slide text (older AI decks used it) shows as bold instead of asterisks. */
function Rich({ text }: { text?: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\*\*[^*]+\*\*$/.test(p) ? (
          <Box component="b" key={i} sx={{ fontWeight: 800 }}>
            {p.slice(2, -2)}
          </Box>
        ) : (
          p.replace(/(^|\s)\*([^*\s][^*]*)\*/g, '$1$2')
        ),
      )}
    </>
  );
}

const ANIM = {
  '@keyframes svRise': { from: { opacity: 0, transform: 'translateY(2.4cqw)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes svPop': { from: { opacity: 0, transform: 'scale(.6) rotate(-8deg)' }, '70%': { opacity: 1, transform: 'scale(1.06) rotate(2deg)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes svZoom': { from: { transform: 'scale(1.08)' }, to: { transform: 'scale(1)' } },
  '@keyframes svFloat': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-1.2cqw)' } },
};

export function SlideView({ slide, theme, index, total, sx, step, animate, reveal }: { slide: Slide; theme?: string; index?: number; total?: number; sx?: object; step?: number; animate?: boolean; reveal?: boolean }) {
  const t = themeById(theme);
  const k = t.scale ?? 1;
  const r = `${t.radius ?? 1.6}cqw`;
  const s = slide;
  const fz = (n: number) => `${n * k}cqw`;
  const h = (size: number, extra: object = {}) => ({
    fontFamily: t.headingFont,
    fontWeight: t.headingWeight,
    fontSize: fz(size),
    lineHeight: 1.12,
    color: t.ink,
    m: 0,
    letterSpacing: t.headingWeight >= 900 ? '-0.005em' : '-0.015em',
    overflowWrap: 'anywhere' as const,
    ...extra,
  });
  const enter = (delay = 0, kind: 'svRise' | 'svPop' = 'svRise') => (animate ? { animation: `${kind} ${kind === 'svPop' ? 0.75 : 0.55}s cubic-bezier(.2,.8,.3,1) ${delay}s both` } : {});
  // Points appear one by one in the player
  const shown = (i: number) => step == null || i < step;
  const build = (i: number) => ({ transition: 'opacity .45s ease, transform .45s cubic-bezier(.2,.8,.3,1)', opacity: shown(i) ? 1 : 0, transform: shown(i) ? 'none' : 'translateY(1.6cqw)' });
  const points = (s.bullets ?? []).filter((x) => x.trim());
  const art = (size: string, seed = 0, delay = 0.15) =>
    s.imageUrl ? null : (
      <Box sx={{ width: size, ...enter(delay, 'svPop') }}>
        <Box sx={{ ...(animate ? { animation: 'svFloat 5s ease-in-out 1s infinite' } : {}) }}>
          <Graphic k={s.icon} t={t} seed={seed + (index ?? 0)} />
        </Box>
      </Box>
    );
  const Picture = ({ cover }: { cover?: boolean }) =>
    s.imageUrl ? (
      <Box
        component="img"
        src={s.imageUrl}
        alt={s.imageAlt ?? ''}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: cover ? 0 : r, boxShadow: cover ? 'none' : '0 1cqw 3cqw rgba(20,20,60,0.18)', ...enter(0.15) }}
      />
    ) : (
      <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>{art('82%', 1)}</Box>
    );
  const Bullets = ({ items, size = 2.35, offset = 0 }: { items?: string[]; size?: number; offset?: number }) => {
    const list = (items ?? []).filter((x) => x.trim());
    if (!list.length) return null;
    return (
      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: `${1.5 * k}cqw` }}>
        {list.map((b, i) => (
          <Box component="li" key={i} sx={{ display: 'flex', gap: '1.5cqw', alignItems: 'flex-start', fontSize: fz(size), lineHeight: 1.38, color: t.ink, ...build(i + offset) }}>
            {t.deco === 'confetti' ? (
              <Box
                sx={{
                  width: `${1.9 * k}cqw`,
                  height: `${1.9 * k}cqw`,
                  borderRadius: '30%',
                  bgcolor: i % 2 ? t.accent2 : t.accent,
                  color: '#fff',
                  fontSize: fz(1.2),
                  fontWeight: 900,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  mt: `${size * 0.22}cqw`,
                }}
              >
                {i + 1}
              </Box>
            ) : (
              <Box sx={{ width: '1.1cqw', height: '1.1cqw', borderRadius: t.deco === 'lines' ? '0.2cqw' : '50%', bgcolor: i % 2 ? t.accent2 : t.accent, flexShrink: 0, mt: `${size * k * 0.45}cqw` }} />
            )}
            <span>
              <Rich text={b} />
            </span>
          </Box>
        ))}
      </Box>
    );
  };
  const Title = ({ size = 4, children, center }: { size?: number; children?: ReactNode; center?: boolean }) => (
    <Box component="h2" sx={h(size, { mb: '2.6cqw', textAlign: center ? 'center' : 'left', ...enter(0) })}>
      {children ?? <Rich text={s.title || 'Title'} />}
      {t.deco === 'lines' && !center && <Box sx={{ width: '6cqw', height: '0.45cqw', bgcolor: t.accent, mt: '1.4cqw' }} />}
    </Box>
  );

  let content: ReactNode;
  switch (s.layout) {
    case 'title':
      // With a real picture: the picture fills the right side edge to edge (magazine style)
      if (s.imageUrl) {
        content = (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
            <Box sx={{ p: '6cqw', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ width: '9cqw', height: '0.9cqw', borderRadius: 9, bgcolor: t.accent, mb: '2.4cqw', ...enter(0) }} />
              <Box component="h1" sx={h(5, enter(0.05))}>
                <Rich text={s.title || 'Title'} />
              </Box>
              {s.subtitle && <Box sx={{ fontSize: fz(2.3), color: t.muted, mt: '1.8cqw', ...enter(0.2) }}>{s.subtitle}</Box>}
            </Box>
            <Box sx={{ position: 'relative', overflow: 'hidden', clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}>
              <Box component="img" src={s.imageUrl} alt={s.imageAlt ?? ''} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...(animate ? { animation: 'svZoom 8s ease-out both' } : {}) }} />
            </Box>
          </Box>
        );
        break;
      }
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '7cqw', display: 'grid', gridTemplateColumns: s.icon || s.imageUrl ? '1.35fr 1fr' : '1fr', alignItems: 'center', gap: '3cqw' }}>
          <Box>
            <Box sx={{ width: '9cqw', height: '0.9cqw', borderRadius: 9, bgcolor: t.accent, mb: '2.4cqw', ...enter(0) }} />
            <Box component="h1" sx={h(5.6, enter(0.05))}>
              <Rich text={s.title || 'Title'} />
            </Box>
            {s.subtitle && <Box sx={{ fontSize: fz(2.4), color: t.muted, mt: '1.8cqw', maxWidth: '90%', ...enter(0.2) }}>{s.subtitle}</Box>}
          </Box>
          {s.imageUrl ? (
            <Box sx={{ height: '34cqw' }}>
              <Picture />
            </Box>
          ) : s.icon ? (
            art('92%')
          ) : null}
        </Box>
      );
      break;
    case 'section':
      content = (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            p: '7cqw',
            background: `radial-gradient(circle at 50% 120%, ${t.accent}33 0%, transparent 60%)`,
          }}
        >
          {s.icon && <Box sx={{ mb: '2cqw' }}>{art('15cqw')}</Box>}
          <Box component="h2" sx={h(5, enter(0.05))}>
            <Rich text={s.title || 'Section'} />
          </Box>
          {s.subtitle && <Box sx={{ fontSize: fz(2.3), color: t.muted, mt: '1.6cqw', ...enter(0.2) }}>{s.subtitle}</Box>}
        </Box>
      );
      break;
    case 'quote':
      content = (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: '9cqw' }}>
          <Box sx={{ fontFamily: 'Georgia, serif', fontSize: '14cqw', lineHeight: 0.6, color: t.accent, opacity: 0.5, mb: '1cqw', ...enter(0, 'svPop') }}>“</Box>
          <Box sx={h(3.8, { fontWeight: Math.min(t.headingWeight, 800), ...enter(0.1) })}>
            <Rich text={s.title || 'A big question'} />
          </Box>
          {s.subtitle && <Box sx={{ fontSize: fz(2.1), color: t.accent, mt: '2.2cqw', fontWeight: 700, ...enter(0.3) }}>{s.subtitle}</Box>}
        </Box>
      );
      break;
    case 'image-full':
      content = (
        <Box sx={{ position: 'absolute', inset: 0, background: s.imageUrl ? undefined : `linear-gradient(135deg, ${t.accent}22, ${t.accent2}33)` }}>
          {s.imageUrl ? <Picture cover /> : <Box sx={{ position: 'absolute', inset: '6cqw 30cqw 14cqw' }}>{art('100%')}</Box>}
          {(s.title || s.subtitle) && (
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: '3cqw 5cqw', background: s.imageUrl ? 'linear-gradient(0deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 100%)' : 'none', ...enter(0.2) }}>
              {s.title && (
                <Box sx={h(3.4, { color: s.imageUrl ? '#fff' : t.ink, textAlign: s.imageUrl ? 'left' : 'center' })}>
                  <Rich text={s.title} />
                </Box>
              )}
              {s.subtitle && <Box sx={{ fontSize: fz(1.9), color: s.imageUrl ? 'rgba(255,255,255,0.85)' : t.muted, mt: '0.6cqw', textAlign: s.imageUrl ? 'left' : 'center' }}>{s.subtitle}</Box>}
            </Box>
          )}
        </Box>
      );
      break;
    case 'image-right':
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '5.5cqw 6cqw', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4cqw', alignItems: 'center' }}>
          <Box>
            <Title size={3.8} />
            {s.subtitle && <Box sx={{ fontSize: fz(2), color: t.muted, mb: '2cqw', mt: '-1.2cqw' }}>{s.subtitle}</Box>}
            <Bullets items={s.bullets} size={2.2} />
          </Box>
          <Box sx={{ height: '38cqw' }}>
            <Picture />
          </Box>
        </Box>
      );
      break;
    case 'icons': {
      const cols = points.length <= 3 ? points.length || 1 : points.length === 4 ? 2 : 3;
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '5cqw 6cqw', display: 'flex', flexDirection: 'column' }}>
          <Title size={3.8} />
          <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2.4cqw', alignContent: 'center' }}>
            {points.map((b, i) => (
              <Box
                key={i}
                sx={{
                  bgcolor: t.panel,
                  borderRadius: r,
                  p: '2.4cqw',
                  display: 'flex',
                  flexDirection: cols >= 3 ? 'column' : 'row',
                  alignItems: cols >= 3 ? 'flex-start' : 'center',
                  gap: '2cqw',
                  boxShadow: t.panel === '#FFFFFF' || t.panel === '#F3F6FB' ? '0 0.4cqw 1.6cqw rgba(20,20,60,0.08)' : 'none',
                  ...build(i),
                }}
              >
                <IconBadge k={s.icons?.[i]} t={t} i={i} size={cols >= 3 ? '7.5cqw' : '6.5cqw'} />
                <Box sx={{ fontSize: fz(cols >= 3 ? 2.15 : 2.3), fontWeight: 650, lineHeight: 1.32, color: t.ink }}>
                  <Rich text={b} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
      break;
    }
    case 'steps':
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '5cqw 5cqw', display: 'flex', flexDirection: 'column' }}>
          <Title size={3.8} />
          <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, points.length)}, 1fr)`, gap: '1.2cqw', alignItems: 'start', alignContent: 'center' }}>
            {points.map((b, i) => (
              <Box key={i} sx={{ position: 'relative', textAlign: 'center', px: '0.8cqw', ...build(i) }}>
                {i < points.length - 1 && <Box sx={{ position: 'absolute', top: '4.6cqw', left: 'calc(50% + 5.4cqw)', right: 'calc(-50% + 5.4cqw)', borderTop: `0.35cqw dashed ${t.muted}`, opacity: 0.5 }} />}
                <Box sx={{ position: 'relative', width: '9.2cqw', height: '9.2cqw', mx: 'auto', mb: '1.6cqw' }}>
                  <IconBadge k={s.icons?.[i]} t={t} i={i} size="9.2cqw" />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '-1cqw',
                      right: '-1cqw',
                      width: '3.6cqw',
                      height: '3.6cqw',
                      borderRadius: '50%',
                      bgcolor: t.ink,
                      color: t.panel === 'rgba(255,255,255,0.07)' || t.panel === 'rgba(255,255,255,0.08)' ? '#111' : '#fff',
                      fontSize: '1.7cqw',
                      fontWeight: 900,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {i + 1}
                  </Box>
                </Box>
                <Box sx={{ fontSize: fz(points.length >= 5 ? 1.75 : 2), fontWeight: 650, lineHeight: 1.3, color: t.ink }}>
                  <Rich text={b} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
      break;
    case 'fact':
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '6cqw 7cqw', display: 'grid', gridTemplateColumns: s.icon || s.imageUrl ? '1.5fr 1fr' : '1fr', alignItems: 'center', gap: '3cqw' }}>
          <Box>
            <Box sx={{ fontSize: fz(1.7), fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.accent, mb: '1.2cqw', ...enter(0) }}>Did you know?</Box>
            <Box sx={{ ...h(7.5, { lineHeight: 1 }), background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', ...enter(0.08, 'svPop') }}>
              <Rich text={s.title || '100%'} />
            </Box>
            {s.subtitle && <Box sx={{ fontSize: fz(2.5), color: t.ink, mt: '2cqw', lineHeight: 1.35, maxWidth: '95%', ...enter(0.3) }}>{s.subtitle}</Box>}
          </Box>
          {s.imageUrl ? (
            <Box sx={{ height: '32cqw' }}>
              <Picture />
            </Box>
          ) : s.icon ? (
            art('88%')
          ) : null}
        </Box>
      );
      break;
    case 'quiz': {
      const show = step != null ? step >= 1 : (reveal ?? true);
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '5cqw 6cqw', display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: '0.8cqw',
              px: '1.6cqw',
              py: '0.6cqw',
              borderRadius: 99,
              bgcolor: t.accent,
              color: '#fff',
              fontSize: fz(1.5),
              fontWeight: 800,
              mb: '2cqw',
              ...enter(0, 'svPop'),
            }}
          >
            ? Quick quiz
          </Box>
          <Box component="h2" sx={h(3.6, { mb: '3cqw', ...enter(0.05) })}>
            <Rich text={s.title || 'Question'} />
          </Box>
          <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: points.length > 2 ? '1fr 1fr' : '1fr', gap: '1.8cqw', alignContent: 'center', pb: '3cqw' }}>
            {points.map((o, i) => {
              const right = i === (s.answer ?? 0);
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.6cqw',
                    p: '1.6cqw 2cqw',
                    borderRadius: r,
                    bgcolor: show && right ? '#E7F8EE' : t.panel,
                    border: `0.3cqw solid ${show && right ? '#22A55B' : 'transparent'}`,
                    opacity: show && !right ? 0.45 : 1,
                    transition: 'all .4s ease',
                    boxShadow: t.panel === '#FFFFFF' || t.panel === '#F3F6FB' ? '0 0.4cqw 1.4cqw rgba(20,20,60,0.08)' : 'none',
                    ...enter(0.15 + i * 0.08),
                  }}
                >
                  <Box
                    sx={{
                      width: '4.4cqw',
                      height: '4.4cqw',
                      borderRadius: '30%',
                      bgcolor: show && right ? '#22A55B' : i % 2 ? t.accent2 : t.accent,
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: fz(2),
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {show && right ? '✓' : 'ABCD'[i]}
                  </Box>
                  <Box sx={{ fontSize: fz(2.2), fontWeight: 650, color: show && right ? '#13532F' : t.ink }}>
                    <Rich text={o} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      );
      break;
    }
    case 'two-column': {
      const [l1, l2] = (s.subtitle ?? '').split('|').map((x) => x.trim());
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '5.5cqw 6cqw', display: 'flex', flexDirection: 'column' }}>
          <Title size={3.8} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3cqw', flex: 1, alignContent: 'center', pb: '2cqw' }}>
            {[s.bullets, s.bullets2].map((col, i) => (
              <Box key={i} sx={{ bgcolor: t.panel, borderRadius: r, p: '2.6cqw', borderTop: `0.7cqw solid ${i ? t.accent2 : t.accent}`, ...build(i) }}>
                {(i ? l2 : l1) && <Box sx={{ fontWeight: 800, fontSize: fz(2.1), color: i ? t.accent2 : t.accent, mb: '1.6cqw' }}>{i ? l2 : l1}</Box>}
                <Bullets items={col} size={2.05} offset={-99} />
              </Box>
            ))}
          </Box>
        </Box>
      );
      break;
    }
    default:
      content = (
        <Box sx={{ position: 'absolute', inset: 0, p: '5.5cqw 7cqw', display: 'grid', gridTemplateColumns: s.icon ? '1fr 22cqw' : '1fr', gap: '3cqw' }}>
          <Box>
            <Title />
            {s.subtitle && <Box sx={{ fontSize: fz(2.1), color: t.muted, mb: '2.4cqw', mt: '-1.8cqw' }}>{s.subtitle}</Box>}
            <Bullets items={s.bullets} size={2.45} />
          </Box>
          {s.icon && <Box sx={{ alignSelf: 'center' }}>{art('100%')}</Box>}
        </Box>
      );
  }

  // Theme decoration behind the content
  const deco =
    s.layout === 'image-full' && s.imageUrl ? null : t.deco === 'confetti' ? (
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[
          [1.6, 3, t.accent, '50%'],
          [96, 4, t.accent2, '30%'],
          [96.5, 84, '#22C3A6', '50%'],
          [2, 90, '#FFC928', '30%'],
          [78, 92, '#FF6FA0', '50%'],
        ].map(([x, y, c, br], i) => (
          <Box key={i} sx={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: '1.8cqw', height: '1.8cqw', borderRadius: br as string, bgcolor: c as string, opacity: 0.7, transform: `rotate(${i * 25}deg)` }} />
        ))}
        <Box component="svg" viewBox="0 0 100 10" preserveAspectRatio="none" sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '5cqw' }}>
          <path d="M0 6 Q12 0 25 5 T50 5 T75 5 T100 4 L100 10 L0 10Z" fill={t.accent} opacity="0.12" />
        </Box>
      </Box>
    ) : t.deco === 'lines' ? (
      <Box aria-hidden sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '0.8cqw', background: `linear-gradient(180deg, ${t.accent}, ${t.accent2})` }} />
    ) : t.deco === 'stars' ? (
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(0.25cqw 0.25cqw at 12% 18%, #fff8 99%, transparent), radial-gradient(0.2cqw 0.2cqw at 78% 12%, #fff6 99%, transparent), radial-gradient(0.3cqw 0.3cqw at 88% 70%, #fff6 99%, transparent), radial-gradient(0.2cqw 0.2cqw at 30% 85%, #fff5 99%, transparent)',
        }}
      />
    ) : s.layout === 'title' ? (
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Box sx={{ position: 'absolute', right: '-6cqw', bottom: '-9cqw', width: '34cqw', height: '34cqw', borderRadius: '50%', bgcolor: t.accent, opacity: 0.1 }} />
        <Box sx={{ position: 'absolute', right: '12cqw', top: '-8cqw', width: '18cqw', height: '18cqw', borderRadius: '50%', bgcolor: t.accent, opacity: 0.07 }} />
      </Box>
    ) : null;

  return (
    <Box sx={{ containerType: 'inline-size', width: '100%', ...sx }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          background: s.background || t.bg,
          color: t.ink,
          fontFamily: t.font,
          userSelect: 'none',
          ...ANIM,
          '@media (prefers-reduced-motion: reduce)': { '& *': { animation: 'none !important', transition: 'none !important' } },
        }}
      >
        {deco}
        {content}
        {index != null && total != null && s.layout !== 'image-full' && (
          <Box sx={{ position: 'absolute', right: '2.4cqw', bottom: '1.8cqw', fontSize: '1.2cqw', color: t.muted, fontWeight: 600 }}>
            {index + 1} / {total}
          </Box>
        )}
      </Box>
    </Box>
  );
}
