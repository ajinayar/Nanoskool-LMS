/** Reward widgets shared by every grade; each adapts its size and wording to the band. */
import { Box, Button, Card, CardContent, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import LocalFireDepartment from '@mui/icons-material/LocalFireDepartment';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import LockOutlined from '@mui/icons-material/LockOutlined';
import MenuBook from '@mui/icons-material/MenuBook';
import AutoStories from '@mui/icons-material/AutoStories';
import TravelExplore from '@mui/icons-material/TravelExplore';
import Quiz from '@mui/icons-material/Quiz';
import Psychology from '@mui/icons-material/Psychology';
import Verified from '@mui/icons-material/Verified';
import Backpack from '@mui/icons-material/Backpack';
import AlarmOn from '@mui/icons-material/AlarmOn';
import Whatshot from '@mui/icons-material/Whatshot';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Bolt from '@mui/icons-material/Bolt';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { GiftArt, StarIcon } from './art';
import { ICON_ART } from './art-images';
import { tint, type Look } from './looks';
import { levelPercent, levelTitle, useClaim, type Badge, type Rewards } from './useLook';

export const S = '/student';

export const BADGE_ICONS: Record<string, ReactNode> = {
  'first-step': <MenuBook />,
  bookworm: <AutoStories />,
  explorer: <TravelExplore />,
  'quiz-starter': <Quiz />,
  'quiz-whiz': <Psychology />,
  perfect: <Verified />,
  'homework-hero': <Backpack />,
  'on-time': <AlarmOn />,
  'streak-3': <Whatshot />,
  'streak-7': <CalendarMonth />,
  'course-complete': <EmojiEvents />,
  'level-5': <AutoAwesome />,
};

/** "⭐ 120" for little grades, "⚡ 120 XP" for older ones. */
export function PointsPill({ look, xp, onDark }: { look: Look; xp: number; onDark?: boolean }) {
  const little = look.band === 'little';
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', px: 1.5, py: 0.6, borderRadius: 999, bgcolor: onDark ? 'rgba(255,255,255,0.16)' : little ? '#FFF6D6' : tint(look.accent, 0.12), color: onDark ? '#fff' : look.ink, fontWeight: 800 }}
      aria-label={`${xp} ${look.words.points}`}
    >
      {little ? <StarIcon size={20} /> : <Bolt sx={{ fontSize: 18, color: onDark ? '#FDE68A' : look.accent }} />}
      <Typography component="span" sx={{ fontWeight: 800, fontSize: little ? 17 : 14 }}>
        {xp.toLocaleString('en-IN')}
        {!little && <Box component="span" sx={{ fontWeight: 600, opacity: 0.75, ml: 0.5 }}>XP</Box>}
      </Typography>
    </Stack>
  );
}

export function StreakPill({ look, streak, onDark }: { look: Look; streak: number; onDark?: boolean }) {
  const label = look.band === 'little' ? `${streak} day${streak === 1 ? '' : 's'} in a row` : `${streak}-day streak`;
  return (
    <Tooltip title={streak ? 'Learn something every day to keep it going' : 'Learn today to start a streak'}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 1.5, py: 0.6, borderRadius: 999, bgcolor: onDark ? 'rgba(255,255,255,0.16)' : '#FFF1E6', color: onDark ? '#fff' : '#9A3412' }}>
        <LocalFireDepartment sx={{ fontSize: 18, color: streak ? '#F97316' : onDark ? 'rgba(255,255,255,0.6)' : '#FDBA74' }} />
        <Typography component="span" sx={{ fontWeight: 700, fontSize: 14 }}>
          {label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

/** Daily reward: locked until the student learns something today, then opens once. */
export function DailyRewardCard({ look, r }: { look: Look; r: Rewards }) {
  const little = look.band === 'little';
  const claim = useClaim(little ? `Yay! You got ${r.daily.xp} stars!` : `+${r.daily.xp} XP added`);
  const status = r.daily.claimed ? 'claimed' : r.daily.canClaim ? 'ready' : 'locked';
  const text = {
    claimed: little ? 'You opened today’s gift. See you tomorrow!' : 'Collected. A new reward unlocks tomorrow.',
    ready: little ? `Your gift is ready! Open it for ${r.daily.xp} stars.` : `Unlocked. Collect ${r.daily.xp} XP.`,
    locked: little ? 'Finish one lesson or quiz to open your gift.' : 'Finish a lesson, quiz or assignment today to unlock it.',
  }[status];
  if (little && look.art) {
    return (
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '28px', border: '3px solid #fff', background: 'linear-gradient(160deg, #9B6BFF 0%, #6D3FE0 100%)', color: '#fff', textAlign: 'center', p: 2.5, boxShadow: '0 12px 28px rgba(109,63,224,0.3)' }}>
        <Sparkles />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Box component="img" src={ICON_ART.gift} alt="" sx={{ width: 30, height: 30 }} />
          <Typography component="h2" sx={{ fontWeight: 1000, fontSize: 19, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Daily gift
          </Typography>
        </Stack>
        <Typography sx={{ fontWeight: 800, opacity: 0.95, mt: 0.5, position: 'relative' }}>{text}</Typography>
        <Box
          component="img"
          src={ICON_ART.gift}
          alt=""
          sx={{ position: 'relative', width: 132, height: 132, my: 1, filter: status === 'locked' ? 'grayscale(0.35) brightness(0.95) drop-shadow(0 10px 14px rgba(0,0,0,0.25))' : 'drop-shadow(0 10px 14px rgba(0,0,0,0.25))', transform: status === 'claimed' ? 'rotate(-8deg) scale(0.9)' : 'none', animation: status === 'ready' ? 'nsWiggle 1.4s ease-in-out infinite' : 'none', '@keyframes nsWiggle': { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(-7deg)' }, '75%': { transform: 'rotate(7deg)' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
        />
        <Box sx={{ position: 'relative' }}>
          {status === 'ready' ? (
            <Button variant="contained" onClick={() => claim.mutate()} disabled={claim.isPending} sx={{ bgcolor: '#2FBF71', color: '#fff', fontSize: 19, px: 5, boxShadow: '0 5px 0 #1C8C50', '&:hover': { bgcolor: '#29AD66', boxShadow: '0 5px 0 #1C8C50' } }}>
              Claim
            </Button>
          ) : (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 999, px: 2, py: 0.75, fontWeight: 900 }}>
              {status === 'locked' ? <LockOutlined sx={{ fontSize: 18 }} /> : <CheckCircle sx={{ fontSize: 18 }} />}
              {status === 'locked' ? 'Locked' : 'Opened'}
            </Box>
          )}
        </Box>
      </Box>
    );
  }
  return (
    <Card sx={{ background: little ? `linear-gradient(160deg, ${look.primary} 0%, ${look.tiles[4]} 100%)` : undefined, color: little ? '#fff' : undefined, textAlign: little ? 'center' : 'left' }}>
      <CardContent>
        <Stack direction={little ? 'column' : 'row'} spacing={little ? 1 : 2} sx={{ alignItems: 'center' }}>
          <Box sx={{ opacity: status === 'locked' ? 0.75 : 1, filter: status === 'locked' ? 'grayscale(0.4)' : 'none', flexShrink: 0 }}>
            <GiftArt size={little ? 104 : 64} open={status === 'claimed'} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" sx={{ color: 'inherit' }}>
              {little ? 'Daily gift' : 'Daily reward'}
            </Typography>
            <Typography sx={{ opacity: little ? 0.95 : 1, color: little ? 'inherit' : 'text.secondary', fontSize: little ? 16 : 14, mb: status === 'ready' ? 1.5 : 0 }}>{text}</Typography>
            {status === 'ready' && (
              <Button
                variant="contained"
                onClick={() => claim.mutate()}
                disabled={claim.isPending}
                sx={little ? { bgcolor: '#23B26D', color: '#fff', boxShadow: '0 4px 0 #178A52', '&:hover': { bgcolor: '#1FA262', boxShadow: '0 4px 0 #178A52' } } : undefined}
              >
                {little ? 'Open my gift' : 'Collect'}
              </Button>
            )}
            {status === 'locked' && !little && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.75, color: 'text.secondary' }}>
                <LockOutlined sx={{ fontSize: 16 }} />
                <Typography variant="caption">Locked</Typography>
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LevelCard({ look, r }: { look: Look; r: Rewards }) {
  const little = look.band === 'little';
  const pct = levelPercent(r);
  const toGo = r.nextLevelAt - r.xp;
  if (little && look.art) {
    return (
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '28px', border: '3px solid #fff', background: 'linear-gradient(135deg, #5AB2FF 0%, #3D74F2 100%)', color: '#fff', p: 2.5, boxShadow: '0 12px 28px rgba(61,116,242,0.28)' }}>
        <Sparkles />
        <Typography component="h2" sx={{ position: 'relative', fontWeight: 1000, fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center', mb: 1 }}>
          My level
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', position: 'relative' }}>
          <Box sx={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
            <Box component="img" src={ICON_ART.star} alt="" sx={{ width: 76, height: 76 }} />
            <Typography sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pt: 0.75, fontWeight: 1000, fontSize: 26, color: '#8A4B00' }}>{r.level}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 1000, fontSize: 18, mb: 0.75 }}>{levelTitle(r.level)}!</Typography>
            <Box sx={{ height: 16, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.3)', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.6)' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next level">
              <Box sx={{ width: `${Math.max(6, pct)}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(180deg, #FFE066 0%, #FFB020 100%)' }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 14, mt: 0.5, opacity: 0.95 }}>
              {r.xp - r.levelStart} / {r.nextLevelAt - r.levelStart} · {toGo} to go
            </Typography>
          </Box>
          <Box component="img" src={ICON_ART.chest} alt="" sx={{ width: 64, height: 64, flexShrink: 0 }} />
        </Stack>
      </Box>
    );
  }
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ position: 'relative', width: little ? 64 : 52, height: little ? 64 : 52, flexShrink: 0 }}>
            {little ? (
              <>
                <StarIcon size={64} />
                <Typography sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pt: 0.5, fontWeight: 900, fontSize: 20, color: '#7A4A00' }}>{r.level}</Typography>
              </>
            ) : (
              <Box sx={{ width: 52, height: 52, borderRadius: look.band === 'senior' ? 2 : '50%', bgcolor: tint(look.primary, 0.12), color: look.primary, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20 }}>{r.level}</Box>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.4, fontWeight: 700 }}>
              {look.words.level} {r.level}
            </Typography>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {look.band === 'senior' ? `${r.xp.toLocaleString('en-IN')} XP` : levelTitle(r.level)}
            </Typography>
            <LinearProgress variant="determinate" value={pct} color={little ? 'secondary' : 'primary'} aria-label="Progress to the next level" />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.75, display: 'block' }}>
              {little ? `${toGo} more stars to level ${r.level + 1}` : `${r.xp - r.levelStart} / ${r.nextLevelAt - r.levelStart} XP · ${toGo} to level ${r.level + 1}`}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

const QUEST_LINKS: Record<string, string> = { unit: `${S}/courses`, quiz: `${S}/quizzes`, nanobot: `${S}/nanobot` };

export function QuestList({ look, r, title }: { look: Look; r: Rewards; title?: string }) {
  const little = look.band === 'little';
  const done = r.quests.filter((q) => q.done).length;
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" component="h2">
            {title ?? (little ? 'Today’s missions' : 'Daily quests')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {done}/{r.quests.length}
          </Typography>
        </Stack>
        <Stack spacing={1}>
          {r.quests.map((q, i) => (
            <Box
              key={q.key}
              component={RouterLink}
              to={QUEST_LINKS[q.key]}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: little ? 1.5 : 1.25,
                borderRadius: little ? 4 : 2,
                bgcolor: q.done ? tint('#23B26D', 0.1) : little ? tint(look.tiles[i % look.tiles.length], 0.1) : look.soft,
                color: 'inherit',
                textDecoration: 'none',
                '&:hover': { filter: 'brightness(0.97)' },
              }}
            >
              {q.done ? <CheckCircle sx={{ color: '#23B26D', fontSize: little ? 30 : 22 }} /> : <RadioButtonUnchecked sx={{ color: look.ink2, fontSize: little ? 30 : 22 }} />}
              <Typography sx={{ fontWeight: little ? 800 : 600, fontSize: little ? 17 : 14, textDecoration: q.done ? 'line-through' : 'none', opacity: q.done ? 0.7 : 1 }}>{q.label}</Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function BadgeTile({ look, b, size = 'md' }: { look: Look; b: Badge; size?: 'sm' | 'md' | 'lg' }) {
  const d = { sm: 44, md: 64, lg: 84 }[size];
  const color = look.tiles[b.key.length % look.tiles.length];
  return (
    <Tooltip title={`${b.name}: ${b.description}${b.earned ? '' : ' (not yet)'}`}>
      <Stack spacing={0.75} sx={{ alignItems: 'center', textAlign: 'center', width: size === 'sm' ? d + 8 : d + 32 }}>
        <Box
          sx={{
            width: d,
            height: d,
            borderRadius: look.band === 'senior' ? 3 : '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: b.earned ? color : '#EEF0F4',
            color: b.earned ? '#fff' : '#A3A8B6',
            boxShadow: b.earned && look.band === 'little' ? `0 4px 0 rgba(0,0,0,0.12)` : 'none',
            '& svg': { fontSize: d * 0.46 },
            position: 'relative',
          }}
        >
          {BADGE_ICONS[b.key]}
          {!b.earned && <LockOutlined sx={{ position: 'absolute', right: -2, bottom: -2, fontSize: '16px !important', bgcolor: '#fff', borderRadius: '50%', p: 0.25, color: '#8A90A0' }} />}
        </Box>
        {size !== 'sm' && (
          <Typography sx={{ fontSize: size === 'lg' ? 14 : 12.5, fontWeight: 700, lineHeight: 1.2, color: b.earned ? 'text.primary' : 'text.secondary' }}>{b.name}</Typography>
        )}
      </Stack>
    </Tooltip>
  );
}

/** Soft twinkles for the little-grade reward cards. */
function Sparkles() {
  const dots = [[4, 6, 11], [91, 5, 14], [5, 86, 9], [92, 84, 11]];
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {dots.map(([x, y, s], i) => (
        <Box key={i} component="svg" viewBox="0 0 24 24" sx={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: s * 1.6, height: s * 1.6, opacity: 0.8 }}>
          <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={i % 2 ? '#FFE680' : '#FFFFFF'} />
        </Box>
      ))}
    </Box>
  );
}
