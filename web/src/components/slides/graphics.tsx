/**
 * Built-in slide graphics: each key is an icon drawn as an illustration in the deck's colours
 * (soft blobs, rings and sparkles), so AI-made decks have pictures without searching for images.
 * Keep the keys in step with server/src/lib/slideIcons.ts.
 */
import { Box } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import Bolt from '@mui/icons-material/Bolt';
import Lightbulb from '@mui/icons-material/Lightbulb';
import Battery from '@mui/icons-material/BatteryChargingFull';
import Power from '@mui/icons-material/Power';
import ToggleOn from '@mui/icons-material/ToggleOn';
import Memory from '@mui/icons-material/Memory';
import SmartToy from '@mui/icons-material/SmartToy';
import Code from '@mui/icons-material/Code';
import Computer from '@mui/icons-material/Computer';
import Phone from '@mui/icons-material/PhoneAndroid';
import Wifi from '@mui/icons-material/Wifi';
import Settings from '@mui/icons-material/Settings';
import Build from '@mui/icons-material/Build';
import Science from '@mui/icons-material/Science';
import Biotech from '@mui/icons-material/Biotech';
import LocalFlorist from '@mui/icons-material/LocalFlorist';
import Park from '@mui/icons-material/Park';
import Spa from '@mui/icons-material/Spa';
import Grass from '@mui/icons-material/Grass';
import Agriculture from '@mui/icons-material/Agriculture';
import WaterDrop from '@mui/icons-material/WaterDrop';
import Waves from '@mui/icons-material/Waves';
import WbSunny from '@mui/icons-material/WbSunny';
import Cloud from '@mui/icons-material/Cloud';
import Thunderstorm from '@mui/icons-material/Thunderstorm';
import Air from '@mui/icons-material/Air';
import Public from '@mui/icons-material/Public';
import RocketLaunch from '@mui/icons-material/RocketLaunch';
import Star from '@mui/icons-material/Star';
import DarkMode from '@mui/icons-material/DarkMode';
import Calculate from '@mui/icons-material/Calculate';
import Straighten from '@mui/icons-material/Straighten';
import Category from '@mui/icons-material/Category';
import BarChart from '@mui/icons-material/BarChart';
import Insights from '@mui/icons-material/Insights';
import Schedule from '@mui/icons-material/Schedule';
import Timer from '@mui/icons-material/Timer';
import Speed from '@mui/icons-material/Speed';
import Scale from '@mui/icons-material/Scale';
import MapIcon from '@mui/icons-material/Map';
import Explore from '@mui/icons-material/Explore';
import MenuBook from '@mui/icons-material/MenuBook';
import School from '@mui/icons-material/School';
import Edit from '@mui/icons-material/Edit';
import TipsAndUpdates from '@mui/icons-material/TipsAndUpdates';
import QuestionMark from '@mui/icons-material/QuestionMark';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import Favorite from '@mui/icons-material/Favorite';
import Restaurant from '@mui/icons-material/Restaurant';
import Pets from '@mui/icons-material/Pets';
import BugReport from '@mui/icons-material/BugReport';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import DirectionsBus from '@mui/icons-material/DirectionsBus';
import PedalBike from '@mui/icons-material/PedalBike';
import Train from '@mui/icons-material/Train';
import Flight from '@mui/icons-material/Flight';
import Home from '@mui/icons-material/Home';
import Factory from '@mui/icons-material/Factory';
import Recycling from '@mui/icons-material/Recycling';
import LocalFireDepartment from '@mui/icons-material/LocalFireDepartment';
import Thermostat from '@mui/icons-material/Thermostat';
import VolumeUp from '@mui/icons-material/VolumeUp';
import MusicNote from '@mui/icons-material/MusicNote';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import Visibility from '@mui/icons-material/Visibility';
import PanTool from '@mui/icons-material/PanTool';
import Groups from '@mui/icons-material/Groups';
import Person from '@mui/icons-material/Person';
import Psychology from '@mui/icons-material/Psychology';
import Shield from '@mui/icons-material/Shield';
import Lock from '@mui/icons-material/Lock';
import CurrencyRupee from '@mui/icons-material/CurrencyRupee';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Flag from '@mui/icons-material/Flag';
import Extension from '@mui/icons-material/Extension';
import TrackChanges from '@mui/icons-material/TrackChanges';
import Hub from '@mui/icons-material/Hub';
import Cable from '@mui/icons-material/Cable';
import SolarPower from '@mui/icons-material/SolarPower';
import WindPower from '@mui/icons-material/WindPower';
import Sensors from '@mui/icons-material/Sensors';
import Terminal from '@mui/icons-material/Terminal';
import Brush from '@mui/icons-material/Brush';
import Palette from '@mui/icons-material/Palette';
import SportsCricket from '@mui/icons-material/SportsCricket';
import type { DeckTheme } from './SlideView';

export const GRAPHICS: Record<string, { Icon: SvgIconComponent; label: string }> = {
  bolt: { Icon: Bolt, label: 'Electricity' },
  bulb: { Icon: Lightbulb, label: 'Light bulb' },
  battery: { Icon: Battery, label: 'Battery' },
  plug: { Icon: Power, label: 'Plug' },
  switch: { Icon: ToggleOn, label: 'Switch' },
  chip: { Icon: Memory, label: 'Circuit chip' },
  robot: { Icon: SmartToy, label: 'Robot' },
  code: { Icon: Code, label: 'Code' },
  computer: { Icon: Computer, label: 'Computer' },
  phone: { Icon: Phone, label: 'Phone' },
  wifi: { Icon: Wifi, label: 'Wi-Fi' },
  gear: { Icon: Settings, label: 'Gear' },
  tools: { Icon: Build, label: 'Tools' },
  science: { Icon: Science, label: 'Experiment' },
  microscope: { Icon: Biotech, label: 'Microscope' },
  flower: { Icon: LocalFlorist, label: 'Flower' },
  tree: { Icon: Park, label: 'Tree' },
  leaf: { Icon: Spa, label: 'Leaf' },
  grass: { Icon: Grass, label: 'Grass' },
  farm: { Icon: Agriculture, label: 'Farm' },
  water: { Icon: WaterDrop, label: 'Water' },
  waves: { Icon: Waves, label: 'Waves' },
  sun: { Icon: WbSunny, label: 'Sun' },
  cloud: { Icon: Cloud, label: 'Cloud' },
  storm: { Icon: Thunderstorm, label: 'Storm' },
  air: { Icon: Air, label: 'Air' },
  earth: { Icon: Public, label: 'Earth' },
  rocket: { Icon: RocketLaunch, label: 'Rocket' },
  star: { Icon: Star, label: 'Star' },
  moon: { Icon: DarkMode, label: 'Moon' },
  calculate: { Icon: Calculate, label: 'Maths' },
  ruler: { Icon: Straighten, label: 'Ruler' },
  shapes: { Icon: Category, label: 'Shapes' },
  chart: { Icon: BarChart, label: 'Chart' },
  insights: { Icon: Insights, label: 'Trend' },
  clock: { Icon: Schedule, label: 'Clock' },
  timer: { Icon: Timer, label: 'Timer' },
  speed: { Icon: Speed, label: 'Speed' },
  scale: { Icon: Scale, label: 'Weighing scale' },
  map: { Icon: MapIcon, label: 'Map' },
  compass: { Icon: Explore, label: 'Compass' },
  book: { Icon: MenuBook, label: 'Book' },
  school: { Icon: School, label: 'School' },
  pencil: { Icon: Edit, label: 'Pencil' },
  idea: { Icon: TipsAndUpdates, label: 'Idea' },
  question: { Icon: QuestionMark, label: 'Question' },
  check: { Icon: CheckCircle, label: 'Tick' },
  warning: { Icon: Warning, label: 'Warning' },
  heart: { Icon: Favorite, label: 'Heart' },
  food: { Icon: Restaurant, label: 'Food' },
  animal: { Icon: Pets, label: 'Animal' },
  bug: { Icon: BugReport, label: 'Insect' },
  car: { Icon: DirectionsCar, label: 'Car' },
  bus: { Icon: DirectionsBus, label: 'Bus' },
  bike: { Icon: PedalBike, label: 'Bicycle' },
  train: { Icon: Train, label: 'Train' },
  plane: { Icon: Flight, label: 'Aeroplane' },
  home: { Icon: Home, label: 'Home' },
  factory: { Icon: Factory, label: 'Factory' },
  recycle: { Icon: Recycling, label: 'Recycle' },
  fire: { Icon: LocalFireDepartment, label: 'Fire' },
  thermometer: { Icon: Thermostat, label: 'Thermometer' },
  sound: { Icon: VolumeUp, label: 'Sound' },
  music: { Icon: MusicNote, label: 'Music' },
  camera: { Icon: PhotoCamera, label: 'Camera' },
  eye: { Icon: Visibility, label: 'Eye' },
  hand: { Icon: PanTool, label: 'Hand' },
  people: { Icon: Groups, label: 'People' },
  person: { Icon: Person, label: 'Person' },
  brain: { Icon: Psychology, label: 'Thinking' },
  shield: { Icon: Shield, label: 'Safety' },
  lock: { Icon: Lock, label: 'Lock' },
  money: { Icon: CurrencyRupee, label: 'Money' },
  trophy: { Icon: EmojiEvents, label: 'Trophy' },
  flag: { Icon: Flag, label: 'Flag' },
  puzzle: { Icon: Extension, label: 'Puzzle' },
  target: { Icon: TrackChanges, label: 'Target' },
  network: { Icon: Hub, label: 'Network' },
  cable: { Icon: Cable, label: 'Wire' },
  solar: { Icon: SolarPower, label: 'Solar panel' },
  wind: { Icon: WindPower, label: 'Wind turbine' },
  sensor: { Icon: Sensors, label: 'Sensor' },
  terminal: { Icon: Terminal, label: 'Terminal' },
  paint: { Icon: Brush, label: 'Paint brush' },
  palette: { Icon: Palette, label: 'Colours' },
  cricket: { Icon: SportsCricket, label: 'Cricket' },
};
export const GRAPHIC_KEYS = Object.keys(GRAPHICS);
export const graphicFor = (k?: string) => (k && GRAPHICS[k] ? GRAPHICS[k] : null);

/** A big illustration: the icon on a soft blob with rings and sparkles, in the theme's colours. */
export function Graphic({ k, t, size = '100%', seed = 0 }: { k?: string; t: DeckTheme; size?: string; seed?: number }) {
  const g = graphicFor(k) ?? GRAPHICS.idea;
  const a = seed % 2 ? t.accent2 : t.accent;
  const b = seed % 2 ? t.accent : t.accent2;
  return (
    <Box sx={{ position: 'relative', width: size, aspectRatio: '1', mx: 'auto' }} aria-hidden>
      <Box component="svg" viewBox="0 0 200 200" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g-${k}-${seed}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
        </defs>
        <path d="M100 14 C150 10 190 46 186 98 C182 150 146 190 96 186 C46 182 10 146 14 96 C18 50 52 18 100 14Z" fill={`url(#g-${k}-${seed})`} opacity="0.16" transform={`rotate(${(seed * 47) % 360} 100 100)`} />
        <circle cx="100" cy="100" r="62" fill={`url(#g-${k}-${seed})`} />
        <circle cx="100" cy="100" r="80" fill="none" stroke={a} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 9" />
        <circle cx="170" cy="46" r="7" fill={b} />
        <circle cx="34" cy="150" r="5" fill={a} opacity="0.7" />
        <path d="M40 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill={b} opacity="0.9" />
        <path d="M160 150 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill={a} opacity="0.8" />
      </Box>
      <Box sx={{ position: 'absolute', inset: '27%', display: 'grid', placeItems: 'center', color: '#fff', '& svg': { width: '100%', height: '100%', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.18))' } }}>
        <g.Icon />
      </Box>
    </Box>
  );
}

/** A small round picture for a point (icons and steps layouts). */
export function IconBadge({ k, t, i = 0, size = '7cqw' }: { k?: string; t: DeckTheme; i?: number; size?: string }) {
  const g = graphicFor(k) ?? GRAPHICS.idea;
  const c = i % 2 ? t.accent2 : t.accent;
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '30%',
        background: `linear-gradient(135deg, ${c}, ${c}CC)`,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        flexShrink: 0,
        boxShadow: `0 0.6cqw 1.4cqw ${c}55`,
        '& svg': { width: '58%', height: '58%' },
      }}
    >
      <g.Icon />
    </Box>
  );
}
