import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage, setAccessToken } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/AppLayout';
import { PORTAL_BASE } from '@/portals/types';

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' } }}>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: 6, color: '#fff', background: 'linear-gradient(135deg, #2C2A93 0%, #3F3DBF 55%, #6B69E0 100%)' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 22 }}>
          Nano<Box component="span" sx={{ color: '#FFB877' }}>skool</Box>
        </Typography>
        <Box>
          <Typography variant="h4" sx={{ fontSize: 36, lineHeight: 1.2, mb: 2 }}>
            STEM, coding and robotics learning for every school.
          </Typography>
          <Typography sx={{ opacity: 0.85, maxWidth: 460 }}>
            One place for schools, teachers, students and parents: courses, projects, quizzes, attendance, progress and an AI tutor.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          © {new Date().getFullYear()} Nanoskool
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: 3 }}>
        <Card sx={{ width: '100%', maxWidth: 420 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Logo />
            </Box>
            <Typography variant="h5">{title}</Typography>
            {subtitle && (
              <Typography color="text.secondary" sx={{ mb: 3, mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      setError(errorMessage(err, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell title="Sign in" subtitle="Use your email or the username your school gave you.">
      <form onSubmit={submit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email or username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ textAlign: 'center' }}>
            Forgot your password?
          </Link>
        </Stack>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  return (
    <AuthShell title="Reset password" subtitle="We will email you a link to set a new password. Students without email: ask your teacher or school.">
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
      <Link component={RouterLink} to="/login" variant="body2" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
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
    <AuthShell title="Set a new password" subtitle="At least 8 characters, with a letter and a number.">
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
    <AuthShell title="Choose your password" subtitle="You signed in with a one-time password. Pick your own to continue.">
      <ChangePasswordForm
        onDone={async () => {
          await reload();
          navigate(PORTAL_BASE[user.role], { replace: true });
        }}
      />
    </AuthShell>
  );
}
