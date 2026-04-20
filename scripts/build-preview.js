/**
 * ————————————————————————————————————————————————————————————————————
 *  PREVIEW — Generador con datos simulados (sin conexión a Notion)
 * ————————————————————————————————————————————————————————————————————
 *  Ejecutar con:  npm run preview
 *  Luego abrir:   public/index.html en tu navegador
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ————— Datos simulados: manuales —————
const MOCK_TUTORIALS = [
  { id: 'mock-1', title: 'Acceso e instalación', description: 'Cómo ingresar desde colegiosaltum.mx/academics y descargar la app móvil en iOS y Android.', category: 'Primeros pasos', duration: '1-2 min', type: 'Manual', url: 'https://example.com/manual-acceso.pdf' },
  { id: 'mock-2', title: 'Minitutorial de bienvenida', description: 'Un recorrido guiado por las funciones principales de la plataforma para nuevos usuarios.', category: 'Primeros pasos', duration: '3-5 min', type: 'Video', url: '' },
  { id: 'mock-3', title: 'Administrador de familiares', description: 'Cómo gestionar a todos tus hijos desde una misma sesión y cambiar entre perfiles fácilmente.', category: 'Gestión de familia', duration: '3-5 min', type: 'Manual', url: 'https://example.com/manual-familia.pdf' },
  { id: 'mock-4', title: 'Cambio entre perfiles de hijos', description: 'Navega entre los perfiles de todos tus hijos sin cerrar sesión, desde preescolar hasta secundaria.', category: 'Gestión de familia', duration: '1-2 min', type: 'Video', url: 'https://example.com/video-perfiles' },
  { id: 'mock-5', title: 'Registrar datos de facturación', description: 'Cómo dar de alta tus datos fiscales, incluyendo la carga de la constancia de situación fiscal.', category: 'Facturación', duration: '3-5 min', type: 'Manual', url: 'https://example.com/manual-facturacion.pdf' },
  { id: 'mock-6', title: 'Consulta del estado de cuenta', description: 'Revisa tu historial de movimientos, saldos pendientes y descarga tus facturas electrónicas.', category: 'Facturación', duration: '3-5 min', type: 'Manual', url: 'https://example.com/manual-estado.pdf' },
  { id: 'mock-7', title: 'Pago de colegiaturas — transferencia', description: 'Instrucciones y referencias bancarias para pagar mediante transferencia SPEI a BBVA o Santander.', category: 'Pagos', duration: '3-5 min', type: 'Manual', url: 'https://example.com/manual-transferencia.pdf' },
  { id: 'mock-8', title: 'Pago de colegiaturas en línea', description: 'Paga con tarjeta de crédito o débito mediante la pasarela segura integrada con BBVA y Santander.', category: 'Pagos', duration: '6-10 min', type: 'Video', url: '' },
  { id: 'mock-9', title: 'Pago de reinscripción', description: 'Proceso paso a paso para completar el trámite de reinscripción de tus hijos para el siguiente ciclo escolar.', category: 'Pagos', duration: '6-10 min', type: 'Manual', url: 'https://example.com/manual-reinscripcion.pdf' },
];

// ————— Datos simulados: FAQs (las 4 reales cargadas en Notion) —————
const MOCK_FAQS = [
  {
    id: 'faq-1',
    question: '¿Cómo puedo facturar?',
    answer: '• ⚠️ Registrar tus datos fiscales antes de realizar cualquier pago ⚠️<br>• Registra tus datos fiscales desde la versión web de Academics Tutores: Opción Facturas/Datos fiscales.<br>• Para confirmar datos correctos, se sugiere subir constancia de situación fiscal.<br>• Si fuera necesario, se puede agregar RFCs extra. Cuando usted lo requiera poder elegir el RFC a facturar, previo a realizar el pago. El último registro será con el que el sistema realice la factura.',
    order: 1,
  },
  {
    id: 'faq-2',
    question: '¿Cuáles son los canales de pago disponibles?',
    answer: '• Santander. Pago en la APP, en el portal web, transferencia, efectivo (cajero inteligente) y ventanilla bancaria (genera comisión).<br>• BBVA. Pago en la APP, en el portal web, transferencia, efectivo (cajero inteligente) y ventanilla bancaria (genera comisión).<br>• En el Colegio solo se recibe pago del total de la inscripción-reinscripción a través de TPV (Terminal Punto de Venta) por lo que no existen los pagos en efectivo.',
    order: 2,
  },
  {
    id: 'faq-3',
    question: '¿Cómo puedo solicitar un reembolso?',
    answer: '• Presentar comprobante de pago original, carta motivo de reembolso, copia de INE y carátula de cuenta bancaria para poder realizar la devolución; directamente con el enlace administrativo del Colegio.<br>• La programación de la devolución se realiza de acuerdo al calendario interno, a través del enlace administrativo del Colegio se le indicará la fecha en la que queda programada.',
    order: 3,
  },
  {
    id: 'faq-4',
    question: '¿Cómo puedo realizar una aclaración sobre el estado de cuenta del alumno?',
    answer: 'Directamente con el enlace administrativo del colegio, ya sea de manera presencial en el colegio o a través de los medios oficiales a disposición.',
    order: 4,
  },
];

const THUMB_POOL = ['thumb-instalacion','thumb-familia','thumb-facturacion','thumb-estado','thumb-transferencia','thumb-online','thumb-reinscripcion','thumb-bienvenida','thumb-perfiles'];

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

function renderCard(item, index) {
  const category = item.category || 'Sin categoría';
  const catSlug = slugify(category);
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

function renderCategoryFilter(categories) {
  const buttons = [`<button class="cat-btn active" data-filter="all">Todos</button>`];
  categories.forEach(cat => {
    buttons.push(`<button class="cat-btn" data-filter="${slugify(cat)}">${escapeHtml(cat)}</button>`);
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

async function buildPreview() {
  console.log('→ Generando preview con datos simulados (sin Notion)...');

  const tutorials = [...MOCK_TUTORIALS];
  const faqs = [...MOCK_FAQS];

  const categoriesSeen = [];
  tutorials.forEach(t => { if (t.category && !categoriesSeen.includes(t.category)) categoriesSeen.push(t.category); });

  tutorials.sort((a, b) => {
    const ai = categoriesSeen.indexOf(a.category);
    const bi = categoriesSeen.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    if (a.type !== b.type) return a.type === 'Manual' ? -1 : 1;
    return a.title.localeCompare(b.title, 'es');
  });

  faqs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const cardsHtml = tutorials.map((t, i) => renderCard(t, i)).join('\n');
  const filterHtml = renderCategoryFilter(categoriesSeen);
  const faqsHtml = faqs.map(renderFaqItem).join('\n');

  const template = await readFile(join(ROOT, 'templates/index.template.html'), 'utf-8');
  const now = new Date();
  const lastUpdated = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' }) + ' (PREVIEW)';

  const html = template
    .replace('{{TUTORIAL_CARDS}}', cardsHtml)
    .replace('{{CATEGORY_FILTER}}', filterHtml)
    .replace('{{FAQ_ITEMS}}', faqsHtml)
    .replace(/{{LAST_UPDATED}}/g, lastUpdated)
    .replace(/{{TOTAL_COUNT}}/g, String(tutorials.length));

  const outputDir = join(ROOT, 'public');
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'index.html'), html, 'utf-8');

  console.log(`\n✓ Preview generado en public/index.html`);
  console.log(`  ${tutorials.length} manuales simulados · ${faqs.length} FAQs (reales de Notion)`);
  console.log(`  Categorías: ${categoriesSeen.join(', ')}`);
  console.log(`\n  → Abre public/index.html en tu navegador para verlo`);
}

buildPreview().catch(err => { console.error('✗ Error:', err.message); process.exit(1); });
