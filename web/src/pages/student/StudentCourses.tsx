import { Box, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import type { Course, Paged } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { QueryState } from '@/components/ui';
import { useLook } from '@/student/useLook';
import { tint, type Look } from '@/student/looks';
import { CardButton, EmptyPlay, Fact, PageTitle, PillTabs, PlayCard, Sticker } from '@/student/playful';
import { S } from './common';

type Filter = 'all' | 'progress' | 'new' | 'done';
const SUBJECT_EMOJI: [RegExp, string][] = [
  [/robot/i, '🤖'],
  [/cod|scratch|program/i, '💻'],
  [/\bai\b|artificial|intelligence/i, '🧠'],
  [/science|electric|circuit/i, '🔬'],
  [/math/i, '➗'],
  [/english|reading|language/i, '📚'],
  [/art|design/i, '🎨'],
];
const emojiFor = (c: Course) => SUBJECT_EMOJI.find(([r]) => r.test(`${c.category} ${c.title}`))?.[1] ?? '📘';

function CourseCard({ c, i, look }: { c: Course; i: number; look: Look }) {
  const p = c.progress ?? 0;
  const color = p >= 100 ? '#23B26D' : look.tiles[i % look.tiles.length];
  return (
    <PlayCard look={look} color={color} to={`${S}/courses/${c._id}`}>
      <Box sx={{ position: 'absolute', top: -10, right: 14, zIndex: 1 }}>
        {p >= 100 ? <Sticker color="#23B26D">🎉 Done!</Sticker> : p === 0 ? <Sticker color={look.accent}>NEW!</Sticker> : null}
      </Box>
      <Box sx={{ mx: -2.25, mt: -2.25, height: 130, borderRadius: `${look.radius - 2}px ${look.radius - 2}px 0 0`, overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, ${color}, ${tint(color, 0.55)})` }}>
        {c.thumbnailUrl ? (
          <Box component="img" src={c.thumbnailUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 64 }}>{emojiFor(c)}</Box>
        )}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase', color }}>
          {emojiFor(c)} {c.category ?? 'Course'}
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 18, color: look.ink, lineHeight: 1.25 }}>{c.title}</Typography>
      </Box>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        <Fact look={look}>📖 {c.unitCount ?? 0} lessons</Fact>
        <Fact look={look}>✅ {c.completedUnits ?? 0} done</Fact>
      </Stack>
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: look.ink2 }}>
            {p >= 100 ? 'Finished!' : p ? 'Keep going!' : 'Ready to start'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 900, color }}>
            {p}%
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={p} sx={{ bgcolor: tint(color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: color } }} />
      </Box>
      <CardButton color={color}>{p >= 100 ? 'Review ↺' : p ? 'Continue ▶' : 'Start ▶'}</CardButton>
    </PlayCard>
  );
}

export function StudentCoursesPage() {
  const look = useLook();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const q = useGet<Paged<Course>>('/courses', { limit: 100 });
  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      <PageTitle look={look} emoji="📚" title={look.words.courses} subtitle="Pick up where you left off" action={<TextField placeholder="🔍 Search my courses" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: 999 } }} />} />
      <QueryState q={q}>
        {(d) => {
          const all = d.items;
          const count = (f: Filter) => all.filter((c) => match(c, f)).length;
          const s = search.trim().toLowerCase();
          const rows = all.filter((c) => match(c, filter) && (!s || c.title.toLowerCase().includes(s)));
          return all.length === 0 ? (
            <EmptyPlay look={look} emoji="🎒" title="No courses yet" text="Your teacher will add courses to your class soon." />
          ) : (
            <>
              <PillTabs
                look={look}
                value={filter}
                onChange={setFilter}
                tabs={[
                  { value: 'all', label: 'All', n: count('all'), emoji: '🌈' },
                  { value: 'progress', label: 'In progress', n: count('progress'), emoji: '🚀' },
                  { value: 'new', label: 'Not started', n: count('new'), emoji: '✨' },
                  { value: 'done', label: 'Completed', n: count('done'), emoji: '🏆' },
                ]}
              />
              {rows.length === 0 ? (
                <EmptyPlay look={look} emoji="🔎" title="No courses here" text={filter === 'done' ? 'Finish every lesson in a course to see it here.' : 'Try another filter.'} />
              ) : (
                <Box sx={{ display: 'grid', gap: 2.5, pt: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
                  {rows.map((c, i) => (
                    <CourseCard key={c._id} c={c} i={i} look={look} />
                  ))}
                </Box>
              )}
            </>
          );
        }}
      </QueryState>
    </Box>
  );
}

function match(c: Course, f: Filter) {
  const p = c.progress ?? 0;
  if (f === 'done') return p >= 100;
  if (f === 'new') return p === 0;
  if (f === 'progress') return p > 0 && p < 100;
  return true;
}
