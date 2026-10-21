import React, { useEffect, useRef, useState } from 'react';

export function BrandMark() {
  return (
    <a className="brand" href="/" aria-label="Game IQ home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path
            d="M20 3.5 34.5 12v16L20 36.5 5.5 28V12L20 3.5Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M25.3 15.2a7.2 7.2 0 1 0 1.4 9.6l-5.1-4.4h7.8v7.3"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="brand-name">
        game<span>iq</span>
      </span>
    </a>
  );
}

export function PlayDiagram() {
  return (
    <div className="diagram" aria-hidden="true">
      <div className="diagram-topline">
        <span>PLAY 08</span>
        <span>2ND &amp; 6</span>
      </div>
      <svg className="play-svg" viewBox="0 0 440 284" fill="none">
        <path d="M24 27v230M416 27v230M24 27h392M24 257h392" className="field-border" />
        <path d="M24 85h392M24 142h392M24 199h392" className="field-line" />
        <path d="M64 27v230M112 27v230M160 27v230M208 27v230M256 27v230M304 27v230M352 27v230" className="yard-line" />
        <path d="m188 149 97-66m-97 66 101 74m-100-75 26-82m-26 82 34 102" className="route-line" />
        <path d="M285 83h-13m13 0-2 13M289 223h-13m13 0-2-13M215 74l-5 12m5-12-12 5M249 240l-5-12m5 12 10-8" className="route-arrow" />
        <circle cx="188" cy="142" r="9" className="player offense" />
        <circle cx="188" cy="199" r="9" className="player offense" />
        <circle cx="188" cy="85" r="9" className="player offense" />
        <circle cx="139" cy="142" r="9" className="player offense" />
        <circle cx="238" cy="142" r="9" className="player offense" />
        <circle cx="270" cy="111" r="8" className="player defense" />
        <circle cx="270" cy="174" r="8" className="player defense" />
        <circle cx="319" cy="85" r="8" className="player defense" />
        <circle cx="319" cy="199" r="8" className="player defense" />
        <circle cx="350" cy="142" r="8" className="player defense" />
        <circle cx="188" cy="142" r="3" className="ball" />
      </svg>
      <div className="diagram-legend">
        <span><i className="legend-dot offense-dot" /> YOUR TEAM</span>
        <span><i className="legend-dot defense-dot" /> DEFENSE</span>
        <span className="read-tag"><span className="read-dot" /> READ THE FIELD</span>
      </div>
    </div>
  );
}


function AccountSetup({ onClose }) {
  const dialogRef = useRef(null);
  const [role, setRole] = useState(null);
  const [choice, setChoice] = useState(null);
  const options = role === 'coach'
    ? [
        { id: 'create-team', title: 'Create a team', description: 'Start a new team and bring your players together.' },
        { id: 'team-login', title: 'Log in to a team', description: 'Continue with a team you already coach.' },
      ]
    : [
        { id: 'join-team', title: 'Join a team', description: 'Get ready to train with your coach and teammates.' },
        { id: 'create-account', title: 'Just create an account', description: 'Start your own journey and build your football IQ.' },
      ];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    dialogRef.current.querySelector('[data-step-focus]')?.focus();
  }, [role, choice]);

  return (
    <dialog ref={dialogRef} className="setup-dialog" aria-labelledby="setup-title" aria-describedby="setup-description" onCancel={onClose}>
      <div className="setup-toolbar">
        <span className="setup-step">{choice ? 'YOUR NEXT PLAY' : role ? 'STEP 02 / 02' : 'STEP 01 / 02'}</span>
        <button type="button" className="setup-close" onClick={onClose} aria-label="Close account setup">&times;</button>
      </div>
      <div className="setup-progress" aria-hidden="true"><span /><span className={role ? 'is-active' : ''} /></div>
      <p className="form-kicker">{role ? (role === 'coach' ? 'COACH' : 'KID / PLAYER') : 'FIND YOUR PLACE ON THE FIELD'}</p>
      <h2 id="setup-title" tabIndex={-1} data-step-focus>{choice ? choice.title : role ? 'What?s your next move?' : 'Coach or kid?'}</h2>
      <p id="setup-description" className="setup-description">
        {choice ? 'You?ve selected your path. Team and account setup will be available soon.' : role ? 'Choose how you want to get started.' : 'Tell us who you are so we can get you started.'}
      </p>
      {!choice && <div className="setup-options">
        {role ? options.map(option => (
          <button type="button" className="setup-option" key={option.id} onClick={() => setChoice(option)}>
            <span><strong>{option.title}</strong><small>{option.description}</small></span><span className="setup-arrow" aria-hidden="true">&rarr;</span>
          </button>
        )) : [
          { id: 'coach', title: 'I?m a coach', description: 'Lead your team. Build smarter players.', icon: 'C' },
          { id: 'kid', title: 'I?m a kid', description: 'Learn the game. Make your next move.', icon: 'K' },
        ].map(option => (
          <button type="button" className="setup-option" key={option.id} onClick={() => setRole(option.id)}>
            <span className="setup-icon" aria-hidden="true">{option.icon}</span><span><strong>{option.title}</strong><small>{option.description}</small></span><span className="setup-arrow" aria-hidden="true">&rarr;</span>
          </button>
        ))}
      </div>}
      <div className="setup-bottom">
        {(role || choice) && <button type="button" className="setup-back" onClick={() => choice ? setChoice(null) : setRole(null)}>&larr; Back</button>}
        {choice && <button type="button" className="submit-button" onClick={onClose}>DONE <span aria-hidden="true">&rarr;</span></button>}
        {!choice && <span className="setup-hint"><span className="live-dot" /> YOUR GAME STARTS HERE</span>}
      </div>
    </dialog>
  );
}

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSetupOpen(true);
  }

  return (
    <main className="page-shell">
      <section className="story-panel" aria-label="About Game IQ">
        <div className="story-glow" />
        <header className="site-header">
          <BrandMark />
          <span className="header-note"><span className="live-dot" /> BUILT FOR THE NEXT PLAY</span>
        </header>

        <div className="story-content">
          <p className="eyebrow"><span /> THE GAME MOVES FAST. THINK FASTER.</p>
          <h1>
            See the play.
            <br />
            <span>Make your move.</span>
          </h1>
          <p className="story-copy">
            Football IQ isn&apos;t just about knowing the playbook. It&apos;s knowing what to do
            when the play changes.
          </p>
          <PlayDiagram />
        </div>

        <footer className="story-footer">
          <span>SMARTER REPS. BETTER DECISIONS.</span>
          <span>01 <i /> 03</span>
        </footer>
      </section>

      <section className="login-panel" aria-labelledby="sign-in-title">
        <div className="login-top">
          <span>NEW TO GAME IQ?</span>
          <a href="mailto:hello@gameiq.app?subject=Game%20IQ%20account">Get started <span aria-hidden="true">↗</span></a>
        </div>

        <div className="login-content">
          <div className="mobile-brand"><BrandMark /></div>
          <p className="form-kicker">WELCOME BACK</p>
          <h2 id="sign-in-title">Let&apos;s get back<br />in the game.</h2>
          <p className="form-subtitle">Sign in to pick up where you left off.</p>

          <form className="sign-in-form" onSubmit={handleSubmit}>
            <label htmlFor="email">EMAIL ADDRESS</label>
            <div className="input-wrap">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="2.5" y="4" width="15" height="12" rx="2" />
                <path d="m3.5 5 6.5 5 6.5-5" />
              </svg>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="password-label">
              <label htmlFor="password">PASSWORD</label>
              <a href="mailto:hello@gameiq.app?subject=Reset%20my%20Game%20IQ%20password">Forgot password?</a>
            </div>
            <div className="input-wrap">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="3.5" y="8.5" width="13" height="9" rx="2" />
                <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5M10 12v2" />
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            <button className="submit-button" type="submit">
              SIGN IN <span aria-hidden="true">→</span>
            </button>
            
          </form>

          <div className="secure-note">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.7 13 3.6v3.5c0 3.3-2.1 5.5-5 7.2-2.9-1.7-5-3.9-5-7.2V3.6l5-1.9Z" />
              <path d="m5.7 7.8 1.5 1.5 3.2-3.2" />
            </svg>
            YOUR PROGRESS IS SAFE WITH US
          </div>
        </div>

        <footer className="login-footer">
          <span>© 2025 GAME IQ</span>
          <a href="mailto:hello@gameiq.app?subject=Privacy%20question">PRIVACY &amp; TERMS</a>
        </footer>
      </section>
      {setupOpen && <AccountSetup onClose={() => setSetupOpen(false)} />}
    </main>
  );
}

export default App;
