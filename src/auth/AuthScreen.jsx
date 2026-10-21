import React, { useState } from 'react';
import { BrandMark, PlayDiagram } from './LegacySignIn';
import { authenticate, createAccount } from './service';
import { Button, Field, ImageInput, Icon, Modal } from '../components/UI';

export default function AuthScreen({ db, commit, initialScreen = 'welcome', onSignIn }) {
  const [screen, setScreen] = useState(initialScreen);
  const [show, setShow] = useState(false);
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  function navigate(page) { setScreen(page); setError(''); }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      if (screen === 'signup' && values.password !== values.confirm) throw new Error('Passwords do not match.');
      const user = screen === 'signup' ? await createAccount(db, { ...values, photo }) : await authenticate(db, values.email, values.password);
      commit({ ...db, users: screen === 'signup' ? [...db.users, user] : db.users, session: user.id });
      onSignIn(user, screen === 'signin');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="page-shell auth-shell">
    <section className="story-panel"><div className="story-glow" /><header className="site-header"><BrandMark /><span className="header-note"><span className="live-dot" /> FOOTBALL. UNDERSTOOD.</span></header>
      <div className="story-content"><p className="eyebrow"><span /> A SHARPER MIND. A STRONGER GAME.</p><h1>See the play.<br /><span>Make your move.</span></h1><p className="story-copy">Football IQ isn’t just about knowing the playbook. It’s knowing what to do when the play changes.</p><PlayDiagram /></div>
      <footer className="story-footer"><span>SMARTER REPS. BETTER DECISIONS.</span><span>GAMEIQ FOOTBALL</span></footer>
    </section>
    <section className="login-panel"><div className="login-top"><span>YOUR FOOTBALL JOURNEY</span><span className="dev-pill">LOCAL DEVELOPMENT</span></div>
      <div className="login-content auth-content"><div className="auth-brand"><BrandMark /></div>
        {screen === 'welcome' ? <><p className="form-kicker">WELCOME TO GAMEIQ</p><h2>Train Your Mind.<br /><span>Elevate Your Game.</span></h2><p className="form-subtitle">Learn the game. Build your football IQ. Make every rep count.</p><div className="stack"><Button onClick={() => navigate('signup')} icon="arrow">Get Started</Button><Button secondary onClick={() => navigate('signin')}>Sign In</Button></div></> : <>
          <button className="text-button auth-back" onClick={() => navigate('welcome')}><Icon name="back" size={16} /> Welcome</button><p className="form-kicker">{screen === 'signup' ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK'}</p><h2>{screen === 'signup' ? 'Get in the game.' : 'Let’s get back in the game.'}</h2><p className="form-subtitle">{screen === 'signup' ? 'Create your local GameIQ account.' : 'Sign in to pick up where you left off.'}</p>
          <form className="app-form" onSubmit={submit} key={screen}>
            {screen === 'signup' && <><div className="form-grid"><Field label="First name" name="firstName" autoComplete="given-name" required maxLength={40} /><Field label="Last name" name="lastName" autoComplete="family-name" required maxLength={40} /></div><Field label="Username" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" /></>}
            <Field label="Email" type="email" name="email" autoComplete="email" required maxLength={120} />
            <label className="field">Password<div className="password-field"><input type={show ? 'text' : 'password'} name="password" required minLength={screen === 'signup' ? 8 : undefined} autoComplete={screen === 'signup' ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'HIDE' : 'SHOW'}</button></div></label>
            {screen === 'signup' ? <><Field label="Confirm password" name="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} /><ImageInput value={photo} onChange={setPhoto} label="Profile picture (optional)" /></> : <button type="button" className="text-button" onClick={() => setForgot(true)}>Forgot password?</button>}
            {error && <p className="error" role="alert">{error}</p>}
            <Button type="submit" disabled={busy} icon="arrow">{busy ? 'Please wait…' : screen === 'signup' ? 'Create Account' : 'Sign In'}</Button>
          </form><p className="auth-switch">{screen === 'signup' ? 'Already have an account?' : 'New to GameIQ?'} <button className="text-button" onClick={() => navigate(screen === 'signup' ? 'signin' : 'signup')}>{screen === 'signup' ? 'Sign In' : 'Create Account'}</button></p>
        </>}
        <p className="development-note"><Icon name="lock" size={15} /> Development accounts stay in this browser. Passwords are salted and hashed. Shared accounts, recovery emails, and device sync need a secure server.</p>
      </div><footer className="login-footer"><span>© {new Date().getFullYear()} GAMEIQ</span><span>FOOTBALL TRAINING</span></footer>
    </section>
    {forgot && <Modal title="Password recovery" onClose={() => setForgot(false)}><p className="muted">Recovery emails require a connected authentication provider and are not available in this local development app. If you are signed in, change your password in Settings. No reset email has been sent.</p><Button onClick={() => setForgot(false)}>Back to Sign In</Button></Modal>}
  </main>;
}

export function RoleSetup({ onFinish }) {
  const [role, setRole] = useState(null);
  return <Modal title={role ? 'What’s your next move?' : 'Coach or kid?'} onClose={() => onFinish('kid', null)}>
    <p className="app-eyebrow">{role ? 'STEP 02 / 02' : 'STEP 01 / 02'}</p><p className="muted">{role ? 'Choose how you want to get started.' : 'Tell us who you are so we can get you started.'}</p>
    <div className="stack">{!role ? <><Button secondary onClick={() => setRole('coach')} icon="team">I’m a coach</Button><Button secondary onClick={() => setRole('kid')} icon="football">I’m a kid</Button></> : <><Button onClick={() => onFinish(role, role === 'coach' ? 'create' : 'join')}>{role === 'coach' ? 'Create a team' : 'Join a team'}</Button><Button secondary onClick={() => onFinish(role, role === 'coach' ? 'join' : null)}>{role === 'coach' ? 'Log in to a team' : 'Just create an account'}</Button><button className="text-button" onClick={() => setRole(null)}>Back</button></>}</div>
  </Modal>;
}
