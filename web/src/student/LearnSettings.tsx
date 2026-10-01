/**
 * "How I like to learn": language, calm mode, read aloud, text size and way of learning.
 * Offered to every child as a choice (never as a label); a parent can help set it.
 */
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Select, Stack, Switch, Tooltip, Typography } from '@mui/material';
import Tune from '@mui/icons-material/TuneRounded';
import { useState } from 'react';
import { LANGUAGES } from '@/lib/languages';
import { usePrefs } from '@/lib/prefs';
import type { LearnPrefs } from '@/api/types';
import { useToast } from '@/components/Toast';
import type { Look } from './looks';
import { BuddyFor } from './buddyArt';
import { BuddyPickerDialog, useBuddy } from './BuddyPicker';

const WAYS: { id: NonNullable<LearnPrefs['learnWay']>; emoji: string; label: string; hint: string }[] = [
  { id: 'mixed', emoji: '🌈', label: 'A bit of everything', hint: 'Text, pictures and videos' },
  { id: 'reading', emoji: '📖', label: 'Reading', hint: 'I like to read things myself' },
  { id: 'listening', emoji: '🎧', label: 'Listening', hint: 'Read lessons and answers to me' },
  { id: 'pictures', emoji: '🖼️', label: 'Pictures first', hint: 'Short text, more pictures and videos' },
];

export function LearnSettingsDialog({ open, onClose, look }: { open: boolean; onClose: () => void; look: Look }) {
  const { prefs, setPrefs } = usePrefs();
  const toast = useToast();
  const little = look.band === 'little';
  const { buddy } = useBuddy();
  const [picking, setPicking] = useState(false);
  const save = (p: Partial<LearnPrefs>) => setPrefs(p).catch(() => toast.error('Could not save. Try again.'));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>{little ? 'How I like to learn ✨' : 'How I like to learn'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 0.75 }}>My language</Typography>
            <Select fullWidth size="small" value={prefs.language} onChange={(e) => void save({ language: String(e.target.value) })} aria-label="My language">
              {Object.entries(LANGUAGES).map(([code, l]) => (
                <MenuItem key={code} value={code} lang={code}>
                  {l.native}
                  {code !== 'en' && (
                    <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                      {l.name}
                    </Box>
                  )}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Lessons show in this language when your teacher has made them ready, and NanoBot answers in it.
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>I learn best by…</Typography>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {WAYS.map((w) => {
                const on = prefs.learnWay === w.id;
                return (
                  <ButtonBase
                    key={w.id}
                    onClick={() => void save({ learnWay: w.id })}
                    aria-pressed={on}
                    sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1.25, p: 1.5, borderRadius: 3, border: `2px solid ${on ? look.primary : look.line}`, bgcolor: on ? `${look.primary}12` : '#fff' }}
                  >
                    <Box sx={{ fontSize: 26 }}>{w.emoji}</Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>{w.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {w.hint}
                      </Typography>
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 800, mb: 0.75 }}>My NanoBot buddy</Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.25, borderRadius: 3, border: `2px solid ${look.line}` }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: `${look.primary}12`, display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                <BuddyFor look={look} buddy={buddy} size={buddy.key === 'nano' ? 50 : 54} wave={false} face={buddy.key !== 'nano'} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 800 }}>{buddy.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {buddy.role}
                </Typography>
              </Box>
              <Button onClick={() => setPicking(true)} sx={{ borderRadius: 999, fontWeight: 800 }}>
                Change
              </Button>
            </Stack>
            <BuddyPickerDialog open={picking} onClose={() => setPicking(false)} look={look} />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Text size</Typography>
            <Stack direction="row" sx={{ gap: 1 }}>
              {(['normal', 'large', 'xlarge'] as const).map((t, i) => (
                <ButtonBase
                  key={t}
                  onClick={() => void save({ textSize: t })}
                  aria-pressed={prefs.textSize === t}
                  aria-label={['Normal text', 'Large text', 'Extra large text'][i]}
                  sx={{ flex: 1, py: 1, borderRadius: 2.5, fontWeight: 800, fontSize: [16, 20, 24][i], border: `2px solid ${prefs.textSize === t ? look.primary : look.line}`, bgcolor: prefs.textSize === t ? `${look.primary}12` : '#fff' }}
                >
                  Aa
                </ButtonBase>
              ))}
            </Stack>
          </Box>

          <Stack spacing={0.5}>
            <FormControlLabel
              control={<Switch checked={prefs.calm} onChange={(e) => void save({ calm: e.target.checked })} />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Calm mode 🌙</Typography>
                  <Typography variant="caption" color="text.secondary">
                    No moving things, softer colours and fewer extras on the screen
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={<Switch checked={prefs.readAloud} onChange={(e) => void save({ readAloud: e.target.checked })} />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Read things aloud 🔊</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Listen buttons on every lesson part, and NanoBot reads its answers to me
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function LearnSettingsButton({ look }: { look: Look }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title="How I like to learn">
        <IconButton onClick={() => setOpen(true)} aria-label="How I like to learn" sx={{ bgcolor: '#fff', border: `1px solid ${look.line}` }}>
          <Tune />
        </IconButton>
      </Tooltip>
      <LearnSettingsDialog open={open} onClose={() => setOpen(false)} look={look} />
    </>
  );
}
