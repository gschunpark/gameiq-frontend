import React, { useEffect, useRef, useState } from 'react';
import { AppContext } from './data/AppContext';
import { loadDatabase, saveDatabase, updateUser } from './data/storage';
import AuthScreen, { RoleSetup } from './auth/AuthScreen';
import { BrandMark } from './auth/LegacySignIn';
import Home from './home/Home';
import Training from './training/Training';
import GameScenarios from './scenarios/GameScenarios';
import Teams from './teams/Teams';
import Profile, { EditProfile } from './profiles/Profile';
import Rulebooks from './rulebooks/Rulebooks';
import Settings from './settings/Settings';
import { Avatar, Button, Icon, Modal, Panel } from './components/UI';

function initial() { try { return { db: loadDatabase(), error: null }; } catch (err) { return { db: null, error: err.message }; } }
export default function App() {
  const [loaded] = useState(initial);
  const [db, setDb] = useState(loaded.db);
  const dbRef = useRef(db);
  const [route, setRoute] = useState(location.hash.slice(1) || 'home');
  const [authScreen, setAuthScreen] = useState('welcome');
  const [setup, setSetup] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [storageError, setStorageError] = useState('');
  const user = db?.users.find(u => u.id === db.session);
  const headingRef = useRef(null);
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(1) || 'home');
    const sync = event => { if (event.key === 'gameiq.local.v1') { try { const value = loadDatabase(); dbRef.current = value; setDb(value); } catch (err) { setStorageError(err.message); } } };
    window.addEventListener('hashchange', change); window.addEventListener('storage', sync);
    return () => { window.removeEventListener('hashchange', change); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => { document.title = `${({ home: 'Home', training: 'Training', lesson: 'Lesson', team: 'My Team', profile: 'Profile', rulebooks: 'Rulebooks', scenarios: 'Game Scenarios', settings: 'Settings' })[route.split('/')[0]] || 'GameIQ'} | GameIQ`; window.scrollTo(0, 0); headingRef.current?.focus({ preventScroll: true }); }, [route, user?.id]);
  function commit(next) {
    try { const value = typeof next === 'function' ? next(dbRef.current) : next; saveDatabase(value); dbRef.current = value; setDb(value); setStorageError(''); }
    catch (err) { setStorageError('Your change could not be saved. Browser storage may be full or unavailable. Free space and try again.'); throw err; }
  }
  function saveUser(changes) { commit(current => updateUser(current, current.session, changes)); }
  function navigate(to) { if (location.hash.slice(1) === to) setRoute(to); else location.hash = to; }
  function logout(clear = true) { if (clear) commit(current => ({ ...current, session: null })); setSetup(false); setNotifications(false); setAuthScreen('signin'); navigate('home'); }
  if (!db) return <main className="recovery-screen"><Panel><h1>Saved data needs attention</h1><p className="error">{loaded.error}</p><p>GameIQ has left your saved data untouched. Check that browser storage is allowed and reload.</p><Button onClick={() => location.reload()}>Reload</Button></Panel></main>;
  if (!user) return <><AuthScreen db={db} commit={commit} initialScreen={authScreen} onSignIn={(signedIn, returning) => { navigate('home'); setSetup(returning && !signedIn.onboarded); }} />{storageError && <p role="alert" className="global-error">{storageError}</p>}</>;
  const [page, detail] = route.split('/');
  const active = ['training', 'lesson', 'rulebooks', 'scenarios'].includes(page) ? 'training' : ['profile', 'settings'].includes(page) ? 'profile' : page === 'team' ? 'team' : 'home';
  const tabs = [{ id: 'home', title: 'Home', icon: 'home' }, { id: 'training', title: 'Training', icon: 'football' }, { id: 'team', title: 'My Team', icon: 'team' }, { id: 'profile', title: 'Profile', icon: 'user' }];
  let content;
  if (page === 'training') content = <Training category={detail || 'all'} />;
  else if (page === 'lesson') content = <Training />;
  else if (page === 'scenarios') content = <GameScenarios />;
  else if (page === 'team') content = <Teams mode={detail} />;
  else if (page === 'profile') content = detail === 'edit' ? <EditProfile /> : <Profile />;
  else if (page === 'rulebooks') content = <Rulebooks />;
  else if (page === 'settings') content = <Settings />;
  else content = <Home />;
  return <AppContext.Provider value={{ user, db, commit, saveUser, navigate, logout }}><div className="game-app">
    <aside className="app-sidebar"><div onClick={e => { e.preventDefault(); navigate('home'); }}><BrandMark /></div><span className="sidebar-caption">THE MENTAL SIDE OF FOOTBALL</span><nav aria-label="Main navigation">{tabs.map(tab => <a href={`#${tab.id}`} key={tab.id} className={active === tab.id ? 'active' : ''} aria-current={active === tab.id ? 'page' : undefined}><Icon name={tab.icon} /><span>{tab.title}</span>{active === tab.id && <span className="nav-indicator" />}</a>)}</nav><div className="sidebar-bottom"><div className="sidebar-promo"><Icon name="football" size={30} /><strong>Win the mental game.</strong><p>Learn it here.<br />Take it to the field.</p></div><button className="sidebar-profile" onClick={() => navigate('profile')}><Avatar user={user} /><span><strong>{user.firstName} {user.lastName}</strong><small>@{user.username}</small></span><Icon name="settings" size={18} /></button></div></aside>
    <div className="app-main"><header className="app-topbar"><div className="mobile-logo" onClick={e => { e.preventDefault(); navigate('home'); }}><BrandMark /></div><div className="desktop-top-title"><Icon name="football" size={18} /><span>FOOTBALL IQ, BUILT DAILY.</span></div><div className="row"><span className="dev-pill">LOCAL DEMO</span><button className="icon-button" onClick={() => setNotifications(true)} aria-label="Notifications"><Icon name="bell" /></button><button className="avatar-button" onClick={() => navigate('profile')} aria-label="Open your profile"><Avatar user={user} /></button></div></header>
      <div className="development-bar">Development edition · Saves in this browser · Device sync not connected</div>
      {storageError && <p className="global-error" role="alert">{storageError}</p>}
      <main className="app-content" tabIndex={-1} ref={headingRef} key={`${route}-${user.id}`}>{content}</main>
    </div><nav className="bottom-nav" aria-label="Mobile main navigation">{tabs.map(tab => <a key={tab.id} href={`#${tab.id}`} className={active === tab.id ? 'active' : ''} aria-current={active === tab.id ? 'page' : undefined}><Icon name={tab.icon} /><span>{tab.title}</span></a>)}</nav>
    {setup && <RoleSetup onFinish={(role, mode) => { saveUser({ role, onboarded: true }); setSetup(false); if (mode) navigate(`team/${mode}`); }} />}
    {notifications && <Modal title="Notifications" onClose={() => setNotifications(false)}><p className="muted">You’re all caught up. No new notifications.</p><p className="muted small">Team and training notifications will be available when shared services are connected.</p><Button secondary onClick={() => { setNotifications(false); navigate('settings'); }}>Notification Settings</Button></Modal>}
  </div></AppContext.Provider>;
}
