/**
 * Drawings of the NanoBot buddies (original Nanoskool characters), in the same friendly SVG style as Nano.
 * One "person" drawing takes skin, hair, clothes and extras; Sheru the lion cub has his own.
 */
import { Box } from '@mui/material';
import { buddyByKey, type BuddyDef, type LionArt, type PersonArt } from '@/lib/buddies';
import { NanoFor } from './art';
import type { Look } from './looks';

const INK = '#2A2440';
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}

function Person({ a, wave }: { a: PersonArt; wave: boolean }) {
  const skinDark = shade(a.skin, -0.12);
  const top2 = a.top2 ?? shade(a.top, -0.15);
  return (
    <>
      <ellipse cx="100" cy="213" rx="54" ry="6" fill="rgba(0,0,0,0.12)" />
      {/* hair behind the head */}
      {a.hair === 'long' && <path d="M44 86 Q40 150 62 170 L138 170 Q160 150 156 86 Q150 40 100 36 Q50 40 44 86Z" fill={a.hairColor} {...S} />}
      {a.hair === 'ponytail' && <path d="M140 52 Q178 56 172 104 Q168 128 150 136 Q160 108 146 80Z" fill={a.hairColor} {...S} />}
      {a.hair === 'braid' && (
        <g fill={a.hairColor} {...S}>
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={150 + i * 2} cy={104 + i * 18} rx="11" ry="10" />
          ))}
          <circle cx="156" cy="172" r="5" fill="#F2556F" />
        </g>
      )}
      {/* legs */}
      <rect x="74" y="188" width="20" height="24" rx="9" fill={shade(a.top, -0.35)} {...S} />
      <rect x="106" y="188" width="20" height="24" rx="9" fill={shade(a.top, -0.35)} {...S} />
      {/* body */}
      <path d="M56 196 Q54 146 80 136 L120 136 Q146 146 144 196Z" fill={a.outfit === 'coat' ? '#FFFFFF' : a.top} {...S} />
      {a.outfit === 'coat' && <path d="M86 137 L100 168 L114 137 Q118 170 114 196 L86 196 Q82 170 86 137Z" fill={a.top} {...S} />}
      {a.outfit === 'saree' && <path d="M66 140 Q96 150 132 196 L112 196 Q86 162 58 160Z" fill={top2} {...S} />}
      {a.outfit === 'shawl' && <path d="M58 168 Q60 140 82 135 L118 135 Q140 140 142 168 Q120 152 100 160 Q80 152 58 168Z" fill={top2} {...S} />}
      {a.outfit === 'kurta' && (
        <g>
          <path d="M100 138 L100 166" {...S} fill="none" />
          <circle cx="100" cy="150" r="2.2" fill={INK} />
          <circle cx="100" cy="160" r="2.2" fill={INK} />
          {a.top2 && <path d="M60 178 Q100 186 140 178" stroke={top2} strokeWidth="6" fill="none" />}
        </g>
      )}
      {a.outfit === 'vest' && <path d="M72 140 L86 136 L92 196 L68 196Z M128 140 L114 136 L108 196 L132 196Z" fill={top2} {...S} />}
      {a.outfit === 'shirt' && <path d="M88 136 L100 150 L112 136" fill="#FFFFFF" {...S} />}
      {a.extra === 'tie' && <path d="M100 150 L94 158 L100 184 L106 158Z" fill="#E4505B" {...S} />}
      {a.outfit === 'tee' && <circle cx="100" cy="166" r="9" fill="#FFFFFF" opacity="0.85" />}
      {/* arms */}
      <path d="M64 150 Q44 164 50 188" stroke={INK} strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M64 150 Q44 164 50 188" stroke={a.outfit === 'coat' ? '#FFFFFF' : a.top} strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="192" r="8" fill={a.skin} {...S} />
      {a.extra === 'book' && <rect x="30" y="176" width="26" height="32" rx="4" fill="#4A7BEA" {...S} transform="rotate(-10 43 192)" />}
      {wave ? (
        <g>
          <path d="M136 148 Q162 136 160 104" stroke={INK} strokeWidth="15" strokeLinecap="round" fill="none" />
          <path d="M136 148 Q162 136 160 104" stroke={a.outfit === 'coat' ? '#FFFFFF' : a.top} strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="160" cy="98" r="9" fill={a.skin} {...S} />
        </g>
      ) : (
        <g>
          <path d="M136 150 Q156 164 150 188" stroke={INK} strokeWidth="15" strokeLinecap="round" fill="none" />
          <path d="M136 150 Q156 164 150 188" stroke={a.outfit === 'coat' ? '#FFFFFF' : a.top} strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="150" cy="192" r="8" fill={a.skin} {...S} />
        </g>
      )}
      {/* neck + head */}
      <rect x="90" y="122" width="20" height="18" rx="6" fill={skinDark} {...S} />
      <circle cx="49" cy="88" r="9" fill={a.skin} {...S} />
      <circle cx="151" cy="88" r="9" fill={a.skin} {...S} />
      {a.extra === 'earphones' && (
        <g>
          <path d="M46 84 Q46 26 100 26 Q154 26 154 84" stroke="#3B3B52" strokeWidth="6" fill="none" />
          <rect x="38" y="76" width="14" height="22" rx="6" fill="#3B3B52" />
          <rect x="148" y="76" width="14" height="22" rx="6" fill="#3B3B52" />
        </g>
      )}
      <ellipse cx="100" cy="84" rx="50" ry="48" fill={a.skin} {...S} />
      {/* beard sits under the mouth */}
      {a.beard === 'full' && <path d="M54 96 Q58 156 100 158 Q142 156 146 96 Q134 120 100 122 Q66 120 54 96Z" fill={a.hairColor} {...S} />}
      {/* face */}
      <path d="M74 74 Q82 69 90 74" {...S} fill="none" stroke={a.hair === 'bald' ? '#9A9AA6' : a.hairColor === '#D9D9DE' ? '#8A8A96' : INK} />
      <path d="M110 74 Q118 69 126 74" {...S} fill="none" stroke={a.hair === 'bald' ? '#9A9AA6' : a.hairColor === '#D9D9DE' ? '#8A8A96' : INK} />
      <ellipse cx="82" cy="88" rx="7" ry="8" fill={INK} />
      <ellipse cx="118" cy="88" rx="7" ry="8" fill={INK} />
      <circle cx="84.5" cy="85" r="2.6" fill="#fff" />
      <circle cx="120.5" cy="85" r="2.6" fill="#fff" />
      <circle cx="68" cy="104" r="6.5" fill="#FF8FA8" opacity="0.55" />
      <circle cx="132" cy="104" r="6.5" fill="#FF8FA8" opacity="0.55" />
      <path d="M97 96 Q100 100 103 96" stroke={shade(a.skin, -0.3)} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {a.beard === 'mustache' && <path d="M84 108 Q92 102 100 106 Q108 102 116 108 Q108 110 100 108 Q92 110 84 108Z" fill={a.hairColor === '#E3E3E8' ? '#CFCFD6' : a.hairColor} {...S} strokeWidth={2} />}
      <path d={a.beard ? 'M90 113 Q100 120 110 113' : 'M88 108 Q100 120 112 108'} stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill={a.beard ? 'none' : '#FFFFFF'} />
      {a.bindi && <circle cx="100" cy="66" r="3.6" fill="#E23D55" />}
      {/* hair in front */}
      {a.hair === 'short' && <path d="M50 82 Q48 34 100 32 Q152 34 150 82 Q140 58 120 54 Q104 64 80 56 Q60 60 50 82Z" fill={a.hairColor} {...S} />}
      {a.hair === 'spiky' && <path d="M50 82 Q46 50 62 40 L66 24 L80 34 L90 18 L102 32 L116 18 L122 34 L138 26 L138 44 Q154 54 150 82 Q138 60 116 56 Q100 64 82 56 Q62 60 50 82Z" fill={a.hairColor} {...S} />}
      {a.hair === 'curly' && (
        <g fill={a.hairColor} {...S}>
          {[
            [56, 66],
            [62, 48],
            [78, 36],
            [98, 32],
            [118, 36],
            [136, 48],
            [144, 66],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="14" />
          ))}
          <path d="M60 70 Q100 46 140 70 Q140 50 100 44 Q60 50 60 70Z" stroke="none" />
        </g>
      )}
      {(a.hair === 'ponytail' || a.hair === 'braid' || a.hair === 'long') && <path d="M50 86 Q46 36 100 34 Q154 36 150 86 Q146 62 128 52 Q112 66 70 62 Q56 68 50 86Z" fill={a.hairColor} {...S} />}
      {a.hair === 'bun' && (
        <g fill={a.hairColor} {...S}>
          <circle cx="100" cy="30" r="17" />
          <path d="M50 84 Q48 38 100 36 Q152 38 150 84 Q142 58 100 56 Q58 58 50 84Z" />
        </g>
      )}
      {a.hair === 'bald' && (
        <g fill={a.hairColor} {...S}>
          <path d="M50 92 Q48 70 58 60 Q62 74 60 92Z" />
          <path d="M150 92 Q152 70 142 60 Q138 74 140 92Z" />
        </g>
      )}
      {a.extra === 'headband' && <path d="M52 66 Q100 34 148 66" stroke="#FFD23F" strokeWidth="7" strokeLinecap="round" fill="none" />}
      {a.extra === 'cap' && (
        <g {...S}>
          <path d="M52 66 Q54 26 100 26 Q146 26 148 66Z" fill={a.top} />
          <path d="M48 66 Q100 54 168 64 Q166 74 148 72 Q100 64 52 72Z" fill={shade(a.top, -0.18)} />
          <circle cx="100" cy="28" r="4" fill="#fff" />
        </g>
      )}
      {(a.extra === 'safari' || a.extra === 'parrot-safari') && (
        <g {...S}>
          <ellipse cx="100" cy="50" rx="66" ry="12" fill="#D8B37A" />
          <path d="M60 50 Q62 16 100 16 Q138 16 140 50Z" fill="#E7C78F" />
          <path d="M62 44 Q100 36 138 44" stroke="#8C6B4F" strokeWidth="5" fill="none" />
        </g>
      )}
      {a.extra === 'goggles' && (
        <g {...S}>
          <path d="M50 58 Q100 44 150 58" stroke="#3B3B52" strokeWidth="6" fill="none" />
          <circle cx="82" cy="54" r="13" fill="#9BE7F2" />
          <circle cx="118" cy="54" r="13" fill="#9BE7F2" />
          <circle cx="78" cy="50" r="3.5" fill="#fff" stroke="none" />
          <circle cx="114" cy="50" r="3.5" fill="#fff" stroke="none" />
        </g>
      )}
      {a.glasses && (
        <g fill="none" stroke={INK} strokeWidth="3">
          <circle cx="82" cy="88" r="14" />
          <circle cx="118" cy="88" r="14" />
          <path d="M96 88 Q100 84 104 88" />
        </g>
      )}
      {/* Mithu the parrot */}
      {a.extra === 'parrot-safari' && (
        <g {...S}>
          <path d="M158 150 Q176 168 170 186 Q160 172 152 160Z" fill="#2FA37B" />
          <ellipse cx="156" cy="138" rx="15" ry="18" fill="#4CC27A" />
          <circle cx="160" cy="118" r="12" fill="#4CC27A" />
          <path d="M170 116 Q180 120 172 128 Q168 124 168 120Z" fill="#FFB020" />
          <circle cx="162" cy="115" r="2.6" fill={INK} stroke="none" />
          <path d="M150 140 Q156 150 164 142" stroke={INK} strokeWidth="2.5" fill="none" />
          <path d="M152 106 Q156 98 162 104" stroke="#F2556F" strokeWidth="4" fill="none" />
        </g>
      )}
    </>
  );
}

function Lion({ wave }: { a: LionArt; wave: boolean }) {
  const fur = '#F2B13C';
  const mane = '#C9662A';
  return (
    <>
      <ellipse cx="100" cy="213" rx="54" ry="6" fill="rgba(0,0,0,0.12)" />
      {/* tail */}
      <path d="M140 186 Q176 182 172 150" stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M140 186 Q176 182 172 150" stroke={fur} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="172" cy="146" r="8" fill={mane} {...S} />
      {/* legs + body */}
      <rect x="72" y="186" width="22" height="26" rx="10" fill={fur} {...S} />
      <rect x="106" y="186" width="22" height="26" rx="10" fill={fur} {...S} />
      <ellipse cx="100" cy="166" rx="44" ry="36" fill={fur} {...S} />
      <ellipse cx="100" cy="172" rx="24" ry="22" fill="#FCE3B0" />
      {/* jersey stripe */}
      <path d="M60 156 Q100 170 140 156" stroke="#3A7BEA" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* arms */}
      <path d="M64 160 Q46 170 50 190" stroke={INK} strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M64 160 Q46 170 50 190" stroke={fur} strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* cricket bat */}
      <g {...S}>
        <rect x="36" y="182" width="10" height="30" rx="3" fill="#B07A48" transform="rotate(-24 41 197)" />
        <rect x="18" y="200" width="18" height="16" rx="5" fill="#E9C38D" transform="rotate(-24 27 208)" />
      </g>
      <circle cx="50" cy="192" r="8" fill={fur} {...S} />
      {wave ? (
        <g>
          <path d="M136 158 Q162 144 160 112" stroke={INK} strokeWidth="15" strokeLinecap="round" fill="none" />
          <path d="M136 158 Q162 144 160 112" stroke={fur} strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="160" cy="106" r="9" fill={fur} {...S} />
        </g>
      ) : (
        <g>
          <path d="M136 160 Q156 172 150 190" stroke={INK} strokeWidth="15" strokeLinecap="round" fill="none" />
          <path d="M136 160 Q156 172 150 190" stroke={fur} strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="150" cy="192" r="8" fill={fur} {...S} />
        </g>
      )}
      {/* mane */}
      <g fill={mane} {...S}>
        {Array.from({ length: 12 }).map((_, i) => {
          const ang = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={100 + Math.cos(ang) * 50} cy={84 + Math.sin(ang) * 48} r="17" />;
        })}
      </g>
      <circle cx="100" cy="84" r="50" fill={mane} />
      {/* ears */}
      <circle cx="66" cy="50" r="12" fill={fur} {...S} />
      <circle cx="134" cy="50" r="12" fill={fur} {...S} />
      <circle cx="66" cy="50" r="5" fill="#F7A6A0" />
      <circle cx="134" cy="50" r="5" fill="#F7A6A0" />
      {/* face */}
      <ellipse cx="100" cy="88" rx="42" ry="40" fill={fur} {...S} />
      <ellipse cx="100" cy="106" rx="22" ry="16" fill="#FCE3B0" />
      <ellipse cx="84" cy="82" rx="7" ry="8" fill={INK} />
      <ellipse cx="116" cy="82" rx="7" ry="8" fill={INK} />
      <circle cx="86.5" cy="79" r="2.6" fill="#fff" />
      <circle cx="118.5" cy="79" r="2.6" fill="#fff" />
      <path d="M93 98 L107 98 L100 106Z" fill="#7A3E2B" {...S} strokeWidth={2} />
      <path d="M100 106 Q92 116 86 110 M100 106 Q108 116 114 110" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="70" cy="100" r="6" fill="#FF8FA8" opacity="0.5" />
      <circle cx="130" cy="100" r="6" fill="#FF8FA8" opacity="0.5" />
      {/* cricket cap */}
      <g {...S}>
        <path d="M66 58 Q68 30 100 30 Q132 30 134 58Z" fill="#3A7BEA" />
        <path d="M66 58 Q100 50 150 56 Q148 64 134 64 Q100 58 70 64Z" fill="#2A5CC0" />
      </g>
    </>
  );
}

export function BuddyArt({ buddy, size = 160, wave = true, title, face }: { buddy: BuddyDef; size?: number; wave?: boolean; title?: string; face?: boolean }) {
  if (buddy.art.kind === 'nano') return null;
  return (
    <Box component="svg" viewBox={face ? '34 14 132 132' : '0 0 200 220'} role="img" aria-label={title ?? buddy.name} sx={{ width: size, height: face ? size : size * 1.1, display: 'block', overflow: face ? 'hidden' : 'visible' }}>
      <title>{title ?? buddy.name}</title>
      {buddy.art.kind === 'lion' ? <Lion a={buddy.art} wave={wave} /> : <Person a={buddy.art} wave={wave} />}
    </Box>
  );
}

/** The student's chosen buddy; Nano in the grade's own style when they chose Nano. */
export function BuddyFor({ look, buddy, size = 160, wave = true, face }: { look: Look; buddy?: BuddyDef | string | null; size?: number; wave?: boolean; face?: boolean }) {
  const b = typeof buddy === 'string' || !buddy ? buddyByKey(buddy as string | null) : buddy;
  if (b.art.kind === 'nano') return <NanoFor look={look} size={size} wave={wave} />;
  return <BuddyArt buddy={b} size={face ? size : size * 1.1} wave={wave} face={face} />;
}
