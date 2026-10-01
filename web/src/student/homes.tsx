/** Home screens for each band. The data is the same; the layout, tone and emphasis change with age. */
import { Box, Button, ButtonBase, Card, CardContent, Chip, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import PlayArrow from '@mui/icons-material/PlayArrowRounded';
import AutoStories from '@mui/icons-material/AutoStoriesRounded';
import Quiz from '@mui/icons-material/QuizRounded';
import Assignment from '@mui/icons-material/AssignmentRounded';
import EmojiEvents from '@mui/icons-material/EmojiEventsRounded';
import TaskAlt from '@mui/icons-material/TaskAltRounded';
import ArrowForward from '@mui/icons-material/ArrowForwardRounded';
import Favorite from '@mui/icons-material/FavoriteRounded';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { refName, type CourseDetail, type CourseProgress, type QuizSummary, type SchoolEvent, type StudentReport } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { QueryState, fmtDate } from '@/components/ui';
import { AnnouncementsWidget, EventsWidget } from '@/pages/shared/CommonPages';
import { CourseThumb } from '@/pages/shared/CoursePages';
import { RemarkChip } from '@/pages/teacher/RemarkPages';
import { attemptsLeft, quizClosed } from '@/pages/student/common';
import { Mascot, SceneArt, StarIcon } from './art';
import { ICON_ART } from './art-images';
import { shade, tint, type Look } from './looks';
import { levelPercent, useLook, useRewards, type Rewards } from './useLook';
import { KnowYourselfCard, MissionCard, NextTurnCard, ThinkingPuzzlesCard } from './journey';
import { BadgeTile, DailyRewardCard, LevelCard, PointsPill, QuestList, S, StreakPill } from './widgets';

dayjs.extend(relativeTime);

type StudentDash = StudentReport & { upcomingEvents: SchoolEvent[] };

export function StudentHomeByGrade() {
  const look = useLook();
  const dash = useGet<StudentDash>('/dashboard');
  const quizzes = useGet<QuizSummary[]>('/quizzes');
  const rewards = useRewards();
  return (
    <QueryState q={dash}>
      {(d) => {
        const open = (quizzes.data ?? []).filter((x) => !quizClosed(x) && attemptsLeft(x) > 0);
        const props = { look, d, quizzes: open, r: rewards.data };
        return look.band === 'little' ? <LittleHome {...props} /> : look.band === 'junior' ? <JuniorHome {...props} /> : <SeniorHome {...props} />;
      }}
    </QueryState>
  );
}

interface HomeProps {
  look: Look;
  d: StudentDash;
  quizzes: QuizSummary[];
  r?: Rewards;
}

/** Where "continue" should go for a course: the first unfinished unit. */
function useNext(cp?: CourseProgress) {
  const detail = useGet<CourseDetail>(cp ? `/courses/${cp.course._id}` : null);
  const units = detail.data?.chapters.flatMap((ch) => ch.units) ?? [];
  const next = units.find((u) => !u.completed);
  return { loading: detail.isLoading, next, to: next ? `${S}/units/${next._id}` : cp ? `${S}/courses/${cp.course._id}` : `${S}/courses` };
}

const firstName = (n: string) => n.split(' ')[0];
const greeting = () => {
  const h = dayjs().hour();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const unfinished = (d: StudentDash) => d.courses.find((c) => c.unitCount > 0 && c.completedUnits < c.unitCount) ?? d.courses[0];

/* ================================================================ Grades 1–3 */

/** Big, chunky, multi-colour headline with a white outline (like a sticker). */
function StickerTitle({ lines, colors }: { lines: string[]; colors: string[] }) {
  let n = 0;
  return (
    <Typography variant="h4" component="h1" data-read sx={{ fontSize: { xs: '2.5rem', sm: '3.2rem', md: '4rem' }, fontWeight: 1000, lineHeight: 0.98, letterSpacing: '-0.01em', mb: 2 }}>
      {lines.map((line, li) => (
        <Box key={li} component="span" sx={{ display: 'block' }}>
          {line.split(' ').map((word, wi) => {
            const c = colors[n++ % colors.length];
            return (
              <Box key={wi} component="span" sx={{ color: c, WebkitTextStroke: { xs: '7px #fff', md: '10px #fff' }, paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(40,30,80,0.18)', mr: '0.22em', display: 'inline-block' }}>
                {word}
              </Box>
            );
          })}
        </Box>
      ))}
    </Typography>
  );
}

/** Frosted white panel with a coloured, uppercase title (used for the home sections). */
function LittlePanel({ title, color, to, action, children }: { title: string; color: string; to?: string; action?: string; children: ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(10px)', border: '3px solid rgba(255,255,255,0.9)', borderRadius: '32px', p: { xs: 2, md: 2.5 }, boxShadow: '0 10px 30px rgba(60,40,120,0.10)' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="h2" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 1000, color, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            {title}
          </Typography>
          <StarIcon size={24} />
        </Stack>
        {to && (
          <Button component={RouterLink} to={to} variant="contained" size="small" sx={{ bgcolor: color, minHeight: 36, px: 2, fontSize: 15, boxShadow: `0 3px 0 ${shade(color, 0.25)}`, '&:hover': { bgcolor: color } }}>
            {action ?? 'See all'}
          </Button>
        )}
      </Stack>
      {children}
    </Box>
  );
}

function LittleHome({ look, d, quizzes, r }: HomeProps) {
  const me = useMe();
  const first = firstName(me.name);
  const current = unfinished(d);
  const next = useNext(current);
  const tasks = [...d.assignments.overdue, ...d.assignments.pending];
  const bubble = !r ? 'Let’s learn something fun today!' : r.daily.canClaim ? 'You did it! Your gift is ready to open.' : r.learnedToday ? 'Great job today! Want to play another lesson?' : 'Finish one lesson to open today’s gift!';
  const tiles: { label: string; to: string; img: string; badge?: number; tone: string }[] = [
    { label: look.words.courses, to: `${S}/courses`, img: ICON_ART.lessons, tone: '#FFE4E4' },
    { label: look.words.quizzes, to: `${S}/quizzes`, img: ICON_ART.quiz, badge: quizzes.length, tone: '#FFF1D6' },
    { label: look.words.assignments, to: `${S}/assignments`, img: ICON_ART.tasks, badge: tasks.length, tone: '#DFF6E7' },
    { label: look.words.rewards, to: `${S}/rewards`, img: ICON_ART.stars, tone: '#E3EEFF' },
    { label: look.words.nanobot, to: `${S}/nanobot`, img: ICON_ART.nano, tone: '#EEE6FF' },
  ];
  const art = look.art!;
  const heroDark = look.grade !== 1;
  return (
    <>
      {/* Hero: painted scene, sticker headline, Nano */}
      {/* Full-bleed: the scene runs edge to edge of the window; the words and Nano stay on the page grid */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          mx: 'calc(50% - 50vw)',
          mt: '-96px',
          minHeight: { xs: 536, sm: 536, md: 600 },
          backgroundImage: `url(${art.hero})`,
          backgroundSize: 'cover',
          backgroundPosition: { xs: '70% center', md: 'center' },
          boxShadow: '0 16px 40px rgba(60,40,120,0.14)',
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          pt: { xs: '120px', md: '128px' },
          pb: { xs: 12, md: 12 },
        }}
      >
        {art.heroVideo && (
          <Box
            component="video"
            aria-hidden
            src={art.heroVideo}
            poster={art.hero}
            autoPlay
            muted
            loop
            playsInline
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: { xs: '70% center', md: 'center' }, '@media (prefers-reduced-motion: reduce)': { display: 'none' } }}
          />
        )}
        {heroDark && <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(10,10,40,0.35) 0%, rgba(10,10,40,0.12) 45%, rgba(0,0,0,0) 70%)' }} />}
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1180, mx: 'auto', px: { xs: 3, md: 5 } }}>
          <Box sx={{ maxWidth: 620 }}>
            <StickerTitle lines={['Let’s learn,', `${first}!`]} colors={['#FFC928', '#FF5C8A', '#3E9BFF', '#2FBF71', '#A56BFF']} />
            <Stack direction="row" spacing={1} sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: art.ribbon, color: '#fff', borderRadius: 999, px: 2, py: 0.75, mb: 2, boxShadow: `0 4px 0 ${shade(art.ribbon, 0.25)}` }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: 15, md: 18 } }}>{look.tagline}</Typography>
              <StarIcon size={22} />
            </Stack>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, bgcolor: 'rgba(255,255,255,0.95)', color: look.ink, px: 2.25, py: 1.25, borderRadius: '20px 20px 20px 6px', mb: 2.5, maxWidth: 400, boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}>
              <Typography data-read sx={{ fontWeight: 800, fontSize: 17 }}>
                {bubble}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow sx={{ fontSize: '32px !important' }} />}
              component={RouterLink}
              to={next.to}
              disabled={!current}
              sx={{ fontSize: { xs: 18, md: 21 }, py: 1.5, px: { xs: 2.5, md: 3.5 }, whiteSpace: 'nowrap' }}
            >
              {current && current.completedUnits ? 'Play next lesson' : 'Start my first lesson'}
            </Button>
          </Box>
        </Box>
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 1, width: '100%', maxWidth: 1180, mx: 'auto', pointerEvents: 'none' }}>
          <Box sx={{ position: 'absolute', right: { xs: -6, sm: '6%', md: '34%' }, bottom: { xs: 70, md: 60 }, width: { xs: 130, sm: 190, md: 250 } }}>
            <Box
              className="float"
              sx={{ animation: 'nsFloat 4s ease-in-out infinite', '@keyframes nsFloat': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
            >
              <Box component="img" src={art.nano} alt="Nano the robot" sx={{ width: '100%', display: 'block', filter: 'drop-shadow(0 14px 18px rgba(20,20,60,0.28))' }} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Picture tiles */}
      <Box
        sx={{
          mt: -9,
          mx: { xs: 1, md: 4 },
          position: 'relative',
          zIndex: 2,
          mb: 4,
          bgcolor: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)',
          borderRadius: '32px',
          border: '3px solid #fff',
          boxShadow: '0 12px 30px rgba(60,40,120,0.14)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          p: { xs: 1, md: 1.5 },
        }}
      >
        {tiles.map((t, i) => (
          <ButtonBase
            key={t.label}
            component={RouterLink}
            to={t.to}
            sx={{ flexDirection: 'column', gap: 0.75, py: { xs: 1, md: 1.5 }, borderRadius: '24px', borderLeft: i ? { md: '2px dashed #EFEAF7' } : 'none', '&:hover .tile': { transform: 'translateY(-4px) scale(1.04)' } }}
          >
            <Box className="tile" sx={{ position: 'relative', width: { xs: 56, md: 96 }, height: { xs: 56, md: 96 }, borderRadius: '50%', bgcolor: t.tone, display: 'grid', placeItems: 'center', transition: 'transform .18s' }}>
              <Box component="img" src={t.img} alt="" sx={{ width: '92%', height: '92%', objectFit: 'contain' }} />
              {!!t.badge && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    minWidth: 28,
                    height: 28,
                    px: 0.5,
                    borderRadius: 999,
                    bgcolor: '#FF3B5C',
                    color: '#fff',
                    border: '3px solid #fff',
                    fontSize: 13,
                    fontWeight: 900,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {t.badge}
                </Box>
              )}
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 12, md: 17 }, textAlign: 'center', lineHeight: 1.15, color: look.ink }}>{t.label}</Typography>
          </ButtonBase>
        ))}
      </Box>
      <Box sx={{ mx: { xs: 1, md: 4 } }}>
        <MissionCard look={look} />
        <KnowYourselfCard look={look} />
        <ThinkingPuzzlesCard look={look} />
        <NextTurnCard look={look} />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1.65fr 1fr' }, alignItems: 'start' }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <LittlePanel title={look.words.courses} color={art.ribbon} to={`${S}/courses`}>
            {d.courses.length === 0 ? (
              <Typography sx={{ fontWeight: 800, p: 2 }}>Your teacher will add lessons soon.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
                {d.courses.map((cp, i) => (
                  <LittleCourseCard key={cp.course._id} look={look} cp={cp} color={look.tiles[i % look.tiles.length]} />
                ))}
              </Box>
            )}
          </LittlePanel>
          {tasks.length > 0 && (
            <LittlePanel title={look.words.assignments} color="#23A55A" to={`${S}/assignments`}>
              <Stack spacing={1.5}>
                {tasks.slice(0, 4).map((a) => (
                  <Card key={a._id} component={RouterLink} to={`${S}/assignments/${a._id}`} sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2, p: 1.5 }}>
                    <Box component="img" src={ICON_ART.tasks} alt="" sx={{ width: 56, height: 56, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 17 }}>{a.title}</Typography>
                      <Typography sx={{ color: d.assignments.overdue.includes(a) ? 'error.main' : 'text.secondary', fontWeight: 700 }}>{a.dueDate ? `Finish by ${dayjs(a.dueDate).format('dddd')}` : 'Any time'}</Typography>
                    </Box>
                    <ArrowForward sx={{ color: look.ink2 }} />
                  </Card>
                ))}
              </Stack>
            </LittlePanel>
          )}
        </Stack>
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          {r ? (
            <>
              <DailyRewardCard look={look} r={r} />
              <LevelCard look={look} r={r} />
              <QuestList look={look} r={r} />
            </>
          ) : (
            <Skeleton variant="rounded" height={240} />
          )}
          {look.grade <= 2 && (
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '28px',
                background: 'linear-gradient(135deg, #FFE3EC 0%, #FFD1E0 100%)',
                border: '3px solid #fff',
                p: 2.5,
                pr: { xs: 14, md: 16 },
                minHeight: 150,
                boxShadow: '0 10px 24px rgba(200,60,110,0.12)',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <Favorite sx={{ color: '#FF4D7A' }} />
                <Typography component="h2" sx={{ fontWeight: 1000, fontSize: 18, color: '#C2185B', textTransform: 'uppercase' }}>
                  Grown-up tip
                </Typography>
              </Stack>
              <Typography sx={{ color: '#6B2440', fontWeight: 700 }}>Sit with {first} for the first lesson each day and ask them to tell you one new thing they learned.</Typography>
              <Box component="img" src={art.nano} alt="" sx={{ position: 'absolute', right: -8, bottom: -14, width: { xs: 120, md: 140 }, transform: 'rotate(-6deg)' }} />
            </Box>
          )}
        </Stack>
      </Box>

      {/* Friendly promises along the bottom */}
      <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, bgcolor: 'rgba(255,255,255,0.7)', border: '3px solid #fff', borderRadius: '28px', p: 2 }}>
        {[
          { img: ICON_ART.star, title: 'Earn stars', text: 'Every lesson you finish fills your sky' },
          { img: ICON_ART.lessons, title: 'Learn every day', text: 'Short lessons made just for you' },
          { img: ICON_ART.nano, title: 'Nano helps', text: 'Stuck? Nano explains in easy words' },
        ].map((p) => (
          <Stack key={p.title} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box component="img" src={p.img} alt="" sx={{ width: 52, height: 52 }} />
            <Box>
              <Typography sx={{ fontWeight: 1000, fontSize: 15, color: art.ribbon, textTransform: 'uppercase' }}>{p.title}</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: look.ink2 }}>{p.text}</Typography>
            </Box>
          </Stack>
        ))}
      </Box>
    </>
  );
}

function LittleCourseCard({ look, cp, color }: { look: Look; cp: CourseProgress; color: string }) {
  const next = useNext(cp);
  const done = cp.unitCount > 0 && cp.completedUnits >= cp.unitCount;
  const dots = Math.min(cp.unitCount, 8);
  const filled = cp.unitCount ? Math.round((cp.completedUnits / cp.unitCount) * dots) : 0;
  return (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', border: `3px solid ${tint(color, 0.35)}` }}>
      <Box sx={{ position: 'relative' }}>
        <CourseThumb course={cp.course} height={150} />
        <ButtonBase
          component={RouterLink}
          to={next.to}
          aria-label={`${done ? 'Review' : 'Play'} ${cp.course.title}`}
          sx={{ position: 'absolute', right: 14, bottom: -26, width: 60, height: 60, borderRadius: '50%', bgcolor: done ? '#23B26D' : color, color: '#fff', border: '4px solid #fff', boxShadow: '0 4px 0 rgba(0,0,0,0.12)', '& svg': { fontSize: 36 } }}
        >
          {done ? <TaskAlt /> : <PlayArrow />}
        </ButtonBase>
      </Box>
      <CardContent sx={{ pt: 2.5 }}>
        <Typography sx={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2, pr: 7, mb: 1 }}>{cp.course.title}</Typography>
        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }} aria-label={`${cp.completedUnits} of ${cp.unitCount} lessons done`}>
          {Array.from({ length: dots }, (_, i) => (
            <StarIcon key={i} size={22} color={i < filled ? '#FFC928' : '#E7E3F0'} />
          ))}
          <Typography sx={{ ml: 1, fontWeight: 800, color: 'text.secondary', fontSize: 14 }}>
            {cp.completedUnits}/{cp.unitCount}
          </Typography>
        </Stack>
        {!done && next.next && (
          <Typography noWrap sx={{ mt: 1, color: 'text.secondary', fontWeight: 700, fontSize: 14 }}>
            Next: {next.next.title}
          </Typography>
        )}
        {done && <Typography sx={{ mt: 1, color: '#178A52', fontWeight: 900 }}>All done! Amazing!</Typography>}
        {!done && !next.next && look.band === 'little' && <Box sx={{ height: 21, mt: 1 }} />}
      </CardContent>
    </Card>
  );
}

/* ================================================================ Grades 4–7 */

function JuniorHome({ look, d, quizzes, r }: HomeProps) {
  const me = useMe();
  const current = unfinished(d);
  const next = useNext(current);
  const tasks = [...d.assignments.overdue.map((a) => ({ ...a, late: true })), ...d.assignments.pending.map((a) => ({ ...a, late: false }))];
  const earned = r?.badges.filter((b) => b.earned) ?? [];
  const upcoming = r?.badges.filter((b) => !b.earned).slice(0, Math.max(0, 5 - Math.min(earned.length, 3))) ?? [];
  return (
    <>
      <Box sx={{ position: 'relative', overflow: 'hidden', mx: 'calc(50% - 50vw)', mt: -3, background: look.hero, color: look.heroInk, mb: 3, boxShadow: `0 6px 0 ${tint(look.primary, 0.15)}` }}>
        {look.scene && <SceneArt scene={look.scene} />}
        <Box sx={{ position: 'relative', maxWidth: 1280, mx: 'auto', px: { xs: 2.5, md: 5 }, py: { xs: 3.5, md: 5 }, display: 'flex', gap: 3, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Typography sx={{ opacity: 0.85, fontWeight: 600 }}>
              {greeting()} · {look.name}
            </Typography>
            <Typography variant="h4" component="h1" sx={{ color: 'inherit', mb: 1 }}>
              Hi {firstName(me.name)}, ready for today’s quest?
            </Typography>
            <Typography sx={{ opacity: 0.9, mb: 2.5, maxWidth: 560 }}>{next.next ? `Up next in ${current?.course.title}: ${next.next.title}.` : look.tagline}</Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
              <Button variant="contained" component={RouterLink} to={next.to} startIcon={<PlayArrow />} sx={{ bgcolor: '#FFFFFF', color: look.primary, '&:hover': { bgcolor: '#F4F4F8' } }} disabled={!current}>
                {current?.completedUnits ? 'Continue' : 'Start learning'}
              </Button>
              {r && <StreakPill look={look} streak={r.streak} onDark />}
              {r && <PointsPill look={look} xp={r.xp} onDark />}
            </Stack>
          </Box>
          {look.mascot ? (
            <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
              <Mascot {...look.mascot} size={look.grade <= 5 ? 150 : 130} />
            </Box>
          ) : (
            r && (
              <Box sx={{ position: 'relative', textAlign: 'center', flexShrink: 0, minWidth: 150 }}>
                <Typography sx={{ fontSize: 13, opacity: 0.8 }}>Level</Typography>
                <Typography sx={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{r.level}</Typography>
                <LinearProgress variant="determinate" value={levelPercent(r)} sx={{ mt: 1.5, bgcolor: 'rgba(255,255,255,0.25)', '& .MuiLinearProgress-bar': { bgcolor: '#FFFFFF' } }} />
                <Typography sx={{ fontSize: 12.5, opacity: 0.8, mt: 0.75 }}>
                  {r.nextLevelAt - r.xp} XP to level {r.level + 1}
                </Typography>
              </Box>
            )
          )}
        </Box>
      </Box>
      <MissionCard look={look} />
      <KnowYourselfCard look={look} />
      <ThinkingPuzzlesCard look={look} />
      <NextTurnCard look={look} />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 3 }}>
        <Stat look={look} i={0} icon={<AutoStories />} label="Course progress" value={`${d.overallProgress ?? 0}%`} hint={`${d.courses.reduce((a, c) => a + c.completedUnits, 0)} lessons done`} />
        <Stat look={look} i={1} icon={<Assignment />} label="Assignments to do" value={tasks.length} hint={d.assignments.overdue.length ? `${d.assignments.overdue.length} overdue` : 'None overdue'} />
        <Stat look={look} i={2} icon={<Quiz />} label="Quiz average" value={d.quizzes.averagePercent == null ? '—' : `${d.quizzes.averagePercent}%`} hint={`${quizzes.length} open now`} />
        <Stat look={look} i={3} icon={<EmojiEvents />} label="Badges" value={`${earned.length}/${r?.badges.length ?? 12}`} hint={r ? `Level ${r.level}` : ''} />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ minWidth: 0 }}>
          <PanelTitle title="Continue learning" to={`${S}/courses`} action="All courses" />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' }, mb: 3 }}>
            {d.courses.map((cp) => (
              <JuniorCourseCard key={cp.course._id} look={look} cp={cp} />
            ))}
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <ListCard look={look} title={look.words.assignments} to={`${S}/assignments`} empty="All caught up!">
              {tasks.slice(0, 4).map((a) => (
                <Row
                  key={a._id}
                  to={`${S}/assignments/${a._id}`}
                  title={a.title}
                  sub={a.late ? `Overdue since ${fmtDate(a.dueDate, 'D MMM')}` : a.dueDate ? `Due ${dayjs(a.dueDate).fromNow()}` : 'No due date'}
                  tone={a.late ? '#DC2626' : look.primary}
                />
              ))}
            </ListCard>
            <ListCard look={look} title={look.words.quizzes} to={`${S}/quizzes`} empty="No open quizzes">
              {quizzes.slice(0, 4).map((x) => (
                <Row key={x._id} to={`${S}/quizzes/${x._id}`} title={x.title} sub={`${x.questionCount ?? 0} questions${x.dueDate ? ` · closes ${fmtDate(x.dueDate, 'D MMM')}` : ''}`} tone={look.accent} />
              ))}
            </ListCard>
          </Box>
        </Box>
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          {r ? (
            <>
              <QuestList look={look} r={r} />
              <DailyRewardCard look={look} r={r} />
              <Card>
                <CardContent>
                  <PanelTitle title="Badges" to={`${S}/rewards`} action="See all" dense />
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}>
                    {[...earned.slice(-3), ...upcoming].slice(0, 5).map((b) => (
                      <BadgeTile key={b.key} look={look} b={b} size="sm" />
                    ))}
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
                    {upcoming[0] ? `Next: ${upcoming[0].name}. ${upcoming[0].description}.` : 'You have earned every badge!'}
                  </Typography>
                </CardContent>
              </Card>
            </>
          ) : (
            <Skeleton variant="rounded" height={300} />
          )}
          <AnnouncementsWidget limit={2} />
        </Stack>
      </Box>
    </>
  );
}

function Stat({ look, i, icon, label, value, hint }: { look: Look; i: number; icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  const c = look.tiles[i % look.tiles.length];
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: look.band === 'senior' ? 1.5 : '12px', bgcolor: tint(c, 0.13), color: c, display: 'grid', placeItems: 'center', '& svg': { fontSize: 20 } }}>{icon}</Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: look.band === 'senior' ? 26 : 30, fontWeight: 750, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function PanelTitle({ title, to, action, dense }: { title: string; to?: string; action?: string; dense?: boolean }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: dense ? 1.5 : 2 }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      {to && action && (
        <Button component={RouterLink} to={to} size="small" endIcon={<ArrowForward />} sx={{ mr: -1 }}>
          {action}
        </Button>
      )}
    </Stack>
  );
}

function ListCard({ look, title, to, empty, children }: { look: Look; title: string; to: string; empty: string; children: ReactNode[] }) {
  return (
    <Card>
      <CardContent>
        <PanelTitle title={title} to={to} action="See all" dense />
        {children.length === 0 ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 1.5, color: 'text.secondary' }}>
            <TaskAlt sx={{ color: look.band === 'senior' ? 'text.disabled' : '#16A34A' }} />
            <Typography>{empty}</Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>{children}</Stack>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ to, title, sub, tone }: { to: string; title: string; sub: string; tone: string }) {
  return (
    <Box component={RouterLink} to={to} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.25, borderRadius: 2, textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: 'rgba(0,0,0,0.035)' } }}>
      <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: 4, bgcolor: tone, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: tone === '#DC2626' ? tone : 'text.secondary' }}>
          {sub}
        </Typography>
      </Box>
    </Box>
  );
}

function JuniorCourseCard({ look, cp }: { look: Look; cp: CourseProgress }) {
  const next = useNext(cp);
  const done = cp.unitCount > 0 && cp.completedUnits >= cp.unitCount;
  return (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <CourseThumb course={cp.course} height={look.grade <= 5 ? 110 : 96} />
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}>{cp.course.title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          {cp.completedUnits} of {cp.unitCount} lessons{refName(cp.teacher) ? ` · ${refName(cp.teacher)}` : ''}
        </Typography>
        <LinearProgress variant="determinate" value={cp.progress} color={done ? 'success' : 'primary'} />
        <Box sx={{ flex: 1, minHeight: 12 }} />
        {next.loading ? (
          <Skeleton height={36} />
        ) : (
          <Button variant={done ? 'outlined' : 'contained'} component={RouterLink} to={next.to} startIcon={done ? <EmojiEvents /> : <PlayArrow />} color={done ? 'success' : 'primary'}>
            {done ? 'Review' : cp.completedUnits ? 'Continue' : 'Start'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ================================================================ Grades 8–10 */

function SeniorHome({ look, d, quizzes, r }: HomeProps) {
  const me = useMe();
  type Due = { id: string; kind: 'Assignment' | 'Quiz'; title: string; due?: string | null; to: string; late: boolean };
  const dues: Due[] = [
    ...d.assignments.overdue.map((a) => ({ id: a._id, kind: 'Assignment' as const, title: a.title, due: a.dueDate, to: `${S}/assignments/${a._id}`, late: true })),
    ...d.assignments.pending.map((a) => ({ id: a._id, kind: 'Assignment' as const, title: a.title, due: a.dueDate, to: `${S}/assignments/${a._id}`, late: false })),
    ...quizzes.map((q) => ({ id: q._id, kind: 'Quiz' as const, title: q.title, due: q.dueDate, to: `${S}/quizzes/${q._id}`, late: false })),
  ].sort((a, b) => (a.due ? dayjs(a.due).valueOf() : Infinity) - (b.due ? dayjs(b.due).valueOf() : Infinity));
  const thisWeek = dues.filter((x) => x.late || (x.due && dayjs(x.due).isBefore(dayjs().add(7, 'day')))).length;
  const recent = d.quizzes.recent.slice(0, 6);
  const readiness = Math.round(((d.overallProgress ?? 0) + (d.quizzes.averagePercent ?? 0)) / (d.quizzes.averagePercent == null ? 1 : 2));
  return (
    <>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          mx: { xs: -2, md: -4 },
          mt: -3,
          background: look.hero,
          color: look.heroInk,
          px: { xs: 2.5, md: 5 },
          py: { xs: 3, md: 4.5 },
          mb: 3,
          display: 'flex',
          gap: 3,
          alignItems: 'center',
          boxShadow: `0 6px 0 ${tint(look.primary, 0.15)}`,
        }}
      >
        {look.scene && (
          <Box sx={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
            <SceneArt scene={look.scene} />
          </Box>
        )}
        <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Typography sx={{ opacity: 0.9, fontWeight: 700 }}>
            {greeting()} · {look.name}
          </Typography>
          <Typography variant="h4" component="h1" sx={{ color: 'inherit', mb: 0.75 }}>
            Hey {firstName(me.name)}! 👋
          </Typography>
          <Typography sx={{ opacity: 0.92, mb: 2, maxWidth: 560 }}>
            {thisWeek ? `You have ${thisWeek} thing${thisWeek === 1 ? '' : 's'} due in the next 7 days — let’s knock ${thisWeek === 1 ? 'it' : 'them'} out!` : `Nothing due this week. ${look.tagline}`}
          </Typography>
          <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
            {dues[0] && (
              <Button
                variant="contained"
                component={RouterLink}
                to={dues[0].to}
                startIcon={<PlayArrow />}
                sx={{ bgcolor: '#FFFFFF', color: look.primary, boxShadow: '0 3px 0 rgba(0,0,0,0.15)', '&:hover': { bgcolor: '#F4F4F8', boxShadow: '0 3px 0 rgba(0,0,0,0.15)' } }}
              >
                Start: {dues[0].title.length > 28 ? `${dues[0].title.slice(0, 28)}…` : dues[0].title}
              </Button>
            )}
            {r && <StreakPill look={look} streak={r.streak} onDark />}
            {r && <PointsPill look={look} xp={r.xp} onDark />}
          </Stack>
        </Box>
        {look.mascot && (
          <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
            <Mascot {...look.mascot} size={110} />
          </Box>
        )}
      </Box>

      <MissionCard look={look} />
      <KnowYourselfCard look={look} />
      <ThinkingPuzzlesCard look={look} />
      <NextTurnCard look={look} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 3 }}>
        <Stat look={look} i={0} icon={<AutoStories />} label="Course completion" value={`${d.overallProgress ?? 0}%`} hint={`${d.courses.length} courses`} />
        <Stat look={look} i={1} icon={<Quiz />} label="Quiz average" value={d.quizzes.averagePercent == null ? '—' : `${d.quizzes.averagePercent}%`} hint={`${d.quizzes.count} attempts`} />
        <Stat
          look={look}
          i={2}
          icon={<Assignment />}
          label="Assignment grades"
          value={d.assignments.averagePercent == null ? '—' : `${d.assignments.averagePercent}%`}
          hint={`${d.assignments.graded} graded · ${d.assignments.overdue.length} overdue`}
        />
        <Stat look={look} i={3} icon={<TaskAlt />} label="Attendance" value={d.attendance.percent == null ? '—' : `${d.attendance.percent}%`} hint={`${d.attendance.present} of ${d.attendance.days} days`} />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Card>
            <CardContent>
              <PanelTitle title="Up next" />
              {dues.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', py: 1 }}>No assignments or quizzes waiting. A good time to revise.</Typography>
              ) : (
                <Box>
                  {dues.slice(0, 6).map((x, i) => (
                    <Box
                      key={`${x.kind}${x.id}`}
                      component={RouterLink}
                      to={x.to}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr auto', sm: '96px 1fr 150px' },
                        gap: 2,
                        alignItems: 'center',
                        py: 1.25,
                        borderTop: i ? `1px solid ${look.line}` : 'none',
                        color: 'inherit',
                        textDecoration: 'none',
                        '&:hover .t': { color: look.primary === '#18181B' ? look.accent : look.primary },
                      }}
                    >
                      <Chip size="small" label={x.kind} sx={{ display: { xs: 'none', sm: 'inline-flex' }, justifySelf: 'start', bgcolor: x.kind === 'Quiz' ? tint(look.accent, 0.14) : look.soft, color: look.ink }} />
                      <Typography className="t" noWrap sx={{ fontWeight: 500 }}>
                        {x.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: x.late ? 'error.main' : 'text.secondary', textAlign: 'right', fontWeight: x.late ? 600 : 400 }}>
                        {x.late ? 'Overdue' : x.due ? `${dayjs(x.due).format('ddd D MMM')} · ${dayjs(x.due).fromNow(true)}` : 'No due date'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <PanelTitle title="Courses" to={`${S}/courses`} action="All courses" />
              {d.courses.map((cp, i) => (
                <SeniorCourseRow key={cp.course._id} look={look} cp={cp} first={i === 0} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <PanelTitle title="Recent quiz scores" to={`${S}/progress`} action={look.words.progress} />
              {recent.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>Your scores will appear here after your first quiz.</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {recent.map((a) => (
                    <Box key={a._id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 48px', sm: '1fr 200px 48px' }, gap: 2, alignItems: 'center' }}>
                      <Typography noWrap variant="body2">
                        {refName(a.quizId)}{' '}
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          · {fmtDate(a.submittedAt, 'D MMM')}
                        </Box>
                      </Typography>
                      <LinearProgress variant="determinate" value={a.percent} color={a.percent >= 75 ? 'success' : a.percent >= 50 ? 'primary' : 'warning'} sx={{ display: { xs: 'none', sm: 'block' } }} />
                      <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {a.percent}%
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>

        <Stack spacing={3} sx={{ minWidth: 0 }}>
          {look.grade === 10 && (
            <Card sx={{ bgcolor: '#18181B', color: '#FAFAF9', borderColor: '#18181B' }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: '#FBBF24', fontWeight: 600 }}>
                  Board year
                </Typography>
                <Typography variant="h6" component="h2" sx={{ color: 'inherit', mb: 1.5 }}>
                  Exam readiness
                </Typography>
                <Typography sx={{ fontSize: 44, fontWeight: 650, lineHeight: 1, letterSpacing: '-0.03em' }}>{readiness}%</Typography>
                <LinearProgress variant="determinate" value={readiness} sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.14)', '& .MuiLinearProgress-bar': { bgcolor: '#FBBF24' } }} />
                <Typography variant="body2" sx={{ color: 'rgba(250,250,249,0.7)' }}>
                  Based on how much of your syllabus you have covered and your quiz scores. Aim for 80% before revision week.
                </Typography>
              </CardContent>
            </Card>
          )}
          {r && (
            <Card>
              <CardContent>
                <PanelTitle title={look.words.rewards} to={`${S}/rewards`} action="View" dense />
                <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Level
                    </Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 650 }}>{r.level}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Study streak
                    </Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 650 }}>{r.streak}d</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Badges
                    </Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 650 }}>
                      {r.badges.filter((b) => b.earned).length}/{r.badges.length}
                    </Typography>
                  </Box>
                </Stack>
                <LinearProgress variant="determinate" value={levelPercent(r)} />
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
                  {r.nextLevelAt - r.xp} XP to level {r.level + 1}
                  {r.daily.canClaim ? ' · daily reward ready' : ''}
                </Typography>
              </CardContent>
            </Card>
          )}
          {d.remarks.length > 0 && (
            <Card>
              <CardContent>
                <PanelTitle title="Teacher feedback" dense />
                <Stack spacing={1.5}>
                  {d.remarks.slice(0, 3).map((x) => (
                    <Box key={x._id}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <RemarkChip category={x.category} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {refName(x.teacherId)} · {fmtDate(x.createdAt, 'D MMM')}
                        </Typography>
                      </Stack>
                      <Typography variant="body2">{x.text}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
          <EventsWidget events={d.upcomingEvents} />
          <AnnouncementsWidget limit={3} />
        </Stack>
      </Box>
    </>
  );
}

function SeniorCourseRow({ look, cp, first }: { look: Look; cp: CourseProgress; first: boolean }) {
  const next = useNext(cp);
  const done = cp.unitCount > 0 && cp.completedUnits >= cp.unitCount;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: '1fr 180px auto' }, gap: 2, alignItems: 'center', py: 1.5, borderTop: first ? 'none' : `1px solid ${look.line}` }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 600 }}>
          {cp.course.title}
        </Typography>
        <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>
          {done ? 'Completed' : next.next ? `Next: ${next.next.title}` : `${cp.unitCount} lessons`}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', display: { xs: 'none', sm: 'flex' } }}>
        <LinearProgress variant="determinate" value={cp.progress} sx={{ flex: 1 }} color={done ? 'success' : 'primary'} />
        <Typography variant="body2" sx={{ width: 36, textAlign: 'right', color: 'text.secondary' }}>
          {cp.progress}%
        </Typography>
      </Stack>
      <Button size="small" variant={done ? 'text' : 'outlined'} component={RouterLink} to={next.to}>
        {done ? 'Review' : cp.completedUnits ? 'Continue' : 'Start'}
      </Button>
    </Box>
  );
}
