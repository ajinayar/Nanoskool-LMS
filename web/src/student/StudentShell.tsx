/**
 * The student app's frame. It reads the student's grade, applies that grade's theme and
 * picks one of three layouts: little (1–3), junior (4–7) or senior (8–10).
 */
import { Avatar, Box, ButtonBase, Chip, Drawer, GlobalStyles, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import Home from '@mui/icons-material/HomeRounded';
import AutoStories from '@mui/icons-material/AutoStoriesRounded';
import Assignment from '@mui/icons-material/AssignmentRounded';
import Quiz from '@mui/icons-material/QuizRounded';
import Insights from '@mui/icons-material/InsightsRounded';
import SmartToy from '@mui/icons-material/SmartToyRounded';
import Campaign from '@mui/icons-material/CampaignOutlined';
import Event from '@mui/icons-material/EventOutlined';
import EmojiEvents from '@mui/icons-material/EmojiEventsRounded';
import Person from '@mui/icons-material/PersonOutlined';
import Logout from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import VolumeUp from '@mui/icons-material/VolumeUpRounded';
import Redeem from '@mui/icons-material/RedeemRounded';
import Visibility from '@mui/icons-material/VisibilityOutlined';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useMe } from '@/auth/AuthContext';
import { NanoFor, StarIcon } from './art';
import { ICON_ART } from './art-images';
import { themeFor, tint, type Look, type Words } from './looks';
import { LookProvider, PREVIEW_ENABLED, speak, useLookState, useRewards } from './useLook';
import { PointsPill, S, StreakPill } from './widgets';

interface NavDef {
  key: keyof Words;
  path: string;
  icon: ReactNode;
}
const NAV: Record<string, NavDef> = {
  home: { key: 'home', path: '', icon: <Home /> },
  courses: { key: 'courses', path: 'courses', icon: <AutoStories /> },
  assignments: { key: 'assignments', path: 'assignments', icon: <Assignment /> },
  quizzes: { key: 'quizzes', path: 'quizzes', icon: <Quiz /> },
  progress: { key: 'progress', path: 'progress', icon: <Insights /> },
  rewards: { key: 'rewards', path: 'rewards', icon: <EmojiEvents /> },
  nanobot: { key: 'nanobot', path: 'nanobot', icon: <SmartToy /> },
};
const to = (n: NavDef) => (n.path ? `${S}/${n.path}` : S);
function useActive() {
  const loc = useLocation();
  return (n: NavDef) => (n.path ? loc.pathname.startsWith(`${S}/${n.path}`) || (n.path === 'courses' && loc.pathname.startsWith(`${S}/units`)) : loc.pathname === S || loc.pathname === `${S}/`);
}

export function StudentShell() {
  return (
    <LookProvider>
      <Themed />
    </LookProvider>
  );
}

function Themed() {
  const { look } = useLookState();
  return (
    <ThemeProvider theme={themeFor(look)}>
      <GlobalStyles styles={{ body: { backgroundColor: look.surface, color: look.ink, fontFamily: look.font } }} />
      <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: -1, background: look.art ? `url(${look.art.backdrop}) center bottom / cover no-repeat, ${look.bg}` : look.bg }} />
      {look.band === 'little' ? <LittleShell look={look} /> : look.band === 'junior' ? <JuniorShell look={look} /> : <SeniorShell look={look} />}
      {PREVIEW_ENABLED && <PreviewSwitcher />}
    </ThemeProvider>
  );
}

/** Profile menu with the less-used pages (announcements, events, profile, sign out). */
function ProfileMenu({ anchor, onClose, look, extra }: { anchor: HTMLElement | null; onClose: () => void; look: Look; extra?: NavDef[] }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const go = (p: string) => {
    onClose();
    navigate(p);
  };
  return (
    <Menu anchorEl={anchor} open={!!anchor} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
      {extra?.map((n) => (
        <MenuItem key={n.key} onClick={() => go(to(n))}>
          <ListItemIcon>{n.icon}</ListItemIcon>
          {look.words[n.key]}
        </MenuItem>
      ))}
      <MenuItem onClick={() => go(`${S}/announcements`)}>
        <ListItemIcon><Campaign fontSize="small" /></ListItemIcon>
        {look.band === 'little' ? 'News from school' : 'Announcements'}
      </MenuItem>
      <MenuItem onClick={() => go(`${S}/events`)}>
        <ListItemIcon><Event fontSize="small" /></ListItemIcon>
        Events
      </MenuItem>
      <MenuItem onClick={() => go(`${S}/profile`)}>
        <ListItemIcon><Person fontSize="small" /></ListItemIcon>
        My profile
      </MenuItem>
      <MenuItem
        onClick={async () => {
          onClose();
          await logout();
          navigate('/login');
        }}
      >
        <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
        Sign out
      </MenuItem>
    </Menu>
  );
}

/* ------------------------------------------------------------------ Grades 1–3 */

function LittleShell({ look }: { look: Look }) {
  const me = useMe();
  const rewards = useRewards();
  const navigate = useNavigate();
  const isActive = useActive();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tabs = [NAV.home, NAV.courses, NAV.quizzes, NAV.assignments, NAV.rewards];
  const first = me.name.split(' ')[0];
  const readAloud = () => {
    const text = Array.from(document.querySelectorAll('[data-read]')).map((el) => el.textContent ?? '').join('. ');
    speak(text || `Hi ${first}! Tap a picture to start.`);
  };
  const round = { width: 52, height: 52, borderRadius: '18px', bgcolor: '#FFFFFF', boxShadow: '0 4px 0 rgba(40,30,80,0.08)', '& svg': { fontSize: 28 } };
  return (
    <Box sx={{ minHeight: '100vh', pb: 16, overflowX: 'clip' }}>
      <Box component="header" sx={{ position: 'relative', zIndex: 3, maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 3 }, pt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ButtonBase onClick={(e) => setAnchor(e.currentTarget)} aria-label="My profile" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pl: 0.75, pr: 2, py: 0.75, borderRadius: 999, bgcolor: '#FFFFFF', boxShadow: '0 4px 0 rgba(40,30,80,0.08)' }}>
          <Avatar src={me.avatarUrl || undefined} sx={{ width: 46, height: 46, bgcolor: look.tiles[3], color: '#fff', fontWeight: 900, fontSize: 20 }}>{first[0]}</Avatar>
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 900, fontSize: 17, lineHeight: 1.1 }}>Hi, {first}!</Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <StarIcon size={18} />
              <Typography sx={{ fontWeight: 900, fontSize: 16 }}>{rewards.data?.xp ?? '…'}</Typography>
            </Stack>
          </Box>
        </ButtonBase>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Daily gift">
          <IconButton onClick={() => navigate(`${S}/rewards`)} aria-label="Daily gift" sx={{ ...round, color: look.tiles[0], bgcolor: '#FFE9EC' }}>
            {look.art ? <Box component="img" src={ICON_ART.gift} alt="" sx={{ width: 36, height: 36 }} /> : <Redeem />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Read aloud">
          <IconButton onClick={readAloud} aria-label="Read this page aloud" sx={{ ...round, color: look.tiles[3], bgcolor: '#E3F0FF' }}>
            <VolumeUp />
          </IconButton>
        </Tooltip>
      </Box>
      <ProfileMenu anchor={anchor} onClose={() => setAnchor(null)} look={look} extra={[NAV.progress, NAV.nanobot]} />

      <Box component="main" sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 3 }, pt: 2.5 }}>
        <Outlet />
      </Box>

      {/* Nano: always one tap away */}
      <Tooltip title={look.words.nanobot} placement="left">
        <ButtonBase
          component={NavLink}
          to={`${S}/nanobot`}
          aria-label={look.words.nanobot}
          sx={{ position: 'fixed', right: { xs: 12, md: 28 }, bottom: { xs: 96, md: 110 }, borderRadius: '50%', bgcolor: '#FFFFFF', width: 76, height: 76, boxShadow: '0 6px 0 rgba(40,30,80,0.1), 0 6px 20px rgba(40,30,80,0.15)', zIndex: 20 }}
        >
          <NanoFor look={look} size={look.art ? 70 : 58} wave={false} />
        </ButtonBase>
      </Tooltip>

      <Box component="nav" aria-label="Main" sx={{ position: 'fixed', left: 0, right: 0, bottom: { xs: 10, md: 18 }, display: 'flex', justifyContent: 'center', px: 1.5, zIndex: 30 }}>
        <Stack direction="row" sx={{ bgcolor: look.primary, background: look.art ? `linear-gradient(90deg, ${look.art.ribbon} 0%, ${look.primary} 100%)` : undefined, border: look.art ? '3px solid #fff' : 'none', borderRadius: 999, p: 0.75, gap: 0.5, boxShadow: `0 6px 0 ${tint('#000000', 0.12)}, 0 10px 30px ${tint(look.primary, 0.35)}`, width: '100%', maxWidth: 620 }}>
          {tabs.map((n) => {
            const active = isActive(n);
            return (
              <ButtonBase
                key={n.key}
                component={NavLink}
                to={to(n)}
                aria-current={active ? 'page' : undefined}
                sx={{ flex: 1, flexDirection: 'column', gap: 0.25, py: 0.9, borderRadius: 999, color: active ? look.primary : '#FFFFFF', bgcolor: active ? '#FFFFFF' : 'transparent', '& svg': { fontSize: 28 }, transition: 'background-color .15s' }}
              >
                {n.icon}
                <Typography sx={{ fontSize: { xs: 11.5, sm: 13 }, fontWeight: 900, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{look.words[n.key]}</Typography>
              </ButtonBase>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ Grades 4–7 */

function JuniorShell({ look }: { look: Look }) {
  const me = useMe();
  const rewards = useRewards();
  const isActive = useActive();
  const desktop = useMediaQuery('(min-width:1100px)');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const top = [NAV.home, NAV.courses, NAV.assignments, NAV.quizzes, NAV.progress, NAV.rewards, NAV.nanobot];
  const bottom = [NAV.home, NAV.courses, NAV.assignments, NAV.quizzes, NAV.rewards];
  return (
    <Box sx={{ minHeight: '100vh', pb: desktop ? 6 : 12 }}>
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${look.line}` }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 3 }, height: 64, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '11px', bgcolor: look.primary, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>N</Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>Nanoskool</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.2 }}>{look.name}</Typography>
            </Box>
          </Stack>
          {desktop && (
            <Stack component="nav" aria-label="Main" direction="row" spacing={0.5} sx={{ flex: 1, justifyContent: 'center' }}>
              {top.map((n) => {
                const active = isActive(n);
                return (
                  <ButtonBase
                    key={n.key}
                    component={NavLink}
                    to={to(n)}
                    aria-current={active ? 'page' : undefined}
                    sx={{ px: 1.75, py: 0.9, borderRadius: 999, fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', color: active ? look.primary : look.ink2, bgcolor: active ? tint(look.primary, 0.1) : 'transparent', '&:hover': { bgcolor: tint(look.primary, 0.07) } }}
                  >
                    {look.words[n.key]}
                  </ButtonBase>
                );
              })}
            </Stack>
          )}
          {!desktop && <Box sx={{ flex: 1 }} />}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {rewards.data && !desktop && (
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <StreakPill look={look} streak={rewards.data.streak} />
              </Box>
            )}
            {rewards.data && <PointsPill look={look} xp={rewards.data.xp} />}
            <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="My profile" sx={{ p: 0.25 }}>
              <Avatar src={me.avatarUrl || undefined} sx={{ width: 38, height: 38, bgcolor: look.accent, color: '#fff', fontWeight: 800 }}>{me.name[0]}</Avatar>
            </IconButton>
          </Stack>
        </Box>
      </Box>
      <ProfileMenu anchor={anchor} onClose={() => setAnchor(null)} look={look} extra={desktop ? undefined : [NAV.progress, NAV.nanobot]} />
      <Box component="main" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 3 }, pt: 3 }}>
        <Outlet />
      </Box>
      {!desktop && (
        <Box component="nav" aria-label="Main" sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, bgcolor: '#FFFFFF', borderTop: `1px solid ${look.line}`, display: 'flex', pb: 'env(safe-area-inset-bottom)' }}>
          {bottom.map((n) => {
            const active = isActive(n);
            return (
              <ButtonBase key={n.key} component={NavLink} to={to(n)} aria-current={active ? 'page' : undefined} sx={{ flex: 1, flexDirection: 'column', py: 1, gap: 0.25, color: active ? look.primary : look.ink2, '& svg': { fontSize: 24 } }}>
                {n.icon}
                <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{look.words[n.key].replace('My ', '')}</Typography>
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ Grades 8–10 */

const SIDEBAR = 244;

function SeniorShell({ look }: { look: Look }) {
  const me = useMe();
  const desktop = useMediaQuery('(min-width:900px)');
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const rewards = useRewards();
  const side = look.sidebar!;
  const sidebar = <SeniorSidebar look={look} onNavigate={() => setOpen(false)} />;
  return (
    <Box sx={{ minHeight: '100vh' }}>
      {desktop ? (
        <Box component="aside" sx={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR, bgcolor: side.bg, borderRight: `1px solid ${side.bg === '#FFFFFF' ? look.line : 'transparent'}` }}>{sidebar}</Box>
      ) : (
        <Drawer open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: SIDEBAR, bgcolor: side.bg } } }}>
          {sidebar}
        </Drawer>
      )}
      <Box sx={{ ml: desktop ? `${SIDEBAR}px` : 0 }}>
        <Box component="header" sx={{ height: 60, px: { xs: 2, md: 4 }, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${look.line}`, bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
          {!desktop && (
            <IconButton onClick={() => setOpen(true)} aria-label="Open menu" edge="start">
              <MenuIcon />
            </IconButton>
          )}
          <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Typography>
          <Box sx={{ flex: 1 }} />
          {rewards.data && (
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', display: { xs: 'none', sm: 'flex' }, color: 'text.secondary', fontSize: 13.5 }}>
              <span>
                <b style={{ color: look.ink }}>{rewards.data.streak}</b> day streak
              </span>
              <span>
                Level <b style={{ color: look.ink }}>{rewards.data.level}</b> · {rewards.data.xp.toLocaleString('en-IN')} XP
              </span>
            </Stack>
          )}
          <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="My profile" sx={{ p: 0.25 }}>
            <Avatar src={me.avatarUrl || undefined} sx={{ width: 34, height: 34, bgcolor: look.primary, color: '#fff', fontSize: 15 }}>{me.name[0]}</Avatar>
          </IconButton>
        </Box>
        <ProfileMenu anchor={anchor} onClose={() => setAnchor(null)} look={look} />
        <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1320 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

function SeniorSidebar({ look, onNavigate }: { look: Look; onNavigate: () => void }) {
  const me = useMe();
  const isActive = useActive();
  const side = look.sidebar!;
  const groups: { name: string; items: NavDef[] }[] = [
    { name: 'Study', items: [NAV.home, NAV.courses, NAV.assignments, NAV.quizzes, NAV.nanobot] },
    { name: 'Track', items: [NAV.progress, NAV.rewards] },
  ];
  const row = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    px: 1.5,
    py: 0.85,
    borderRadius: 1.5,
    color: active ? side.ink : side.ink2,
    bgcolor: active ? side.active : 'transparent',
    fontWeight: active ? 600 : 500,
    fontSize: 14,
    textDecoration: 'none',
    '& svg': { fontSize: 19 },
    '&:hover': { bgcolor: side.active, color: side.ink },
  });
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 3, color: side.ink }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 1.5, height: 28 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: look.primary === '#18181B' ? look.accent : look.primary, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>N</Box>
        <Typography sx={{ fontWeight: 650, fontSize: 16 }}>Nanoskool</Typography>
      </Stack>
      {groups.map((g) => (
        <Box key={g.name}>
          <Typography sx={{ px: 1.5, mb: 0.75, fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: side.ink2 }}>{g.name}</Typography>
          <Stack spacing={0.25}>
            {g.items.map((n) => (
              <Box key={n.key} component={NavLink} to={to(n)} onClick={onNavigate} sx={row(isActive(n))}>
                {n.icon}
                {look.words[n.key]}
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
      <Box>
        <Typography sx={{ px: 1.5, mb: 0.75, fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: side.ink2 }}>School</Typography>
        <Stack spacing={0.25}>
          <Box component={NavLink} to={`${S}/announcements`} onClick={onNavigate} sx={row(false)}>
            <Campaign />
            Announcements
          </Box>
          <Box component={NavLink} to={`${S}/events`} onClick={onNavigate} sx={row(false)}>
            <Event />
            Events
          </Box>
        </Stack>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 1.5 }}>
        <Avatar src={me.avatarUrl || undefined} sx={{ width: 32, height: 32, fontSize: 14, bgcolor: side.active, color: side.ink }}>{me.name[0]}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600 }}>{me.name}</Typography>
          <Typography noWrap sx={{ fontSize: 12, color: side.ink2 }}>{me.class?.name ?? 'Student'}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------------ Preview (development only) */

function PreviewSwitcher() {
  const { look, preview, realGrade, setPreview } = useLookState();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Chip
        icon={<Visibility />}
        label={preview ? `Previewing Grade ${preview}` : `Grade ${realGrade ?? '?'} look`}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ position: 'fixed', left: 12, bottom: look.band === 'little' ? 100 : look.band === 'junior' ? 76 : 12, zIndex: 40, bgcolor: '#1E1E24', color: '#fff', fontWeight: 600, '& .MuiChip-icon': { color: '#fff' }, '&:hover': { bgcolor: '#000' } }}
      />
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem disabled sx={{ fontSize: 12.5 }}>Preview a grade (development only)</MenuItem>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
          <MenuItem key={g} selected={look.grade === g} onClick={() => { setPreview(g); setAnchor(null); }}>
            Grade {g}
          </MenuItem>
        ))}
        <MenuItem onClick={() => { setPreview(null); setAnchor(null); }}>My own grade{realGrade ? ` (${realGrade})` : ''}</MenuItem>
      </Menu>
    </>
  );
}
