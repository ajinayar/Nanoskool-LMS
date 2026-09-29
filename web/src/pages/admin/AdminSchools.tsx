import { Button, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { refName, type Paged, type Partner, type School } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { DataTable, Empty, PageHeader, QueryState, Section, StatusChip, UserCell } from '@/components/ui';
import { FilterBar, FilterSelect, Pager, SearchField, useCreateParam, useDebounced } from '@/components/AdminCommon';
import { SchoolCreateDialog, SchoolDetailView } from '@/components/AdminSchool';

/** School list used by the super admin (with partner filter) and partners (their own schools). */
export function SchoolList({ mode, base }: { mode: 'admin' | 'partner'; base: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [partnerId, setPartnerId] = useState(params.get('partnerId') ?? '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [open, setOpen] = useCreateParam();
  const partners = useGet<Paged<Partner>>(mode === 'admin' ? '/partners' : null, { limit: 200 });
  const list = useGet<Paged<School>>('/schools', { q: dq || undefined, partnerId: partnerId || undefined, page, limit });
  const filtered = !!(dq || partnerId);
  return (
    <>
      <PageHeader
        title="Schools"
        subtitle={mode === 'admin' ? 'Every school on Nanoskool' : 'Schools in your network'}
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Add school
          </Button>
        }
      />
      <FilterBar>
        <SearchField value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search schools" />
        {mode === 'admin' && <FilterSelect label="Partner" value={partnerId} onChange={(v) => { setPartnerId(v); setPage(1); }} allLabel="All partners" width={240} options={(partners.data?.items ?? []).map((p) => ({ value: p._id, label: p.name }))} />}
      </FilterBar>
      <Section title={list.data ? `${list.data.total} school${list.data.total === 1 ? '' : 's'}` : 'Schools'}>
        <QueryState q={list}>
          {(d) => (
            <>
              <DataTable
                rows={d.items}
                onRowClick={(s) => navigate(`${base}/schools/${s._id}`)}
                empty={<Empty title={filtered ? 'No schools match these filters' : 'No schools yet'} action={!filtered && <Button startIcon={<Add />} onClick={() => setOpen(true)}>Add school</Button>} />}
                columns={[
                  { key: 'name', label: 'School', render: (s) => <UserCell name={s.name} sub={s.code} avatarUrl={s.logoUrl} /> },
                  ...(mode === 'admin' ? [{ key: 'partner', label: 'Partner', render: (s: School) => refName(s.partnerId) || <Typography variant="body2" color="text.secondary">Direct</Typography> }] : []),
                  { key: 'city', label: 'Location', render: (s) => [s.city, s.state].filter(Boolean).join(', ') || '—' },
                  { key: 'students', label: 'Students', align: 'right', render: (s) => s.students ?? 0 },
                  { key: 'teachers', label: 'Teachers', align: 'right', render: (s) => s.teachers ?? 0 },
                  ...(mode === 'admin' ? [{ key: 'plan', label: 'Plan', render: (s: School) => <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{s.plan ?? 'basic'}</Typography> }] : []),
                  { key: 'status', label: 'Status', render: (s) => <StatusChip status={s.status} /> },
                ]}
              />
              <Pager total={d.total} page={page} limit={limit} onPage={setPage} onLimit={setLimit} />
            </>
          )}
        </QueryState>
      </Section>
      {open && <SchoolCreateDialog mode={mode} partnerId={partnerId || undefined} onClose={() => setOpen(false)} onCreated={(s) => navigate(`${base}/schools/${s._id}`)} />}
    </>
  );
}

export function AdminSchoolsPage() {
  return <SchoolList mode="admin" base="/admin" />;
}

export function AdminSchoolDetailPage() {
  const { id } = useParams();
  return <SchoolDetailView key={id} id={id!} mode="admin" backTo="/admin/schools" />;
}
