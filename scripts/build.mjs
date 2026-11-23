// Build: vite IIFE bundle -> dist/index.html with the script and style inlined (works from file://).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
execFileSync('npx', ['vite', 'build', '--logLevel', 'warn'], { cwd: root, stdio: 'inherit' });
const js = readFileSync(root + 'scratch/bundle/rush.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const html = readFileSync(root + 'src/index.html', 'utf8').replace('<!--BUNDLE-->', () => '<script>' + js + '</script>');
mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
