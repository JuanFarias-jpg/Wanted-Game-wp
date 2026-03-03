// ================================================
// WANTED — devlogs.js
// Carga y renderiza los posts desde devlogs.json
// El modal genera el JSON actualizado para pegar
// en GitHub sin necesidad de backend
// ================================================

// Contrasena que protege la publicacion de entradas
// Cambiar este valor antes de subir al repositorio
const ADMIN_PASSWORD = 'sanlandero2026';

// ================================================
// CARGA DE POSTS
// Fetch a devlogs.json en el mismo repositorio
// El cache-bust evita leer una version desactualizada
// ================================================
async function loadPosts() {
  try {
    const res = await fetch(`devlogs.json?_=${Date.now()}`);
    if (!res.ok) throw new Error('no json');
    return await res.json();
  } catch {
    return [];
  }
}

// Escapa caracteres HTML para evitar inyeccion de codigo
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Etiquetas legibles para cada tag tecnico
const TAG_LABELS = {
  unreal: 'Unreal Engine', blender: 'Blender',
  design: 'Diseno',        art: 'Arte',
  mechanics: 'Mecanicas',  ui: 'UI'
};

// ================================================
// RENDERIZADO DE POSTS
// Lee devlogs.json y construye el HTML de cada
// entrada en el contenedor #devlogList
// ================================================
async function renderPosts() {
  const posts     = await loadPosts();
  const container = document.getElementById('devlogList');

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">—</div>
        <h3>Sin entradas todavia</h3>
        <p>Agrega tu primer devlog al archivo<br>
           <code style="color:var(--amber);background:rgba(200,131,42,0.1);padding:2px 8px">devlogs.json</code></p>
      </div>`;
    return;
  }

  // Ordena de mas reciente a mas antiguo por id
  const sorted = [...posts].sort((a, b) => b.id - a.id);

  container.innerHTML = sorted.map((post, i) => `
    <div class="devlog-card reveal" style="animation-delay:${i * 0.1}s">
      <div class="devlog-card-header">
        <div class="devlog-meta">
          <div class="devlog-number">Devlog #${post.id} &nbsp;·&nbsp; ${escHtml(post.entrega)}</div>
          <div class="devlog-title">${escHtml(post.title)}</div>
        </div>
        <div class="devlog-date">${escHtml(post.date)}</div>
      </div>

      ${post.tags?.length ? `
      <div class="devlog-tags">
        ${post.tags.map(t => `<span class="tag tag-${t}">${TAG_LABELS[t] || t}</span>`).join('')}
      </div>` : ''}

      <div class="devlog-body">
        <p>${escHtml(post.content).replace(/\n/g, '<br>')}</p>
        ${post.logros?.length ? `
        <ul>${post.logros.map(l => `<li>${escHtml(l)}</li>`).join('')}</ul>` : ''}

        ${post.images?.length ? `
        <div class="devlog-images">
          ${post.images.map(img => `
            <div class="devlog-img-wrap" onclick="openLightbox('${escHtml(img.url)}','${escHtml(img.caption||'')}')">
              <img src="${escHtml(img.url)}" alt="Screenshot" loading="lazy">
              ${img.caption ? `<div class="img-caption">${escHtml(img.caption)}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}
      </div>

      <div class="devlog-footer-row">
        <div class="devlog-progress">
          <span class="progress-label">Progreso</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${post.progress||0}%"></div></div>
          <span class="progress-pct">${post.progress||0}%</span>
        </div>
        <span style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;color:rgba(200,131,42,0.3)">
          ID ${post.id}
        </span>
      </div>
    </div>
  `).join('');

  // Reactiva el observer de scroll reveal para las nuevas cards
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
  updateProgressBars(sorted);
}

// Observer reutilizable para animar cards al entrar al viewport
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });

// ================================================
// BARRAS DE PROGRESO DEL SIDEBAR
// Calcula el porcentaje de cada area del proyecto
// sumando 20-25 puntos por cada post con el tag
// correspondiente, con maximo de 100
// ================================================
function updateProgressBars(posts) {
  const counts = { whiteroom: 0, landscape: 0, assets: 0, mecanicas: 0, ui: 0 };
  posts.forEach(p => {
    if (!p.tags) return;
    if (p.tags.includes('unreal') || p.tags.includes('design')) counts.whiteroom  = Math.min(counts.whiteroom  + 20, 100);
    if (p.tags.includes('art'))                                  counts.landscape  = Math.min(counts.landscape  + 20, 100);
    if (p.tags.includes('art') || p.tags.includes('blender'))   counts.assets     = Math.min(counts.assets     + 20, 100);
    if (p.tags.includes('mechanics'))                            counts.mecanicas  = Math.min(counts.mecanicas  + 25, 100);
    if (p.tags.includes('ui'))                                   counts.ui         = Math.min(counts.ui         + 25, 100);
  });
  Object.entries(counts).forEach(([key, pct]) => {
    const bar = document.getElementById(`bar-${key}`);
    const lbl = document.getElementById(`pct-${key}`);
    if (bar) bar.style.width    = pct + '%';
    if (lbl) lbl.textContent    = pct + '%';
  });
}

// ================================================
// MODAL
// ================================================
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('jsonOutput').style.display  = 'none';
  document.getElementById('modalForm').style.display   = 'block';
}

// Cierra el modal si el click fue en el overlay y no en el contenido
function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function toggleTag(btn) { btn.classList.toggle('selected'); }

// ================================================
// GENERAR JSON
// Construye el objeto del nuevo post, lo agrega
// al array existente y muestra el JSON completo
// listo para pegar en devlogs.json en GitHub
// ================================================
async function submitPost() {
  const pass = document.getElementById('postPassword').value;
  if (pass !== ADMIN_PASSWORD) {
    document.getElementById('passError').style.display = 'block';
    document.getElementById('postPassword').value = '';
    return;
  }
  document.getElementById('passError').style.display = 'none';

  const title   = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  if (!title || !content) { alert('Completa el titulo y el contenido.'); return; }

  const existing = await loadPosts();
  const nextId   = existing.length > 0 ? Math.max(...existing.map(p => p.id)) + 1 : 1;
  const tags     = [...document.querySelectorAll('.tag-btn.selected')].map(b => b.dataset.tag);
  const logros   = document.getElementById('postLogros').value.trim()
    .split('\n').filter(l => l.trim()).map(l => l.replace(/^[•\-*]\s*/, ''));
  const dateStr  = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  const newPost = {
    id:       nextId,
    title,
    date:     dateStr,
    entrega:  document.getElementById('postEntrega').value,
    tags,
    content,
    logros,
    progress: parseInt(document.getElementById('postProgress').value),
    images:   []
    // Para agregar imagenes: sube el archivo a images/devlogs/ en el repo
    // y agrega { "url": "images/devlogs/archivo.png", "caption": "..." }
  };

  const updated = [...existing, newPost];
  document.getElementById('jsonOutputCode').textContent = JSON.stringify(updated, null, 2);
  document.getElementById('modalForm').style.display    = 'none';
  document.getElementById('jsonOutput').style.display   = 'block';
}

// Copia el JSON generado al portapapeles
function copyJson() {
  navigator.clipboard.writeText(document.getElementById('jsonOutputCode').textContent).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copiado';
    setTimeout(() => btn.textContent = 'Copiar JSON', 2000);
  });
}

// ================================================
// LIGHTBOX
// Muestra una imagen en pantalla completa
// ================================================
function openLightbox(src, caption) {
  document.getElementById('lbImg').src            = src;
  document.getElementById('lbCaption').textContent = caption;
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

// ================================================
// INIT
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  renderPosts();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLightbox(); closeModal(); }
  });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});
