// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════

const ADMIN_PASSWORD = 'sanlandero2026'; 

// ── LOAD FROM JSON ────────────────────────────────
async function loadPosts() {
  try {
    const res = await fetch(`devlogs.json?_=${Date.now()}`);
    if (!res.ok) throw new Error('no json');
    return await res.json();
  } catch {
    return [];
  }
}

// ── RENDER ────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const TAG_LABELS = {
  unreal: 'Unreal Engine', blender: 'Blender',
  design: 'Diseño', art: 'Arte',
  mechanics: 'Mecánicas', ui: 'UI'
};

async function renderPosts() {
  const posts     = await loadPosts();
  const container = document.getElementById('devlogList');

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📜</span>
        <h3>Sin entradas todavía</h3>
        <p>Agrega tu primer devlog al archivo<br><code style="color:var(--amber);background:rgba(200,131,42,0.1);padding:2px 8px">devlogs.json</code></p>
      </div>`;
    return;
  }

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
        <span style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;color:rgba(200,131,42,0.3)">ID ${post.id}</span>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
  updateProgressBars(sorted);
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });

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
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = pct + '%';
  });
}

// ── MODAL ─────────────────────────────────────────
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('jsonOutput').style.display = 'none';
  document.getElementById('modalForm').style.display = 'block';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function toggleTag(btn) { btn.classList.toggle('selected'); }

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
  if (!title || !content) { alert('Por favor completa el título y contenido.'); return; }

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
  };

  const updated = [...existing, newPost];
  document.getElementById('jsonOutputCode').textContent = JSON.stringify(updated, null, 2);
  document.getElementById('modalForm').style.display = 'none';
  document.getElementById('jsonOutput').style.display = 'block';
}

function copyJson() {
  navigator.clipboard.writeText(document.getElementById('jsonOutputCode').textContent).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✓ Copiado';
    setTimeout(() => btn.textContent = 'Copiar JSON', 2000);
  });
}

// ── LIGHTBOX ──────────────────────────────────────
function openLightbox(src, caption) {
  document.getElementById('lbImg').src = src;
  document.getElementById('lbCaption').textContent = caption;
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderPosts();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); closeModal(); } });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});
