import React from 'react';
import { useApp } from '../data/AppContext';
import { Button, Empty } from '../components/UI';

// Future scenario data and interactive decision components belong in this directory.
// This placeholder deliberately has no questions, scoring, or XP.
export default function GameScenarios() {
  const { navigate } = useApp();
  return <div className="completion-wrap"><Empty icon="football" title="Game Scenarios"><span className="pill">COMING SOON</span><p className="muted">Put your football IQ to the test with real game situations. Make decisions, learn from your choices, and improve your understanding of football.</p><Button onClick={() => navigate('training')} icon="back">Back to Training</Button></Empty></div>;
}
