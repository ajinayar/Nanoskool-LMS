/** Shows a learning unit's content blocks one after another (used by the lesson preview and the staff/parent unit page). */
import { Box, Button, Stack, Typography } from '@mui/material';
import PictureAsPdf from '@mui/icons-material/PictureAsPdfOutlined';
import LinkIcon from '@mui/icons-material/LinkRounded';
import type { ReactNode } from 'react';
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
import { QuickCheck } from '@/components/QuickCheck';
import type { BlockKind, UnitBlock } from '@/api/types';
import { RichText } from '@/components/ui';
import { SlidePlayer } from '@/components/slides/SlidePlayer';
import { MotionPlayer } from '@/components/MotionPlayer';
import { GalleryView } from '@/components/GalleryView';
import { Sim3DPlayer } from '@/components/Sim3DPlayer';
import { toEmbed } from '@/lib/embed';

export const BLOCK_ICON: Record<BlockKind, ReactNode> = {
  text: <ArticleOutlined />,
  video: <PlayCircleOutline />,
  presentation: <SlideshowOutlined />,
  activity: <ConstructionOutlined />,
  pdf: <PictureAsPdfOutlined />,
  link: <LinkOutlined />,
  motion: <AnimationOutlined />,
  gallery: <CollectionsOutlined />,
  sim3d: <ViewInArOutlined />,
  check: <QuizOutlined />,
};

export function VideoFrame({ url, title, radius = 12, sx }: { url: string; title?: string; radius?: number; sx?: object }) {
  return (
    <Box
      sx={{
        position: 'relative',
        pt: '56.25%',
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        bgcolor: '#000',
        ...sx,
      }}
    >
      {/\.(mp4|webm|mov)$/i.test(url.split('?')[0]) ? (
        <Box component="video" src={url} controls sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      ) : (
        <Box
          component="iframe"
          src={toEmbed(url)}
          title={title ?? 'Video'}
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
        />
      )}
    </Box>
  );
}

export const fileName = (url: string) => decodeURIComponent(url.split('/').pop() ?? 'File');

/** The media part of one block (everything except its text). Returns null when there is nothing to show. */
export function BlockMedia({ b, radius = 12, showNotes, title, little, inlinePdf }: { b: UnitBlock; radius?: number; showNotes?: boolean; title?: string; little?: boolean; inlinePdf?: boolean }) {
  switch (b.kind) {
    case 'video':
      return b.videoUrl ? <VideoFrame url={b.videoUrl} title={b.title || title} radius={radius} /> : null;
    case 'presentation':
      return (b.slides ?? []).length ? <SlidePlayer slides={b.slides!} theme={b.deckTheme} showNotes={showNotes} radius={radius} /> : null;
    case 'motion':
      return b.motionUrl ? <MotionPlayer url={b.motionUrl} loop={b.motionLoop ?? true} radius={radius} title={b.title || title} /> : null;
    case 'gallery':
      return (b.gallery ?? []).length ? <GalleryView images={b.gallery!} radius={radius} big={little} /> : null;
    case 'sim3d':
      return b.simUrl ? <Sim3DPlayer url={b.simUrl} radius={radius} title={b.title || title} /> : null;
    case 'pdf':
    case 'activity':
    case 'link':
      if (!b.fileUrl && !b.linkUrl) return null;
      return (
        <>
          {inlinePdf && b.kind === 'pdf' && b.fileUrl && /\.pdf$/i.test(b.fileUrl) && (
            <Box
              component="iframe"
              src={b.fileUrl}
              title={b.title || 'PDF'}
              sx={{
                width: '100%',
                height: 600,
                border: '1px solid #E4E6F0',
                borderRadius: `${radius}px`,
                mb: 1.5,
                display: 'block',
              }}
            />
          )}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            {b.fileUrl && (
              <Button variant="outlined" startIcon={<PictureAsPdf />} href={b.fileUrl} target="_blank" rel="noopener">
                {b.kind === 'pdf' ? `Open ${fileName(b.fileUrl).replace(/^[A-Za-z0-9_-]{20,}\./, 'document.')}` : little ? 'Open the worksheet' : 'Open worksheet'}
              </Button>
            )}
            {b.linkUrl && (
              <Button variant="outlined" startIcon={<LinkIcon />} href={b.linkUrl} target="_blank" rel="noopener">
                {b.kind === 'link' ? (little ? 'Open the website' : 'Open website') : 'Open activity link'}
              </Button>
            )}
          </Stack>
        </>
      );
    default:
      return null;
  }
}

export function UnitBlocksView({ blocks, radius = 12, showNotes, title, inlinePdf }: { blocks: UnitBlock[]; radius?: number; showNotes?: boolean; title?: string; inlinePdf?: boolean }) {
  return (
    <Stack spacing={3}>
      {blocks.map((b, i) => {
        const media = <BlockMedia b={b} radius={radius} showNotes={showNotes} title={title} inlinePdf={inlinePdf} />;
        const media2 = b.kind === 'activity' || b.kind === 'pdf' || b.kind === 'link';
        if (b.kind === 'check')
          return (
            <Box key={b._id ?? b.key ?? i} sx={{ p: 2, borderRadius: `${radius}px`, border: '2px solid #D6336C33', bgcolor: '#FFF0F6' }}>
              <Typography variant="overline" sx={{ color: '#D6336C', fontWeight: 800 }}>
                {b.title || 'Quick check'} · students answer before going on
              </Typography>
              <QuickCheck b={b} radius={radius} />
            </Box>
          );
        return (
          <Box key={b._id ?? b.key ?? i}>
            {b.title && (
              <Typography variant="h6" component="h2" sx={{ fontWeight: 750, mb: 1.25 }}>
                {b.title}
              </Typography>
            )}
            {!media2 && media && <Box sx={{ mb: b.body ? 2 : 0 }}>{media}</Box>}
            {b.body && <RichText html={b.body} />}
            {media2 && media && <Box sx={{ mt: b.body ? 1.5 : 0 }}>{media}</Box>}
          </Box>
        );
      })}
    </Stack>
  );
}
