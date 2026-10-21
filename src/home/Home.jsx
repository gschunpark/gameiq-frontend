import React from 'react';
import { useApp } from '../data/AppContext';
import { trainingStats } from '../xp/progress';
import { teamForUser } from '../teams/service';
import { Avatar, Button, Icon, Panel, PageHeading } from '../components/UI';

export default function Home() {
  const { user, db, navigate } = useApp();
  const stats = trainingStats(user, []);
  const team = teamForUser(db, user.id);
  const coach = db.users.find(u => u.id === team?.coachId);
  return <>
    <PageHeading eyebrow="YOUR FOOTBALL JOURNEY" title={`Let’s get after it, ${user.firstName}.`} description="A sharper mind. A stronger game." />
    <div className="home-grid"><Panel className="xp-overview"><div className="row between"><span className="app-eyebrow">YOUR TRAINING SNAPSHOT</span><span className="pill"><Icon name="star" size={14} /> XP EARNED</span></div><div className="xp-value">{stats.xp.toLocaleString()}<span>Total XP</span></div><p className="muted">{stats.xp ? 'Your previously earned XP is saved.' : 'Your football training journey starts here.'}</p><p className="muted small">New training experiences are coming soon.</p></Panel>
      <Panel className="continue-card"><div className="feature-icon"><Icon name="football" size={32} /></div><p className="app-eyebrow">COMING SOON</p><h2>Your question. Your training.</h2><p>Ask a football question and AI will build a training experience around it.</p><Button onClick={() => navigate('training')} icon="arrow">Explore Training</Button></Panel></div>
    <div className="section-heading"><h2>Your football toolkit</h2><span className="toolkit-dots" aria-hidden="true"><i /><i /><i /></span></div>
    <div className="two-columns toolkit-grid"><button className="resource-card resource-red" onClick={() => navigate('rulebooks')}><span className="resource-icon"><Icon name="book" size={26} /></span><span><strong>Your team’s rulebook</strong><small>Upload your own rulebook. Coming soon.</small></span><Icon name="arrow" size={19} /></button><button className="resource-card resource-blue" onClick={() => navigate('scenarios')}><span className="resource-icon"><Icon name="route" size={26} /></span><span><strong>Game Scenarios</strong><small>Coming soon</small></span><Icon name="arrow" size={19} /></button></div>
    <Panel className="section-space"><div className="section-heading compact"><h2>Your team</h2><Icon name="team" /></div>{team ? <><div className="row"><Avatar logo={team.logo} /><div><h3>{team.name}</h3><p className="muted small">{team.memberIds.length - 1} teammates · {coach ? `Coach ${coach.firstName} ${coach.lastName}` : 'Coach Not Assigned'}</p></div></div><Button secondary onClick={() => navigate('team')}>Open My Team</Button></> : <><p className="muted">Connect with your football team and grow your understanding of the game.</p><div className="row wrap"><Button secondary onClick={() => navigate('team/join')}>Join Team</Button><button className="text-button" onClick={() => navigate('team/create')}>Create Team</button></div></>}</Panel>
  </>;
}
