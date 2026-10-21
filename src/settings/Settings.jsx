import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { authenticate, hashPassword } from '../auth/service';
import { deleteAccount } from '../data/storage';
import { deleteFile } from '../data/files';
import { Button, Field, Icon, Modal, PageHeading, Panel } from '../components/UI';

export default function Settings() {
  const { user, db, saveUser, commit, navigate, logout } = useApp();
  const [section, setSection] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function open(value) { setSection(value); setError(''); setMessage(''); }
  async function password(e) {
    e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); setBusy(true); setError('');
    try { await authenticate(db, user.email, values.current); if (values.next !== values.confirm) throw new Error('New passwords do not match.'); if (values.next.length < 8) throw new Error('Use at least 8 characters.'); saveUser({ credentials: await hashPassword(values.next) }); setSection(null); setMessage('Password updated for this local account.'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function remove(e) {
    e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); setBusy(true); setError('');
    try { if (values.confirm !== 'DELETE') throw new Error('Type DELETE to confirm.'); await authenticate(db, user.email, values.password); await Promise.all(user.rulebooks.map(book => deleteFile(book.id))); commit(deleteAccount(db, user.id)); logout(false); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const items = [ ['Account Information', 'user', 'account'], ['Edit Profile', 'user', 'edit'], ['Change Password', 'lock', 'password'], ['Notification Preferences', 'bell', 'notifications'], ['Privacy Settings', 'shield', 'privacy'], ['Help and Support', 'book', 'help'], ['About GameIQ', 'football', 'about'] ];
  return <><PageHeading eyebrow="YOUR ACCOUNT, YOUR CONTROL" title="Settings" /><Panel className="settings-list">{items.map(([title, icon, value]) => <button className="settings-row" key={value} onClick={() => value === 'edit' ? navigate('profile/edit') : open(value)}><Icon name={icon} /><span>{title}</span><Icon name="arrow" size={18} /></button>)}<button className="settings-row" onClick={() => logout()}><Icon name="logout" /><span>Log Out</span><Icon name="arrow" size={18} /></button><button className="settings-row danger-text" onClick={() => open('delete')}><Icon name="user" /><span>Delete Account</span><Icon name="arrow" size={18} /></button></Panel>{message && <p className="success" role="status">{message}</p>}
    {section && <Modal title={items.find(i => i[2] === section)?.[0] || 'Delete Account'} onClose={() => setSection(null)}>
      {section === 'account' && <div className="account-info"><p><b>Name</b><span>{user.firstName} {user.lastName}</span></p><p><b>Username</b><span>@{user.username}</span></p><p><b>Email</b><span>{user.email}</span></p><p className="muted small">This account is saved in this browser. No server is connected.</p></div>}
      {section === 'password' && <form className="app-form" onSubmit={password}><Field label="Current password" name="current" type="password" autoComplete="current-password" required /><Field label="New password" name="next" type="password" autoComplete="new-password" minLength={8} required /><Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required /><Button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Change Password'}</Button></form>}
      {section === 'notifications' && <><p className="muted">Save your preferences for future notification integration. Push and email delivery are not connected.</p>{[['training', 'Training updates'], ['team', 'Team updates']].map(([key, label]) => <label className="toggle-row" key={key}>{label}<input type="checkbox" checked={user.notifications[key]} onChange={e => saveUser({ notifications: { ...user.notifications, [key]: e.target.checked } })} /></label>)}</>}
      {section === 'privacy' && <><label className="toggle-row">Show training stats to teammates<input type="checkbox" checked={user.privacy.showStats} onChange={e => saveUser({ privacy: { ...user.privacy, showStats: e.target.checked } })} /></label><p className="muted">Turning this off hides your individual XP, and achievements from other local team accounts. Basic team profile details remain visible. Combined team XP still includes your progress.</p><p className="small muted">Local privacy controls are a demonstration. A backend must enforce access to shared data.</p></>}
      {section === 'help' && <><h3>How can we help?</h3><p className="muted">Question-based AI training and rulebook uploads are coming soon. Your profile, team, and previously earned XP remain saved.</p><h3>Accounts and teams</h3><p className="muted">Use a team code with accounts in this browser. Clearing browser storage removes local data; cross-device sync and password recovery are not connected.</p><a className="app-button secondary" href="mailto:hello@gameiq.app?subject=GameIQ%20Support">Email Support</a><p className="small muted">Uses the project’s existing support address; support delivery has not been verified.</p></>}
      {section === 'about' && <><span className="feature-icon"><Icon name="football" size={32} /></span><h3>GameIQ Football · Foundation v1</h3><p className="muted">Train Your Mind. Elevate Your Game.</p><p className="muted">A football training app with question-based AI training planned for a future update. This responsive web foundation runs on iPhone and Android browsers. Native app packaging and secure shared services are future integrations.</p><p className="small muted">Development edition. Local accounts and uploaded PDFs stay on this device.</p></>}
      {section === 'delete' && <form className="app-form" onSubmit={remove}><p className="muted">Permanently remove your local account, training history, and PDFs. Teams you own will be deleted; other members keep their own training progress.</p><Field label="Password" name="password" type="password" autoComplete="current-password" required /><Field label="Type DELETE to confirm" name="confirm" required /><Button className="danger-button" type="submit" disabled={busy}>{busy ? 'Deleting…' : 'Delete Account Permanently'}</Button></form>}
      {error && <p className="error" role="alert">{error}</p>}
    </Modal>}
  </>;
}
