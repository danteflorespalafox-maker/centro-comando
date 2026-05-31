const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const ENV = process.env.NODE_ENV || 'development';
const PORT = ENV === 'production' ? 3000 : 3001;
const DB_FILE = path.join(__dirname, 'data', `db.${ENV}.json`);

// ── INIT DB ──────────────────────────────────────────────
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const empty = { ideas: [], prioridades: {}, reflexiones: {}, streak: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
  }
}

function readDB() {
  initDB();
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.ideas)    { db.ideas = []; writeDB(db); }
  if (!db.economia) { db.economia = { colchon: 0, gastos: [], ingresos: [] }; writeDB(db); }
  return db;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── MIDDLEWARE ───────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inyectar ENV al frontend
app.get('/env', (req, res) => {
  res.json({ env: ENV, port: PORT });
});

// ── API: DB COMPLETA ─────────────────────────────────────
app.get('/api/db', (req, res) => {
  res.json(readDB());
});

app.post('/api/db', (req, res) => {
  writeDB(req.body);
  res.json({ ok: true });
});

// ── API: IDEAS ────────────────────────────────────────────
app.get('/api/ideas', (req, res) => {
  res.json(readDB().ideas);
});

app.post('/api/ideas', (req, res) => {
  const db = readDB();
  const idea = { id: Date.now(), nombre: req.body.nombre, descripcion: req.body.descripcion || '', estado: 'incubando', metas: [], ts: Date.now() };
  db.ideas.unshift(idea);
  writeDB(db);
  res.json(idea);
});

app.patch('/api/ideas/:id', (req, res) => {
  const db = readDB();
  const idea = db.ideas.find(i => i.id == req.params.id);
  if (!idea) return res.status(404).json({ error: 'not found' });
  Object.assign(idea, req.body);
  writeDB(db);
  res.json(idea);
});

app.delete('/api/ideas/:id', (req, res) => {
  const db = readDB();
  db.ideas = db.ideas.filter(i => i.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ── API: METAS DE UNA IDEA ────────────────────────────────
app.post('/api/ideas/:id/metas', (req, res) => {
  const db = readDB();
  const idea = db.ideas.find(i => i.id == req.params.id);
  if (!idea) return res.status(404).json({ error: 'not found' });
  const meta = { id: Date.now(), texto: req.body.texto, done: false };
  idea.metas.push(meta);
  writeDB(db);
  res.json(meta);
});

app.patch('/api/ideas/:id/metas/:metaId', (req, res) => {
  const db = readDB();
  const idea = db.ideas.find(i => i.id == req.params.id);
  if (!idea) return res.status(404).json({ error: 'not found' });
  const meta = idea.metas.find(m => m.id == req.params.metaId);
  if (!meta) return res.status(404).json({ error: 'not found' });
  Object.assign(meta, req.body);
  writeDB(db);
  res.json(meta);
});

app.delete('/api/ideas/:id/metas/:metaId', (req, res) => {
  const db = readDB();
  const idea = db.ideas.find(i => i.id == req.params.id);
  if (!idea) return res.status(404).json({ error: 'not found' });
  idea.metas = idea.metas.filter(m => m.id != req.params.metaId);
  writeDB(db);
  res.json({ ok: true });
});

// ── API: ECONOMÍA ─────────────────────────────────────────
app.get('/api/economia', (req, res) => {
  res.json(readDB().economia);
});

app.put('/api/economia/colchon', (req, res) => {
  const db = readDB();
  db.economia.colchon = req.body.colchon;
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/economia/gastos', (req, res) => {
  const db = readDB();
  const gasto = { id: Date.now(), descripcion: req.body.descripcion, monto: req.body.monto, categoria: req.body.categoria || 'otro', tipo: req.body.tipo || 'variable', fecha: req.body.fecha || new Date().toISOString().slice(0,10) };
  db.economia.gastos.push(gasto);
  writeDB(db);
  res.json(gasto);
});

app.delete('/api/economia/gastos/:id', (req, res) => {
  const db = readDB();
  db.economia.gastos = db.economia.gastos.filter(g => g.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/economia/ingresos', (req, res) => {
  const db = readDB();
  const ingreso = { id: Date.now(), descripcion: req.body.descripcion, monto: req.body.monto, fecha: req.body.fecha || new Date().toISOString().slice(0,10) };
  db.economia.ingresos.push(ingreso);
  writeDB(db);
  res.json(ingreso);
});

app.delete('/api/economia/ingresos/:id', (req, res) => {
  const db = readDB();
  db.economia.ingresos = db.economia.ingresos.filter(i => i.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ── API: PRIORIDADES (por fecha) ──────────────────────────
app.get('/api/prioridades/:fecha', (req, res) => {
  const db = readDB();
  const def = [{text:'',done:false},{text:'',done:false},{text:'',done:false}];
  res.json(db.prioridades[req.params.fecha] || def);
});

app.put('/api/prioridades/:fecha', (req, res) => {
  const db = readDB();
  db.prioridades[req.params.fecha] = req.body;
  writeDB(db);
  res.json({ ok: true });
});

// ── API: REFLEXIÓN (por fecha) ────────────────────────────
app.get('/api/reflexion/:fecha', (req, res) => {
  const db = readDB();
  res.json({ text: db.reflexiones[req.params.fecha] || '' });
});

app.put('/api/reflexion/:fecha', (req, res) => {
  const db = readDB();
  db.reflexiones[req.params.fecha] = req.body.text;
  writeDB(db);
  res.json({ ok: true });
});

// ── API: STREAK ───────────────────────────────────────────
app.get('/api/streak', (req, res) => {
  res.json(readDB().streak);
});

app.put('/api/streak', (req, res) => {
  const db = readDB();
  db.streak = req.body;
  writeDB(db);
  res.json({ ok: true });
});

// ── START ─────────────────────────────────────────────────
initDB();
app.listen(PORT, () => {
  console.log(`\n  Centro de Comando — ${ENV.toUpperCase()}`);
  console.log(`  http://localhost:${PORT}\n`);
});
