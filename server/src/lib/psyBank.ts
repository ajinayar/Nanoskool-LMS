/**
 * Starter content for the psychometric profile ("Know Yourself").
 * The puzzle items (k: 'quiz') and the 'cognitive' dimensions are kept here only for history and stable seed keys:
 * they are now part of Part 3 · Thinking Puzzles (lib/cognitive.ts), not of the Know Yourself forms. Original items written for Nanoskool —
 * not copied from any licensed instrument. They must be piloted and validated with the school's own students
 * (see docs/psychometric-technical-manual.md) before results are used beyond screening.
 */
export type PsyDomain = 'personality' | 'physical' | 'spiritual' | 'cognitive';
export type Stage = 'little' | 'junior' | 'senior';

export interface DimSeed {
  key: string;
  name: string;
  domain: PsyDomain;
  assessedBy: 'quest' | 'observation' | 'both';
  color: string;
  description: string;
  /** What each observation level looks like: 1 Rarely, 2 Sometimes, 3 Usually, 4 Always */
  anchors?: [string, string, string, string];
}

export const PSY_DIMENSIONS: DimSeed[] = [
  { key: 'hygiene', name: 'Personal hygiene', domain: 'personality', assessedBy: 'both', color: '#0EA5E9', description: 'Washes hands, keeps nails, teeth and body clean, covers coughs and sneezes.',
    anchors: ['Often comes with unclean hands or nails; needs reminders every time.', 'Washes hands when reminded; nails or clothes are sometimes unclean.', 'Clean most days; washes hands before lunch without reminders.', 'Always clean and tidy; reminds others to wash hands and cover sneezes.'] },
  { key: 'grooming', name: 'Grooming & appearance', domain: 'personality', assessedBy: 'observation', color: '#6366F1', description: 'Neat hair and uniform, tidy bag and desk, takes care of own things.',
    anchors: ['Uniform, hair or bag are usually untidy; loses own things.', 'Neat on some days; bag and desk need frequent reminders.', 'Neat uniform and hair most days; keeps bag and desk in order.', 'Always well groomed; own things organised and cared for.'] },
  { key: 'etiquette', name: 'Etiquette & manners', domain: 'personality', assessedBy: 'both', color: '#8B5CF6', description: 'Greets, says please/thank you/sorry, waits for a turn, table and classroom manners.',
    anchors: ['Rarely greets or waits for a turn; interrupts often.', 'Polite when reminded; sometimes interrupts or pushes ahead.', 'Greets, says please/thank you and waits for a turn most of the time.', 'Consistently courteous with adults and peers, including visitors and at meals.'] },
  { key: 'confidence', name: 'Social confidence', domain: 'personality', assessedBy: 'both', color: '#EC4899', description: 'Speaks up, joins in, makes friends and handles new situations calmly.',
    anchors: ['Avoids speaking or joining in, even with support.', 'Joins in with encouragement; quiet in new situations.', 'Speaks in class and joins groups without much support.', 'Speaks up readily, welcomes new people and takes the lead at times.'] },
  { key: 'fitness', name: 'Fitness & stamina', domain: 'physical', assessedBy: 'observation', color: '#16A34A', description: 'Keeps going in play and PE, runs, jumps and climbs with energy.',
    anchors: ['Tires very quickly; stops within a few minutes of activity.', 'Keeps going for short spells with rests.', 'Keeps up with most PE activities for the lesson.', 'Plays and runs with energy for the whole session; recovers fast.'] },
  { key: 'motor', name: 'Motor coordination', domain: 'physical', assessedBy: 'observation', color: '#22C55E', description: 'Balance, catching and throwing, and fine control for writing, cutting and drawing.',
    anchors: ['Finds balance, catching or pencil control hard for their age.', 'Manages with effort; some skills below age level.', 'Balance, ball skills and hand control as expected for age.', 'Very well coordinated in both large movements and fine hand work.'] },
  { key: 'healthy', name: 'Healthy habits', domain: 'physical', assessedBy: 'both', color: '#84CC16', description: 'Eats well, drinks water, sleeps on time, limits screens and stays active.',
    anchors: ['Often tired, skips meals or water; few healthy choices seen.', 'Some healthy choices; often seems short of sleep or skips water.', 'Eats lunch, drinks water and seems rested most days.', 'Makes healthy choices on their own and encourages others.'] },
  { key: 'sports', name: 'Sportsmanship & safety', domain: 'physical', assessedBy: 'both', color: '#65A30D', description: 'Plays fair, wins and loses gracefully, follows safety rules.',
    anchors: ['Often argues, cheats or ignores safety rules.', 'Plays fair when supervised; upset by losing.', 'Follows rules and safety; accepts results most of the time.', 'Always fair and safe; congratulates others and supports teammates.'] },
  { key: 'calm', name: 'Inner calm', domain: 'spiritual', assessedBy: 'quest', color: '#F59E0B', description: 'Notices feelings, calms down, can sit quietly and focus (mindfulness).' },
  { key: 'honesty', name: 'Honesty & integrity', domain: 'spiritual', assessedBy: 'both', color: '#F97316', description: 'Tells the truth, keeps promises and does the right thing when no one is watching.',
    anchors: ['Often hides mistakes or blames others.', 'Truthful when asked directly; sometimes hides mistakes.', 'Owns up to mistakes and keeps promises most of the time.', 'Consistently truthful and fair, even when no one is watching.'] },
  { key: 'kindness', name: 'Gratitude & kindness', domain: 'spiritual', assessedBy: 'both', color: '#EF4444', description: 'Says thank you, notices others’ feelings, helps and shares.',
    anchors: ['Rarely shares, helps or notices how others feel.', 'Kind to close friends; helps when asked.', 'Shares, helps and thanks others most of the time.', 'Notices others’ needs and helps without being asked, including children outside their group.'] },
  { key: 'nature', name: 'Care for life & nature', domain: 'spiritual', assessedBy: 'quest', color: '#10B981', description: 'Cares for plants, animals, the environment and shared spaces.' },
  { key: 'observe', name: 'Observation & attention to detail', domain: 'cognitive', assessedBy: 'quest', color: '#0284C7', description: 'Notices small details, differences and changes.' },
  { key: 'pattern', name: 'Pattern spotting', domain: 'cognitive', assessedBy: 'quest', color: '#2563EB', description: 'Finds the rule in shapes, numbers and sequences.' },
  { key: 'logic', name: 'Logical reasoning', domain: 'cognitive', assessedBy: 'quest', color: '#4F46E5', description: 'Reasons step by step from clues to a conclusion.' },
  { key: 'analyse', name: 'Analysing information', domain: 'cognitive', assessedBy: 'quest', color: '#7C3AED', description: 'Reads tables and charts, compares and draws sensible conclusions.' },
];

export const STAGE_GRADES: Record<Stage, number[]> = { little: [1, 2, 3], junior: [4, 5, 6, 7], senior: [8, 9, 10] };
export const SCALES = {
  little: ['Not like me', 'A bit like me', 'Just like me'],
  five: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
};

export type ItemSeed =
  | { k: 'me'; dim: string; text: string; reverse?: boolean; pair?: string }
  | { k: 'sit'; dim: string; text: string; options: [string, number][] }
  | { k: 'quiz'; dim: string; text: string; options: string[]; answer: number }
  | { k: 'lie'; text: string };

const me = (dim: string, text: string, pair?: string, reverse = false): ItemSeed => ({ k: 'me', dim, text, reverse, pair });
const rev = (dim: string, text: string, pair?: string): ItemSeed => me(dim, text, pair, true);
const sit = (dim: string, text: string, options: [string, number][]): ItemSeed => ({ k: 'sit', dim, text, options });
const quiz = (dim: string, text: string, options: string[], answer: number): ItemSeed => ({ k: 'quiz', dim, text, options, answer });
const lie = (text: string): ItemSeed => ({ k: 'lie', text });

/** The child's own form. Grades 1–3 cover fewer areas (young children report less reliably); parents and teachers fill the rest. */
export const SELF_BANK: Record<Stage, ItemSeed[]> = {
  little: [
    me('hygiene', 'I wash my hands with soap before I eat.'),
    me('hygiene', 'I brush my teeth in the morning and at night.'),
    sit('hygiene', 'You sneeze. What do you do?', [['Cover my nose with a tissue or my elbow', 1], ['Sneeze on my friend', 0], ['Wipe my nose on my sleeve', 0.3]]),
    me('etiquette', 'I say “please” and “thank you”.'),
    sit('etiquette', 'Your friend is talking. You want to say something. What do you do?', [['Wait till my friend finishes', 1], ['Talk louder than my friend', 0], ['Walk away', 0.2]]),
    me('etiquette', 'I say “sorry” when I hurt someone by mistake.'),
    me('calm', 'When I am angry, I take deep breaths to calm down.', 'l.calm'),
    rev('calm', 'I shout or hit when I am angry.', 'l.calm'),
    sit('calm', 'Your tower of blocks falls down. What do you do?', [['Take a breath and build it again', 1], ['Kick the blocks', 0], ['Cry and give up', 0.3]]),
    sit('honesty', 'You broke a crayon that belongs to your friend. What do you do?', [['Tell my friend and say sorry', 1], ['Hide it', 0], ['Say someone else did it', 0]]),
    me('honesty', 'I tell the truth even if I did something wrong.'),
    sit('honesty', 'You find a toy in class that is not yours. What do you do?', [['Give it to the teacher', 1], ['Take it home', 0], ['Hide it', 0]]),
    me('kindness', 'I share my things with friends.'),
    me('kindness', 'I help a friend who falls down.'),
    sit('kindness', 'A child is crying alone. What do you do?', [['Ask what is wrong or call a teacher', 1], ['Laugh', 0], ['Walk away', 0.2]]),
    sit('nature', 'You see a plant that looks dry. What do you do?', [['Give it some water', 1], ['Pull its leaves', 0], ['Walk past', 0.3]]),
    me('nature', 'I throw rubbish in the dustbin.'),
    me('nature', 'I am gentle with animals.'),
    quiz('observe', 'Which one is different? 🍎 🍎 🍏 🍎', ['The 1st', 'The 2nd', 'The 3rd', 'The 4th'], 2),
    quiz('observe', 'Which one is different? ⭐ ⭐ ⭐ 🌙 ⭐', ['The 1st', 'The 2nd', 'The 4th', 'The 5th'], 2),
    quiz('observe', 'How many fish? 🐟 🐟 🐢 🐟', ['2', '3', '4'], 1),
    quiz('pattern', 'What comes next? 🔴 🔵 🔴 🔵 🔴 …', ['🔴', '🔵', '🟢', '🟡'], 1),
    quiz('pattern', 'What comes next? 1, 2, 3, 4, …', ['5', '6', '3'], 0),
    quiz('pattern', 'What comes next? 🐱 🐶 🐱 🐶 🐱 …', ['🐱', '🐶', '🐰'], 1),
    quiz('logic', 'Riya is taller than Sam. Sam is taller than Tia. Who is the shortest?', ['Riya', 'Sam', 'Tia'], 2),
    quiz('logic', 'All birds have feathers. A parrot is a bird. Does a parrot have feathers?', ['Yes', 'No'], 0),
    quiz('logic', 'I am round and you kick me in a game. What am I?', ['A ball', 'A box', 'A book'], 0),
    quiz('analyse', 'Ravi has 3 🍌 and Meena has 5 🍌. Who has more?', ['Ravi', 'Meena', 'Same'], 1),
    quiz('analyse', '🍎🍎🍎 and 🍎🍎. How many apples in all?', ['4', '5', '6'], 1),
    quiz('analyse', 'Red: 🟥🟥🟥🟥  Blue: 🟦🟦. Which colour has fewer?', ['Red', 'Blue', 'Same'], 1),
    lie('I have never, ever been angry.'),
    lie('I share every single thing, every single time.'),
  ],
  junior: [
    me('hygiene', 'I brush my teeth twice a day and keep my nails short and clean.'),
    me('hygiene', 'I cover my mouth when I cough or sneeze.'),
    me('hygiene', 'I wash my hands after using the toilet and before eating.'),
    sit('hygiene', 'Your hands are dirty after playing, and lunch is ready. What do you do?', [['Wash them with soap first', 1], ['Wipe them on my clothes', 0.2], ['Just eat', 0]]),
    me('etiquette', 'I greet teachers and visitors politely.'),
    sit('etiquette', 'A guest comes home while you are watching TV. What is the best thing to do?', [['Greet them and turn down the TV', 1], ['Keep watching and ignore them', 0], ['Wave without looking', 0.4]]),
    me('etiquette', 'I speak politely even when I am upset.', 'j.polite'),
    rev('etiquette', 'When I am angry, I say rude words to people.', 'j.polite'),
    me('confidence', 'I can speak in front of the class without too much worry.', 'j.speak'),
    rev('confidence', 'I avoid new games or groups because I feel nervous.', 'j.speak'),
    me('confidence', 'I ask the teacher when I do not understand something.'),
    sit('confidence', 'Your class is choosing someone to lead the assembly. What do you do?', [['Offer to try', 1], ['Help from backstage', 0.6], ['Hide so I am not picked', 0.1]]),
    me('healthy', 'I go to bed on time on school nights.', 'j.sleep'),
    rev('healthy', 'I stay up late watching my phone or TV.', 'j.sleep'),
    rev('healthy', 'I spend more than two hours a day on screens for fun.'),
    me('healthy', 'I eat fruit or vegetables every day.'),
    sit('sports', 'Your team is losing a match because of one player’s mistake. What do you do?', [['Encourage the player and keep going', 1], ['Blame the player loudly', 0], ['Quit the game', 0.2]]),
    me('sports', 'I follow the rules even when the referee is not looking.'),
    me('sports', 'I say “good game” after a match, whether we win or lose.'),
    sit('sports', 'During a game, a friend falls and gets hurt. What do you do?', [['Stop and help or call a teacher', 1], ['Keep playing to win', 0], ['Laugh', 0]]),
    me('calm', 'I can notice when I am getting upset and calm myself down.', 'j.calm'),
    rev('calm', 'Small problems make me lose my temper.', 'j.calm'),
    me('calm', 'I can sit quietly and focus on one thing for a few minutes.'),
    sit('calm', 'You got a low mark in a test. What helps most?', [['Take a breath, see what went wrong and ask for help', 1], ['Tear up the paper', 0], ['Tell myself I am stupid', 0.1]]),
    sit('honesty', 'The shopkeeper gives you ₹10 extra change by mistake. What do you do?', [['Return the extra money', 1], ['Keep it quietly', 0], ['Buy a sweet with it', 0]]),
    me('honesty', 'I keep my promises even when it is hard.'),
    me('honesty', 'I admit my mistakes instead of making excuses.', 'j.admit'),
    rev('honesty', 'I blame others when something goes wrong.', 'j.admit'),
    me('kindness', 'I thank people who help me, even for small things.'),
    sit('kindness', 'A new student is sitting alone at lunch. What do you do?', [['Invite them to sit with us', 1], ['Smile but stay with my friends', 0.4], ['Ignore them', 0]]),
    me('kindness', 'I notice when a friend is sad and try to help.', 'j.care'),
    rev('kindness', 'I make fun of others even when it hurts them.', 'j.care'),
    me('nature', 'I switch off lights and fans when I leave a room.'),
    me('nature', 'I put litter in the dustbin, even when no one is watching.'),
    me('nature', 'I am gentle with animals and insects.'),
    sit('nature', 'You see a tap left running in the school washroom. What do you do?', [['Close it', 1], ['Tell a friend', 0.4], ['Leave it', 0]]),
    quiz('observe', 'Find the odd one out: 6 6 6 9 6 6', ['1st', '3rd', '4th', '6th'], 2),
    quiz('observe', 'Which word is spelt differently? ANALYSE · ANALYSE · ANALSYE · ANALYSE', ['1st', '2nd', '3rd', '4th'], 2),
    quiz('observe', 'Which number appears twice? 4 7 1 9 7 3', ['4', '7', '1', '9'], 1),
    quiz('observe', 'How many times does the letter “e” appear in the word “excellence”?', ['2', '3', '4', '5'], 2),
    quiz('pattern', 'What comes next? 2, 4, 8, 16, …', ['18', '24', '32', '20'], 2),
    quiz('pattern', 'What comes next? A, C, E, G, …', ['H', 'I', 'J', 'K'], 1),
    quiz('pattern', 'What comes next? 5, 10, 15, 20, …', ['22', '25', '30', '24'], 1),
    quiz('pattern', 'What comes next? 1, 4, 9, 16, …', ['20', '25', '24', '36'], 1),
    quiz('logic', 'All roses are flowers. Some flowers are red. Which is surely true?', ['All roses are red', 'Some roses may be red', 'No rose is red', 'All flowers are roses'], 1),
    quiz('logic', 'If today is Wednesday, what day will it be in 10 days?', ['Friday', 'Saturday', 'Sunday', 'Thursday'], 1),
    quiz('logic', 'Amit is older than Bina. Bina is older than Chetan. Who is the youngest?', ['Amit', 'Bina', 'Chetan'], 2),
    quiz('logic', 'All cats have tails. Tom is a cat. What follows?', ['Tom has a tail', 'Tom has no tail', 'Tom is a dog', 'We cannot tell'], 0),
    quiz('analyse', 'Books read — Asha 6, Ben 4, Chen 9, Dia 4. Who read the most?', ['Asha', 'Ben', 'Chen', 'Dia'], 2),
    quiz('analyse', 'Books read — Asha 6, Ben 4, Chen 9, Dia 4. How many books in total?', ['21', '23', '19', '25'], 1),
    quiz('analyse', 'Temperatures — Mon 30°, Tue 32°, Wed 28°, Thu 31°. Which day was the coolest?', ['Mon', 'Tue', 'Wed', 'Thu'], 2),
    quiz('analyse', 'A class has 12 girls and 18 boys. What fraction of the class are girls?', ['12/18', '2/5', '1/2', '3/5'], 1),
    lie('I have never told a lie, not even a small one.'),
    lie('I have never been angry with anyone.'),
    lie('I always do everything my teachers ask, every single time.'),
  ],
  senior: [
    me('hygiene', 'I keep up personal hygiene (bathing, clean clothes, oral care) without being reminded.'),
    me('hygiene', 'I wash my hands before meals and after using the toilet.'),
    me('hygiene', 'I cover my mouth and nose when I cough or sneeze.'),
    sit('hygiene', 'You have a cold but a group project meeting today. What is best?', [['Go but wear a mask, cover coughs and keep some distance — or join online', 1], ['Go and share snacks as usual', 0], ['Skip it without telling anyone', 0.2]]),
    me('etiquette', 'I use respectful language online and offline, even when I disagree.', 's.respect'),
    rev('etiquette', 'When I disagree with someone, I end up being rude.', 's.respect'),
    sit('etiquette', 'In a group chat, classmates start mocking a teacher. What do you do?', [['Say it is not okay and change the topic', 1], ['Stay silent', 0.4], ['Join in with a joke', 0]]),
    me('etiquette', 'I listen without interrupting when others speak.'),
    me('confidence', 'I can share my opinion in a group even if others think differently.', 's.voice'),
    rev('confidence', 'I worry a lot about what others think of me.', 's.voice'),
    me('confidence', 'I introduce myself to new people easily.'),
    sit('confidence', 'You are asked to present your group’s work at short notice. What do you do?', [['Take a minute to plan the key points, then present', 1], ['Ask a teammate to present with me', 0.6], ['Refuse', 0.1]]),
    me('healthy', 'I plan my day so I get enough sleep, exercise and proper meals.', 's.routine'),
    rev('healthy', 'I skip meals or stay up late on my phone.', 's.routine'),
    me('healthy', 'I do at least 30 minutes of physical activity most days.'),
    me('healthy', 'I drink enough water through the day.'),
    sit('sports', 'The referee makes a wrong call in your favour. What do you do?', [['Tell the referee honestly', 1], ['Say nothing and celebrate', 0.2], ['Argue that it was right', 0]]),
    me('sports', 'I accept a loss without blaming others.'),
    me('sports', 'I follow safety rules in labs, on the road and on the field.'),
    sit('sports', 'A teammate is being teased for playing badly. What do you do?', [['Stand up for them and encourage them', 1], ['Stay out of it', 0.3], ['Join the teasing', 0]]),
    me('calm', 'Before an exam or event, I have ways to calm my mind (breathing, a short pause, positive self-talk).', 's.calm'),
    rev('calm', 'When things go wrong I stay upset for a long time.', 's.calm'),
    me('calm', 'I can name what I am feeling (angry, worried, sad) when it happens.'),
    me('calm', 'I take short breaks to reset when I feel stressed.'),
    sit('honesty', 'A friend offers you answers to tomorrow’s test. What do you do?', [['Refuse and tell a teacher about the leak', 1], ['Refuse but say nothing', 0.6], ['Take a quick look', 0]]),
    me('honesty', 'I admit my mistakes instead of making excuses.', 's.admit'),
    rev('honesty', 'I bend the truth to avoid getting into trouble.', 's.admit'),
    me('honesty', 'I keep my word when I promise something.'),
    me('kindness', 'I notice when someone is upset and check on them.', 's.care'),
    rev('kindness', 'I ignore it when someone around me is having a hard time.', 's.care'),
    me('kindness', 'I think about the things I am grateful for.'),
    sit('kindness', 'A classmate is left out of every group. What do you do?', [['Invite them into my group', 1], ['Tell the teacher', 0.6], ['Nothing', 0]]),
    sit('nature', 'Your school wastes a lot of paper. What would you do?', [['Start a reuse and recycle drive', 1], ['Tell a teacher about it', 0.7], ['Nothing — it is not my job', 0]]),
    me('nature', 'I carry a reusable bottle or bag instead of single-use plastic.'),
    me('nature', 'I try to save water and electricity at home and at school.'),
    me('nature', 'I care for plants and animals around me.'),
    quiz('observe', 'A clock shows 3:15. What is the angle between the hands?', ['0°', '7.5°', '15°', '90°'], 1),
    quiz('observe', 'Which pair is exactly the same? (a) 8BN-3X7 / 8BN-3X7  (b) 7QW-81L / 7QW-18L  (c) KL9-0P2 / KL9-OP2', ['(a)', '(b)', '(c)', 'None'], 0),
    quiz('observe', 'How many times does the letter L appear in “PARALLELOGRAM”?', ['2', '3', '4', '5'], 1),
    quiz('observe', 'Which number is NOT made of the digits 1, 5 and 8?', ['851', '518', '188', '815'], 2),
    quiz('pattern', 'What comes next? 1, 1, 2, 3, 5, 8, …', ['11', '12', '13', '15'], 2),
    quiz('pattern', 'What comes next? 3, 9, 27, 81, …', ['162', '243', '108', '324'], 1),
    quiz('pattern', 'What comes next? 2, 6, 12, 20, 30, …', ['40', '42', '36', '44'], 1),
    quiz('pattern', 'What comes next? Z, X, V, T, …', ['S', 'R', 'Q', 'P'], 1),
    quiz('logic', 'Five friends sit in a row. D is at the far left and E at the far right. A is left of B, and C is right of B. Who is in the middle?', ['A', 'B', 'C', 'D'], 1),
    quiz('logic', 'Some Zips are Zaps and all Zaps are Zoos. Which must be true?', ['All Zips are Zoos', 'Some Zips are Zoos', 'No Zip is a Zoo', 'All Zoos are Zips'], 1),
    quiz('logic', 'A is the father of B. B is the sister of C. How is A related to C?', ['Brother', 'Father', 'Uncle', 'Grandfather'], 1),
    quiz('logic', 'If it rains, the match is cancelled. The match was not cancelled. What follows?', ['It rained', 'It did not rain', 'The match was postponed', 'Nothing can be said'], 1),
    quiz('analyse', 'Sales rose from 200 to 250 units. What is the percentage increase?', ['20%', '25%', '50%', '15%'], 1),
    quiz('analyse', 'In a survey of 40 students, 18 prefer cricket, 12 football and 10 other sports. What fraction prefer football?', ['3/10', '1/4', '2/5', '3/8'], 0),
    quiz('analyse', 'Marks: 60, 70, 80, 90. What is the average?', ['70', '75', '80', '72'], 1),
    quiz('analyse', 'A shirt costs ₹800 after a 20% discount. What was the original price?', ['₹960', '₹1,000', '₹1,040', '₹900'], 1),
    lie('I have never told a lie, not even a small one.'),
    lie('I have never been angry with anyone.'),
    lie('I always do everything my teachers ask, every single time.'),
  ],
};

/** The parent's form (home behaviour), one for every grade. Parents answer about their own child. */
export const PARENT_BANK: ItemSeed[] = [
  me('hygiene', 'Washes hands before meals and after the toilet without being reminded.'),
  me('hygiene', 'Brushes teeth twice a day.'),
  me('grooming', 'Keeps hair, nails and clothes neat.'),
  me('grooming', 'Packs and keeps their school bag tidy.'),
  me('etiquette', 'Greets family members and guests politely.'),
  me('etiquette', 'Says please, thank you and sorry at the right times.'),
  me('confidence', 'Speaks up for themselves in new places.'),
  me('confidence', 'Joins in with other children easily.'),
  me('fitness', 'Plays actively for 30 minutes without getting very tired.'),
  me('fitness', 'Enjoys running, cycling, dancing or a sport.'),
  me('motor', 'Has good balance for their age (hops, climbs, rides a cycle).'),
  me('motor', 'Uses their hands skilfully for their age (buttons, laces, scissors, drawing).'),
  me('healthy', 'Goes to sleep on time on school nights.'),
  me('healthy', 'Keeps screen time for fun within the family’s limits.'),
  me('sports', 'Takes winning and losing in games calmly.'),
  me('sports', 'Follows safety rules on the road, near water and at play.'),
  me('calm', 'Calms down within a few minutes after being upset.', 'p.calm'),
  rev('calm', 'Has big outbursts over small things.', 'p.calm'),
  me('honesty', 'Tells the truth even when they might get into trouble.'),
  me('honesty', 'Keeps promises made to the family.'),
  me('kindness', 'Shows care when someone at home is unwell or sad.'),
  me('kindness', 'Shares and takes turns with siblings or friends.'),
  me('nature', 'Cares for plants, pets or animals.'),
  me('nature', 'Avoids wasting water, food and electricity.'),
];

export const INTRO = {
  little: 'Know Yourself! There are no wrong answers for “me” questions — just tell us what you are really like. You can stop and finish another day. 🌈',
  junior: 'Know Yourself: answer honestly about what you usually do. There are no right or wrong answers, and this is not a test for marks.',
  senior: 'Know Yourself profile: answer about what you actually do, not what sounds best. Results guide support — never marks, ranks or streaming.',
  parent: 'Please answer about your child at home over the last month. There are no right or wrong answers; your view helps the school understand and support your child.',
};
