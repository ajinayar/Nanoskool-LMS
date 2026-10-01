/**
 * Nanoskool's doors to performance (from nanoskool.com): 8 doors to learning and 4 support platforms.
 * A school opens a door the same way it gets a course: super admin → partner → school; the school admin then
 * puts teachers on the door's team. Only the selection is built so far; each door's own activities come later.
 */
import { Door } from '../models/index.js';
import { withLock } from './startupLock.js';

export interface DoorSeed {
  key: string;
  kind: 'door' | 'platform';
  name: string;
  tagline: string;
  description: string;
  audience?: string;
  url: string;
  color: string;
  logoUrl?: string; // bundled with the web app in web/public/doors
}

const SITE = 'https://nanoskool.com';
export const DOORS: DoorSeed[] = [
  {
    key: 'robotics-ai',
    logoUrl: '/doors/namo-robo.png',
    kind: 'door',
    name: 'Namo Robo',
    tagline: 'Build · Code · Invent',
    description: 'Robotics and AI with MODI modular hardware, a full curriculum and teacher support — the same modules every year, with harder projects as children grow.',
    audience: 'Grades 1–10',
    url: `${SITE}/robotics-ai-curriculum`,
    color: '#2563EB',
  },
  {
    key: 'grace-and-force',
    logoUrl: '/doors/grace-and-force.png',
    kind: 'door',
    name: 'Grace & Force',
    tagline: 'Speak · Think · Lead',
    description: 'An AI-supported platform for confident speaking, debate and performance: Debate Arena, Model UN practice, Speech Coach and music practice.',
    audience: 'Grades 6–12',
    url: `${SITE}/grace-and-force`,
    color: '#C2417B',
  },
  {
    key: 'thinkquest',
    logoUrl: '/doors/thinkquest.png',
    kind: 'door',
    name: 'ThinkQuest',
    tagline: 'Question · Apply · Discover',
    description: 'A national, NCERT-based Olympiad of critical thinking, computational thinking and AI awareness, with competency-based questions instead of memorisation.',
    audience: 'Grades 1–12',
    url: `${SITE}/thinkquest`,
    color: '#7C3AED',
  },
  {
    key: 'indus-mun',
    logoUrl: '/doors/indus-mun.png',
    kind: 'door',
    name: 'Indus MUN',
    tagline: 'Research · Debate · Represent',
    description: 'A year-round youth diplomacy, School Parliament and hybrid competition programme building research, negotiation, leadership and public speaking, ending in a three-day finale.',
    audience: 'Grades 6–9',
    url: `${SITE}/indus-mun`,
    color: '#0E7490',
  },
  {
    key: 'shaktimath',
    logoUrl: '/doors/shaktimath.png',
    kind: 'door',
    name: 'ShaktiMath',
    tagline: 'Understand · Practise · Progress',
    description: 'Maths built on reasoning, useful feedback and purposeful practice: AI reads each step of a child’s working, gives partial credit and sets the next practice.',
    url: `${SITE}/shaktimath`,
    color: '#EA580C',
  },
  {
    key: 'school-farm',
    logoUrl: '/doors/school-farm.png',
    kind: 'door',
    name: 'School Farm',
    tagline: 'Grow food. Grow curiosity.',
    description: 'Children grow food at school and learn science, care and patience from soil to harvest.',
    url: `${SITE}/contact?programme=school-farm`,
    color: '#16A34A',
  },
  {
    key: 'little-cinema',
    logoUrl: '/doors/little-cinema.png',
    kind: 'door',
    name: 'Little Cinema',
    tagline: 'From first idea to final film',
    description: 'Children make their own films — story, script, camera, sound and editing — from the first idea to the final screening.',
    url: `${SITE}/contact?programme=little-cinema`,
    color: '#DC2626',
  },
  {
    key: 'puberty-lab',
    logoUrl: '/doors/puberty-lab.png',
    kind: 'door',
    name: 'Puberty Lab',
    tagline: 'The Transition-to-Adulthood Lab',
    description: 'A school-based programme that helps young people understand themselves, build healthy relationships and find purpose, in three pathways matched to their stage.',
    audience: 'Ages 10–25',
    url: `${SITE}/puberty-lab`,
    color: '#DB2777',
  },
  {
    key: 'mother-school',
    logoUrl: '/doors/mother-school.png',
    kind: 'platform',
    name: 'Mother School',
    tagline: 'Learning pods at home',
    description: 'Home-based learning pods led by trained educators.',
    url: `${SITE}/mother-school`,
    color: '#B45309',
  },
  {
    key: 'teachers-college',
    logoUrl: '/doors/teachers-college.png',
    kind: 'platform',
    name: 'Teachers College',
    tagline: 'Grow great STEM teachers',
    description: 'An advanced development programme for STEM educators.',
    url: `${SITE}/teachers-college`,
    color: '#4F46E5',
  },
  { key: 'wemana', logoUrl: '/doors/wemana.png', kind: 'platform', name: 'WeMaNa', tagline: 'Learning journeys', description: 'Global educational learning journeys for students.', url: `${SITE}/wemana`, color: '#0891B2' },
  {
    key: 'namorobo',
    logoUrl: '/doors/namorobo-foundation.png',
    kind: 'platform',
    name: 'NamoRobo AI Foundation',
    tagline: 'Tech literacy for all',
    description: 'Bringing technology and AI literacy to underserved communities.',
    url: `${SITE}/contact?programme=namo-robo-ai-foundation`,
    color: '#059669',
  },
];

/** Earlier starter values, replaced by newer ones only while nobody has changed them. */
const OLD: Record<string, { name?: string; logoUrl?: string }> = {
  'robotics-ai': { name: 'Robotics & AI Curriculum', logoUrl: '/doors/robotics-ai.png' },
  namorobo: { logoUrl: '/doors/namorobo.png' },
};

/** Adds any missing doors and fills in a missing logo; never overwrites what a super admin has edited. */
export async function seedDoors() {
  return withLock('doors-seed', async () => {
    for (const [i, d] of DOORS.entries()) {
      const cur = await Door.findOne({ key: d.key }).select('name logoUrl').lean();
      if (!cur) {
        await Door.create({ ...d, position: i });
        continue;
      }
      const patch: Record<string, string> = {};
      if (d.logoUrl && (!cur.logoUrl || cur.logoUrl === OLD[d.key]?.logoUrl)) patch.logoUrl = d.logoUrl;
      if (OLD[d.key]?.name && cur.name === OLD[d.key].name) patch.name = d.name;
      if (Object.keys(patch).length) await Door.updateOne({ _id: cur._id }, patch);
    }
  });
}
