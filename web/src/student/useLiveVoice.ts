/**
 * useLiveVoice — real-time spoken conversation with the ElevenLabs agent,
 * driven from the mic button that already lives in the NanoBot chat bar.
 *
 * start()  → opens the mic and talks live (no separate screen)
 * stop()   → ends it
 * Spoken lines are exposed in `lines` so the chat can show them as bubbles.
 *
 * Connects straight from the browser to ElevenLabs for minimum latency. When the server has the
 * ElevenLabs key it hands out a one-time signed link (/api/convai-token), so the agent can stay private;
 * otherwise the public agent id (VITE_ELEVENLABS_AGENT_ID) is used.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation } from '@11labs/client';
import type { BuddyDef } from '@/lib/buddies';
import { api } from '@/api/client';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

const withTimeout = <T,>(p: Promise<T>, ms: number, msg: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(msg)), ms);
    p.then((v) => { window.clearTimeout(t); resolve(v); }, (e) => { window.clearTimeout(t); reject(e); });
  });
const dbg = (...a: unknown[]) => console.debug('[live]', ...a);

// The agent only accepts per-session overrides it has switched on (ElevenLabs → Agent → Security).
// A refused one drops the session with "Override for field 'x' is not allowed"; we remember which
// fields are refused (until the page is refreshed, so enabling one takes effect on reload) and reconnect.
const refusedFields = new Set<string>();
const refusedField = (msg?: string): string | null => /override for field '([^']+)'/i.exec(msg ?? '')?.[1] ?? null;
const markRefused = (msg?: string): boolean => {
  const f = refusedField(msg);
  if (f) { if (refusedFields.has(f)) return false; refusedFields.add(f); return true; }
  if (/override/i.test(msg ?? '') && !refusedFields.has('*')) { refusedFields.add('*'); return true; }
  return false;
};

const greetingFor = (buddy: BuddyDef, student?: string) =>
  `Hi${student ? ` ${student}` : ''}! I'm ${buddy.name}, ${buddy.intro ?? 'your NanoBot buddy'}. What would you like to learn today?`;

type Session = Awaited<ReturnType<typeof Conversation.startSession>>;
type SdkLanguage = NonNullable<NonNullable<NonNullable<Parameters<typeof Conversation.startSession>[0]['overrides']>['agent']>['language']>;
export type LiveMode = 'listening' | 'speaking' | 'idle';
export interface LiveLine { role: 'user' | 'agent'; text: string }

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  const name = e instanceof Error ? e.name : '';
  if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(msg)) {
    return 'Microphone is blocked. Allow mic access in the browser address bar and try again.';
  }
  if (name === 'NotFoundError' || /no.*(device|microphone)/i.test(msg)) return 'No microphone found.';
  return msg || 'Could not start. Please try again.';
}

export function useLiveVoice(buddy: BuddyDef, studentName?: string, lang = 'en', langName = 'English') {
  const [connecting, setConnecting] = useState(false);
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<LiveMode>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<LiveLine[]>([]);

  const convRef = useRef<Session | null>(null);
  const cancelledRef = useRef(false);
  const connectedRef = useRef(false);
  const busyRef = useRef(false);
  const diedRef = useRef(false);
  const pendingTextRef = useRef('');
  const lastFlushedRef = useRef('');
  const startRef = useRef<() => Promise<void>>(async () => undefined);

  const stop = useCallback(async () => {
    cancelledRef.current = true;
    pendingTextRef.current = '';
    const c = convRef.current;
    convRef.current = null;
    setLive(false);
    setConnecting(false);
    setMode('idle');
    try { await c?.endSession(); } catch { /* already closed */ }
  }, []);

  const start = useCallback(async () => {
    if (busyRef.current || convRef.current) return;
    if (!AGENT_ID) { setError('Voice is not set up yet.'); return; }
    busyRef.current = true;
    cancelledRef.current = false;
    connectedRef.current = false;
    diedRef.current = false;
    if (!pendingTextRef.current) lastFlushedRef.current = '';
    setError(null);
    setConnecting(true);
    const typedStart = !!pendingTextRef.current; // started by typing → no greeting, just answer
    const blockAll = refusedFields.has('*');
    const agentOverride = {
      ...(!blockAll && !refusedFields.has('first_message')
        ? { firstMessage: typedStart ? '' : greetingFor(buddy, studentName) }
        : {}),
      ...(!blockAll && !refusedFields.has('language') ? { language: lang as SdkLanguage } : {}),
    };
    const overrides = {
      ...(buddy.elevenLabsVoiceId && !blockAll && !refusedFields.has('voice_id')
        ? { tts: { voiceId: buddy.elevenLabsVoiceId } }
        : {}),
      ...(Object.keys(agentOverride).length ? { agent: agentOverride } : {}),
    };
    const hasOverrides = Object.keys(overrides).length > 0;

    // A signed link from our server when it has the ElevenLabs key; the public agent id otherwise
    const signedUrl = async () => {
      try {
        return (await api.get<{ signedUrl: string }>('/convai-token', { params: { voiceId: buddy.elevenLabsVoiceId } })).data.signedUrl;
      } catch {
        return undefined;
      }
    };
    const open = async () => {
      const url = await signedUrl();
      return Conversation.startSession({
        ...(url ? { signedUrl: url, connectionType: 'websocket' as const } : { agentId: AGENT_ID!, connectionType: 'websocket' as const }),
        useWakeLock: false,
        ...(hasOverrides ? { overrides } : {}),
        onConnect: () => {
          connectedRef.current = true;
          if (!cancelledRef.current) { setConnecting(false); setLive(true); }
        },
        onDisconnect: (details?: { reason?: string; message?: string }) => {
          if (!connectedRef.current) return;
          diedRef.current = true;
          convRef.current = null;
          setMode('idle');
          // Agent refused one of the overrides → note which, then reconnect without it, quietly.
          if (details?.reason === 'error' && markRefused(details.message)) {
            dbg('override refused, reconnecting', details.message);
            if (lastFlushedRef.current) pendingTextRef.current = lastFlushedRef.current; // resend after reconnect
            setLive(false);
            setConnecting(true);
            const retry = (tries = 0) => {
              if (busyRef.current && tries < 40) { window.setTimeout(() => retry(tries + 1), 50); return; }
              void startRef.current();
            };
            window.setTimeout(retry, 50);
            return;
          }
          setLive(false);
          setConnecting(false);
          if (details?.reason === 'error' && details.message) setError(details.message);
        },
        onError: (msg: string) => { if (connectedRef.current) setError(msg); },
        onModeChange: ({ mode: m }: { mode: string }) =>
          setMode(m === 'speaking' ? 'speaking' : m === 'listening' ? 'listening' : 'idle'),
        onMessage: ({ message, source }: { message: string; source: string }) => {
          // drop expression tags the voice model uses, e.g. "[happy]"
          const clean = message?.replace(/\[[a-z][a-z ,'-]{0,24}\]\s*/gi, '').trim();
          if (!clean || /^[.\s\u2026]+$/.test(clean)) return;
          setLines((prev) => [...prev, { role: source === 'user' ? 'user' : 'agent', text: clean }]);
        },
      });
    };

    try {
      // 1) microphone first, so a blocked / missing / unresponsive mic is reported clearly
      dbg('requesting microphone');
      const probe = await withTimeout(
        navigator.mediaDevices.getUserMedia({ audio: true }),
        10000,
        'The microphone did not respond. Check the mic permission (lock icon in the address bar) and try again.',
      );
      probe.getTracks().forEach((t) => t.stop());
      dbg('microphone ok, connecting');

      // 2) connect, with a hard limit so it can never sit on "Getting ready…" forever
      const connectMsg = 'Could not connect to the voice service. Check your internet connection and try again.';
      let conv: Session;
      try {
        conv = await withTimeout(open(), 15000, connectMsg);
      } catch (first) {
        dbg('first attempt failed', first);
        const blocked = /permission|denied|notallowed|notfound|microphone did not respond/i.test(`${(first as Error)?.name} ${(first as Error)?.message}`);
        if (blocked || !hasOverrides || !markRefused((first as Error)?.message)) throw first;
        connectedRef.current = false;
        conv = await withTimeout(open(), 15000, connectMsg);
      }
      dbg('connected');
      if (cancelledRef.current) { void conv.endSession(); return; }
      if (!diedRef.current) {
        convRef.current = conv; // don't keep a session that already dropped
        // Tell the agent which character it is (works without any agent setting)
        try {
          conv.sendContextualUpdate(
            `For this conversation you are ${buddy.name} (${buddy.role}). Speak and behave as ${buddy.name}, ` +
            `introduce yourself as ${buddy.name} rather than a generic NanoBot, and keep answers short and child-friendly. ` +
            `Always speak and reply to the student in ${langName}.`,
          );
        } catch { /* ignore */ }
        // text typed before the session existed is delivered as soon as it is live
        const queued = pendingTextRef.current;
        if (queued) {
          pendingTextRef.current = '';
          lastFlushedRef.current = queued;
          try { conv.sendUserMessage(queued); } catch { /* ignore */ }
        }
      }
    } catch (e) {
      if (!cancelledRef.current) setError(friendlyError(e));
      pendingTextRef.current = '';
      setConnecting(false);
      setLive(false);
    } finally {
      busyRef.current = false;
    }
  }, [buddy, studentName, lang, langName]);
  startRef.current = start;

  // language changed in the dropdown while talking → tell the live agent right away
  const lastLangRef = useRef(lang);
  useEffect(() => {
    if (lastLangRef.current === lang) return;
    lastLangRef.current = lang;
    try {
      convRef.current?.sendContextualUpdate(`The student changed the language. From now on speak and reply only in ${langName}.`);
    } catch { /* ignore */ }
  }, [lang, langName]);

  // always hang up when leaving the page
  useEffect(() => () => {
    cancelledRef.current = true;
    const c = convRef.current;
    convRef.current = null;
    void c?.endSession().catch(() => undefined);
  }, []);

  const clearLines = useCallback(() => setLines([]), []);

  /** Send typed text to the live agent; it replies by voice. Returns false if no live session. */
  const sendText = useCallback((text: string): boolean => {
    const c = convRef.current;
    const t = text.trim();
    if (!c || !t) return false;
    try {
      c.sendUserMessage(t);
    } catch {
      return false;
    }
    setLines((prev) => [...prev, { role: 'user', text: t }]);
    return true;
  }, []);

  /**
   * Typing path: send to the live agent if connected; otherwise start the agent and deliver the
   * text as soon as it connects. The user's bubble is shown immediately.
   */
  const sendOrStart = useCallback((text: string): boolean => {
    const t = text.trim();
    if (!t || !AGENT_ID) return false;
    if (convRef.current) return sendText(t);
    pendingTextRef.current = pendingTextRef.current ? `${pendingTextRef.current} ${t}` : t;
    setLines((prev) => [...prev, { role: 'user', text: t }]);
    if (!busyRef.current) void startRef.current();
    return true;
  }, [sendText]);

  return { supported: !!AGENT_ID, connecting, live, mode, error, lines, start, stop, sendText, sendOrStart, clearLines, clearError: () => setError(null) };
}
