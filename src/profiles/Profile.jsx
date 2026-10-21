import React, { useState } from 'react';
import { useApp } from '../data/AppContext';
import { validateUsername } from '../data/storage';
import { achievements, trainingStats } from '../xp/progress';

import { Avatar, Button, Field, Icon, ImageInput, Panel, PageHeading } from '../components/UI';

export function PlayerProfile({ player, compact = false }) {
  const { user, navigate } = useApp();
  const stats = trainingStats(player, []);
  const visibleAchievements = achievements.filter(a => !a.description.toLowerCase().includes("lesson"));
  const visible = player.id === user.id || player.privacy.showStats;
  return <><Panel className="profile-header"><Avatar user={player} size="large" /><div><p className="app-eyebrow">{player.role === 'coach' ? 'FOOTBALL COACH' : 'FOOTBALL PLAYER'}</p><h1>{player.firstName} {player.lastName}</h1><p className="muted">@{player.username}{player.position ? ` · ${player.position}` : ''}{player.jersey ? ` · #${player.jersey}` : ''}</p>{player.bio && <p className="profile-bio">{player.bio}</p>}</div>{!compact && <div className="stack"><Button secondary onClick={() => navigate('profile/edit')}>Edit Profile</Button><button className="text-button" onClick={() => navigate('settings')}><Icon name="settings" size={16} /> Settings</button></div>}</Panel>
    {visible ? <><Panel className="profile-xp"><div><p className="app-eyebrow">YOUR KNOWLEDGE, EARNED</p><h2>Total XP: <span>{stats.xp.toLocaleString()}</span></h2></div><p className="muted small">Preview stats reset when you reload or log out. New training is coming soon.</p></Panel>
      <div className="section-heading"><h2>Achievements</h2><span className="muted small">{visibleAchievements.filter(a => a.test(stats)).length} / {visibleAchievements.length} unlocked</span></div><div className="achievement-grid">{visibleAchievements.map(a => <div className={`achievement ${a.test(stats) ? 'unlocked' : ''}`} key={a.title}><span><Icon name={a.test(stats) ? 'star' : 'lock'} size={26} /></span><strong>{a.title}</strong><small>{a.description}</small><span className="achievement-state">{a.test(stats) ? 'UNLOCKED' : 'LOCKED'}</span></div>)}</div>

    </> : <Panel><p className="muted">This teammate keeps their training stats and achievements private.</p></Panel>}
  </>;
}
export default function Profile() { const { user } = useApp(); return <PlayerProfile player={user} />; }
export function EditProfile() {
  const { user, db, saveUser, navigate } = useApp();
  const [photo, setPhoto] = useState(user.photo);
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const changes = { firstName: values.firstName.trim(), lastName: values.lastName.trim(), username: values.username.trim(), bio: values.bio.trim(), position: values.position.trim(), jersey: values.jersey };
      if (!changes.firstName || !changes.lastName) throw new Error('First and last name are required.');
      validateUsername(db, changes.username, user.id);
      saveUser({ ...changes, photo }); navigate('profile');
    } catch (err) { setError(err.message); }
  }
  return <><PageHeading eyebrow="MAKE IT YOURS" title="Edit Profile" description="Changes apply during this preview and reset after reload or logout." /><Panel className="form-panel"><form className="app-form" onSubmit={submit}><ImageInput value={photo} onChange={setPhoto} /><div className="form-grid"><Field label="First name" name="firstName" defaultValue={user.firstName} required maxLength={40} /><Field label="Last name" name="lastName" defaultValue={user.lastName} required maxLength={40} /></div><Field label="Username" name="username" defaultValue={user.username} minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" required /><label className="field">Short bio<textarea name="bio" defaultValue={user.bio} maxLength={240} rows={3} /></label><div className="form-grid"><Field label="Football position (optional)" name="position" defaultValue={user.position} maxLength={40} /><Field label="Jersey number (optional)" type="number" name="jersey" defaultValue={user.jersey} min={0} max={99} step={1} /></div>{error && <p className="error" role="alert">{error}</p>}<div className="row wrap"><Button type="submit">Save Changes</Button><Button type="button" secondary onClick={() => navigate('profile')}>Cancel</Button></div></form></Panel></>;
}
