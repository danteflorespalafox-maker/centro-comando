# Centro de Comando — Setup

## Instalación (una sola vez)

```bash
cd centro-comando
npm install
```

## Uso

### Desarrollo / QA
```bash
npm run dev
```
→ Abre Chrome en **http://localhost:3001**
- Badge verde: `development`
- Datos guardados en `data/db.development.json`
- Nodemon: editas un archivo → el servidor reinicia solo

### Producción
```bash
npm run start
```
→ Abre Chrome en **http://localhost:3000**
- Badge dorado: `production`
- Datos guardados en `data/db.production.json`

---

## Estructura

```
centro-comando/
├── server.js              ← servidor Express + API REST
├── package.json
├── public/
│   └── index.html         ← frontend (edita aquí)
└── data/
    ├── db.development.json  ← datos QA
    └── db.production.json   ← datos producción
```

## Flujo de trabajo recomendado

1. Desarrolla y prueba cambios en `npm run dev` (puerto 3001)
2. Cuando estés conforme, detén dev y lanza `npm run start` (puerto 3000)
3. Los datos de cada entorno son **independientes** — nunca se mezclan

## Agregar features

Todo el frontend vive en `public/index.html`.
La API REST está en `server.js` — agrega endpoints siguiendo el mismo patrón.

Los datos persisten en JSON plano en `/data/` — puedes editarlos directamente
o hacer backup copiando el archivo.
