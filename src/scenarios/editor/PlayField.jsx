import React, { forwardRef, useId } from 'react';
import { smoothPath } from './geometry.js';

export function fieldWindow(play) {
  const points = [...play.players, ...play.assignments.flatMap(a => a.points), play.field.ball];
  const top = Math.max(0, Math.min(28, ...points.map(p => p.y)) - 3);
  const bottom = Math.min(100, Math.max(74, ...points.map(p => p.y)) + 3);
  return { top, bottom, x: -4, y: top - 4, width: play.field.width + 8, height: bottom - top + 9 };
}

// Shared, data-driven SVG schematic. The app's original play diagram uses the
// same vector approach; this renderer adds accurate yard coordinates and identities.
const PlayField = forwardRef(function PlayField({ play, interactive = false, selectedPlayerId, pending = [], draft, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, showDefense = true, title = play.title, thumbnail = false }, ref) {
  const prefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const view = fieldWindow(play);
  const offense = '#2859e8', defense = '#db4656', yellow = '#edbd32';
  const ink = '#344462';
  const colors = { route: offense, movement: offense, coverage: defense, blitz: defense, block: '#a87812' };
  const marker = kind => `${prefix}-${kind}`;
  const rawPath = points => points?.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ') || '';
  const lines = [];
  for (let yard = Math.ceil(view.top); yard <= view.bottom; yard++) lines.push(yard);
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" className={`play-field ${interactive ? 'is-editable' : ''} ${thumbnail ? 'is-thumbnail' : ''}`} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} role="img" aria-label={`${title}. Offense in blue, defense in red. Offense attacks upfield. Blue line of scrimmage and yellow first-down marker.`} style={{ touchAction: interactive ? 'none' : 'auto', fontFamily: 'Arial, sans-serif' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
    <title>{title}</title>
    <defs>{Object.entries(colors).map(([kind, color]) => kind === 'block' ? <marker key={kind} id={marker(kind)} markerWidth="2" markerHeight="2.5" refX="0.2" refY="1.25" orient="auto" markerUnits="userSpaceOnUse"><path d="M .2 .2 V 2.3" fill="none" stroke={color} strokeWidth=".32" /></marker> : <marker key={kind} id={marker(kind)} markerWidth="1.9" markerHeight="1.9" refX="1.5" refY=".95" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 1.65 .95 L 0 1.9" fill="none" stroke={color} strokeWidth=".32" strokeLinejoin="round" /></marker>)}</defs>
    <rect x={view.x} y={view.y} width={view.width} height={view.height} rx="1.2" fill="#ffffff" />
    <rect x="0" y={view.top} width={play.field.width} height={view.bottom - view.top} rx=".25" fill="#fbfcff" stroke="#bac6d9" strokeWidth=".15" />
    {lines.map(yard => yard % 5 === 0 ? <g key={yard}>
      <path d={`M 0 ${yard} H ${play.field.width}`} stroke="#d7dfeb" strokeWidth=".12" />
      {yard % 10 === 0 && <><text x="2" y={yard - .8} fill="#8997ac" fontSize="1.4" fontWeight="600">{Math.min(yard, 100 - yard)}</text><text x={play.field.width - 2} y={yard - .8} textAnchor="end" fill="#8997ac" fontSize="1.4" fontWeight="600">{Math.min(yard, 100 - yard)}</text></>}
    </g> : <g key={yard} stroke="#cbd5e4" strokeWidth=".12">{[23 + 7 / 12, 29.75].map(x => <path key={x} d={`M ${x - .3} ${yard} h .6`} />)}</g>)}
    <path d={`M 0 ${play.field.lineOfScrimmage} H ${play.field.width}`} stroke={offense} strokeWidth=".25" opacity=".7" />
    <path d={`M 0 ${play.field.firstDown} H ${play.field.width}`} stroke={yellow} strokeWidth=".38" strokeDasharray="1 .5" />
    <text x={play.field.width + .8} y={play.field.lineOfScrimmage + .4} fill={offense} fontSize="1" fontWeight="700">LOS</text>
    <text x={play.field.width + .8} y={play.field.firstDown + .4} fill="#88620f" fontSize="1" fontWeight="700">1ST</text>
    <text x={play.field.width / 2} y={view.top - 1.6} fill="#6b7c96" fontSize="1.1" fontWeight="600" textAnchor="middle">OFFENSE ↑ · YARD COORDINATES</text>
    {play.assignments.filter(a => showDefense || !['coverage', 'blitz'].includes(a.kind)).map(a => <path key={a.id} data-assignment-id={a.id} d={smoothPath(a.points)} fill="none" stroke={colors[a.kind]} strokeWidth={a.kind === 'route' ? '.32' : '.23'} strokeOpacity={a.kind === 'route' ? '1' : '.64'} strokeDasharray={a.kind === 'coverage' ? '.8 .6' : undefined} strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${marker(a.kind)})`}><title>{a.playerId}: {a.label}</title></path>)}
    {pending.filter(c => c.type === 'move-player').map(c => <circle key={c.id} cx={c.position.x} cy={c.position.y} r="1.9" stroke={yellow} strokeWidth=".3" strokeDasharray=".5 .35" fill="none" />)}
    {play.players.map(p => <g key={p.id} data-player-id={p.id}>
      {interactive && selectedPlayerId === p.id && <circle cx={p.x} cy={p.y} r="2" fill="#ffce4833" stroke={yellow} strokeWidth=".23" />}
      <circle cx={p.x} cy={p.y} r="1.25" fill={p.side === 'offense' ? offense : '#fff'} stroke={p.side === 'offense' ? '#fff' : defense} strokeWidth=".23" />
      <text x={p.x} y={p.id === 'C' ? p.y + 2.35 : p.y + .35} textAnchor="middle" fill={p.id === 'C' ? ink : p.side === 'offense' ? '#fff' : defense} fontSize=".97" fontWeight="700">{p.label}</text>
      <title>{p.id}: {p.side}, x {p.x.toFixed(1)}, yard {p.y.toFixed(1)}</title>
    </g>)}
    <g transform={`translate(${play.field.ball.x} ${play.field.ball.y})`}><ellipse rx=".75" ry=".42" fill="#ffce48" stroke="#745219" strokeWidth=".12" /><path d="M -.4 0 h .8 M -.2 -.17 v .34 M .1 -.17 v .34" stroke="#745219" strokeWidth=".1" /><title>Football at the snap spot</title></g>
    {pending.filter(c => c.rawPoints?.length).map(c => <path key={c.id} data-raw-stroke="true" d={rawPath(c.rawPoints)} stroke={c.type === 'remove-assignment' ? '#db4656' : '#a36b0e'} strokeWidth=".32" strokeDasharray=".5 .4" strokeOpacity=".8" fill="none" strokeLinecap="round" />)}
    {draft?.points?.length > 0 && <path data-raw-stroke="true" d={rawPath(draft.points)} stroke="#db4656" strokeWidth=".36" fill="none" strokeLinecap="round" />}
    <text x="0" y={view.bottom + 2.3} fill="#8a96a9" fontSize=".9">GAMEIQ · {thumbnail ? 'SAVED PLAY' : 'NFL-STYLE FIELD MARKINGS · NOT TO PLAYER SCALE'}</text>
  </svg>;
});
export default PlayField;

export async function exportPlayPng(svg, fileName) {
  if (!svg) throw new Error('Open a diagram before exporting.');
  const markup = new XMLSerializer().serializeToString(svg);
  const source = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('This browser could not render the PNG.')); image.src = source; });
    const view = svg.viewBox.baseVal;
    const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = Math.round(1800 * view.height / view.width);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PNG export is unavailable.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG export failed.');
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `${fileName.replace(/[^a-z0-9_-]/gi, '-').slice(0, 100) || 'gameiq-play'}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return blob;
  } finally { URL.revokeObjectURL(source); }
}
