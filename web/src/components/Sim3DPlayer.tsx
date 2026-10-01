/**
 * A 3D simulation: a 3D model (.glb/.gltf) students can rotate, zoom and view in AR on phones,
 * or an embedded interactive simulation (PhET, Sketchfab, GeoGebra 3D, Tinkercad and similar).
 */
import { Box, Button, Stack, Typography } from '@mui/material';
import FullscreenRounded from '@mui/icons-material/FullscreenRounded';
import ThreeSixtyRounded from '@mui/icons-material/ThreeSixtyRounded';
import { createElement, useEffect, useRef, useState } from 'react';

export const isModelFile = (url?: string) => !!url && /\.(glb|gltf)$/i.test(url.split('?')[0]);

/** Turns common share links into their embeddable form. */
export function simEmbed(url: string) {
  const sk = url.match(/sketchfab\.com\/3d-models\/[^/?#]*-([0-9a-f]{32})/i);
  if (sk) return `https://sketchfab.com/models/${sk[1]}/embed`;
  const gg = url.match(/geogebra\.org\/(?:m|3d)\/(\w+)/i);
  if (gg) return `https://www.geogebra.org/material/iframe/id/${gg[1]}`;
  return url;
}

export function Sim3DPlayer({ url, radius = 16, title }: { url?: string; radius?: number; title?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const model = isModelFile(url);
  useEffect(() => {
    if (!model) return;
    let dead = false;
    import('@google/model-viewer').then(() => !dead && setReady(true)).catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [model]);
  if (!url) return null;
  const full = () => box.current?.requestFullscreen?.().catch(() => undefined);
  return (
    <Box>
      <Box ref={box} sx={{ position: 'relative', borderRadius: `${radius}px`, overflow: 'hidden', aspectRatio: '16 / 10', background: model ? 'radial-gradient(circle at 50% 35%, #FFFFFF 0%, #E9ECF7 70%)' : '#000', border: '1px solid rgba(0,0,0,0.06)', '&:fullscreen': { borderRadius: 0 } }}>
        {model ? (
          ready ? (
            createElement('model-viewer', {
              src: url,
              alt: title ?? '3D model',
              'camera-controls': true,
              'auto-rotate': true,
              'touch-action': 'pan-y',
              'shadow-intensity': '1',
              ar: true,
              style: { width: '100%', height: '100%', background: 'transparent' },
            })
          ) : (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
              <ThreeSixtyRounded sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body2">Loading 3D model…</Typography>
            </Stack>
          )
        ) : (
          <Box component="iframe" src={simEmbed(url)} title={title ?? '3D simulation'} allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope" allowFullScreen sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        )}
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {model ? 'Drag to turn · pinch or scroll to zoom · on a phone, tap the cube to see it in your room' : 'Interact with the simulation above'}
        </Typography>
        <Button size="small" startIcon={<FullscreenRounded />} onClick={full}>
          Full screen
        </Button>
      </Stack>
    </Box>
  );
}
