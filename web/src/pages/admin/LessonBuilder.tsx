/**
 * Lesson builder: a full-screen workspace for creating and editing a learning unit.
 *
 *   top bar     course › chapter, unit title, save state, Preview, Save
 *   left rail   the five steps with a tick when each is done
 *   centre      the step being edited
 *   right       "Ready for students" checklist, and on the Content step ready-made lesson blocks
 *
 * Ctrl/Cmd+S saves. Closing with unsaved changes asks first.
 */
import { Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, LinearProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import SlideshowOutlined from '@mui/icons-material/SlideshowOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import EmojiObjectsOutlined from '@mui/icons-material/EmojiObjectsOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import ArrowBack from '@mui/icons-material/ArrowBack';
import DesktopWindowsOutlined from '@mui/icons-material/DesktopWindowsOutlined';
import PhoneIphoneOutlined from '@mui/icons-material/PhoneIphoneOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import AnimationOutlined from '@mui/icons-material/AnimationOutlined';
import CollectionsOutlined from '@mui/icons-material/CollectionsOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import { MotionPlayer, MOTION_KIND_LABEL, motionKind } from '@/components/MotionPlayer';
import { GalleryView } from '@/components/GalleryView';
import { Sim3DPlayer, isModelFile } from '@/components/Sim3DPlayer';
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined';
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BlockKind, Chapter, Course, GalleryImage, QuizSummary, Unit, UnitBlock, UnitDetail, UnitType } from '@/api/types';
import { BLOCK_META, BLOCK_ORDER, blockKey, blockProblem, blocksOf, estimateMinutes, newBlock, textOf } from '@/lib/unitBlocks';
import { BLOCK_ICON, UnitBlocksView } from '@/components/UnitBlocksView';
import { QuickCheck } from '@/components/QuickCheck';
import { LanguagesPanel } from '@/components/TranslationsPanel';
import TranslateOutlined from '@mui/icons-material/TranslateOutlined';
import { BlockAiDialog, runBlockAi, type BlockAiResult } from '@/components/BlockAi';
import { UnitAiPlanner, type PlanChoice } from '@/components/UnitAiPlanner';
import { newId } from '@/api/journey';
import AutoAwesome from '@mui/icons-material/AutoAwesomeRounded';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import AddRounded from '@mui/icons-material/AddRounded';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import type { Activity, Objective, Skill, Tool } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { errorMessage } from '@/api/client';
import { useToast } from '@/components/Toast';
import { RichEditor } from '@/components/RichEditor';
import { UploadButton } from '@/components/ui';
import { FormError } from '@/components/AdminCommon';
import { VideoPreview } from '@/components/VideoPreview';
import { DeckEditor } from '@/components/slides/DeckEditor';
import { ActivitiesEditor, ObjectivesEditor, journeyProblems } from '@/components/JourneyEditors';

type Step = 'setup' | 'content' | 'objectives' | 'activities' | 'languages' | 'preview';

const TYPES: {
  value: UnitType;
  label: string;
  hint: string;
  icon: ReactNode;
  color: string;
}[] = [
  {
    value: 'lesson',
    label: 'Text Editor',
    hint: 'Write with text, pictures, tables and videos',
    icon: <ArticleOutlined />,
    color: '#7C5CFA',
  },
  {
    value: 'video',
    label: 'Video',
    hint: 'A YouTube, Vimeo or .mp4 video with notes',
    icon: <PlayCircleOutline />,
    color: '#E8590C',
  },
  {
    value: 'presentation',
    label: 'Presentation',
    hint: 'Slides you build here, with AI help',
    icon: <SlideshowOutlined />,
    color: '#C04CD8',
  },
  {
    value: 'activity',
    label: 'Hands-on activity',
    hint: 'Steps to build or try, with a worksheet',
    icon: <ConstructionOutlined />,
    color: '#2F9E44',
  },
  {
    value: 'pdf',
    label: 'PDF / document',
    hint: 'A worksheet, reading or handout to open',
    icon: <PictureAsPdfOutlined />,
    color: '#D92D20',
  },
  {
    value: 'link',
    label: 'External link',
    hint: 'A website or online tool students open',
    icon: <LinkOutlined />,
    color: '#1C7ED6',
  },
  {
    value: 'motion',
    label: 'Motion graphics',
    hint: 'An animation: Lottie, GIF, looping video or embed',
    icon: <AnimationOutlined />,
    color: '#F08C00',
  },
  {
    value: 'gallery',
    label: 'Image gallery',
    hint: 'A set of pictures with captions to explore',
    icon: <CollectionsOutlined />,
    color: '#0CA678',
  },
  {
    value: 'sim3d',
    label: '3D simulation',
    hint: 'A 3D model to turn and zoom, or a PhET/Sketchfab simulation',
    icon: <ViewInArOutlined />,
    color: '#3B5BDB',
  },
];

/** Ready-made lesson blocks editors can drop in, then edit. Only uses formatting the editor keeps. */
const BLOCKS: { label: string; emoji: string; html: string }[] = [
  {
    label: 'Key idea',
    emoji: '💡',
    html: '<blockquote><p><strong>Key idea:</strong> write the one thing students must remember.</p></blockquote><p></p>',
  },
  {
    label: 'Did you know?',
    emoji: '🤔',
    html: '<blockquote><p><strong>Did you know?</strong> add a surprising fact.</p></blockquote><p></p>',
  },
  {
    label: 'Try it',
    emoji: '🔧',
    html: '<h3>Try it</h3><p><strong>You need:</strong></p><ul><li><p>item</p></li><li><p>item</p></li></ul><p><strong>Steps:</strong></p><ol><li><p>First step</p></li><li><p>Second step</p></li><li><p>What do you notice?</p></li></ol><p></p>',
  },
  {
    label: 'Vocabulary',
    emoji: '📖',
    html: '<h3>New words</h3><table><tbody><tr><th><p>Word</p></th><th><p>What it means</p></th></tr><tr><td><p>word</p></td><td><p>meaning</p></td></tr><tr><td><p>word</p></td><td><p>meaning</p></td></tr></tbody></table><p></p>',
  },
  {
    label: 'Compare',
    emoji: '⚖️',
    html: '<h3>Compare</h3><table><tbody><tr><th><p>This</p></th><th><p>That</p></th></tr><tr><td><p>point</p></td><td><p>point</p></td></tr><tr><td><p>point</p></td><td><p>point</p></td></tr></tbody></table><p></p>',
  },
  {
    label: 'Safety',
    emoji: '⚠️',
    html: '<blockquote><p><strong>Safety:</strong> say what to be careful about.</p></blockquote><p></p>',
  },
  {
    label: 'Check yourself',
    emoji: '✅',
    html: '<h3>Check yourself</h3><ol><li><p>Question one?</p></li><li><p>Question two?</p></li><li><p>Question three?</p></li></ol><p></p>',
  },
  {
    label: 'Checklist',
    emoji: '☑️',
    html: '<h3>Before you finish</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>I can …</p></li><li data-type="taskItem" data-checked="false"><p>I can …</p></li></ul><p></p>',
  },
  {
    label: 'Remember',
    emoji: '⭐',
    html: '<h3>Remember</h3><ul><li><p>point</p></li><li><p>point</p></li><li><p>point</p></li></ul><p></p>',
  },
];

export const UNIT_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

const DURATIONS = [5, 10, 15, 20, 30, 45, 60];
/** Lesson headings (minus generic ones) turned into objective ideas. */
const headingIdeas = (html?: string) =>
  Array.from((html ?? '').matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi))
    .map((m) =>
      m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .trim(),
    )
    .filter((t) => t.length > 3 && t.length < 120 && !/^(try it|remember|recap|summary|new words|check yourself|before you finish|compare)\b/i.test(t))
    .map((t) => (/\?$/.test(t) ? `Answer: ${t}` : t));

const cleanSlides = (slides: UnitBlock['slides']) =>
  (slides ?? []).map((sl) => ({
    ...sl,
    title: sl.title ?? '',
    subtitle: sl.subtitle ?? '',
    bullets: (sl.bullets ?? []).map((b) => b.trim()).filter(Boolean),
    bullets2: (sl.bullets2 ?? []).map((b) => b.trim()).filter(Boolean),
    imageUrl: sl.imageUrl ?? '',
    imageAlt: sl.imageAlt ?? '',
    notes: sl.notes ?? '',
    background: sl.background ?? '',
  }));

/** A block as the server takes it: only the fields its kind uses. */
function blockPayload(b: UnitBlock) {
  const out: Record<string, unknown> = {
    kind: b.kind,
    title: (b.title ?? '').trim(),
    body: b.body ?? '',
  };
  if (b._id) out._id = b._id;
  if (b.kind === 'video') out.videoUrl = b.videoUrl?.trim() ?? '';
  if (b.kind === 'presentation')
    Object.assign(out, {
      slides: cleanSlides(b.slides),
      deckTheme: b.deckTheme ?? 'clarity',
    });
  if (b.kind === 'pdf' || b.kind === 'activity') out.fileUrl = b.fileUrl ?? '';
  if (b.kind === 'link' || b.kind === 'activity') out.linkUrl = b.linkUrl?.trim() ?? '';
  if (b.kind === 'motion')
    Object.assign(out, {
      motionUrl: b.motionUrl?.trim() ?? '',
      motionLoop: b.motionLoop ?? true,
    });
  if (b.kind === 'gallery')
    out.gallery = (b.gallery ?? []).map((g) => ({
      ...(g._id ? { _id: g._id } : {}),
      url: g.url,
      caption: g.caption?.trim() ?? '',
      alt: g.alt?.trim() ?? '',
    }));
  if (b.kind === 'sim3d') out.simUrl = b.simUrl?.trim() ?? '';
  if (b.kind === 'check')
    Object.assign(out, {
      question: b.question?.trim() ?? '',
      choices: (b.choices ?? []).filter((c) => c.text.trim()).map((c) => ({ ...(c._id ? { _id: c._id } : {}), text: c.text.trim(), correct: !!c.correct })),
      explain: b.explain?.trim() ?? '',
      help: b.help ?? '',
    });
  return out;
}

export function LessonBuilder({ chapter, unitId, onClose }: { chapter: Chapter; unitId?: string; onClose: () => void }) {
  const toast = useToast();
  const [id, setId] = useState(unitId);
  const existing = useGet<UnitDetail>(unitId ? `/units/${unitId}` : null);
  const courseQ = useGet<Course>(`/courses/${chapter.courseId}`);
  const skills = useGet<Skill[]>('/skills');
  const quizzes = useGet<QuizSummary[]>('/quizzes', {
    courseId: chapter.courseId,
  });
  const tools = useGet<Tool[]>('/tools');

  const [u, setU] = useState<Partial<Unit> | null>(
    unitId
      ? null
      : {
          title: '',
          type: 'lesson',
          summary: '',
          body: '',
          durationMin: 15,
          blocks: [],
        },
  );
  const [objectives, setObjectives] = useState<Objective[] | null>(unitId ? null : []);
  const [activities, setActivities] = useState<Activity[] | null>(unitId ? null : []);
  const [step, setStep] = useState<Step>('setup');
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [confirmClose, setConfirmClose] = useState(false);
  // Each step starts at the top
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [step]);
  // The text editor the teacher last worked in; lesson snippets go there
  const editor = useRef<Editor | null>(null);
  const onEditor = useCallback((e: Editor | null) => {
    if (!e) return;
    editor.current = e;
    e.on('focus', () => (editor.current = e));
  }, []);

  useEffect(() => {
    if (unitId && existing.data) {
      const d = existing.data as UnitDetail & {
        objectives?: Objective[];
        activities?: Activity[];
      };
      setU((x) => x ?? { ...d, blocks: blocksOf(d) });
      setObjectives(
        (x) =>
          x ??
          (d.objectives ?? []).map((o) => ({
            ...o,
            skillIds: (o.skillIds ?? []).map(String),
          })),
      );
      setActivities(
        (x) =>
          x ??
          (d.activities ?? []).map((a) => ({
            ...a,
            objectiveIds: (a.objectiveIds ?? []).map(String),
            quizId: a.quizId ?? null,
            toolId: a.toolId ?? null,
          })),
      );
    }
  }, [unitId, existing.data]);

  const payload = useMemo(() => {
    if (!u || !objectives || !activities) return null;
    return {
      title: (u.title ?? '').trim(),
      summary: u.summary ?? '',
      // The content is the list of blocks; the older one-type fields are cleared (the server derives type and body)
      blocks: (u.blocks ?? []).map(blockPayload),
      ...((u.blocks ?? []).length ? {} : { type: 'lesson' as UnitType }),
      body: '',
      videoUrl: '',
      fileUrl: '',
      linkUrl: '',
      motionUrl: '',
      simUrl: '',
      gallery: [],
      slides: [],
      ...(u.durationMin ? { durationMin: Math.round(u.durationMin) } : {}),
      objectives: objectives.map((o) => ({
        _id: o._id,
        title: o.title.trim(),
        description: o.description ?? '',
        criteria: o.criteria ?? '',
        skillIds: o.skillIds ?? [],
        weight: o.weight ?? 1,
      })),
      activities: activities.map((a) => ({
        _id: a._id,
        kind: a.kind,
        title: a.title.trim(),
        instructions: a.instructions ?? '',
        quizId: a.kind === 'quiz' ? a.quizId : null,
        toolId: a.kind === 'tool' ? a.toolId : null,
        objectiveIds: a.objectiveIds.filter((oid) => objectives.some((o) => o._id === oid)),
        scoring: a.scoring,
        weight: a.weight ?? 1,
        required: a.required !== false,
        mediaTypes: a.mediaTypes ?? [],
      })),
    };
  }, [u, objectives, activities]);
  const snapshot = payload ? JSON.stringify(payload) : '';
  // The first complete payload is the "saved" baseline
  useEffect(() => {
    if (snapshot && !saved) setSaved(snapshot);
  }, [snapshot, saved]);
  const dirty = !!snapshot && snapshot !== saved;

  const save = useSend<Record<string, unknown>, Unit>(id ? 'patch' : 'post', id ? `/units/${id}` : `/chapters/${chapter._id}/units`, { invalidate: ['/courses', '/units'] });

  const set = (p: Partial<Unit>) => setU((x) => ({ ...x, ...p }));
  // Change blocks from the latest state (AI answers can arrive after other edits)
  const updateBlocks = useCallback((fn: (b: UnitBlock[]) => UnitBlock[]) => setU((x) => (x ? { ...x, blocks: fn(x.blocks ?? []) } : x)), []);
  // "Create the whole unit with AI": fill in the plan, then AI writes each section in the Content step
  const applyPlan = (c: PlanChoice) => {
    const made: UnitBlock[] = c.sections.map((s) => {
      const b: UnitBlock = { ...newBlock(s.kind), title: s.title, aiPending: true, aiBrief: `${s.brief}${c.prompt ? `\nThe teacher described the whole unit like this: ${c.prompt}` : ''}`, aiFiles: c.files.length ? c.files : undefined };
      // The teacher's own document is shown as it is; their pictures get AI captions
      if (s.fileUrl) return { ...b, fileUrl: s.fileUrl, body: `<p>${s.brief.replace(/[<>&]/g, '')}</p>`, aiPending: false };
      if (s.gallery?.length) return { ...b, gallery: s.gallery };
      return b;
    });
    setU((x) => (x ? { ...x, title: c.title || x.title, summary: c.summary || x.summary, durationMin: c.durationMin || x.durationMin, blocks: c.mode === 'append' ? [...(x.blocks ?? []), ...made] : made } : x));
    if (c.objectives.length) setObjectives((x) => [...(x ?? []), ...c.objectives.map((o) => ({ _id: newId(), title: o.title, criteria: o.criteria, description: '', skillIds: [], weight: 1 }))]);
    setStep('content');
    toast.success(`Unit planned — AI is writing ${made.length} section${made.length === 1 ? '' : 's'}`);
  };
  const [aiAdd, setAiAddState] = useState(() => {
    try {
      return localStorage.getItem('lb.aiAdd') === '1';
    } catch {
      return false;
    }
  });
  const setAiAdd = (v: boolean) => {
    setAiAddState(v);
    try {
      localStorage.setItem('lb.aiAdd', v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const problems = useMemo(() => {
    if (!u) return [];
    const list: { step: Step; text: string }[] = [];
    if (!u.title?.trim()) list.push({ step: 'setup', text: 'Give the learning unit a title' });
    (u.blocks ?? []).forEach((b, i) => {
      const p = blockProblem(b);
      if (p)
        list.push({
          step: 'content',
          text: `Section ${i + 1} (${BLOCK_META[b.kind].label}): ${p}, or remove the section`,
        });
    });
    if (u.durationMin != null && (u.durationMin < 1 || u.durationMin > 600)) list.push({ step: 'setup', text: 'Duration must be 1–600 minutes' });
    const j = journeyProblems(objectives ?? [], activities ?? []);
    if (j)
      list.push({
        step: j.startsWith('Every objective') ? 'objectives' : 'activities',
        text: j,
      });
    return list;
  }, [u, objectives, activities]);

  const doSave = (close: boolean) => {
    if (!payload) return;
    if (problems.length) {
      setErr(problems[0].text);
      setStep(problems[0].step);
      return;
    }
    setErr(null);
    const sent = snapshot;
    save.mutate(payload, {
      onSuccess: (r) => {
        setSaved(sent);
        if (!id && r?._id) setId(r._id);
        toast.success(id ? 'Learning unit saved' : 'Learning unit added');
        if (close) onClose();
      },
    });
  };

  // Ctrl/Cmd + S
  const saveRef = useRef(doSave);
  saveRef.current = doSave;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current(false);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const tryClose = () => (dirty ? setConfirmClose(true) : onClose());

  const ready = !!u && !!objectives && !!activities;
  const blocks = u?.blocks ?? [];
  const hasMedia = blocks.length > 0 && blocks.every((b) => !blockProblem(b));
  const checks: {
    label: string;
    done: boolean;
    step: Step;
    optional?: boolean;
  }[] = u
    ? [
        { label: 'Title', done: !!u.title?.trim(), step: 'setup' },
        {
          label: 'Summary for students',
          done: !!u.summary?.trim(),
          step: 'setup',
          optional: true,
        },
        {
          label: !blocks.length ? 'Content sections added' : hasMedia ? `Content: ${blocks.length} section${blocks.length === 1 ? '' : 's'} ready` : `Content: ${blocks.filter((b) => blockProblem(b)).length} of ${blocks.length} sections to finish`,
          done: hasMedia,
          step: 'content',
        },
        {
          label: 'Learning objectives',
          done: (objectives ?? []).length > 0,
          step: 'objectives',
          optional: true,
        },
        {
          label: 'Outcome activity',
          done: (activities ?? []).length > 0,
          step: 'activities',
          optional: true,
        },
      ]
    : [];
  const doneCount = checks.filter((c) => c.done).length;

  const steps: {
    id: Step;
    label: string;
    icon: ReactNode;
    done: boolean;
    count?: number;
  }[] = [
    {
      id: 'setup',
      label: 'Set up',
      icon: <TuneOutlined />,
      done: !!u?.title?.trim(),
    },
    {
      id: 'content',
      label: 'Content',
      icon: <EditNoteOutlined />,
      done: hasMedia,
    },
    {
      id: 'objectives',
      label: 'Objectives',
      icon: <FlagOutlined />,
      done: (objectives ?? []).length > 0,
      count: objectives?.length,
    },
    {
      id: 'activities',
      label: 'Activities',
      icon: <EmojiObjectsOutlined />,
      done: (activities ?? []).length > 0,
      count: activities?.length,
    },
    {
      id: 'languages',
      label: 'Languages',
      icon: <TranslateOutlined />,
      done: false,
    },
    {
      id: 'preview',
      label: 'Preview',
      icon: <VisibilityOutlined />,
      done: false,
    },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  const course = courseQ.data;

  return (
    <Dialog
      open
      fullScreen
      onClose={tryClose}
      slotProps={{
        paper: {
          sx: { bgcolor: '#F7F5F0', borderRadius: 0, m: 0, maxHeight: 'none' },
        },
      }}
    >
      {/* Top bar */}
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1.5,
          px: { xs: 1.5, md: 2.5 },
          height: 64,
          bgcolor: '#fff',
          borderBottom: '1px solid #E8E4DA',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Close">
          <IconButton onClick={tryClose} aria-label="Close lesson builder">
            <Close />
          </IconButton>
        </Tooltip>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {course?.title ?? 'Course'} › {chapter.title}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }} noWrap>
            {u?.title?.trim() || (unitId ? 'Learning unit' : 'New learning unit')}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: dirty ? 'warning.main' : 'text.secondary',
            display: { xs: 'none', sm: 'block' },
            whiteSpace: 'nowrap',
          }}
        >
          {save.isPending ? 'Saving…' : dirty ? '● Unsaved changes' : id ? '✓ All changes saved' : ''}
        </Typography>
        <Button variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => setStep('preview')} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
          Preview
        </Button>
        <Button variant="outlined" onClick={() => doSave(false)} disabled={!ready || save.isPending || (!dirty && !!id)}>
          Save
        </Button>
        <Button variant="contained" onClick={() => doSave(true)} disabled={!ready || save.isPending} startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {id ? 'Save & close' : 'Add learning unit'}
        </Button>
      </Stack>

      {!ready ? (
        existing.error ? (
          <Box sx={{ p: 4 }}>
            <FormError error={existing.error} />
          </Box>
        ) : (
          <LinearProgress />
        )
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '220px minmax(0,1fr)',
              lg: '220px minmax(0,1fr) 290px',
            },
          }}
        >
          {/* Steps */}
          <Box
            component="nav"
            aria-label="Lesson builder steps"
            sx={{
              borderRight: { md: '1px solid #E8E4DA' },
              borderBottom: { xs: '1px solid #E8E4DA', md: 'none' },
              bgcolor: '#FBFAF7',
              p: { xs: 1, md: 2 },
              display: 'flex',
              flexDirection: { xs: 'row', md: 'column' },
              gap: 0.5,
              overflowX: 'auto',
            }}
          >
            {steps.map((s, i) => (
              <ButtonBase
                key={s.id}
                onClick={() => setStep(s.id)}
                sx={{
                  justifyContent: 'flex-start',
                  gap: 1.25,
                  px: 1.5,
                  py: 1.1,
                  borderRadius: 2,
                  textAlign: 'left',
                  flexShrink: 0,
                  bgcolor: step === s.id ? '#fff' : 'transparent',
                  boxShadow: step === s.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  color: step === s.id ? 'text.primary' : 'text.secondary',
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: s.done ? '#D3EEDD' : step === s.id ? '#EEE9FC' : '#EEEEF2',
                    color: s.done ? '#1D6B3E' : step === s.id ? '#5F3DC4' : 'text.secondary',
                    '& svg': { fontSize: 17 },
                  }}
                >
                  {s.done ? <CheckCircle /> : s.icon}
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: { xs: 'none', md: 'block' },
                      lineHeight: 1.1,
                      color: 'text.disabled',
                    }}
                  >
                    Step {i + 1}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: step === s.id ? 700 : 500,
                      fontSize: 14.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.label}
                    {s.count ? ` (${s.count})` : ''}
                  </Typography>
                </Box>
              </ButtonBase>
            ))}
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'none', md: 'block' }, px: 1.5 }}>
              Tip: press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S to save
            </Typography>
          </Box>

          {/* Step content */}
          <Box ref={scroller} sx={{ overflowY: 'auto', minHeight: 0 }}>
            <Box
              sx={{
                maxWidth: step === 'content' && blocks.some((b) => b.kind === 'presentation') ? 1200 : 920,
                mx: 'auto',
                px: { xs: 2, md: 4 },
                py: { xs: 2.5, md: 4 },
              }}
            >
              {err && (
                <Alert severity="warning" sx={{ mb: 2.5 }} onClose={() => setErr(null)}>
                  {err}
                </Alert>
              )}
              {step === 'setup' && <SetupStep u={u!} set={set} aiAdd={aiAdd} setAiAdd={setAiAdd} grades={course?.grades} onPlan={applyPlan} />}
              {step === 'content' && <ContentStep u={u!} set={set} update={updateBlocks} onEditor={onEditor} grades={course?.grades} aiAdd={aiAdd} setAiAdd={setAiAdd} />}
              {step === 'objectives' && (
                <StepCard title="What will students be able to do?" hint="Write 2–4 objectives. Each has an “I can…” check that students see, and activities are marked against them.">
                  <ObjectivesEditor value={objectives!} onChange={setObjectives} skills={skills.data ?? []} suggestions={headingIdeas(textOf(blocks))} />
                </StepCard>
              )}
              {step === 'activities' && (
                <StepCard title="How will students show it?" hint="Add a quiz, project, presentation, reflection or tool. Each one checks some of the objectives.">
                  <ActivitiesEditor value={activities!} onChange={setActivities} objectives={objectives!} quizzes={quizzes.data ?? []} tools={tools.data ?? []} />
                </StepCard>
              )}
              {step === 'languages' && <LanguagesPanel unitId={id} dirty={dirty} onSave={() => doSave(false)} />}
              {step === 'preview' && <PreviewStep u={u!} objectives={objectives!} />}

              {/* Step navigation */}
              <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 3 }}>
                <Button startIcon={<ArrowBack />} disabled={idx === 0} onClick={() => setStep(steps[idx - 1].id)}>
                  {idx > 0 ? steps[idx - 1].label : 'Back'}
                </Button>
                {idx < steps.length - 1 ? (
                  <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setStep(steps[idx + 1].id)}>
                    Next: {steps[idx + 1].label}
                  </Button>
                ) : (
                  <Button variant="contained" onClick={() => doSave(true)} disabled={save.isPending}>
                    {id ? 'Save & close' : 'Add learning unit'}
                  </Button>
                )}
              </Stack>
            </Box>
          </Box>

          {/* Helper panel */}
          <Box
            sx={{
              display: { xs: 'none', lg: 'block' },
              borderLeft: '1px solid #E8E4DA',
              bgcolor: '#FBFAF7',
              overflowY: 'auto',
              p: 2.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Ready for students</Typography>
            <LinearProgress variant="determinate" value={(doneCount / Math.max(1, checks.length)) * 100} sx={{ height: 6, borderRadius: 3, mb: 1.5 }} />
            <Stack spacing={0.25} sx={{ mb: 3 }}>
              {checks.map((c) => (
                <ButtonBase
                  key={c.label}
                  onClick={() => setStep(c.step)}
                  sx={{
                    justifyContent: 'flex-start',
                    gap: 1,
                    py: 0.75,
                    px: 0.75,
                    borderRadius: 1.5,
                    textAlign: 'left',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                  }}
                >
                  {c.done ? <CheckCircle sx={{ fontSize: 19, color: '#2F9E44' }} /> : <RadioButtonUnchecked sx={{ fontSize: 19, color: 'text.disabled' }} />}
                  <Typography
                    variant="body2"
                    sx={{
                      color: c.done ? 'text.primary' : 'text.secondary',
                      flex: 1,
                    }}
                  >
                    {c.label}
                  </Typography>
                  {c.optional && !c.done && (
                    <Typography variant="caption" color="text.disabled">
                      optional
                    </Typography>
                  )}
                </ButtonBase>
              ))}
            </Stack>

            {step === 'content' && (
              <>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Lesson snippets</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                  Inserts at the cursor in the text you last worked on (or adds a new Text Editor section). Then change the words.
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1,
                  }}
                >
                  {BLOCKS.map((b) => (
                    <ButtonBase
                      key={b.label}
                      onClick={() => {
                        const e = editor.current;
                        if (e && !e.isDestroyed) e.chain().focus().insertContent(b.html).run();
                        else
                          set({
                            blocks: [...blocks, { ...newBlock('text'), body: b.html }],
                          });
                      }}
                      sx={{
                        flexDirection: 'column',
                        gap: 0.5,
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: '#fff',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: '#7C5CFA',
                          bgcolor: '#FAF8FF',
                        },
                      }}
                    >
                      <Box sx={{ fontSize: 20 }}>{b.emoji}</Box>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {b.label}
                      </Typography>
                    </ButtonBase>
                  ))}
                </Box>
              </>
            )}
            {step === 'setup' && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Good titles
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  Short and specific: “Conductors and insulators”, not “Lesson 3”. Students see the title and summary on their course map.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
        <DialogTitle>Save your changes?</DialogTitle>
        <DialogContent>
          <Typography>You have changes that are not saved yet.</Typography>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={onClose}>
            Discard
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setConfirmClose(false)}>Keep editing</Button>
          <Button
            variant="contained"
            onClick={() => {
              setConfirmClose(false);
              doSave(true);
            }}
          >
            Save & close
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

function StepCard({ title, hint, children, action }: { title: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2, md: 3 },
        mb: 2.5,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
            {title}
          </Typography>
          {hint && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {hint}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}

function AiAddSwitch({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <FormControlLabel
      control={<Switch checked={on} onChange={(e) => set(e.target.checked)} />}
      label={
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
          <AutoAwesome sx={{ fontSize: 18, color: '#7C5CFA' }} />
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            Create each new section with AI
          </Typography>
        </Stack>
      }
      sx={{ m: 0, alignSelf: 'flex-start' }}
    />
  );
}

function SetupStep({ u, set, aiAdd, setAiAdd, grades, onPlan }: { u: Partial<Unit>; set: (p: Partial<Unit>) => void; aiAdd: boolean; setAiAdd: (v: boolean) => void; grades?: number[]; onPlan: (c: PlanChoice) => void }) {
  const custom = u.durationMin != null && !DURATIONS.includes(u.durationMin);
  const blocks = u.blocks ?? [];
  const count = (k: BlockKind) => blocks.filter((b) => b.kind === k).length;
  return (
    <>
      <UnitAiPlanner grades={grades} hasContent={(u.blocks ?? []).length > 0} onApply={onPlan} />
      <StepCard title="Name and describe the learning unit">
        <TextField label="Learning unit title" value={u.title ?? ''} onChange={(e) => set({ title: e.target.value })} required autoFocus placeholder="e.g. Conductors and insulators" slotProps={{ htmlInput: { maxLength: 200 } }} />
        <TextField
          label="Summary for students"
          value={u.summary ?? ''}
          onChange={(e) => set({ summary: e.target.value })}
          multiline
          minRows={2}
          placeholder="One or two lines: what students will find out"
          helperText={`${(u.summary ?? '').length}/1000 · shown above the lesson and on the course map`}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
      </StepCard>
      <StepCard title="What will this unit contain?" hint="Click to add each part in the order students should see it. Add as many as you need — you can edit, move and remove them in the next step.">
        <AiAddSwitch on={aiAdd} set={setAiAdd} />
        <BlockPalette onAdd={(k) => set({ blocks: [...blocks, { ...newBlock(k), aiPending: aiAdd || undefined }] })} count={count} />
        {aiAdd && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            AI fills in each new section when you open the Content step. Tip: write the title and summary first so AI knows the topic.
          </Typography>
        )}
        {blocks.length > 0 && (
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F7F5F0' }}>
            <Typography variant="body2" sx={{ fontWeight: 650, mb: 1 }}>
              Students will see, in this order:
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
              {blocks.map((b, i) => (
                <Stack key={b.key} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                  {i > 0 && <ArrowForward sx={{ fontSize: 15, color: 'text.disabled' }} />}
                  <Chip
                    size="small"
                    label={`${i + 1}. ${b.title?.trim() || BLOCK_META[b.kind].label}`}
                    onDelete={() => set({ blocks: blocks.filter((x) => x.key !== b.key) })}
                    sx={{
                      bgcolor: '#fff',
                      border: `1px solid ${BLOCK_META[b.kind].color}55`,
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </StepCard>
      <StepCard title="How long will it take?" hint={`An estimate helps students plan. It is shown on the lesson.${blocks.length ? ` From the content so far: about ${estimateMinutes(blocks)} min.` : ''}`}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={`${d} min`} onClick={() => set({ durationMin: d })} color={u.durationMin === d ? 'primary' : 'default'} variant={u.durationMin === d ? 'filled' : 'outlined'} />
          ))}
          <TextField
            size="small"
            type="number"
            label="Other"
            value={custom ? u.durationMin : ''}
            onChange={(e) =>
              set({
                durationMin: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            sx={{ width: 110 }}
            slotProps={{ htmlInput: { min: 1, max: 600 } }}
          />
        </Stack>
      </StepCard>
    </>
  );
}

/** The nine kinds of content as big buttons; `count` shows how many of each the unit already has. */
function BlockPalette({ onAdd, count, compact }: { onAdd: (k: BlockKind) => void; count?: (k: BlockKind) => number; compact?: boolean }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: compact ? 1 : 1.5,
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
      }}
    >
      {BLOCK_ORDER.map((k) => {
        const m = BLOCK_META[k];
        const n = count?.(k) ?? 0;
        return (
          <ButtonBase
            key={k}
            onClick={() => onAdd(k)}
            sx={{
              position: 'relative',
              flexDirection: compact ? 'row' : 'column',
              alignItems: compact ? 'center' : 'flex-start',
              textAlign: 'left',
              gap: compact ? 1 : 0.75,
              p: compact ? 1.1 : 1.75,
              borderRadius: 2.5,
              border: '2px solid',
              borderColor: n ? m.color : 'divider',
              bgcolor: n ? `${m.color}0F` : '#fff',
              transition: 'all .15s',
              '&:hover': { borderColor: m.color, bgcolor: `${m.color}0A` },
            }}
          >
            <Box
              sx={{
                width: compact ? 30 : 36,
                height: compact ? 30 : 36,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: `${m.color}1A`,
                color: m.color,
                flexShrink: 0,
                '& svg': { fontSize: compact ? 18 : 22 },
              }}
            >
              {BLOCK_ICON[k]}
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: compact ? 13.5 : 15,
                lineHeight: 1.2,
              }}
            >
              {m.label}
            </Typography>
            {!compact && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                {m.hint}
              </Typography>
            )}
            {n > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  minWidth: 22,
                  height: 22,
                  px: 0.5,
                  borderRadius: 11,
                  bgcolor: m.color,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {n}
              </Box>
            )}
            {!n && !compact && (
              <AddRounded
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  fontSize: 20,
                  color: 'text.disabled',
                }}
              />
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function ContentStep({
  u,
  set,
  update,
  onEditor,
  grades,
  aiAdd,
  setAiAdd,
}: {
  u: Partial<Unit>;
  set: (p: Partial<Unit>) => void;
  update: (fn: (b: UnitBlock[]) => UnitBlock[]) => void;
  onEditor: (e: Editor | null) => void;
  grades?: number[];
  aiAdd: boolean;
  setAiAdd: (v: boolean) => void;
}) {
  const blocks = u.blocks ?? [];
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [insertAt, setInsertAt] = useState<{
    el: HTMLElement;
    at: number;
  } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const put = (next: UnitBlock[]) => set({ blocks: next });
  const add = (k: BlockKind, at = blocks.length) => {
    const b = { ...newBlock(k), aiPending: aiAdd || undefined };
    put([...blocks.slice(0, at), b, ...blocks.slice(at)]);
    setFresh(b.key!);
  };
  const patch = (key: string, p: Partial<UnitBlock>) => update((all) => all.map((b) => (b.key === key ? { ...b, ...p } : b)));
  const grade = grades?.length ? Math.min(...grades) : undefined;
  // Sections that still need content (galleries need pictures first, so AI only suggests ideas there)
  const empty = blocks.filter((b) => blockProblem(b) && !b.aiPending && !(b.kind === 'video' && b.body)); // a video's guide is written; only the link is missing
  const fillAll = () => update((all) => all.map((b) => (empty.some((e) => e.key === b.key) ? { ...b, aiPending: true } : b)));
  const move = (i: number, d: number) => {
    const next = [...blocks];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    put(next);
  };
  const duplicate = (i: number) => {
    const { _id, ...copy } = blocks[i];
    void _id;
    const b = {
      ...copy,
      key: blockKey(),
      title: copy.title ? `${copy.title} (copy)` : '',
      gallery: copy.gallery?.map(({ _id: _g, ...g }) => (void _g, g)),
      slides: copy.slides?.map(({ _id: _s, ...sl }) => (void _s, sl)),
    } as UnitBlock;
    put([...blocks.slice(0, i + 1), b, ...blocks.slice(i + 1)]);
    setFresh(b.key!);
  };
  const lessonHtml = textOf(blocks);
  const allClosed = blocks.length > 0 && blocks.every((b) => closed[b.key!]);

  // Scroll a newly added section into view
  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => document.getElementById(`block-${fresh}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [fresh]);

  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'flex-end', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
            Content
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {blocks.length ? `${blocks.length} section${blocks.length === 1 ? '' : 's'}, shown to students from top to bottom. Use the arrows to change the order.` : 'Add the parts of the lesson one after another.'}
          </Typography>
        </Box>
        {empty.length > 0 && (
          <Button size="small" variant="outlined" startIcon={<AutoAwesome />} onClick={fillAll} sx={{ whiteSpace: 'nowrap' }}>
            Fill {empty.length} empty section{empty.length === 1 ? '' : 's'} with AI
          </Button>
        )}
        {blocks.length > 1 && (
          <Button size="small" startIcon={allClosed ? <ExpandMore /> : <ExpandLess />} onClick={() => setClosed(allClosed ? {} : Object.fromEntries(blocks.map((b) => [b.key!, true])))}>
            {allClosed ? 'Expand all' : 'Collapse all'}
          </Button>
        )}
      </Stack>

      {blocks.map((b, i) => (
        <Box key={b.key}>
          <BlockCard
            b={b}
            n={i + 1}
            first={i === 0}
            last={i === blocks.length - 1}
            closed={!!closed[b.key!]}
            onToggle={() => setClosed((c) => ({ ...c, [b.key!]: !c[b.key!] }))}
            onMove={(d) => move(i, d)}
            onDuplicate={() => duplicate(i)}
            onRemove={() => put(blocks.filter((x) => x.key !== b.key))}
            set={(p) => patch(b.key!, p)}
            onEditor={onEditor}
            unitTitle={u.title ?? ''}
            lessonHtml={lessonHtml}
            grades={grades}
            grade={grade}
          />
          {i < blocks.length - 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                my: -0.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Tooltip title="Insert a section here">
                <IconButton
                  size="small"
                  aria-label={`Insert a section after section ${i + 1}`}
                  onClick={(e) => setInsertAt({ el: e.currentTarget, at: i + 1 })}
                  sx={{
                    bgcolor: '#fff',
                    border: '1px solid',
                    borderColor: 'divider',
                    width: 30,
                    height: 30,
                    '&:hover': { bgcolor: '#EEE9FC', borderColor: '#7C5CFA' },
                  }}
                >
                  <AddRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      ))}

      <Box
        sx={{
          mt: blocks.length ? 2.5 : 0,
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: '2px dashed',
          borderColor: '#D8D2C4',
          bgcolor: 'rgba(255,255,255,0.6)',
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 0.25 }}>{blocks.length ? 'Add the next section' : 'Add the first section'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          It goes at the end. Mix as many as you need — for example text, then a video, then a gallery and an activity.
        </Typography>
        <Box sx={{ mb: 1.25 }}>
          <AiAddSwitch on={aiAdd} set={setAiAdd} />
        </Box>
        <BlockPalette compact onAdd={(k) => add(k)} count={(k) => blocks.filter((b) => b.kind === k).length} />
      </Box>

      <Menu anchorEl={insertAt?.el} open={!!insertAt} onClose={() => setInsertAt(null)}>
        {BLOCK_ORDER.map((k) => (
          <MenuItem
            key={k}
            onClick={() => {
              if (insertAt) add(k, insertAt.at);
              setInsertAt(null);
            }}
          >
            <ListItemIcon sx={{ color: BLOCK_META[k].color }}>{BLOCK_ICON[k]}</ListItemIcon>
            <ListItemText>{BLOCK_META[k].label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function BlockCard({
  b,
  n,
  first,
  last,
  closed,
  onToggle,
  onMove,
  onDuplicate,
  onRemove,
  set,
  onEditor,
  unitTitle,
  lessonHtml,
  grades,
  grade,
}: {
  b: UnitBlock;
  n: number;
  first: boolean;
  last: boolean;
  closed: boolean;
  onToggle: () => void;
  onMove: (d: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  set: (p: Partial<UnitBlock>) => void;
  onEditor: (e: Editor | null) => void;
  unitTitle: string;
  lessonHtml: string;
  grades?: number[];
  grade?: number;
}) {
  const m = BLOCK_META[b.kind];
  const [aiOpen, setAiOpen] = useState(false);
  // Latest text of the whole unit, for AI requests that run later (e.g. quick checks)
  const ctxRef = useRef(lessonHtml);
  ctxRef.current = lessonHtml;
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<(BlockAiResult & { error?: string }) | null>(null);
  const applyAi = (r: BlockAiResult) => {
    set({ ...r.patch, aiPending: false });
    if (r.patch.body && b.kind !== 'text' && b.kind !== 'activity') setNotes(true);
    setAiMsg(r);
  };
  // "Create with AI as I add" / "Fill empty sections": run once per section
  useEffect(() => {
    if (!b.aiPending || AI_RUNNING.has(b.key!)) return;
    AI_RUNNING.add(b.key!);
    setAiBusy(true);
    runBlockAi(b, { unitTitle, grade, getContext: () => ctxRef.current, merge: 'append' })
      .then(applyAi)
      .catch((e) => {
        set({ aiPending: false });
        setAiMsg({ patch: {}, provider: 'offline', error: errorMessage(e) });
      })
      .finally(() => {
        AI_RUNNING.delete(b.key!);
        setAiBusy(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.aiPending]);
  const problem = blockProblem(b);
  const [notes, setNotes] = useState(!!b.body);
  const [askRemove, setAskRemove] = useState(false);
  const summary = problem
    ? `To do: ${problem}`
    : b.kind === 'text' || b.kind === 'activity'
      ? `${
          (b.body ?? '')
            .replace(/<[^>]+>/g, ' ')
            .split(/\s+/)
            .filter(Boolean).length
        } words`
      : b.kind === 'presentation'
        ? `${b.slides?.length} slides`
        : b.kind === 'gallery'
          ? `${b.gallery?.length} pictures`
          : '✓ Ready';
  const hasContent = !!(b.body || b.videoUrl || b.fileUrl || b.linkUrl || b.motionUrl || b.simUrl || b.slides?.length || b.gallery?.length || b.question);
  const textKind = b.kind === 'text' || b.kind === 'activity' || b.kind === 'check';

  return (
    <Box
      id={`block-${b.key}`}
      sx={{
        bgcolor: '#fff',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `5px solid ${m.color}`,
        mb: 0,
        scrollMarginTop: 16,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1.25,
          px: { xs: 1.5, md: 2 },
          py: 1.25,
          bgcolor: `${m.color}08`,
          borderBottom: closed ? 'none' : '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            bgcolor: m.color,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {n}
        </Box>
        <Tooltip title={m.label}>
          <Box sx={{ color: m.color, display: 'flex', '& svg': { fontSize: 22 } }}>{BLOCK_ICON[b.kind]}</Box>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TextField
            variant="standard"
            fullWidth
            value={b.title ?? ''}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={`${m.label} — add a section title (optional)`}
            slotProps={{
              htmlInput: { maxLength: 200, 'aria-label': `Section ${n} title` },
              input: {
                disableUnderline: !!b.title,
                sx: { fontWeight: 700, fontSize: 15.5 },
              },
            }}
          />
          {closed && (
            <Typography variant="caption" sx={{ color: problem ? 'warning.main' : 'text.secondary' }}>
              {m.label} · {summary}
            </Typography>
          )}
        </Box>
        {!closed && problem && <Chip size="small" label="To do" color="warning" variant="outlined" sx={{ display: { xs: 'none', sm: 'flex' } }} />}
        <Tooltip title={`Create this ${m.label.toLowerCase()} with AI`}>
          <span>
            <Button
              size="small"
              onClick={() => setAiOpen(true)}
              disabled={aiBusy}
              startIcon={aiBusy ? <CircularProgress size={14} /> : <AutoAwesome />}
              sx={{ flexShrink: 0, borderRadius: 999, px: 1.25, color: '#6741D9', bgcolor: '#F1ECFF', '&:hover': { bgcolor: '#E5DBFF' }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 } }, minWidth: 0 }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {aiBusy ? 'Creating…' : 'Create with AI'}
              </Box>
            </Button>
          </span>
        </Tooltip>
        <Stack direction="row" sx={{ flexShrink: 0 }}>
          <Tooltip title="Move up">
            <span>
              <IconButton size="small" aria-label={`Move section ${n} up`} disabled={first} onClick={() => onMove(-1)}>
                <ArrowUpward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move down">
            <span>
              <IconButton size="small" aria-label={`Move section ${n} down`} disabled={last} onClick={() => onMove(1)}>
                <ArrowDownward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Duplicate">
            <IconButton size="small" aria-label={`Duplicate section ${n}`} onClick={onDuplicate} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <ContentCopyOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton size="small" aria-label={`Remove section ${n}`} onClick={() => (hasContent ? setAskRemove(true) : onRemove())}>
              <DeleteOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={closed ? 'Expand' : 'Collapse'}>
            <IconButton size="small" aria-label={closed ? `Expand section ${n}` : `Collapse section ${n}`} aria-expanded={!closed} onClick={onToggle}>
              {closed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {aiBusy && <LinearProgress sx={{ height: 3 }} />}
      {!closed && (
        <Stack spacing={2} sx={{ p: { xs: 1.5, md: 2.25 } }}>
          {aiMsg && (
            <Alert
              severity={aiMsg.error ? 'error' : aiMsg.provider === 'offline' ? 'warning' : 'success'}
              icon={aiMsg.error ? undefined : <AutoAwesome fontSize="small" />}
              onClose={() => setAiMsg(null)}
              action={
                aiMsg.searchUrl ? (
                  <Button size="small" color="inherit" href={aiMsg.searchUrl} target="_blank" rel="noopener" sx={{ whiteSpace: 'nowrap' }}>
                    Find a video
                  </Button>
                ) : undefined
              }
            >
              {aiMsg.error ?? aiMsg.message ?? 'Done. Check it and edit anything you like.'}
              {!aiMsg.error && aiMsg.provider === 'offline' && ' (Starter draft — AI is offline. Switch on Claude or OpenAI in Admin → AI settings for full AI writing.)'}
            </Alert>
          )}
          {b.kind === 'text' && (
            <>
              <Typography variant="caption" color="text.secondary">
                Use headings inside to split long text; each part becomes a card for younger students.
              </Typography>
              <RichEditor value={b.body ?? ''} onChange={(body) => set({ body })} placeholder="Start with a question or a picture…" minHeight={300} onEditor={onEditor} />
            </>
          )}
          {b.kind === 'video' && (
            <>
              <TextField
                label="Video link"
                value={b.videoUrl ?? ''}
                onChange={(e) => set({ videoUrl: e.target.value })}
                required
                placeholder="https://www.youtube.com/watch?v=…"
                helperText="YouTube, Vimeo or an .mp4 link. Check the preview is the right video."
              />
              <VideoPreview url={b.videoUrl} />
            </>
          )}
          {b.kind === 'presentation' && (
            <DeckEditor slides={b.slides ?? []} onChange={(slides) => set({ slides })} theme={b.deckTheme} onTheme={(deckTheme) => set({ deckTheme })} unitTitle={b.title?.trim() || unitTitle} lessonHtml={lessonHtml} grades={grades} />
          )}
          {b.kind === 'activity' && (
            <>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                Steps to follow
              </Typography>
              <RichEditor value={b.body ?? ''} onChange={(body) => set({ body })} placeholder="What students need, then the steps, then a question to think about" minHeight={220} onEditor={onEditor} />
              <FileField url={b.fileUrl} onChange={(fileUrl) => set({ fileUrl })} label="Worksheet or attachment (optional)" />
              <TextField label="Activity link (optional)" value={b.linkUrl ?? ''} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="https://" />
            </>
          )}
          {b.kind === 'pdf' && <FileField url={b.fileUrl} onChange={(fileUrl) => set({ fileUrl })} label="Upload the PDF, slides or document students should open" />}
          {b.kind === 'link' && <TextField label="Website link" value={b.linkUrl ?? ''} onChange={(e) => set({ linkUrl: e.target.value })} required placeholder="https://" helperText="Students open it in a new tab." />}
          {b.kind === 'motion' && <MotionEditor b={b} set={set} />}
          {b.kind === 'gallery' && <GalleryEditor b={b} set={set} />}
          {b.kind === 'sim3d' && <SimEditor b={b} set={set} />}
          {b.kind === 'check' && <CheckEditor b={b} set={set} onEditor={onEditor} />}

          {!textKind &&
            (notes ? (
              <Box>
                <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 650, flex: 1 }}>
                    {b.kind === 'sim3d' ? 'What to explore (steps and questions)' : 'Notes for students'}
                  </Typography>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      set({ body: '' });
                      setNotes(false);
                    }}
                  >
                    Remove notes
                  </Button>
                </Stack>
                <RichEditor value={b.body ?? ''} onChange={(body) => set({ body })} placeholder="Instructions, key ideas or questions shown with this section" minHeight={140} onEditor={onEditor} />
              </Box>
            ) : (
              <Button size="small" startIcon={<AddRounded />} onClick={() => setNotes(true)} sx={{ alignSelf: 'flex-start' }}>
                {b.kind === 'sim3d' ? 'Add what to explore' : 'Add notes for students'}
              </Button>
            ))}
        </Stack>
      )}

      <BlockAiDialog open={aiOpen} onClose={() => setAiOpen(false)} b={b} unitTitle={unitTitle} grade={grade} contextHtml={lessonHtml} onDone={applyAi} />
      <Dialog open={askRemove} onClose={() => setAskRemove(false)}>
        <DialogTitle>Remove section {n}?</DialogTitle>
        <DialogContent>
          <Typography>
            The {m.label.toLowerCase()} section{b.title ? ` “${b.title}”` : ''} and everything in it will be removed from this unit when you save.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAskRemove(false)}>Keep it</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setAskRemove(false);
              onRemove();
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Quick check: question, 2–5 choices (one right), why it's right, and a simpler explanation for a wrong answer. */
function CheckEditor({ b, set, onEditor }: BlockEdit & { onEditor: (e: Editor | null) => void }) {
  const choices = b.choices ?? [];
  const setChoice = (i: number, p: Partial<{ text: string; correct: boolean }>) => set({ choices: choices.map((c, k) => (k === i ? { ...c, ...p } : p.correct ? { ...c, correct: false } : c)) });
  const [preview, setPreview] = useState(false);
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        Students must answer this before the next part of the lesson opens. If they get it wrong, they see your simpler explanation and try again.
      </Typography>
      <TextField label="Question" value={b.question ?? ''} onChange={(e) => set({ question: e.target.value })} multiline placeholder="e.g. Which of these lets electricity pass through?" slotProps={{ htmlInput: { maxLength: 1000 } }} />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 650, mb: 0.75 }}>
          Choices — tick the right answer
        </Typography>
        <Stack spacing={1}>
          {choices.map((c, i) => (
            <Stack key={c._id ?? i} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <Tooltip title={c.correct ? 'Right answer' : 'Mark as the right answer'}>
                <IconButton onClick={() => setChoice(i, { correct: true })} aria-label={`Mark choice ${i + 1} as the right answer`} sx={{ color: c.correct ? '#2B8A3E' : 'text.disabled' }}>
                  {c.correct ? <CheckCircle /> : <RadioButtonUnchecked />}
                </IconButton>
              </Tooltip>
              <TextField
                size="small"
                fullWidth
                value={c.text}
                onChange={(e) => setChoice(i, { text: e.target.value })}
                placeholder={c.correct ? 'The right answer' : 'A wrong answer (a common mistake works well)'}
                slotProps={{ htmlInput: { maxLength: 300, 'aria-label': `Choice ${i + 1}` } }}
              />
              <IconButton size="small" aria-label={`Remove choice ${i + 1}`} disabled={choices.length <= 2} onClick={() => set({ choices: choices.filter((_, k) => k !== i) })}>
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        {choices.length < 5 && (
          <Button size="small" startIcon={<AddRounded />} onClick={() => set({ choices: [...choices, { text: '', correct: false }] })} sx={{ mt: 0.75 }}>
            Add a choice
          </Button>
        )}
      </Box>
      <TextField label="Why it's right (shown when they get it right)" value={b.explain ?? ''} onChange={(e) => set({ explain: e.target.value })} multiline slotProps={{ htmlInput: { maxLength: 2000 } }} />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 650, mb: 0.75 }}>
          If they get it wrong — explain it more simply (without giving the answer)
        </Typography>
        <RichEditor value={b.help ?? ''} onChange={(help) => set({ help })} placeholder="Explain the idea again in smaller steps, with an everyday example" minHeight={120} onEditor={onEditor} />
      </Box>
      <Button size="small" startIcon={<VisibilityOutlined />} onClick={() => setPreview((p) => !p)} sx={{ alignSelf: 'flex-start' }}>
        {preview ? 'Hide preview' : 'Try it as a student'}
      </Button>
      {preview && (
        <Box sx={{ p: 2, borderRadius: 2.5, border: '1px dashed', borderColor: 'divider' }}>
          <QuickCheck key={JSON.stringify(b.choices) + b.question} b={b} />
        </Box>
      )}
    </>
  );
}

/** Sections whose AI request is in flight (survives leaving and returning to the Content step). */
const AI_RUNNING = new Set<string>();

function FileField({ url, onChange, label }: { url?: string; onChange: (url: string) => void; label: string }) {
  const accept = '.pdf,image/*,video/*,.ppt,.pptx,.doc,.docx,.zip';
  return url ? (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 2,
        bgcolor: '#F7F5F0',
      }}
    >
      <PictureAsPdfOutlined sx={{ color: '#D92D20' }} />
      <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>
        {decodeURIComponent(url.split('/').pop() ?? 'File')}
      </Typography>
      <Button size="small" href={url} target="_blank" rel="noopener">
        Open
      </Button>
      <UploadButton folder="content" accept={accept} label="Replace" onUploaded={(u) => onChange(u)} />
      <Button color="error" size="small" onClick={() => onChange('')}>
        Remove
      </Button>
    </Stack>
  ) : (
    <Box
      sx={{
        border: '2px dashed',
        borderColor: 'divider',
        borderRadius: 2.5,
        p: 2.5,
        textAlign: 'center',
      }}
    >
      <UploadFileOutlined sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
      <Typography color="text.secondary" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.25 }}>
        PDF, Word, PowerPoint, images, video or zip
      </Typography>
      <UploadButton folder="content" accept={accept} label="Choose file" onUploaded={(u) => onChange(u)} />
    </Box>
  );
}

function PreviewStep({ u, objectives }: { u: Partial<Unit>; objectives: Objective[] }) {
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const blocks = u.blocks ?? [];
  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All {blocks.length} section{blocks.length === 1 ? '' : 's'} in order, roughly as students see them. Younger grades get their own colourful layout.
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={device} onChange={(_, v) => v && setDevice(v)}>
          <ToggleButton value="desktop" aria-label="Computer">
            <DesktopWindowsOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="phone" aria-label="Phone">
            <PhoneIphoneOutlined fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box
        sx={{
          mx: 'auto',
          maxWidth: device === 'phone' ? 390 : '100%',
          bgcolor: '#fff',
          borderRadius: device === 'phone' ? '28px' : 3,
          border: device === 'phone' ? '10px solid #17171C' : '1px solid',
          borderColor: device === 'phone' ? '#17171C' : 'divider',
          p: { xs: 2, md: device === 'phone' ? 2 : 4 },
          minHeight: 400,
        }}
      >
        <Typography variant="overline" color="text.secondary">
          {u.durationMin ? `About ${u.durationMin} min` : ''}
        </Typography>
        <Typography variant={device === 'phone' ? 'h5' : 'h4'} sx={{ fontWeight: 750, mb: 1 }}>
          {u.title || 'Untitled'}
        </Typography>
        {u.summary && <Typography sx={{ color: 'text.secondary', fontSize: 17, mb: 2.5 }}>{u.summary}</Typography>}
        {objectives.length > 0 && (
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F4F0FF', mb: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Today you will…</Typography>
            <Stack spacing={0.75}>
              {objectives.map((o, i) => (
                <Typography key={o._id} variant="body2">
                  <b>{i + 1}.</b> {o.title}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
        {blocks.length ? (
          <UnitBlocksView blocks={blocks} radius={12} title={u.title} />
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            No content yet. Add sections in the Content step.
          </Typography>
        )}
      </Box>
      <Divider sx={{ my: 1 }} />
    </>
  );
}

/* ------------------------------------------------------------------ Motion graphics, image gallery and 3D editors (one block each) */

type BlockEdit = { b: UnitBlock; set: (p: Partial<UnitBlock>) => void };

function MotionEditor({ b, set }: BlockEdit) {
  const kind = motionKind(b.motionUrl);
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        Upload a Lottie animation (.json), an animated GIF/WebP or a short looping .mp4/.webm — or paste a link from LottieFiles, Canva, YouTube or Vimeo.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <UploadButton folder="content" accept=".json,application/json,image/gif,image/webp,image/png,video/mp4,video/webm" label={b.motionUrl ? 'Replace file' : 'Upload animation'} onUploaded={(url) => set({ motionUrl: url })} />
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>
        <TextField label="Animation link" value={b.motionUrl ?? ''} onChange={(e) => set({ motionUrl: e.target.value })} placeholder="https://…" sx={{ flex: 1 }} />
      </Stack>
      {kind && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip size="small" label={MOTION_KIND_LABEL[kind]} />
          {kind !== 'embed' && kind !== 'image' && <Chip size="small" label={b.motionLoop === false ? 'Plays once' : 'Loops'} onClick={() => set({ motionLoop: b.motionLoop === false })} variant="outlined" />}
          <Button size="small" color="error" onClick={() => set({ motionUrl: '' })}>
            Remove
          </Button>
        </Stack>
      )}
      {b.motionUrl && <MotionPlayer url={b.motionUrl} loop={b.motionLoop ?? true} radius={12} title={b.title} />}
    </>
  );
}

function GalleryEditor({ b, set }: BlockEdit) {
  const list: GalleryImage[] = b.gallery ?? [];
  const update = (i: number, patch: Partial<{ caption: string; alt: string }>) => set({ gallery: list.map((g, k) => (k === i ? { ...g, ...patch } : g)) });
  const move = (i: number, d: number) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    set({ gallery: next });
  };
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        Add pictures in the order students should see them. A caption says what to notice; alt text describes the picture for screen readers.
      </Typography>
      <Stack spacing={1.25}>
        {list.map((g, i) => (
          <Stack
            key={g._id ?? g.url + i}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              p: 1.25,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              alignItems: { sm: 'center' },
            }}
          >
            <Box
              component="img"
              src={g.url}
              alt=""
              sx={{
                width: 96,
                height: 72,
                objectFit: 'cover',
                borderRadius: 1.5,
                flexShrink: 0,
                bgcolor: '#F2F1F7',
              }}
            />
            <Stack spacing={1} sx={{ flex: 1 }}>
              <TextField size="small" label="Caption" value={g.caption ?? ''} onChange={(e) => update(i, { caption: e.target.value })} placeholder="What should students notice?" />
              <TextField size="small" label="Alt text (describe the picture)" value={g.alt ?? ''} onChange={(e) => update(i, { alt: e.target.value })} />
            </Stack>
            <Stack direction="row">
              <IconButton size="small" aria-label="Move picture up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUpward fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Move picture down" disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                <ArrowDownward fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Remove picture" onClick={() => set({ gallery: list.filter((_, k) => k !== i) })}>
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        ))}
        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2.5,
            p: 2.5,
            textAlign: 'center',
          }}
        >
          <CollectionsOutlined sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
          <Typography color="text.secondary" sx={{ mb: 1.25 }}>
            JPG, PNG, WebP or GIF · up to 60 pictures
          </Typography>
          <UploadButton
            folder="content"
            accept="image/*"
            label="Add a picture"
            onUploaded={(url, name) =>
              set({
                gallery: [
                  ...list,
                  {
                    url,
                    caption: name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
                    alt: '',
                  },
                ],
              })
            }
          />
        </Box>
      </Stack>
      {list.length > 0 && (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 650, mb: 1 }}>
            How students see it
          </Typography>
          <GalleryView images={list} radius={12} />
        </Box>
      )}
    </>
  );
}

function SimEditor({ b, set }: BlockEdit) {
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        Upload a 3D model (.glb or .gltf) students can turn, zoom and see in AR on a phone — or paste a link to an interactive simulation.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <UploadButton folder="content" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" label={b.simUrl && isModelFile(b.simUrl) ? 'Replace model' : 'Upload 3D model'} onUploaded={(url) => set({ simUrl: url })} />
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>
        <TextField label="Simulation link" value={b.simUrl ?? ''} onChange={(e) => set({ simUrl: e.target.value })} placeholder="https://phet.colorado.edu/sims/html/…" sx={{ flex: 1 }} />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Works with PhET (use the “Embed” link), Sketchfab, GeoGebra 3D, Tinkercad and most sites that allow embedding. Free models: Sketchfab (downloadable), NASA 3D Resources, Smithsonian 3D.
      </Typography>
      {b.simUrl && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size="small" label={isModelFile(b.simUrl) ? '3D model' : 'Embedded simulation'} />
            <Button size="small" color="error" onClick={() => set({ simUrl: '' })}>
              Remove
            </Button>
          </Stack>
          <Sim3DPlayer url={b.simUrl} radius={12} title={b.title} />
        </>
      )}
    </>
  );
}
