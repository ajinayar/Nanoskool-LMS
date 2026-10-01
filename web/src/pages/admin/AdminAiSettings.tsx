/**
 * Admin → AI settings: choose which AI powers Nanoskool (NanoBot, slides, "Create with AI", unit plans,
 * reading reference files) — Claude, OpenAI or offline — paste the API key, pick a model and test it.
 * Keys are stored encrypted on the server and never shown again (only the last 4 characters).
 */
import { Alert, Autocomplete, Box, Button, ButtonBase, Chip, CircularProgress, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircle from '@mui/icons-material/CheckCircleRounded';
import ErrorOutline from '@mui/icons-material/ErrorOutlineRounded';
import Visibility from '@mui/icons-material/VisibilityOutlined';
import VisibilityOff from '@mui/icons-material/VisibilityOffOutlined';
import CloudOff from '@mui/icons-material/CloudOffOutlined';
import SmartToy from '@mui/icons-material/SmartToyOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import { useEffect, useState, type ReactNode } from 'react';
import { api, errorMessage } from '@/api/client';
import { useGet } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { PageHeader, QueryState, Section } from '@/components/ui';

type Provider = 'offline' | 'anthropic' | 'openai' | 'nanobot';
interface View {
  provider: Provider;
  source: 'settings' | 'env';
  anthropic: { hasKey: boolean; keyHint: string | null; model: string };
  openai: { hasKey: boolean; keyHint: string | null; model: string };
  nanobotConfigured: boolean;
  lastTest: { provider: string; ok: boolean; message: string; at: string } | null;
  usage: { month: string; tokens: number; users: number };
  defaults: { anthropic: string; openai: string };
}

const PROVIDERS: { id: Provider; name: string; by: string; color: string; icon: ReactNode; about: string; keyUrl?: string; keyShape?: string; models?: string[] }[] = [
  {
    id: 'anthropic',
    name: 'Claude',
    by: 'Anthropic',
    color: '#D97757',
    icon: <AutoAwesome />,
    about: 'Strong at careful teaching, long documents and reading PDFs and pictures.',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyShape: 'sk-ant-…',
    models: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'],
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    by: 'OpenAI',
    color: '#10A37F',
    icon: <SmartToy />,
    about: 'GPT models. Also reads pictures and PDFs.',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyShape: 'sk-…',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'],
  },
  { id: 'offline', name: 'Offline', by: 'No AI', color: '#6B6880', icon: <CloudOff />, about: 'No AI costs. Every AI button gives a ready-made starter draft instead.' },
];

export default function AdminAiSettingsPage() {
  const q = useGet<View>('/admin/ai-settings');
  return (
    <>
      <PageHeader title="AI settings" subtitle="Choose the AI behind NanoBot, slides, “Create with AI” and unit plans" />
      <QueryState q={q}>{(v) => <Settings v={v} reload={() => q.refetch()} />}</QueryState>
    </>
  );
}

function Settings({ v, reload }: { v: View; reload: () => void }) {
  const toast = useToast();
  const [provider, setProvider] = useState<Provider>(v.provider === 'nanobot' ? 'offline' : v.provider);
  const [keys, setKeys] = useState<{ anthropic: string; openai: string }>({ anthropic: '', openai: '' });
  const [models, setModels] = useState({ anthropic: v.anthropic.model, openai: v.openai.model });
  const [found, setFound] = useState<{ anthropic?: string[]; openai?: string[] }>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<'' | 'save' | 'test' | 'models'>('');
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setTest(null);
  }, [provider]);

  const p = PROVIDERS.find((x) => x.id === provider)!;
  const live = provider === 'anthropic' || provider === 'openai';
  const saved = live ? v[provider] : null;
  const typed = live ? keys[provider].trim() : '';
  const changed = provider !== v.provider || !!typed || (live && models[provider] !== v[provider].model);

  const loadModels = async () => {
    if (!live) return;
    setBusy('models');
    setErr(null);
    try {
      const r = await api.post<{ models: string[] }>('/admin/ai-settings/models', { provider, key: typed || undefined });
      setFound((f) => ({ ...f, [provider]: r.data.models }));
      if (r.data.models.length && !r.data.models.includes(models[provider])) setModels((m) => ({ ...m, [provider]: r.data.models[0] }));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy('');
    }
  };
  const runTest = async () => {
    if (!live) return;
    setBusy('test');
    setErr(null);
    try {
      const r = await api.post<{ ok: boolean; message: string }>('/admin/ai-settings/test', { provider, key: typed || undefined, model: models[provider] });
      setTest(r.data);
    } catch (e) {
      setTest({ ok: false, message: errorMessage(e) });
    } finally {
      setBusy('');
    }
  };
  const save = async () => {
    setBusy('save');
    setErr(null);
    try {
      await api.put('/admin/ai-settings', {
        provider,
        ...(keys.anthropic.trim() ? { anthropicKey: keys.anthropic.trim() } : {}),
        ...(keys.openai.trim() ? { openaiKey: keys.openai.trim() } : {}),
        anthropicModel: models.anthropic,
        openaiModel: models.openai,
      });
      setKeys({ anthropic: '', openai: '' });
      toast.success(provider === 'offline' ? 'AI switched off — starter drafts only' : `Nanoskool now uses ${p.name} (${models[provider as 'anthropic' | 'openai']})`);
      reload();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy('');
    }
  };
  const removeKey = async (which: 'anthropic' | 'openai') => {
    setBusy('save');
    try {
      await api.put('/admin/ai-settings', { provider: v.provider === which ? 'offline' : v.provider === 'nanobot' ? 'offline' : v.provider, [`${which}Key`]: null });
      toast.success('Key removed');
      reload();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const current = PROVIDERS.find((x) => x.id === v.provider);
  return (
    <Stack spacing={3}>
      {/* Now in use */}
      <Box
        sx={{ p: 2.25, borderRadius: 3, bgcolor: v.provider === 'offline' || v.provider === 'nanobot' ? '#F4F2EC' : `${current?.color}14`, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: current?.color ?? '#6B6880', color: '#fff' }}>{current?.icon ?? <SmartToy />}</Box>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="body2" color="text.secondary">
            Now in use{v.source === 'env' ? ' (from server/.env)' : ''}
          </Typography>
          <Typography sx={{ fontWeight: 750, fontSize: 18 }}>
            {v.provider === 'nanobot' ? 'NanoBot service (content tools offline)' : current?.name}
            {(v.provider === 'anthropic' || v.provider === 'openai') && (
              <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                {' '}
                · {v[v.provider].model}
              </Box>
            )}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="text.secondary">
            Used this month
          </Typography>
          <Typography sx={{ fontWeight: 700 }}>
            {v.usage.tokens.toLocaleString()} tokens · {v.usage.users} people
          </Typography>
        </Box>
      </Box>

      <Section title="1. Choose the AI">
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {PROVIDERS.map((x) => {
            const on = provider === x.id;
            const hasKey = x.id === 'anthropic' || x.id === 'openai' ? v[x.id].hasKey : true;
            return (
              <ButtonBase
                key={x.id}
                onClick={() => setProvider(x.id)}
                aria-pressed={on}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 1,
                  p: 2,
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: on ? x.color : 'divider',
                  bgcolor: on ? `${x.color}0D` : '#fff',
                  transition: 'all .15s',
                  '&:hover': { borderColor: x.color },
                }}
              >
                <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center', width: '100%' }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: `${x.color}1F`, color: x.color }}>{x.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 750, lineHeight: 1.2 }}>{x.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {x.by}
                    </Typography>
                  </Box>
                  {v.provider === x.id && <Chip size="small" label="In use" color="success" />}
                  {v.provider !== x.id && x.id !== 'offline' && hasKey && <Chip size="small" label="Key saved" variant="outlined" />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {x.about}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Section>

      {live && saved && (
        <Section title={`2. ${p.name} API key and model`}>
          <Stack spacing={2} sx={{ maxWidth: 720 }}>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <KeyOutlined sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {saved.hasKey ? (
                  <>
                    A key is saved <b>{saved.keyHint}</b>. Paste a new one below only to replace it.
                  </>
                ) : (
                  <>No key saved yet.</>
                )}
              </Typography>
              {saved.hasKey && !saved.keyHint?.includes('.env') && (
                <Button size="small" color="error" onClick={() => removeKey(provider as 'anthropic' | 'openai')} disabled={!!busy}>
                  Remove key
                </Button>
              )}
              <Button size="small" endIcon={<OpenInNew />} href={p.keyUrl ?? '#'} target="_blank" rel="noopener">
                Get a {p.name} key
              </Button>
            </Stack>
            <TextField
              label={saved.hasKey ? `New ${p.name} API key (optional)` : `${p.name} API key`}
              value={keys[provider as 'anthropic' | 'openai']}
              onChange={(e) => setKeys((k) => ({ ...k, [provider]: e.target.value }))}
              placeholder={p.keyShape}
              type={show ? 'text' : 'password'}
              autoComplete="off"
              helperText="Stored encrypted on the Nanoskool server. Nobody can see it again — only its last 4 characters."
              slotProps={{
                htmlInput: { spellCheck: false, 'data-1p-ignore': true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={show ? 'Hide' : 'Show'}>
                        <IconButton onClick={() => setShow((s) => !s)} edge="end" aria-label={show ? 'Hide key' : 'Show key'}>
                          {show ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, alignItems: { sm: 'flex-start' } }}>
              <Autocomplete
                freeSolo
                sx={{ flex: 1 }}
                options={found[provider as 'anthropic' | 'openai'] ?? p.models ?? []}
                value={models[provider as 'anthropic' | 'openai']}
                onInputChange={(_, val) => setModels((m) => ({ ...m, [provider]: val }))}
                renderInput={(params) => (
                  <TextField {...params} label="Model" helperText={found[provider as 'anthropic' | 'openai'] ? `${found[provider as 'anthropic' | 'openai']!.length} models available with this key` : 'Pick one, or load the list your key can use'} />
                )}
              />
              <Button onClick={loadModels} disabled={!!busy || (!typed && !saved.hasKey)} startIcon={busy === 'models' ? <CircularProgress size={16} /> : undefined} sx={{ mt: { sm: 1 }, whiteSpace: 'nowrap' }}>
                Load my models
              </Button>
            </Stack>
            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={runTest} disabled={!!busy || (!typed && !saved.hasKey) || !models[provider as 'anthropic' | 'openai']} startIcon={busy === 'test' ? <CircularProgress size={16} /> : undefined}>
                Test connection
              </Button>
              {test && (
                <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', color: test.ok ? 'success.main' : 'error.main', flex: 1, minWidth: 0 }}>
                  {test.ok ? <CheckCircle fontSize="small" /> : <ErrorOutline fontSize="small" />}
                  <Typography variant="body2" sx={{ color: 'inherit' }}>
                    {test.message}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Stack>
        </Section>
      )}

      {err && <Alert severity="error">{err}</Alert>}
      {provider === 'offline' && v.provider !== 'offline' && <Alert severity="info">Switching off AI keeps your saved keys, so you can switch back any time.</Alert>}
      {live && saved && !saved.hasKey && !typed && <Alert severity="info">Paste an API key to use {p.name}.</Alert>}
      <Alert severity="warning" icon={false} sx={{ '& .MuiAlert-message': { fontSize: 13.5 } }}>
        <b>Privacy:</b> when AI is on, lesson text, teacher files and students’ NanoBot questions are sent to {live ? p.by : 'the chosen AI company'} to be answered. Use an organisation account with data-retention controls, and don’t upload files
        containing children’s personal details.
      </Alert>

      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="contained" size="large" onClick={save} disabled={!!busy || !changed || (live && !typed && !saved?.hasKey)} startIcon={busy === 'save' ? <CircularProgress size={18} color="inherit" /> : undefined}>
          {provider === 'offline' ? 'Save — use offline drafts' : `Save — use ${p.name}`}
        </Button>
      </Stack>
    </Stack>
  );
}
