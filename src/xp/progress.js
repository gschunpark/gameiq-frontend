export function trainingStats(user, lessons) {
  const completed = lessons.filter(l => user.completed[l.id]);
  return { xp: Object.values(user.completed).reduce((sum, entry) => sum + entry.xp, 0), count: completed.length, remaining: lessons.length - completed.length, percent: lessons.length ? Math.round(completed.length / lessons.length * 100) : 0 };
}
export function completeLesson(user, lesson, now = new Date().toISOString()) {
  const earned = user.completed[lesson.id] ? 0 : lesson.xp;
  return { earned, user: { ...user, completed: { ...user.completed, [lesson.id]: user.completed[lesson.id] || { at: now, xp: lesson.xp } }, progress: { ...user.progress, [lesson.id]: lesson.sections.length - 1 } } };
}
export const achievements = [
  { title: 'First snap', description: 'First lesson completed', test: s => s.count >= 1 },
  { title: 'Finding your rhythm', description: 'Five lessons completed', test: s => s.count >= 5 },
  { title: 'Playbook ready', description: 'Ten lessons completed', test: s => s.count >= 10 },
  { title: 'Mind in the game', description: '500 total XP', test: s => s.xp >= 500 },
  { title: 'Football IQ', description: '1,000 total XP', test: s => s.xp >= 1000 },
];
export function nextLesson(user, lessons) { return lessons.find(l => !user.completed[l.id]); }
