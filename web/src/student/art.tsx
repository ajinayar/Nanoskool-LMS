/**
 * Original illustrations for the student app: "Nano", Nanoskool's robot buddy, and one simple
 * background scene per grade world. Everything is drawn in SVG, so it is sharp at any size and
 * needs no image files.
 */
import { Box } from '@mui/material';
import type { Accessory, Scene } from './looks';

export function Mascot({ body, belly, accessory, size = 160, wave = true, title = 'Nano the robot' }: { body: string; belly: string; accessory?: Accessory; size?: number; wave?: boolean; title?: string }) {
  const ink = '#2A2440';
  return (
    <Box component="svg" viewBox="0 0 200 220" role="img" aria-label={title} sx={{ width: size, height: size * 1.1, display: 'block', overflow: 'visible' }}>
      <title>{title}</title>
      <ellipse cx="100" cy="212" rx="58" ry="7" fill="rgba(0,0,0,0.12)" />
      {/* antenna */}
      <line x1="100" y1="34" x2="100" y2="14" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      {accessory === 'flower' ? (
        <g transform="translate(100 12)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-9" rx="6" ry="9" fill="#FF7AA8" transform={`rotate(${a})`} />
          ))}
          <circle r="6" fill="#FFD23F" stroke={ink} strokeWidth="2" />
        </g>
      ) : (
        <circle cx="100" cy="12" r="8" fill={accessory === 'helmet' ? '#FFB547' : '#FF6B6B'} stroke={ink} strokeWidth="3" />
      )}
      {/* arms */}
      <path d="M40 132 Q18 140 22 164" stroke={ink} strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M40 132 Q18 140 22 164" stroke={body} strokeWidth="8" strokeLinecap="round" fill="none" />
      {wave ? (
        <g>
          <path d="M160 128 Q186 112 182 82" stroke={ink} strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M160 128 Q186 112 182 82" stroke={body} strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="182" cy="76" r="10" fill={body} stroke={ink} strokeWidth="3" />
        </g>
      ) : (
        <g>
          <path d="M160 132 Q182 140 178 164" stroke={ink} strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M160 132 Q182 140 178 164" stroke={body} strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>
      )}
      {/* legs */}
      <rect x="70" y="182" width="20" height="26" rx="9" fill={body} stroke={ink} strokeWidth="3" />
      <rect x="110" y="182" width="20" height="26" rx="9" fill={body} stroke={ink} strokeWidth="3" />
      {/* body */}
      <rect x="44" y="112" width="112" height="80" rx="30" fill={body} stroke={ink} strokeWidth="3.5" />
      <rect x="70" y="128" width="60" height="42" rx="14" fill={belly} stroke={ink} strokeWidth="2.5" />
      <path d="M84 150 l8 8 l18 -18" stroke="#23B26D" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* head */}
      <rect x="34" y="32" width="132" height="92" rx="40" fill={body} stroke={ink} strokeWidth="3.5" />
      <rect x="50" y="46" width="100" height="64" rx="30" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
      {/* eyes */}
      <circle cx="80" cy="76" r="12" fill={ink} />
      <circle cx="120" cy="76" r="12" fill={ink} />
      <circle cx="84" cy="71" r="4.5" fill="#fff" />
      <circle cx="124" cy="71" r="4.5" fill="#fff" />
      <circle cx="64" cy="94" r="7" fill="#FF9DB5" opacity="0.8" />
      <circle cx="136" cy="94" r="7" fill="#FF9DB5" opacity="0.8" />
      <path d="M88 94 Q100 106 112 94" stroke={ink} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* ear bolts */}
      <rect x="24" y="66" width="14" height="26" rx="6" fill={belly} stroke={ink} strokeWidth="3" />
      <rect x="162" y="66" width="14" height="26" rx="6" fill={belly} stroke={ink} strokeWidth="3" />
      {accessory && <AccessoryArt kind={accessory} ink={ink} />}
    </Box>
  );
}

function AccessoryArt({ kind, ink }: { kind: Accessory; ink: string }) {
  switch (kind) {
    case 'snorkel':
      return (
        <g>
          <rect x="54" y="58" width="92" height="36" rx="18" fill="rgba(160,230,255,0.45)" stroke={ink} strokeWidth="3.5" />
          <line x1="100" y1="60" x2="100" y2="92" stroke={ink} strokeWidth="3" />
          <path d="M160 70 L160 20 Q160 10 170 10" stroke="#FF7A59" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'helmet':
      return (
        <g>
          <path d="M28 84 Q28 20 100 20 Q172 20 172 84" fill="rgba(200,230,255,0.25)" stroke={ink} strokeWidth="3" />
          <path d="M40 60 Q60 30 92 28" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
        </g>
      );
    case 'hat':
      return (
        <g>
          <ellipse cx="100" cy="40" rx="76" ry="12" fill="#C9A15A" stroke={ink} strokeWidth="3" />
          <path d="M58 40 Q60 6 100 6 Q140 6 142 40 Z" fill="#DDB872" stroke={ink} strokeWidth="3" />
          <rect x="60" y="28" width="80" height="8" fill="#8A5A2B" />
        </g>
      );
    case 'goggles':
      return (
        <g>
          <rect x="34" y="36" width="132" height="10" rx="5" fill="#3A3A4A" />
          <circle cx="76" cy="40" r="15" fill="rgba(170,230,255,0.8)" stroke={ink} strokeWidth="3.5" />
          <circle cx="124" cy="40" r="15" fill="rgba(170,230,255,0.8)" stroke={ink} strokeWidth="3.5" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M34 78 Q34 18 100 18 Q166 18 166 78" stroke={ink} strokeWidth="8" fill="none" strokeLinecap="round" />
          <rect x="18" y="62" width="24" height="38" rx="10" fill="#EC4899" stroke={ink} strokeWidth="3" />
          <rect x="158" y="62" width="24" height="38" rx="10" fill="#EC4899" stroke={ink} strokeWidth="3" />
        </g>
      );
    default:
      return null;
  }
}

/** Decorative scene that sits behind the greeting banner. */
export function SceneArt({ scene }: { scene: Scene }) {
  return (
    <Box component="svg" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {scene === 'meadow' && (
        <g>
          <circle cx="700" cy="60" r="38" fill="#FFE066" />
          <circle cx="700" cy="60" r="54" fill="#FFE066" opacity="0.3" />
          <Cloud x={90} y={50} s={1} />
          <Cloud x={420} y={36} s={0.8} />
          <path d="M0 210 Q180 150 380 205 T800 190 V300 H0 Z" fill="#8ED86A" />
          <path d="M0 250 Q220 200 460 250 T800 240 V300 H0 Z" fill="#62C04F" />
          {[60, 150, 250, 530, 620, 740].map((x, i) => (
            <Flower key={x} x={x} y={262 - (i % 2) * 14} c={['#FF6B6B', '#FFB020', '#A56BFF'][i % 3]} />
          ))}
        </g>
      )}
      {scene === 'ocean' && (
        <g>
          {[[80, 80, 10], [150, 150, 6], [640, 60, 12], [700, 140, 7], [560, 110, 5], [300, 50, 6]].map(([x, y, r]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
          ))}
          <path d="M0 230 Q100 205 200 230 T400 230 T600 230 T800 230 V300 H0 Z" fill="#F4D9A0" />
          <path d="M40 300 Q30 250 50 220 Q70 250 60 300" fill="#2FBF8F" />
          <path d="M740 300 Q730 240 752 210 Q772 250 762 300" fill="#2FBF8F" />
          <Fish x={560} y={200} c="#FF7A59" />
          <Fish x={230} y={170} c="#FFC23D" flip />
        </g>
      )}
      {scene === 'space' && (
        <g>
          {Array.from({ length: 34 }, (_, i) => (
            <circle key={i} cx={(i * 137) % 800} cy={(i * 71) % 300} r={i % 5 === 0 ? 2.6 : 1.4} fill="#fff" opacity={0.5 + (i % 3) * 0.2} />
          ))}
          <circle cx="690" cy="80" r="46" fill="#FF8FB1" />
          <ellipse cx="690" cy="80" rx="72" ry="14" fill="none" stroke="#FFD27A" strokeWidth="6" transform="rotate(-18 690 80)" />
          <circle cx="110" cy="240" r="90" fill="#5B45C9" opacity="0.8" />
          <circle cx="80" cy="220" r="14" fill="#4A37AE" />
          <circle cx="140" cy="260" r="10" fill="#4A37AE" />
          <g transform="translate(560 190) rotate(35)">
            <path d="M0 -40 Q16 -20 16 16 H-16 Q-16 -20 0 -40 Z" fill="#fff" />
            <circle cx="0" cy="-8" r="6" fill="#4C8DFF" />
            <path d="M-16 6 L-28 24 L-16 20 Z M16 6 L28 24 L16 20 Z" fill="#FF6B8B" />
            <path d="M-8 18 Q0 44 8 18 Z" fill="#FFB547" />
          </g>
        </g>
      )}
      {scene === 'jungle' && (
        <g opacity="0.9">
          {[[-20, -10, 30], [720, -20, -30], [760, 200, -150], [-30, 220, 160], [620, 250, -120]].map(([x, y, r], i) => (
            <Leaf key={i} x={x} y={y} r={r} c={i % 2 ? '#A7E36B' : '#6CCB55'} />
          ))}
        </g>
      )}
      {scene === 'lab' && (
        <g opacity="0.35" stroke="#fff" strokeWidth="4" fill="none">
          <circle cx="690" cy="70" r="34" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="684" y="22" width="12" height="16" transform={`rotate(${i * 45} 690 70)`} fill="#fff" stroke="none" />
          ))}
          <path d="M560 200 v-50 h30 v50 l30 60 h-90 z" />
          <path d="M620 110 a20 20 0 1 0 1 0" />
          <path d="M40 40 h60 M70 40 v40 M40 250 l40 -40 l40 40" />
        </g>
      )}
      {scene === 'quest' && (
        <g>
          <path d="M520 300 L640 140 L760 300 Z" fill="rgba(255,255,255,0.12)" />
          <path d="M620 300 L720 180 L820 300 Z" fill="rgba(255,255,255,0.08)" />
          <path d="M470 260 Q560 220 610 250 T740 170" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" fill="none" />
          <g transform="translate(740 160)">
            <line x1="0" y1="0" x2="0" y2="-34" stroke="#fff" strokeWidth="3" />
            <path d="M0 -34 L24 -26 L0 -18 Z" fill="#FBBF24" />
          </g>
        </g>
      )}
    </Box>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity="0.95">
      <ellipse cx="40" cy="30" rx="40" ry="22" />
      <ellipse cx="80" cy="22" rx="32" ry="24" />
      <ellipse cx="110" cy="34" rx="30" ry="18" />
    </g>
  );
}
function Flower({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" y1="0" x2="0" y2="30" stroke="#3E9B3A" strokeWidth="3" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-7" rx="5" ry="7" fill={c} transform={`rotate(${a})`} />
      ))}
      <circle r="4.5" fill="#FFE066" />
    </g>
  );
}
function Fish({ x, y, c, flip }: { x: number; y: number; c: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx="0" cy="0" rx="26" ry="15" fill={c} />
      <path d="M22 0 L42 -14 L42 14 Z" fill={c} />
      <circle cx="-12" cy="-3" r="3.5" fill="#1F2A44" />
    </g>
  );
}
function Leaf({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M0 0 Q80 -30 160 0 Q80 30 0 0 Z" fill={c} />
      <path d="M0 0 L160 0" stroke="rgba(0,0,0,0.12)" strokeWidth="3" />
    </g>
  );
}

/** Simple five-point star, used for the "stars" currency on the younger grades. */
export function StarIcon({ size = 22, color = '#FFC928' }: { size?: number; color?: string }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={{ width: size, height: size, flexShrink: 0, display: 'block' }}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill={color} stroke="#E0A400" strokeWidth="1.2" strokeLinejoin="round" />
    </Box>
  );
}

/** Gift box for the daily reward. */
export function GiftArt({ size = 96, open }: { size?: number; open?: boolean }) {
  return (
    <Box component="svg" viewBox="0 0 120 120" aria-hidden sx={{ width: size, height: size, display: 'block' }}>
      <rect x="18" y="52" width="84" height="56" rx="10" fill="#FF6B6B" stroke="#2A2440" strokeWidth="3" />
      <rect x="54" y="52" width="12" height="56" fill="#FFD23F" />
      <g transform={open ? 'translate(0 -18) rotate(-12 60 46)' : undefined}>
        <rect x="12" y="36" width="96" height="20" rx="8" fill="#FF8A8A" stroke="#2A2440" strokeWidth="3" />
        <rect x="54" y="36" width="12" height="20" fill="#FFD23F" />
        <path d="M60 36 Q40 10 30 24 Q26 36 60 36 Q80 10 90 24 Q94 36 60 36" fill="#FFD23F" stroke="#2A2440" strokeWidth="3" />
      </g>
      {open && [[30, 20], [96, 14], [60, 6]].map(([x, y]) => <path key={x} d={`M${x} ${y} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 z`} fill="#FFC928" />)}
    </Box>
  );
}

/** Nano for a given look: the painted character on Grades 1–3, the drawn one elsewhere. */
export function NanoFor({ look, size = 160, wave = true }: { look: { art?: { nano: string }; mascot?: { body: string; belly: string; accessory: import('./looks').Accessory } }; size?: number; wave?: boolean }) {
  if (look.art) return <Box component="img" src={look.art.nano} alt="Nano the robot" sx={{ width: size, height: size, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 10px 14px rgba(40,30,80,0.18))' }} />;
  if (look.mascot) return <Mascot {...look.mascot} size={size} wave={wave} />;
  return null;
}
