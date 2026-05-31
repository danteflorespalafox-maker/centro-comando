const Database = require('better-sqlite3');
const path = require('path');

const ENV = process.env.NODE_ENV || 'development';
const DB_PATH = path.join(__dirname, '..', 'data', `nexus.${ENV}.db`);

const db = new Database(DB_PATH);

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS ideas (
    id          INTEGER PRIMARY KEY,
    nombre      TEXT    NOT NULL,
    descripcion TEXT    DEFAULT '',
    problema    TEXT    DEFAULT '',
    mercado     TEXT    DEFAULT '',
    costos      TEXT    DEFAULT '',
    potencial   TEXT    DEFAULT '',
    estado      TEXT    DEFAULT 'incubando',
    activado_en INTEGER,
    scores      TEXT    DEFAULT '{}',
    ts          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS metas (
    id      INTEGER PRIMARY KEY,
    idea_id INTEGER NOT NULL,
    texto   TEXT    NOT NULL,
    done    INTEGER DEFAULT 0,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS economia (
    id      INTEGER PRIMARY KEY DEFAULT 1,
    colchon REAL    DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS gastos (
    id          INTEGER PRIMARY KEY,
    descripcion TEXT    NOT NULL,
    monto       REAL    NOT NULL,
    tipo        TEXT    DEFAULT 'variable',
    fecha       TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ingresos (
    id          INTEGER PRIMARY KEY,
    descripcion TEXT    NOT NULL,
    monto       REAL    NOT NULL,
    fecha       TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS salud (
    fecha         TEXT    PRIMARY KEY,
    habitos       TEXT    DEFAULT '{}',
    estado_mental INTEGER DEFAULT 0,
    nota          TEXT    DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS campo (
    id        INTEGER PRIMARY KEY,
    texto     TEXT    NOT NULL,
    fecha     TEXT    NOT NULL,
    resultado TEXT    DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS reflexiones (
    fecha TEXT    PRIMARY KEY,
    text  TEXT    DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS streak (
    fecha TEXT PRIMARY KEY
  );

  INSERT OR IGNORE INTO economia (id, colchon) VALUES (1, 0);
`);

try { db.exec('ALTER TABLE economia ADD COLUMN meta_libertad REAL DEFAULT 0'); } catch(e) {}

// ── IDEAS ─────────────────────────────────────────────────
const ideas = {
  getAll: () => {
    const rows = db.prepare('SELECT * FROM ideas ORDER BY ts DESC').all();
    return rows.map(r => ({
      ...r,
      scores: JSON.parse(r.scores || '{}'),
      metas: db.prepare('SELECT * FROM metas WHERE idea_id = ? ORDER BY id ASC').all(r.id)
        .map(m => ({ ...m, done: m.done === 1 }))
    }));
  },

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO ideas (id, nombre, descripcion, estado, ts)
      VALUES (@id, @nombre, @descripcion, 'incubando', @ts)
    `);
    stmt.run({ id: data.id, nombre: data.nombre, descripcion: data.descripcion || '', ts: data.ts });
    return ideas.getById(data.id);
  },

  getById: (id) => {
    const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      scores: JSON.parse(row.scores || '{}'),
      metas: db.prepare('SELECT * FROM metas WHERE idea_id = ? ORDER BY id ASC').all(id)
        .map(m => ({ ...m, done: m.done === 1 }))
    };
  },

  update: (id, data) => {
    const fields = ['nombre','descripcion','problema','mercado','costos','potencial','estado','activado_en'];
    const updates = [];
    const values = {};
    fields.forEach(f => {
      if (data[f] !== undefined) { updates.push(`${f} = @${f}`); values[f] = data[f]; }
    });
    if (data.scores !== undefined) { updates.push('scores = @scores'); values.scores = JSON.stringify(data.scores); }
    if (!updates.length) return ideas.getById(id);
    values.id = id;
    db.prepare(`UPDATE ideas SET ${updates.join(', ')} WHERE id = @id`).run(values);
    return ideas.getById(id);
  },

  delete: (id) => {
    db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
  }
};

// ── METAS ─────────────────────────────────────────────────
const metas = {
  create: (ideaId, data) => {
    const id = Date.now();
    db.prepare('INSERT INTO metas (id, idea_id, texto, done) VALUES (?, ?, ?, 0)').run(id, ideaId, data.texto);
    return { id, idea_id: ideaId, texto: data.texto, done: false };
  },

  update: (id, data) => {
    if (data.done !== undefined) db.prepare('UPDATE metas SET done = ? WHERE id = ?').run(data.done ? 1 : 0, id);
    return db.prepare('SELECT * FROM metas WHERE id = ?').get(id);
  },

  delete: (id) => {
    db.prepare('DELETE FROM metas WHERE id = ?').run(id);
  }
};

// ── ECONOMÍA ──────────────────────────────────────────────
const economia = {
  get: () => {
    const config = db.prepare('SELECT colchon, meta_libertad FROM economia WHERE id = 1').get();
    const gastosList = db.prepare('SELECT * FROM gastos ORDER BY id DESC').all();
    const ingresosList = db.prepare('SELECT * FROM ingresos ORDER BY id DESC').all();
    return { colchon: config?.colchon || 0, metaLibertad: config?.meta_libertad || 0, gastos: gastosList, ingresos: ingresosList };
  },

  setColchon: (colchon) => {
    db.prepare('UPDATE economia SET colchon = ? WHERE id = 1').run(colchon);
  },

  setMetaLibertad: (meta) => {
    db.prepare('UPDATE economia SET meta_libertad = ? WHERE id = 1').run(meta);
  },

  addGasto: (data) => {
    const id = Date.now();
    db.prepare('INSERT INTO gastos (id, descripcion, monto, tipo, fecha) VALUES (?, ?, ?, ?, ?)')
      .run(id, data.descripcion, data.monto, data.tipo || 'variable', data.fecha || new Date().toISOString().slice(0,10));
    return db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);
  },

  deleteGasto: (id) => { db.prepare('DELETE FROM gastos WHERE id = ?').run(id); },

  addIngreso: (data) => {
    const id = Date.now();
    db.prepare('INSERT INTO ingresos (id, descripcion, monto, fecha) VALUES (?, ?, ?, ?)')
      .run(id, data.descripcion, data.monto, data.fecha || new Date().toISOString().slice(0,10));
    return db.prepare('SELECT * FROM ingresos WHERE id = ?').get(id);
  },

  deleteIngreso: (id) => { db.prepare('DELETE FROM ingresos WHERE id = ?').run(id); }
};

// ── SALUD ─────────────────────────────────────────────────
const salud = {
  get: (fecha) => {
    const row = db.prepare('SELECT * FROM salud WHERE fecha = ?').get(fecha);
    if (!row) return { habitos: { lectura: false, sueno: false, agua: false, ejercicio: false, hobbies: false }, estadoMental: 0, nota: '' };
    return { habitos: JSON.parse(row.habitos || '{}'), estadoMental: row.estado_mental, nota: row.nota };
  },

  set: (fecha, data) => {
    db.prepare(`
      INSERT INTO salud (fecha, habitos, estado_mental, nota)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(fecha) DO UPDATE SET habitos = excluded.habitos, estado_mental = excluded.estado_mental, nota = excluded.nota
    `).run(fecha, JSON.stringify(data.habitos || {}), data.estadoMental || 0, data.nota || '');
  }
};

// ── CAMPO ─────────────────────────────────────────────────
const campo = {
  getAll: () => db.prepare('SELECT * FROM campo ORDER BY id DESC').all(),

  create: (data) => {
    const id = Date.now();
    const fecha = data.fecha || new Date().toISOString().slice(0,10);
    db.prepare('INSERT INTO campo (id, texto, fecha, resultado) VALUES (?, ?, ?, ?)').run(id, data.texto, fecha, data.resultado || 'pendiente');
    return db.prepare('SELECT * FROM campo WHERE id = ?').get(id);
  },

  update: (id, data) => {
    if (data.resultado) db.prepare('UPDATE campo SET resultado = ? WHERE id = ?').run(data.resultado, id);
    return db.prepare('SELECT * FROM campo WHERE id = ?').get(id);
  },

  delete: (id) => { db.prepare('DELETE FROM campo WHERE id = ?').run(id); }
};

// ── REFLEXIONES ───────────────────────────────────────────
const reflexiones = {
  get: (fecha) => {
    const row = db.prepare('SELECT text FROM reflexiones WHERE fecha = ?').get(fecha);
    return row?.text || '';
  },
  set: (fecha, text) => {
    db.prepare('INSERT INTO reflexiones (fecha, text) VALUES (?, ?) ON CONFLICT(fecha) DO UPDATE SET text = excluded.text').run(fecha, text);
  }
};

// ── STREAK ────────────────────────────────────────────────
const streak = {
  getAll: () => db.prepare('SELECT fecha FROM streak').all().map(r => r.fecha),
  set: (fechas) => {
    db.prepare('DELETE FROM streak').run();
    const insert = db.prepare('INSERT OR IGNORE INTO streak (fecha) VALUES (?)');
    const insertMany = db.transaction((arr) => arr.forEach(f => insert.run(f)));
    insertMany(fechas);
  }
};

module.exports = { ideas, metas, economia, salud, campo, reflexiones, streak };
