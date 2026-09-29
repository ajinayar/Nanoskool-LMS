#!/usr/bin/env node
/**
 * Adds the demo course "Electricity & Simple Circuits" (Grade 6) to a running Nanoskool API:
 * 2 chapters, 6 units with images and videos, and a quiz. It also grants the course to
 * Green Valley Public School and assigns it to Grade 6 - A with teacher Rahul Menon.
 *
 *   node add-course.mjs                         # uses http://localhost:4000 and the demo admin
 *   API_URL=https://api.example.in ADMIN_EMAIL=... ADMIN_PASSWORD=... node add-course.mjs
 *
 * Safe to re-run: an existing course with the same title is replaced.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '') + '/api';
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@nanoskool.in';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TITLE = 'Electricity & Simple Circuits';

let token = '';
async function call(method, url, body) {
  const r = await fetch(API + url, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${url} → ${r.status} ${data?.error?.message ?? ''}`);
  return data;
}
async function upload(file) {
  const buf = await readFile(path.join(HERE, 'images', file));
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/png' }), file);
  const r = await fetch(`${API}/uploads?folder=content`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form });
  const data = await r.json();
  if (!r.ok) throw new Error(`upload ${file} → ${r.status} ${data?.error?.message ?? ''}`);
  return data.url;
}
const img = (src, alt) => `<p><img src="${src}" alt="${alt}"></p>`;
const yt = (id) => `https://www.youtube.com/watch?v=${id}`;

async function main() {
  const login = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }) });
  if (!login.ok) throw new Error(`Sign-in failed (${login.status}). Is the API running at ${API}?`);
  token = (await login.json()).accessToken;

  // Replace an earlier copy
  const existing = await call('GET', `/courses?q=${encodeURIComponent(TITLE)}&limit=50`);
  for (const c of existing.items.filter((c) => c.title === TITLE)) {
    const classes = await call('GET', `/class-courses?schoolId=${(await findSchool())._id}`).catch(() => []);
    for (const cc of classes.filter((x) => (x.courseId?._id ?? x.courseId) === c._id)) await call('DELETE', `/class-courses/${cc._id}`);
    await call('DELETE', `/courses/${c._id}`);
  }

  console.log('Uploading images…');
  const I = {};
  for (const f of ['thumbnail', 'simple-circuit', 'conductors-insulators', 'circuit-symbols', 'series-parallel', 'torch-activity']) I[f] = await upload(`${f}.png`);

  console.log('Creating course…');
  const course = await call('POST', '/courses', {
    title: TITLE,
    category: 'Science',
    grades: [6],
    level: 'beginner',
    thumbnailUrl: I.thumbnail,
    status: 'draft',
    description:
      '<p>How does a torch light up when you press the switch? In this course students discover what electricity is, which materials let it flow, and how to build and draw their own circuits. It ends with a hands-on torch project.</p><p><strong>You will learn to:</strong></p><ul><li>explain electric current as a flow around a closed loop</li><li>sort materials into conductors and insulators</li><li>name the parts of a circuit and draw them with symbols</li><li>compare series and parallel circuits</li><li>build a working torch safely</li></ul>',
  });

  const ch1 = await call('POST', `/courses/${course._id}/chapters`, { title: 'What is electricity?', description: 'Current, closed loops, and the materials that carry electricity.' });
  const ch2 = await call('POST', `/courses/${course._id}/chapters`, { title: 'Building circuits', description: 'Circuit parts, symbols, series and parallel, and a torch project.' });

  const units = [
    [ch1, {
      title: 'Electricity all around us',
      type: 'video',
      durationMin: 15,
      summary: 'Where we use electricity every day and what makes it flow.',
      videoUrl: yt('HOFp8bHTN30'),
      body: `<h2>Electricity all around us</h2>
<p>Switch on a fan, charge a phone, ring the school bell: each one uses <strong>electricity</strong>. Electricity is the flow of tiny charged particles called <strong>electrons</strong> through a material. This flow is called an <strong>electric current</strong>.</p>
<h3>Where does it come from?</h3>
<ul><li><strong>Cells and batteries</strong> store chemical energy and push current out when connected. Torches, remotes and toys use them.</li>
<li><strong>Power stations</strong> make mains electricity from coal, water, wind or sunlight and send it to our homes through wires.</li>
<li><strong>Solar panels</strong> on rooftops turn sunlight straight into electricity.</li></ul>
<h3>Watch</h3><p>Watch the video above from SciShow Kids, then answer: what must be true for electricity to flow?</p>
<blockquote>Mains electricity at home is very powerful and can kill. In this course we only use small cells of 1.5 V to 3 V.</blockquote>
<h3>Think and talk</h3><ol><li>List five things at home that use batteries and five that plug into the wall.</li><li>Which of your list would still work during a power cut? Why?</li></ol>`,
    }],
    [ch1, {
      title: 'The closed loop',
      type: 'lesson',
      durationMin: 20,
      summary: 'Current only flows when the path is complete.',
      body: `<h2>The closed loop</h2>
<p>Electricity needs a complete path to travel from one end of the battery to the other. We call this path a <strong>circuit</strong>, from the word <em>circle</em>.</p>
${img(I['simple-circuit'], 'A battery, bulb and switch joined in a loop')}
<p>In the picture, current leaves the <strong>+</strong> end of the battery, runs through the wire and the bulb, and returns to the <strong>−</strong> end. The bulb's thin filament gets hot and glows.</p>
<h3>Open and closed</h3>
<ul><li><strong>Closed circuit:</strong> the loop has no gaps, so current flows and the bulb is ON.</li><li><strong>Open circuit:</strong> there is a gap somewhere (a loose wire, or the switch is OFF), so no current flows and the bulb is OFF.</li></ul>
<p>A <strong>switch</strong> is simply a safe way to open and close the gap.</p>
<h3>Check yourself</h3><p>A bulb is not lighting up even though the battery is new. Write down three things you would check.</p>`,
    }],
    [ch1, {
      title: 'Conductors and insulators',
      type: 'video',
      durationMin: 20,
      summary: 'Which materials let current pass, and why wires are covered in plastic.',
      videoUrl: yt('1Cq4v1ZXeRs'),
      body: `<h2>Conductors and insulators</h2>
<p>Some materials let electricity pass through them easily. They are called <strong>conductors</strong>. Most metals are good conductors. Other materials stop the current. They are called <strong>insulators</strong>.</p>
${img(I['conductors-insulators'], 'Table of conductors and insulators')}
<h3>Why are wires covered in plastic?</h3><p>The copper inside a wire carries the current. The plastic coating is an insulator, so the current cannot leak into your hand or into another wire.</p>
<h3>Try it: the conductor tester</h3><ol><li>Build a simple circuit, but leave a gap between two wire ends.</li><li>Touch both ends to an object, like a coin, an eraser or a spoon.</li><li>If the bulb lights, the object is a conductor. Record your results in a table.</li></ol>
<p>Surprise: a pencil's graphite "lead" conducts, and so does salty water!</p>`,
    }],
    [ch2, {
      title: 'Parts of a circuit and their symbols',
      type: 'lesson',
      durationMin: 20,
      summary: 'Cells, wires, bulbs, switches, motors and buzzers, and how to draw them.',
      body: `<h2>Parts of a circuit and their symbols</h2>
<p>Scientists and engineers draw circuits with simple <strong>symbols</strong> instead of pictures. A circuit diagram is quicker to draw and everyone in the world can read it.</p>
${img(I['circuit-symbols'], 'Circuit symbols for cell, bulb, switch, wire, motor and buzzer')}
<table><thead><tr><th>Part</th><th>What it does</th></tr></thead><tbody>
<tr><td>Cell / battery</td><td>Pushes the current around the circuit. The long line is +.</td></tr>
<tr><td>Wire</td><td>Carries the current between parts. Always draw wires as straight lines.</td></tr>
<tr><td>Bulb</td><td>Turns electrical energy into light.</td></tr>
<tr><td>Switch</td><td>Opens or closes the circuit.</td></tr>
<tr><td>Motor</td><td>Turns electrical energy into movement. Robots use many motors!</td></tr>
<tr><td>Buzzer</td><td>Turns electrical energy into sound.</td></tr></tbody></table>
<h3>Practise</h3><p>Draw the circuit diagram of a torch: one cell, one switch and one bulb.</p>`,
    }],
    [ch2, {
      title: 'Series and parallel circuits',
      type: 'video',
      durationMin: 25,
      summary: 'Two ways to connect more than one bulb, and why homes use parallel.',
      videoUrl: yt('Bs-npHUC66M'),
      body: `<h2>Series and parallel circuits</h2>
${img(I['series-parallel'], 'A series circuit and a parallel circuit side by side')}
<h3>Series circuit</h3><ul><li>All parts are joined one after another in a single loop.</li><li>The same current goes through every bulb.</li><li>Adding more bulbs makes each one dimmer.</li><li>If one bulb breaks, the loop is open and <strong>all</strong> bulbs go out.</li></ul>
<h3>Parallel circuit</h3><ul><li>Each bulb has its own branch back to the battery.</li><li>Every bulb stays bright.</li><li>If one bulb breaks, the others <strong>keep working</strong>.</li></ul>
<p>The lights and fans in your home are wired in <strong>parallel</strong>. That is why switching off the kitchen light does not switch off the TV!</p>
<h3>Investigate</h3><p>Build both circuits with two bulbs. Unscrew one bulb in each. Write what happens and explain why.</p>`,
    }],
    [ch2, {
      title: 'Project: build a paper-cup torch',
      type: 'activity',
      durationMin: 40,
      summary: 'Put it all together and build a working torch with a switch.',
      linkUrl: 'https://www.tinkercad.com/circuits',
      body: `<h2>Project: build a paper-cup torch</h2>
<p><strong>You need:</strong> a paper cup, a 3 V coin cell, a small bulb or LED, aluminium foil, tape, and a paper clip.</p>
${img(I['torch-activity'], 'Five steps to build a paper-cup torch')}
<h3>Challenge yourself</h3><ul><li>Draw your torch as a circuit diagram using the right symbols.</li><li>Add a second LED. Will you wire it in series or in parallel? Test both.</li><li>Try the circuit online first: open the activity link to build it in Tinkercad Circuits.</li></ul>
<h3>Share</h3><p>Take a photo of your torch and submit it with a short explanation of how the switch works.</p>`,
    }],
  ];
  for (const [ch, u] of units) await call('POST', `/chapters/${ch._id}/units`, u);

  console.log('Creating quiz…');
  await call('POST', '/quizzes', {
    title: 'Electricity & circuits check',
    description: 'Ten minutes, two tries. Read each question carefully.',
    courseId: course._id,
    status: 'published',
    maxAttempts: 2,
    timeLimitMin: 10,
    questions: [
      { text: 'Electric current is the flow of…', type: 'single', options: ['Water', 'Electrons', 'Air', 'Light'], correct: [1], points: 1, explanation: 'Current is a flow of tiny charged particles called electrons.' },
      { text: 'A bulb only lights when the circuit is…', type: 'single', options: ['Open', 'Closed', 'Wet', 'Hot'], correct: [1], points: 1, explanation: 'Current needs a complete, closed loop.' },
      { text: 'Which of these are conductors? (choose all)', type: 'multiple', options: ['Copper wire', 'Rubber band', 'Steel spoon', 'Wooden ruler'], correct: [0, 2], points: 2, explanation: 'Metals such as copper and steel conduct; rubber and wood insulate.' },
      { text: 'Wires are covered in plastic because plastic is an insulator.', type: 'true_false', options: ['True', 'False'], correct: [0], points: 1, explanation: 'The plastic stops current leaking out of the wire.' },
      { text: 'In a series circuit, one bulb breaks. What happens to the others?', type: 'single', options: ['They get brighter', 'They go out', 'Nothing changes', 'They flash'], correct: [1], points: 1, explanation: 'There is only one path, so the loop is now open.' },
      { text: 'Homes are wired in parallel so that…', type: 'single', options: ['Wires are shorter', 'Each appliance works on its own', 'Electricity is free', 'Bulbs are dimmer'], correct: [1], points: 1, explanation: 'Each branch has its own path back to the supply.' },
    ],
  });

  console.log('Publishing and giving it to the school…');
  await call('PATCH', `/courses/${course._id}`, { status: 'published' });
  const school = await findSchool();
  const partnerId = school.partnerId?._id ?? school.partnerId;
  if (partnerId) await call('POST', '/course-grants', { courseId: course._id, partnerId });
  await call('POST', '/course-grants', { courseId: course._id, schoolId: school._id });
  const classes = await call('GET', `/classes?schoolId=${school._id}`);
  const cls = classes.find((c) => c.grade === 6 && c.section === 'A') ?? classes[0];
  const teachers = await call('GET', `/users?role=teacher&schoolId=${school._id}&limit=50`);
  const teacher = teachers.items.find((t) => t.email === 'teacher@demo.nanoskool.in') ?? teachers.items[0];
  if (cls) await call('POST', '/class-courses', { classId: cls._id, courseId: course._id, teacherId: teacher?._id, startDate: new Date().toISOString() });

  console.log(`\nDone! "${TITLE}" has 2 chapters, 6 units and a quiz.`);
  console.log(`It is assigned to ${cls?.name ?? 'no class'} at ${school.name}${teacher ? `, taught by ${teacher.name}` : ''}.`);
  console.log('Open it at http://localhost:5173 as admin (Course studio) or as student aarav.gvps / Demo@1234.');
}

let schoolCache;
async function findSchool() {
  if (schoolCache) return schoolCache;
  const r = await call('GET', '/schools?limit=50');
  schoolCache = r.items.find((s) => s.code === 'GVPS') ?? r.items[0];
  if (!schoolCache) throw new Error('No school found. Run "npm run seed -- --reset" in the server folder first.');
  return schoolCache;
}

main().catch((e) => {
  console.error('\nCould not add the course:', e.message);
  process.exit(1);
});
