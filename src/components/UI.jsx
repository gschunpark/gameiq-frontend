import React, { useEffect, useRef, useState } from 'react';
import { imageData } from '../data/files';

const paths = {
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  football: 'M5 19c-4-4-1-12 3-15s9-3 12 0 3 9 0 12-11 7-15 3ZM8 16l8-8M9 10l5 5m-2-8 5 5M6 13l5 5',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  user: 'M20 21a8 8 0 0 0-16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  book: 'M12 5v16M3 3c4 0 7 0 9 2 2-2 5-2 9-2v16c-4 0-7 0-9 2-2-2-5-2-9-2Z',
  shield: 'm12 2 9 4v6c0 5-5 9-9 10-4-1-9-5-9-10V6Zm-4 9 3 3 5-5',
  route: 'M4 20V9a4 4 0 0 1 8 0v6a4 4 0 0 0 8 0V3m-4 4 4-4 3 4',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  check: 'm5 12 4 4L20 5',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM10 2h4l1 3 3 1 3 1v4l-2 2 1 3-2 3-3-1-2 3H9l-1-3-3-1-3-1v-4l2-2-1-3 2-3 3 1Z',
  lock: 'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4m-4 5v2',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
  logout: 'M9 3H3v18h6m6-14 5 5-5 5m-7-5h12',
};
export function Icon({ name, size = 22, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.football} /></svg>; }
export function Avatar({ user, size = '', logo }) { const src = logo || user?.photo; return src ? <img className={`avatar ${size}`} src={src} alt={logo ? 'Team logo' : `${user.firstName}'s profile`} /> : <span className={`avatar ${size}`} aria-label={user ? `${user.firstName} ${user.lastName}` : 'Team logo'}>{user ? `${user.firstName[0] || ''}${user.lastName[0] || ''}` : <Icon name="team" />}</span>; }
export function Button({ children, secondary, className = '', icon, ...props }) { return <button className={`app-button ${secondary ? 'secondary' : ''} ${className}`} {...props}>{icon && <Icon name={icon} size={19} />}{children}</button>; }
export function Panel({ children, className = '' }) { return <section className={`app-card ${className}`}>{children}</section>; }
export function PageHeading({ eyebrow, title, description, action }) { return <div className="page-heading"><div>{eyebrow && <p className="app-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div>; }
export function Progress({ value, label = 'Lessons completed' }) { return <div className="app-progress" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>; }
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { dialog.close(); document.body.style.overflow = overflow; }; }, []);
  return <dialog ref={ref} className="app-modal" aria-labelledby="modal-title" onCancel={onClose}><div className="row between"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</dialog>;
}
export function ImageInput({ label = 'Profile picture', value, onChange }) {
  const [error, setError] = useState('');
  return <div className="image-input"><label>{label}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e => { try { const file = e.target.files[0]; if (file) onChange(await imageData(file)); setError(''); } catch (err) { setError(err.message); } e.target.value = ''; }} /></label>{value && <div className="row"><img className="avatar" src={value} alt={`${label} preview`} /><button type="button" className="text-button" onClick={() => onChange('')}>Remove</button></div>}<small className="muted">JPG, PNG, or WebP · Up to 2 MB</small>{error && <p className="error" role="alert">{error}</p>}</div>;
}
export function Field({ label, ...props }) { return <label className="field">{label}<input {...props} /></label>; }
export function Empty({ icon = 'book', title, children }) { return <Panel className="empty-state"><span className="feature-icon"><Icon name={icon} size={30} /></span><h2>{title}</h2>{children}</Panel>; }
export const dateText = date => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
