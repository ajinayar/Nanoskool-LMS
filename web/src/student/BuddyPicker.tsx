/**
 * Choosing a NanoBot buddy. Every character is an original Nanoskool character; the school can
 * limit the list (School settings). The choice changes NanoBot's look, greeting and voice.
 */
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircleRounded';
import VolumeUp from '@mui/icons-material/VolumeUpRounded';
import { useMe } from '@/auth/AuthContext';
import { activeBuddy, allowedBuddies, GROUPS, type BuddyDef } from '@/lib/buddies';
import { usePrefs } from '@/lib/prefs';
import { useToast } from '@/components/Toast';
import { BuddyFor } from './buddyArt';
import { helloLine } from './NanoGreeting';
import { speak } from './useLook';
import type { Look } from './looks';

/** The student's NanoBot buddy (their choice if the school allows it, else Nano) and the ones on offer. */
export function useBuddy() {
  const me = useMe();
  const { prefs } = usePrefs();
  const allowed = me.school?.nanobotBuddies;
  return { buddy: activeBuddy(prefs.buddy, allowed), options: allowedBuddies(allowed) };
}

export function BuddyPickerDialog({ open, onClose, look }: { open: boolean; onClose: () => void; look: Look }) {
  const me = useMe();
  const { prefs, setPrefs } = usePrefs();
  const { buddy, options } = useBuddy();
  const toast = useToast();
  const first = me.name.split(' ')[0];
  const choose = (b: BuddyDef) => {
    speak(helloLine(b, first, prefs.language), prefs.language, b.voice);
    setPrefs({ buddy: b.key }).catch(() => toast.error('Could not save. Try again.'));
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 900, pb: 0.5 }}>
        Choose your NanoBot buddy
        <Typography sx={{ color: 'text.secondary', fontSize: 14, fontWeight: 500 }}>Your buddy says hello, talks in their own way and has their own voice. It is still NanoBot, your AI helper.</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {GROUPS.map((g) => {
            const list = options.filter((b) => b.group === g.key);
            if (!list.length) return null;
            return (
              <Box key={g.key}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>{g.label}</Typography>
                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } }}>
                  {list.map((b) => {
                    const on = b.key === buddy.key;
                    return (
                      <Box key={b.key} sx={{ position: 'relative' }}>
                        <ButtonBase
                          onClick={() => choose(b)}
                          aria-pressed={on}
                          aria-label={`${b.name}, ${b.role}`}
                          sx={{
                            width: '100%',
                            flexDirection: 'column',
                            p: 1.5,
                            pt: 2,
                            borderRadius: `${Math.max(16, look.radius)}px`,
                            border: '3px solid',
                            borderColor: on ? look.primary : '#ECEDF3',
                            bgcolor: on ? `${look.primary}10` : '#fff',
                            transition: 'transform .12s, border-color .12s',
                            '&:hover': { borderColor: on ? look.primary : `${look.primary}66`, transform: 'translateY(-2px)' },
                          }}
                        >
                          <Box sx={{ height: 118, display: 'grid', placeItems: 'center' }}>
                            <BuddyFor look={look} buddy={b} size={b.art.kind === 'nano' ? (look.art ? 110 : 96) : 104} wave={on} />
                          </Box>
                          <Typography sx={{ fontWeight: 900, fontSize: 16, mt: 1, color: look.ink }}>{b.name}</Typography>
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.3 }}>{b.role}</Typography>
                        </ButtonBase>
                        {on && <CheckCircle sx={{ position: 'absolute', top: 8, left: 8, color: look.primary }} aria-hidden />}
                        <Tooltip title={`Hear ${b.name}`}>
                          <IconButton size="small" aria-label={`Hear ${b.name}`} onClick={() => speak(helloLine(b, first, prefs.language), prefs.language, b.voice)} sx={{ position: 'absolute', top: 6, right: 6, color: look.primary }}>
                            <VolumeUp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} sx={{ borderRadius: 999, px: 3, fontWeight: 800 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
