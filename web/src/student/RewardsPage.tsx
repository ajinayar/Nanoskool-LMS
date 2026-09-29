import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import LocalFireDepartment from '@mui/icons-material/LocalFireDepartment';
import { QueryState, fmtDate } from '@/components/ui';
import { StarIcon } from './art';
import { tint } from './looks';
import { useLook, useRewards } from './useLook';
import { BadgeTile, DailyRewardCard, LevelCard, QuestList } from './widgets';

const HOW = [
  { what: 'Finish a lesson', little: 'Finish a lesson', xp: '10' },
  { what: 'Complete a quiz (your best try counts)', little: 'Play a quiz', xp: '5–25' },
  { what: 'Hand in an assignment', little: 'Hand in your homework', xp: '15' },
  { what: '… before the due date', little: 'Hand it in on time', xp: '+5' },
  { what: '… and score 80% or more', little: 'Get a great mark', xp: '+10' },
  { what: 'Daily reward (after learning that day)', little: 'Open your daily gift', xp: '6–10' },
];

export function RewardsPage() {
  const look = useLook();
  const q = useRewards();
  const little = look.band === 'little';
  return (
    <QueryState q={q}>
      {(r) => {
        const earned = r.badges.filter((b) => b.earned).length;
        return (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" component="h1" data-read>
                {look.words.rewards}
              </Typography>
              <Typography sx={{ color: 'text.secondary', mt: 0.5, fontSize: little ? 17 : undefined }} data-read>
                {little ? `You have ${r.xp} stars and ${earned} badge${earned === 1 ? "" : "s"}. Keep going!` : `${r.xp.toLocaleString('en-IN')} XP earned · ${earned} of ${r.badges.length} badges`}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mb: 3, alignItems: 'stretch' }}>
              <LevelCard look={look} r={r} />
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: little ? 64 : 52, height: little ? 64 : 52, borderRadius: look.band === 'senior' ? 2 : '50%', bgcolor: '#FFF1E6', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <LocalFireDepartment sx={{ color: '#F97316', fontSize: little ? 40 : 30 }} />
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1.4 }}>
                        {little ? 'Days in a row' : 'Learning streak'}
                      </Typography>
                      <Typography variant="h5" component="p">
                        {r.streak} day{r.streak === 1 ? '' : 's'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {r.learnedToday ? 'You learned today.' : r.streak ? 'Learn today to keep it going.' : 'Learn today to start one.'} Best: {r.bestStreak}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              <DailyRewardCard look={look} r={r} />
            </Box>

            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
              <Stack spacing={3} sx={{ minWidth: 0 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                      Badges
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${little ? 116 : 100}px, 1fr))`, gap: 2.5, justifyItems: 'center' }}>
                      {r.badges.map((b) => (
                        <Box key={b.key} sx={{ textAlign: 'center' }}>
                          <BadgeTile look={look} b={b} size={little ? 'lg' : 'md'} />
                          {!little && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 110, mx: 'auto', mt: 0.25 }}>
                              {b.earned && b.earnedAt ? fmtDate(b.earnedAt, 'D MMM YYYY') : b.description}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
                      {little ? 'How to get stars' : 'How to earn XP'}
                    </Typography>
                    {HOW.map((h, i) => (
                      <Stack key={h.what} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.1, borderTop: i ? `1px solid ${look.line}` : 'none', gap: 2 }}>
                        <Typography sx={{ fontWeight: little ? 800 : 500 }}>{little ? h.little : h.what}</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                          {little && <StarIcon size={18} />}
                          <Typography sx={{ fontWeight: 700 }}>
                            {h.xp}
                            {little ? '' : ' XP'}
                          </Typography>
                        </Stack>
                      </Stack>
                    ))}
                  </CardContent>
                </Card>
              </Stack>
              <Stack spacing={3} sx={{ minWidth: 0 }}>
                <QuestList look={look} r={r} />
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
                      Recently earned
                    </Typography>
                    {r.recent.length === 0 ? (
                      <Typography sx={{ color: 'text.secondary' }}>Nothing yet. Finish a lesson to earn your first {look.words.points}!</Typography>
                    ) : (
                      r.recent.map((e, i) => (
                        <Stack key={`${e.at}${i}`} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1, borderTop: i ? `1px solid ${look.line}` : 'none' }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
                              {e.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {{ unit: 'Lesson', quiz: 'Quiz', submission: 'Assignment', claim: 'Daily reward' }[e.kind]} · {fmtDate(e.at, 'D MMM')}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 1, py: 0.25, borderRadius: 999, bgcolor: tint(look.primary, 0.1), color: look.primary === '#18181B' ? look.ink : look.primary, fontWeight: 700, fontSize: 13 }}>+{e.xp}</Box>
                        </Stack>
                      ))
                    )}
                  </CardContent>
                </Card>
              </Stack>
            </Box>
          </>
        );
      }}
    </QueryState>
  );
}
