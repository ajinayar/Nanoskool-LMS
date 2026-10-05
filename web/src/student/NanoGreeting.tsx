/**
 * NanoBot's welcome on the chat page: Nano comes to the front (flying in from the corner button when
 * the student tapped it), waves, says hello by name in the chosen language, reads it aloud, and offers
 * three easy ways to start. Calm mode and the device's reduce-motion setting turn the movement off.
 */
import { Box, ButtonBase, IconButton, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import VolumeUp from '@mui/icons-material/VolumeUpRounded';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrefs } from '@/lib/prefs';
import { NanoFor } from './art';
import { BuddyFor } from './buddyArt';
import { speak } from './useLook';
import type { BuddyDef } from '@/lib/buddies';
import type { Look } from './looks';

// `who` is the buddy's name; Nano is called "NanoBot" in each language
const HELLO: Record<string, { bot: string; hi: (n: string, who: string) => string; back: (n: string) => string; ask: string }> = {
  en: { bot: 'NanoBot', hi: (n, w) => `Hi ${n}! I am ${w}.`, back: (n) => `Welcome back, ${n}!`, ask: 'What shall we learn today?' },
  hi: { bot: 'नैनोबॉट', hi: (n, w) => `नमस्ते ${n}! मैं ${w} हूँ।`, back: (n) => `फिर से स्वागत है, ${n}!`, ask: 'आज हम क्या सीखें?' },
  ml: { bot: 'നാനോബോട്ട്', hi: (n, w) => `ഹായ് ${n}! ഞാൻ ${w} ആണ്.`, back: (n) => `വീണ്ടും സ്വാഗതം, ${n}!`, ask: 'ഇന്ന് നമ്മൾ എന്ത് പഠിക്കും?' },
  ta: { bot: 'நானோபாட்', hi: (n, w) => `வணக்கம் ${n}! நான் ${w}.`, back: (n) => `மீண்டும் வருக, ${n}!`, ask: 'இன்று நாம் என்ன கற்கலாம்?' },
  te: { bot: 'నానోబాట్', hi: (n, w) => `హాయ్ ${n}! నేను ${w}.`, back: (n) => `మళ్ళీ స్వాగతం, ${n}!`, ask: 'ఈ రోజు మనం ఏమి నేర్చుకుందాం?' },
  kn: { bot: 'ನ್ಯಾನೋಬಾಟ್', hi: (n, w) => `ಹಾಯ್ ${n}! ನಾನು ${w}.`, back: (n) => `ಮತ್ತೆ ಸ್ವಾಗತ, ${n}!`, ask: 'ಇಂದು ನಾವು ಏನು ಕಲಿಯೋಣ?' },
  mr: { bot: 'नॅनोबॉट', hi: (n, w) => `नमस्कार ${n}! मी ${w} आहे.`, back: (n) => `पुन्हा स्वागत, ${n}!`, ask: 'आज आपण काय शिकूया?' },
  bn: { bot: 'ন্যানোবট', hi: (n, w) => `হাই ${n}! আমি ${w}।`, back: (n) => `আবার স্বাগতম, ${n}!`, ask: 'আজ আমরা কী শিখব?' },
  gu: { bot: 'નેનોબોટ', hi: (n, w) => `નમસ્તે ${n}! હું ${w} છું.`, back: (n) => `ફરી સ્વાગત છે, ${n}!`, ask: 'આજે આપણે શું શીખીએ?' },
  pa: { bot: 'ਨੈਨੋਬੋਟ', hi: (n, w) => `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${n}! ਮੈਂ ${w} ਹਾਂ।`, back: (n) => `ਫਿਰ ਜੀ ਆਇਆਂ ਨੂੰ, ${n}!`, ask: 'ਅੱਜ ਅਸੀਂ ਕੀ ਸਿੱਖੀਏ?' },
  or: { bot: 'ନାନୋବଟ୍', hi: (n, w) => `ନମସ୍କାର ${n}! ମୁଁ ${w}।`, back: (n) => `ପୁଣି ସ୍ୱାଗତ, ${n}!`, ask: 'ଆଜି ଆମେ କ’ଣ ଶିଖିବା?' },
};

/** What the buddy says to say hello (used by the welcome and by "hear me" in the picker). */
export function helloLine(buddy: BuddyDef, name: string, lang: string, full = true) {
  const w = HELLO[lang] ?? HELLO.en;
  const who = buddy.key === 'nano' ? w.bot : buddy.name;
  return `${full ? w.hi(name, who) : w.back(name)} ${w.ask}`;
}

const STARTERS = [
  { emoji: '📖', label: 'Explain my lesson', ask: 'Can you explain my latest lesson in simple words?' },
  { emoji: '🎯', label: 'Give me a practice question', ask: 'Give me a practice question from my lessons.' },
  { emoji: '🤖', label: 'Help with my robot code', ask: 'Can you help me with my robot code?' },
];

/** The full hello once a day per student; a short "welcome back" after that. */
function firstVisitToday(userId: string) {
  const key = `ns.nanoHello.${userId}`;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(key) === today) return false;
    localStorage.setItem(key, today);
  } catch {
    /* storage blocked: always the full hello */
  }
  return true;
}

export function NanoWelcome({
  look,
  buddy,
  userId,
  name,
  lang,
  fromBuddy,
  onAsk,
  onChangeBuddy,
}: {
  look: Look;
  buddy: BuddyDef;
  userId: string;
  name: string;
  lang: string;
  fromBuddy: boolean;
  onAsk: (text: string) => void;
  onChangeBuddy?: () => void;
}) {
  const { prefs } = usePrefs();
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const still = !!prefs.calm || reduce;
  const [full] = useState(() => firstVisitToday(`${userId}.${buddy.key}`));
  const message = helloLine(buddy, name, lang, full);
  const [shown, setShown] = useState(still ? message.length : 0);
  const spoken = useRef(false);

  // Type the words out, a few letters at a time
  useEffect(() => {
    if (still) {
      setShown(message.length);
      return;
    }
    setShown(0);
    const start = window.setTimeout(
      () => {
        const t = window.setInterval(() => {
          setShown((n) => {
            if (n >= message.length) {
              window.clearInterval(t);
              return n;
            }
            return n + 1;
          });
        }, 28);
      },
      fromBuddy ? 650 : 250,
    );
    return () => window.clearTimeout(start);
  }, [message, still, fromBuddy]);

  // Say hello aloud when the student tapped Nano (a tap lets the browser speak), or likes things read aloud
  useEffect(() => {
    if (spoken.current || !(fromBuddy || prefs.readAloud)) return;
    spoken.current = true;
    const t = window.setTimeout(() => speak(message, lang, { ...buddy.voice, elevenLabsVoiceId: buddy.elevenLabsVoiceId }), fromBuddy && !still ? 600 : 100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typed = useMemo(() => [...message].slice(0, shown).join(''), [message, shown]);
  const done = shown >= message.length;
  const size = look.art ? 190 : 150;
  const accent = look.primary;

  return (
    <Stack sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 3, md: 5 }, px: 2 }} spacing={2.5}>
      {/* speech bubble */}
      <Box
        aria-live="polite"
        sx={{
          position: 'relative',
          maxWidth: 520,
          px: { xs: 4.5, md: 5 },
          py: 2,
          borderRadius: `${Math.max(18, look.radius)}px`,
          bgcolor: '#fff',
          border: `3px solid ${accent}`,
          boxShadow: `0 6px 0 ${accent}22`,
          minHeight: 84,
          opacity: still ? 1 : 0,
          animation: still ? 'none' : `nbBubble .35s ease-out ${fromBuddy ? 0.55 : 0.15}s forwards`,
          '@keyframes nbBubble': { from: { opacity: 0, transform: 'translateY(10px) scale(.92)' }, to: { opacity: 1, transform: 'none' } },
          '&::after': { content: '""', position: 'absolute', left: '50%', bottom: -14, width: 22, height: 22, bgcolor: '#fff', borderRight: `3px solid ${accent}`, borderBottom: `3px solid ${accent}`, transform: 'translateX(-50%) rotate(45deg)' },
        }}
      >
        <Typography lang={lang} sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 900, lineHeight: 1.35, color: look.ink }}>
          {typed}
          {!done && (
            <Box
              component="span"
              sx={{ display: 'inline-block', width: '0.5ch', ml: 0.25, borderRight: `3px solid ${accent}`, height: '1em', verticalAlign: '-0.12em', animation: 'nbCaret .8s steps(1) infinite', '@keyframes nbCaret': { '50%': { opacity: 0 } } }}
            />
          )}
          {/* keeps the bubble its final size while typing */}
          <Box component="span" aria-hidden sx={{ visibility: 'hidden' }}>
            {[...message].slice(shown).join('')}
          </Box>
        </Typography>
        <Tooltip title="Say it again">
          <IconButton size="small" onClick={() => speak(message, lang, { ...buddy.voice, elevenLabsVoiceId: buddy.elevenLabsVoiceId })} aria-label="Hear NanoBot say hello" sx={{ position: 'absolute', right: 6, top: 6, color: accent }}>
            <VolumeUp fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Nano */}
      <Box
        sx={{
          animation: still ? 'none' : `${fromBuddy ? 'nbFly .7s cubic-bezier(.2,.9,.3,1.25)' : 'nbPop .45s cubic-bezier(.2,.9,.3,1.4)'} both, nbBob 2.6s ease-in-out .9s infinite`,
          '@keyframes nbFly': { from: { transform: 'translate(38vw, 34vh) scale(.35) rotate(18deg)', opacity: 0.4 }, to: { transform: 'none', opacity: 1 } },
          '@keyframes nbPop': { from: { transform: 'scale(.4)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
          '@keyframes nbBob': { '0%,100%': { transform: 'translateY(0) rotate(0)' }, '25%': { transform: 'translateY(-8px) rotate(-3deg)' }, '50%': { transform: 'translateY(0) rotate(0)' }, '75%': { transform: 'translateY(-4px) rotate(3deg)' } },
        }}
      >
        <BuddyFor look={look} buddy={buddy} size={size} wave />
      </Box>
      {buddy.key !== 'nano' || onChangeBuddy ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: '-8px !important' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: look.ink2 }}>{buddy.key === 'nano' ? 'NanoBot' : `${buddy.name} · your NanoBot buddy`}</Typography>
          {onChangeBuddy && (
            <ButtonBase onClick={onChangeBuddy} sx={{ px: 1.25, py: 0.4, borderRadius: 999, fontSize: 13, fontWeight: 800, color: look.primary, bgcolor: `${look.primary}14`, '&:hover': { bgcolor: `${look.primary}24` } }}>
              Change buddy
            </ButtonBase>
          )}
        </Stack>
      ) : null}

      {/* easy ways to start */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ opacity: still || done ? 1 : 0, transition: 'opacity .3s', pointerEvents: done || still ? 'auto' : 'none', width: { xs: '100%', sm: 'auto' } }}>
        {STARTERS.map((s) => (
          <ButtonBase
            key={s.label}
            onClick={() => onAsk(s.ask)}
            sx={{
              px: 2,
              py: 1.25,
              borderRadius: 999,
              bgcolor: '#fff',
              border: `2px solid ${accent}55`,
              fontWeight: 800,
              fontSize: 15,
              color: look.ink,
              gap: 1,
              boxShadow: `0 3px 0 ${accent}33`,
              transition: 'transform .12s, border-color .12s',
              '&:hover': { borderColor: accent, transform: 'translateY(-2px)' },
              '&:active': { transform: 'translateY(1px)' },
            }}
          >
            <span aria-hidden>{s.emoji}</span>
            {s.label}
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  );
}

/** Small buddy beside NanoBot's answers. */
export function NanoAvatar({ look, buddy }: { look: Look; buddy?: BuddyDef }) {
  return (
    <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', bgcolor: '#fff', border: '2px solid #EEE', display: 'grid', placeItems: 'center', overflow: 'hidden', mr: 1, mt: 0.25 }}>
      {buddy && buddy.key !== 'nano' ? <BuddyFor look={look} buddy={buddy} size={36} wave={false} face /> : <NanoFor look={look} size={look.art ? 38 : 30} wave={false} />}
    </Box>
  );
}
