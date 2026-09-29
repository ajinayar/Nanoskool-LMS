/**
 * Shared building blocks for every portal. Prefer these over one-off markup so pages look consistent.
 */
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  type ChipProps,
} from '@mui/material';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import DOMPurify from 'dompurify';
import { useRef, useState, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';
import { errorMessage, uploadFile } from '@/api/client';
import { useToast } from './Toast';

dayjs.extend(relativeTime);

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
      <Box>
        {back}
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

const PASTELS = ['#C9B8F4', '#F8AE92', '#AAC4F2', '#B9E3C9', '#F6DB8E'];

export function StatCard({ label, value, icon, hint, color = 'primary.main' }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; color?: string }) {
  const theme = useTheme();
  // In the "Clarity" look (near-black primary), stats become pastel tiles like the dashboards
  if (theme.palette.primary.main === '#17171C') {
    const bg = PASTELS[[...label].reduce((a, c) => a + c.charCodeAt(0), 0) % PASTELS.length];
    return (
      <Box sx={{ bgcolor: bg, borderRadius: '22px', p: 2.25, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          {icon && <Box sx={{ width: 36, height: 36, borderRadius: '11px', bgcolor: '#17171C', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, '& svg': { fontSize: 19 } }}>{icon}</Box>}
          <Typography sx={{ fontWeight: 500, fontSize: 14.5 }}>{label}</Typography>
        </Stack>
        <Box>
          <Typography sx={{ fontWeight: 500, fontSize: 32, lineHeight: 1, letterSpacing: '-0.03em' }}>{value ?? '—'}</Typography>
          {hint && <Typography sx={{ fontSize: 13, mt: 0.75, color: 'rgba(23,23,28,0.7)' }}>{hint}</Typography>}
        </Box>
      </Box>
    );
  }
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {icon && <Avatar sx={{ bgcolor: 'rgba(63,61,191,0.08)', color, width: 44, height: 44 }}>{icon}</Avatar>}
          <Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5">{value ?? '—'}</Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Responsive grid of cards without depending on the Grid API. */
export function CardGrid({ children, min = 220 }: { children: ReactNode; min?: number }) {
  return <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>{children}</Box>;
}

export function Section({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">{title}</Typography>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <Stack sx={{ py: 6, alignItems: 'center' }} spacing={2}>
      <CircularProgress size={32} />
      {label && <Typography color="text.secondary">{label}</Typography>}
    </Stack>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return <Alert severity="error">{errorMessage(error)}</Alert>;
}

export function Empty({ title = 'Nothing here yet', hint, action }: { title?: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <Stack sx={{ py: 5, alignItems: 'center', textAlign: 'center' }} spacing={1}>
      <InboxOutlined sx={{ fontSize: 40, color: 'text.disabled' }} />
      <Typography variant="subtitle1">{title}</Typography>
      {hint && <Typography color="text.secondary">{hint}</Typography>}
      {action}
    </Stack>
  );
}

/** Renders a query's loading / error / empty state, or the children. */
export function QueryState<T>({ q, empty, children }: { q: { isLoading: boolean; error: unknown; data?: T }; empty?: (d: T) => boolean; children: (d: T) => ReactNode }) {
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  if (q.data === undefined) return null;
  if (empty?.(q.data)) return <Empty />;
  return <>{children(q.data)}</>;
}

export interface Column<T> {
  key: string;
  label: ReactNode;
  render: (row: T) => ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  /** Keep the cell on one line (short values such as class names, dates, counts) */
  nowrap?: boolean;
}

export function DataTable<T extends { _id?: string }>({ rows, columns, onRowClick, empty }: { rows: T[]; columns: Column<T>[]; onRowClick?: (r: T) => void; empty?: ReactNode }) {
  if (!rows.length) return <>{empty ?? <Empty />}</>;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.key} width={c.width} align={c.align} sx={{ whiteSpace: 'nowrap' }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r._id ?? i} hover={!!onRowClick} onClick={onRowClick ? () => onRowClick(r) : undefined} sx={onRowClick ? { cursor: 'pointer' } : undefined}>
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} sx={c.nowrap ? { whiteSpace: 'nowrap' } : undefined}>
                  {c.render(r)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function Progress({ value, showLabel = true }: { value: number | null | undefined; showLabel?: boolean }) {
  const v = value ?? 0;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 120 }}>
      <LinearProgress variant="determinate" value={v} sx={{ flex: 1, height: 8, borderRadius: 4 }} color={v >= 75 ? 'success' : v >= 40 ? 'primary' : 'warning'} />
      {showLabel && (
        <Typography variant="body2" sx={{ minWidth: 36, textAlign: 'right' }}>
          {value == null ? '—' : `${v}%`}
        </Typography>
      )}
    </Stack>
  );
}

const STATUS_COLOR: Record<string, ChipProps['color']> = {
  active: 'success',
  published: 'success',
  graded: 'success',
  present: 'success',
  submitted: 'info',
  draft: 'default',
  inactive: 'default',
  archived: 'default',
  suspended: 'error',
  absent: 'error',
  overdue: 'error',
  late: 'warning',
  returned: 'warning',
  excused: 'info',
  closed: 'default',
  pending: 'warning',
};

// Clarity look: soft pastel status tags (background, text)
const CLARITY_STATUS: Record<string, [string, string]> = {
  success: ['#D3EEDD', '#1D6B3E'],
  info: ['#D6E4FB', '#1F4A92'],
  warning: ['#FCE0B8', '#86500A'],
  error: ['#FBD5C6', '#9A3A16'],
  default: ['#ECE6DA', '#5B5A63'],
};

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const theme = useTheme();
  if (theme.palette.primary.main === '#17171C') {
    const [bg, fg] = CLARITY_STATUS[(STATUS_COLOR[status] as string) ?? 'default'] ?? CLARITY_STATUS.default;
    return <Chip size="small" label={label ?? status.replace(/_/g, ' ')} sx={{ bgcolor: bg, color: fg, height: 24, fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize' }} />;
  }
  return <Chip size="small" label={label ?? status.replace(/_/g, ' ')} color={STATUS_COLOR[status] ?? 'default'} variant={STATUS_COLOR[status] ? 'filled' : 'outlined'} sx={{ textTransform: 'capitalize' }} />;
}

export function UserCell({ name, sub, avatarUrl }: { name: string; sub?: ReactNode; avatarUrl?: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Avatar src={avatarUrl} sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.light' }}>
        {name?.[0]}
      </Avatar>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export const fmtDate = (d?: string | Date | null, f = 'D MMM YYYY') => (d ? dayjs(d).format(f) : '—');
export const fmtDateTime = (d?: string | Date | null) => (d ? dayjs(d).format('D MMM YYYY, h:mm A') : '—');
export const fromNow = (d?: string | Date | null) => (d ? dayjs(d).fromNow() : '—');

export function DueDate({ date }: { date?: string | null }) {
  if (!date) return <Typography variant="body2" color="text.secondary">No due date</Typography>;
  const d = dayjs(date);
  const overdue = d.isBefore(dayjs());
  return (
    <Typography variant="body2" color={overdue ? 'error.main' : d.diff(dayjs(), 'day') < 2 ? 'warning.main' : 'text.primary'}>
      {overdue ? 'Was due ' : 'Due '}
      {d.format('D MMM, h:mm A')}
    </Typography>
  );
}

/** Safe HTML from the editor. The server sanitises too; this is defence in depth. */
export function RichText({ html, sx }: { html?: string; sx?: object }) {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder'] });
  return (
    <Box
      className="rich-text"
      sx={{ '& img': { maxWidth: '100%' }, '& iframe': { maxWidth: '100%' }, '& h2': { fontSize: '1.3rem' }, '& h3': { fontSize: '1.1rem' }, lineHeight: 1.7, ...sx }}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, loading }: { open: boolean; title: string; message?: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void; loading?: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      {message && <DialogContent>{message}</DialogContent>}
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color={danger ? 'error' : 'primary'} onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Dialog with a form body and Save/Cancel buttons. */
export function FormDialog({ open, title, onClose, onSubmit, submitLabel = 'Save', loading, children, maxWidth = 'sm' }: { open: boolean; title: string; onClose: () => void; onSubmit: () => void; submitLabel?: string; loading?: boolean; children: ReactNode; maxWidth?: 'xs' | 'sm' | 'md' | 'lg' }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {children}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving…' : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Upload button: uploads straight away and returns the file URL. */
export function UploadButton({ folder, accept, label = 'Upload file', onUploaded }: { folder: string; accept?: string; label?: string; onUploaded: (url: string, name: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <>
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            const r = await uploadFile(f, folder);
            onUploaded(r.url, r.name);
            toast.success('File uploaded');
          } catch (err) {
            toast.error(errorMessage(err, 'Upload failed'));
          } finally {
            setBusy(false);
            e.target.value = '';
          }
        }}
      />
      <Button variant="outlined" startIcon={busy ? <CircularProgress size={16} /> : <UploadFileOutlined />} onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? 'Uploading…' : label}
      </Button>
    </>
  );
}

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);
