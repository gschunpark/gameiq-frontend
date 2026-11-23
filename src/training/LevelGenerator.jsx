import React, { useEffect, useRef, useState } from 'react';
import { Button, Panel } from '../components/UI';
import FootballLevel from './FootballLevel';
import './levelGenerator.css';

export default function LevelGenerator() {
  const video = useRef(null);
  const canvas = useRef(null);
  const request = useRef(null);
  const [clip, setClip] = useState(null);
  const [question, setQuestion] = useState('');
  const [frame, setFrame] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(null); // index of the level being played
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);
  useEffect(() => () => request.current?.abort(), []);

  function selectClip(file) {
    setReady(false); setFrame(null); setResult(null); setError('');
    if (!file) { setClip(null); return; }
    if (!file.type.startsWith('video/')) { setClip(null); setError('Choose a video file.'); return; }
    setClip({ name: file.name, url: URL.createObjectURL(file) });
  }
  function capture() {
    try {
      const source = video.current;
      if (!source || source.readyState < 2 || source.seeking || !source.videoWidth) throw Error('Wait for this video frame to finish loading.');
      source.pause();
      const ratio = Math.min(1, 1280 / Math.max(source.videoWidth, source.videoHeight));
      canvas.current.width = Math.max(1, Math.round(source.videoWidth * ratio));
      canvas.current.height = Math.max(1, Math.round(source.videoHeight * ratio));
      canvas.current.getContext('2d').drawImage(source, 0, 0, canvas.current.width, canvas.current.height);
      const data = canvas.current.toDataURL('image/jpeg', 0.85);
      setFrame({ image: data.split(',')[1], time: source.currentTime });
      setResult(null); setError('');
    } catch (err) { setError(err.message); }
  }
  async function generate(event) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true); setError(''); setResult(null);
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 230000);
    try {
      const response = await fetch('/api/generate-level', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ ...(frame ? { image: frame.image, mimeType: 'image/jpeg' } : {}), question: question.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw Error(data?.error?.message || 'Generation is unavailable. Check that the API server is running.');
      // Older servers return a single `level`; newer ones return `levels` (several difficulties).
      const levels = (Array.isArray(data?.levels) ? data.levels : [data?.level]).filter(l => l?.plays?.length);
      if (!levels.length || !Array.isArray(data.predictions)) throw Error('The server returned an incomplete level. Please try again.');
      setResult({ levels, predictions: data.predictions }); setFrame(null);
      canvas.current.width = 0; canvas.current.height = 0;
    } catch (err) { if (request.current === controller) setError(err.name === 'AbortError' ? 'Generation timed out. Please try again.' : err.message); }
    finally { clearTimeout(timer); if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  const active = playing !== null && result?.levels[playing];
  if (active) return <FootballLevel key={active.id} level={active} onExit={() => setPlaying(null)} />;
  return <Panel className="level-generator">
    <h2>Ask a question. Train your football IQ.</h2>
    <p className="muted">Tell us the scenario and what you want to improve. AI will build animated practice scenarios. You can optionally add a video and select a frame.</p>
    <p className="muted small">The clip stays on your device. Only your selected frame is sent to Roboflow; detections and your question are sent to OpenAI. Scenarios are hypothetical practice, not a reconstruction of the clip.</p>
    <form onSubmit={generate}>
      <label className="field">Upload a football video (optional)<input type="file" accept="video/*" disabled={busy} onChange={e => selectClip(e.target.files?.[0])} /></label>
      {frame && <Button type="button" secondary disabled={busy} onClick={() => { setFrame(null); setResult(null); }}>Remove selected frame</Button>}
      {clip && <div className="clip-preview"><p className="muted small">{clip.name}</p><video key={clip.url} ref={video} src={clip.url} controls playsInline preload="metadata" onLoadedData={() => setReady(true)} onError={() => { setReady(false); setError('This video format could not be played. Try an MP4 or WebM clip.'); }} />
        <Button type="button" secondary disabled={!ready || busy} onClick={capture}>Use this frame</Button></div>}
      <canvas ref={canvas} className={frame ? 'selected-frame' : 'selected-frame hidden'} aria-label="Selected video frame" />
      {frame && <p role="status" className="muted small">Frame selected at {frame.time.toFixed(2)} seconds. Scrub the clip and select again to change it.</p>}
      <label className="field">Your scenario and question<textarea maxLength={2000} required rows={3} disabled={busy} value={question} placeholder="first, say the scenario that is happening. Then say what you want to fix." onChange={e => { setQuestion(e.target.value); setResult(null); }} /></label>
      <Button type="submit" disabled={!question.trim() || busy}>{busy ? 'Creating your level…' : 'Create my level'}</Button>
      {busy && <p role="status">{frame ? 'Reading the frame and creating practice scenarios.' : 'Creating practice scenarios from your question.'} This may take a few minutes.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {result && <div role="status">
        <h3>{result.levels.length === 1 ? 'Your level is ready' : `Your ${result.levels.length} levels are ready`}</h3>
        {result.predictions.length > 0 && <p className="muted small">{result.predictions.length} objects detected</p>}
        <ol className="generated-levels">{result.levels.map((level, i) => <li key={level.id}>
          <div><strong>Level {i + 1}: {level.title}</strong><p className="muted small">{level.plays.length} practice scenario{level.plays.length === 1 ? '' : 's'}</p></div>
          <Button type="button" onClick={() => setPlaying(i)}>Play level {i + 1}</Button>
        </li>)}</ol>
      </div>}
    </form>
  </Panel>;
}
