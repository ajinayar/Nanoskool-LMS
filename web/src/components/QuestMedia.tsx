/** The picture, video or sound a Genius Quest question is based on: image, uploaded video, YouTube or audio. */
import { Box } from '@mui/material';
import { youtubeId } from './richContent';

export type MediaKindOf = 'image' | 'video' | 'youtube' | 'audio' | null;
export function mediaKindOf(url?: string): MediaKindOf {
  if (!url) return null;
  if (youtubeId(url)) return 'youtube';
  if (/\.(mp4|mov|webm)(\?.*)?$/i.test(url)) return 'video';
  if (/\.(mp3|wav|m4a|ogg)(\?.*)?$/i.test(url)) return 'audio';
  return 'image';
}

export function QuestMedia({ url, radius = 16, maxHeight = 360 }: { url?: string; radius?: number; maxHeight?: number }) {
  const kind = mediaKindOf(url);
  if (!url || !kind) return null;
  if (kind === 'audio') return <Box component="audio" src={url} controls sx={{ width: '100%', display: 'block' }} />;
  if (kind === 'youtube')
    return (
      <Box sx={{ position: 'relative', width: '100%', pt: '56.25%', borderRadius: `${radius}px`, overflow: 'hidden', bgcolor: '#000' }}>
        <Box component="iframe" src={`https://www.youtube-nocookie.com/embed/${youtubeId(url)}?rel=0`} title="Question video" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
      </Box>
    );
  if (kind === 'video') return <Box component="video" src={url} controls playsInline preload="metadata" sx={{ width: '100%', maxHeight, borderRadius: `${radius}px`, bgcolor: '#000', display: 'block' }} />;
  return <Box component="img" src={url} alt="Look carefully at this picture" sx={{ maxWidth: '100%', maxHeight, borderRadius: `${radius}px`, display: 'block', mx: 'auto' }} />;
}
