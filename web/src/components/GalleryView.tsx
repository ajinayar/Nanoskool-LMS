/** An image gallery: a tidy grid of pictures with captions; tap one to see it full size and step through them. */
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeftRounded';
import ChevronRight from '@mui/icons-material/ChevronRightRounded';
import Close from '@mui/icons-material/CloseRounded';
import { useEffect, useState } from 'react';
import type { GalleryImage } from '@/api/types';

export function GalleryView({ images, radius = 16, big }: { images: GalleryImage[]; radius?: number; big?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open == null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setOpen((i) => (i == null ? i : (i + 1) % images.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i == null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, images.length]);
  if (!images.length) return null;
  const cur = open == null ? null : images[open];
  return (
    <>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', sm: big ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' } }}>
        {images.map((img, i) => (
          <Box key={img._id ?? img.url + i} component="button" onClick={() => setOpen(i)} sx={{ p: 0, border: 0, bgcolor: 'transparent', cursor: 'zoom-in', textAlign: 'left', font: 'inherit' }}>
            <Box sx={{ borderRadius: `${radius}px`, overflow: 'hidden', aspectRatio: '4 / 3', bgcolor: '#F2F1F7', transition: 'transform .15s', '&:hover': { transform: 'scale(1.02)' } }}>
              <Box component="img" src={img.url} alt={img.alt || img.caption || ''} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </Box>
            {img.caption && (
              <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600, color: 'text.primary', lineHeight: 1.35 }}>
                {img.caption}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      <Dialog open={!!cur} onClose={() => setOpen(null)} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { bgcolor: '#111', color: '#fff', borderRadius: '18px', overflow: 'hidden' } } }}>
        {cur && (
          <Box sx={{ position: 'relative' }}>
            <Box component="img" src={cur.url} alt={cur.alt || cur.caption || ''} sx={{ display: 'block', width: '100%', maxHeight: '78vh', objectFit: 'contain', bgcolor: '#000' }} />
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ flex: 1, fontWeight: 600 }}>{cur.caption}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {open! + 1} / {images.length}
              </Typography>
            </Box>
            <IconButton aria-label="Close" onClick={() => setOpen(null)} sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}>
              <Close />
            </IconButton>
            {images.length > 1 && (
              <>
                <IconButton aria-label="Previous picture" onClick={() => setOpen((open! - 1 + images.length) % images.length)} sx={{ position: 'absolute', left: 10, top: '40%', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                  <ChevronLeft />
                </IconButton>
                <IconButton aria-label="Next picture" onClick={() => setOpen((open! + 1) % images.length)} sx={{ position: 'absolute', right: 10, top: '40%', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                  <ChevronRight />
                </IconButton>
              </>
            )}
          </Box>
        )}
      </Dialog>
    </>
  );
}
