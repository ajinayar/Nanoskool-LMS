import { Box, Chip, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useState } from 'react';
import type { Course, Paged } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { CardGrid, Empty, PageHeader, QueryState } from '@/components/ui';
import { CourseCard } from '@/pages/shared/CoursePages';
import { S } from './common';

type Filter = 'all' | 'progress' | 'new' | 'done';

export function StudentCoursesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const q = useGet<Paged<Course>>('/courses', { limit: 100 });
  return (
    <>
      <PageHeader title="My courses" subtitle="Pick up where you left off" actions={<TextField placeholder="Search my courses" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 240 } }} />} />
      <QueryState q={q}>
        {(d) => {
          const all = d.items;
          const count = (f: Filter) => all.filter((c) => match(c, f)).length;
          const s = search.trim().toLowerCase();
          const rows = all.filter((c) => match(c, filter) && (!s || c.title.toLowerCase().includes(s)));
          return all.length === 0 ? (
            <Empty title="No courses yet" hint="Your teacher will add courses to your class soon." />
          ) : (
            <>
              <Box sx={{ mb: 2, overflowX: 'auto' }}>
                <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
                  {(
                    [
                      ['all', 'All'],
                      ['progress', 'In progress'],
                      ['new', 'Not started'],
                      ['done', 'Completed'],
                    ] as [Filter, string][]
                  ).map(([v, l]) => (
                    <ToggleButton key={v} value={v} sx={{ px: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <span>{l}</span>
                        <Chip size="small" label={count(v)} sx={{ height: 20 }} />
                      </Stack>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              {rows.length === 0 ? (
                <Empty title="No courses here" hint={filter === 'done' ? 'Finish every unit in a course to see it here.' : 'Try another filter.'} />
              ) : (
                <CardGrid min={250}>
                  {rows.map((c) => (
                    <CourseCard key={c._id} course={c} to={`${S}/courses/${c._id}`} showProgress />
                  ))}
                </CardGrid>
              )}
            </>
          );
        }}
      </QueryState>
    </>
  );
}

function match(c: Course, f: Filter) {
  const p = c.progress ?? 0;
  if (f === 'done') return p >= 100;
  if (f === 'new') return p === 0;
  if (f === 'progress') return p > 0 && p < 100;
  return true;
}
