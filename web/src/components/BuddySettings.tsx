/** School settings → which NanoBot buddies students may choose (Nano is always on). */
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUncheckedRounded';
import { useMemo, useState } from 'react';
import type { School } from '@/api/types';
import { BUDDIES, GROUPS } from '@/lib/buddies';
import { useSend } from '@/lib/hooks';
import { BuddyFor } from '@/student/buddyArt';
import { lookFor } from '@/student/looks';

export function BuddySettings({ school }: { school: School }) {
  const look = useMemo(() => lookFor(6), []);
  const all = BUDDIES.filter((b) => b.key !== 'nano').map((b) => b.key);
  const [on, setOn] = useState<Set<string>>(() => new Set(school.nanobotBuddies?.length ? school.nanobotBuddies : all));
  const save = useSend<{ nanobotBuddies: string[] }>('patch', `/schools/${school._id}`, { success: 'NanoBot buddies saved', invalidate: ['/schools', '/auth/me'] });
  const toggle = (k: string) => {
    const n = new Set(on);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setOn(n);
  };
  const keys = [...on];
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Students can choose a buddy for NanoBot. The buddy changes NanoBot&apos;s look, greeting and voice; it always stays NanoBot, an AI helper, with the same safety rules. Nano the robot is always available.
      </Typography>
      <Stack spacing={2}>
        {GROUPS.map((g) => (
          <Box key={g.key}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'text.secondary', mb: 1 }}>{g.label}</Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {BUDDIES.filter((b) => b.group === g.key).map((b) => {
                const nano = b.key === 'nano';
                const sel = nano || on.has(b.key);
                return (
                  <ButtonBase
                    key={b.key}
                    disabled={nano}
                    onClick={() => toggle(b.key)}
                    aria-pressed={sel}
                    sx={{ gap: 1, pl: 0.75, pr: 1.5, py: 0.75, borderRadius: 999, border: '1.5px solid', borderColor: sel ? 'primary.main' : 'divider', bgcolor: sel ? 'action.selected' : 'background.paper', opacity: nano ? 0.8 : 1 }}
                  >
                    <Box sx={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', bgcolor: '#F3F4F8', display: 'grid', placeItems: 'center' }}>
                      <BuddyFor look={look} buddy={b} size={nano ? 30 : 34} wave={false} face={!nano} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {b.name}
                    </Typography>
                    {sel ? <CheckCircle fontSize="small" color="primary" /> : <RadioButtonUnchecked fontSize="small" color="disabled" />}
                  </ButtonBase>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate({ nanobotBuddies: keys.length === all.length ? [] : keys.length ? keys : ['nano'] })}>
          {save.isPending ? 'Saving…' : 'Save buddies'}
        </Button>
        <Button onClick={() => setOn(new Set(all))}>Allow all</Button>
        <Button onClick={() => setOn(new Set())}>Only Nano</Button>
      </Stack>
    </Box>
  );
}
