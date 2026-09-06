import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  M,
  material,
  box,
  cyl,
  beam,
  ring,
  merge,
  furnace,
  coolingTower,
  bigAir,
  runner,
  crate,
} from './models.js';
export class ParkScene {
  constructor(host) {
    this.host = host;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#07141e');
    this.scene.fog = new T.FogExp2('#07141e', 0.024);
    this.renderer = new T.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    host.appendChild(this.renderer.domElement);
    this.camera = new T.OrthographicCamera(-15, 15, 12, -12, 0.1, 140);
    this.camera.position.set(16, 23, 29);
    this.camera.lookAt(0, 1, -1.8);
    this.scene.add(new T.HemisphereLight('#9fdcca', '#152235', 2.3));
    const sun = new T.DirectionalLight('#accfe1', 3.1);
    sun.position.set(-8, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -22,
      right: 22,
      top: 20,
      bottom: -20,
      near: 1,
      far: 70,
    });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    const rim = new T.DirectionalLight('#ff9270', 1.5);
    rim.position.set(10, 8, -10);
    this.scene.add(rim);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(1024, 768), 0.42, 0.4, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.models = new Map();
    this.tiles = new Map();
    this.particles = [];
    this.labels = [];
    this.elapsed = 0;
    this.playing = false;
    this.buildPark();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  buildPark() {
    const g = new T.Group();
    box(g, 0, -0.55, 0, 24, 0.7, 22, M.dark);
    box(g, 0, -0.95, 0, 25, 0.25, 23, M.black);
    box(g, 0, -0.15, 0, 23.5, 0.13, 21.5, material('#1b303b'));
    for (let i = -11; i < 12; i++) {
      box(g, i, 0.005, -1, 0.015, 0.012, 19, material('#29444c'));
    }
    for (let z = -10; z < 10; z++)
      box(g, 0, 0.005, z, 22, 0.012, 0.015, material('#29444c'));
    // Two disused rail tracks and sleepers along the factory apron.
    for (const x of [-8.5, -8.1])
      box(g, x, 0.065, 3, 0.055, 0.045, 15, M.concrete);
    for (let z = -4; z < 11; z += 0.48)
      box(g, -8.3, 0.01, z, 0.95, 0.06, 0.1, M.rust);
    for (let z = -8; z < 10; z += 3.5) {
      for (const x of [-10.6, 10.6]) {
        beam(g, [x, 0, z], [x, 2.3, z], 0.04);
        beam(g, [x, 2.3, z], [x + (x > 0 ? -0.55 : 0.55), 2.3, z], 0.035);
        box(g, x + (x > 0 ? -0.5 : 0.5), 2.28, z, 0.45, 0.045, 0.12, M.cyan);
      }
    }
    // Elevated pipework is characteristic of the Shougang industrial site.
    for (const x of [-9.6, 9.6]) {
      for (const y of [1, 1.35]) beam(g, [x, y, -8], [x, y, 7], 0.14, M.rust);
      for (let z = -7; z < 8; z += 2.5) {
        beam(g, [x, 0, z], [x, 1.7, z], 0.08);
        box(g, x, 1.6, z, 0.9, 0.08, 0.1);
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = -17 + i * 4.2;
      const h = 1.5 + ((i * 7) % 5);
      box(g, x, h / 2, -18, 2.8, h, 3, material('#19313b'));
      for (let j = 0; j < 4; j++)
        box(
          g,
          x - 1 + j * 0.6,
          h * 0.7,
          -16.48,
          0.16,
          0.1,
          0.02,
          material('#489c97', 0.25),
        );
    }
    for (let i = 0; i < 5; i++) {
      cyl(g, -14 + i * 6, 5, -21, 0.28, 10, material('#233b43'));
      cyl(g, -14 + i * 6, 9.5, -21, 0.3, 0.12, M.amber);
    }
    this.scene.add(merge(g));
    this.landmarks = [];
    const layouts = [
      [furnace(), -5.7, -7.3, 1.18],
      [coolingTower(), 0.2, -9, 1.4],
      [bigAir(), 7, -6.9, 1],
    ];
    layouts.forEach(([m, x, z, s], i) => {
      m.position.set(x, 0.03, z);
      m.scale.setScalar(s);
      this.scene.add(m);
      m.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.userData.glow = o.material.emissiveIntensity;
        }
      });
      this.landmarks.push(m);
      this.label(
        ['03 / 三高炉', '02 / 冷却塔', '01 / 雪飞天'][i],
        new T.Vector3(x, i === 1 ? 7.05 : i === 0 ? 7 : 5.35, z),
        i,
      );
    });
    const twin = coolingTower();
    twin.position.set(3.6, 0, -12);
    twin.scale.setScalar(0.93);
    this.scene.add(twin);
    // Neon perimeter, segmented hazard stripes and structural bolts.
    const p = new T.Group();
    box(p, 0, -0.02, 3, 13.6, 0.3, 11.6, M.black);
    for (const x of [-6.8, 6.8]) box(p, x, 0.14, 3, 0.055, 0.09, 11.6, M.cyan);
    for (const z of [-2.8, 8.8]) box(p, 0, 0.14, z, 13.6, 0.09, 0.055, M.cyan);
    for (let x = -6; x <= 6; x++) {
      box(p, x, 0.17, 9.05, 0.45, 0.02, 0.17, x % 2 === 0 ? M.amber : M.dark);
    }
    this.scene.add(merge(p));
    const stars = new Float32Array(330);
    for (let i = 0; i < 110; i++) {
      stars[i * 3] = Math.sin(i * 37.7) * 38;
      stars[i * 3 + 1] = 8 + ((i * 7) % 15);
      stars[i * 3 + 2] = -17 - Math.abs(Math.cos(i * 9)) * 22;
    }
    const sg = new T.BufferGeometry();
    sg.setAttribute('position', new T.BufferAttribute(stars, 3));
    this.stars = new T.Points(
      sg,
      new T.PointsMaterial({
        color: '#6ca1a0',
        size: 0.04,
        transparent: true,
        opacity: 0.6,
      }),
    );
    this.scene.add(this.stars);
  }
  label(text, position, index) {
    const el = document.createElement('div');
    el.className = 'world-label';
    el.textContent = text;
    this.host.appendChild(el);
    this.labels.push({ el, position, index });
  }
  resize() {
    let w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    const a = w / h;
    const span = this.playing ? (a < 1 ? 12.5 : 9.8) : a < 1 ? 12 : 10.8;
    this.camera.left = -span * a;
    this.camera.right = span * a;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
  }
  setUnlocked(flags) {
    this.landmarks.forEach((g, i) =>
      g.traverse((o) => {
        if (o.isMesh)
          o.material.emissiveIntensity =
            o.userData.glow * (flags[i] ? 1.8 : 0.5);
      }),
    );
    this.labels.forEach((l) =>
      l.el.classList.toggle('activated', !!flags[l.index]),
    );
  }
  setPlaying(v) {
    this.playing = v;
    this.resize();
    this.labels.forEach((l) => (l.el.style.opacity = v ? '.6' : '1'));
  }
  position(x, z, y = 0) {
    return new T.Vector3(x - 6, y, z - 2);
  }
  sync(state) {
    const wanted = new Set();
    for (let z = 0; z < state.height; z++)
      for (let x = 0; x < state.width; x++) {
        const type = state.grid[z][x];
        const k = `tile-${x}-${z}`;
        if (type === 0) continue;
        wanted.add(k);
        if (this.tiles.get(k)?.userData.type === type) continue;
        if (this.tiles.has(k)) {
          this.scene.remove(this.tiles.get(k));
          this.tiles.delete(k);
        }
        let m;
        if (type === 1) {
          m = new T.Group();
          box(m, 0, 0.32, 0, 0.91, 0.64, 0.91, M.steel);
          box(m, 0, 0.66, 0, 0.92, 0.06, 0.92, M.concrete);
          box(m, 0, 0.47, 0.465, 0.25, 0.06, 0.025, M.cyan);
          m = merge(m);
        } else m = crate(type === 3);
        m.position.copy(this.position(x, z, 0.17));
        m.userData.type = type;
        this.tiles.set(k, m);
        this.scene.add(m);
      }
    for (const [k, m] of this.tiles)
      if (!wanted.has(k)) {
        this.scene.remove(m);
        this.tiles.delete(k);
        this.burst(m.position, 12, '#ffa960');
        this.disposeObject(m);
      }
    const entities = [
      ...state.players.map((v) => ({ ...v, kind: 'player' })),
      ...state.bombs.map((v) => ({ ...v, kind: 'bomb' })),
      ...state.pickups.map((v) => ({ ...v, kind: 'pickup' })),
      ...state.blasts.map((v) => ({ ...v, kind: 'blast' })),
    ];
    const seen = new Set();
    for (const e of entities) {
      if (e.alive === false) continue;
      const key = `${e.kind}-${e.id}`;
      seen.add(key);
      let m = this.models.get(key);
      if (!m) {
        m = this.createEntity(e);
        this.models.set(key, m);
        this.scene.add(m);
        m.position.copy(this.position(e.x, e.z, 0.18));
      }
      m.userData.entity = e;
    }
    for (const [k, m] of this.models)
      if (!seen.has(k)) {
        if (k.startsWith('player'))
          this.burst(m.position, 25, m.userData.entity.color || '#ff597d');
        if (k.startsWith('bomb')) this.burst(m.position, 10, '#69ffe0');
        this.scene.remove(m);
        this.disposeObject(m);
        this.models.delete(k);
      }
  }
  createEntity(e) {
    let g = new T.Group();
    if (e.kind === 'player') {
      g = runner(e.color);
      ring(g, 0, 0.015, 0, 0.39, material(e.color, 1.5));
    }
    if (e.kind === 'bomb') {
      const sphere = new T.Mesh(
        new T.IcosahedronGeometry(0.34, 2),
        new T.MeshPhysicalMaterial({
          color: e.color || '#68ffe4',
          emissive: e.color || '#68ffe4',
          emissiveIntensity: 0.35,
          metalness: 0.18,
          roughness: 0.12,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
        }),
      );
      sphere.position.y = 0.37;
      g.add(sphere);
      ring(g, 0, 0.37, 0, 0.35, material(e.color || '#68ffe4', 2));
      cyl(g, 0, 0.15, 0, 0.14, 0.12, M.white);
      const spark = new T.Mesh(new T.IcosahedronGeometry(0.075, 0), M.white);
      spark.position.set(-0.13, 0.55, 0.18);
      g.add(spark);
    }
    if (e.kind === 'pickup') {
      const ma =
        e.type === 'core' ? M.amber : e.type === 'range' ? M.pink : M.cyan;
      const m = new T.Mesh(new T.OctahedronGeometry(0.26, 0), ma);
      m.position.y = 0.5;
      g.add(m);
      ring(g, 0, 0.03, 0, 0.3, ma);
    }
    if (e.kind === 'blast') {
      const ma = new T.MeshBasicMaterial({
        color: '#87fff0',
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      box(g, 0, 0.18, 0, 0.94, 0.25, 0.94, ma);
      box(g, 0, 0.31, 0, 0.58, 0.12, 0.58, M.white);
    }
    return g;
  }
  burst(pos, n, color) {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(
        new T.BoxGeometry(0.09, 0.09, 0.09),
        material(color, 1),
      );
      m.position.copy(pos).add(new T.Vector3(0, 0.4, 0));
      this.scene.add(m);
      this.particles.push({
        m,
        v: new T.Vector3(
          (Math.random() - 0.5) * 4,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 4,
        ),
        life: 0.7 + Math.random() * 0.3,
      });
    }
  }
  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed;
    for (const [key, m] of this.models) {
      const e = m.userData.entity,
        target = this.position(e.x, e.z, 0.18);
      if (e.kind === 'player') {
        const delta = m.position.distanceTo(target);
        m.position.lerp(target, Math.min(1, dt * 16));
        if (e.dx || e.dz) m.rotation.y = Math.atan2(e.dx, e.dz);
        const phase = delta > 0.02 ? Math.sin(t * 20) * 0.6 : 0;
        m.userData.legs.forEach(
          (l, i) => (l.rotation.x = phase * (i ? 1 : -1)),
        );
        m.userData.arms.forEach(
          (a, i) => (a.rotation.x = phase * (i ? -1 : 1)),
        );
        m.visible = e.invincible <= 0 || Math.floor(t * 10) % 2 === 0;
      } else if (e.kind === 'bomb') {
        m.position.copy(target);
        const s = 1 + Math.sin(t * (e.fuse < 0.8 ? 22 : 6)) * 0.07;
        m.scale.setScalar(s);
      } else if (e.kind === 'pickup') {
        m.position.copy(target);
        m.position.y += Math.sin(t * 3) * 0.08;
        m.rotation.y += dt;
      } else if (e.kind === 'blast') {
        m.scale.y = 0.6 + Math.sin(t * 35) * 0.4;
      }
    }
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        p.m.geometry.dispose();
        return false;
      }
      p.v.y -= 8 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += dt * 4;
      p.m.scale.setScalar(Math.max(0.01, p.life));
      return true;
    });
    for (const l of this.labels) {
      const v = l.position.clone().project(this.camera);
      l.el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * this.host.clientWidth}px,${(-v.y * 0.5 + 0.5) * this.host.clientHeight}px)`;
    }
    this.composer.render();
  }
  disposeObject(g) {
    g.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
  }
  dispose() {
    this.observer.disconnect();
    this.labels.forEach((l) => l.el.remove());
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
