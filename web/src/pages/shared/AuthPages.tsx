import { Alert, Box, Button, ButtonBase, Card, CardContent, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/VisibilityOutlined';
import VisibilityOff from '@mui/icons-material/VisibilityOffOutlined';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage, setAccessToken } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/AppLayout';
import { PORTAL_BASE } from '@/portals/types';
import { IDENTITIES, ParentArt, PartnerArt, SCENE_ART, SchoolArt, StudentScene, TABS, TeacherArt, type Who } from './LoginScenes';
import heroMeadow from '@/assets/little/hero-meadow.webp';
import nano1 from '@/assets/little/nano-1.webp';

/** Password resets are for grown-ups (students ask their teacher), so the student scene falls back to the school one. */
const grownUp = (w: Who): Who => (w === 'student' ? 'school' : w);
const ROLE_WHO: Record<string, Who> = { student: 'student', parent: 'parent', teacher: 'teacher', school_admin: 'school', partner: 'partner', super_admin: 'admin' };

const WHO_KEY = 'ns.loginAs';
const isWho = (v: string | null): v is Who => !!v && v in IDENTITIES;
function rememberedWho(): Who {
  try {
    const v = localStorage.getItem(WHO_KEY);
    return isWho(v) ? v : 'student';
  } catch {
    return 'student';
  }
}

function lastWho(): Who | null {
  try {
    const v = localStorage.getItem(WHO_KEY);
    return isWho(v) ? v : null;
  } catch {
    return null;
  }
}

/** Which sign-in page to show: ?as=teacher in the link; with none, the "Who are you?" chooser comes first. */
function useWho(): [Who | null, (w: Who | null) => void] {
  const [params, setParams] = useSearchParams();
  const q = params.get('as');
  const who = isWho(q) ? q : null;
  const setWho = (w: Who | null) => {
    if (w) {
      try {
        localStorage.setItem(WHO_KEY, w);
      } catch {
        /* storage blocked */
      }
    }
    const p = new URLSearchParams(params);
    if (w) p.set('as', w);
    else p.delete('as');
    setParams(p);
  };
  return [who, setWho];
}

/** Step 1: who is signing in? Choosing a card changes the whole page straight away. */
function WhoChooser({ onPick }: { onPick: (w: Who) => void }) {
  const last = lastWho();
  const cards: { who: Who; art: ReactNode; line: string }[] = [
    { who: 'student', art: <Box component="img" src={nano1} alt="" sx={{ height: '88%', filter: 'drop-shadow(0 10px 12px rgba(40,30,80,.25))' }} />, line: 'Lessons, games and NanoBot' },
    { who: 'parent', art: <ParentArt />, line: 'Follow your child’s learning' },
    { who: 'teacher', art: <TeacherArt />, line: 'Teach and track your classes' },
    { who: 'school', art: <SchoolArt />, line: 'Run your school' },
    { who: 'partner', art: <PartnerArt />, line: 'Grow with your schools' },
  ];
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 12% 10%, #FFE9D6 0, transparent 40%), radial-gradient(circle at 90% 20%, #DDF5EC 0, transparent 38%), radial-gradient(circle at 70% 95%, #E6E8FF 0, transparent 45%), #FBFAF7',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 6 },
      }}
    >
      <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
        <Logo />
        <Typography component="h1" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 850, letterSpacing: '-0.02em', mt: { xs: 3, md: 5 }, mb: 1, fontFamily: '"Nunito Variable", "Inter Variable", sans-serif' }}>
          Welcome to Nanoskool! Who is signing in?
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: { xs: 3, md: 4 }, fontSize: 17 }}>Choose one to open your sign-in page.</Typography>
        <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 2.5 }, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' } }}>
          {cards.map((c) => {
            const id = IDENTITIES[c.who];
            const kid = c.who === 'student';
            return (
              <ButtonBase
                key={c.who}
                onClick={() => onPick(c.who)}
                aria-label={`I am a ${id.tab.toLowerCase()}`}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  textAlign: 'left',
                  borderRadius: kid ? '28px' : 4,
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  border: kid ? '3px solid #fff' : '1px solid #ECEDF3',
                  boxShadow: kid ? `0 8px 0 ${id.accent}40, 0 16px 40px rgba(40,30,80,.14)` : '0 10px 30px rgba(20,20,60,.07)',
                  transition: 'transform .18s, box-shadow .18s',
                  gridColumn: { xs: kid ? '1 / -1' : 'auto', sm: 'auto' },
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 14px 40px ${id.accent}40` },
                  '&:focus-visible': { outline: `3px solid ${id.accent}`, outlineOffset: 3 },
                }}
              >
                <Box sx={{ height: { xs: kid ? 170 : 120, md: 170 }, background: kid ? `url(${heroMeadow}) center bottom / cover` : id.panel, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', p: kid ? 0 : 1, position: 'relative' }}>
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', '& > div': { maxWidth: '100%' } }}>{c.art}</Box>
                  {last === c.who && <Box sx={{ position: 'absolute', top: 10, left: 10, px: 1, py: 0.25, borderRadius: 999, bgcolor: 'rgba(255,255,255,.92)', fontSize: 11.5, fontWeight: 800, color: id.accent }}>Last time</Box>}
                </Box>
                <Box sx={{ p: 2, fontFamily: kid ? id.font : undefined }}>
                  <Typography sx={{ fontWeight: 900, fontSize: kid ? 22 : 18, fontFamily: 'inherit', display: 'flex', gap: 0.75, alignItems: 'center' }}>
                    <span aria-hidden>{id.emoji}</span> {id.tab}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 14, fontFamily: 'inherit' }}>{c.line}</Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Link component="button" type="button" variant="body2" onClick={() => onPick('admin')} sx={{ color: 'text.disabled' }}>
            Nanoskool team sign in
          </Link>
        </Box>
      </Box>
    </Box>
  );
}

function WhoTabs({ who, onChange }: { who: Who; onChange: (w: Who) => void }) {
  const id = IDENTITIES[who];
  const kid = who === 'student';
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1, letterSpacing: '0.04em' }}>I AM A…</Typography>
      <Box role="tablist" aria-label="Who is signing in" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {TABS.map((k) => {
          const on = k === who;
          const t = IDENTITIES[k];
          return (
            <ButtonBase
              key={k}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(k)}
              sx={{
                flexShrink: 0,
                gap: 0.75,
                px: 1.5,
                py: 0.9,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                fontFamily: kid ? id.font : undefined,
                border: '2px solid',
                borderColor: on ? t.accent : '#E6E7EF',
                bgcolor: on ? t.accent : '#fff',
                color: on ? t.accentInk : '#3B3F55',
                transition: 'all .15s',
                '&:hover': { borderColor: t.accent },
              }}
            >
              <span aria-hidden>{t.emoji}</span>
              {t.tab}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

/** The sign-in page frame for one kind of user. */
function AuthShell({ who, title, subtitle, children, top }: { who: Who; title: string; subtitle?: string; children: ReactNode; top?: ReactNode }) {
  const id = IDENTITIES[who];
  const kid = who === 'student';
  const dark = who === 'partner' || who === 'admin';
  const card = (
    <Card
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: kid ? 460 : 440,
        borderRadius: kid ? '32px' : 4,
        border: kid ? '4px solid #fff' : '1px solid #ECEDF3',
        boxShadow: kid ? '0 10px 0 rgba(40,30,80,.10), 0 24px 60px rgba(40,30,80,.22)' : '0 20px 50px rgba(20,20,60,.08)',
        bgcolor: kid ? 'rgba(255,255,255,0.96)' : '#fff',
        fontFamily: id.font,
        '& .MuiTypography-root, & .MuiInputBase-root, & .MuiButton-root, & .MuiFormLabel-root': id.font ? { fontFamily: id.font } : {},
        '& .MuiOutlinedInput-root': kid ? { borderRadius: '18px', fontSize: 18, bgcolor: '#FFFDF8' } : { borderRadius: 2.5 },
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: id.accent, borderWidth: 2 },
        '& .MuiFormLabel-root.Mui-focused': { color: id.accent },
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Box sx={{ mb: 2.5, display: kid ? 'block' : { xs: 'none', md: 'block' } }}>
          <Logo />
        </Box>
        {top}
        <Typography component="h1" sx={{ fontSize: kid ? 32 : 26, fontWeight: kid ? 900 : 750, lineHeight: 1.15, mb: subtitle ? 0 : 2.5, color: kid ? id.ink : 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && <Typography sx={{ color: 'text.secondary', mb: 3, mt: 0.75, fontSize: kid ? 17 : 15 }}>{subtitle}</Typography>}
        {children}
      </CardContent>
    </Card>
  );
  if (kid) return <StudentScene>{card}</StudentScene>;
  const Art = SCENE_ART[who];
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' }, gridTemplateRows: { xs: 'auto 1fr', md: '1fr' }, bgcolor: '#F7F7FB' }}>
      <Box sx={{ background: id.panel, color: id.ink, p: { xs: 3, md: 6 }, display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 3 }, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ alignSelf: 'flex-start' }}>
          <Logo white={dark} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: { xs: 24, md: 36 }, fontWeight: 800, lineHeight: 1.15, mb: 1.5, maxWidth: 520, letterSpacing: '-0.01em' }}>{id.headline}</Typography>
          <Typography sx={{ opacity: 0.85, maxWidth: 480, display: { xs: 'none', sm: 'block' } }}>{id.message}</Typography>
        </Box>
        <Stack spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
          {id.points.map((p) => (
            <Stack key={p} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: id.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>✓</Box>
              <Typography sx={{ fontWeight: 600 }}>{p}</Typography>
            </Stack>
          ))}
        </Stack>
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'flex-end' }}>
          <Art />
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.6, display: { xs: 'none', md: 'block' } }}>
          © {new Date().getFullYear()} Nanoskool
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', placeItems: { xs: 'start center', md: 'center' }, p: { xs: 2, sm: 3 }, mt: { xs: -3, md: 0 } }}>{card}</Box>
    </Box>
  );
}

function PasswordField({ label, value, onChange, kid, autoComplete = 'current-password' }: { label: string; value: string; onChange: (v: string) => void; kid?: boolean; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      required
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} edge="end">
                {kid ? (
                  <Box component="span" sx={{ fontSize: 20 }}>
                    {show ? '🙈' : '👀'}
                  </Box>
                ) : show ? (
                  <VisibilityOff />
                ) : (
                  <Visibility />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [picked, setWho] = useWho();
  const who: Who = picked ?? 'student';
  const id = IDENTITIES[who];
  const kid = who === 'student';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(identifier, password);
      navigate(user.mustChangePassword ? '/change-password' : PORTAL_BASE[user.role], { replace: true });
    } catch (err) {
      setError(kid ? 'Hmm, that didn’t work. Check your username and password and try again!' : errorMessage(err, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  };
  if (!picked) return <WhoChooser onPick={setWho} />;
  return (
    <Box key={who} sx={{ '@keyframes lsIn': { from: { opacity: 0 }, to: { opacity: 1 } }, animation: 'lsIn .35s ease-out', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
      <AuthShell who={who} title={id.title} subtitle={kid ? 'Type your username and secret password to start.' : undefined} top={who === 'admin' ? undefined : <WhoTabs who={who} onChange={setWho} />}>
        <form onSubmit={submit}>
          <Stack spacing={2}>
            {error && (
              <Alert severity={kid ? 'warning' : 'error'} sx={kid ? { borderRadius: '16px', fontSize: 15 } : undefined}>
                {error}
              </Alert>
            )}
            <TextField label={id.idLabel} placeholder={id.idPlaceholder} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required slotProps={{ inputLabel: { shrink: true } }} />
            <PasswordField label={id.passLabel} value={password} onChange={setPassword} kid={kid} />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              sx={{
                bgcolor: id.accent,
                color: id.accentInk,
                borderRadius: kid ? 999 : 2.5,
                py: kid ? 1.6 : 1.3,
                fontSize: kid ? 20 : 16,
                fontWeight: kid ? 900 : 700,
                boxShadow: kid ? `0 6px 0 ${id.accent}99` : 'none',
                '&:hover': { bgcolor: id.accent, filter: 'brightness(0.95)', boxShadow: kid ? `0 6px 0 ${id.accent}99` : 'none' },
                '&:active': kid ? { transform: 'translateY(3px)', boxShadow: `0 3px 0 ${id.accent}99` } : {},
              }}
            >
              {busy ? (kid ? 'Opening…' : 'Signing in…') : id.button}
            </Button>
            {kid ? (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 15 }}>{id.forgot}</Typography>
            ) : (
              <Link component={RouterLink} to={`/forgot-password?as=${who}`} variant="body2" sx={{ textAlign: 'center', color: id.accent, fontWeight: 600 }}>
                {id.forgot}
              </Link>
            )}
            <Box sx={{ textAlign: 'center', pt: 0.5 }}>
              <Link component="button" type="button" variant="body2" onClick={() => setWho(null)} sx={{ color: 'text.secondary', fontFamily: 'inherit' }}>
                ← Not {who === 'admin' ? 'Nanoskool team' : `a ${id.tab.toLowerCase()}`}? Choose again
              </Link>
            </Box>
          </Stack>
        </form>
      </AuthShell>
    </Box>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  return (
    <AuthShell who={grownUp(rememberedWho())} title="Reset password" subtitle="We will email you a link to set a new password. Students without email: ask your teacher or school.">
      {done ? (
        <Alert severity="success">{done}</Alert>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await api.post('/auth/forgot-password', { email });
              setDone(r.data.message);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" variant="contained">
              Send reset link
            </Button>
          </Stack>
        </form>
      )}
      <Link component={RouterLink} to={`/login?as=${rememberedWho()}`} variant="body2" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const token = params.get('token') ?? '';
  return (
    <AuthShell who={grownUp(rememberedWho())} title="Set a new password" subtitle="At least 8 characters, with a letter and a number.">
      {done ? (
        <Stack spacing={2}>
          <Alert severity="success">Your password is set. You can sign in now.</Alert>
          <Button component={RouterLink} to="/login" variant="contained">
            Go to sign in
          </Button>
        </Stack>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (password !== confirm) return setError('Passwords do not match');
            try {
              await api.post('/auth/reset-password', { token, password });
              setDone(true);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <Stack spacing={2}>
            {!token && <Alert severity="warning">This link is missing its token. Open the link from your email again.</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            <TextField label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            <Button type="submit" variant="contained" disabled={!token}>
              Save password
            </Button>
          </Stack>
        </form>
      )}
    </AuthShell>
  );
}

export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        if (next !== confirm) return setError('New passwords do not match');
        try {
          const r = await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
          setAccessToken(r.data.accessToken);
          setOk(true);
          setCurrent('');
          setNext('');
          setConfirm('');
          onDone?.();
        } catch (err) {
          setError(errorMessage(err));
        }
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {ok && <Alert severity="success">Password changed.</Alert>}
        <TextField label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        <TextField label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} helperText="At least 8 characters, with a letter and a number" autoComplete="new-password" required />
        <TextField label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        <Button type="submit" variant="contained">
          Change password
        </Button>
      </Stack>
    </form>
  );
}

/** Shown after first sign-in with a one-time password. */
export function ForceChangePasswordPage() {
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <AuthShell who={ROLE_WHO[user.role] ?? 'school'} title="Choose your password" subtitle="You signed in with a one-time password. Pick your own to continue.">
      <ChangePasswordForm
        onDone={async () => {
          await reload();
          navigate(PORTAL_BASE[user.role], { replace: true });
        }}
      />
    </AuthShell>
  );
}
