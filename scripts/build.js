/**
 * ————————————————————————————————————————————————————————————————————
 *  Sincronizador Notion → Micrositio HTML
 *  Colegios Altum · Academics Tutores (extensible a otros productos DIT)
 * ————————————————————————————————————————————————————————————————————
 *
 *  Flujo:
 *  1. Lee la base "Registro de manuales" vía Notion API
 *  2. Filtra los manuales que:
 *     - Tengan el producto marcado (config.name → coincide con el rollup)
 *     - Estén en estado "Actualizado"
 *     - Tengan el checkbox "Visible en micrositio" activado
 *  3. Inyecta las tarjetas en el template HTML y escribe public/index.html
 *
 *  Notas de arquitectura:
 *  - Categoría Pública es flexible: se lee lo que venga de Notion, sin lista fija.
 *    El equipo puede agregar nuevas categorías sin tocar código.
 *  - Para lanzar un micrositio para otro producto (ej. CANVAS, Sorteo), duplicar
 *    este proyecto y cambiar PRODUCT_CONFIG.name y el template.
 */

import { Client } from '@notionhq/client';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ————— Configuración por producto —————
const PRODUCT_CONFIG = {
  // Nombres del producto en la base "Productos y herramientas" que cuentan como
  // coincidencia. Acepta varios para soportar renombres sin romper el sitio
  // (actualmente se llama "ACADEMICS", pero va a ser renombrado a "Academics Tutores").
  // La comparación es case-insensitive. Cuando el renombre esté 100% consolidado,
  // puedes dejar solo el nombre nuevo.
  productNames: ['Academics Tutores', 'ACADEMICS'],

  // Etiqueta bonita para mostrar en el sitio y en logs.
  displayName: 'Academics Tutores',

  databaseId: process.env.NOTION_DATABASE_ID,
  outputDir: 'public',
  template: 'templates/index.template.html',

  // Nombres EXACTOS de las propiedades en Notion (respeta mayúsculas y acentos).
  properties: {
    title: 'Título de manual',
    description: 'Descripción Corta',
    category: 'Categoría Pública',
    duration: 'Duración Estimada',
    type: 'Tipo de Recurso',
    status: 'Estado',
    visible: 'Visible en micrositio',
    url: 'URL',
    productRollup: 'Rollup', // Rollup que devuelve el nombre del producto relacionado
  },

  // Overrides de slug para categorías con nombres complicados.
  // Si no se define aquí, el slug se genera automáticamente desde el nombre.
  categorySlugOverrides: {
    // 'Categoría con nombre complicado': 'slug-custom',
  },
};

// ————— Helpers para leer propiedades de Notion —————
const prop = {
  title: (p) => p?.title?.map(t => t.plain_text).join('') || '',
  rich: (p) => p?.rich_text?.map(t => t.plain_text).join('') || '',
  select: (p) => p?.select?.name || '',
  multiSelect: (p) => p?.multi_select?.map(s => s.name) || [],
  status: (p) => p?.status?.name || '',
  url: (p) => p?.url || '',
  checkbox: (p) => !!p?.checkbox,
  rollupTitles: (p) => {
    if (!p?.rollup?.array) return [];
    return p.rollup.array
      .map(item => item?.title?.map(t => t.plain_text).join('') || '')
      .filter(Boolean);
  },
};

// ————— Paleta de thumbnails (se asignan rotando por índice) —————
const THUMB_POOL = [
  'thumb-instalacion',
  'thumb-familia',
  'thumb-facturacion',
  'thumb-estado',
  'thumb-transferencia',
  'thumb-online',
  'thumb-reinscripcion',
  'thumb-bienvenida',
  'thumb-perfiles',
];

const SVG_ICONS = {
  'thumb-instalacion': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  'thumb-bienvenida': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>`,
  'thumb-familia': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  'thumb-perfiles': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  'thumb-facturacion': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  'thumb-estado': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  'thumb-transferencia': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><line x1="3" y1="5" x2="21" y2="5"/><polyline points="7 23 3 19 7 15"/><line x1="21" y1="19" x2="3" y2="19"/></svg>`,
  'thumb-online': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>`,
  'thumb-reinscripcion': `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
};

const PLAY_BUTTON_SVG = `<svg class="tc-thumb-icon" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>`;

// ————— Utilidades —————
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCategorySlug(category, config) {
  return config.categorySlugOverrides[category] || slugify(category) || 'sin-categoria';
}

// ————— Generador de tarjeta —————
function renderCard(item, index, config) {
  const category = item.category || 'Sin categoría';
  const catSlug = getCategorySlug(category, config);
  const isVideo = item.type === 'Video';

  const thumbClass = THUMB_POOL[index % THUMB_POOL.length];
  const icon = isVideo ? PLAY_BUTTON_SVG : (SVG_ICONS[thumbClass] || SVG_ICONS['thumb-instalacion']);

  const typeLabel = isVideo ? 'Video' : 'PDF';
  const typeClass = isVideo ? 'tc-type video' : 'tc-type';
  const actionLabel = isVideo ? 'Ver video' : 'Descargar PDF';

  const hasUrl = item.url && item.url.trim().length > 0;
  const metaText = item.duration || (isVideo ? 'Video' : '');

  const actionHtml = hasUrl
    ? `<a class="tc-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
         ${actionLabel}
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
       </a>`
    : `<span class="tc-pending">Próximamente</span>`;

  return `
      <article class="tutorial-card" data-cat="${catSlug}">
        <div class="tc-thumb ${thumbClass}">
          <div class="tc-thumb-pattern"></div>
          <span class="${typeClass}"><span class="tc-type-dot"></span>${typeLabel}</span>
          ${icon}
        </div>
        <div class="tc-body">
          <div class="tc-cat">${escapeHtml(category)}</div>
          <h3 class="tc-title">${escapeHtml(item.title)}</h3>
          <p class="tc-desc">${escapeHtml(item.description)}</p>
          <div class="tc-actions">
            ${actionHtml}
            ${metaText ? `<span class="tc-meta">${escapeHtml(metaText)}</span>` : ''}
          </div>
        </div>
      </article>`;
}

// ————— Botones de filtro de categoría (generados dinámicamente) —————
function renderCategoryFilter(categories, config) {
  const buttons = [`<button class="cat-btn active" data-filter="all">Todos</button>`];
  categories.forEach(cat => {
    const slug = getCategorySlug(cat, config);
    buttons.push(`<button class="cat-btn" data-filter="${slug}">${escapeHtml(cat)}</button>`);
  });
  return buttons.join('\n      ');
}

function renderEmptyState() {
  return `
      <div class="empty-state">
        <h3>Pronto publicaremos los primeros tutoriales</h3>
        <p>Nuestro equipo está preparando los materiales. Vuelve pronto.</p>
      </div>`;
}

// ————— Obtención de datos desde Notion —————
async function fetchTutorials(notion, config) {
  console.log(`→ Consultando base de Notion...`);
  console.log(`  Producto: ${config.displayName}`);
  console.log(`  Nombres aceptados en el rollup: ${config.productNames.join(', ')}`);

  const pages = [];
  let cursor;

  // Filtros a nivel API: Estado + Visible. El filtro por producto se hace en memoria
  // porque filtrar rollups con la API de Notion es frágil.
  do {
    const response = await notion.databases.query({
      database_id: config.databaseId,
      start_cursor: cursor,
      filter: {
        and: [
          { property: config.properties.status, status: { equals: 'Actualizado' } },
          { property: config.properties.visible, checkbox: { equals: true } },
        ],
      },
      page_size: 100,
    });

    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`  ${pages.length} manuales cumplen Estado=Actualizado + Visible=✓`);

  // Filtrado en memoria por producto (match contra la lista de nombres aceptados)
  const acceptedNames = config.productNames.map(n => n.toLowerCase());
  const filtered = pages.filter(page => {
    const productNames = prop.rollupTitles(page.properties[config.properties.productRollup]);
    return productNames.some(n => acceptedNames.includes(n.toLowerCase()));
  });

  console.log(`✓ ${filtered.length} manuales del producto "${config.displayName}"`);

  return filtered.map(page => ({
    id: page.id,
    title: prop.title(page.properties[config.properties.title]),
    description: prop.rich(page.properties[config.properties.description]),
    category: prop.select(page.properties[config.properties.category]),
    duration: prop.select(page.properties[config.properties.duration]),
    type: prop.select(page.properties[config.properties.type]),
    url: prop.url(page.properties[config.properties.url]),
  }));
}

// ————— Build principal —————
async function build() {
  if (!process.env.NOTION_TOKEN) throw new Error('Falta la variable de entorno NOTION_TOKEN');
  if (!process.env.NOTION_DATABASE_ID) throw new Error('Falta la variable de entorno NOTION_DATABASE_ID');

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const config = PRODUCT_CONFIG;

  // 1. Leer Notion
  const tutorials = await fetchTutorials(notion, config);

  // 2. Descubrir categorías presentes (dinámico, sin lista fija)
  const categoriesSeen = [];
  tutorials.forEach(t => {
    if (t.category && !categoriesSeen.includes(t.category)) categoriesSeen.push(t.category);
  });

  // 3. Ordenar: por orden de categoría descubierta, luego Manual antes que Video, luego título
  tutorials.sort((a, b) => {
    const ai = categoriesSeen.indexOf(a.category);
    const bi = categoriesSeen.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    if (a.type !== b.type) return a.type === 'Manual' ? -1 : 1;
    return a.title.localeCompare(b.title, 'es');
  });

  // 4. Generar HTML
  const cardsHtml = tutorials.map((t, i) => renderCard(t, i, config)).join('\n');
  const filterHtml = renderCategoryFilter(categoriesSeen, config);

  // 5. Leer template y reemplazar marcadores
  const templatePath = join(ROOT, config.template);
  const template = await readFile(templatePath, 'utf-8');

  const now = new Date();
  const lastUpdated = now.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const html = template
    .replace('{{TUTORIAL_CARDS}}', cardsHtml || renderEmptyState())
    .replace('{{CATEGORY_FILTER}}', filterHtml)
    .replace(/{{LAST_UPDATED}}/g, lastUpdated)
    .replace(/{{TOTAL_COUNT}}/g, String(tutorials.length));

  // 6. Escribir output
  const outputDir = join(ROOT, config.outputDir);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'index.html'), html, 'utf-8');

  // 7. Snapshot JSON para debugging
  await mkdir(join(ROOT, 'data'), { recursive: true });
  await writeFile(
    join(ROOT, 'data', 'tutorials.json'),
    JSON.stringify({
      generatedAt: now.toISOString(),
      product: config.displayName,
      count: tutorials.length,
      categories: categoriesSeen,
      tutorials,
    }, null, 2),
    'utf-8'
  );

  console.log(`\n✓ Sitio generado: ${outputDir}/index.html`);
  console.log(`  ${tutorials.length} manuales · ${categoriesSeen.length} categorías`);
  console.log(`  Categorías: ${categoriesSeen.join(', ') || '(ninguna)'}`);
  console.log(`  Última actualización: ${lastUpdated}`);
}

build().catch(err => {
  console.error('\n✗ Error en el build:', err.message);
  if (err.body) console.error('  Detalles:', JSON.stringify(err.body, null, 2));
  process.exit(1);
});
