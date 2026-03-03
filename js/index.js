// ═══════════════════════════════════════════════
// Stars, 3D Viewer (Three.js)
// ═══════════════════════════════════════════════

// ── STAR GENERATOR ───────────────────────────────
function generateStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  for (let i = 0; i < 120; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText = `
      width:${size}px; height:${size}px;
      top:${Math.random() * 70}%;
      left:${Math.random() * 100}%;
      --dur:${(Math.random() * 4 + 2).toFixed(1)}s;
      --delay:${(Math.random() * 4).toFixed(1)}s;
    `;
    container.appendChild(star);
  }
}

// ── 3D VIEWER ────────────────────────────────────
const LOCATIONS = [
  {
    id:   'cantina',
    name: 'Cantina',
    desc: 'El corazón social de San Landero. Aquí corren el whiskey y las pistas.',
    color: 0x8B4513,
    shape: 'building',
    w: 3, h: 1.5, d: 2,
  },
  {
    id:   'iglesia',
    name: 'Iglesia',
    desc: 'Punto de guardado y redención. El campanario domina el pueblo.',
    color: 0xC8B89A,
    shape: 'church',
    w: 2, h: 2.5, d: 1.8,
  },
  {
    id:   'carcel',
    name: 'Cárcel',
    desc: 'Destino de los criminales capturados. Sus paredes guardan secretos.',
    color: 0x5C4A3A,
    shape: 'building',
    w: 2.5, h: 1.2, d: 1.5,
  },
  {
    id:   'establo',
    name: 'Establo',
    desc: 'Carreras de caballos y recompensas. La estructura más grande del pueblo.',
    color: 0x7B5E3A,
    shape: 'stable',
    w: 4, h: 1.4, d: 2.5,
  },
  {
    id:   'desierto',
    name: 'Desierto',
    desc: 'Donde se esconden los criminales. El desierto no perdona.',
    color: 0xC8A060,
    shape: 'terrain',
    w: 6, h: 0.1, d: 6,
  },
  {
    id:   'residencial',
    name: 'Zona Residencial',
    desc: 'Donde vive la gente de San Landero. Su confianza tiene valor.',
    color: 0x9B7B5A,
    shape: 'building',
    w: 2, h: 1.2, d: 1.8,
  },
];

let THREE, renderer, scene, camera, controls, animFrameId;
let currentMesh = null;
let isDragging = false, prevMouse = { x: 0, y: 0 };
let rotX = 0.3, rotY = 0.5;
let autoRotate = true;
let viewerReady = false;

function initViewer() {
  if (viewerReady) return;

  const canvas = document.getElementById('viewerCanvas');
  if (!canvas || typeof window.THREE === 'undefined') return;

  THREE = window.THREE;
  viewerReady = true;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  resizeRenderer();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0604);
  scene.fog = new THREE.Fog(0x0A0604, 12, 30);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 0, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0xfff5e0, 0.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFF9A3C, 1.4);
  sun.position.set(5, 8, 5);
  sun.castShadow = true;
  scene.add(sun);

  const fill = new THREE.PointLight(0xC8832A, 0.5, 20);
  fill.position.set(-4, 2, -2);
  scene.add(fill);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3D2510, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid
  const grid = new THREE.GridHelper(20, 20, 0x3D2510, 0x2A1A0E);
  grid.position.y = 0.01;
  scene.add(grid);

  // Load first location
  loadLocation(LOCATIONS[0]);

  // Mouse controls
  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; autoRotate = false; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging || !currentMesh) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    rotY += dx * 0.01;
    rotX += dy * 0.01;
    rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  // Touch controls
  let lastTouch = null;
  canvas.addEventListener('touchstart', e => { lastTouch = e.touches[0]; autoRotate = false; });
  canvas.addEventListener('touchmove', e => {
    if (!lastTouch || !currentMesh) return;
    const t = e.touches[0];
    rotY += (t.clientX - lastTouch.clientX) * 0.012;
    rotX += (t.clientY - lastTouch.clientY) * 0.012;
    rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
    lastTouch = t;
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('resize', resizeRenderer);

  animate();
  hideViewerPlaceholder();
}

function resizeRenderer() {
  if (!renderer) return;
  const canvas = document.getElementById('viewerCanvas');
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h);
  if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
}

function loadLocation(loc) {
  if (!scene || !THREE) return;
  if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }

  // Try GLB from models/ folder first, fall back to procedural
  if (window.GLTFLoader) {
    const loader = new window.GLTFLoader();
    loader.load(
      `models/${loc.id}.glb`,
      (gltf) => {
        if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const scale = 3 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += size.y * scale * 0.5;
        model.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
        scene.add(model);
        currentMesh = model;
        autoRotate = true;
        rotX = 0.25; rotY = 0.4;
        setViewerStatus(`✓ ${loc.name} — modelo real cargado`);
      },
      null,
      () => buildProceduralMesh(loc) // .glb no encontrado → usar procedural
    );
    return;
  }
  buildProceduralMesh(loc);
}

function setViewerStatus(msg) {
  const el = document.getElementById('viewerStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

function buildProceduralMesh(loc) {
  if (!scene || !THREE) return;
  if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }
  setViewerStatus(`Placeholder — agrega models/${loc.id}.glb para ver tu modelo`);

  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: loc.color, roughness: 0.8, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2A1A0E, roughness: 1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5C3A1A, roughness: 0.9 });

  if (loc.shape === 'building') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h, loc.d), mat);
    body.position.y = loc.h / 2;
    body.castShadow = true;
    group.add(body);

    // Facade strip
    const facade = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h * 0.3, 0.05), darkMat);
    facade.position.set(0, loc.h * 0.85, loc.d / 2 + 0.02);
    group.add(facade);

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.06), darkMat);
    door.position.set(0, 0.35, loc.d / 2 + 0.03);
    group.add(door);

    // Windows
    [-0.7, 0.7].forEach(x => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.06), new THREE.MeshStandardMaterial({ color: 0xC8A040, emissive: 0x6B4010, roughness: 0.3 }));
      win.position.set(x, loc.h * 0.6, loc.d / 2 + 0.03);
      group.add(win);
    });

  } else if (loc.shape === 'church') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h * 0.7, loc.d), mat);
    body.position.y = loc.h * 0.35;
    body.castShadow = true;
    group.add(body);

    // Steeple
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, loc.h * 0.6, 0.7), mat);
    tower.position.set(0, loc.h * 0.7 + loc.h * 0.3, 0);
    tower.castShadow = true;
    group.add(tower);

    // Pyramid top
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 4), roofMat);
    tip.position.set(0, loc.h * 0.7 + loc.h * 0.6 + 0.4, 0);
    tip.rotation.y = Math.PI / 4;
    tip.castShadow = true;
    group.add(tip);

    // Cross
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), darkMat);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), darkMat);
    crossV.position.set(0, loc.h * 1.45, 0);
    crossH.position.set(0, loc.h * 1.5, 0);
    group.add(crossV, crossH);

  } else if (loc.shape === 'stable') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h, loc.d), mat);
    body.position.y = loc.h / 2;
    body.castShadow = true;
    group.add(body);

    // Roof ridge
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, loc.w, 6), darkMat);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.y = loc.h + 0.6;
    group.add(ridge);

    // Roof slopes (two planes)
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(loc.w, 0.08, loc.d / 2 + 0.2), roofMat);
    roofL.rotation.x = -0.5;
    roofL.position.set(0, loc.h + 0.28, -loc.d / 4);
    group.add(roofL);

    const roofR = new THREE.Mesh(new THREE.BoxGeometry(loc.w, 0.08, loc.d / 2 + 0.2), roofMat);
    roofR.rotation.x = 0.5;
    roofR.position.set(0, loc.h + 0.28, loc.d / 4);
    group.add(roofR);

    // Stalls
    for (let i = -1; i <= 1; i++) {
      const stall = new THREE.Mesh(new THREE.BoxGeometry(0.08, loc.h * 0.6, loc.d), darkMat);
      stall.position.set(i * (loc.w / 3), loc.h * 0.3, 0);
      group.add(stall);
    }

  } else if (loc.shape === 'terrain') {
    // Desert terrain
    const geo = new THREE.PlaneGeometry(loc.w, loc.d, 12, 12);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getY(i);
      if (Math.abs(x) > 0.5 || Math.abs(z) > 0.5) {
        pos.setZ(i, (Math.random() - 0.5) * 0.3);
      }
    }
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: loc.color, roughness: 1 }));
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = 0.01;
    group.add(terrain);

    // Cactus
    [[1.5, 0.8], [-1.8, -1], [0.5, -1.5]].forEach(([x, z]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x3A6B2A }));
      trunk.position.set(x, 0.4, z);
      group.add(trunk);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x3A6B2A }));
      arm.rotation.z = Math.PI / 3;
      arm.position.set(x + 0.25, 0.6, z);
      group.add(arm);
    });
  }

  group.position.y = 0;
  scene.add(group);
  currentMesh = group;
  rotX = 0.25; rotY = 0.4;
  autoRotate = true;
  hideViewerPlaceholder();
}

function animate() {
  animFrameId = requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;

  if (autoRotate && currentMesh) rotY += 0.004;

  if (currentMesh) {
    currentMesh.rotation.y = rotY;
    currentMesh.rotation.x = 0;
  }

  renderer.render(scene, camera);
}

function hideViewerPlaceholder() {
  const overlay = document.getElementById('viewerPlaceholder');
  if (overlay) overlay.style.display = 'none';
  const canvas = document.getElementById('viewerCanvas');
  if (canvas) canvas.style.display = 'block';
}

function switchLocation(idx) {
  // Update tabs
  document.querySelectorAll('.viewer-tab').forEach((t, i) => t.classList.toggle('active', i === idx));

  const loc = LOCATIONS[idx];
  document.getElementById('viewerLocationName').textContent = loc.name;
  document.getElementById('viewerLocationDesc').textContent = loc.desc;

  if (!viewerReady) {
    initViewer();
    setTimeout(() => loadLocation(loc), 200);
  } else {
    loadLocation(loc);
  }
}

function loadCustomModel(file) {
  if (!file || !viewerReady) return;
  // GLB/GLTF loader — requires THREE.GLTFLoader which we load from CDN
  if (!window.THREE || !window.GLTFLoader) {
    alert('El cargador de modelos aún no está listo. Espera un momento e inténtalo de nuevo.');
    return;
  }
  const url = URL.createObjectURL(file);
  const loader = new window.GLTFLoader();
  loader.load(url, (gltf) => {
    if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }
    const model = gltf.scene;

    // Auto-scale to fit
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    model.scale.setScalar(scale);

    // Center
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));

    model.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(model);
    currentMesh = model;
    autoRotate = true;
    URL.revokeObjectURL(url);
  }, undefined, (err) => {
    console.error('Error loading model:', err);
    alert('No se pudo cargar el modelo. Asegúrate de que es un archivo .glb o .gltf válido.');
  });
}

function resetCamera() {
  rotX = 0.25; rotY = 0.4;
  autoRotate = true;
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  generateStars();

  // Load Three.js then init viewer on first tab click
  const firstTab = document.querySelector('.viewer-tab');
  if (firstTab) firstTab.classList.add('active');

  // Lazy-load Three.js when viewer scrolls into view
  const stage = document.getElementById('viewerStage');
  if (stage) {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        if (!document.getElementById('three-script')) {
          const s = document.createElement('script');
          s.id = 'three-script';
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
          s.onload = () => {
            // Load GLTFLoader
            const s2 = document.createElement('script');
            s2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
            s2.onload = () => { window.GLTFLoader = THREE.GLTFLoader; };
            document.head.appendChild(s2);
            // Auto-show first location
            switchLocation(0);
          };
          document.head.appendChild(s);
        }
      }
    }, { threshold: 0.3 });
    io.observe(stage);
  }
});
