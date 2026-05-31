const express = require('express');
const path = require('path');
const db = require('./src/db');

const app = express();
const ENV = process.env.NODE_ENV || 'development';
const PORT = ENV === 'production' ? 3000 : 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/env', (req, res) => res.json({ env: ENV, port: PORT }));

// ── IDEAS ─────────────────────────────────────────────────
app.get('/api/ideas', (req, res) => res.json(db.ideas.getAll()));

app.post('/api/ideas', (req, res) => {
  const idea = db.ideas.create({ id: Date.now(), nombre: req.body.nombre, descripcion: req.body.descripcion || '', ts: Date.now() });
  res.json(idea);
});

app.patch('/api/ideas/:id', (req, res) => {
  const idea = db.ideas.update(req.params.id, req.body);
  if (!idea) return res.status(404).json({ error: 'not found' });
  res.json(idea);
});

app.delete('/api/ideas/:id', (req, res) => {
  db.ideas.delete(req.params.id);
  res.json({ ok: true });
});

// ── METAS ─────────────────────────────────────────────────
app.post('/api/ideas/:id/metas', (req, res) => {
  const meta = db.metas.create(req.params.id, req.body);
  res.json(meta);
});

app.patch('/api/ideas/:id/metas/:metaId', (req, res) => {
  const meta = db.metas.update(req.params.metaId, req.body);
  res.json(meta);
});

app.delete('/api/ideas/:id/metas/:metaId', (req, res) => {
  db.metas.delete(req.params.metaId);
  res.json({ ok: true });
});

// ── ECONOMÍA ──────────────────────────────────────────────
app.get('/api/economia', (req, res) => res.json(db.economia.get()));

app.put('/api/economia/colchon', (req, res) => {
  db.economia.setColchon(req.body.colchon);
  res.json({ ok: true });
});

app.put('/api/economia/meta-libertad', (req, res) => {
  db.economia.setMetaLibertad(req.body.meta);
  res.json({ ok: true });
});

app.post('/api/economia/gastos', (req, res) => res.json(db.economia.addGasto(req.body)));
app.delete('/api/economia/gastos/:id', (req, res) => { db.economia.deleteGasto(req.params.id); res.json({ ok: true }); });

app.post('/api/economia/ingresos', (req, res) => res.json(db.economia.addIngreso(req.body)));
app.delete('/api/economia/ingresos/:id', (req, res) => { db.economia.deleteIngreso(req.params.id); res.json({ ok: true }); });

// ── SALUD ─────────────────────────────────────────────────
app.get('/api/salud/:fecha', (req, res) => res.json(db.salud.get(req.params.fecha)));
app.put('/api/salud/:fecha', (req, res) => { db.salud.set(req.params.fecha, req.body); res.json({ ok: true }); });

// ── CAMPO ─────────────────────────────────────────────────
app.get('/api/campo', (req, res) => res.json(db.campo.getAll()));
app.post('/api/campo', (req, res) => res.json(db.campo.create(req.body)));
app.patch('/api/campo/:id', (req, res) => res.json(db.campo.update(req.params.id, req.body)));
app.delete('/api/campo/:id', (req, res) => { db.campo.delete(req.params.id); res.json({ ok: true }); });

// ── REFLEXIONES ───────────────────────────────────────────
app.get('/api/reflexion/:fecha', (req, res) => res.json({ text: db.reflexiones.get(req.params.fecha) }));
app.put('/api/reflexion/:fecha', (req, res) => { db.reflexiones.set(req.params.fecha, req.body.text); res.json({ ok: true }); });

// ── STREAK ────────────────────────────────────────────────
app.get('/api/streak', (req, res) => res.json(db.streak.getAll()));
app.put('/api/streak', (req, res) => { db.streak.set(req.body); res.json({ ok: true }); });

// ── START ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  NEXUS//A — ${ENV.toUpperCase()}`);
  console.log(`  http://localhost:${PORT}\n`);
});
