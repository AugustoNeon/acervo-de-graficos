// Copia output.png / widget.html de ../graficos/<categoria>/<slug>/ para
// public/graficos/<categoria>/<slug>/ antes de dev/build. graficos/ continua
// sendo a unica fonte de verdade dos arquivos; public/graficos e derivado
// (ver .gitignore) e pode ser regenerado a qualquer momento rodando este script.
import { existsSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const graficosDir = join(siteRoot, '..', 'graficos');
const publicDir = join(siteRoot, 'public', 'graficos');

const ASSET_FILES = ['output.png', 'widget.html'];

rmSync(publicDir, { recursive: true, force: true });

let count = 0;
for (const category of readdirSync(graficosDir, { withFileTypes: true })) {
  if (!category.isDirectory()) continue;
  const categoryPath = join(graficosDir, category.name);
  for (const slug of readdirSync(categoryPath, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const slugPath = join(categoryPath, slug.name);
    const destDir = join(publicDir, category.name, slug.name);
    for (const file of ASSET_FILES) {
      const src = join(slugPath, file);
      if (existsSync(src)) {
        mkdirSync(destDir, { recursive: true });
        copyFileSync(src, join(destDir, file));
        count++;
      }
    }
  }
}

console.log(`sync-assets: ${count} arquivo(s) copiado(s) para public/graficos/`);
