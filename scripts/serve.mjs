// Tiny static server for dist/ (optional: dist/index.html also works straight from file://).
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const port = Number(process.argv[2] || 8080);
const file = new URL('../dist/index.html', import.meta.url);
createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(readFileSync(file)); })
  .listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
