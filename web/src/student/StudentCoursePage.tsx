/**
 * A course, as a student sees it: a hero with the next step, what you'll learn, and the chapters
 * as a learning path (done → next → later). Styled by the grade's look.
 */
import { Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import SlideshowOutlined from '@mui/icons-material/SlideshowOutlined';
import AnimationOutlined from '@mui/icons-material/AnimationOutlined';
import CollectionsOutlined from '@mui/icons-material/CollectionsOutlined';
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import { useMemo, type ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import type { CourseDetail, UnitType } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { QueryState } from '@/components/ui';
import { tint, type Look } from './looks';
import { useLook } from './useLook';
import { S } from './widgets';

const TYPE: Record<UnitType, { label: string; icon: ReactNode }> = {
  lesson: { label: 'Lesson', icon: <ArticleOutlined /> },
  video: { label: 'Video', icon: <PlayCircleOutline /> },
  pdf: { label: 'Reading', icon: <PictureAsPdfOutlined /> },
  activity: { label: 'Activity', icon: <ConstructionOutlined /> },
  link: { label: 'Link', icon: <LinkOutlined /> },
  presentation: { label: 'Slides', icon: <SlideshowOutlined /> },
  motion: { label: 'Animation', icon: <AnimationOutlined /> },
  gallery: { label: 'Pictures', icon: <CollectionsOutlined /> },
  sim3d: { label: '3D simulation', icon: <ViewInArOutlined /> },
};

/** Splits the course description into an intro and the "You will learn to" bullet points. */
function splitDescription(html?: string) {
  if (!html) return { intro: '', goals: [] as string[] };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const goals = [...doc.querySelectorAll('li')].map((li) => li.textContent?.trim() ?? '').filter(Boolean);
  const paras = [...doc.querySelectorAll('p')].map((p) => p.textContent?.trim() ?? '').filter((t) => t && !/^you will learn/i.test(t));
  const intro = paras.join(' ') || (goals.length ? '' : (doc.body.textContent ?? '').trim());
  return { intro, goals };
}

const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

export function StudentCoursePage() {
  const { id } = useParams();
  const look = useLook();
  const q = useGet<CourseDetail>(`/courses/${id}`);
  return <QueryState q={q}>{(c) => <CourseView c={c} look={look} />}</QueryState>;
}

function ProgressRing({ value, size = 76, color, track, ink }: { value: number; size?: number; color: string; track: string; ink: string }) {
  const r = (size - 8) / 2;
  const len = 2 * Math.PI * r;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} role="img" aria-label={`${value}% complete`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size / 4.4, color: ink }}>{value}%</Box>
    </Box>
  );
}

function CourseView({ c, look }: { c: CourseDetail; look: Look }) {
  const little = look.band === 'little';
  const units = c.chapters.flatMap((ch) => ch.units);
  const next = units.find((u) => !u.completed);
  const done = units.filter((u) => u.completed).length;
  const pct = units.length ? Math.round((done / units.length) * 100) : 0;
  const left = units.filter((u) => !u.completed).reduce((n, u) => n + (u.durationMin ?? 10), 0);
  const total = units.reduce((n, u) => n + (u.durationMin ?? 10), 0);
  const { intro, goals } = useMemo(() => splitDescription(c.description), [c.description]);
  const courseQuizzes = c.quizzes.filter((qz) => !qz.chapterId);
  const r = `${look.radius}px`;

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      <Button component={RouterLink} to={`${S}/courses`} startIcon={<ArrowBackRounded />} sx={{ mb: 1.5, color: look.ink2, fontWeight: 600 }}>
        {look.words.courses}
      </Button>

      {/* Hero */}
      <Box sx={{ borderRadius: r, overflow: 'hidden', background: look.hero, color: look.heroInk, mb: 3, position: 'relative' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' }, alignItems: 'stretch' }}>
          <Box sx={{ p: { xs: 3, md: 4.5 } }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              {c.category && <Box sx={{ px: 1.25, py: 0.4, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.18)', fontSize: 13, fontWeight: 700 }}>{c.category}</Box>}
              {c.level && <Box sx={{ px: 1.25, py: 0.4, borderRadius: 999, border: '1px solid rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{c.level}</Box>}
              {!!c.grades?.length && <Box sx={{ px: 1.25, py: 0.4, borderRadius: 999, border: '1px solid rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>Grade {c.grades.join(', ')}</Box>}
            </Stack>
            <Typography component="h1" sx={{ fontSize: { xs: 30, md: little ? 44 : 38 }, fontWeight: look.headingWeight, lineHeight: 1.1, mb: 1.5, color: 'inherit' }}>
              {c.title}
            </Typography>
            {intro && <Typography sx={{ opacity: 0.9, fontSize: little ? 19 : 16.5, lineHeight: 1.55, maxWidth: 620, mb: 3 }}>{intro}</Typography>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              {next ? (
                <Button
                  size="large"
                  variant="contained"
                  component={RouterLink}
                  to={`${S}/units/${next._id}`}
                  startIcon={<PlayArrowRounded />}
                  sx={{ bgcolor: '#fff', color: look.ink, fontWeight: 800, px: 3, '&:hover': { bgcolor: '#F4F4FA' }, alignSelf: { xs: 'stretch', sm: 'auto' } }}
                >
                  {done ? 'Continue' : little ? "Let's start!" : 'Start course'}
                </Button>
              ) : (
                <Box sx={{ px: 2, py: 1, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>🎉 Course complete</Box>
              )}
              <Typography sx={{ opacity: 0.85, fontSize: 14.5 }}>
                {c.chapters.length} chapters · {units.length} units · {minutes(total)}
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ position: 'relative', minHeight: { xs: 180, md: '100%' }, display: { xs: 'none', sm: 'block' } }}>
            {c.thumbnailUrl ? (
              <Box component="img" src={c.thumbnailUrl} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', maskImage: { md: 'linear-gradient(90deg, transparent 0%, #000 35%)' } }} />
            ) : (
              <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 110, opacity: 0.35 }}>📘</Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' }, alignItems: 'start' }}>
        {/* Main column */}
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          {next && (
            <Card sx={{ borderRadius: r, border: `2px solid ${tint(look.primary, 0.35)}`, boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2.25, md: 2.75 }, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', '&:last-child': { pb: { xs: 2.25, md: 2.75 } } }}>
                <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: tint(look.primary, 0.12), color: look.primary, display: 'grid', placeItems: 'center', '& svg': { fontSize: 28 } }}>{TYPE[next.type]?.icon}</Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: look.primary }}>Up next</Typography>
                  <Typography sx={{ fontWeight: 750, fontSize: little ? 20 : 17.5, color: look.ink }}>{next.title}</Typography>
                  <Typography variant="body2" sx={{ color: look.ink2 }}>
                    {TYPE[next.type]?.label} · {next.durationMin ?? 10} min
                  </Typography>
                </Box>
                <Button variant="contained" component={RouterLink} to={`${S}/units/${next._id}`} endIcon={<PlayArrowRounded />}>
                  {little ? 'Go!' : 'Open'}
                </Button>
              </CardContent>
            </Card>
          )}

          {goals.length > 0 && (
            <Card sx={{ borderRadius: r, boxShadow: 'none', border: `1px solid ${look.line}` }}>
              <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
                <Typography component="h2" sx={{ fontWeight: look.headingWeight, fontSize: little ? 22 : 19, mb: 2, color: look.ink }}>
                  {little ? 'You will learn to…' : 'What you’ll learn'}
                </Typography>
                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  {goals.map((g) => (
                    <Stack key={g} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                      <Box sx={{ mt: 0.25, width: 22, height: 22, borderRadius: '50%', bgcolor: tint(look.primary, 0.14), color: look.primary, display: 'grid', placeItems: 'center', flexShrink: 0, '& svg': { fontSize: 16 } }}>
                        <CheckRounded />
                      </Box>
                      <Typography sx={{ color: look.ink, fontSize: little ? 17 : 15.5, lineHeight: 1.45 }}>{g.charAt(0).toUpperCase() + g.slice(1)}</Typography>
                    </Stack>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Learning path */}
          <Box>
            <Typography component="h2" sx={{ fontWeight: look.headingWeight, fontSize: little ? 22 : 19, mb: 1.5, color: look.ink }}>
              {little ? 'Your learning path' : 'Course content'}
            </Typography>
            <Stack spacing={2}>
              {c.chapters.map((ch, i) => {
                const chDone = ch.units.filter((u) => u.completed).length;
                const chQuizzes = c.quizzes.filter((qz) => qz.chapterId === ch._id);
                const complete = ch.units.length > 0 && chDone === ch.units.length;
                return (
                  <Card key={ch._id} sx={{ borderRadius: r, boxShadow: 'none', border: `1px solid ${look.line}`, overflow: 'hidden' }}>
                    <Box sx={{ px: { xs: 2, md: 2.75 }, py: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: complete ? tint('#2F9E44', 0.06) : tint(look.primary, 0.04), borderBottom: `1px solid ${look.line}` }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 17, bgcolor: complete ? '#2F9E44' : look.primary, color: '#fff', flexShrink: 0 }}>
                        {complete ? <CheckRounded /> : i + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: look.ink2 }}>Chapter {i + 1}</Typography>
                        <Typography sx={{ fontWeight: 750, fontSize: little ? 19 : 16.5, color: look.ink }}>{ch.title}</Typography>
                      </Box>
                      <Box sx={{ width: { xs: 70, sm: 130 }, textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: look.ink2, fontWeight: 600 }}>
                          {chDone}/{ch.units.length} done
                        </Typography>
                        <LinearProgress variant="determinate" value={ch.units.length ? (chDone / ch.units.length) * 100 : 0} sx={{ mt: 0.5, height: 6, borderRadius: 999, bgcolor: look.line, '& .MuiLinearProgress-bar': { bgcolor: complete ? '#2F9E44' : look.primary, borderRadius: 999 } }} />
                      </Box>
                    </Box>
                    <Box sx={{ py: 0.75 }}>
                      {ch.units.map((u, k) => {
                        const isNext = next?._id === u._id;
                        const last = k === ch.units.length - 1 && !chQuizzes.length;
                        return (
                          <Box
                            key={u._id}
                            component={RouterLink}
                            to={`${S}/units/${u._id}`}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2, md: 2.75 }, py: 1.25, textDecoration: 'none', color: 'inherit', position: 'relative', bgcolor: isNext ? tint(look.primary, 0.06) : 'transparent', '&:hover': { bgcolor: tint(look.primary, 0.08) } }}
                          >
                            {/* path line */}
                            <Box sx={{ position: 'relative', width: 40, display: 'flex', justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center', flexShrink: 0 }}>
                              {!last && <Box sx={{ position: 'absolute', top: '50%', bottom: -14, width: 2, bgcolor: u.completed ? '#B7E4C2' : look.line }} />}
                              <Box
                                sx={{
                                  position: 'relative',
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  display: 'grid',
                                  placeItems: 'center',
                                  bgcolor: u.completed ? '#2F9E44' : isNext ? look.primary : '#fff',
                                  border: u.completed || isNext ? 'none' : `2px solid ${look.line}`,
                                  color: u.completed || isNext ? '#fff' : look.ink2,
                                  '& svg': { fontSize: 17 },
                                  boxShadow: isNext ? `0 0 0 5px ${tint(look.primary, 0.18)}` : 'none',
                                }}
                              >
                                {u.completed ? <CheckRounded /> : isNext ? <PlayArrowRounded /> : <Box component="span" sx={{ fontSize: 12, fontWeight: 700 }}>{k + 1}</Box>}
                              </Box>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: isNext ? 750 : 600, color: look.ink, fontSize: little ? 17 : 15.5 }} noWrap>
                                {u.title}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: look.ink2, '& svg': { fontSize: 16 } }}>
                                {TYPE[u.type]?.icon}
                                <Typography variant="body2">
                                  {TYPE[u.type]?.label} · {u.durationMin ?? 10} min
                                </Typography>
                              </Stack>
                            </Box>
                            {isNext ? (
                              <Box sx={{ px: 1.25, py: 0.4, borderRadius: 999, bgcolor: look.primary, color: '#fff', fontSize: 12.5, fontWeight: 700 }}>{done ? 'Continue' : 'Start'}</Box>
                            ) : u.completed ? (
                              <Typography variant="caption" sx={{ color: '#2F9E44', fontWeight: 700 }}>
                                Done
                              </Typography>
                            ) : null}
                          </Box>
                        );
                      })}
                      {chQuizzes.map((qz) => (
                        <Box key={qz._id} component={RouterLink} to={`${S}/quizzes/${qz._id}`} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2, md: 2.75 }, py: 1.25, textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: tint(look.accent, 0.08) } }}>
                          <Box sx={{ width: 40, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: tint(look.accent, 0.16), color: look.accent, display: 'grid', placeItems: 'center', '& svg': { fontSize: 17 } }}>
                              <QuizOutlined />
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 650, color: look.ink }}>{qz.title}</Typography>
                            <Typography variant="body2" sx={{ color: look.ink2 }}>
                              Chapter quiz · {qz.questionCount} questions
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        </Stack>

        {/* Side column */}
        <Stack spacing={2.5} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
          <Card sx={{ borderRadius: r, boxShadow: 'none', border: `1px solid ${look.line}` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
                <ProgressRing value={pct} color={pct === 100 ? '#2F9E44' : look.primary} track={look.line} ink={look.ink} />
                <Box>
                  <Typography sx={{ fontWeight: 750, color: look.ink }}>{pct === 100 ? 'All done!' : pct ? 'Keep going!' : 'Ready when you are'}</Typography>
                  <Typography variant="body2" sx={{ color: look.ink2 }}>
                    {done} of {units.length} units done
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: look.ink2, '& svg': { fontSize: 18 } }}>
                <AccessTimeRounded />
                <Typography variant="body2">{left ? `About ${minutes(left)} left` : 'Nothing left to do'}</Typography>
              </Stack>
            </CardContent>
          </Card>

          {courseQuizzes.length > 0 && (
            <Card sx={{ borderRadius: r, boxShadow: 'none', border: `1px solid ${look.line}` }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 750, mb: 1.5, color: look.ink }}>{look.words.quizzes}</Typography>
                <Stack spacing={1}>
                  {courseQuizzes.map((qz) => (
                    <Box key={qz._id} component={RouterLink} to={`${S}/quizzes/${qz._id}`} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.25, borderRadius: '12px', textDecoration: 'none', color: 'inherit', bgcolor: tint(look.accent, 0.07), '&:hover': { bgcolor: tint(look.accent, 0.13) } }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#fff', color: look.accent, display: 'grid', placeItems: 'center' }}>
                        <QuizOutlined fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 650, fontSize: 14.5, color: look.ink }} noWrap>
                          {qz.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: look.ink2 }}>
                          {qz.questionCount} questions{qz.timeLimitMin ? ` · ${qz.timeLimitMin} min` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card sx={{ borderRadius: r, boxShadow: 'none', bgcolor: look.soft, border: `1px solid ${look.line}` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                <SmartToyOutlined sx={{ color: look.primary }} />
                <Typography sx={{ fontWeight: 750, color: look.ink }}>Stuck on something?</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: look.ink2, mb: 1.5 }}>
                Ask {look.words.nanobot} to explain any part of this course in a different way.
              </Typography>
              <Button size="small" variant="outlined" component={RouterLink} to={`${S}/nanobot`}>
                {look.words.nanobot}
              </Button>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}
