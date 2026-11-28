// The three.js globe: map texture, capital markers, impact dots and camera moves.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const RADIUS = 1;
const DOT_ALTITUDE = 1.004;
const START_DISTANCE = 3.1;
const FOCUS_DISTANCE = 2.2;
const PICK_RADIUS_PX = 16;
const TOUCH_PICK_RADIUS_PX = 30; // Fingers are less precise than a mouse.
const FLY_MS = 950;
const FOV = 36;
const FIT_MARGIN = 1.12;
const PHONE_TEXTURE_SIZE = 4096; // Larger textures can run phones out of graphics memory.
const PHONE_DOT_BOOST = 1.6;

const isPhone = () => Math.min(innerWidth, innerHeight) <= 640;

// How far back the camera must be for the whole globe to fit, even in a narrow portrait screen.
function fitDistance(aspect) {
  // A window with no size yet (a hidden tab, say) would put the camera infinitely far away.
  const usableAspect = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const halfVertical = THREE.MathUtils.degToRad(FOV / 2);
  const halfNarrowest = Math.min(halfVertical, Math.atan(Math.tan(halfVertical) * usableAspect));
  return Math.max(START_DISTANCE, (RADIUS * FIT_MARGIN) / Math.sin(halfNarrowest));
}

// Dot colours are the impact bands; dark green is lifted a touch to read on the dark map.
const LEVEL_COLORS = { 1: '#12853f', 2: '#8db600', 3: '#ffd60a', 4: '#ff7a00', 5: '#ff1a2e' };

const MAP = {
  ocean: '#06111f', land: '#1a3144', border: 'rgba(120, 165, 196, 0.5)', grid: 'rgba(120, 165, 196, 0.07)',
  selected: '#2f6f8f', selectedBorder: '#9fdcff',
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function latLonToVector(lat, lon, radius = RADIUS) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// World Atlas cuts shapes at the antimeridian and the South Pole. Those edges
// are not real borders, so they are skipped when stroking.
function isArtificialEdge(a, b) {
  const atSeam = (p) => Math.abs(Math.abs(p[0]) - 180) < 1e-6;
  const atPole = (p) => p[1] < -89.9;
  return (atSeam(a) && atSeam(b)) || (atPole(a) && atPole(b));
}

function polygonsOf(feature) {
  const g = feature.geometry;
  if (!g) return [];
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

class MapPainter {
  constructor(features, maxSize) {
    this.features = features;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.min(8192, maxSize);
    this.canvas.height = this.canvas.width / 2;
    this.ctx = this.canvas.getContext('2d');
    this.base = document.createElement('canvas');
    this.base.width = this.canvas.width;
    this.base.height = this.canvas.height;
    this.#paintBase();
    this.ctx.drawImage(this.base, 0, 0);
  }

  #x(lon) { return ((lon + 180) / 360) * this.canvas.width; }
  #y(lat) { return ((90 - lat) / 180) * this.canvas.height; }

  #fill(ctx, feature) {
    ctx.beginPath();
    for (const polygon of polygonsOf(feature)) {
      for (const ring of polygon) {
        ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(this.#x(lon), this.#y(lat)) : ctx.moveTo(this.#x(lon), this.#y(lat))));
        ctx.closePath();
      }
    }
    ctx.fill('evenodd');
  }

  #stroke(ctx, feature) {
    ctx.beginPath();
    for (const polygon of polygonsOf(feature)) {
      for (const ring of polygon) {
        for (let i = 1; i < ring.length; i++) {
          if (isArtificialEdge(ring[i - 1], ring[i])) continue;
          ctx.moveTo(this.#x(ring[i - 1][0]), this.#y(ring[i - 1][1]));
          ctx.lineTo(this.#x(ring[i][0]), this.#y(ring[i][1]));
        }
      }
    }
    ctx.stroke();
  }

  #paintBase() {
    const ctx = this.base.getContext('2d');
    const { width: w, height: h } = this.base;
    const scale = w / 4096;
    ctx.fillStyle = MAP.ocean;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = MAP.grid;
    ctx.lineWidth = scale;
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 15) { ctx.moveTo(this.#x(lon), 0); ctx.lineTo(this.#x(lon), h); }
    for (let lat = -75; lat <= 75; lat += 15) { ctx.moveTo(0, this.#y(lat)); ctx.lineTo(w, this.#y(lat)); }
    ctx.stroke();

    ctx.fillStyle = MAP.land;
    for (const f of this.features) this.#fill(ctx, f);
    ctx.strokeStyle = MAP.border;
    ctx.lineWidth = 0.9 * scale;
    ctx.lineJoin = 'round';
    for (const f of this.features) this.#stroke(ctx, f);
  }

  paint(selectedFeature) {
    const { ctx } = this;
    ctx.drawImage(this.base, 0, 0);
    if (!selectedFeature) return;
    ctx.fillStyle = MAP.selected;
    this.#fill(ctx, selectedFeature);
    ctx.strokeStyle = MAP.selectedBorder;
    ctx.lineWidth = 2 * (this.canvas.width / 4096);
    this.#stroke(ctx, selectedFeature);
  }
}

function roundPointTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

function atmosphere() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 1.17, 64, 64),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float glow = pow(clamp(0.72 + dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.2);
          gl_FragColor = vec4(0.16, 0.56, 0.95, glow * 0.75);
        }`,
    }),
  );
}

function starfield() {
  const count = 2400;
  const positions = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(30 + Math.random() * 30);
    v.toArray(positions, i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xb9d4ea, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false,
  }));
}

export class Globe extends EventTarget {
  constructor(canvas, { features, featureFor, countries }) {
    super();
    this.canvas = canvas;
    this.countries = countries;
    this.featureFor = featureFor;
    this.positions = new Map(countries.map((c) => [c.iso2, latLonToVector(c.lat, c.lon)]));
    this.dots = new Map();
    this.viewOffset = 0;
    this.targetViewOffset = 0;
    this.viewOffsetY = 0;
    this.targetViewOffsetY = 0;
    this.fit = fitDistance(innerWidth / innerHeight);
    this.flight = null;
    this.hovered = null;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#030810');
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    this.camera.position.copy(latLonToVector(24, 12, this.fit));

    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 1.22, maxDistance: Math.max(5.2, this.fit * 1.3),
      rotateSpeed: 0.55, zoomSpeed: 0.7, autoRotate: !reducedMotion, autoRotateSpeed: 0.22,
    });

    this.painter = new MapPainter(features, isPhone() ? Math.min(PHONE_TEXTURE_SIZE, this.renderer.capabilities.maxTextureSize) : this.renderer.capabilities.maxTextureSize);
    this.texture = new THREE.CanvasTexture(this.painter.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 128, 128),
      new THREE.MeshBasicMaterial({ map: this.texture }),
    ));
    this.scene.add(atmosphere(), starfield());
    this.#addCapitals();

    this.dotGroup = new THREE.Group();
    this.scene.add(this.dotGroup);
    this.selectionRing = this.#ring('#ffffff', 0.016);
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    this.#bindEvents();
    this.#resize();
    this.renderer.setAnimationLoop(() => this.#frame());
  }

  #addCapitals() {
    const positions = new Float32Array(this.countries.length * 3);
    this.countries.forEach((c, i) => latLonToVector(c.lat, c.lon, DOT_ALTITUDE).toArray(positions, i * 3));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xdcecf8, size: 4.5, sizeAttenuation: false, map: roundPointTexture(), alphaTest: 0.5, transparent: true,
    })));
  }

  #ring(color, radius) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.82, radius, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    return mesh;
  }

  #orient(mesh, position) {
    mesh.position.copy(position).multiplyScalar(DOT_ALTITUDE);
    mesh.lookAt(position.clone().multiplyScalar(2));
  }

  // One dot per capital, sized by the impact of the strongest unread story.
  setDot(iso2, { level, size }) {
    const position = this.positions.get(iso2);
    if (!position) return;
    this.removeDot(iso2);
    const color = new THREE.Color(LEVEL_COLORS[level]);
    const radius = 0.009 + 0.04 * Math.pow(size, 1.5);

    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    const halo = this.#ring(color, radius);
    halo.material.opacity = 0;
    group.add(core, halo);
    this.#orient(group, position);
    this.dotGroup.add(group);
    this.dots.set(iso2, { group, core, halo, level, base: color, born: performance.now(), phase: Math.random() * 6 });
  }

  removeDot(iso2) {
    const dot = this.dots.get(iso2);
    if (!dot) return;
    this.dotGroup.remove(dot.group);
    dot.group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    this.dots.delete(iso2);
  }

  select(country) {
    this.painter.paint(country ? this.featureFor(country) : null);
    this.texture.needsUpdate = true;
    this.selectionRing.visible = Boolean(country);
    if (!country) return;
    this.#orient(this.selectionRing, this.positions.get(country.iso2));
    this.flyTo(country);
  }

  flyTo(country) {
    this.controls.autoRotate = false;
    const from = this.camera.position.clone();
    const distance = Math.min(from.length(), Math.max(FOCUS_DISTANCE, this.fit * 0.62));
    const to = this.positions.get(country.iso2).clone().normalize();
    if (reducedMotion) {
      this.camera.position.copy(to.multiplyScalar(distance));
      return;
    }
    this.flight = { from: from.clone().normalize(), to, fromDistance: from.length(), distance, start: performance.now() };
  }

  // Keeps the globe centred in the space the news panel leaves free:
  // beside it on a large screen, above it on a phone.
  setInsets({ right = 0, bottom = 0 }) {
    this.targetViewOffset = right / 2;
    this.targetViewOffsetY = bottom / 2;
  }

  resumeAutoRotate() {
    this.controls.autoRotate = !reducedMotion;
  }

  #stepFlight(now) {
    const f = this.flight;
    if (!f) return;
    const t = Math.min((now - f.start) / FLY_MS, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    const angle = f.from.angleTo(f.to);
    const dir = angle < 1e-4
      ? f.to.clone()
      : f.from.clone().multiplyScalar(Math.sin((1 - eased) * angle)).addScaledVector(f.to, Math.sin(eased * angle)).divideScalar(Math.sin(angle));
    this.camera.position.copy(dir.normalize().multiplyScalar(THREE.MathUtils.lerp(f.fromDistance, f.distance, eased)));
    if (t >= 1) this.flight = null;
  }

  #stepDots(now) {
    // Dots keep a similar on-screen size when zooming in, so they never hide the map.
    const zoomScale = THREE.MathUtils.clamp((this.camera.position.length() - RADIUS) / (this.fit - RADIUS), 0.18, 1.3) * (isPhone() ? PHONE_DOT_BOOST : 1);
    this.selectionRing.scale.setScalar(zoomScale);
    for (const dot of this.dots.values()) {
      dot.group.scale.setScalar(zoomScale);
      const pulse = ((now - dot.born) / 1000 + dot.phase) % 2.4 / 2.4;
      const size = 1 + pulse * (0.9 + dot.level * 0.3);
      dot.halo.scale.setScalar(size);
      dot.halo.material.opacity = reducedMotion ? 0.5 : (1 - pulse) * 0.8;
      if (dot.level === 5 && !reducedMotion) {
        const flash = (Math.sin(now / 90) + 1) / 2;
        dot.core.material.color.copy(dot.base).lerp(new THREE.Color('#ffffff'), flash * 0.55);
      }
      // A new dot pops in instead of just appearing.
      const age = Math.min((now - dot.born) / 450, 1);
      dot.core.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(age * Math.PI) * 0.8);
    }
  }

  #frame() {
    const now = performance.now();
    this.#stepFlight(now);
    this.#stepDots(now);

    if (Math.abs(this.viewOffset - this.targetViewOffset) > 0.5 || Math.abs(this.viewOffsetY - this.targetViewOffsetY) > 0.5) {
      this.viewOffset += (this.targetViewOffset - this.viewOffset) * 0.12;
      this.viewOffsetY += (this.targetViewOffsetY - this.viewOffsetY) * 0.12;
      this.#applyViewOffset();
    }

    // Slower dragging when zoomed in, so the map follows the pointer.
    const altitude = this.camera.position.length() - RADIUS;
    this.controls.rotateSpeed = THREE.MathUtils.clamp(altitude * 0.45, 0.06, 0.8);
    if (!this.flight) this.controls.update();
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  #applyViewOffset() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    this.camera.setViewOffset(w, h, this.viewOffset, this.viewOffsetY, w, h);
  }

  #resize() {
    const { innerWidth: w, innerHeight: h } = window;
    this.fit = fitDistance(w / h);
    this.controls.maxDistance = Math.max(5.2, this.fit * 1.3);
    this.renderer.setSize(w, h, false);
    if (!(w > 0 && h > 0)) return; // Nothing to draw until the window has a size.
    this.camera.aspect = w / h;
    this.#applyViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // Picks in screen space so tiny capitals and microstates stay easy to hit.
  capitalAt(clientX, clientY, pickRadius = PICK_RADIUS_PX) {
    const camPos = this.camera.position;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const v = new THREE.Vector3();
    let best = null;
    let bestDistance = pickRadius;
    for (const country of this.countries) {
      const p = this.positions.get(country.iso2);
      if (p.dot(camPos) <= RADIUS * RADIUS) continue; // Behind the horizon.
      v.copy(p).project(this.camera);
      const d = Math.hypot((v.x + 1) / 2 * w - clientX, (1 - v.y) / 2 * h - clientY);
      if (d < bestDistance) { bestDistance = d; best = country; }
    }
    return best;
  }

  #bindEvents() {
    let down = null;
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      // A second finger means a pinch, which must not count as a tap when it lifts.
      down = { x: e.clientX, y: e.clientY, multi: Boolean(down) };
      this.flight = null;
      this.controls.autoRotate = false;
      canvas.classList.add('is-dragging');
    });
    window.addEventListener('pointerup', (e) => {
      canvas.classList.remove('is-dragging');
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const { multi } = down;
      down = null;
      if (multi || moved > (e.pointerType === 'touch' ? 12 : 6) || e.target !== canvas) return;
      const country = this.capitalAt(e.clientX, e.clientY, e.pointerType === 'touch' ? TOUCH_PICK_RADIUS_PX : PICK_RADIUS_PX);
      this.dispatchEvent(new CustomEvent(country ? 'capitalclick' : 'emptyclick', { detail: country }));
    });
    window.addEventListener('pointercancel', () => { down = null; canvas.classList.remove('is-dragging'); });
    canvas.addEventListener('wheel', () => { this.flight = null; }, { passive: true });
    canvas.addEventListener('pointermove', (e) => {
      if (down || e.pointerType === 'touch') return;
      const country = this.capitalAt(e.clientX, e.clientY);
      canvas.classList.toggle('is-over-capital', Boolean(country));
      if (country !== this.hovered) this.hovered = country;
      this.dispatchEvent(new CustomEvent('capitalhover', { detail: { country, x: e.clientX, y: e.clientY } }));
    });
    canvas.addEventListener('pointerleave', () => {
      this.dispatchEvent(new CustomEvent('capitalhover', { detail: { country: null } }));
    });
    window.addEventListener('resize', () => this.#resize());
  }
}
