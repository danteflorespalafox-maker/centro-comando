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
    const empty = { inbox: [], proyectos: [], prioridades: {}, reflexiones: {}, streak: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
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

// ── API: INBOX ────────────────────────────────────────────
app.get('/api/inbox', (req, res) => {
  res.json(readDB().inbox);
});

app.post('/api/inbox', (req, res) => {
  const db = readDB();
  const item = { id: Date.now(), ...req.body, procesado: false, ts: Date.now() };
  db.inbox.unshift(item);
  writeDB(db);
  res.json(item);
});

app.patch('/api/inbox/:id', (req, res) => {
  const db = readDB();
  const item = db.inbox.find(i => i.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  Object.assign(item, req.body);
  writeDB(db);
  res.json(item);
});

app.delete('/api/inbox/:id', (req, res) => {
  const db = readDB();
  db.inbox = db.inbox.filter(i => i.id != req.params.id);
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

// ── API: PROYECTOS ────────────────────────────────────────
app.get('/api/proyectos', (req, res) => {
  res.json(readDB().proyectos);
});

app.post('/api/proyectos', (req, res) => {
  const db = readDB();
  const item = { id: Date.now(), ...req.body };
  db.proyectos.push(item);
  writeDB(db);
  res.json(item);
});

app.patch('/api/proyectos/:id', (req, res) => {
  const db = readDB();
  const item = db.proyectos.find(p => p.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  Object.assign(item, req.body);
  writeDB(db);
  res.json(item);
});

app.delete('/api/proyectos/:id', (req, res) => {
  const db = readDB();
  db.proyectos = db.proyectos.filter(p => p.id != req.params.id);
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
