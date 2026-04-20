/**
 * ————————————————————————————————————————————————————————————————————
 *  Sincronizador Notion → Micrositio HTML
 *  Colegios Altum · Academics Tutores (extensible a otros productos DIT)
 * ————————————————————————————————————————————————————————————————————
 *
 *  Filtra por el ID directo de la página relacionada (no por rollup)
 *  para evitar depender del acceso a la base "Productos y herramientas".
 */

import { Client } from '@notionhq/client';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PRODUCT_CONFIG = {
  // IDs exactos de las páginas en la base "Productos y herramientas" que cuentan como coincidencia.
  // Aceptamos varios para soportar convivencia de "Academics Tutores" (nuevo) y "ACADEMICS" (legacy).
  productPageIds: [
    '28f08c5f-6bd7-8064-b878-c1ec2c67724e', // Academics Tutores
    '1f808c5f-6bd7-8139-bed5-cce663b79642', // ACADEMICS (legacy)
  ],
  displayName: 'Academics Tutores',
  manualsDatabaseId: process.env.NOTION_DATABASE_ID,
  faqsDatabaseId: process.env.NOTION_FAQS_DATABASE_ID,
  outputDir: 'public',
  template: 'templates/index.template.html',
  manualProperties: {
    title: 'Título de manual',
    description: 'Descripción Corta',
    category: 'Categoría Pública',
    duration: 'Duración Estimada',
    type: 'Tipo de Recurso',
    status: 'Estado',
    visible: 'Visible en micrositio',
    url: 'URL',
    productRelation: 'Herramienta o Producto', // Relación directa (no rollup)
  },
  faqProperties: {
    question: 'Pregunta',
    answer: 'Respuesta',
    order: 'Orden',
    status: 'Estado',
    visible: 'Visible en micrositio',
    productRelation: 'Herramienta o Producto', // Relación directa (no rollup)
  },
  categorySlugOverrides: {},
};

const prop = {
  title: (p) => p?.title?.map(t => t.plain_text).join('') || '',
  rich: (p) => p?.rich_text?.map(t => t.plain_text).join('') || '',
  select: (p) => p?.select?.name || '',
  status: (p) => p?.status?.name || '',
  url: (p) => p?.url || '',
  checkbox: (p) => !!p?.checkbox,
  number: (p) => (typeof p?.number === 'number' ? p.number : null),
  relationIds: (p) => {
    if (!p?.relation) return [];
    return p.relation.map(r => r?.id || '').filter(Boolean);
  },
};

function normalizeId(id) {
  // Normaliza IDs removiendo guiones para comparación consistente
  return String(id || '').replace(/-/g, '').toLowerCase();
}

const THUMB_POOL = [
  'thumb-instalacion', 'thumb-familia', 'thumb-facturacion', 'thumb-estado',
  'thumb-transferencia', 'thumb-online', 'thumb-reinscripcion', 'thumb-bienvenida',
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

function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slugify(str = '') {
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getCategorySlug(category, config) {
  return config.categorySlugOverrides[category] || slugify(category) || 'sin-categoria';
}

function formatAnswerText(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/&lt;br\s*\/?&gt;/gi, '\n');
  const lines = html.split(/\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';
  const output = [];
  let currentList = null;
  for (const line of lines) {
    if (line.startsWith('•')) {
      if (!currentList) currentList = [];
      currentList.push(`<li>${line.substring(1).trim()}</li>`);
    } else {
      if (currentList) {
        output.push(`<ul>${currentList.join('')}</ul>`);
        currentList = null;
      }
      output.push(`<p>${line}</p>`);
    }
  }
  if (currentList) output.push(`<ul>${currentList.join('')}</ul>`);
  return output.join('');
}

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
    ? `<a class="tc-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${actionLabel}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`
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

function renderCategoryFilter(categories, config) {
  const buttons = [`<button class="cat-btn active" data-filter="all">Todos</button>`];
  categories.forEach(cat => {
    const slug = getCategorySlug(cat, config);
    buttons.push(`<button class="cat-btn" data-filter="${slug}">${escapeHtml(cat)}</button>`);
  });
  return buttons.join('\n      ');
}

function renderFaqItem(faq) {
  return `
      <div class="faq-item">
        <button class="faq-q">${escapeHtml(faq.question)} <span class="faq-icon">+</span></button>
        <div class="faq-a">${formatAnswerText(faq.answer)}</div>
      </div>`;
}

function renderEmptyState() {
  return `<div class="empty-state"><h3>Pronto publicaremos los primeros tutoriales</h3><p>Nuestro equipo está preparando los materiales. Vuelve pronto.</p></div>`;
}

function renderEmptyFaqs() {
  return `<div class="empty-state" style="margin: 0;"><h3>Estamos preparando las preguntas frecuentes</h3><p>Muy pronto encontrarás aquí las respuestas a las dudas más comunes.</p></div>`;
}

async function fetchManuals(notion, config) {
  console.log(`→ Consultando base "Registro de manuales"...`);
  const pages = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: config.manualsDatabaseId,
      start_cursor: cursor,
      filter: {
        and: [
          { property: config.manualProperties.status, status: { equals: 'Actualizado' } },
          { property: config.manualProperties.visible, checkbox: { equals: true } },
        ],
      },
      page_size: 100,
    });
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  console.log(`  ${pages.length} manuales con Estado=Actualizado + Visible=✓`);

  const acceptedIds = config.productPageIds.map(normalizeId);
  const filtered = pages.filter(page => {
    const relationIds = prop.relationIds(page.properties[config.manualProperties.productRelation]);
    return relationIds.some(id => acceptedIds.includes(normalizeId(id)));
  });
  console.log(`✓ ${filtered.length} manuales de "${config.displayName}"`);

  return filtered.map(page => ({
    id: page.id,
    title: prop.title(page.properties[config.manualProperties.title]),
    description: prop.rich(page.properties[config.manualProperties.description]),
    category: prop.select(page.properties[config.manualProperties.category]),
    duration: prop.select(page.properties[config.manualProperties.duration]),
    type: prop.select(page.properties[config.manualProperties.type]),
    url: prop.url(page.properties[config.manualProperties.url]),
  }));
}

async function fetchFaqs(notion, config) {
  if (!config.faqsDatabaseId) {
    console.log(`→ (FAQs omitidas: NOTION_FAQS_DATABASE_ID no definido)`);
    return [];
  }
  console.log(`→ Consultando base "FAQs - Micrositios CDP"...`);
  const pages = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: config.faqsDatabaseId,
      start_cursor: cursor,
      filter: {
        and: [
          { property: config.faqProperties.status, status: { equals: 'Actualizado' } },
          { property: config.faqProperties.visible, checkbox: { equals: true } },
        ],
      },
      page_size: 100,
    });
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  console.log(`  ${pages.length} FAQs con Estado=Actualizado + Visible=✓`);

  const acceptedIds = config.productPageIds.map(normalizeId);
  const filtered = pages.filter(page => {
    const relationIds = prop.relationIds(page.properties[config.faqProperties.productRelation]);
    return relationIds.some(id => acceptedIds.includes(normalizeId(id)));
  });
  console.log(`✓ ${filtered.length} FAQs de "${config.displayName}"`);

  return filtered.map(page => ({
    id: page.id,
    question: prop.title(page.properties[config.faqProperties.question]),
    answer: prop.rich(page.properties[config.faqProperties.answer]),
    order: prop.number(page.properties[config.faqProperties.order]),
  }));
}

async function build() {
  if (!process.env.NOTION_TOKEN) throw new Error('Falta la variable de entorno NOTION_TOKEN');
  if (!process.env.NOTION_DATABASE_ID) throw new Error('Falta la variable de entorno NOTION_DATABASE_ID');

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const config = PRODUCT_CONFIG;

  const [manuals, faqs] = await Promise.all([
    fetchManuals(notion, config),
    fetchFaqs(notion, config),
  ]);

  const categoriesSeen = [];
  manuals.forEach(t => {
    if (t.category && !categoriesSeen.includes(t.category)) categoriesSeen.push(t.category);
  });

  manuals.sort((a, b) => {
    const ai = categoriesSeen.indexOf(a.category);
    const bi = categoriesSeen.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    if (a.type !== b.type) return a.type === 'Manual' ? -1 : 1;
    return a.title.localeCompare(b.title, 'es');
  });

  faqs.sort((a, b) => {
    if (a.order == null && b.order == null) return a.question.localeCompare(b.question, 'es');
    if (a.order == null) return 1;
    if (b.order == null) return -1;
    return a.order - b.order;
  });

  const cardsHtml = manuals.map((t, i) => renderCard(t, i, config)).join('\n');
  const filterHtml = renderCategoryFilter(categoriesSeen, config);
  const faqsHtml = faqs.map(renderFaqItem).join('\n');

  const template = await readFile(join(ROOT, config.template), 'utf-8');
  const now = new Date();
  const lastUpdated = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' });

  const html = template
    .replace('{{TUTORIAL_CARDS}}', cardsHtml || renderEmptyState())
    .replace('{{CATEGORY_FILTER}}', filterHtml)
    .replace('{{FAQ_ITEMS}}', faqsHtml || renderEmptyFaqs())
    .replace(/{{LAST_UPDATED}}/g, lastUpdated)
    .replace(/{{TOTAL_COUNT}}/g, String(manuals.length));

  const outputDir = join(ROOT, config.outputDir);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'index.html'), html, 'utf-8');

  // Copiar assets estáticos (favicons, imágenes) al output
  const assetsSrc = join(ROOT, 'assets');
  const assetsDest = join(outputDir, 'assets');
  try {
    await cp(assetsSrc, assetsDest, { recursive: true });
    console.log(`✓ Assets copiados a ${assetsDest}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`  (Sin carpeta assets/ que copiar)`);
    } else {
      throw err;
    }
  }

  await mkdir(join(ROOT, 'data'), { recursive: true });
  await writeFile(
    join(ROOT, 'data', 'tutorials.json'),
    JSON.stringify({
      generatedAt: now.toISOString(),
      product: config.displayName,
      manuals: { count: manuals.length, items: manuals },
      faqs: { count: faqs.length, items: faqs },
      categories: categoriesSeen,
    }, null, 2),
    'utf-8'
  );

  console.log(`\n✓ Sitio generado: ${outputDir}/index.html`);
  console.log(`  ${manuals.length} manuales · ${faqs.length} FAQs · ${categoriesSeen.length} categorías`);
  console.log(`  Última actualización: ${lastUpdated}`);
}

build().catch(err => {
  console.error('\n✗ Error en el build:', err.message);
  if (err.body) console.error('  Detalles:', JSON.stringify(err.body, null, 2));
  process.exit(1);
});
