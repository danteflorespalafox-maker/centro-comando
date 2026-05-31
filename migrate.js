const fs = require('fs');
const path = require('path');

const ENV = process.env.NODE_ENV || 'development';
const JSON_FILE = path.join(__dirname, 'data', `db.${ENV}.json`);

if (!fs.existsSync(JSON_FILE)) {
  console.log('No hay archivo JSON que migrar.');
  process.exit(0);
}

const json = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const db = require('./src/db');

let migradas = 0;

// Ideas
if (json.ideas?.length) {
  json.ideas.forEach(idea => {
    try {
      const { metas: metasArr, scores, ...rest } = idea;
      db.ideas.update(idea.id, { ...rest, scores });
      const created = db.ideas.create({ id: idea.id, nombre: idea.nombre, descripcion: idea.descripcion || '', ts: idea.ts });
      db.ideas.update(idea.id, {
        descripcion: idea.descripcion, problema: idea.problema,
        mercado: idea.mercado, costos: idea.costos,
        potencial: idea.potencial, estado: idea.estado,
        activado_en: idea.activadoEn, scores: idea.scores
      });
      (metasArr || []).forEach(m => db.metas.create(idea.id, { texto: m.texto }));
      migradas++;
    } catch(e) { /* idea ya existe */ }
  });
  console.log(`✓ ${json.ideas.length} ideas migradas`);
}

// Economía
if (json.economia) {
  if (json.economia.colchon) db.economia.setColchon(json.economia.colchon);
  (json.economia.gastos || []).forEach(g => {
    try { db.economia.addGasto(g); } catch(e) {}
  });
  (json.economia.ingresos || []).forEach(i => {
    try { db.economia.addIngreso(i); } catch(e) {}
  });
  console.log(`✓ Economía migrada`);
}

// Salud
if (json.salud) {
  Object.entries(json.salud).forEach(([fecha, data]) => {
    db.salud.set(fecha, data);
  });
  console.log(`✓ ${Object.keys(json.salud).length} registros de salud migrados`);
}

// Campo
if (json.campo?.length) {
  json.campo.forEach(m => {
    try { db.campo.create(m); } catch(e) {}
  });
  console.log(`✓ ${json.campo.length} movimientos de campo migrados`);
}

// Reflexiones
if (json.reflexiones) {
  Object.entries(json.reflexiones).forEach(([fecha, text]) => {
    db.reflexiones.set(fecha, text);
  });
  console.log(`✓ ${Object.keys(json.reflexiones).length} reflexiones migradas`);
}

// Streak
if (json.streak?.length) {
  db.streak.set(json.streak);
  console.log(`✓ Streak migrado`);
}

console.log('\n✅ Migración completada. Tus datos están en SQLite.');
