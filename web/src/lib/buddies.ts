/**
 * NanoBot buddies: original Nanoskool characters a student can choose for NanoBot.
 * The character changes the look, greeting and voice; NanoBot's tutoring and safety rules stay the same.
 * Keep the keys in step with server/src/lib/buddies.ts.
 */
export type BuddyGroup = 'nanoskool' | 'family' | 'teachers';

export interface PersonArt {
  kind: 'person';
  skin: string;
  hair: 'short' | 'curly' | 'ponytail' | 'braid' | 'bun' | 'long' | 'bald' | 'spiky';
  hairColor: string;
  top: string; // clothes colour
  top2?: string; // second clothes colour (saree border, shawl, coat)
  outfit: 'tee' | 'kurta' | 'saree' | 'shawl' | 'coat' | 'shirt' | 'vest';
  glasses?: boolean;
  beard?: 'full' | 'mustache';
  bindi?: boolean;
  extra?: 'goggles' | 'safari' | 'parrot-safari' | 'book' | 'cap' | 'headband' | 'earphones' | 'tie' | 'pen';
}
export interface LionArt {
  kind: 'lion';
}
export interface BuddyDef {
  key: string;
  name: string;
  group: BuddyGroup;
  role: string; // one short line under the name
  intro?: string; // "your NanoBot buddy" style tag in the greeting (English)
  voice: { gender: 'f' | 'm' | 'any'; pitch: number; rate: number };
  /** ElevenLabs voice ID — used when VITE_ELEVENLABS_API_KEY is set. */
  elevenLabsVoiceId?: string;
  art: PersonArt | LionArt | { kind: 'nano' };
}

export const BUDDIES: BuddyDef[] = [
  // Nano: robot — English neutral voice
  { key: 'nano', name: 'Nano', group: 'nanoskool', role: 'Your robot buddy', voice: { gender: 'any', pitch: 1.1, rate: 0.92 }, elevenLabsVoiceId: 'yoZ06aMxZJJ28mfd3POQ', art: { kind: 'nano' } },
  {
    key: 'tara',
    name: 'Tara',
    group: 'nanoskool',
    role: 'Explorer, with Mithu the parrot',
    voice: { gender: 'f', pitch: 1.3, rate: 1 },
    elevenLabsVoiceId: '9FTUWXd0yHJL1ZiZ71RK', // Anika — young Indian female
    art: { kind: 'person', skin: '#C98B5B', hair: 'braid', hairColor: '#2B1B14', top: '#2FA37B', top2: '#F2C14E', outfit: 'vest', extra: 'parrot-safari' },
  },
  {
    key: 'pinto',
    name: 'Pinto',
    group: 'nanoskool',
    role: 'Young inventor',
    voice: { gender: 'm', pitch: 1.3, rate: 1 },
    elevenLabsVoiceId: 'g5CIjZEefAph4nQFvHAz', // Ethan — English young boy
    art: { kind: 'person', skin: '#E2AE7E', hair: 'spiky', hairColor: '#3A2418', top: '#4F7CF5', top2: '#FFFFFF', outfit: 'coat', extra: 'goggles' },
  },
  // Sheru: lion cub — English energetic young male
  { key: 'sheru', name: 'Sheru', group: 'nanoskool', role: 'Lion cub who loves cricket', voice: { gender: 'm', pitch: 1.4, rate: 1.02 }, elevenLabsVoiceId: 'TX3LPaxmHKxFdv7VOQHJ', art: { kind: 'lion' } },

  {
    key: 'meera',
    name: 'Meera',
    group: 'family',
    role: 'Best friend',
    voice: { gender: 'f', pitch: 1.25, rate: 0.98 },
    elevenLabsVoiceId: '9FTUWXd0yHJL1ZiZ71RK', // Anika — young Indian female
    art: { kind: 'person', skin: '#B87A4B', hair: 'ponytail', hairColor: '#24160F', top: '#F06A9B', outfit: 'tee', extra: 'headband' },
  },
  // Kabir: young Indian boy
  { key: 'kabir', name: 'Kabir', group: 'family', role: 'Best friend', voice: { gender: 'm', pitch: 1.2, rate: 0.98 }, elevenLabsVoiceId: 'Tjm71aOgsbTK9LM4TiSa', art: { kind: 'person', skin: '#D49A6A', hair: 'short', hairColor: '#24160F', top: '#FF8A3D', outfit: 'tee', extra: 'cap' } },
  {
    key: 'anu-didi',
    name: 'Anu Didi',
    group: 'family',
    role: 'Big sister',
    voice: { gender: 'f', pitch: 1.1, rate: 0.95 },
    elevenLabsVoiceId: '9FTUWXd0yHJL1ZiZ71RK', // Anika — young Indian female (big sister)
    art: { kind: 'person', skin: '#C68B59', hair: 'long', hairColor: '#1E120C', top: '#8B6CF0', top2: '#F7D774', outfit: 'kurta', extra: 'earphones' },
  },
  {
    key: 'arjun-bhaiya',
    name: 'Arjun Bhaiya',
    group: 'family',
    role: 'Big brother',
    voice: { gender: 'm', pitch: 1, rate: 0.95 },
    elevenLabsVoiceId: 'Tjm71aOgsbTK9LM4TiSa', // Hari Kavi — Indian male (big brother)
    art: { kind: 'person', skin: '#A86F45', hair: 'curly', hairColor: '#1E120C', top: '#2E9BD6', outfit: 'shirt', glasses: true },
  },
  {
    key: 'dadi',
    name: 'Dadi Maa',
    group: 'family',
    role: 'Grandmother, loves stories',
    voice: { gender: 'f', pitch: 0.85, rate: 0.82 },
    elevenLabsVoiceId: 'zrHiDhphv9ZnVXBqCLjz', // Dorothy — calm older woman (no old Indian female available)
    art: { kind: 'person', skin: '#C08A60', hair: 'bun', hairColor: '#D9D9DE', top: '#E0663E', top2: '#F6C343', outfit: 'saree', glasses: true, bindi: true },
  },
  {
    key: 'dadaji',
    name: 'Dadaji',
    group: 'family',
    role: 'Grandfather, loves stories',
    voice: { gender: 'm', pitch: 0.75, rate: 0.8 },
    elevenLabsVoiceId: 'DQLhorDHb2d4HkZj4kFd', // Prakash — old Indian male (grandfather)
    art: { kind: 'person', skin: '#B57E55', hair: 'bald', hairColor: '#E3E3E8', top: '#F4EFE2', top2: '#8C6B4F', outfit: 'kurta', glasses: true, beard: 'mustache' },
  },

  {
    key: 'lakshmi-maam',
    name: 'Lakshmi Ma’am',
    group: 'teachers',
    role: 'Teacher',
    voice: { gender: 'f', pitch: 1, rate: 0.9 },
    elevenLabsVoiceId: '9FTUWXd0yHJL1ZiZ71RK', // Anika — Indian female teacher
    art: { kind: 'person', skin: '#B97D50', hair: 'bun', hairColor: '#1E120C', top: '#1F9E8F', top2: '#F2B544', outfit: 'saree', bindi: true, extra: 'book' },
  },
  {
    key: 'ravi-sir',
    name: 'Ravi Sir',
    group: 'teachers',
    role: 'Teacher',
    voice: { gender: 'm', pitch: 0.95, rate: 0.9 },
    elevenLabsVoiceId: 'Tjm71aOgsbTK9LM4TiSa', // Hari Kavi — Indian male teacher
    art: { kind: 'person', skin: '#C48A5C', hair: 'short', hairColor: '#1E120C', top: '#5B6BD6', outfit: 'shirt', glasses: true, beard: 'mustache', extra: 'tie' },
  },
  {
    key: 'guruji',
    name: 'Guruji',
    group: 'teachers',
    role: 'Wise guide',
    voice: { gender: 'm', pitch: 0.7, rate: 0.8 },
    elevenLabsVoiceId: 'DQLhorDHb2d4HkZj4kFd', // Prakash — old Indian male (wise guide)
    art: { kind: 'person', skin: '#B9845A', hair: 'bald', hairColor: '#ECECF0', top: '#F39A3B', top2: '#FFF6E6', outfit: 'shawl', beard: 'full' },
  },
];

export const GROUPS: { key: BuddyGroup; label: string }[] = [
  { key: 'nanoskool', label: 'Nanoskool friends' },
  { key: 'family', label: 'Friends and family' },
  { key: 'teachers', label: 'Teachers and guides' },
];

export const buddyByKey = (k?: string | null) => BUDDIES.find((b) => b.key === k) ?? BUDDIES[0];

/** The buddies a school allows (none set = all). Nano is always available. */
export const allowedBuddies = (allowed?: string[] | null) => (allowed?.length ? BUDDIES.filter((b) => b.key === 'nano' || allowed.includes(b.key)) : BUDDIES);

/** The student's buddy: their choice if their school allows it, otherwise Nano. */
export function activeBuddy(choice?: string | null, allowed?: string[] | null) {
  const b = buddyByKey(choice);
  return allowedBuddies(allowed).includes(b) ? b : BUDDIES[0];
}
