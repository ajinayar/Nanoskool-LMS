/** Shows what a lesson video link points to: the YouTube thumbnail, a Vimeo player, or the .mp4 itself. */
import { Box, Chip, Stack, Typography } from '@mui/material';
import PlayCircleFilled from '@mui/icons-material/PlayCircleFilled';
import ErrorOutline from '@mui/icons-material/ErrorOutlineOutlined';
import { useEffect, useState } from 'react';
import { vimeoId, youtubeId } from './richContent';

export function VideoPreview({ url }: { url?: string }) {
  const u = (url ?? '').trim();
  const yt = u ? youtubeId(u) : null;
  const vm = !yt && u ? vimeoId(u) : null;
  const mp4 = !yt && !vm && /^https?:\/\/.+\.(mp4|webm|mov)(\?.*)?$|^\/files\/.+\.(mp4|webm|mov)$/i.test(u);
  const [title, setTitle] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  // The YouTube title (oEmbed), so the admin can confirm it is the right video
  useEffect(() => {
    setTitle(null);
    setBroken(false);
    if (!yt) return;
    const ctl = new AbortController();
    fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt}`)}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { title?: string; author_name?: string }) => setTitle([d.title, d.author_name].filter(Boolean).join(' · ')))
      .catch(() => undefined);
    return () => ctl.abort();
  }, [yt]);

  if (!u) return null;
  if (!yt && !vm && !mp4)
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'warning.main', mt: -1 }}>
        <ErrorOutline fontSize="small" />
        <Typography variant="body2">This does not look like a YouTube, Vimeo or .mp4 link, so students may not be able to play it.</Typography>
      </Stack>
    );

  const frame = { position: 'relative', width: '100%', maxWidth: 420, aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden', bgcolor: '#000', border: '1px solid', borderColor: 'divider' } as const;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, mt: -0.5 }}>
      {yt && (
        <Box component="a" href={`https://www.youtube.com/watch?v=${yt}`} target="_blank" rel="noopener" sx={{ ...frame, display: 'block' }} aria-label="Open the video on YouTube">
          {broken ? (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <Typography variant="body2">No thumbnail found. Check the link.</Typography>
            </Box>
          ) : (
            <Box component="img" src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt="Video thumbnail" onError={() => setBroken(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
          <PlayCircleFilled sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 64, color: 'rgba(255,255,255,0.92)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }} />
        </Box>
      )}
      {vm && <Box component="iframe" src={`https://player.vimeo.com/video/${vm}`} title="Video preview" allow="fullscreen; picture-in-picture" sx={{ ...frame, display: 'block' }} />}
      {mp4 && <Box component="video" src={u} controls preload="metadata" sx={{ ...frame, display: 'block' }} />}
      <Box sx={{ minWidth: 0 }}>
        <Chip size="small" label={yt ? 'YouTube' : vm ? 'Vimeo' : 'Video file'} sx={{ mb: 0.75 }} />
        {title && (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          This is the video students will see at the top of the lesson.
        </Typography>
      </Box>
    </Stack>
  );
}
