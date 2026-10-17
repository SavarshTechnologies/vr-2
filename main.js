import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const $ = (id) => document.getElementById(id);
const video  = $('video');
const overlay = $('overlay');

/* ─────────────────── playlist ─────────────────── */
const PLAYLIST = [
  'assets/gemini_generated_video_a4930b48.mp4',
  'assets/WhatsApp%20Video%202026-10-17%20at%2009.20.53.mp4'
];
let currentIndex = 0;

function loadVideo(index) {
  currentIndex = ((index % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
  video.src = PLAYLIST[currentIndex];
  video.load();
  video.play().catch(() => {});
}

/* ─────────────────── renderer / scene ─────────────────── */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020204);
scene.fog = new THREE.FogExp2(0x020204, 0.04);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 60);
camera.position.set(0, 1.6, 0);
camera.rotation.order = 'YXZ';

/* ─────────────────── theatre room ─────────────────── */
const room = new THREE.Mesh(
  new THREE.BoxGeometry(14, 5, 18),
  new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.9, side: THREE.BackSide })
);
room.position.y = 2.5;
scene.add(room);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 18),
  new THREE.MeshStandardMaterial({ color: 0x08080c, roughness: 0.3, metalness: 0.4 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const stripMat = new THREE.MeshBasicMaterial({ color: 0x6b4a22 });
for (const x of [-3.4, 3.4]) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 17), stripMat);
  s.position.set(x, 0.01, 0);
  scene.add(s);
}

const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0e, roughness: 0.8 });
const seatBase = new THREE.BoxGeometry(0.55, 0.12, 0.55);
const seatBack = new THREE.BoxGeometry(0.55, 0.7, 0.1);
for (let r = 0; r < 3; r++) {
  for (let i = -3; i <= 3; i++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(seatBase, seatMat); b.position.y = 0.45;
    const k = new THREE.Mesh(seatBack, seatMat); k.position.set(0, 0.85, 0.25);
    g.add(b, k);
    g.position.set(i * 0.7, r * 0.12, 2.6 + r * 1.2);
    scene.add(g);
  }
}

const DUST = 600;
const dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) {
  dustPos[i * 3]     = (Math.random() - 0.5) * 10;
  dustPos[i * 3 + 1] = Math.random() * 4.5;
  dustPos[i * 3 + 2] = -8 + Math.random() * 14;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  size: 0.025, color: 0xaab8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending
}));
scene.add(dust);

/* ─────────────────── lighting ─────────────────── */
scene.add(new THREE.AmbientLight(0x222233, 0.35));
const lightHi = new THREE.PointLight(0xffffff, 30, 16, 2); lightHi.position.set(0, 3.2, -4.2);
const lightLo = new THREE.PointLight(0xffffff, 12, 10, 2); lightLo.position.set(0, 0.7, -4.5);
scene.add(lightHi, lightLo);

/* ─────────────────── screen rig ─────────────────── */
const SW = 6, SH = SW * 9 / 16;
const rig = new THREE.Group();
rig.position.set(0, 2.3, -6);
scene.add(rig);

const tex = new THREE.VideoTexture(video);
tex.colorSpace = THREE.SRGBColorSpace;
tex.minFilter = tex.magFilter = THREE.LinearFilter;
tex.generateMipmaps = false;

const screen = new THREE.Mesh(
  new THREE.PlaneGeometry(SW, SH),
  new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
);
rig.add(screen);

const frame = new THREE.Mesh(
  new THREE.BoxGeometry(SW + 0.16, SH + 0.16, 0.06),
  new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5 })
);
frame.position.z = -0.045;
rig.add(frame);

// glow halo
const gc = document.createElement('canvas'); gc.width = gc.height = 128;
const gx = gc.getContext('2d');
const grad = gx.createRadialGradient(64,64,4,64,64,64);
grad.addColorStop(0,'rgba(255,255,255,1)'); grad.addColorStop(1,'rgba(255,255,255,0)');
gx.fillStyle = grad; gx.fillRect(0,0,128,128);
const glow = new THREE.Mesh(
  new THREE.PlaneGeometry(SW * 1.7, SH * 1.9),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
);
glow.position.z = -0.1;
rig.add(glow);

// seek bar
const barY = -SH / 2 - 0.3;
const bar = new THREE.Mesh(new THREE.PlaneGeometry(SW, 0.1), new THREE.MeshBasicMaterial({ color: 0x2a2a30 }));
bar.position.y = barY;
const fillGeo = new THREE.PlaneGeometry(1, 0.1); fillGeo.translate(0.5, 0, 0);
const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0xe8c27a, toneMapped: false }));
fill.position.set(-SW / 2, barY, 0.005);
rig.add(bar, fill);

// play/pause icon
const ic = document.createElement('canvas'); ic.width = ic.height = 256;
const icx = ic.getContext('2d');
icx.fillStyle = 'rgba(0,0,0,.55)'; icx.beginPath(); icx.arc(128,128,120,0,7); icx.fill();
icx.strokeStyle = '#e8c27a'; icx.lineWidth = 6; icx.stroke();
icx.fillStyle = '#f4efe6'; icx.beginPath(); icx.moveTo(100,78); icx.lineTo(188,128); icx.lineTo(100,178); icx.fill();
const icon = new THREE.Mesh(
  new THREE.PlaneGeometry(0.9, 0.9),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ic), transparent: true, toneMapped: false })
);
icon.position.z = 0.02;
rig.add(icon);

/* ─────────────────── 3-D nav buttons (Next / Back / Play-Pause) ─────────────────── */
function makeButtonMesh(label, color) {
  const W = 1.4, H = 0.45;

  // canvas label
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 96;
  const bctx = bc.getContext('2d');
  bctx.fillStyle = color;
  bctx.beginPath();
  bctx.roundRect(4, 4, 248, 88, 18);
  bctx.fill();
  bctx.strokeStyle = '#e8c27a'; bctx.lineWidth = 4;
  bctx.stroke();
  bctx.fillStyle = '#f4efe6';
  bctx.font = 'bold 36px Georgia, serif';
  bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  bctx.fillText(label, 128, 48);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, toneMapped: false })
  );
  mesh.userData.canvas = bc;
  mesh.userData.ctx    = bctx;
  mesh.userData.label  = label;
  mesh.userData.baseColor = color;
  return mesh;
}

const btnBack  = makeButtonMesh('◀ Back', '#1a1228');
const btnPlay  = makeButtonMesh('⏸ Pause', '#1a1228');
const btnNext  = makeButtonMesh('Next ▶', '#1a1228');

// position buttons below and around the screen
btnBack.position.set(-SW / 2 - 0.9, -SH / 2 - 0.85, 0);
btnPlay.position.set(0,              -SH / 2 - 0.85, 0);
btnNext.position.set( SW / 2 + 0.9, -SH / 2 - 0.85, 0);

rig.add(btnBack, btnPlay, btnNext);

// dwell progress ring — per-button, shown in front of the hovered button
const DWELL_SECONDS = 3;
const dwellRing = new THREE.Mesh(
  new THREE.RingGeometry(0.28, 0.32, 48),
  new THREE.MeshBasicMaterial({ color: 0xe8c27a, toneMapped: false, side: THREE.DoubleSide })
);
dwellRing.visible = false;
scene.add(dwellRing); // lives in world space so we can position it on any target

function setDwellRing(progress, worldPosition) {
  if (progress <= 0) { dwellRing.visible = false; return; }
  dwellRing.visible = true;
  dwellRing.position.copy(worldPosition).addScaledVector(new THREE.Vector3(0, 0, 1), 0.05);
  dwellRing.geometry.dispose();
  dwellRing.geometry = new THREE.RingGeometry(0.28, 0.32, 48, 1, Math.PI / 2, -progress * Math.PI * 2);
}

// reticle (center-gaze dot) — child of camera so it's always centered
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.006, 0.01, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
);
reticle.position.set(0, 0, -1.2);
camera.add(reticle);
scene.add(camera); // need camera in scene for reticle to appear

/* ─────────────────── button actions ─────────────────── */
function updatePlayButton() {
  const lbl = video.paused ? '▶ Play' : '⏸ Pause';
  const bctx = btnPlay.userData.ctx;
  const bc   = btnPlay.userData.canvas;
  bctx.clearRect(0, 0, bc.width, bc.height);
  bctx.fillStyle = '#1a1228';
  bctx.beginPath(); bctx.roundRect(4,4,248,88,18); bctx.fill();
  bctx.strokeStyle = '#e8c27a'; bctx.lineWidth = 4; bctx.stroke();
  bctx.fillStyle = '#f4efe6'; bctx.font = 'bold 36px Georgia, serif';
  bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  bctx.fillText(lbl, 128, 48);
  btnPlay.material.map.needsUpdate = true;
}

function activateButton(btn) {
  if (btn === btnNext)     { loadVideo(currentIndex + 1); }
  else if (btn === btnBack) { loadVideo(currentIndex - 1); }
  else if (btn === btnPlay) { togglePlay(); }
  flashButton(btn);
}

function flashButton(btn) {
  const bctx = btn.userData.ctx;
  const bc   = btn.userData.canvas;
  bctx.fillStyle = '#e8c27a';
  bctx.beginPath(); bctx.roundRect(4,4,248,88,18); bctx.fill();
  bctx.fillStyle = '#000';
  bctx.font = 'bold 36px Georgia, serif';
  bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  bctx.fillText(btn.userData.label, 128, 48);
  btn.material.map.needsUpdate = true;
  setTimeout(() => {
    bctx.clearRect(0,0,bc.width,bc.height);
    bctx.fillStyle = btn.userData.baseColor;
    bctx.beginPath(); bctx.roundRect(4,4,248,88,18); bctx.fill();
    bctx.strokeStyle = '#e8c27a'; bctx.lineWidth = 4; bctx.stroke();
    bctx.fillStyle = '#f4efe6'; bctx.font = 'bold 36px Georgia, serif';
    bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    bctx.fillText(btn.userData.label, 128, 48);
    btn.material.map.needsUpdate = true;
  }, 200);
}

/* ─────────────────── playback helpers ─────────────────── */
const togglePlay = () => { video.paused ? video.play().catch(()=>{}) : video.pause(); updatePlayButton(); };
const seekTo = (u) => { if (video.duration) video.currentTime = THREE.MathUtils.clamp(u, 0, 1) * video.duration; };
const seekBy = (s) => { if (video.duration) video.currentTime = THREE.MathUtils.clamp(video.currentTime + s, 0, video.duration); };

/* ─────────────────── ambilight ─────────────────── */
const sc = document.createElement('canvas'); sc.width = 16; sc.height = 9;
const sx = sc.getContext('2d', { willReadFrequently: true });
let lastSample = 0;
const tint = new THREE.Color();
function sampleVideo(now) {
  if (now - lastSample < 120 || video.readyState < 2) return;
  lastSample = now;
  try {
    sx.drawImage(video, 0, 0, 16, 9);
    const d = sx.getImageData(0, 0, 16, 9).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
    const n = d.length / 4 * 255;
    tint.setRGB(r/n, g/n, b/n, THREE.SRGBColorSpace);
    const lum = (tint.r + tint.g + tint.b) / 3;
    for (const l of [lightHi, lightLo]) l.color.lerp(tint, 0.35);
    lightHi.intensity = 12 + lum * 80;
    lightLo.intensity = 5  + lum * 35;
    glow.material.color.lerp(tint, 0.35);
    glow.material.opacity = 0.2 + lum * 0.7;
  } catch(e) { /* tainted canvas (file://) */ }
}

/* ─────────────────── ray helpers ─────────────────── */
const raycaster = new THREE.Raycaster();
const _m = new THREE.Matrix4();

// all ray-pickable objects (buttons + screen + seek bar)
const navButtons = [btnBack, btnPlay, btnNext];
const allTargets = [screen, bar, ...navButtons];

function handleHit(hit) {
  if (!hit) return;
  if (hit.object === bar)  { seekTo(hit.uv.x); return; }
  if (hit.object === screen) { togglePlay(); return; }
  if (navButtons.includes(hit.object)) { activateButton(hit.object); return; }
}

function rayFromController(c) {
  _m.identity().extractRotation(c.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(_m);
}

function rayFromGaze() {
  // gaze ray: straight out from camera center
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
}

/* ─────────────────── VR controllers ─────────────────── */
function makeRay() {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xe8c27a, transparent: true, opacity: 0.8 }));
  l.name = 'ray'; l.scale.z = 4;
  return l;
}
const controllers = [];
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.addEventListener('connected', (e) => { c.userData.gp = e.data.gamepad || null; c.add(makeRay()); });
  c.addEventListener('disconnected', () => { c.userData.gp = null; c.clear(); });
  c.addEventListener('selectstart', () => {
    rayFromController(c);
    handleHit(raycaster.intersectObjects(allTargets)[0]);
  });
  c.addEventListener('squeezestart', recenter);
  scene.add(c);
  controllers.push(c);
}

const _p = new THREE.Vector3(), _d = new THREE.Vector3();
let yaw = 0, pitch = 0;
function recenter() {
  if (renderer.xr.isPresenting) {
    const cam = renderer.xr.getCamera();
    cam.getWorldPosition(_p); cam.getWorldDirection(_d);
    _d.y = 0; if (_d.lengthSq() < 1e-4) return; _d.normalize();
    const dist = Math.hypot(rig.position.x - _p.x, rig.position.z - _p.z) || 6;
    rig.position.set(_p.x + _d.x * dist, rig.position.y, _p.z + _d.z * dist);
    rig.lookAt(_p.x, rig.position.y, _p.z);
  } else { yaw = 0; pitch = 0; }
}

function pollThumbsticks(dt) {
  for (const c of controllers) {
    const a = c.userData.gp && c.userData.gp.axes;
    if (!a || a.length < 4) continue;
    const x = a[2], y = a[3];
    if (Math.abs(x) > 0.2) seekBy(x * 6 * dt);
    if (Math.abs(y) > 0.2) {
      const s = THREE.MathUtils.clamp(rig.scale.x * (1 - y * dt * 0.8), 0.5, 2.5);
      rig.scale.setScalar(s);
    }
  }
}

/* ─────────────────── dwell state (gaze & controller) ─────────────────── */
// Shared dwell tracker – works for both gaze (no controller) and controller pointer
const dwell = { target: null, time: 0 };

function processDwell(dt, hoveredObject) {
  if (!hoveredObject || !navButtons.includes(hoveredObject)) {
    // reset when not on a nav button
    dwell.target = null;
    dwell.time   = 0;
    setDwellRing(0, new THREE.Vector3());
    return;
  }

  if (dwell.target !== hoveredObject) {
    // switched to a new button — restart
    dwell.target = hoveredObject;
    dwell.time   = 0;
  }

  dwell.time += dt;
  const progress = Math.min(dwell.time / DWELL_SECONDS, 1);

  // put ring on the button in world space
  const wp = new THREE.Vector3();
  hoveredObject.getWorldPosition(wp);
  setDwellRing(progress, wp);

  if (dwell.time >= DWELL_SECONDS) {
    activateButton(hoveredObject);
    dwell.target = null;
    dwell.time   = 0;
    setDwellRing(0, wp);
  }
}

/* ─────────────────── desktop / mobile controls ─────────────────── */
const dom = renderer.domElement;
let drag = null;
dom.addEventListener('pointerdown', (e) => { drag = { moved: 0 }; dom.setPointerCapture(e.pointerId); });
dom.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
  const k = camera.fov / 70 * 0.003;
  yaw   -= e.movementX * k;
  pitch  = THREE.MathUtils.clamp(pitch - e.movementY * k, -1.2, 1.2);
});
dom.addEventListener('pointerup', (e) => {
  if (drag && drag.moved < 6) {
    raycaster.setFromCamera(
      new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1),
      camera
    );
    handleHit(raycaster.intersectObjects(allTargets)[0]);
  }
  drag = null;
});
dom.addEventListener('wheel', (e) => {
  camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.03, 35, 90);
  camera.updateProjectionMatrix();
}, { passive: true });
addEventListener('keydown', (e) => {
  if      (e.code === 'Space')      { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowRight') seekBy(2);
  else if (e.code === 'ArrowLeft')  seekBy(-2);
  else if (e.code === 'KeyN')       loadVideo(currentIndex + 1);
  else if (e.code === 'KeyB')       loadVideo(currentIndex - 1);
  else if (e.code === 'KeyF')       document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  else if (e.code === 'KeyR')       recenter();
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ─────────────────── start / VR button ─────────────────── */
$('start').addEventListener('click', () => {
  loadVideo(0);
  video.play()
    .then(() => overlay.classList.add('hidden'))
    .catch((e) => { $('err').textContent = 'Could not start video: ' + e.message; });
});

video.addEventListener('error', () => {
  $('err').textContent = `Video failed to load: ${video.src} — check the assets folder and use a web server.`;
});

// auto-advance playlist when a video ends
video.addEventListener('ended', () => loadVideo(currentIndex + 1));

const vrBtn = VRButton.createButton(renderer);
vrBtn.addEventListener('click', () => { loadVideo(0); video.play().catch(()=>{}); });
document.body.appendChild(vrBtn);

renderer.xr.addEventListener('sessionstart', () => {
  overlay.classList.add('hidden');
  $('hint').style.display = 'none';
  loadVideo(0);
  video.play().catch(()=>{});
});
renderer.xr.addEventListener('sessionend', () => { $('hint').style.display = ''; });

/* ─────────────────── render loop ─────────────────── */
const clock = new THREE.Clock();
const _wp = new THREE.Vector3();

renderer.setAnimationLoop((now) => {
  const dt = Math.min(clock.getDelta(), 0.1);

  if (!renderer.xr.isPresenting) {
    camera.rotation.set(pitch, yaw, 0);
  } else {
    pollThumbsticks(dt);
  }

  // seek bar fill
  fill.scale.x = Math.max(1e-4, (video.currentTime / (video.duration || 1)) * SW);
  // play/pause icon
  icon.visible = video.paused;

  // dust drift
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3 + 1] += dt * 0.03;
    dustPos[i * 3]     += Math.sin(now * 0.0003 + i) * dt * 0.01;
    if (dustPos[i * 3 + 1] > 4.5) dustPos[i * 3 + 1] = 0;
  }
  dustGeo.attributes.position.needsUpdate = true;

  sampleVideo(now);

  /* ── gaze / controller dwell ── */
  let gazeHovered = null;

  if (renderer.xr.isPresenting && controllers.length > 0) {
    // controller mode: check any connected controller
    let anyHit = null;
    for (const c of controllers) {
      const ray = c.getObjectByName('ray'); if (!ray) continue;
      rayFromController(c);
      const hits = raycaster.intersectObjects(allTargets);
      if (hits[0]) { ray.scale.z = hits[0].distance; if (!anyHit) anyHit = hits[0]; }
      else          { ray.scale.z = 4; }
      ray.material.color.set(hits[0] ? 0xffffff : 0xe8c27a);
    }
    if (anyHit && navButtons.includes(anyHit.object)) gazeHovered = anyHit.object;
  } else {
    // gaze / no-controller mode
    rayFromGaze();
    const hits = raycaster.intersectObjects(allTargets);
    if (hits[0] && navButtons.includes(hits[0].object)) gazeHovered = hits[0].object;
  }

  processDwell(dt, gazeHovered);

  renderer.render(scene, camera);
});

// load first video immediately so the texture is ready
loadVideo(0);
