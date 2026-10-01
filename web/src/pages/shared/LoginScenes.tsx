/**
 * Who is signing in: each kind of user gets its own sign-in page — its own colours, words, scene and
 * characters. Students get a playful meadow with Nano and friends; grown-ups get calmer scenes.
 * All characters are original Nanoskool drawings (student/buddyArt.tsx).
 */
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { buddyByKey, type BuddyDef } from '@/lib/buddies';
import { BuddyArt } from '@/student/buddyArt';
import heroMeadow from '@/assets/little/hero-meadow.webp';
import nano1 from '@/assets/little/nano-1.webp';

export type Who = 'student' | 'parent' | 'teacher' | 'school' | 'partner' | 'admin';

export interface Identity {
  key: Who;
  tab: string; // "I am a…" label
  emoji: string;
  title: string; // form heading
  headline: string; // big message on the scene
  message: string;
  points: string[];
  idLabel: string;
  idPlaceholder: string;
  passLabel: string;
  button: string;
  forgot: string;
  accent: string;
  accentInk: string;
  panel: string; // scene background
  ink: string; // text colour on the scene
  font?: string;
}

const NUNITO = '"Nunito Variable", "Nunito", "Inter Variable", system-ui, sans-serif';

export const IDENTITIES: Record<Who, Identity> = {
  student: {
    key: 'student',
    tab: 'Student',
    emoji: '🎒',
    title: 'Hi, superstar!',
    headline: 'Ready for today’s adventure?',
    message: 'Fun lessons, quiz games, stars to collect, and NanoBot to help you any time.',
    points: ['🎮 Lessons that feel like games', '🤖 Ask NanoBot anything', '⭐ Collect stars and badges'],
    idLabel: 'Your username',
    idPlaceholder: 'e.g. aarav.gvps',
    passLabel: 'Your secret password',
    button: 'Let’s go! 🚀',
    forgot: 'Forgot your password? Ask your teacher.',
    accent: '#FF8A1F',
    accentInk: '#FFFFFF',
    panel: '#BFE6FF',
    ink: '#2A2440',
    font: NUNITO,
  },
  parent: {
    key: 'parent',
    tab: 'Parent',
    emoji: '🏡',
    title: 'Welcome, parent',
    headline: 'Walk alongside your child’s learning.',
    message: 'See what your child is learning, how they are growing, and talk with their teachers, all in one calm place.',
    points: ['Progress, strengths and Genius Habits', 'Attendance and homework at a glance', 'Messages from teachers and school'],
    idLabel: 'Email or username',
    idPlaceholder: 'you@example.com',
    passLabel: 'Password',
    button: 'Sign in',
    forgot: 'Forgot your password?',
    accent: '#E8615A',
    accentInk: '#FFFFFF',
    panel: 'linear-gradient(160deg, #FFE9D6 0%, #FFD3C4 55%, #F9B9B0 100%)',
    ink: '#4A2A26',
  },
  teacher: {
    key: 'teacher',
    tab: 'Teacher',
    emoji: '🍎',
    title: 'Welcome back, teacher',
    headline: 'Teach, inspire, and see every learner grow.',
    message: 'Build lessons and quizzes with AI, take attendance, check evidence and follow each child’s journey.',
    points: ['Lesson builder and Quiz Studio', 'Attendance, evidence and remarks', 'NanoBot, your teaching assistant'],
    idLabel: 'Email or username',
    idPlaceholder: 'you@school.edu.in',
    passLabel: 'Password',
    button: 'Sign in',
    forgot: 'Forgot your password?',
    accent: '#14967F',
    accentInk: '#FFFFFF',
    panel: 'linear-gradient(160deg, #DDF5EC 0%, #BFE9DA 60%, #A6DCC9 100%)',
    ink: '#103B33',
  },
  school: {
    key: 'school',
    tab: 'School',
    emoji: '🏫',
    title: 'School admin sign in',
    headline: 'Run your school’s learning in one place.',
    message: 'Classes, teachers, students and parents; courses and Genius Doors; reports you can act on.',
    points: ['Classes, teachers and students', 'Courses and Genius Doors', 'Reports and school settings'],
    idLabel: 'Email',
    idPlaceholder: 'admin@school.edu.in',
    passLabel: 'Password',
    button: 'Sign in',
    forgot: 'Forgot your password?',
    accent: '#3F3DBF',
    accentInk: '#FFFFFF',
    panel: 'linear-gradient(160deg, #E6E8FF 0%, #CDD1FB 60%, #B5BAF5 100%)',
    ink: '#1E1C5C',
  },
  partner: {
    key: 'partner',
    tab: 'Partner',
    emoji: '🤝',
    title: 'Partner sign in',
    headline: 'Bring Nanoskool to more schools.',
    message: 'Onboard schools, share courses and Genius Doors, and see how every school is growing.',
    points: ['Your schools and their teams', 'Courses and doors to share', 'Growth and usage reports'],
    idLabel: 'Email',
    idPlaceholder: 'you@partner.in',
    passLabel: 'Password',
    button: 'Sign in',
    forgot: 'Forgot your password?',
    accent: '#2F80ED',
    accentInk: '#FFFFFF',
    panel: 'linear-gradient(160deg, #0F2A4A 0%, #16406E 60%, #1D5A94 100%)',
    ink: '#FFFFFF',
  },
  admin: {
    key: 'admin',
    tab: 'Nanoskool team',
    emoji: '✦',
    title: 'Nanoskool team',
    headline: 'Make learning better for every school.',
    message: 'Courses, assessments, partners, Genius Doors and platform settings.',
    points: ['Course studio and assessments', 'Partners, schools and Genius Doors', 'AI and platform settings'],
    idLabel: 'Email',
    idPlaceholder: 'you@nanoskool.in',
    passLabel: 'Password',
    button: 'Sign in',
    forgot: 'Forgot your password?',
    accent: '#E5184F',
    accentInk: '#FFFFFF',
    panel: 'linear-gradient(160deg, #17151F 0%, #241F33 60%, #2E2342 100%)',
    ink: '#FFFFFF',
  },
};

export const TABS: Who[] = ['student', 'parent', 'teacher', 'school', 'partner'];

/* ------------------------------------------------------------------ helpers */

const motion = (anim: string) => ({ animation: anim, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } });
const float = { '@keyframes lsFloat': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } } };

/** A floating character. In the 520-wide scenes `size` is relative, so the scene scales as one picture (also on the chooser cards). */
function Char({ buddy, size, sx, wave = false, delay = 0, fixed = false }: { buddy: BuddyDef; size: number; sx: object; wave?: boolean; delay?: number; fixed?: boolean }) {
  return (
    <Box
      sx={{ position: 'absolute', width: fixed ? size : `${(size / 520) * 100}%`, ...float, ...motion(`lsFloat ${3.2 + delay}s ease-in-out ${delay}s infinite`), ...sx, '& svg': fixed ? {} : { width: '100% !important', height: 'auto !important' } }}
    >
      <BuddyArt buddy={buddy} size={size} wave={wave} />
    </Box>
  );
}

const person = (key: string, name: string, art: BuddyDef['art']): BuddyDef => ({ key, name, group: 'family', role: '', voice: { gender: 'any', pitch: 1, rate: 1 }, art });

/* ------------------------------------------------------------------ student: the meadow */

function Butterfly({ color, sx, delay }: { color: string; sx: object; delay: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        width: 34,
        '@keyframes lsFly': {
          '0%': { transform: 'translate(0,0) rotate(-6deg)' },
          '25%': { transform: 'translate(30px,-18px) rotate(6deg)' },
          '50%': { transform: 'translate(60px,4px) rotate(-4deg)' },
          '75%': { transform: 'translate(24px,16px) rotate(8deg)' },
          '100%': { transform: 'translate(0,0) rotate(-6deg)' },
        },
        '@keyframes lsFlap': { '0%,100%': { transform: 'scaleX(1)' }, '50%': { transform: 'scaleX(0.35)' } },
        ...motion(`lsFly ${9 + delay}s ease-in-out ${delay}s infinite`),
        ...sx,
      }}
    >
      <Box component="svg" viewBox="0 0 40 32" sx={{ width: '100%', display: 'block', ...motion('lsFlap .35s ease-in-out infinite'), transformOrigin: '20px 16px' }}>
        <path d="M20 16 Q8 0 3 8 Q0 16 20 16Z M20 16 Q32 0 37 8 Q40 16 20 16Z" fill={color} stroke="#2A2440" strokeWidth="1.6" />
        <path d="M20 16 Q10 30 6 24 Q6 18 20 16Z M20 16 Q30 30 34 24 Q34 18 20 16Z" fill={color} opacity="0.8" stroke="#2A2440" strokeWidth="1.6" />
        <rect x="18.6" y="9" width="2.8" height="16" rx="1.4" fill="#2A2440" />
      </Box>
    </Box>
  );
}

function Cloud({ sx, delay, scale = 1 }: { sx: object; delay: number; scale?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        '@keyframes lsDrift': { from: { transform: `translateX(0) scale(${scale})` }, to: { transform: `translateX(60px) scale(${scale})` } },
        ...motion(`lsDrift ${14 + delay}s ease-in-out ${delay}s infinite alternate`),
        ...sx,
      }}
    >
      <Box component="svg" viewBox="0 0 120 60" sx={{ width: 150, display: 'block' }}>
        <path d="M20 50 Q4 50 8 36 Q12 24 28 28 Q32 10 52 12 Q70 4 80 22 Q100 16 104 32 Q118 34 114 46 Q112 52 100 52Z" fill="#FFFFFF" opacity="0.95" />
      </Box>
    </Box>
  );
}

export function StudentScene({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', fontFamily: NUNITO, backgroundImage: `url(${heroMeadow})`, backgroundSize: 'cover', backgroundPosition: 'center bottom', backgroundColor: '#BFE6FF' }}>
      <Cloud sx={{ top: '6%', left: '6%' }} delay={0} />
      <Cloud sx={{ top: '14%', right: '24%' }} delay={3} scale={0.7} />
      <Butterfly color="#FF7AA8" sx={{ top: '28%', left: '12%' }} delay={0} />
      <Butterfly color="#FFD23F" sx={{ top: '60%', left: '40%' }} delay={2} />
      <Butterfly color="#9C8CFF" sx={{ top: '20%', right: '10%' }} delay={4} />
      {/* Nano says hello */}
      <Box
        sx={{
          position: 'absolute',
          left: { md: '6%', lg: '10%' },
          top: { md: '12%', lg: '14%' },
          maxWidth: { md: 360, lg: 420 },
          display: { xs: 'none', md: 'block' },
          bgcolor: '#fff',
          borderRadius: '28px',
          border: '4px solid #FF8A1F',
          boxShadow: '0 8px 0 rgba(255,138,31,.25)',
          px: 3.5,
          py: 2.5,
          zIndex: 1,
          '&::after': { content: '""', position: 'absolute', left: 90, bottom: -18, width: 30, height: 30, bgcolor: '#fff', borderRight: '4px solid #FF8A1F', borderBottom: '4px solid #FF8A1F', transform: 'rotate(45deg)' },
          '@keyframes lsPop': { from: { transform: 'scale(.8)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
          ...motion('lsPop .5s cubic-bezier(.2,.9,.3,1.4) .2s both'),
        }}
      >
        <Box sx={{ fontSize: { md: 26, lg: 30 }, fontWeight: 900, color: '#2A2440', lineHeight: 1.2, mb: 1.25 }}>Hi! I’m Nano. {IDENTITIES.student.headline}</Box>
        {IDENTITIES.student.points.map((p) => (
          <Box key={p} sx={{ fontSize: 17, fontWeight: 700, color: '#4A4560', lineHeight: 1.7 }}>
            {p}
          </Box>
        ))}
      </Box>
      {/* Nano and friends */}
      <Box
        component="img"
        src={nano1}
        alt=""
        sx={{
          position: 'absolute',
          left: { md: '8%', lg: '14%' },
          bottom: '8%',
          width: { md: 230, lg: 280 },
          display: { xs: 'none', md: 'block' },
          filter: 'drop-shadow(0 16px 20px rgba(40,30,80,.25))',
          ...float,
          ...motion('lsFloat 3.4s ease-in-out infinite'),
        }}
      />
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Char buddy={buddyByKey('tara')} size={130} wave fixed sx={{ left: { md: '30%', lg: '33%' }, bottom: '6%' }} delay={0.6} />
        <Char buddy={buddyByKey('sheru')} size={110} fixed sx={{ left: { md: '44%', lg: '47%' }, bottom: '4%' }} delay={1.1} />
      </Box>
      <Box sx={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-end' }, px: { xs: 2, md: '8%' }, py: 4 }}>{children}</Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ grown-up scenes (left panel) */

function ParentArt() {
  const mum = person('mum', 'Parent', { kind: 'person', skin: '#C68B59', hair: 'long', hairColor: '#24160F', top: '#E8615A', top2: '#FFD08A', outfit: 'kurta' });
  const child = person('kid', 'Child', { kind: 'person', skin: '#C98B5B', hair: 'short', hairColor: '#24160F', top: '#4F9DF5', outfit: 'tee' });
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 520, aspectRatio: '520 / 380', mx: 'auto' }}>
      <Box component="svg" viewBox="0 0 520 380" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* window with sunset */}
        <rect x="300" y="30" width="170" height="150" rx="16" fill="#FFF4E8" stroke="#4A2A26" strokeWidth="4" />
        <rect x="312" y="42" width="146" height="126" rx="10" fill="#FFC79E" />
        <circle cx="385" cy="130" r="30" fill="#FF8A5B" />
        <path d="M312 140 Q350 120 385 136 Q420 118 458 138 L458 168 L312 168Z" fill="#E9785F" />
        <path d="M385 42 L385 168 M312 105 L458 105" stroke="#FFF4E8" strokeWidth="6" />
        {/* plant */}
        <rect x="60" y="230" width="44" height="46" rx="8" fill="#C46A4D" stroke="#4A2A26" strokeWidth="3" />
        <path d="M82 230 Q60 190 70 160 M82 230 Q88 186 104 170 M82 230 Q100 200 120 196" stroke="#3E9C6C" strokeWidth="7" strokeLinecap="round" fill="none" />
        {/* sofa */}
        <rect x="110" y="250" width="320" height="80" rx="30" fill="#FFB38A" stroke="#4A2A26" strokeWidth="4" />
        <rect x="90" y="230" width="46" height="110" rx="20" fill="#FF9F72" stroke="#4A2A26" strokeWidth="4" />
        <rect x="404" y="230" width="46" height="110" rx="20" fill="#FF9F72" stroke="#4A2A26" strokeWidth="4" />
        {/* hearts */}
        <g fill="#E8615A">
          <path d="M250 70 q-14 -16 -26 -4 q-10 12 26 36 q36 -24 26 -36 q-12 -12 -26 4z" />
          <path d="M206 120 q-8 -9 -15 -2 q-6 7 15 21 q21 -14 15 -21 q-7 -7 -15 2z" opacity="0.6" />
        </g>
        {/* rug */}
        <ellipse cx="270" cy="360" rx="200" ry="16" fill="#F7C6A8" />
      </Box>
      <Char buddy={mum} size={150} sx={{ left: '26%', top: '22%' }} delay={0} />
      <Char buddy={child} size={112} wave sx={{ left: '50%', top: '38%' }} delay={0.5} />
      {/* tablet in the child's hands */}
      <Box sx={{ position: 'absolute', left: '50%', top: '72%', width: '9%', aspectRatio: '4/3', bgcolor: '#2A2440', borderRadius: 1, border: '3px solid #4A2A26', boxShadow: 'inset 0 0 0 3px #7FD1FF' }} />
    </Box>
  );
}

function TeacherArt() {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 520, aspectRatio: '520 / 380', mx: 'auto' }}>
      <Box component="svg" viewBox="0 0 520 380" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* chalkboard */}
        <rect x="150" y="30" width="340" height="200" rx="14" fill="#2F5D50" stroke="#103B33" strokeWidth="6" />
        <rect x="150" y="226" width="340" height="12" rx="4" fill="#B98552" />
        <g stroke="#F4F7F2" strokeWidth="3.5" fill="none" strokeLinecap="round">
          <text x="184" y="90" fill="#F4F7F2" stroke="none" fontSize="30" fontFamily="Comic Sans MS, Nunito, sans-serif">
            a² + b² = c²
          </text>
          <circle cx="430" cy="90" r="26" />
          <path d="M430 64 L430 90 L452 90" />
          <path d="M184 170 Q210 130 236 170 T288 170" />
          <rect x="320" y="140" width="60" height="44" rx="10" />
          <circle cx="338" cy="160" r="5" fill="#F4F7F2" />
          <circle cx="362" cy="160" r="5" fill="#F4F7F2" />
          <path d="M350 140 L350 124" />
          <circle cx="350" cy="120" r="5" />
          <path d="M400 190 l14 -22 l14 22z" />
        </g>
        {/* books + apple */}
        <rect x="40" y="300" width="110" height="20" rx="4" fill="#5B6BD6" stroke="#103B33" strokeWidth="3" />
        <rect x="48" y="280" width="96" height="20" rx="4" fill="#F2B544" stroke="#103B33" strokeWidth="3" />
        <rect x="44" y="260" width="104" height="20" rx="4" fill="#E4505B" stroke="#103B33" strokeWidth="3" />
        <circle cx="98" cy="238" r="20" fill="#E4505B" stroke="#103B33" strokeWidth="3" />
        <path d="M98 220 Q100 208 110 204" stroke="#103B33" strokeWidth="3" fill="none" />
        <ellipse cx="114" cy="214" rx="9" ry="5" fill="#3E9C6C" />
        <rect x="0" y="320" width="520" height="60" fill="#8FD0BA" opacity="0.5" />
      </Box>
      <Char buddy={buddyByKey('lakshmi-maam')} size={150} sx={{ left: '2%', top: '6%' }} delay={0} />
      <Char buddy={buddyByKey('ravi-sir')} size={128} wave sx={{ right: '2%', top: '50%' }} delay={0.7} />
    </Box>
  );
}

function SchoolArt() {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 520, aspectRatio: '520 / 380', mx: 'auto' }}>
      <Box component="svg" viewBox="0 0 520 380" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="440" cy="60" r="34" fill="#FFD66B" />
        <rect x="0" y="300" width="520" height="80" fill="#9DD49B" />
        {/* building */}
        <rect x="110" y="130" width="300" height="180" rx="8" fill="#FFF7EC" stroke="#1E1C5C" strokeWidth="4" />
        <path d="M96 136 L260 60 L424 136Z" fill="#E4505B" stroke="#1E1C5C" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="260" cy="104" r="20" fill="#FFFFFF" stroke="#1E1C5C" strokeWidth="3" />
        <path d="M260 92 L260 104 L270 110" stroke="#1E1C5C" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M260 60 L260 20" stroke="#1E1C5C" strokeWidth="3" />
        <path d="M260 22 L292 30 L260 40Z" fill="#FF9933" stroke="#1E1C5C" strokeWidth="2" />
        {[140, 200, 300, 360].map((x) => (
          <g key={x}>
            <rect x={x} y="160" width="38" height="36" rx="5" fill="#9FD6FF" stroke="#1E1C5C" strokeWidth="3" />
            <rect x={x} y="220" width="38" height="36" rx="5" fill="#9FD6FF" stroke="#1E1C5C" strokeWidth="3" />
          </g>
        ))}
        <rect x="238" y="226" width="44" height="84" rx="6" fill="#3F3DBF" stroke="#1E1C5C" strokeWidth="3" />
        <text x="260" y="152" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1E1C5C" fontFamily="Inter, sans-serif">
          OUR SCHOOL
        </text>
        {/* trees */}
        {[50, 470].map((x) => (
          <g key={x}>
            <rect x={x - 6} y="250" width="12" height="56" fill="#8C6B4F" />
            <circle cx={x} cy="240" r="34" fill="#4CAF7A" stroke="#1E1C5C" strokeWidth="3" />
          </g>
        ))}
      </Box>
      <Char buddy={buddyByKey('meera')} size={86} wave sx={{ left: '28%', top: '66%' }} delay={0} />
      <Char buddy={buddyByKey('kabir')} size={86} sx={{ left: '58%', top: '66%' }} delay={0.6} />
    </Box>
  );
}

function PartnerArt() {
  const pins = [
    [120, 90],
    [250, 60],
    [380, 110],
    [90, 220],
    [220, 190],
    [330, 250],
    [440, 210],
    [170, 300],
    [300, 330],
  ];
  const links = [
    [0, 1],
    [1, 2],
    [0, 4],
    [1, 4],
    [3, 4],
    [4, 5],
    [2, 6],
    [5, 6],
    [3, 7],
    [7, 8],
    [5, 8],
    [4, 7],
  ];
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 520, aspectRatio: '520 / 380', mx: 'auto' }}>
      <Box component="svg" viewBox="0 0 520 380" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <g stroke="#6FB4FF" strokeWidth="2" opacity="0.55">
          {links.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={pins[a][0]} y1={pins[a][1]} x2={pins[b][0]} y2={pins[b][1]} strokeDasharray="5 6" />
          ))}
        </g>
        {pins.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="22" fill="#2F80ED" opacity="0.18" />
            <path d={`M${x} ${y + 14} Q${x - 14} ${y - 2} ${x - 12} ${y - 10} A12 12 0 1 1 ${x + 12} ${y - 10} Q${x + 14} ${y - 2} ${x} ${y + 14}Z`} fill={i === 4 ? '#FFD66B' : '#FFFFFF'} />
            <rect x={x - 5} y={y - 15} width="10" height="9" rx="1.5" fill="#2F80ED" />
          </g>
        ))}
      </Box>
      <Char buddy={buddyByKey('arjun-bhaiya')} size={110} wave sx={{ right: '4%', bottom: '2%' }} delay={0} />
    </Box>
  );
}

function AdminArt() {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 420, aspectRatio: '1', mx: 'auto', display: 'grid', placeItems: 'center' }}>
      <Box component="svg" viewBox="0 0 400 400" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {[60, 110, 160].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#E5184F" strokeOpacity={0.35 - i * 0.09} strokeWidth="2" strokeDasharray={i === 1 ? '4 8' : undefined} />
        ))}
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={200 + 160 * Math.cos((a * Math.PI) / 180)} cy={200 + 160 * Math.sin((a * Math.PI) / 180)} r="7" fill="#FFB547" />
        ))}
      </Box>
      <Box component="img" src={nano1} alt="" sx={{ width: '46%', position: 'relative', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.4))', ...float, ...motion('lsFloat 3.6s ease-in-out infinite') }} />
    </Box>
  );
}

export { ParentArt, TeacherArt, SchoolArt, PartnerArt };

export const SCENE_ART: Record<Exclude<Who, 'student'>, () => ReactNode> = {
  parent: ParentArt,
  teacher: TeacherArt,
  school: SchoolArt,
  partner: PartnerArt,
  admin: AdminArt,
};
