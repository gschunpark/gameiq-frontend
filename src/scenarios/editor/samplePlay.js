// Field units are yards: x is sideline-to-sideline; y=0 is the attacking goal line.
// The sample is explicitly authored content, not an AI-generated scenario.
const player = (id, x, y, side = 'offense', eligible = true) => ({ id, label: id, x, y, side, eligible });
const assignment = (playerId, kind, label, points) => ({ id: `${playerId}-${kind}`, playerId, kind, label, points: points.map(([x, y]) => ({ x, y })) });

export const samplePlay = {
  schema: 1, id: 'sample-shotgun-trips-right', title: 'Shotgun Trips Right',
  source: 'authored-example', offenseDirection: 'up',
  description: 'An editable 11-on-11 example. Offense attacks toward the top; first-and-ten at its own 40. This is a diagram preview, not a generated question or scored scenario.',
  field: { width: 160 / 3, length: 100, lineOfScrimmage: 60, firstDown: 50, ball: { x: 80 / 3, y: 60 } },
  players: [
    player('WR1', 5, 60), player('LT', 21.3, 60, 'offense', false), player('LG', 24, 60, 'offense', false),
    player('C', 80 / 3, 60, 'offense', false), player('RG', 29.3, 60, 'offense', false), player('RT', 32, 60, 'offense', false),
    player('WR2', 48, 60), player('WR3', 42, 62.5), player('TE', 36, 62.5), player('QB', 80 / 3, 65), player('RB', 31, 66),
    player('DE1', 19.5, 58, 'defense'), player('DT1', 24, 58, 'defense'), player('DT2', 29, 58, 'defense'), player('DE2', 34, 58, 'defense'),
    player('LB1', 21, 53, 'defense'), player('LB2', 30, 53, 'defense'), player('NB', 39, 53, 'defense'),
    player('CB1', 5, 54, 'defense'), player('CB2', 48, 54, 'defense'), player('FS', 18, 42, 'defense'), player('SS', 35, 43, 'defense'),
  ],
  assignments: [
    assignment('WR1', 'route', 'Go', [[5, 60], [5, 36]]),
    assignment('WR2', 'route', 'Post', [[48, 60], [48, 48], [36, 36]]),
    assignment('WR3', 'route', 'Cross', [[42, 62.5], [42, 55], [13, 55]]),
    assignment('TE', 'route', 'Out', [[36, 62.5], [36, 50], [48, 50]]),
    assignment('RB', 'route', 'Swing', [[31, 66], [38, 65], [42, 60]]),
    ...[['LT', 21.3, 60, 19.5, 58], ['LG', 24, 60, 24, 58], ['C', 80 / 3, 60, 27, 58], ['RG', 29.3, 60, 29, 58], ['RT', 32, 60, 34, 58]]
      .map(([id, x, y, tx, ty]) => assignment(id, 'block', 'Pass protection', [[x, y], [tx, ty]])),
    assignment('DE1', 'blitz', 'Edge rush', [[19.5, 58], [19, 62], [24, 65]]),
    assignment('DT1', 'blitz', 'Interior rush', [[24, 58], [24, 63]]),
    assignment('DT2', 'blitz', 'Interior rush', [[29, 58], [29, 63]]),
    assignment('DE2', 'blitz', 'Edge rush', [[34, 58], [35, 62], [30, 65]]),
    assignment('LB1', 'coverage', 'Underneath zone', [[21, 53], [19, 48]]),
    assignment('LB2', 'coverage', 'Underneath zone', [[30, 53], [29, 48]]),
    assignment('NB', 'coverage', 'Flat coverage', [[39, 53], [45, 49]]),
    assignment('CB1', 'coverage', 'Outside coverage', [[5, 54], [7, 46]]),
    assignment('CB2', 'coverage', 'Outside coverage', [[48, 54], [46, 44]]),
    assignment('FS', 'coverage', 'Deep half', [[18, 42], [16, 35]]),
    assignment('SS', 'coverage', 'Deep half', [[35, 43], [37, 35]]),
  ],
};
