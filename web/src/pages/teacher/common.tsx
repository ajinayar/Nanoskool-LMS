import { Box, Button, MenuItem, Stack, Tab, Tabs, TextField } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import type { ClassSection } from '@/api/types';
import { useGet } from '@/lib/hooks';

export const T = '/teacher';

/** slotProps for a select whose '' option has a visible label ("All classes"). */
export const SHOW_EMPTY = { select: { displayEmpty: true }, inputLabel: { shrink: true } } as const;

/** Classes the signed-in teacher teaches (class teacher or through a course). */
export const useMyClasses = () => useGet<ClassSection[]>('/classes');

/** Local calendar date as YYYY-MM-DD. */
export const localToday = () => dayjs().format('YYYY-MM-DD');

/** ISO date to the value a datetime-local input expects, in local time. */
export const toLocalInput = (iso?: string | null) => (iso ? dayjs(iso).format('YYYY-MM-DDTHH:mm') : '');

export function BackButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button component={RouterLink} to={to} startIcon={<ArrowBack />} size="small" sx={{ mb: 1, ml: -1 }}>
      {children}
    </Button>
  );
}

export function ClassSelect({
  value,
  onChange,
  label = 'Class',
  allowAll,
  required,
  sx,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  allowAll?: string;
  required?: boolean;
  sx?: object;
}) {
  const classes = useMyClasses();
  return (
    <TextField select label={label} value={classes.data ? value : ''} onChange={(e) => onChange(e.target.value)} required={required} sx={sx} disabled={classes.isLoading} slotProps={allowAll ? SHOW_EMPTY : undefined}>
      {allowAll && <MenuItem value="">{allowAll}</MenuItem>}
      {(classes.data ?? []).map((c) => (
        <MenuItem key={c._id} value={c._id}>
          {c.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Tabs whose selection lives in the URL (?tab=) so reloads and back links keep it. */
export function useTab<T extends string>(tabs: readonly T[], fallback: T): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as T | null;
  const tab = raw && tabs.includes(raw) ? raw : fallback;
  const set = (t: T) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };
  return [tab, set];
}

export function UrlTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <Tabs value={value} onChange={(_, v) => onChange(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
      {tabs.map((t) => (
        <Tab key={t.value} value={t.value} label={t.label} />
      ))}
    </Tabs>
  );
}

export const KIND_LABEL: Record<string, string> = { homework: 'Homework', project: 'Project', activity: 'Activity' };

/** Row of filter controls that wraps on small screens. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, mb: 2, '& > *': { minWidth: 150, flex: { xs: '1 1 150px', sm: '0 0 auto' } } }}>{children}</Stack>;
}

/** Gives a table a minimum width so it scrolls sideways on phones instead of squashing columns. */
export function WideTable({ min = 720, children }: { min?: number; children: ReactNode }) {
  return <Box sx={{ '& table': { minWidth: min } }}>{children}</Box>;
}
