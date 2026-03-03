// ═══════════════════════════════════════════════
// WANTED — devlogs.js
// Post management, image upload, lightbox
// ═══════════════════════════════════════════════

const STORAGE_KEY   = 'wanted_devlogs_v1';
const ADMIN_PASSWORD = 'sanlandero2026'; 

// ── STORAGE ──────────────────────────────────────
function loadPosts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
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

function renderPosts() {
  const posts     = loadPosts();
  const container = document.getElementById('devlogList');

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📜</span>
        <h3>Sin entradas todavía</h3>
        <p>Documenta tu progreso publicando<br>la primera entrada del devlog.</p>
      </div>`;
    return;
  }

  container.innerHTML = posts.map((post, i) => `
    <div class="devlog-card reveal" style="animation-delay:${i * 0.1}s">
      <div class="devlog-card-header">
        <div class="devlog-meta">
          <div class="devlog-number">Devlog #${posts.length - i} &nbsp;·&nbsp; ${escHtml(post.entrega)}</div>
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
        ${post.logros ? `
        <ul>
          ${post.logros.split('\n').filter(l => l.trim()).map(l =>
            `<li>${escHtml(l.replace(/^[•\-*]\s*/, ''))}</li>`
          ).join('')}
        </ul>` : ''}

        ${post.images?.length ? `
        <div class="devlog-images">
          ${post.images.map(img => `
            <div class="devlog-img-wrap" onclick="openLightbox('${img.data}','${escHtml(img.caption||'')}')">
              <img src="${img.data}" alt="Screenshot devlog" loading="lazy">
              ${img.caption ? `<div class="img-caption">${escHtml(img.caption)}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}
      </div>

      <div class="devlog-footer-row">
        <div class="devlog-progress">
          <span class="progress-label">Progreso</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${post.progress || 0}%"></div>
          </div>
          <span class="progress-pct">${post.progress || 0}%</span>
        </div>
        <button
          onclick="deletePost(${i})"
          style="background:none;border:none;color:rgba(237,224,196,0.2);font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;cursor:pointer;transition:color 0.2s"
          onmouseover="this.style.color='var(--blood)'"
          onmouseout="this.style.color='rgba(237,224,196,0.2)'">
          ELIMINAR
        </button>
      </div>
    </div>
  `).join('');

  // Re-observe reveals
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));

  updateProgressBars(posts);
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });

function updateProgressBars(posts) {
  if (!posts.length) return;
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
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function toggleTag(btn) { btn.classList.toggle('selected'); }

function submitPost() {
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

  const tags    = [...document.querySelectorAll('.tag-btn.selected')].map(b => b.dataset.tag);
  const now     = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  const post = {
    title,
    content,
    logros:   document.getElementById('postLogros').value.trim(),
    tags,
    entrega:  document.getElementById('postEntrega').value,
    progress: parseInt(document.getElementById('postProgress').value),
    images:   pendingImages.slice(),
    date:     dateStr,
    timestamp: now.getTime(),
  };

  const posts = loadPosts();
  posts.unshift(post);
  savePosts(posts);

  // Reset form
  ['postTitle','postContent','postLogros','postPassword'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('postProgress').value = 25;
  document.getElementById('progressVal').textContent = '25';
  document.getElementById('previewGrid').innerHTML = '';
  document.querySelectorAll('.tag-btn.selected').forEach(b => b.classList.remove('selected'));
  pendingImages = [];

  closeModal();
  renderPosts();
}

function deletePost(index) {
  const pass = prompt('Contraseña de admin:');
  if (pass !== ADMIN_PASSWORD) { alert('Contraseña incorrecta.'); return; }
  if (!confirm('¿Eliminar esta entrada?')) return;
  const posts = loadPosts();
  posts.splice(index, 1);
  savePosts(posts);
  renderPosts();
}

// ── IMAGE HANDLING ────────────────────────────────
let pendingImages = [];

function handleImages(files) {
  const remaining = 5 - pendingImages.length;
  Array.from(files).slice(0, remaining).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      pendingImages.push({ data: e.target.result, caption: '' });
      renderPreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderPreview() {
  document.getElementById('previewGrid').innerHTML = pendingImages.map((img, i) => `
    <div class="preview-item">
      <img src="${img.data}" alt="preview">
      <button class="preview-remove" onclick="removeImage(${i})">×</button>
    </div>
  `).join('');
}

function removeImage(index) {
  pendingImages.splice(index, 1);
  renderPreview();
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

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLightbox(); closeModal(); }
  });

  // Drag-and-drop upload
  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      handleImages(e.dataTransfer.files);
    });
  }

  // Init reveal observer for static elements
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});
