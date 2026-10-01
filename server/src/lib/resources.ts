/**
 * Trusted websites and simulations the AI may suggest for "External link" and "3D simulation" sections.
 * The AI only ever picks an id from this list, so it can never invent a broken or unsafe link.
 * Add to the list as the team finds good resources.
 */
export interface Resource {
  id: string;
  kind: 'link' | 'sim';
  title: string;
  url: string;
  grades: [number, number];
  keywords: string;
  about: string;
}

const phet = (id: string, title: string, grades: [number, number], keywords: string, about: string): Resource => ({
  id: `phet-${id}`,
  kind: 'sim',
  title: `PhET: ${title}`,
  url: `https://phet.colorado.edu/sims/html/${id}/latest/${id}_all.html`,
  grades,
  keywords,
  about,
});

export const RESOURCES: Resource[] = [
  // PhET interactive simulations (University of Colorado Boulder), free and embeddable
  phet('circuit-construction-kit-dc', 'Circuit Construction Kit', [5, 12], 'electricity circuit current battery bulb switch conductor insulator wire series parallel', 'build circuits with batteries, bulbs, switches and wires'),
  phet('ohms-law', "Ohm's Law", [8, 12], 'voltage current resistance ohm electricity', 'see how voltage and resistance change current'),
  phet('resistance-in-a-wire', 'Resistance in a Wire', [8, 12], 'resistance wire length area resistivity electricity', 'change a wire and watch its resistance'),
  phet('balloons-and-static-electricity', 'Balloons and Static Electricity', [3, 10], 'static electricity charge balloon rub attract repel', 'rub a balloon and watch charges move'),
  phet('john-travoltage', 'John Travoltage', [3, 10], 'static electricity charge spark shock', 'build up charge and make a spark'),
  phet('faradays-law', "Faraday's Law", [6, 12], 'magnet magnetic magnetism compass field coil induction electromagnet generator', 'move a magnet through a coil to make electricity'),
  phet('coulombs-law', "Coulomb's Law", [9, 12], 'charge force distance electric', 'measure the force between two charges'),
  phet('build-an-atom', 'Build an Atom', [6, 12], 'atom proton neutron electron element nucleus chemistry', 'build atoms from protons, neutrons and electrons'),
  phet('molecule-shapes', 'Molecule Shapes', [9, 12], 'molecule shape bond chemistry vsepr', 'build molecules in 3D and see their shapes'),
  phet('states-of-matter-basics', 'States of Matter: Basics', [4, 10], 'solid liquid gas states matter heat melting boiling particles', 'heat and cool particles to change state'),
  phet('gas-properties', 'Gas Properties', [8, 12], 'gas pressure temperature volume particles', 'pump gas into a box and watch pressure change'),
  phet('density', 'Density', [5, 10], 'density mass volume float sink', 'find out why objects float or sink'),
  phet('under-pressure', 'Under Pressure', [7, 12], 'pressure fluid water depth', 'explore pressure in water and air'),
  phet('ph-scale-basics', 'pH Scale: Basics', [6, 12], 'acid base ph neutral chemistry', 'test everyday liquids as acids or bases'),
  phet('concentration', 'Concentration', [7, 12], 'solution concentration solute dissolve chemistry', 'dissolve solute and measure concentration'),
  phet('balancing-chemical-equations', 'Balancing Chemical Equations', [8, 12], 'chemical equation reaction balance chemistry', 'balance equations with a visual game'),
  phet('reactants-products-and-leftovers', 'Reactants, Products and Leftovers', [7, 12], 'reaction reactant product chemistry', 'make sandwiches and molecules to see what is used up'),
  phet('forces-and-motion-basics', 'Forces and Motion: Basics', [4, 10], 'force motion push pull friction speed tug of war', 'push, pull and race objects to see forces'),
  phet('friction', 'Friction', [4, 10], 'friction heat rub surface force', 'rub surfaces together and see heat'),
  phet('balancing-act', 'Balancing Act', [4, 10], 'balance lever torque seesaw', 'balance a seesaw with different masses'),
  phet('gravity-and-orbits', 'Gravity and Orbits', [5, 12], 'gravity orbit sun earth moon planet space solar system', 'move the Sun, Earth and Moon and watch orbits'),
  phet('projectile-motion', 'Projectile Motion', [8, 12], 'projectile motion angle launch trajectory', 'launch objects and change the angle'),
  phet('pendulum-lab', 'Pendulum Lab', [6, 12], 'pendulum swing period gravity oscillation', 'swing pendulums and time them'),
  phet('masses-and-springs', 'Masses and Springs', [7, 12], 'spring mass oscillation hooke energy', 'hang masses on springs'),
  phet('hookes-law', "Hooke's Law", [8, 12], 'spring force stretch hooke', 'stretch and compress springs'),
  phet('energy-skate-park-basics', 'Energy Skate Park: Basics', [5, 12], 'energy kinetic potential skate conservation', 'watch energy change as a skater rides a ramp'),
  phet('energy-forms-and-changes', 'Energy Forms and Changes', [5, 10], 'energy forms heat light change transfer', 'follow energy as it changes form'),
  phet('wave-on-a-string', 'Wave on a String', [7, 12], 'wave frequency amplitude string vibration', 'wiggle a string and make waves'),
  phet('color-vision', 'Color Vision', [4, 10], 'color light vision eye rgb', 'mix coloured light and see what the eye sees'),
  phet('bending-light', 'Bending Light', [8, 12], 'light refraction reflection prism lens', 'shine a laser through materials'),
  phet('geometric-optics', 'Geometric Optics', [9, 12], 'lens mirror image optics focal', 'see how lenses form images'),
  phet('greenhouse-effect', 'Greenhouse Effect', [7, 12], 'greenhouse climate carbon atmosphere global warming', 'add greenhouse gases and watch temperature'),
  phet('natural-selection', 'Natural Selection', [8, 12], 'evolution selection genes rabbits environment biology', 'see how traits spread in a rabbit population'),
  phet('fractions-intro', 'Fractions: Intro', [2, 6], 'fraction part whole numerator denominator maths', 'build fractions with shapes'),
  phet('area-builder', 'Area Builder', [3, 7], 'area perimeter shape square maths', 'build shapes and find their area'),
  phet('number-line-integers', 'Number Line: Integers', [5, 8], 'integer negative number line maths', 'place positive and negative numbers'),
  phet('arithmetic', 'Arithmetic', [2, 5], 'multiplication division factor times table maths', 'practise multiplication and factors'),
  phet('equality-explorer', 'Equality Explorer', [6, 9], 'equation equality balance algebra solve', 'balance equations on a scale'),
  phet('graphing-lines', 'Graphing Lines', [8, 12], 'graph line slope intercept linear algebra', 'explore slope and intercept'),
  phet('function-builder', 'Function Builder', [6, 10], 'function input output rule pattern algebra', 'build functions from rules'),
  { id: 'geogebra-3d', kind: 'sim', title: 'GeoGebra 3D Calculator', url: 'https://www.geogebra.org/3d', grades: [7, 12], keywords: '3d shape solid geometry cube cylinder sphere graph maths', about: 'draw and rotate 3D shapes and graphs' },

  // Websites and online tools
  { id: 'scratch', kind: 'link', title: 'Scratch', url: 'https://scratch.mit.edu/', grades: [2, 10], keywords: 'coding programming blocks game animation scratch', about: 'make games and animations with code blocks' },
  { id: 'scratch-jr', kind: 'link', title: 'ScratchJr', url: 'https://www.scratchjr.org/', grades: [1, 3], keywords: 'coding programming young blocks story', about: 'first coding for young children' },
  { id: 'code-org', kind: 'link', title: 'Code.org courses', url: 'https://studio.code.org/courses', grades: [1, 12], keywords: 'coding programming computer science hour of code', about: 'free step-by-step coding courses' },
  { id: 'blockly-games', kind: 'link', title: 'Blockly Games', url: 'https://blockly.games/', grades: [3, 9], keywords: 'coding logic maze puzzle programming', about: 'coding puzzles from mazes to turtle art' },
  {
    id: 'makecode-microbit',
    kind: 'link',
    title: 'micro:bit MakeCode',
    url: 'https://makecode.microbit.org/',
    grades: [4, 12],
    keywords: 'microbit micro:bit coding sensor led electronics',
    about: 'code a micro:bit in the browser, with a simulator',
  },
  {
    id: 'tinkercad-circuits',
    kind: 'link',
    title: 'Tinkercad Circuits',
    url: 'https://www.tinkercad.com/circuits',
    grades: [6, 12],
    keywords: 'arduino circuit electronics breadboard led resistor simulate',
    about: 'build and simulate circuits and Arduino',
  },
  { id: 'tinkercad-3d', kind: 'link', title: 'Tinkercad 3D Design', url: 'https://www.tinkercad.com/', grades: [4, 12], keywords: '3d design model printing cad shapes', about: 'design 3D objects in the browser' },
  { id: 'wokwi', kind: 'link', title: 'Wokwi Arduino & ESP32 simulator', url: 'https://wokwi.com/', grades: [7, 12], keywords: 'arduino esp32 robotics sensor simulator iot electronics', about: 'simulate Arduino and ESP32 projects' },
  { id: 'app-inventor', kind: 'link', title: 'MIT App Inventor', url: 'https://appinventor.mit.edu/', grades: [6, 12], keywords: 'app mobile android blocks programming', about: 'build phone apps with blocks' },
  {
    id: 'teachable-machine',
    kind: 'link',
    title: 'Teachable Machine',
    url: 'https://teachablemachine.withgoogle.com/',
    grades: [5, 12],
    keywords: 'ai artificial intelligence machine learning train model image sound',
    about: 'train a simple AI model with your camera',
  },
  { id: 'quick-draw', kind: 'link', title: 'Quick, Draw!', url: 'https://quickdraw.withgoogle.com/', grades: [2, 10], keywords: 'ai artificial intelligence drawing neural network recognise', about: 'draw and let an AI guess' },
  { id: 'ml-for-kids', kind: 'link', title: 'Machine Learning for Kids', url: 'https://machinelearningforkids.co.uk/', grades: [5, 12], keywords: 'ai machine learning scratch model train', about: 'make AI projects with Scratch' },
  { id: 'pythontutor', kind: 'link', title: 'Python Tutor', url: 'https://pythontutor.com/', grades: [8, 12], keywords: 'python code programming visualise step debug', about: 'watch Python code run step by step' },
  {
    id: 'raspberrypi-projects',
    kind: 'link',
    title: 'Raspberry Pi projects',
    url: 'https://projects.raspberrypi.org/',
    grades: [4, 12],
    keywords: 'projects coding python scratch raspberry pi electronics',
    about: 'free guided coding and making projects',
  },
  { id: 'khan-science', kind: 'link', title: 'Khan Academy Science', url: 'https://www.khanacademy.org/science', grades: [5, 12], keywords: 'science physics chemistry biology videos practice', about: 'free science lessons and practice' },
  { id: 'khan-math', kind: 'link', title: 'Khan Academy Maths', url: 'https://www.khanacademy.org/math', grades: [1, 12], keywords: 'maths math practice numbers algebra geometry', about: 'free maths lessons and practice' },
  { id: 'desmos', kind: 'link', title: 'Desmos Graphing Calculator', url: 'https://www.desmos.com/calculator', grades: [7, 12], keywords: 'graph function algebra maths calculator', about: 'plot graphs and explore functions' },
  { id: 'geogebra', kind: 'link', title: 'GeoGebra Classic', url: 'https://www.geogebra.org/classic', grades: [5, 12], keywords: 'geometry graph construction maths shapes angle', about: 'draw geometry and graphs' },
  { id: 'phet-browse', kind: 'link', title: 'All PhET simulations', url: 'https://phet.colorado.edu/en/simulations/browse', grades: [3, 12], keywords: 'simulation science maths physics chemistry', about: 'browse free science and maths simulations' },
  { id: 'nasa-space-place', kind: 'link', title: 'NASA Space Place', url: 'https://spaceplace.nasa.gov/', grades: [2, 8], keywords: 'space planet sun moon star rocket earth solar system', about: 'space games and facts for kids' },
  { id: 'nasa-eyes', kind: 'link', title: 'NASA Eyes on the Solar System', url: 'https://eyes.nasa.gov/apps/solar-system/', grades: [5, 12], keywords: 'space planet solar system spacecraft 3d orbit', about: 'fly through the solar system in 3D' },
  { id: 'stellarium', kind: 'link', title: 'Stellarium Web', url: 'https://stellarium-web.org/', grades: [4, 12], keywords: 'stars sky constellation planet astronomy night', about: 'see tonight’s sky and constellations' },
  { id: 'natgeo-kids', kind: 'link', title: 'National Geographic Kids', url: 'https://kids.nationalgeographic.com/', grades: [1, 7], keywords: 'animals nature geography science facts', about: 'animals, nature and science for kids' },
  { id: 'ptable', kind: 'link', title: 'Interactive periodic table', url: 'https://ptable.com/', grades: [7, 12], keywords: 'periodic table element atom chemistry', about: 'explore every element' },
  { id: 'chrome-music-lab', kind: 'link', title: 'Chrome Music Lab', url: 'https://musiclab.chromeexperiments.com/', grades: [1, 10], keywords: 'music sound rhythm wave frequency', about: 'play with sound and music' },
  { id: 'diksha', kind: 'link', title: 'DIKSHA', url: 'https://diksha.gov.in/', grades: [1, 12], keywords: 'ncert cbse textbook india curriculum', about: 'national e-content for Indian school subjects' },
  { id: 'ncert-books', kind: 'link', title: 'NCERT textbooks', url: 'https://ncert.nic.in/textbook.php', grades: [1, 12], keywords: 'ncert textbook india cbse book', about: 'free NCERT textbooks' },
  { id: 'arts-culture', kind: 'link', title: 'Google Arts & Culture', url: 'https://artsandculture.google.com/', grades: [3, 12], keywords: 'art history culture museum heritage', about: 'museum collections and virtual tours' },
];

const STOP = new Set(
  'the and for with that this what which how why when where who make made test tests try using use your from into about their them they students student grade class minutes minute simple learn learning unit lesson include including video worksheet activity experiment animation pictures picture slides also will can are was were has have its our let lets find out show shows see day days everyday objects object things thing work works'.split(
    ' ',
  ),
);
const stem = (w: string) =>
  w
    .replace(/(ies)$/, 'y')
    .replace(/(es|s)$/, '')
    .replace(/ing$/, '');
const wordsOf = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);

/** Resources of a kind for a grade, best match on topic words first (whole words, common words ignored). */
export function matchResources(kind: 'link' | 'sim', topic: string, grade?: number, limit = 8): Resource[] {
  const words = [...new Set(wordsOf(topic))];
  return RESOURCES.filter((r) => r.kind === kind && (!grade || (grade >= r.grades[0] - 1 && grade <= r.grades[1] + 1)))
    .map((r) => {
      const keys = new Set(wordsOf(`${r.keywords} ${r.title}`));
      const score = words.reduce((n, w) => n + (keys.has(w) ? 1 : 0), 0);
      return { r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({ ...x.r, score: x.score }) as Resource & { score: number });
}
