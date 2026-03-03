// ================================================
// WANTED — index.js
// Genera las estrellas del hero y controla el
// visor 3D interactivo de locaciones con Three.js
// ================================================

// ================================================
// LOCACIONES
// id        — nombre del archivo en models/<id>.glb
// name/desc — texto mostrado en el panel inferior
// color     — color del modelo procedural de respaldo
// shape     — tipo de geometria procedural
// w, h, d   — dimensiones del modelo procedural
// ================================================
const LOCATIONS = [
  { id: 'cantina',     name: 'Cantina',         desc: 'El corazon social de San Landero.',                  color: 0x8B4513, shape: 'building', w: 3,   h: 1.5, d: 2   },
  { id: 'iglesia',     name: 'Iglesia',          desc: 'Punto de guardado. El campanario domina el pueblo.', color: 0xC8B89A, shape: 'church',   w: 2,   h: 2.5, d: 1.8 },
  { id: 'carcel',      name: 'Carcel',           desc: 'Destino de los criminales capturados.',              color: 0x5C4A3A, shape: 'building', w: 2.5, h: 1.2, d: 1.5 },
  { id: 'establo',     name: 'Establo',          desc: 'Carreras de caballos y recompensas.',                color: 0x7B5E3A, shape: 'stable',   w: 4,   h: 1.4, d: 2.5 },
  { id: 'desierto',    name: 'Desierto',         desc: 'Donde se esconden los criminales.',                  color: 0xC8A060, shape: 'terrain',  w: 6,   h: 0.1, d: 6   },
  { id: 'residencial', name: 'Zona Residencial', desc: 'Donde vive la gente de San Landero.',               color: 0x9B7B5A, shape: 'building', w: 2,   h: 1.2, d: 1.8 },
];

// Variables del visor 3D
let THREE, renderer, scene, camera, animFrameId;
let currentMesh  = null;
let isDragging   = false;
let prevMouse    = { x: 0, y: 0 };
let rotX = 0.3,  rotY = 0.5;
let autoRotate   = true;
let viewerReady  = false;

// ================================================
// ESTRELLAS DEL HERO
// Crea divs con posicion y duracion aleatoria
// y los inyecta en el contenedor #stars
// ================================================
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

// ================================================
// INICIALIZAR VISOR THREE.JS
// Crea renderer, escena, camara, luces y piso
// Solo se llama una vez cuando Three.js ya cargo
// ================================================
function initViewer() {
  if (viewerReady) return;

  const canvas = document.getElementById('viewerCanvas');
  if (!canvas || typeof window.THREE === 'undefined') return;

  THREE       = window.THREE;
  viewerReady = true;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  resizeRenderer();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0604);
  scene.fog        = new THREE.Fog(0x0A0604, 12, 30);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 0, 0);

  // Luz ambiental suave
  scene.add(new THREE.AmbientLight(0xfff5e0, 0.4));

  // Luz direccional principal simulando el sol
  const sun = new THREE.DirectionalLight(0xFF9A3C, 1.4);
  sun.position.set(5, 8, 5);
  sun.castShadow = true;
  scene.add(sun);

  // Luz de relleno para suavizar sombras duras
  const fill = new THREE.PointLight(0xC8832A, 0.5, 20);
  fill.position.set(-4, 2, -2);
  scene.add(fill);

  // Piso del escenario
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x3D2510, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grilla de referencia sobre el piso
  scene.add(new THREE.GridHelper(20, 20, 0x3D2510, 0x2A1A0E));

  // Controles de rotacion con mouse
  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    prevMouse  = { x: e.clientX, y: e.clientY };
    autoRotate = false;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging || !currentMesh) return;
    rotY += (e.clientX - prevMouse.x) * 0.01;
    rotX += (e.clientY - prevMouse.y) * 0.01;
    rotX      = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  // Controles de rotacion con touch en movil
  let lastTouch = null;
  canvas.addEventListener('touchstart', e => { lastTouch = e.touches[0]; autoRotate = false; });
  canvas.addEventListener('touchmove', e => {
    if (!lastTouch || !currentMesh) return;
    const t = e.touches[0];
    rotY     += (t.clientX - lastTouch.clientX) * 0.012;
    rotX     += (t.clientY - lastTouch.clientY) * 0.012;
    rotX      = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
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

// ================================================
// CARGAR LOCACION
// Intenta cargar models/<id>.glb desde el repo.
// Si el archivo no existe (404), llama a
// buildProceduralMesh para mostrar el respaldo
// ================================================
function loadLocation(loc) {
  if (!scene || !THREE) return;
  if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }

  if (window.GLTFLoader) {
    const loader = new window.GLTFLoader();
    loader.load(
      `models/${loc.id}.glb`,
      (gltf) => {
        if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }
        const model = gltf.scene;

        // Calcula el bounding box para escalar y centrar el modelo
        const box    = new THREE.Box3().setFromObject(model);
        const size   = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 3 / maxDim;

        model.scale.setScalar(scale);
        // Centra horizontalmente y sienta el modelo sobre el piso
        model.position.set(
          -center.x * scale,
          -box.min.y * scale,
          -center.z * scale
        );

        // Aleja la camara segun el tamanio real del modelo
        const dist = maxDim * scale * 1.8;
        camera.position.set(0, dist * 0.5, dist);
        camera.lookAt(0, (size.y * scale) * 0.4, 0);

        model.traverse(child => {
          if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });

        scene.add(model);
        currentMesh = model;
        autoRotate  = true;
        rotX = 0; rotY = 0.4;
        hideViewerPlaceholder();
        setViewerStatus(`${loc.name}.glb cargado`);
      },
      null,
      () => {
        // El .glb no existe en el repo todavia — usar modelo procedural
        buildProceduralMesh(loc);
      }
    );
    return;
  }

  buildProceduralMesh(loc);
}

// Muestra un mensaje de estado en la esquina del visor
// que desaparece automaticamente tras 3 segundos
function setViewerStatus(msg) {
  const el = document.getElementById('viewerStatus');
  if (!el) return;
  el.textContent  = msg;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// ================================================
// MODELO PROCEDURAL DE RESPALDO
// Construye geometria simple con Three.js cuando
// el .glb de la locacion no esta disponible aun
// ================================================
function buildProceduralMesh(loc) {
  if (!scene || !THREE) return;
  if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }
  setViewerStatus(`Sin modelo — sube models/${loc.id}.glb`);

  const group   = new THREE.Group();
  const mat     = new THREE.MeshStandardMaterial({ color: loc.color,  roughness: 0.8, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2A1A0E,   roughness: 1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5C3A1A,   roughness: 0.9 });

  if (loc.shape === 'building') {
    // Cuerpo principal
    const body = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h, loc.d), mat);
    body.position.y = loc.h / 2;
    body.castShadow = true;
    group.add(body);
    // Franja de fachada
    const facade = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h * 0.3, 0.05), darkMat);
    facade.position.set(0, loc.h * 0.85, loc.d / 2 + 0.02);
    group.add(facade);
    // Puerta
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.06), darkMat);
    door.position.set(0, 0.35, loc.d / 2 + 0.03);
    group.add(door);
    // Ventanas
    [-0.7, 0.7].forEach(x => {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xC8A040, emissive: 0x6B4010, roughness: 0.3 })
      );
      win.position.set(x, loc.h * 0.6, loc.d / 2 + 0.03);
      group.add(win);
    });

  } else if (loc.shape === 'church') {
    // Nave principal
    const body = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h * 0.7, loc.d), mat);
    body.position.y = loc.h * 0.35;
    body.castShadow = true;
    group.add(body);
    // Torre del campanario
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, loc.h * 0.6, 0.7), mat);
    tower.position.set(0, loc.h * 0.7 + loc.h * 0.3, 0);
    tower.castShadow = true;
    group.add(tower);
    // Punta piramidal de la torre
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 4), roofMat);
    tip.position.set(0, loc.h * 0.7 + loc.h * 0.6 + 0.4, 0);
    tip.rotation.y = Math.PI / 4;
    tip.castShadow = true;
    group.add(tip);
    // Cruz en la cima
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), darkMat);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), darkMat);
    crossV.position.set(0, loc.h * 1.45, 0);
    crossH.position.set(0, loc.h * 1.5,  0);
    group.add(crossV, crossH);

  } else if (loc.shape === 'stable') {
    // Cuerpo del establo
    const body = new THREE.Mesh(new THREE.BoxGeometry(loc.w, loc.h, loc.d), mat);
    body.position.y = loc.h / 2;
    body.castShadow = true;
    group.add(body);
    // Caballete del techo
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, loc.w, 6), darkMat);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.y = loc.h + 0.6;
    group.add(ridge);
    // Dos planos del techo a dos aguas
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(loc.w, 0.08, loc.d / 2 + 0.2), roofMat);
    roofL.rotation.x = -0.5;
    roofL.position.set(0, loc.h + 0.28, -loc.d / 4);
    group.add(roofL);
    const roofR = roofL.clone();
    roofR.rotation.x = 0.5;
    roofR.position.set(0, loc.h + 0.28, loc.d / 4);
    group.add(roofR);
    // Divisiones internas de los establos
    for (let i = -1; i <= 1; i++) {
      const stall = new THREE.Mesh(new THREE.BoxGeometry(0.08, loc.h * 0.6, loc.d), darkMat);
      stall.position.set(i * (loc.w / 3), loc.h * 0.3, 0);
      group.add(stall);
    }

  } else if (loc.shape === 'terrain') {
    // Terreno irregular para el desierto
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
    // Cactus procedurales sobre el terreno
    [[1.5, 0.8], [-1.8, -1], [0.5, -1.5]].forEach(([x, z]) => {
      const cactMat = new THREE.MeshStandardMaterial({ color: 0x3A6B2A });
      const trunk   = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6), cactMat);
      trunk.position.set(x, 0.4, z);
      group.add(trunk);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 6), cactMat);
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

// Loop de animacion — rota el modelo si autoRotate esta activo
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
  const canvas  = document.getElementById('viewerCanvas');
  if (canvas)  { canvas.style.display = 'block'; resizeRenderer(); }
}

// Cambia la locacion activa — actualiza tabs, texto y carga el modelo
function switchLocation(idx) {
  document.querySelectorAll('.viewer-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  const loc    = LOCATIONS[idx];
  const nameEl = document.getElementById('viewerLocationName');
  const descEl = document.getElementById('viewerLocationDesc');
  if (nameEl) nameEl.textContent = loc.name;
  if (descEl) descEl.textContent = loc.desc;
  // Si el visor no esta listo todavia, espera a que initViewer lo active
  if (!viewerReady) return;
  loadLocation(loc);
}

// Carga un .glb desde el disco local (sin subir al repo)
// util para previsualizar modelos en desarrollo
function loadCustomModel(file) {
  if (!file || !viewerReady) return;
  if (!window.GLTFLoader) { alert('El cargador aun no esta listo, intenta de nuevo.'); return; }
  const url    = URL.createObjectURL(file);
  const loader = new window.GLTFLoader();
  loader.load(url, (gltf) => {
    if (currentMesh) { scene.remove(currentMesh); currentMesh = null; }
    const model  = gltf.scene;
    const box    = new THREE.Box3().setFromObject(model);
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale  = 3 / maxDim;
    model.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));
    model.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(model);
    currentMesh = model;
    autoRotate  = true;
    URL.revokeObjectURL(url);
  }, null, () => { alert('No se pudo cargar el modelo. Verifica que sea un .glb valido.'); });
}

function resetCamera() { rotX = 0.25; rotY = 0.4; autoRotate = true; }

// ================================================
// INICIALIZACION
// Carga Three.js y GLTFLoader de forma lazy cuando
// el visor entra al viewport para no bloquear la
// carga inicial de la pagina
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  generateStars();

  // Marca el primer tab como activo visualmente
  const firstTab = document.querySelector('.viewer-tab');
  if (firstTab) firstTab.classList.add('active');

  const stage = document.getElementById('viewerStage');
  if (!stage) return;

  // IntersectionObserver dispara la carga de Three.js
  // solo cuando el usuario hace scroll hasta el visor
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    if (document.getElementById('three-script')) return;

    // Paso 1 — cargar Three.js
    const s1   = document.createElement('script');
    s1.id      = 'three-script';
    s1.src     = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s1.onload  = () => {
      // Paso 2 — cargar GLTFLoader despues de que Three.js este listo
      const s2  = document.createElement('script');
      s2.src    = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
      s2.onload = () => {
        window.GLTFLoader = THREE.GLTFLoader;
        // Paso 3 — inicializar escena y cargar primera locacion
        initViewer();
        switchLocation(0);
      };
      s2.onerror = () => {
        // Si GLTFLoader falla, el visor funciona igual con modelos procedurales
        console.warn('GLTFLoader no se pudo cargar — usando modelos procedurales');
        initViewer();
        switchLocation(0);
      };
      document.head.appendChild(s2);
    };
    s1.onerror = () => console.error('Three.js no se pudo cargar desde CDN');
    document.head.appendChild(s1);

  }, { threshold: 0.2 });

  io.observe(stage);
});
