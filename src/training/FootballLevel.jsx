import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../data/AppContext';
import { Button, Panel, PageHeading, Progress } from '../components/UI';
import { advancePlay, answerPlay, dummyLevel, finishDummyLevel, initialRun, plays, pointOnRoute } from './dummyLevel';
import './footballLevel.css';

const DURATION = 4600;
const clamp = n => Math.max(0, Math.min(1, n));
export function FieldAnimation({ play, decision, progress, explain }) {
  const t = clamp(progress);
  const target = decision || play.target;
  const wrong = explain && target !== play.target;
  const playerTime = clamp(t / 0.75);
  const positions = Object.fromEntries(play.players.map(p => [p.id, pointOnRoute(p.points, playerTime)]));
  if (play.run && target !== 'runLeft') {
    const end = target === 'runRight' ? [425, 322] : target === 'runMiddle' ? [290, 310] : [280, 400];
    positions.RB = pointOnRoute([[250, 415], [285, 380], end], playerTime);
  }
  if (target === 'retreat') positions.QB = [250, 408 + 85 * t];
  const qb = positions.QB;
  let ball;
  if (play.run) {
    ball = t < 0.2 ? pointOnRoute([qb, positions.RB], t / 0.2) : positions.RB;
  } else if (target === 'hold' || target === 'retreat') ball = qb;
  else {
    const receiver = positions[target] || positions[play.target];
    ball = pointOnRoute([qb, receiver], clamp((t - 0.4) / 0.28));
  }
  // Once an unsafe decision develops, nearby defenders close on the ball.
  if (wrong && t > 0.7) {
    const defenders = play.players.filter(p => p.side === 'defense').sort((a, b) => Math.hypot(positions[a.id][0] - ball[0], positions[a.id][1] - ball[1]) - Math.hypot(positions[b.id][0] - ball[0], positions[b.id][1] - ball[1])).slice(0, 2);
    for (const defender of defenders) positions[defender.id] = pointOnRoute([positions[defender.id], [ball[0] + (defender.id === defenders[0].id ? -12 : 12), ball[1] - 12]], (t - 0.7) / 0.3);
  }
  return <svg className="football-demo-field" viewBox="0 0 500 550" role="img" aria-label={`${play.title}: animated overhead view. ${wrong ? 'Selected incorrect decision' : explain ? 'Correct decision' : 'Watch the play'}. Blue offense attacks toward the top; red defense.`}>
    <rect width="500" height="550" rx="10" fill="#f2f7fc" />
    {Array.from({ length: 11 }, (_, i) => <g key={i}><path d={`M25 ${25 + i * 50}H475`} stroke="#bfcede" strokeWidth={i % 2 ? 1 : 2} />{i % 2 === 0 && <><text x="32" y={20 + i * 50} className="demo-yard">{50 - i * 5}</text><text x="448" y={20 + i * 50} className="demo-yard">{50 - i * 5}</text></>}<path d={`M205 ${25 + i * 50}h9 M286 ${25 + i * 50}h9`} stroke="#a3b5ca" /></g>)}
    <path d="M25 350H475" stroke="#2365c7" strokeWidth="3" opacity=".6" />
    <path d={`M25 ${play.sticks ? 300 : 250}H475`} stroke="#e8b521" strokeWidth="3" />
    <text x="30" y="542" className="demo-yard">OFFENSE ↑ · BLUE / DEFENSE · RED</text>
    {play.players.filter(p => p.side === 'offense' && !['LT', 'LG', 'C', 'RG', 'RT'].includes(p.id)).map(p => <polyline key={p.id} points={p.points.map(pt => pt.join(',')).join(' ')} fill="none" stroke={explain && play.highlights.includes(p.id) ? '#d69a00' : '#2467c9'} strokeWidth={explain && play.highlights.includes(p.id) ? 4 : 2} strokeDasharray="6 6" opacity={explain ? 0.85 : 0.4} />)}
    {play.players.map(p => <g key={p.id} transform={`translate(${positions[p.id].join(' ')})`}>
      {explain && play.highlights.includes(p.id) && <circle r="20" fill="#ffe07d" opacity=".7" />}
      <circle r="13" fill={p.side === 'offense' ? '#2365c7' : '#c43a42'} stroke="white" strokeWidth="2" />
      <text textAnchor="middle" dy="3.5" fill="white" fontSize="9" fontWeight="800">{p.label}</text>
    </g>)}
    <g transform={`translate(${ball[0] + 8} ${ball[1] + 5}) rotate(-30)`}><ellipse rx="8" ry="5" fill="#75401f" stroke="white" strokeWidth="1.5" /><path d="M-4 0H4M-2-2V2M1-2V2" stroke="white" strokeWidth="1" /></g>
  </svg>;
}

function PlayViewer({ play, selected, onWatched }) {
  const hasAnswer = selected !== null;
  const incorrect = hasAnswer && selected !== play.correct;
  const [phase, setPhase] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(true);
  const [replay, setReplay] = useState(0);
  const timeRef = useRef(0);
  const watchedRef = useRef(onWatched);
  watchedRef.current = onWatched;
  useEffect(() => {
    if (!running) return;
    let frame;
    let previous;
    const tick = now => {
      if (previous !== undefined) timeRef.current = Math.min(1, timeRef.current + (now - previous) / DURATION);
      previous = now;
      setTime(timeRef.current);
      if (timeRef.current < 1) frame = requestAnimationFrame(tick);
      else if (incorrect && phase === 0) { setPhase(1); timeRef.current = 0; setTime(0); }
      else { setRunning(false); watchedRef.current(); }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, incorrect, phase, replay]);
  function restart() { timeRef.current = 0; setTime(0); setPhase(0); setReplay(n => n + 1); setRunning(true); }
  const decision = incorrect && phase === 0 ? play.answers[selected][1] : play.target;
  return <div>
    <p className="app-eyebrow" aria-live="polite">{!hasAnswer ? 'WATCH THE PLAY' : incorrect && phase === 0 ? '1 / 2 · YOUR DECISION — WATCH THE DEFENSE CLOSE' : `${incorrect ? '2 / 2 · ' : ''}CORRECT DECISION — FOLLOW THE YELLOW HIGHLIGHTS`}</p>
    <FieldAnimation play={play} decision={decision} progress={time} explain={hasAnswer} />
    <div className="row wrap demo-controls"><Button secondary onClick={restart}>Replay {hasAnswer ? 'explanation' : 'play'}</Button><Button secondary onClick={() => setRunning(v => !v)}>{running ? 'Pause' : 'Play'}</Button></div>
    <label className="demo-timeline">Play timeline<input aria-label="Play timeline" type="range" min="0" max="100" value={Math.round(time * 100)} onChange={e => { const next = Number(e.target.value) / 100; timeRef.current = next; setTime(next); setRunning(false); if (next === 1 && (!incorrect || phase === 1)) watchedRef.current(); }} /></label>
    {incorrect && <div className="row wrap"><button className="text-button" onClick={() => { setPhase(0); timeRef.current = 0; setTime(0); setRunning(true); }}>Watch my decision</button><button className="text-button" onClick={() => { setPhase(1); timeRef.current = 0; setTime(0); setRunning(true); }}>Watch correct decision</button></div>}
  </div>;
}

export default function FootballLevel() {
  const { user, commit, navigate } = useApp();
  const [run, setRun] = useState(initialRun);
  const [watched, setWatched] = useState(false);
  const [explained, setExplained] = useState(false);
  const [earned, setEarned] = useState(0);
  const locked = useRef(false);
  const play = plays[run.index];
  const correct = run.selected === play.correct;
  function choose(index) {
    if (!watched || locked.current || run.selected !== null) return;
    locked.current = true;
    setRun(answerPlay(run, index)); setExplained(false);
  }
  function next() {
    if (!explained) return;
    const nextRun = advancePlay(run);
    if (nextRun.finished) {
      commit(db => {
        const current = db.users.find(u => u.id === db.session);
        const result = finishDummyLevel(current, nextRun);
        setEarned(result.earned);
        return { ...db, users: db.users.map(u => u.id === current.id ? result.user : u) };
      });
    }
    setRun(nextRun); setWatched(false); setExplained(false); locked.current = false;
  }
  if (run.finished) return <><PageHeading eyebrow="READ THE FIELD" title="LEVEL COMPLETE!" /><Panel className="demo-complete"><p className="demo-xp">{earned ? '+50 XP EARNED' : '50 XP ALREADY EARNED'}</p><p className="muted">{earned ? 'Added to your total XP.' : 'Great practice! Replays do not award additional XP.'}</p><dl className="demo-results"><div><dt>Scenarios completed correctly</dt><dd>5/5</dd></div><div><dt>Total incorrect attempts</dt><dd>{run.incorrect}</dd></div><div><dt>Total attempts</dt><dd>{run.attempts}</dd></div><div><dt>Accuracy</dt><dd>{Math.round(5 / run.attempts * 100)}%</dd></div><div><dt>Total XP earned this run</dt><dd>{earned}</dd></div></dl><div className="row wrap"><Button onClick={() => navigate('training')}>Return to Training</Button><Button secondary onClick={() => { setRun(initialRun()); setEarned(0); }}>Replay level</Button></div><p className="muted small">Progress and XP last for this preview session and reset after reload or logout.</p></Panel></>;
  return <div className="football-demo"><PageHeading eyebrow="DUMMY LEVEL · 50 XP ON FIRST COMPLETION" title="Read the Field" description="Five football decisions. Learn from each play and get all five right." action={<Button secondary onClick={() => navigate('training')}>Return to Training</Button>} />
    <Panel><div className="row between wrap"><strong aria-live="polite">Scenarios correct: {run.correct}/5</strong><span className="muted small">Attempts: {run.attempts} · Incorrect: {run.incorrect}</span></div><Progress value={run.correct * 20} label="Scenarios answered correctly" /></Panel>
    <div className="demo-play-grid section-space"><Panel><h2>Play {run.index + 1}: {play.title}</h2><p className="muted small">{play.situation}</p><PlayViewer key={`${run.index}-${run.attempts}-${run.selected}`} play={play} selected={run.selected} onWatched={() => run.selected === null ? setWatched(true) : setExplained(true)} /></Panel>
      <Panel><p className="muted">{play.description}</p><h2>{play.question}</h2><p className="muted small">{watched || run.selected !== null ? 'Choose the best decision for this play.' : 'Watch the play before choosing an answer.'}</p>
        <div className="demo-answers">{play.answers.map(([label], i) => <button key={i} className={`demo-answer ${run.selected !== null && i === play.correct ? 'is-correct' : run.selected === i ? 'is-wrong' : ''}`} disabled={!watched || run.selected !== null} onClick={() => choose(i)}><b>{'ABCD'[i]}</b><span>{label}</span></button>)}</div>
        {run.selected !== null && <div className={`demo-feedback ${correct ? 'correct' : 'incorrect'}`} role="status"><h3>{correct ? 'Correct!' : 'Incorrect.'}</h3><p>{play.answers[run.selected][2]}</p>{!correct && <><strong>The better decision</strong><p>{play.answers[play.correct][2]}</p></>}<p className="muted small">{explained ? 'Explanation complete. Ready for your next step.' : 'Watch the animated explanation to continue.'}</p><Button disabled={!explained} onClick={next}>{correct ? run.correct === 5 ? 'Finish Level' : 'Next Play' : 'Try Again'}</Button></div>}
      </Panel></div>
    {user.completed[dummyLevel.id] && <p className="muted small">Previously completed · Practice replay · No additional XP</p>}
  </div>;
}
