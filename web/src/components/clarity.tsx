/** Building blocks for "Clarity" look pages (pastel stat tiles, pill toggles, tags, boards). */
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { CLARITY, tagColor } from '@/theme-clarity';

export function ClarityStat({ label, value, delta, icon, color }: { label: string; value: ReactNode; delta?: ReactNode; icon: ReactNode; color: string }) {
  return (
    <Box sx={{ bgcolor: color, borderRadius: '22px', p: { xs: 2, md: 2.5 }, minHeight: { xs: 0, md: 150 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: CLARITY.ink, color: '#fff', display: 'grid', placeItems: 'center', '& svg': { fontSize: 22 } }}>{icon}</Box>
        <Typography sx={{ fontWeight: 500, fontSize: 15 }}>{label}</Typography>
      </Stack>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 500, fontSize: { xs: 32, md: 44 }, lineHeight: 1, letterSpacing: '-0.04em' }}>{value}</Typography>
        {delta && <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{delta}</Typography>}
      </Stack>
    </Box>
  );
}

export interface PillOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** Segmented pill buttons; the active one is solid black. */
export function PillToggle<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: PillOption<T>[]; ariaLabel: string }) {
  return (
    <Stack direction="row" spacing={1} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Box
            key={o.value}
            component="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.75,
              py: 0.75,
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              bgcolor: active ? CLARITY.ink : 'rgba(255,253,248,0.7)',
              color: active ? '#fff' : CLARITY.ink,
              border: `1px solid ${active ? CLARITY.ink : CLARITY.line}`,
              '& svg': { fontSize: 18 },
              '&:hover': { bgcolor: active ? CLARITY.ink : CLARITY.hover },
              '&:focus-visible': { outline: `2px solid ${CLARITY.ink}`, outlineOffset: 2 },
            }}
          >
            {o.icon}
            {o.label}
          </Box>
        );
      })}
    </Stack>
  );
}

/** Pastel tag; the colour is stable for a given label. */
export function Tag({ label, tone }: { label: string; tone?: string }) {
  const [bg, fg] = tagColor(tone ?? label);
  return <Chip size="small" label={label} sx={{ bgcolor: bg, color: fg, height: 24, fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize' }} />;
}

/** A soft pill used for dates, counts and other small facts on cards. */
export function Fact({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 999, border: `1px solid ${CLARITY.line}`, bgcolor: CLARITY.panel, fontSize: 13, fontWeight: 600, color: CLARITY.ink, '& svg': { fontSize: 16 } }}>
      {icon}
      {children}
    </Box>
  );
}

export function ClarityCard({ children, onClick, draggable, onDragStart, onDragEnd, dim }: { children: ReactNode; onClick?: () => void; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; dim?: boolean }) {
  return (
    <Box
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      sx={{
        bgcolor: CLARITY.panel,
        borderRadius: '20px',
        p: 2,
        border: `1px solid ${CLARITY.line}`,
        boxShadow: '0 1px 2px rgba(60,40,10,0.04)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dim ? 0.45 : 1,
        transition: 'box-shadow .15s, transform .15s',
        '&:hover': onClick ? { boxShadow: '0 6px 18px rgba(60,40,10,0.08)', transform: 'translateY(-1px)' } : undefined,
      }}
    >
      {children}
    </Box>
  );
}

export function BoardColumn({ title, count, children, onDrop, highlight, onDragOver, onDragLeave }: { title: string; count: number; children: ReactNode; onDrop?: (e: React.DragEvent) => void; highlight?: boolean; onDragOver?: (e: React.DragEvent) => void; onDragLeave?: () => void }) {
  return (
    <Box
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        minWidth: 290,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 1,
        borderRadius: '22px',
        bgcolor: highlight ? 'rgba(23,23,28,0.05)' : 'transparent',
        outline: highlight ? `2px dashed ${CLARITY.ink3}` : 'none',
        transition: 'background-color .15s',
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 15, px: 0.25 }}>
        {title} <Box component="span" sx={{ color: CLARITY.ink3 }}>({count})</Box>
      </Typography>
      {children}
    </Box>
  );
}

export const stripHtml = (html?: string) => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** "+20% vs last month" style delta text. */
export function deltaText(now: number, prev: number, unit = 'this month') {
  if (!prev) return now ? `+${now} ${unit}` : `none ${unit}`;
  const pct = Math.round(((now - prev) / prev) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
}
