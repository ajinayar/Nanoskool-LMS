/** Languages Nanoskool can teach in. `speech` is the browser voice/recognition code. */
export const LANGUAGES = {
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
} as const;
export type LangCode = keyof typeof LANGUAGES;
export const LANG_CODES = Object.keys(LANGUAGES) as [LangCode, ...LangCode[]];
export const langName = (c?: string) => (c && c in LANGUAGES ? LANGUAGES[c as LangCode].name : 'English');
