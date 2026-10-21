import React, { useEffect, useState } from 'react';
import { useApp } from '../data/AppContext';
import { deleteFile, getFile, putFile } from '../data/files';
import { lessons, ruleSources } from '../lessons/content';
import { Button, Field, Icon, Modal, PageHeading, Panel, dateText } from '../components/UI';

export default function Rulebooks() {
  const { user, saveUser, navigate } = useApp();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rename, setRename] = useState(null);
  const [opened, setOpened] = useState(null);
  const [removing, setRemoving] = useState(null);
  useEffect(() => () => { if (opened?.url) URL.revokeObjectURL(opened.url); }, [opened]);
  async function upload(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    setBusy(true); setError(''); let key;
    try {
      if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 20 * 1024 * 1024) throw new Error('Choose a PDF file up to 20 MB.');
      const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (header !== '%PDF-') throw new Error('This file does not appear to be a PDF.');
      key = `${user.id}/${crypto.randomUUID()}`;
      await putFile(key, file);
      saveUser({ rulebooks: [...user.rulebooks, { id: key, name: file.name.replace(/\.pdf$/i, ''), size: file.size, uploadedAt: new Date().toISOString() }] });
    } catch (err) { if (key) await deleteFile(key).catch(() => {}); setError(err.message); } finally { setBusy(false); }
  }
  async function open(book) {
    try { const file = await getFile(book.id); if (!file) throw new Error('The PDF is missing from this browser. Please upload it again.'); setOpened({ ...book, url: URL.createObjectURL(new Blob([file], { type: 'application/pdf' })) }); setError(''); } catch (err) { setError(err.message); }
  }
  return <><button className="text-button back-link" onClick={() => navigate('training')}><Icon name="back" size={16} /> Back to Training</button><PageHeading eyebrow="KNOW THE RULES YOU PLAY BY" title="Rulebook library." description="Football rules, ready to study. Your team’s PDFs, kept together." />
    <Panel className="rulebook-upload"><div className="row"><span className="feature-icon"><Icon name="upload" size={28} /></span><div><h2>Your team. Your rules.</h2><p className="muted">Save a football rulebook PDF to this browser. Up to 20 MB per file.</p></div></div><label className={`app-button upload-label ${busy ? 'disabled' : ''}`}>{busy ? 'Saving PDF…' : 'Upload Rulebook'}<input type="file" accept="application/pdf,.pdf" onChange={upload} disabled={busy} /></label><p className="small muted">PDFs are stored locally on this device. Automatic lesson or quiz generation is not available.</p></Panel>{error && <p className="error" role="alert">{error}</p>}
    <div className="section-heading"><h2>Saved rulebooks</h2><span className="muted small">{user.rulebooks.length} uploaded</span></div><div className="lesson-grid">{user.rulebooks.map(book => <Panel key={book.id}><span className="feature-icon"><Icon name="book" /></span><h3>{book.name}</h3><p className="muted small">{dateText(book.uploadedAt)} · {(book.size / 1024 / 1024).toFixed(1)} MB</p><div className="row wrap"><Button onClick={() => open(book)}>Open PDF</Button><button className="text-button" onClick={() => setRename(book)}>Rename</button><button className="text-button danger-text" onClick={() => setRemoving(book)}>Delete</button></div></Panel>)}</div>{!user.rulebooks.length && <Panel><p className="muted">No uploaded rulebooks yet. Add your league’s PDF to keep it close during training.</p></Panel>}
    <div className="section-heading"><h2>Built-in football rules</h2></div><p className="muted">Start with these rule lessons. Your league’s adopted rulebook takes precedence over these general explanations.</p><div className="lesson-grid">{lessons.filter(l => l.category === 'rules').map(l => <button className="resource-card" key={l.id} onClick={() => navigate(`lesson/${l.id}`)}><Icon name="book" /><span><strong>{l.title}</strong><small>{l.description}</small></span><Icon name="arrow" size={18} /></button>)}</div><Panel className="section-space"><h3>Reference library</h3><div className="source-links">{ruleSources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div></Panel>
    {rename && <Modal title="Rename rulebook" onClose={() => setRename(null)}><form className="app-form" onSubmit={e => { e.preventDefault(); const name = new FormData(e.currentTarget).get('name').trim(); if (!name) return; saveUser({ rulebooks: user.rulebooks.map(b => b.id === rename.id ? { ...b, name } : b) }); setRename(null); }}><Field label="Rulebook name" name="name" defaultValue={rename.name} required maxLength={120} /><Button type="submit">Save Name</Button></form></Modal>}
    {removing && <Modal title="Delete rulebook?" onClose={() => setRemoving(null)}><p className="muted">Remove “{removing.name}” from this device?</p><Button className="danger-button" onClick={async () => { try { await deleteFile(removing.id); saveUser({ rulebooks: user.rulebooks.filter(b => b.id !== removing.id) }); setRemoving(null); } catch (err) { setError(err.message); setRemoving(null); } }}>Delete PDF</Button></Modal>}
    {opened && <Modal title={opened.name} onClose={() => setOpened(null)}><p className="muted small">If the PDF preview is unavailable on your phone, use Open / Download.</p><a className="app-button secondary" href={opened.url} target="_blank" rel="noreferrer">Open / Download PDF</a><iframe className="pdf-viewer" src={opened.url} title={opened.name} /></Modal>}
  </>;
}
