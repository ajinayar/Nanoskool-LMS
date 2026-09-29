import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Logout from '@mui/icons-material/Logout';
import PersonOutline from '@mui/icons-material/PersonOutlined';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABEL } from '@/api/types';
import { useAuth, useMe } from '@/auth/AuthContext';
import type { Portal } from '@/portals/types';
import { ClarityLayout } from './ClarityLayout';
import { StudentShell } from '@/student/StudentShell';

const WIDTH = 248;

export function Logo({ small }: { small?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: small ? 28 : 34, height: small ? 28 : 34, borderRadius: 2, bgcolor: 'secondary.main', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: small ? 15 : 18 }}>N</Box>
      <Typography sx={{ fontWeight: 800, fontSize: small ? 17 : 20, letterSpacing: -0.3 }}>
        Nano<Box component="span" sx={{ color: 'secondary.main' }}>skool</Box>
      </Typography>
    </Box>
  );
}

export function AppLayout({ portal }: { portal: Portal }) {
  if (portal.look === 'clarity') return <ClarityLayout portal={portal} />;
  // The student app changes with the student's grade (see src/student/looks.ts)
  if (portal.look === 'student') return <StudentShell />;
  return <ClassicLayout portal={portal} />;
}

function ClassicLayout({ portal }: { portal: Portal }) {
  const me = useMe();
  const { logout } = useAuth();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const loc = useLocation();

  const org = me.school?.name ?? me.partner?.name ?? (me.role === 'super_admin' ? 'Nanoskool HQ' : '');
  let lastGroup: string | undefined;
  const items: ReactNode[] = [];
  for (const item of portal.nav) {
    if (item.group && item.group !== lastGroup) {
      items.push(
        <ListSubheader key={`g-${item.group}`} sx={{ bgcolor: 'transparent', lineHeight: '32px', mt: 1, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {item.group}
        </ListSubheader>,
      );
      lastGroup = item.group;
    }
    const to = item.path ? `${portal.base}/${item.path}` : portal.base;
    const active = item.path ? loc.pathname.startsWith(to) : loc.pathname === portal.base || loc.pathname === `${portal.base}/`;
    items.push(
      <ListItemButton
        key={to}
        component={NavLink}
        to={to}
        selected={active}
        onClick={() => setOpen(false)}
        sx={{ mx: 1, borderRadius: 2, mb: 0.25, '&.Mui-selected': { bgcolor: 'rgba(63,61,191,0.10)', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } } }}
      >
        <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
        <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 14.5, fontWeight: active ? 650 : 500 } } }} />
      </ListItemButton>,
    );
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Logo />
        {org && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }} noWrap>
            {org}
          </Typography>
        )}
      </Box>
      <Divider />
      <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>{items}</List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Chip size="small" label={`${ROLE_LABEL[me.role]} portal`} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #E4E6F0', ml: { md: `${WIDTH}px` }, width: { md: `calc(100% - ${WIDTH}px)` } }}>
        <Toolbar>
          {!desktop && (
            <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }} aria-label="Open menu">
              <MenuIcon />
            </IconButton>
          )}
          {!desktop && <Logo small />}
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={(e) => setAnchor(e.currentTarget)}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {me.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ROLE_LABEL[me.role]}
                {me.class ? ` · ${me.class.name}` : ''}
              </Typography>
            </Box>
            <Avatar src={me.avatarUrl} sx={{ bgcolor: 'primary.main' }}>
              {me.name[0]}
            </Avatar>
          </Box>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <MenuItem
              onClick={() => {
                setAnchor(null);
                navigate(`${portal.base}/profile`);
              }}
            >
              <ListItemIcon>
                <PersonOutline fontSize="small" />
              </ListItemIcon>
              My profile
            </MenuItem>
            <MenuItem
              onClick={async () => {
                setAnchor(null);
                await logout();
                navigate('/login');
              }}
            >
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={desktop ? 'permanent' : 'temporary'}
          open={desktop || open}
          onClose={() => setOpen(false)}
          slotProps={{ paper: { sx: { width: WIDTH, borderRight: '1px solid #E4E6F0' } } }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 4 }, pt: { xs: 10, md: 12 }, maxWidth: 1400 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
