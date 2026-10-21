import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { lessons, ruleSources } from './content';
import { completeLesson, nextLesson, trainingStats } from '../xp/progress';
import { Button, Icon, Panel, PageHeading, Progress } from '../components/UI';

function Diagram({ type }) {
  const labels = type === 'formation' ? ['WR', 'LT', 'LG', 'C', 'RG', 'RT', 'TE', 'WR', 'QB', 'RB'] : ['CB', 'DE', 'DT', 'DT', 'DE', 'LB', 'LB', 'CB', 'S', 'S'];
  const positions = [[28, 85], [100, 85], [136, 85], [172, 85], [208, 85], [244, 85], [280, 85], [322, 85], [172, 135], [211, 175]];
  return <figure className="lesson-diagram"><svg viewBox="0 0 350 210" role="img" aria-label={type === 'downs' ? 'Ball at the 30-yard line, line to gain at the 40-yard line, ten yards ahead' : type === 'coverage' ? 'Illustration of deep coverage areas with defenders beneath' : 'Example shotgun formation with the quarterback behind the center'}>
    <rect x="8" y="8" width="334" height="194" rx="12" fill="#0a1c2b" stroke="#254763" />{[45, 85, 125, 165].map(y => <path key={y} d={`M8 ${y}h334`} stroke="#254763" strokeDasharray="5 5" />)}
    {type === 'downs' ? <><path d="M95 18v174" stroke="#38bdf8" strokeWidth="3" /><path d="M255 18v174" stroke="#fbbf24" strokeWidth="3" /><path d="M112 106h123m-12-10 12 10-12 10" stroke="white" strokeWidth="2" /><text x="95" y="37" textAnchor="middle">30</text><text x="255" y="37" textAnchor="middle">40</text><text x="175" y="146" textAnchor="middle">10 yards to gain</text><circle cx="95" cy="106" r="8" fill="#38bdf8" /></> : <>{type === 'coverage' && <><rect x="20" y="18" width="150" height="50" rx="16" fill="#2563eb44" /><rect x="180" y="18" width="150" height="50" rx="16" fill="#2563eb44" /></>}{positions.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="14" fill={i === 8 ? '#2563eb' : '#102b47'} stroke="#38bdf8" /><text x={x} y={y + 3} textAnchor="middle" fontSize="9">{labels[i]}</text></g>)}</>}
  </svg><figcaption>{type === 'downs' ? 'Example: first-and-ten at the 30. Reach the 40 to earn a new first down.' : type === 'coverage' ? 'Concept illustration only. Exact coverage responsibilities come from your team’s call.' : 'One example alignment, not a required formation. Direction of attack is toward the top.'}</figcaption></figure>;
}
export default function Lesson({ id }) {
  const { user, saveUser, navigate } = useApp();
  const lesson = lessons.find(l => l.id === id);
  const [step, setStep] = useState(() => Math.min(user.progress[id] || 0, lesson?.sections.length - 1 || 0));
  const [answer, setAnswer] = useState(null);
  const [result, setResult] = useState(null);
  if (!lesson) return <Panel><h2>Lesson not found</h2><Button onClick={() => navigate('training')}>Back to Training</Button></Panel>;
  const current = lesson.sections[step];
  const next = nextLesson(user, lessons);
  function move(to) { saveUser({ progress: { ...user.progress, [id]: to } }); setStep(to); }
  function complete() { const done = completeLesson(user, lesson); saveUser({ completed: done.user.completed, progress: done.user.progress }); setResult(done.earned); }
  if (result !== null) return <div className="completion-wrap"><Panel className="completion-card"><span className="completion-icon"><Icon name="check" size={44} /></span><p className="app-eyebrow">ANOTHER REP IN THE BOOKS</p><h1>Lesson Complete!</h1><h2>{lesson.title}</h2><div className="completion-xp">+{result} XP</div><p className="muted">{result ? 'You earned it. Keep that momentum going.' : 'Great review! XP was already earned on your first completion.'}</p><p className="total-line">Total XP <strong>{trainingStats(user, lessons).xp}</strong></p><div className="stack"><Button onClick={() => navigate('training')}>Back to Training</Button>{next && <Button secondary onClick={() => navigate(`lesson/${next.id}`)} icon="arrow">Next Lesson</Button>}</div></Panel></div>;
  return <><button className="text-button back-link" onClick={() => navigate('training')}><Icon name="back" size={16} /> Back to Training</button><PageHeading eyebrow={`${lesson.minutes}-MINUTE LESSON · +${lesson.xp} XP${user.completed[id] ? ' · REVIEW' : ''}`} title={lesson.title} />
    <div className="lesson-layout"><Panel className="lesson-reader"><div className="row between small muted"><span>Section {step + 1} of {lesson.sections.length}</span><span>{Math.round((step + 1) / lesson.sections.length * 100)}%</span></div><Progress value={(step + 1) / lesson.sections.length * 100} label="Lesson progress" /><h2>{current.title}</h2><p className="lesson-text">{current.text}</p>{current.diagram && <Diagram type={current.diagram} />}
      {step === lesson.sections.length - 1 && <div className="knowledge-check"><p className="app-eyebrow">QUICK KNOWLEDGE CHECK</p><h3>{lesson.check.question}</h3><div className="stack">{lesson.check.options.map((option, i) => <button key={option} className={`answer-option ${answer === i ? 'chosen' : ''}`} aria-pressed={answer === i} onClick={() => setAnswer(i)}><span>{String.fromCharCode(65 + i)}</span>{option}{answer === i && i === lesson.check.answer && <Icon name="check" size={18} />}</button>)}</div>{answer !== null && <p className={answer === lesson.check.answer ? 'success' : 'muted'} role="status">{answer === lesson.check.answer ? 'Correct. ' : 'Try again. '}{lesson.check.explanation}</p>}</div>}
      <div className="reader-controls"><Button secondary disabled={step === 0} onClick={() => move(step - 1)} icon="back">Previous</Button>{step < lesson.sections.length - 1 ? <Button onClick={() => move(step + 1)} icon="arrow">Next</Button> : <Button onClick={complete} disabled={answer !== lesson.check.answer} icon="check">Complete Lesson</Button>}</div>
    </Panel><aside><Panel><h3>Know your rulebook</h3><p className="muted small">These lessons teach American tackle football concepts. Youth, high-school, college, and NFL rules differ. Your league’s adopted rulebook controls.</p><div className="source-links">{ruleSources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</div><button className="text-button" onClick={() => navigate('rulebooks')}>Open Rulebooks</button></Panel></aside></div>
  </>;
}
