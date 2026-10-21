import React from 'react';
import { useApp } from '../data/AppContext';
import { Empty, Icon, PageHeading } from '../components/UI';

export default function Training() {
  const { navigate } = useApp();
  return <><PageHeading eyebrow="TRAIN YOUR FOOTBALL MIND" title="Training" description="A new way to build your football IQ is coming." />
    <Empty icon="football" title="Ask a question. Train your football IQ."><span className="pill">COMING SOON</span><p className="muted">Ask a football question, and AI will create a training experience around it. This feature is not available yet.</p></Empty>
    <div className="two-columns section-space"><button className="resource-card" onClick={() => navigate('scenarios')}><Icon name="route" size={30} /><span><strong>Game Scenarios</strong><small>Coming soon</small></span><Icon name="arrow" /></button><button className="resource-card" onClick={() => navigate('rulebooks')}><Icon name="book" size={30} /><span><strong>Your team’s rulebook</strong><small>Rulebook uploads are coming later.</small></span><Icon name="arrow" /></button></div>
  </>;
}
