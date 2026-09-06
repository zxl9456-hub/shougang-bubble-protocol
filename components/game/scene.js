import * as T from 'three';
import { buildDistrict } from './environment.js';
import { animatedRunner, playAction } from './assets.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { M, material, box, cyl, ring, merge, crate } from './models.js';
export class ParkScene {
  constructor(host, assets) {
    this.assets = assets;
    this.host = host;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#070d30');
    this.scene.fog = new T.FogExp2('#151343', 0.009);
    this.renderer = new T.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    host.appendChild(this.renderer.domElement);
    this.lobbyCamera = new T.PerspectiveCamera(48, 1, 0.1, 180);
    this.lobbyCamera.position.set(16, 10.5, 24);
    this.lobbyCamera.lookAt(-0.8, 3.1, -5);
    this.gameCamera = new T.OrthographicCamera(-15, 15, 12, -12, 0.1, 180);
    this.gameCamera.position.set(5, 21, 27);
    this.gameCamera.lookAt(0, 0.7, 1.7);
    this.camera = this.lobbyCamera;
    this.scene.add(new T.HemisphereLight('#8298ff', '#181024', 1.6));
    const sun = new T.DirectionalLight('#73c8ff', 2.1);
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
    const rim = new T.DirectionalLight('#ff389e', 2.1);
    rim.position.set(10, 8, -10);
    this.scene.add(rim);
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(
      new T.Vector2(1024, 768),
      0.55,
      0.45,
      1.15,
    );
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
    const built = buildDistrict(this.scene, this.assets);
    this.landmarks = built.landmarks;
    this.reflector = built.reflector;
    this.floorTexture = built.floorTexture;
    [
      [-2.6, 10.2, -7.7],
      [5.2, 7.2, -10.8],
      [-10.6, 6.3, -10.8],
    ].forEach((p, i) =>
      this.label(
        ['三高炉 / 03', '冷却塔 / 02', '雪飞天 / 01'][i],
        new T.Vector3(...p),
        i,
      ),
    );
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
    const pixelScale = w < 700 ? 0.95 : 0.8;
    this.renderer.setSize(
      Math.round(w * pixelScale),
      Math.round(h * pixelScale),
      false,
    );
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.composer.setSize(
      Math.round(w * pixelScale),
      Math.round(h * pixelScale),
    );
    const a = w / h,
      span = a < 1 ? 11 : 9.3;
    this.gameCamera.left = -span * a;
    this.gameCamera.right = span * a;
    this.gameCamera.top = span;
    this.gameCamera.bottom = -span;
    this.gameCamera.updateProjectionMatrix();
    this.lobbyCamera.aspect = a;
    this.lobbyCamera.fov = a < 1 ? 60 : 48;
    this.lobbyCamera.updateProjectionMatrix();
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
    this.camera = v ? this.gameCamera : this.lobbyCamera;
    this.renderPass.camera = this.camera;
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
      g = animatedRunner(this.assets.runner, e.color);
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
  handleEvent(event) {
    const m = this.models.get(`player-${event.player}`);
    if (!m) return;
    if (event.type === 'bomb') {
      playAction(m, 'PlaceBubble', true);
      m.userData.actionUntil = this.elapsed + 0.6;
    }
    if (event.type === 'hurt') {
      playAction(m, 'Hit', true);
      m.userData.actionUntil = this.elapsed + 0.66;
    }
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
        if (m.userData.actionUntil <= t)
          playAction(m, delta > 0.02 ? 'Walk' : 'Idle');
        m.userData.mixer.update(dt);
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
    g.userData.mixer?.stopAllAction();
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
    this.reflector?.getRenderTarget().dispose();
    this.floorTexture?.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
