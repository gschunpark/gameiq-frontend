import React from 'react';
import { useApp } from '../data/AppContext';
import { Button, Empty, Icon, PageHeading } from '../components/UI';

export default function Rulebooks() {
  const { navigate } = useApp();
  return <><button className="text-button back-link" onClick={() => navigate('training')}><Icon name="back" size={16} /> Back to Training</button><PageHeading eyebrow="YOUR TEAM. YOUR RULES." title="Rulebooks" />
    <Empty icon="book" title="Bring your own rulebook"><span className="pill">COMING SOON</span><p className="muted">You’ll be able to upload your team’s football rulebook into GameIQ. Rulebook uploads are not available yet.</p><Button secondary onClick={() => navigate('training')}>Back to Training</Button></Empty>
  </>;
}
