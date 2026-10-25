import React, { useEffect, useRef, useState } from 'react';
import { AppContext } from './data/AppContext';
import { emptyDatabase, updateUser } from './data/storage';
import AuthScreen, { RoleSetup } from './auth/AuthScreen';
import { BrandMark } from './auth/LegacySignIn';
import Home from './home/Home';
import Training from './training/Training';
import GameScenarios from './scenarios/GameScenarios';
import Teams from './teams/Teams';
import Profile, { EditProfile } from './profiles/Profile';
import Rulebooks from './rulebooks/Rulebooks';
import Settings from './settings/Settings';
import { Avatar, Button, Icon, Modal } from './components/UI';

export default function App() {
  const [db, setDb] = useState(emptyDatabase);
  const dbRef = useRef(db);
  const [route, setRoute] = useState(location.hash.slice(1) || 'home');
  const [authScreen, setAuthScreen] = useState('welcome');
  const [setup, setSetup] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const user = db?.users.find(u => u.id === db.session);
  const headingRef = useRef(null);
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(1) || 'home');
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => { document.title = `${({ home: 'Home', training: 'Training', lesson: 'Lesson', team: 'My Team', profile: 'Profile', rulebooks: 'Rulebooks', scenarios: 'Game Scenarios', settings: 'Settings' })[route.split('/')[0]] || 'GameIQ'} | GameIQ`; window.scrollTo(0, 0); headingRef.current?.focus({ preventScroll: true }); }, [route, user?.id]);
  function commit(next) {
    const value = typeof next === 'function' ? next(dbRef.current) : next;
    dbRef.current = value;
    setDb(value);
  }
  function saveUser(changes) { commit(current => updateUser(current, current.session, changes)); }
  function navigate(to) { if (location.hash.slice(1) === to) setRoute(to); else location.hash = to; }
  function logout() { commit(emptyDatabase()); setSetup(false); setNotifications(false); setAuthScreen('signin'); navigate('home'); }
  if (!user) return <AuthScreen initialScreen={authScreen} onSignIn={(signedIn, returning) => { commit({ ...emptyDatabase(), users: [signedIn], session: signedIn.id }); navigate('home'); setSetup(!returning); }} />;
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
      <div className="development-bar">Preview mode · No account required · Profile and team changes reset after reload or logout</div>
      <main className="app-content" tabIndex={-1} ref={headingRef} key={`${route}-${user.id}`}>{content}</main>
    </div><nav className="bottom-nav" aria-label="Mobile main navigation">{tabs.map(tab => <a key={tab.id} href={`#${tab.id}`} className={active === tab.id ? 'active' : ''} aria-current={active === tab.id ? 'page' : undefined}><Icon name={tab.icon} /><span>{tab.title}</span></a>)}</nav>
    {setup && <RoleSetup onFinish={(role, mode) => { saveUser({ role, onboarded: true }); setSetup(false); if (mode) navigate(`team/${mode}`); }} />}
    {notifications && <Modal title="Notifications" onClose={() => setNotifications(false)}><p className="muted">You’re all caught up. No new notifications.</p><p className="muted small">Team and training notifications will be available when shared services are connected.</p><Button secondary onClick={() => { setNotifications(false); navigate('settings'); }}>Notification Settings</Button></Modal>}
  </div></AppContext.Provider>;
}
