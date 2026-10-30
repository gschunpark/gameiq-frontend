import React from 'react';
import { useApp } from '../data/AppContext';
import { Button, Empty, Icon, Panel, PageHeading, dateText } from '../components/UI';
import FootballLevel from './FootballLevel';
import { dummyLevel } from './dummyLevel';

export default function Training({ category }) {
  const { user, navigate } = useApp();
  if (category === dummyLevel.id) return <FootballLevel />;
  return <><PageHeading eyebrow="TRAIN YOUR FOOTBALL MIND" title="Training" description="A new way to build your football IQ is coming." />
    <Panel><p className="app-eyebrow">PLAYABLE DEMO · 5 SCENARIOS</p><h2>Read the Field</h2><p className="muted">Watch animated football plays, choose the best decision, and learn from every answer. Complete all five correctly to earn 50 XP once.</p>{user.completed[dummyLevel.id] && <p className="muted small">Training history: Completed {dateText(user.completed[dummyLevel.id].at)} · 5/5 correct · 50 XP earned</p>}<Button icon="arrow" onClick={() => navigate(`training/${dummyLevel.id}`)}>{user.completed[dummyLevel.id] ? 'Replay Level' : 'Start Level'}</Button></Panel>
    <div className="section-space"><Empty icon="football" title="Ask a question. Train your football IQ."><span className="pill">COMING SOON</span><p className="muted">Ask a football question, and AI will create a training experience around it. This feature is not available yet.</p></Empty></div>
    <div className="two-columns section-space"><button className="resource-card" onClick={() => navigate('scenarios')}><Icon name="route" size={30} /><span><strong>Game Scenarios</strong><small>Coming soon</small></span><Icon name="arrow" /></button><button className="resource-card" onClick={() => navigate('rulebooks')}><Icon name="book" size={30} /><span><strong>Your team’s rulebook</strong><small>Rulebook uploads are coming later.</small></span><Icon name="arrow" /></button></div>
  </>;
}
