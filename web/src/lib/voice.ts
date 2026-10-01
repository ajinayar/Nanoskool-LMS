/**
 * Talk to NanoBot: speech-to-text with the browser's own speech recognition (Chrome, Edge, Safari),
 * in the student's language (hi-IN, ml-IN, ta-IN…). Nothing is recorded by Nanoskool; note that some
 * browsers send the audio to their own speech service to turn it into text.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { speechCode } from './languages';

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const Ctor = (): (new () => Rec) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
export const voiceInputSupported = () => typeof window !== 'undefined' && !!Ctor();

/** `onFinal` gets the full sentence once the child stops talking. */
export function useVoiceInput(lang: string, onFinal: (text: string) => void) {
  const rec = useRef<Rec | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const stop = useCallback(() => rec.current?.stop(), []);
  const start = useCallback(() => {
    const C = Ctor();
    if (!C) return;
    rec.current?.abort();
    const r = new C();
    r.lang = speechCode(lang);
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let text = '';
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) text += res[0].transcript;
        else live += res[0].transcript;
      }
      setInterim((text + live).trim());
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Allow the microphone in your browser to talk to NanoBot.' : e.error === 'no-speech' ? 'I didn’t hear anything. Tap the mic and try again.' : e.error === 'language-not-supported' ? 'This browser can’t listen in this language yet. Try Chrome, or type instead.' : null);
    r.onend = () => {
      setListening(false);
      const said = text.trim();
      setInterim('');
      if (said) finalRef.current(said);
    };
    setError(null);
    setInterim('');
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  useEffect(() => () => rec.current?.abort(), []);
  return { supported: voiceInputSupported(), listening, interim, error, start, stop };
}
