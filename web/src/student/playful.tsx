/**
 * Playful building blocks for the student pages (all grades): page titles with an emoji,
 * pill tabs, sticker labels and "chunky" cards that lift when you hover them.
 * Everything takes its colours from the grade's look, so each grade keeps its own personality.
 */
import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { shade, tint, type Look } from './looks';

export function PageTitle({ look, emoji, title, subtitle, action }: { look: Look; emoji: string; title: string; subtitle?: string; action?: ReactNode }) {
  const little = look.band === 'little';
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5, alignItems: { sm: 'center' } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
        <Box sx={{ width: little ? 60 : 52, height: little ? 60 : 52, borderRadius: '16px', bgcolor: '#fff', boxShadow: `0 4px 0 ${tint(look.primary, 0.25)}`, border: `2px solid ${tint(look.primary, 0.2)}`, display: 'grid', placeItems: 'center', fontSize: little ? 32 : 28, transform: 'rotate(-5deg)', flexShrink: 0 }}>
          {emoji}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: { xs: 26, md: little ? 34 : 30 }, fontWeight: look.headingWeight, color: look.ink, lineHeight: 1.15 }}>
            {title}
          </Typography>
          {subtitle && <Typography sx={{ color: look.ink2, fontWeight: 600 }}>{subtitle}</Typography>}
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

export function PillTabs<T extends string>({ look, value, onChange, tabs }: { look: Look; value: T; onChange: (v: T) => void; tabs: { value: T; label: string; n?: number; emoji?: string }[] }) {
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Box
            key={t.value}
            component="button"
            onClick={() => onChange(t.value)}
            aria-pressed={on}
            sx={{
              cursor: 'pointer',
              font: 'inherit',
              fontWeight: 800,
              fontSize: 14.5,
              px: 2,
              py: 0.9,
              borderRadius: 999,
              border: `2px solid ${on ? look.primary : look.line}`,
              bgcolor: on ? look.primary : '#fff',
              color: on ? '#fff' : look.ink,
              boxShadow: on ? `0 3px 0 ${shade(look.primary)}` : `0 3px 0 ${look.line}`,
              display: 'flex',
              gap: 0.75,
              alignItems: 'center',
              transition: 'transform .12s',
              '&:active': { transform: 'translateY(2px)' },
            }}
          >
            {t.emoji && <span>{t.emoji}</span>}
            {t.label}
            {t.n != null && (
              <Box component="span" sx={{ minWidth: 22, px: 0.75, borderRadius: 999, fontSize: 12.5, bgcolor: on ? 'rgba(255,255,255,0.25)' : tint(look.primary, 0.1), color: on ? '#fff' : look.primary }}>
                {t.n}
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

/** A tilted sticker, e.g. "NEW!" or "⭐ 100%". */
export function Sticker({ color, children, tilt = 6 }: { color: string; children: ReactNode; tilt?: number }) {
  return (
    <Box sx={{ px: 1.25, py: 0.35, borderRadius: '10px', bgcolor: color, color: '#fff', fontWeight: 900, fontSize: 12.5, letterSpacing: 0.3, transform: `rotate(${tilt}deg)`, boxShadow: `0 2px 0 ${shade(color)}`, whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

/** A small rounded fact, e.g. "❓ 6 questions". */
export function Fact({ look, children }: { look: Look; children: ReactNode }) {
  return <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: look.soft, color: look.ink, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{children}</Box>;
}

/** Chunky card that lifts on hover. `color` tints the border and the "3D" bottom edge. */
export function PlayCard({ look, color, to, children, dim }: { look: Look; color: string; to?: string; children: ReactNode; dim?: boolean }) {
  return (
    <Box
      component={to ? RouterLink : 'div'}
      to={to}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 2.25,
        borderRadius: `${look.radius}px`,
        bgcolor: '#fff',
        border: `2px solid ${tint(color, 0.28)}`,
        boxShadow: `0 5px 0 ${tint(color, 0.22)}`,
        textDecoration: 'none',
        color: 'inherit',
        opacity: dim ? 0.75 : 1,
        transition: 'transform .15s, box-shadow .15s',
        position: 'relative',
        '&:hover': to ? { transform: 'translateY(-3px)', boxShadow: `0 8px 0 ${tint(color, 0.26)}` } : undefined,
      }}
    >
      {children}
    </Box>
  );
}

/** The big chunky call-to-action inside a card. */
export function CardButton({ color, children }: { color: string; children: ReactNode }) {
  return <Box sx={{ alignSelf: 'flex-start', px: 2, py: 0.9, borderRadius: 999, bgcolor: color, color: '#fff', fontWeight: 900, fontSize: 14.5, boxShadow: `0 3px 0 ${shade(color)}` }}>{children}</Box>;
}

export function EmptyPlay({ look, emoji, title, text }: { look: Look; emoji: string; title: string; text: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2, borderRadius: `${look.radius}px`, border: `2px dashed ${tint(look.primary, 0.3)}`, bgcolor: 'rgba(255,255,255,0.8)' }}>
      <Box sx={{ fontSize: 48, mb: 1 }}>{emoji}</Box>
      <Typography sx={{ fontWeight: 900, fontSize: 19, color: look.ink }}>{title}</Typography>
      <Typography sx={{ color: look.ink2, maxWidth: 420, mx: 'auto', fontWeight: 600 }}>{text}</Typography>
    </Box>
  );
}
