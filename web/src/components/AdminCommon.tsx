import { useTheme } from '@mui/material/styles';
import { isClarity } from '@/theme-clarity';
/**
 * Small building blocks shared by the super admin, partner and school admin portals.
 */
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ContentCopy from '@mui/icons-material/ContentCopy';
import MoreVert from '@mui/icons-material/MoreVert';
import Search from '@mui/icons-material/Search';
import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { useToast } from './Toast';

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function SearchField({ value, onChange, placeholder = 'Search', width = 260 }: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string }) {
  return (
    <TextField
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: { xs: '100%', sm: width } }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
        },
        htmlInput: { 'aria-label': placeholder },
      }}
    />
  );
}

/** Row of filters above a list; wraps on small screens. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5, '& > *': { m: '0 !important' }, alignItems: { sm: 'center' } }}>
      {children}
    </Stack>
  );
}

export function Pager({ total, page, limit, onPage, onLimit }: { total: number; page: number; limit: number; onPage: (p: number) => void; onLimit?: (l: number) => void }) {
  if (total <= 10 && page === 1) return null;
  return (
    <TablePagination
      component="div"
      count={total}
      page={page - 1}
      rowsPerPage={limit}
      rowsPerPageOptions={onLimit ? [10, 25, 50, 100] : [limit]}
      onPageChange={(_, p) => onPage(p + 1)}
      onRowsPerPageChange={(e) => {
        onLimit?.(Number(e.target.value));
        onPage(1);
      }}
    />
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Button component={RouterLink} to={to} startIcon={<ArrowBack />} size="small" sx={{ mb: 1, ml: -1 }}>
      {label}
    </Button>
  );
}

/** Tabs whose selection is kept in the URL (?tab=), so links and refreshes keep the place. */
export function useTab<T extends string>(tabs: readonly T[], fallback: T): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as T | null;
  const tab = raw && tabs.includes(raw) ? raw : fallback;
  return [
    tab,
    (t: T) => {
      const next = new URLSearchParams(params);
      next.set('tab', t);
      setParams(next, { replace: true });
    },
  ];
}

export function TabBar<T extends string>({ value, onChange, tabs }: { value: T; onChange: (t: T) => void; tabs: { value: T; label: string }[] }) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs value={value} onChange={(_, v) => onChange(v)} variant="scrollable" allowScrollButtonsMobile>
        {tabs.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>
    </Box>
  );
}

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** "More" menu for a table row. Stops click propagation so the row link does not fire. */
export function RowMenu({ actions, label = 'Actions' }: { actions: RowAction[]; label?: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  return (
    <>
      <IconButton
        size="small"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} onClick={(e) => e.stopPropagation()}>
        {visible.map((a) => (
          <MenuItem
            key={a.label}
            onClick={() => {
              setAnchor(null);
              a.onClick();
            }}
            sx={a.danger ? { color: 'error.main' } : undefined}
          >
            {a.icon && <ListItemIcon sx={a.danger ? { color: 'error.main' } : undefined}>{a.icon}</ListItemIcon>}
            {a.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Label / value pairs in a responsive two-column grid. */
export function InfoList({ items }: { items: [string, ReactNode][] }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      {items.map(([k, v]) => (
        <Box key={k}>
          <Typography variant="caption" color="text.secondary">
            {k}
          </Typography>
          <Typography sx={{ wordBreak: 'break-word' }}>{v || '—'}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Shows an API error from a mutation inside a form. */
export function FormError({ error, message }: { error?: unknown; message?: string | null }) {
  if (message) return <Alert severity="error">{message}</Alert>;
  if (!error) return null;
  return <Alert severity="error">{errorMessage(error)}</Alert>;
}

export function csvEscape(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const text = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const toast = useToast();
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
          } catch {
            toast.error('Could not copy. Select the text and copy it by hand.');
          }
        }}
      >
        <ContentCopy fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export interface Credential {
  name: string;
  username?: string;
  password: string;
}

/**
 * One-time display of a new or reset password for an account without email.
 * The API never returns it again, so the admin must copy it now.
 */
export function CredentialsDialog({ open, title = 'Sign-in details', credentials, onClose }: { open: boolean; title?: string; credentials: Credential[]; onClose: () => void }) {
  const all = credentials.map((c) => `${c.name}\nUsername: ${c.username ?? '—'}\nPassword: ${c.password}`).join('\n\n');
  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={(_, reason) => reason !== 'backdropClick' && onClose()}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Copy these details now. For security the password will not be shown again. The user must choose a new password when they first sign in.
        </Alert>
        <Stack spacing={1.5}>
          {credentials.map((c, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 650, mb: 0.5 }}>{c.name}</Typography>
              {c.username && (
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    Username: <b>{c.username}</b>
                  </Typography>
                  <CopyButton text={c.username} label="Copy username" />
                </Stack>
              )}
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  Password:{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }} data-testid="temp-password">
                    {c.password}
                  </Box>
                </Typography>
                <CopyButton text={c.password} label="Copy password" />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <CopyAllButton text={all} />
        <Button variant="contained" onClick={onClose}>
          I have saved them
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CopyAllButton({ text }: { text: string }) {
  const toast = useToast();
  return (
    <Button
      startIcon={<ContentCopy />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success('Copied to clipboard');
        } catch {
          toast.error('Could not copy. Select the text and copy it by hand.');
        }
      }}
    >
      Copy all
    </Button>
  );
}

/** Stable number formatting for stat cards. */
export const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-IN'));

/** Open state for a "create" dialog that can also be opened with ?new=1 (quick actions). */
export function useCreateParam(): [boolean, (open: boolean) => void] {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('new') === '1');
  return [
    open,
    (v: boolean) => {
      setOpen(v);
      if (!v && params.get('new')) {
        const next = new URLSearchParams(params);
        next.delete('new');
        setParams(next, { replace: true });
      }
    },
  ];
}

/** Select used as a list filter: always shows its "All …" option instead of an empty box. */
export function FilterSelect({ label, value, onChange, allLabel, options, width = 180 }: { label: string; value: string; onChange: (v: string) => void; allLabel: string; options: { value: string; label: string }[]; width?: number }) {
  const theme = useTheme();
  if (isClarity(theme)) {
    // Clarity look: a pill with the label inside ("Class: All classes"), no floating label
    return (
      <TextField
        select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: width - 20 }, '& .MuiOutlinedInput-root': { borderRadius: 999 }, '& .MuiSelect-select': { py: '8.5px', pl: 0.5 } }}
        slotProps={{
          select: { displayEmpty: true },
          htmlInput: { 'aria-label': label },
          input: { startAdornment: <InputAdornment position="start" sx={{ mr: 0, color: 'text.secondary', '& p': { fontSize: 14 } }}>{label}:</InputAdornment> },
        }}
      >
        <MenuItem value="">{allLabel}</MenuItem>
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: { xs: '100%', sm: width } }}
      slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
    >
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
