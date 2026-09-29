import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutlined';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import Send from '@mui/icons-material/Send';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import AddComment from '@mui/icons-material/AddCommentOutlined';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { type AiChat, type Course, type CourseDetail, type Paged, type UnitDetail, type UnitType } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { CardGrid, Empty, Loading, PageHeader, Progress, QueryState, RichText, StatusChip, fromNow } from '@/components/ui';
import { useBase } from './CommonPages';

export const UNIT_ICON: Record<UnitType, React.ReactNode> = {
  lesson: <ArticleOutlined fontSize="small" />,
  video: <PlayCircleOutline fontSize="small" />,
  pdf: <PictureAsPdfOutlined fontSize="small" />,
  activity: <ConstructionOutlined fontSize="small" />,
  link: <LinkOutlined fontSize="small" />,
};

const GRADIENTS = ['#3F3DBF,#6B69E0', '#F28B30,#F6B26B', '#2E9D61,#6CC99A', '#C2417B,#E77FAE', '#1C7FB5,#5FB3E0'];
export function CourseThumb({ course, height = 110 }: { course: Pick<Course, '_id' | 'title' | 'thumbnailUrl' | 'category'>; height?: number }) {
  const g = GRADIENTS[parseInt(course._id.slice(-2), 16) % GRADIENTS.length];
  return course.thumbnailUrl ? (
    <Box component="img" src={course.thumbnailUrl} alt="" sx={{ width: '100%', height, objectFit: 'cover', display: 'block' }} />
  ) : (
    <Box sx={{ height, background: `linear-gradient(135deg, ${g})`, color: '#fff', p: 2, display: 'flex', alignItems: 'flex-end' }}>
      <Typography variant="overline" sx={{ opacity: 0.9, fontWeight: 700 }}>
        {course.category ?? 'Course'}
      </Typography>
    </Box>
  );
}

export function CourseCard({ course, to, showProgress }: { course: Course; to: string; showProgress?: boolean }) {
  return (
    <Card sx={{ overflow: 'hidden', height: '100%' }}>
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <CourseThumb course={course} />
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {course.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {course.grades?.length ? `Grades ${course.grades.join(', ')} · ` : ''}
            {course.unitCount ?? 0} units
          </Typography>
          {showProgress && (
            <Box sx={{ mt: 1.5 }}>
              <Progress value={course.progress ?? 0} />
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/** Course catalogue for any role (the API returns only courses the user may open). */
export function CoursesPage({ title = 'Courses', subtitle }: { title?: string; subtitle?: string }) {
  const me = useMe();
  const base = useBase();
  const [q, setQ] = useState('');
  const query = useGet<Paged<Course>>('/courses', { q: q || undefined, limit: 100 });
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<TextField placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} sx={{ width: 240 }} />} />
      <QueryState q={query} empty={(d) => !d.items.length}>
        {(d) => (
          <CardGrid min={250}>
            {d.items.map((c) => (
              <CourseCard key={c._id} course={c} to={`${base}/courses/${c._id}`} showProgress={me.role === 'student'} />
            ))}
          </CardGrid>
        )}
      </QueryState>
    </>
  );
}

/** Course outline: chapters, units and quizzes, with the student's progress. */
export function CourseViewPage() {
  const { id } = useParams();
  const me = useMe();
  const base = useBase();
  const [params] = useSearchParams();
  const studentId = params.get('studentId') ?? undefined;
  const q = useGet<CourseDetail>(`/courses/${id}`, studentId ? { studentId } : undefined);
  return (
    <QueryState q={q}>
      {(c) => {
        const firstOpen = c.chapters.flatMap((ch) => ch.units).find((u) => !u.completed) ?? c.chapters[0]?.units[0];
        return (
          <>
            <Breadcrumbs sx={{ mb: 1 }}>
              <Link component={RouterLink} to={`${base}/courses`} underline="hover" color="inherit">
                Courses
              </Link>
              <Typography color="text.primary">{c.title}</Typography>
            </Breadcrumbs>
            <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' } }}>
                <CourseThumb course={c} height={200} />
                <Box sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    {c.category && <Chip size="small" label={c.category} />}
                    {c.level && <Chip size="small" variant="outlined" label={c.level} sx={{ textTransform: 'capitalize' }} />}
                    {me.role === 'super_admin' && <StatusChip status={c.status} />}
                  </Stack>
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {c.title}
                  </Typography>
                  <RichText html={c.description} sx={{ color: 'text.secondary' }} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2, alignItems: { sm: 'center' } }}>
                    <Typography variant="body2" color="text.secondary">
                      {c.chapters.length} chapters · {c.unitCount} units{c.grades?.length ? ` · Grades ${c.grades.join(', ')}` : ''}
                    </Typography>
                    {(me.role === 'student' || studentId) && (
                      <Box sx={{ width: 220 }}>
                        <Progress value={c.progress} />
                      </Box>
                    )}
                    {me.role === 'student' && firstOpen && (
                      <Button variant="contained" component={RouterLink} to={`${base}/units/${firstOpen._id}`}>
                        {c.completedUnits ? 'Continue learning' : 'Start course'}
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Box>
            </Paper>
            {c.chapters.length === 0 && <Empty title="No chapters yet" />}
            {c.chapters.map((ch, i) => {
              const done = ch.units.filter((u) => u.completed).length;
              return (
                <Accordion key={ch._id} defaultExpanded={i === 0} disableGutters variant="outlined" sx={{ mb: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 650 }}>
                        Chapter {i + 1}: {ch.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ch.units.length} units{me.role === 'student' || studentId ? ` · ${done} done` : ''}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense disablePadding>
                      {ch.units.map((u) => (
                        <ListItemButton key={u._id} component={RouterLink} to={`${base}/units/${u._id}`} sx={{ borderRadius: 1 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {me.role === 'student' || studentId ? u.completed ? <CheckCircle color="success" fontSize="small" /> : <RadioButtonUnchecked fontSize="small" color="disabled" /> : UNIT_ICON[u.type]}
                          </ListItemIcon>
                          <ListItemText primary={u.title} secondary={`${u.type} · ${u.durationMin ?? 10} min`} slotProps={{ secondary: { sx: { textTransform: 'capitalize' } } }} />
                        </ListItemButton>
                      ))}
                      {c.quizzes
                        .filter((qz) => qz.chapterId === ch._id)
                        .map((qz) => (
                          <ListItemButton key={qz._id} component={RouterLink} to={`${base}/quizzes/${qz._id}`}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <QuizOutlined fontSize="small" color="secondary" />
                            </ListItemIcon>
                            <ListItemText primary={qz.title} secondary={`Quiz · ${qz.questionCount} questions`} />
                          </ListItemButton>
                        ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              );
            })}
            {c.quizzes.filter((qz) => !qz.chapterId).length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Course quizzes
                </Typography>
                <List dense disablePadding>
                  {c.quizzes
                    .filter((qz) => !qz.chapterId)
                    .map((qz) => (
                      <ListItemButton key={qz._id} component={RouterLink} to={`${base}/quizzes/${qz._id}`}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <QuizOutlined fontSize="small" color="secondary" />
                        </ListItemIcon>
                        <ListItemText primary={qz.title} secondary={`${qz.questionCount} questions${qz.timeLimitMin ? ` · ${qz.timeLimitMin} min` : ''}`} />
                      </ListItemButton>
                    ))}
                </List>
              </Paper>
            )}
          </>
        );
      }}
    </QueryState>
  );
}

export const toEmbed = (url?: string) => {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm && !url.includes('player.vimeo.com')) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
};

/** Unit viewer with completion tracking and "Ask NanoBot". */
export function UnitPage() {
  const { id } = useParams();
  const me = useMe();
  const base = useBase();
  const navigate = useNavigate();
  const toast = useToast();
  const q = useGet<UnitDetail>(`/units/${id}`);
  const complete = useSend<{ done: boolean }>('post', () => `/units/${id}/complete`, { invalidate: [`/units/${id}`, '/courses', '/dashboard', '/rewards'] });
  const undo = useSend<{ done: boolean }>('delete', () => `/units/${id}/complete`, { invalidate: [`/units/${id}`, '/courses', '/dashboard', '/rewards'] });
  const askBot = async () => {
    try {
      const r = await api.post<AiChat>('/ai/chats', { unitId: id });
      navigate(`${base}/nanobot?chat=${r.data._id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <QueryState q={q}>
      {(u) => (
        <Box sx={{ maxWidth: 960 }}>
          <Breadcrumbs sx={{ mb: 1 }}>
            <Link component={RouterLink} to={`${base}/courses`} underline="hover" color="inherit">
              Courses
            </Link>
            <Link component={RouterLink} to={`${base}/courses/${u.course._id}`} underline="hover" color="inherit">
              {u.course.title}
            </Link>
            <Typography color="text.primary">{u.chapter.title}</Typography>
          </Breadcrumbs>
          <PageHeader
            title={u.title}
            subtitle={`${u.type[0].toUpperCase()}${u.type.slice(1)} · about ${u.durationMin ?? 10} minutes`}
            actions={
              me.role !== 'super_admin' && (
                <Button variant="outlined" startIcon={<SmartToyOutlined />} onClick={askBot}>
                  Ask NanoBot
                </Button>
              )
            }
          />
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, mb: 3 }}>
            {u.summary && (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {u.summary}
              </Typography>
            )}
            {u.videoUrl && (
              <Box sx={{ position: 'relative', pt: '56.25%', mb: 3, borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
                {/\.(mp4|webm)$/i.test(u.videoUrl) ? (
                  <Box component="video" src={u.videoUrl} controls sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                ) : (
                  <Box component="iframe" src={toEmbed(u.videoUrl)} title={u.title} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                )}
              </Box>
            )}
            <RichText html={u.body} />
            {u.fileUrl && (
              <Box sx={{ mt: 3 }}>
                {/\.pdf$/i.test(u.fileUrl) && <Box component="iframe" src={u.fileUrl} title="PDF" sx={{ width: '100%', height: 600, border: '1px solid #E4E6F0', borderRadius: 1, mb: 1 }} />}
                <Button variant="outlined" startIcon={<PictureAsPdfOutlined />} href={u.fileUrl} target="_blank" rel="noopener">
                  Open file
                </Button>
              </Box>
            )}
            {u.linkUrl && (
              <Button sx={{ mt: 2 }} variant="outlined" startIcon={<LinkOutlined />} href={u.linkUrl} target="_blank" rel="noopener">
                Open activity link
              </Button>
            )}
          </Paper>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Button startIcon={<ArrowBack />} disabled={!u.prev} component={RouterLink} to={u.prev ? `${base}/units/${u.prev._id}` : '#'}>
              {u.prev ? u.prev.title : 'Previous'}
            </Button>
            {me.role === 'student' &&
              (u.completed ? (
                <Button color="success" startIcon={<CheckCircle />} onClick={() => undo.mutate({ done: false })}>
                  Completed · undo
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  disabled={complete.isPending}
                  onClick={() =>
                    complete.mutate(
                      { done: true },
                      {
                        onSuccess: () => {
                          toast.success('Unit completed!');
                          if (u.next) navigate(`${base}/units/${u.next._id}`);
                        },
                      },
                    )
                  }
                >
                  Mark complete{u.next ? ' & continue' : ''}
                </Button>
              ))}
            <Button endIcon={<ArrowForward />} disabled={!u.next} component={RouterLink} to={u.next ? `${base}/units/${u.next._id}` : '#'}>
              {u.next ? u.next.title : 'Next'}
            </Button>
          </Stack>
        </Box>
      )}
    </QueryState>
  );
}

/* --------------------------------------------------------------- NanoBot */

export function NanoBotPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const chatId = params.get('chat');
  const qc = useQueryClient();
  const toast = useToast();
  const chats = useGet<AiChat[]>('/ai/chats');
  const chat = useGet<AiChat>(chatId ? `/ai/chats/${chatId}` : null);
  const usage = useGet<{ provider: string; used: number; limit: number | null; mine: number }>('/ai/usage');
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [chat.data?.messages?.length, pending]);

  const newChat = async () => {
    const r = await api.post<AiChat>('/ai/chats', {});
    await qc.invalidateQueries({ queryKey: ['/ai/chats'] });
    setParams({ chat: r.data._id });
    return r.data._id;
  };
  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    setPending(content);
    try {
      const id = chatId ?? (await newChat());
      await api.post(`/ai/chats/${id}/messages`, { content });
      await Promise.all([qc.invalidateQueries({ queryKey: [`/ai/chats/${id}`] }), qc.invalidateQueries({ queryKey: ['/ai/chats'] }), qc.invalidateQueries({ queryKey: ['/ai/usage'] }), qc.invalidateQueries({ queryKey: ['/rewards/me'] })]);
    } catch (err) {
      toast.error(errorMessage(err));
      setText(content);
    } finally {
      setPending(null);
    }
  };
  const remove = useSend('delete', (id: string) => `/ai/chats/${id}`, { invalidate: ['/ai/chats'], onSuccess: () => setParams({}) });

  const messages = chat.data?.messages ?? [];
  return (
    <>
      <PageHeader
        title="NanoBot"
        subtitle={me.role === 'teacher' ? 'Your AI teaching assistant' : 'Your AI study buddy. Ask about any lesson!'}
        actions={
          usage.data?.limit ? (
            <Chip label={`AI allowance: ${Math.max(0, Math.round(100 - (usage.data.used / usage.data.limit) * 100))}% left this month`} variant="outlined" />
          ) : undefined
        }
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 2, height: { md: 'calc(100vh - 230px)' } }}>
        <Paper variant="outlined" sx={{ p: 1, overflowY: 'auto', display: { xs: chatId ? 'none' : 'block', md: 'block' } }}>
          <Button fullWidth variant="contained" startIcon={<AddComment />} onClick={newChat} sx={{ mb: 1 }}>
            New chat
          </Button>
          {chats.isLoading ? (
            <Loading />
          ) : (
            <List dense>
              {(chats.data ?? []).map((c) => (
                <ListItemButton key={c._id} selected={c._id === chatId} onClick={() => setParams({ chat: c._id })} sx={{ borderRadius: 1 }}>
                  <ListItemText primary={c.title} secondary={c.unitId ? `${(c.unitId as { title?: string }).title} · ${fromNow(c.updatedAt)}` : fromNow(c.updatedAt)} slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }} />
                  <IconButton size="small" edge="end" aria-label="Delete chat" onClick={(e) => { e.stopPropagation(); remove.mutate(c._id); }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minHeight: 480 }}>
          {chat.data && (chat.data.unitId || chat.data.courseId) && (
            <Alert severity="info" icon={<SmartToyOutlined />} sx={{ borderRadius: 0 }}>
              Talking about: {(chat.data.unitId as { title?: string } | null)?.title ?? (chat.data.courseId as { title?: string } | null)?.title}
            </Alert>
          )}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {!messages.length && !pending && (
              <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 6 }} spacing={1}>
                <SmartToyOutlined sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6">Hi {me.name.split(' ')[0]}! I am NanoBot.</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
                  Ask me to explain a lesson, give you a practice question, or help debug your robot code.
                </Typography>
              </Stack>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} mine={m.role === 'user'} text={m.content} />
            ))}
            {pending && (
              <>
                <Bubble mine text={pending} />
                <Bubble mine={false} text="NanoBot is thinking…" muted />
              </>
            )}
            <div ref={endRef} />
          </Box>
          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: '1px solid #E4E6F0' }}>
            <TextField
              placeholder="Type your question…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              multiline
              maxRows={4}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <Button variant="contained" onClick={send} disabled={!text.trim() || !!pending} aria-label="Send">
              <Send />
            </Button>
          </Stack>
        </Paper>
      </Box>
      {chat.error ? <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(chat.error)}</Alert> : null}
    </>
  );
}

function Bubble({ mine, text, muted }: { mine: boolean; text: string; muted?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1.5 }}>
      <Box
        sx={{
          maxWidth: '78%',
          px: 2,
          py: 1.25,
          borderRadius: 3,
          whiteSpace: 'pre-wrap',
          bgcolor: mine ? 'primary.main' : '#F0F1F8',
          color: mine ? '#fff' : muted ? 'text.secondary' : 'text.primary',
          fontStyle: muted ? 'italic' : 'normal',
        }}
      >
        {text}
      </Box>
    </Box>
  );
}
