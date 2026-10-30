import { completeLesson } from '../xp/progress.js';

export const dummyLevel = { id: 'football-decisions-demo', title: 'Read the Field', xp: 50, sections: Array(5).fill(null) };
// Coordinates describe a 53-yard-wide field segment. Offense attacks upward.
const player = (id, label, side, points) => ({ id, label, side, points });
export function formation(kind) {
  const offense = [
    ...['LT', 'LG', 'C', 'RG', 'RT'].map((label, i) => player(label, label, 'offense', [[190 + i * 30, 350], [190 + i * 30, 327]])),
    player('QB', 'QB', 'offense', [[250, kind === 'under' ? 373 : 408], [250, 438]]),
    player('RB', 'RB', 'offense', [[305, 410], [345, 382], [405, 330]]),
    player('X', 'WR', 'offense', [[65, 350], [65, 245], [120, 145]]),
    player('Z', 'WR', 'offense', [[435, 350], [435, 240], [375, 130]]),
    player('H', 'WR', 'offense', [[125, 370], [150, 300], [235, 270]]),
    player('TE', 'TE', 'offense', [[340, 370], [340, 290], [305, 240]]),
  ];
  const defense = [
    ...[185, 225, 275, 315].map((x, i) => player(`D${i}`, 'DL', 'defense', [[x, 325], [x, 360], [x + 8, 400]])),
    player('MLB', 'LB', 'defense', [[250, 280], [270, 265], [300, 270]]),
    player('LB1', 'LB', 'defense', [[165, 280], [180, 260], [190, 235]]),
    player('LB2', 'LB', 'defense', [[345, 280], [355, 255], [340, 225]]),
    player('CB1', 'CB', 'defense', [[65, 315], [70, 230], [110, 145]]),
    player('CB2', 'CB', 'defense', [[435, 315], [435, 220], [390, 130]]),
    player('S1', 'S', 'defense', [[170, 170], [150, 150], [130, 140]]),
    player('S2', 'S', 'defense', [[330, 170], [350, 160], [365, 145]]),
  ];
  return [...offense, ...defense];
}
function play(config) {
  const players = formation(config.formation);
  for (const [id, points] of Object.entries(config.routes || {})) players.find(p => p.id === id).points = points;
  return { ...config, players };
}
export const plays = [
  play({ id: 'checkdown', title: 'Take the checkdown', formation: 'shotgun', situation: '1st & 10 · Shotgun · Two deep safeties',
    description: 'Your deep receivers are covered. The running back releases into an open right flat, with room for a short gain.',
    question: 'What should the quarterback do?', correct: 1, target: 'RB', highlights: ['RB', 'Z', 'CB2', 'S2'],
    answers: [
      ['Throw to the double-covered deep receiver.', 'Z', 'The corner and safety can close on this throw. The open back is the safer available read.'],
      ['Pass to the open running back.', 'RB', 'The back has space in the flat. Take the available gain instead of forcing a covered deep ball.'],
      ['Hold the ball and wait for the deep receiver.', 'hold', 'Waiting lets the pass rush reach the quarterback while an open outlet is available.'],
      ['Throw directly toward the deep safety.', 'S2', 'Throwing at a defender risks an interception. Find your open teammate instead.'],
    ] }),
  play({ id: 'slant', title: 'Beat the blitz', formation: 'shotgun', situation: '2nd & 6 · Spread · Linebacker blitz',
    description: 'The left linebacker blitzes. Your slot receiver runs the designated quick slant into the space the linebacker leaves.',
    question: 'Which response beats this pressure?', correct: 2, target: 'H', highlights: ['H', 'LB1'],
    routes: { LB1: [[165, 280], [185, 355], [230, 420]], H: [[125, 370], [130, 318], [205, 285]], MLB: [[250, 280], [300, 260], [320, 250]] },
    answers: [
      ['Wait for the long outside route.', 'Z', 'The blitz arrives before the long route develops. Use the quick answer built into this play.'],
      ['Run backward away from the rush.', 'retreat', 'Retreating gives up ground and lets the blitzer pursue. The quick slant is already available.'],
      ['Throw the quick slant into the vacated space.', 'H', 'The blitzer leaves a passing window. A prompt throw to the slot receiver beats the pressure.'],
      ['Throw toward the linebacker who is blitzing.', 'LB1', 'The blitzer is a defender, not a receiver. Throw to the teammate in the space he left.'],
    ] }),
  play({ id: 'flood', title: 'Read the flat defender', formation: 'shotgun', situation: '1st & 10 · Trips right · Flood against zone',
    description: 'Three receivers stretch the right side at different depths. The flat defender follows the short route, leaving the intermediate out open.',
    question: 'Where is the open window?', correct: 0, target: 'TE', highlights: ['TE', 'LB2', 'RB'],
    routes: { H: [[375, 370], [390, 295], [410, 210]], TE: [[340, 370], [340, 260], [425, 235]], LB2: [[345, 280], [390, 315], [410, 330]], Z: [[435, 350], [445, 220], [445, 100]], CB2: [[435, 315], [445, 190], [445, 110]], S2: [[330, 170], [345, 155], [350, 135]] },
    answers: [
      ['Throw the intermediate out to the tight end.', 'TE', 'The flat defender stays short and the corner stays deep. The tight end enters the open middle window.'],
      ['Force the short pass beside the flat defender.', 'RB', 'The defender has followed the back. Use the space behind him rather than the covered short route.'],
      ['Throw deep at the covered outside receiver.', 'Z', 'The corner stays over the deep route. The intermediate out has the clearer window.'],
      ['Hold the ball until the rush arrives.', 'hold', 'An open intermediate window is available now. Waiting allows the rush and coverage to recover.'],
    ] }),
  play({ id: 'cutback', title: 'Find the cutback lane', formation: 'under', situation: '2nd & 4 · Singleback · Outside zone run',
    description: 'You are the running back. The defense flows toward the right edge. Your blockers seal the backside defender, opening a left cutback lane.',
    question: 'Where should the running back go?', correct: 3, target: 'runLeft', highlights: ['RB', 'LT', 'LG', 'LB2'], run: true,
    routes: { RB: [[250, 415], [285, 380], [150, 275]], QB: [[250, 373], [265, 390], [290, 410]], LT: [[190, 350], [175, 320], [150, 305]], LG: [[220, 350], [235, 320], [260, 300]], LB1: [[165, 280], [240, 290], [300, 300]], MLB: [[250, 280], [330, 300], [370, 315]], LB2: [[345, 280], [390, 300], [420, 320]], D0: [[185, 325], [165, 310], [135, 305]], D1: [[225, 325], [260, 310], [295, 310]] },
    answers: [
      ['Keep running toward the crowded right edge.', 'runRight', 'The defense has filled the right edge. The cutback lane offers space behind your blocks.'],
      ['Stop behind the line and wait.', 'hold', 'Stopping lets pursuing defenders close. Use the available lane while the blockers hold it.'],
      ['Run straight into the interior defender.', 'runMiddle', 'The interior defender occupies that path. Read the open lane to the left.'],
      ['Cut left through the open lane behind the blocks.', 'runLeft', 'The defenders flow right while your blockers seal the backside. A decisive cut uses the space they leave.'],
    ] }),
  play({ id: 'sticks', title: 'Know the line to gain', formation: 'shotgun', situation: '3rd & 5 · Spread · Soft zone',
    description: 'The yellow line is five yards ahead. Your slot receiver settles beyond it in a zone window. The running back is open short, but a defender is ready to tackle him.',
    question: 'Which available throw gives the best chance to convert?', correct: 1, target: 'H', highlights: ['H', 'RB', 'LB2'], sticks: true,
    routes: { H: [[125, 370], [150, 265], [220, 265]], MLB: [[250, 280], [300, 230], [310, 210]], LB1: [[165, 280], [130, 220], [125, 205]], RB: [[305, 410], [365, 365], [395, 340]], LB2: [[345, 280], [380, 320], [395, 325]] },
    answers: [
      ['Throw short to the back with a defender waiting.', 'RB', 'The back is short of the line to gain and a defender is ready to tackle. The slot is open beyond the marker.'],
      ['Pass to the slot receiver beyond the yellow line.', 'H', 'The slot settles in an open zone window beyond the line to gain. A timely, accurate pass can earn a first down.'],
      ['Force the ball to the covered deep receiver.', 'Z', 'A deep throw into coverage adds risk when an open receiver is already past the first-down marker.'],
      ['Keep waiting after the slot gets open.', 'hold', 'The zone window may close. Deliver the ball when the receiver is open beyond the marker.'],
    ] }),
];

export function initialRun() { return { index: 0, correct: 0, attempts: 0, incorrect: 0, selected: null, finished: false }; }
export function answerPlay(state, answer) {
  if (state.finished || state.selected !== null || !Number.isInteger(answer) || answer < 0 || answer > 3) return state;
  const correct = answer === plays[state.index].correct;
  return { ...state, selected: answer, correct: state.correct + Number(correct), attempts: state.attempts + 1, incorrect: state.incorrect + Number(!correct) };
}
export function advancePlay(state) {
  if (state.selected === null) return state;
  if (state.selected !== plays[state.index].correct) return { ...state, selected: null };
  if (state.correct === plays.length) return { ...state, finished: true };
  return { ...state, index: state.index + 1, selected: null };
}
export function finishDummyLevel(user, state) {
  if (!state.finished || state.correct !== plays.length) return { user, earned: 0 };
  const result = completeLesson(user, dummyLevel);
  return { ...result, user: { ...result.user, completed: { ...result.user.completed, [dummyLevel.id]: { ...result.user.completed[dummyLevel.id], title: dummyLevel.title, scenarios: 5 } } } };
}

export function pointOnRoute(points, t) {
  const scaled = Math.max(0, Math.min(1, t)) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled));
  const f = scaled - i;
  return points[i].map((v, axis) => v + (points[i + 1][axis] - v) * f);
}
