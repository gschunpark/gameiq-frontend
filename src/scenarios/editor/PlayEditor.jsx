import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button, Field, Icon, Modal, Panel } from '../../components/UI';
import PlayField, { exportPlayPng } from './PlayField';
import { samplePlay } from './samplePlay';
import { alignmentWarnings, applyChanges, changeDescription, clone, historyReducer, initialHistory, newId, scenarioData, upsertChange } from './model';
import { clamp, closestPlayer, crossedAssignments, distance, distanceToSegment } from './geometry';
import { cleanRoute, defenseLabels, interpretDrawing, routeLabels } from './recognition';
import { readVersions, removeVersion, saveVersion } from './versions';
import './editor.css';

const tools = [ ['route', 'Route'], ['movement', 'Movement arrow'], ['move', 'Move player'], ['defense', 'Defense'], ['block', 'Block'], ['cross', 'Cross out'], ['erase', 'Erase change'] ];
const allSelected = changes => changes.map(c => ({ ...c, selected: true }));

// A future generator can pass any supported structured scenario as initialPlay.
export default function PlayEditor({ initialPlay = samplePlay, onClose }) {
  const [original, setOriginal] = useState(() => scenarioData(initialPlay));
  const [working, setWorking] = useState(() => scenarioData(initialPlay));
  const [history, dispatch] = useReducer(historyReducer, undefined, initialHistory);
  const pending = history.present;
  const [mode, setMode] = useState('view');
  const [tool, setTool] = useState('route');
  const [selectedPlayerId, setSelectedPlayerId] = useState('WR1');
  const [draft, setDraft] = useState(null);
  const pointer = useRef(null), fieldRef = useRef(null);
  const [review, setReview] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [previewTab, setPreviewTab] = useState('updated');
  const [acknowledged, setAcknowledged] = useState(false);
  const [versions, setVersions] = useState([]);
  const [libraryError, setLibraryError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [versionName, setVersionName] = useState('');
  const [rootId, setRootId] = useState(initialPlay.id);
  const [parentId, setParentId] = useState(null);
  const [candidateSaved, setCandidateSaved] = useState(false);
  const [leave, setLeave] = useState(null);
  const [position, setPosition] = useState({ x: '', y: '' });
  const [showDefense, setShowDefense] = useState(true);
  const [replaceAssignment, setReplaceAssignment] = useState(true);
  const [exporting, setExporting] = useState(false);
  const drawingPlay = useMemo(() => applyChanges(working, allSelected(pending.filter(c => c.type === 'move-player'))), [working, pending]);
  const proposed = useMemo(() => applyChanges(working, pending), [working, pending]);
  const selectedPlayer = drawingPlay.players.find(p => p.id === selectedPlayerId) || drawingPlay.players[0];
  const selectedCount = pending.filter(c => c.selected).length;
  const warnings = alignmentWarnings(mode === 'preview' ? candidate : proposed);
  const displayPlay = mode === 'preview' ? previewTab === 'original' ? original : candidate : mode === 'edit' ? drawingPlay : working;
  const isDirty = pending.length > 0 || JSON.stringify(working) !== JSON.stringify(original) || (candidate && JSON.stringify(candidate) !== JSON.stringify(original));

  useEffect(() => { try { setVersions(readVersions()); } catch (err) { setLibraryError(err.message); } }, []);
  useEffect(() => { setPosition({ x: selectedPlayer.x.toFixed(1), y: selectedPlayer.y.toFixed(1) }); }, [selectedPlayerId, selectedPlayer.x, selectedPlayer.y]);
  useEffect(() => {
    if (mode !== 'edit') return;
    const keyboard = event => {
      if (event.target.closest?.('input, select, textarea, [contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault(); dispatch({ type: event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo' }); clearPointer();
      }
      if (event.key === 'Escape') clearPointer();
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [mode]);
  function change(value) { dispatch({ type: 'change', value }); setCandidateSaved(false); setMessage(''); setError(''); }
  function queue(next) { change(prev => upsertChange(prev, next)); }
  function clearPointer() { pointer.current = null; setDraft(null); }
  function coordinates(event) {
    const svg = event.currentTarget, matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: clamp(p.x, 0.5, working.field.width - 0.5), y: clamp(p.y, 0.5, 99.5) };
  }
  function pointerDown(event) {
    if (mode !== 'edit' || event.button > 0 || pointer.current) return;
    const point = coordinates(event); if (!point) return;
    event.preventDefault();
    const hit = closestPlayer(point, drawingPlay.players);
    const player = hit || selectedPlayer;
    if (hit && !['cross', 'erase'].includes(tool)) setSelectedPlayerId(hit.id);
    if (!['cross', 'erase', 'move'].includes(tool) && distance(point, player) > 4) { setError('Start the line on the selected player. You can also choose a player above the field.'); return; }
    if (tool === 'route' && player.side === 'defense') { setError('Use Defense to change a defender’s assignment.'); return; }
    if (tool === 'defense' && player.side !== 'defense') { setError('Choose a defender for a defensive assignment.'); return; }
    if (tool === 'block' && player.side !== 'offense') { setError('Choose an offensive player for a blocking assignment.'); return; }
    if (tool === 'move' && !hit && distance(point, player) > 4) { setError('Drag from a player’s starting position, or use the position fields.'); return; }
    const points = ['cross', 'erase'].includes(tool) ? [point] : [{ x: player.x, y: player.y }];
    pointer.current = { pointerId: event.pointerId, tool, playerId: player.id, points };
    setDraft({ ...pointer.current }); setError('');
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    const active = pointer.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const point = coordinates(event); if (!point || distance(point, active.points.at(-1)) < 0.12 || active.points.length >= 500) return;
    active.points.push(point); setDraft({ ...active, points: [...active.points] });
  }
  function eraseAt(points) {
    const matches = pending.map(c => {
      const path = c.rawPoints?.length ? c.rawPoints : c.position ? [c.position] : c.points || [];
      const d = Math.min(...points.flatMap(p => path.map((q, i) => i ? distanceToSegment(p, path[i - 1], q) : distance(p, q))));
      return { id: c.id, d };
    }).sort((a, b) => a.d - b.d);
    if (matches[0]?.d < 2.3) change(prev => prev.filter(c => c.id !== matches[0].id));
    else setMessage('No pending change at that spot. Erase only removes temporary edits; use Cross out to remove a play assignment.');
  }
  function pointerUp(event) {
    const active = pointer.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const point = coordinates(event); if (point && distance(point, active.points.at(-1)) > 0.05) active.points.push(point);
    clearPointer();
    const raw = active.points;
    if (active.tool === 'erase') { eraseAt(raw); return; }
    if (raw.length < 2 || raw.every(p => distance(p, raw[0]) < 0.6)) return;
    const player = drawingPlay.players.find(p => p.id === active.playerId);
    if (active.tool === 'move') { queue({ id: newId(), type: 'move-player', playerId: player.id, position: { x: Number(raw.at(-1).x.toFixed(1)), y: Number(raw.at(-1).y.toFixed(1)) } }); return; }
    if (active.tool === 'cross') {
      const hits = crossedAssignments(raw, drawingPlay.assignments.filter(a => showDefense || !['coverage', 'blitz'].includes(a.kind)));
      if (!hits.length) { setMessage('No assignment was crossed. Draw across a route, or remove an assignment using the list below.'); return; }
      change(prev => hits.reduce((list, route) => upsertChange(list, { id: newId(), type: 'remove-assignment', routeId: route.id, playerId: route.playerId, rawPoints: raw, selected: hits.length === 1 }), prev));
      setMessage(hits.length > 1 ? `${hits.length} assignments were crossed. None are selected automatically; choose the intended removals in Changes Made.` : 'Removal queued. Review it in Changes Made.');
      return;
    }
    const kind = active.tool === 'defense' ? 'coverage' : active.tool;
    const interpretation = interpretDrawing(raw, player, kind, drawingPlay);
    const previous = replaceAssignment && working.assignments.find(a => a.playerId === player.id && (active.tool === 'defense' ? ['coverage', 'blitz'].includes(a.kind) : a.kind === kind));
    const pendingMatch = replaceAssignment && pending.find(c => c.type === 'set-assignment' && c.playerId === player.id && (active.tool === 'defense' ? ['coverage', 'blitz'].includes(c.kind) : c.kind === kind));
    queue({ id: newId(), type: 'set-assignment', playerId: player.id, routeId: previous?.id || pendingMatch?.routeId || `${player.id}-${kind}-${newId()}`, rawPoints: raw, ...interpretation });
    setMessage('Drawing interpreted locally. Open Changes Made to review the proposed path.');
  }
  function correctInterpretation(id, label) {
    change(prev => prev.map(c => {
      if (c.id !== id) return c;
      const player = drawingPlay.players.find(p => p.id === c.playerId);
      return { ...c, label, kind: player.side === 'defense' ? label === 'Blitz' ? 'blitz' : 'coverage' : c.kind, points: cleanRoute(label, c.rawPoints, player, drawingPlay), confidence: 1, explanation: 'Interpretation corrected by you.' };
    }));
  }
  function applySelected() {
    if (!selectedCount) return;
    setCandidate(clone(proposed)); setCandidateSaved(false); setPreviewTab('updated'); setAcknowledged(false); setReview(false); setMode('preview'); setError(''); setMessage(`${selectedCount} selected ${selectedCount === 1 ? 'change' : 'changes'} applied. Raw drawing strokes are hidden.`);
  }
  function keepEditing() {
    if (candidate) {
      setWorking(clone(candidate)); const remaining = pending.filter(c => !c.selected); dispatch({ type: 'reset' }); if (remaining.length) dispatch({ type: 'change', value: remaining });
    }
    setCandidate(null); setMode('edit'); setReview(false); setError(''); setMessage('Continue editing. Any unselected instructions are still pending.');
  }
  function discard() {
    setWorking(clone(original)); setCandidate(null); dispatch({ type: 'reset' }); clearPointer(); setMode('view'); setReview(false); setCandidateSaved(false); setMessage('Original play restored. Previously saved versions are kept.'); setError('');
  }
  function save(originalOnly = false) {
    try {
      const result = saveVersion({ original, updated: candidate || working, rootId, parentId, name: versionName, originalOnly });
      setVersions(result.versions); setLibraryError(''); setError('');
      if (!originalOnly) { setCandidateSaved(true); setParentId(result.saved.id); }
      setMessage(`${result.saved.name} saved on this device. No account details were saved.`);
    } catch (err) { setError(err.message); }
  }
  function reopen(record, compare = false) {
    const action = () => {
      const root = versions.find(v => v.id === record.rootId);
      const base = compare && root ? root.scenario : record.scenario;
      setOriginal(clone(base)); setWorking(clone(record.scenario)); setRootId(record.rootId); setParentId(record.id); setSelectedPlayerId(record.scenario.players.find(p => p.id === 'WR1')?.id || record.scenario.players[0].id);
      setTool('route'); setReplaceAssignment(true);
      dispatch({ type: 'reset' }); clearPointer(); setCandidate(compare ? clone(record.scenario) : null); setCandidateSaved(compare); setPreviewTab(compare ? 'compare' : 'updated'); setAcknowledged(false); setMode(compare ? 'preview' : 'view'); setReview(false); setVersionName(''); setError(''); setMessage(`Opened ${record.name}.`);
    };
    if (pending.some(c => mode === 'preview' && candidateSaved ? !c.selected : true) || (isDirty && !candidateSaved)) setLeave({ action, title: 'Open a saved version?', text: 'Unsaved edits on the current play will be discarded.' }); else action();
  }
  async function exportPng() {
    setExporting(true); setError('');
    try { await exportPlayPng(fieldRef.current, previewTab === 'compare' && candidate ? candidate.title : displayPlay.title); setMessage('PNG prepared for download.'); }
    catch (err) { setError(err.message); } finally { setExporting(false); }
  }
  function close() { if (pending.some(c => mode === 'preview' && candidateSaved ? !c.selected : true) || (isDirty && !candidateSaved)) setLeave({ action: onClose, title: 'Leave the play editor?', text: 'Your unsaved edits will be discarded. Saved versions stay on this device.' }); else onClose(); }

  return <section className="play-editor" aria-label="Football play editor">
    <div className="editor-heading"><div><p className="app-eyebrow">PLAY EDITOR PREVIEW · AUTHORED EXAMPLE</p><h2>{working.title}</h2><p className="muted small">{working.description}</p></div><button className="text-button" onClick={close}><Icon name="back" size={16} /> Back to Game Scenarios</button></div>
    <p className="editor-note">Drawing interpretation runs on this device using geometry, not an AI service. Review suggestions before applying. Saved play versions stay on this browser; account information is never saved.</p>
    <Panel className="editor-workspace">
      <div className="editor-actions">
        {mode === 'view' && <><Button onClick={() => { setMode('edit'); setMessage('Choose a player and a tool, then draw directly on the field.'); }}>Edit Play</Button><Button secondary onClick={() => save(true)}>Save Original Play</Button></>}
        {mode === 'edit' && <><Button onClick={() => setReview(true)}>Changes Made ({pending.length})</Button><Button secondary disabled={!history.past.length} onClick={() => { dispatch({ type: 'undo' }); clearPointer(); }}>Undo</Button><Button secondary disabled={!history.future.length} onClick={() => { dispatch({ type: 'redo' }); clearPointer(); }}>Redo</Button><Button secondary onClick={discard}>Discard Changes</Button></>}
        {mode !== 'edit' && <Button secondary onClick={exportPng} disabled={exporting}>{exporting ? 'Exporting…' : 'Export PNG'}</Button>}
        <label className="editor-visibility"><input type="checkbox" checked={showDefense} onChange={e => setShowDefense(e.target.checked)} /> Defensive arrows</label>
      </div>
      {mode === 'edit' && <>
        <div className="editor-tools" role="group" aria-label="Editing tool">{tools.map(([id, label]) => <button key={id} className={tool === id ? 'active' : ''} aria-pressed={tool === id} onClick={() => { setTool(id); clearPointer(); }}>{label}</button>)}</div>
        <div className="editor-selection"><label className="field">Selected player<select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)}>{drawingPlay.players.map(p => <option value={p.id} key={p.id}>{p.id} · {p.side}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={replaceAssignment} onChange={e => setReplaceAssignment(e.target.checked)} /> Replace this player’s current assignment</label></div>
        <p className="editor-help">{tool === 'move' ? 'Drag a player to a new starting spot, or enter yard coordinates below.' : tool === 'cross' ? 'Draw across an existing arrow. Review every proposed removal before applying.' : tool === 'erase' ? 'Tap or draw over a temporary edit to erase it. Original assignments are protected.' : 'Start at a player and draw the intended path. Lines are temporary until you apply selected changes.'}</p>
      </>}
      {mode === 'preview' && <div className="editor-preview-tabs" role="group" aria-label="Before and after preview">{[['original', 'Original Play'], ['updated', 'Updated Play'], ['compare', 'Compare']].map(([id, label]) => <button key={id} className={previewTab === id ? 'active' : ''} aria-pressed={previewTab === id} onClick={() => setPreviewTab(id)}>{label}</button>)}</div>}
      {mode === 'preview' && previewTab === 'compare' ? <div className="editor-comparison"><figure><figcaption>Original Play</figcaption><PlayField play={original} showDefense={showDefense} title="Original play" /></figure><figure><figcaption>Updated Play</figcaption><PlayField ref={fieldRef} play={candidate} showDefense={showDefense} title="Updated play" /></figure></div> : <div className="editor-field-wrap"><PlayField ref={fieldRef} play={displayPlay} interactive={mode === 'edit'} selectedPlayerId={selectedPlayerId} pending={mode === 'edit' ? pending : []} draft={mode === 'edit' ? draft : null} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={clearPointer} showDefense={showDefense} title={mode === 'preview' ? `${previewTab === 'original' ? 'Original' : 'Updated'} play` : working.title} /></div>}
      <div className="editor-legend"><span><i className="offense-key" /> Offense / routes</span><span><i className="defense-key" /> Defense / assignments</span><span><i className="first-down-key" /> First down / ball</span><span>Attack ↑</span></div>
      {mode === 'edit' && tool === 'move' && <form className="editor-coordinate-form" onSubmit={e => { e.preventDefault(); const x = Number(position.x), y = Number(position.y); if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0.5 || x > working.field.width - .5 || y < .5 || y > 99.5) { setError('Choose an inbounds coordinate.'); return; } queue({ id: newId(), type: 'move-player', playerId: selectedPlayerId, position: { x, y } }); }}><Field label={`${selectedPlayerId} · x (yards from left)`} type="number" step="0.1" min="0.5" max={working.field.width - .5} value={position.x} onChange={e => setPosition({ ...position, x: e.target.value })} required /><Field label="Yard coordinate (0 = attacking goal)" type="number" step="0.1" min="0.5" max="99.5" value={position.y} onChange={e => setPosition({ ...position, y: e.target.value })} required /><Button type="submit" secondary>Queue Move</Button></form>}
      {mode === 'edit' && <details className="editor-assignment-list"><summary>Assignments for {selectedPlayerId}</summary>{working.assignments.filter(a => a.playerId === selectedPlayerId).map(a => <div key={a.id}><span>{a.label}</span><button className="text-button danger-text" onClick={() => queue({ id: newId(), type: 'remove-assignment', playerId: a.playerId, routeId: a.id })}>Queue removal</button></div>)}{!working.assignments.some(a => a.playerId === selectedPlayerId) && <p className="muted small">No current assignment. Draw one with the appropriate tool.</p>}</details>}
      {mode === 'preview' && <div className="editor-save-area"><label className="field">Version name (optional)<input value={versionName} maxLength={120} onChange={e => setVersionName(e.target.value)} placeholder={`${working.title} — Modified Routes`} /></label>{warnings.length > 0 && <label className="checkbox-label"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /> I’ve reviewed the alignment warnings below.</label>}<div className="row wrap"><Button disabled={candidateSaved || (!!warnings.length && !acknowledged)} onClick={() => save(false)}>{candidateSaved ? 'Version Saved' : 'Save Updated Play'}</Button><Button secondary onClick={keepEditing}>Keep Editing</Button><button className="text-button danger-text" onClick={discard}>Discard Changes</button></div></div>}
    </Panel>
    {!!warnings.length && <div className="editor-warnings" role="status"><strong>Check the alignment</strong><ul>{warnings.map(w => <li key={w}>{w}</li>)}</ul><p>These are basic checks for this 11-on-11 example, not a complete rules review. <a href="https://operations.nfl.com/rules-officiating/2026-nfl-rulebook" target="_blank" rel="noreferrer">NFL rule reference ↗</a> · Your league’s adopted rules take precedence.</p></div>}
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="editor-message" role="status">{message}</p>}
    {mode === 'edit' && review && <Modal title="Changes Made" onClose={() => setReview(false)}><p className="muted small">Only checked changes will be applied. Interpretations are local suggestions; correct them below or keep a custom path.</p><div className="editor-review-actions"><button className="text-button" disabled={!pending.length} onClick={() => change(prev => prev.map(c => ({ ...c, selected: true })))}>Select All</button><button className="text-button" disabled={!pending.length} onClick={() => change(prev => prev.map(c => ({ ...c, selected: false })))}>Deselect All</button><button className="text-button danger-text" disabled={!selectedCount} onClick={() => change(prev => prev.filter(c => !c.selected))}>Delete Selected</button></div><div className="editor-change-list">{pending.map(c => <div className="editor-change" key={c.id}><label className="checkbox-label"><input type="checkbox" checked={c.selected} onChange={e => change(prev => prev.map(item => item.id === c.id ? { ...item, selected: e.target.checked } : item))} /><span>{changeDescription(c, working)}</span></label>{c.type === 'set-assignment' && <><p className="muted small">{c.confidence < .75 ? 'Review interpretation: ' : ''}{c.explanation}</p>{['route', 'coverage', 'blitz'].includes(c.kind) && <label className="field">Interpretation for {c.playerId}<select value={c.label} onChange={e => correctInterpretation(c.id, e.target.value)}>{(working.players.find(p => p.id === c.playerId).side === 'defense' ? defenseLabels : routeLabels).map(label => <option key={label}>{label}</option>)}</select></label>}<PlayField play={applyChanges(working, [{ ...c, selected: true }])} showDefense={false} thumbnail title={`Proposed ${c.playerId} change`} /></>}<button className="text-button danger-text" onClick={() => change(prev => prev.filter(item => item.id !== c.id))}>Delete change for {c.playerId}</button></div>)}{!pending.length && <p className="muted">No pending changes. Close this list and draw on the field.</p>}</div><Button disabled={!selectedCount} onClick={applySelected}>Apply Selected Changes ({selectedCount})</Button></Modal>}
    <section className="editor-versions"><div className="section-heading"><h2>Saved play versions</h2><span className="muted small">{versions.length} on this device</span></div>{libraryError && <p className="error" role="alert">{libraryError}</p>}{!versions.length && <p className="muted small">Save an original or updated play to reopen it here later. Versions contain diagram data only, never account details.</p>}<div className="editor-version-grid">{versions.map(record => <Panel key={record.id} className="editor-version-card"><p className="app-eyebrow">{record.original ? 'ORIGINAL' : 'SAVED VERSION'}</p><h3>{record.name}</h3><PlayField play={record.scenario} showDefense={false} thumbnail title={record.name} /><p className="muted small">{new Date(record.savedAt).toLocaleString()}</p><div className="row wrap"><button className="text-button" onClick={() => reopen(record)}>Open Version</button><button className="text-button danger-text" onClick={() => setLeave({ title: "Delete saved version?", confirmLabel: "Delete Version", cancelLabel: "Cancel", text: "Only this saved copy will be removed. The diagram currently open in the editor is kept.", action: () => { try { setVersions(removeVersion(record.id)); setMessage("Saved version removed."); } catch (err) { setError(err.message); } } })}>Delete Version</button>{!record.original && <button className="text-button" onClick={() => reopen(record, true)}>Compare to Original</button>}</div></Panel>)}</div></section>
    {leave && <Modal title={leave.title} onClose={() => setLeave(null)}><p className="muted">{leave.text}</p><div className="row wrap"><Button secondary onClick={() => setLeave(null)}>{leave.cancelLabel || "Keep Editing"}</Button><Button onClick={() => { leave.action(); setLeave(null); }}>{leave.confirmLabel || "Discard and Continue"}</Button></div></Modal>}
  </section>;
}
