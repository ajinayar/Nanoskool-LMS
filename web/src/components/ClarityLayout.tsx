import { Avatar, Badge, Box, Drawer, IconButton, Menu, MenuItem, ListItemIcon, Stack, Tooltip, Typography, useMediaQuery, GlobalStyles } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import Add from '@mui/icons-material/Add';
import Logout from '@mui/icons-material/Logout';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABEL } from '@/api/types';
import { useAuth, useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { CLARITY, clarityTheme } from '@/theme-clarity';
import { fromNow } from './ui';
import type { Portal } from '@/portals/types';

const WIDTH = 248;

interface TeamMember {
  _id: string;
  name: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

function NavRow({ to, icon, label, active, onClick }: { to: string; icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <Box
      component={NavLink}
      to={to}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 0.9,
        borderRadius: '12px',
        color: active ? CLARITY.ink : CLARITY.ink2,
        bgcolor: active ? CLARITY.hover : 'transparent',
        fontWeight: active ? 700 : 500,
        fontSize: 14.5,
        textDecoration: 'none',
        '& svg': { fontSize: 20, color: active ? CLARITY.ink : CLARITY.ink2 },
        '&:hover': { bgcolor: CLARITY.hover, color: CLARITY.ink },
      }}
    >
      {icon}
      <span>{label}</span>
    </Box>
  );
}

/** Online = signed in within the last 15 minutes. */
const isOnline = (d?: string) => !!d && Date.now() - new Date(d).getTime() < 15 * 60_000;

function Sidebar({ portal, onNavigate }: { portal: Portal; onNavigate: () => void }) {
  const me = useMe();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const hasTeam = me.role === 'super_admin' || me.role === 'school_admin';
  const dash = useGet<{ team?: TeamMember[] }>(hasTeam ? '/dashboard' : null);
  const teamLabel = me.role === 'school_admin' ? 'Staff' : 'Team';
  const teamAdd = me.role === 'school_admin' ? 'teachers?new=1' : 'users?new=1';
  const team = dash.data?.team ?? [];

  const groups: { name?: string; items: typeof portal.nav }[] = [];
  for (const item of portal.nav) {
    const last = groups.at(-1);
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 3, overflowY: 'auto' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 1.5, minHeight: 32 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: CLARITY.ink, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 600 }}>N</Box>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 19, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Nanoskool</Typography>
          <Typography sx={{ fontSize: 12, color: CLARITY.ink3 }}>{ROLE_LABEL[me.role]}</Typography>
        </Box>
      </Stack>
      {groups.map((g, gi) => (
        <Box key={g.name ?? gi}>
          {g.name && gi > 0 && (
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pl: 1.5, pr: 0.5, mb: 0.5 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 12.5, color: CLARITY.ink3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.name}</Typography>
              {portal.groupActions?.[g.name] && (
                <Tooltip title={`Add to ${g.name.toLowerCase()}`}>
                  <IconButton
                    size="small"
                    aria-label={`Add to ${g.name}`}
                    onClick={() => {
                      navigate(`${portal.base}/${portal.groupActions![g.name!]}`);
                      onNavigate();
                    }}
                    sx={{ color: CLARITY.ink2 }}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
          <Stack spacing={0.25}>
            {g.items.map((item) => {
              const to = item.path ? `${portal.base}/${item.path}` : portal.base;
              const active = item.path ? loc.pathname.startsWith(to) : loc.pathname === portal.base || loc.pathname === `${portal.base}/`;
              return <NavRow key={to} to={to} icon={item.icon} label={item.label} active={active} onClick={onNavigate} />;
            })}
          </Stack>
        </Box>
      ))}
      {team.length > 0 && (
        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pl: 1.5, pr: 0.5, mb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 12.5, color: CLARITY.ink3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{teamLabel}</Typography>
            <Tooltip title={me.role === 'school_admin' ? 'Add a teacher' : 'Add a super admin'}>
              <IconButton size="small" aria-label="Add a team member" onClick={() => { navigate(`${portal.base}/${teamAdd}`); onNavigate(); }} sx={{ color: CLARITY.ink2 }}>
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack spacing={1.25} sx={{ px: 1.5 }}>
            {team.map((m) => (
              <Stack key={m._id} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <Badge overlap="circular" variant="dot" invisible={!isOnline(m.lastLoginAt)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ '& .MuiBadge-dot': { bgcolor: CLARITY.green, border: `2px solid ${CLARITY.panel}`, width: 11, height: 11, borderRadius: '50%' } }}>
                  <Avatar src={m.avatarUrl} sx={{ width: 32, height: 32, fontSize: 14, bgcolor: CLARITY.lilac, color: CLARITY.ink }}>
                    {m.name[0]}
                  </Avatar>
                </Badge>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600 }}>{m.name}</Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: CLARITY.ink3 }}>{m.lastLoginAt ? `Active ${fromNow(m.lastLoginAt)}` : 'Not signed in yet'}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      <Box sx={{ flex: 1 }} />
      <Box
        component="button"
        onClick={async () => {
          await logout();
          navigate('/login');
        }}
        sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.9, borderRadius: '12px', color: CLARITY.ink2, fontSize: 14.5, fontWeight: 500, '&:hover': { bgcolor: CLARITY.hover, color: CLARITY.ink } }}
      >
        <Logout sx={{ fontSize: 20 }} />
        Log out
      </Box>
    </Box>
  );
}

export function ClarityLayout({ portal }: { portal: Portal }) {
  return (
    <ThemeProvider theme={clarityTheme}>
      <GlobalStyles styles={{ body: { backgroundColor: '#F4ECDD' } }} />
      {/* Fixed canvas so the warm gradient covers the whole page, however long */}
      <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: -1, background: CLARITY.canvas }} />
      <ClarityShell portal={portal} />
    </ThemeProvider>
  );
}

function ClarityShell({ portal }: { portal: Portal }) {
  const me = useMe();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const desktop = useMediaQuery(clarityTheme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {desktop ? (
        <Box component="nav" sx={{ position: 'fixed', top: 16, left: 16, bottom: 16, width: WIDTH, bgcolor: CLARITY.panel, borderRadius: '24px', border: `1px solid ${CLARITY.line}`, boxShadow: '0 1px 3px rgba(60,40,10,0.05)' }}>
          <Sidebar portal={portal} onNavigate={() => {}} />
        </Box>
      ) : (
        <Drawer open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: WIDTH + 24, bgcolor: CLARITY.panel } } }}>
          <Sidebar portal={portal} onNavigate={() => setOpen(false)} />
        </Drawer>
      )}
      <Box component="main" sx={{ ml: { md: `${WIDTH + 32}px` }, px: { xs: 2, md: 4 }, pt: 2, pb: 6, maxWidth: 1480 }}>
        <Stack direction="row" sx={{ alignItems: 'center', minHeight: 64, mb: 1 }}>
          {!desktop && (
            <IconButton onClick={() => setOpen(true)} aria-label="Open menu" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }} />
          <Box
            component="button"
            onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
            sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.25, pl: 0.5, pr: 1.5, py: 0.5, borderRadius: 999, bgcolor: 'rgba(255,253,248,0.7)', border: `1px solid ${CLARITY.line}` }}
          >
            <Avatar src={me.avatarUrl} sx={{ width: 34, height: 34, bgcolor: CLARITY.ink, fontSize: 15 }}>
              {me.name[0]}
            </Avatar>
            <Typography sx={{ fontSize: 14, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>{me.name}</Typography>
          </Box>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <MenuItem onClick={() => { setAnchor(null); navigate(`${portal.base}/profile`); }}>
              <ListItemIcon><PersonOutlined fontSize="small" /></ListItemIcon>
              My profile
            </MenuItem>
            <MenuItem onClick={async () => { setAnchor(null); await logout(); navigate('/login'); }}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Stack>
        <Outlet />
      </Box>
    </Box>
  );
}
