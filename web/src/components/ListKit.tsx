/**
 * Small building blocks for the colourful list pages (teacher and parent portals):
 * summary tiles, a filter toolbar, segmented filters, row menus, status dots and progress meters.
 * One visual system so Events, Announcements, Quizzes and Assignments look like siblings.
 */
import { Box, ButtonBase, IconButton, LinearProgress, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';

export const TONE = {
  indigo: '#3F3DBF',
  teal: '#0A8F9E',
  green: '#1E9A55',
  orange: '#E07A1F',
  pink: '#C2417B',
  violet: '#6C4CF1',
  red: '#D14343',
  grey: '#6B6F86',
} as const;
export type Tone = keyof typeof TONE;
const tc = (t: Tone | string) => (t in TONE ? TONE[t as Tone] : t);

/** A rounded, tinted square holding an icon. */
export function IconTile({ tone, children, size = 40 }: { tone: Tone | string; children: ReactNode; size?: number }) {
  const c = tc(tone);
  return <Box sx={{ width: size, height: size, borderRadius: `${Math.round(size * 0.3)}px`, flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: alpha(c, 0.12), color: c, '& svg': { fontSize: Math.round(size * 0.52) } }}>{children}</Box>;
}

/** Row of compact summary tiles. */
export function MiniStats({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gap: 1.5, mb: 2.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>{children}</Box>;
}

export function MiniStat({ label, value, hint, tone, icon, active, onClick }: { label: string; value: ReactNode; hint?: string; tone: Tone; icon: ReactNode; active?: boolean; onClick?: () => void }) {
  const c = TONE[tone];
  const inner = (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 1.5 }, width: '100%', minWidth: 0 }}>
      <IconTile tone={tone} size={42}>
        {icon}
      </IconTile>
      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'text.primary' }}>{value}</Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 650, color: 'text.secondary', lineHeight: 1.3 }}>
          {label}
        </Typography>
        {hint && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Stack>
  );
  const sx = { p: 1.75, borderRadius: '16px', bgcolor: active ? alpha(c, 0.07) : '#fff', border: `1px solid ${active ? alpha(c, 0.45) : '#E6E7F1'}`, boxShadow: '0 1px 2px rgba(20,20,50,0.04)', transition: 'border-color .15s, background-color .15s' };
  return onClick ? (
    <ButtonBase onClick={onClick} aria-pressed={!!active} sx={{ ...sx, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'flex-start', '&:hover': { borderColor: alpha(c, 0.45) } }}>
      {inner}
    </ButtonBase>
  ) : (
    <Box sx={sx}>{inner}</Box>
  );
}

/** Filters on the left, a short note (e.g. "3 shown") on the right. Selects get a sensible width. */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2, '& .MuiFormControl-root': { width: { xs: '100%', sm: 210 }, minWidth: 0, flex: { xs: '1 1 100%', sm: '0 0 auto' } } }}>
      {children}
      {right && <Box sx={{ ml: 'auto', color: 'text.secondary', fontSize: 13.5, fontWeight: 600 }}>{right}</Box>}
    </Stack>
  );
}

export type SegOption<T extends string> = { value: T; label: string; count?: number };

/** Pill-style single choice filter. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <Stack role="radiogroup" aria-label={label} direction="row" sx={{ p: 0.5, gap: 0.5, borderRadius: '12px', bgcolor: '#F1F2F8', flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <ButtonBase
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: '9px',
              fontSize: 14,
              fontWeight: on ? 750 : 600,
              color: on ? 'text.primary' : 'text.secondary',
              bgcolor: on ? '#fff' : 'transparent',
              boxShadow: on ? '0 1px 3px rgba(20,20,50,0.12)' : 'none',
              gap: 0.75,
            }}
          >
            {o.label}
            {o.count != null && (
              <Box
                component="span"
                sx={{ minWidth: 20, px: 0.6, borderRadius: '6px', fontSize: 12, fontWeight: 700, lineHeight: '18px', textAlign: 'center', bgcolor: on ? alpha(TONE.indigo, 0.12) : 'rgba(0,0,0,0.06)', color: on ? TONE.indigo : 'text.secondary' }}
              >
                {o.count}
              </Box>
            )}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

export type RowAction = { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean };

/** "…" button with the row's actions, so destructive buttons don't shout on every row. */
export function RowMenu({ actions, label = 'More actions' }: { actions: RowAction[]; label?: string }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  if (!actions.length) return null;
  return (
    <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex' }}>
      <Tooltip title={label}>
        <IconButton size="small" aria-label={label} onClick={(e) => setEl(e.currentTarget)} sx={{ color: 'text.secondary' }}>
          <MoreHoriz fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={el}
        open={!!el}
        onClose={() => setEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 170, borderRadius: '12px' } } }}
      >
        {actions.map((a) => (
          <MenuItem
            key={a.label}
            onClick={() => {
              setEl(null);
              a.onClick();
            }}
            sx={a.danger ? { color: 'error.main' } : undefined}
          >
            {a.icon && <ListItemIcon sx={{ color: a.danger ? 'error.main' : undefined, '& svg': { fontSize: 19 } }}>{a.icon}</ListItemIcon>}
            <ListItemText>{a.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

const STATUS: Record<string, [Tone, string]> = {
  published: ['green', 'Published'],
  draft: ['grey', 'Draft'],
  closed: ['violet', 'Closed'],
};

/** Quiet status: coloured dot + word. */
export function StatusDot({ status }: { status: string }) {
  const [tone, text] = STATUS[status] ?? ['grey', status];
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TONE[tone], boxShadow: `0 0 0 3px ${alpha(TONE[tone], 0.15)}` }} />
      <Typography variant="body2" sx={{ fontWeight: 650 }}>
        {text}
      </Typography>
    </Stack>
  );
}

/** "In 2 days" / "Tomorrow" / "3 days ago" with a tone that says how urgent it is. */
export function relative(date?: string | null, opts: { pastWord?: string } = {}): { text: string; tone: Tone; sub: string } | null {
  if (!date) return null;
  const d = dayjs(date);
  const now = dayjs();
  const days = d.startOf('day').diff(now.startOf('day'), 'day');
  const sub = d.format(d.year() === now.year() ? 'ddd D MMM, h:mm A' : 'D MMM YYYY, h:mm A');
  if (d.isBefore(now)) {
    const ago = days === 0 ? 'Earlier today' : days === -1 ? 'Yesterday' : `${-days} days ago`;
    return { text: opts.pastWord ? `${opts.pastWord} ${ago.toLowerCase()}` : ago, tone: 'red', sub };
  }
  if (days === 0) return { text: `Today, ${d.format('h:mm A')}`, tone: 'orange', sub };
  if (days === 1) return { text: 'Tomorrow', tone: 'orange', sub };
  if (days < 7) return { text: `In ${days} days`, tone: days <= 3 ? 'orange' : 'teal', sub };
  return { text: d.format('D MMM'), tone: 'grey', sub };
}

export function WhenCell({ date, empty = 'No date', pastWord }: { date?: string | null; empty?: string; pastWord?: string }) {
  const r = relative(date, { pastWord });
  if (!r)
    return (
      <Typography variant="body2" color="text.secondary">
        {empty}
      </Typography>
    );
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: r.tone === 'grey' ? 'text.primary' : TONE[r.tone] }}>
        {r.text}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {r.sub}
      </Typography>
    </Box>
  );
}

/** A thin bar with a label, e.g. graded out of submitted. */
export function Meter({ value, max, tone = 'indigo', label, sub }: { value: number; max: number; tone?: Tone; label: ReactNode; sub?: ReactNode }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <Box sx={{ minWidth: 140 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5, gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ fontWeight: 700, color: TONE[tone], whiteSpace: 'nowrap' }}>
            {sub}
          </Typography>
        )}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        aria-label={typeof label === 'string' ? label : undefined}
        sx={{ height: 6, borderRadius: 3, bgcolor: alpha(TONE[tone], 0.12), '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: TONE[tone] } }}
      />
    </Box>
  );
}

/** Small uppercase heading inside a list, e.g. "This week". */
export function GroupLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2.5, mb: 1, '&:first-of-type': { mt: 0 } }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{children}</Typography>
      {count != null && <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.disabled' }}>{count}</Typography>}
      <Box sx={{ flex: 1, height: '1px', bgcolor: '#ECEDF4' }} />
    </Stack>
  );
}
