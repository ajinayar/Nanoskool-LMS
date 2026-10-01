/** Languages Nanoskool can teach in (same list as the server). `speech` is the browser voice/recognition code. */
export const LANGUAGES: Record<string, { name: string; native: string; speech: string }> = {
  en: { name: 'English', native: 'English', speech: 'en-IN' },
  hi: { name: 'Hindi', native: 'हिन्दी', speech: 'hi-IN' },
  ml: { name: 'Malayalam', native: 'മലയാളം', speech: 'ml-IN' },
  ta: { name: 'Tamil', native: 'தமிழ்', speech: 'ta-IN' },
  te: { name: 'Telugu', native: 'తెలుగు', speech: 'te-IN' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ', speech: 'kn-IN' },
  mr: { name: 'Marathi', native: 'मराठी', speech: 'mr-IN' },
  bn: { name: 'Bengali', native: 'বাংলা', speech: 'bn-IN' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી', speech: 'gu-IN' },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', speech: 'pa-IN' },
  or: { name: 'Odia', native: 'ଓଡ଼ିଆ', speech: 'or-IN' },
};
export const langLabel = (c?: string) => (c && LANGUAGES[c] ? (c === 'en' ? 'English' : `${LANGUAGES[c].native} · ${LANGUAGES[c].name}`) : 'English');
export const speechCode = (c?: string) => LANGUAGES[c ?? 'en']?.speech ?? 'en-IN';
