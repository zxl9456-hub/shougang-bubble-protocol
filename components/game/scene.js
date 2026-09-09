import * as T from 'three';
import { buildDistrict } from './environment.js';
import { ParkAtmosphere } from './atmosphere.js';
import { buildGroundMosaic, updateGroundMosaic } from './mosaic.js';
import { animatedRunner, playAction } from './assets.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { M, material, box, cyl, ring, merge, crate } from './models.js';
import {
  createDaylight,
  ContactShadows,
  LobbyDepthOfField,
  resolutionFor,
} from './cinema.js';
import {
  createGuardian,
  animateGuardian,
  EncounterMarkers,
} from './guardian.js';
export class ParkScene {
  constructor(host, assets, options = {}) {
    this.assets = assets;
    this.host = host;
    this.quality = options.quality === 'balanced' ? 'balanced' : 'high';
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#344a66');
    this.scene.fog = new T.Fog('#536779', 48, 145);
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.78;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.lobbyCamera = new T.PerspectiveCamera(45, 1, 0.1, 400);
    this.lobbyCamera.position.set(17, 9.2, 23);
    this.lobbyCamera.lookAt(0.8, 2.5, -4.5);
    this.gameCamera = new T.OrthographicCamera(-15, 15, 12, -12, 0.1, 400);
    this.gameCamera.position.set(5, 21, 27);
    this.gameCamera.lookAt(0, 0.7, 1.7);
    this.revealCamera = this.gameCamera.clone();
    this.camera = this.lobbyCamera;
    this.scene.add(new T.HemisphereLight('#b8d7ef', '#5e4b38', 0.9));
    const sun = new T.DirectionalLight('#ffdda5', 2.1);
    sun.position.set(-18, 26, -12);
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
    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 3;
    this.sun = sun;
    this.scene.add(sun);
    const rim = new T.DirectionalLight('#a2d9ee', 0.65);
    rim.position.set(8, 12, 18);
    this.scene.add(rim);
    this.daylight = createDaylight(this.scene, this.renderer);
    const target = new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType,
      samples: Math.min(4, this.renderer.capabilities.maxSamples),
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.contactShadows = new ContactShadows(this.scene, this.camera);
    this.composer.addPass(this.contactShadows);
    this.depthOfField = new LobbyDepthOfField(this.scene, this.lobbyCamera);
    this.composer.addPass(this.depthOfField);
    this.bloom = new UnrealBloomPass(new T.Vector2(1024, 768), 0.18, 0.3, 2.2);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.models = new Map();
    this.tiles = new Map();
    this.particles = [];
    this.labels = [];
    this.elapsed = 0;
    this.playing = false;
    this.buildPark();
    this.setQuality(this.quality);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  buildPark() {
    const built = buildDistrict(this.scene, this.assets);
    this.landmarks = built.landmarks;
    this.reflector = built.reflector;
    this.floorTexture = built.floorTexture;
    this.surfaceMaps = built.maps;
    this.landscape = built.landscape;
    this.floorTexture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    Object.values(this.surfaceMaps).forEach(
      (t) => (t.anisotropy = this.floorTexture.anisotropy),
    );
    this.atmosphere = new ParkAtmosphere(this.scene);
    this.encounterMarkers = new EncounterMarkers(this.scene);
    this.mosaics = this.assets.mosaics.map((data, i) => {
      const m = buildGroundMosaic(data, i);
      this.scene.add(m);
      return m;
    });
    this.showcase = new T.Group();
    const scout = animatedRunner(this.assets.runner, '#39d8f5'),
      forge = animatedRunner(this.assets.forge, '#ff7753');
    scout.position.set(2.5, 0.08, 11.3);
    forge.position.set(5, 0.08, 10.3);
    scout.scale.setScalar(2.1);
    forge.scale.setScalar(2.1);
    scout.rotation.y = 0.6;
    forge.rotation.y = 0.48;
    this.showcase.add(scout, forge);
    this.scene.add(this.showcase);
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
    const resolution = resolutionFor(
      w,
      h,
      window.devicePixelRatio || 1,
      this.quality,
    );
    this.renderer.setSize(resolution.width, resolution.height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.composer.setSize(resolution.width, resolution.height);
    const a = w / h,
      span = a < 1 ? 11 : 9.3;
    this.gameCamera.left = -span * a;
    this.gameCamera.right = span * a;
    this.gameCamera.top = span;
    this.gameCamera.bottom = -span;
    this.gameCamera.updateProjectionMatrix();
    const revealSpan = a < 1 ? 8.8 : 8.2;
    Object.assign(this.revealCamera, {
      left: -revealSpan * a,
      right: revealSpan * a,
      top: revealSpan,
      bottom: -revealSpan,
    });
    const target = new T.Vector3(a < 1 ? 0 : 2, 0, a < 1 ? 5.5 : 3);
    this.revealCamera.position.copy(target).add(new T.Vector3(0, 24, 11));
    this.revealCamera.lookAt(target);
    this.revealCamera.updateProjectionMatrix();
    this.lobbyCamera.aspect = a;
    this.lobbyCamera.fov = a < 1 ? 60 : 45;
    this.lobbyCamera.updateProjectionMatrix();
    this.depthOfField.uniforms.aspect.value = a;
  }
  setQuality(quality) {
    this.quality = quality === 'balanced' ? 'balanced' : 'high';
    const high = this.quality === 'high';
    this.contactShadows.enabled = high;
    this.depthOfField.enabled = high && !this.playing && !this.reveal;
    const shadowSize = high ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== shadowSize) {
      this.sun.shadow.mapSize.set(shadowSize, shadowSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.sun.shadow.needsUpdate = true;
    }
    this.reflector
      ?.getRenderTarget()
      .setSize(high ? 1024 : 512, high ? 1024 : 512);
    this.resize();
  }
  useCamera(camera) {
    this.camera = camera;
    this.renderPass.camera = camera;
    this.contactShadows.setCamera(camera);
    this.depthOfField.enabled =
      this.quality === 'high' && camera === this.lobbyCamera;
  }
  setUnlocked(flags) {
    this.unlocked = [...flags];
    this.landmarks.forEach((g, i) =>
      g.traverse((o) => {
        if (o.isMesh)
          o.material.emissiveIntensity =
            o.userData.glow * (flags[i] ? 1.8 : 0.12);
      }),
    );
    this.labels.forEach((l) =>
      l.el.classList.toggle('activated', !!flags[l.index]),
    );
  }
  configureLevel(level) {
    this.currentLevel = level;
    this.atmosphere.setLevel(level);
  }
  setPlaying(v) {
    this.reveal = null;
    this.finale = null;
    this.encounterMarkers.root.visible = true;
    this.mosaics.forEach((m) => {
      m.visible = false;
      m.userData.pixels.count = 0;
    });
    this.tiles.forEach((m) => (m.visible = true));
    this.atmosphere.reset();
    if (this.unlocked) this.setUnlocked(this.unlocked);
    this.bloom.strength = 0.18;
    this.showcase.visible = !v;
    this.lobbyCamera.position.set(17, 9.2, 23);
    this.lobbyCamera.lookAt(0.8, 2.5, -4.5);
    this.playing = v;
    this.useCamera(v ? this.gameCamera : this.lobbyCamera);
    this.resize();
    this.labels.forEach((l) => (l.el.style.opacity = v ? '.6' : '1'));
  }
  position(x, z, y = 0) {
    return new T.Vector3(x - 6, y, z - 2);
  }
  sync(state) {
    if (this.reveal && state.status === 'finished') return;
    this.encounterMarkers?.sync(state);
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
          const border =
            x === 0 ||
            z === 0 ||
            x === state.width - 1 ||
            z === state.height - 1;
          cyl(
            m,
            0,
            border ? 0.11 : 0.3,
            0,
            border ? 0.24 : 0.34,
            border ? 0.22 : 0.6,
            M.steel,
            undefined,
            16,
          );
          cyl(
            m,
            0,
            border ? 0.24 : 0.63,
            0,
            border ? 0.25 : 0.35,
            0.05,
            M.concrete,
            undefined,
            16,
          );
          ring(m, 0, border ? 0.245 : 0.49, 0, border ? 0.25 : 0.35, M.cyan);
          m = merge(m);
        } else m = crate((x + z) % 3 === 0);
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
      ...(state.boss && state.boss.hp > 0
        ? [
            {
              ...state.boss,
              kind: 'boss',
              level: state.level,
              charging: state.warnings.some((w) => w.kind === 'attack'),
            },
          ]
        : []),
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
      g = animatedRunner(
        e.id % 2 === 0 ? this.assets.forge : this.assets.runner,
        e.color,
      );
      ring(g, 0, 0.015, 0, 0.39, material(e.color, 1.5));
      if (e.minion) g.scale.multiplyScalar(0.75);
    }
    if (e.kind === 'boss') g = createGuardian(e.level);
    if (e.kind === 'bomb') {
      const sphere = new T.Mesh(
        new T.SphereGeometry(0.35, 32, 20),
        new T.MeshPhysicalMaterial({
          color: e.color || '#68ffe4',
          emissive: e.color || '#68ffe4',
          emissiveIntensity: 0.12,
          metalness: 0.05,
          roughness: 0.06,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          iridescence: 0.85,
          iridescenceIOR: 1.3,
          iridescenceThicknessRange: [110, 380],
          envMapIntensity: 1.8,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        }),
      );
      sphere.position.y = 0.37;
      sphere.castShadow = true;
      g.add(sphere);
      ring(g, 0, 0.37, 0, 0.35, material(e.color || '#68ffe4', 2));
      cyl(g, 0, 0.15, 0, 0.14, 0.12, M.white);
      const spark = new T.Mesh(
        new T.SphereGeometry(0.07, 12, 8),
        material('#fff8df', 1.5),
      );
      spark.scale.set(0.55, 1.2, 0.5);
      spark.rotation.z = -0.5;
      spark.position.set(-0.13, 0.6, 0.21);
      g.add(spark);
    }
    if (e.kind === 'pickup') {
      const ma = e.type === 'range' ? M.pink : M.cyan;
      const m = new T.Mesh(new T.OctahedronGeometry(0.26, 0), ma);
      m.position.y = 0.5;
      g.add(m);
      ring(g, 0, 0.03, 0, 0.3, ma);
    }
    if (e.kind === 'blast') {
      const ma = new T.MeshBasicMaterial({
        color: e.hazard ? '#ff673d' : '#87fff0',
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
    if (
      event.type === 'boss-hit' ||
      event.type === 'boss-defeated' ||
      event.type === 'summon'
    )
      this.burst(
        this.position(event.x, event.z, 0.9),
        event.type === 'boss-defeated' ? 65 : 16,
        event.type === 'summon' ? '#cf79ff' : '#ffb24b',
      );
    if (event.type === 'finish' && event.result === 'complete')
      this.finale = { time: 0, next: 0 };
    if (event.type === 'explode' && !this.reduced)
      this.atmosphere.shock(this.position(event.x, event.z, 0.15));
    if (event.type === 'destroy')
      this.burst(this.position(event.x, event.z, 0.5), 20, '#ffb85b');
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
  celebrateLandmark(index) {
    const landmark = this.landmarks[index];
    if (!landmark) return;
    this.reveal = { index, time: 0 };
    this.encounterMarkers.root.visible = false;
    this.useCamera(this.revealCamera);
    this.mosaics.forEach((m, i) => (m.visible = i === index));
    this.tiles.forEach((m) => (m.visible = false));
    this.models.forEach((m) => (m.visible = false));
    this.labels.forEach((l) => (l.el.style.opacity = '0'));
    this.burst(new T.Vector3(-5, 0.3, -1), 30, '#ffe395');
    this.burst(new T.Vector3(5, 0.3, 7), 30, '#71eaff');
    this.bloom.strength = 0.28;
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
    this.atmosphere.update(dt, this.reduced);
    this.landscape.update(dt, this.reduced);
    this.encounterMarkers.update(t, this.reduced);
    if (this.finale) {
      this.finale.time += dt;
      if (this.finale.time < 9 && this.finale.time >= this.finale.next) {
        const side = Math.floor(this.finale.next) % 2 ? -1 : 1;
        this.burst(
          new T.Vector3(side * 5, 3.5, 1 + Math.sin(this.finale.next) * 3),
          26,
          side > 0 ? '#ffcf6e' : '#70e5ff',
        );
        this.finale.next += 0.9;
      }
    }
    if (!this.playing && !this.reduced) {
      this.lobbyCamera.position.x = 17 + Math.sin(t * 0.075) * 0.45;
      this.lobbyCamera.position.y = 9.2 + Math.sin(t * 0.11) * 0.12;
      this.lobbyCamera.lookAt(0.8, 2.5, -4.5);
    }
    if (this.showcase.visible)
      for (const model of this.showcase.children)
        model.userData.mixer.update(dt);
    if (this.reveal) {
      this.reveal.time += dt;
      updateGroundMosaic(
        this.mosaics[this.reveal.index],
        this.reveal.time,
        this.reduced,
      );
      const pulse =
        Math.max(0, 1 - this.reveal.time / 2.1) *
        (1 + Math.sin(this.reveal.time * 12) * 0.3);
      this.landmarks[this.reveal.index].traverse((o) => {
        if (o.isMesh)
          o.material.emissiveIntensity = o.userData.glow * (1.8 + pulse * 2);
      });
      this.bloom.strength = 0.18 + pulse * 0.1;
    }
    for (const [key, m] of this.models) {
      if (this.reveal) {
        m.visible = false;
        continue;
      }
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
      } else if (e.kind === 'boss') {
        m.position.copy(target);
        animateGuardian(m, e, t, this.reduced);
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
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material.isMeshPhysicalMaterial) o.material.dispose();
      }
    });
  }
  dispose() {
    this.observer.disconnect();
    this.atmosphere.dispose();
    this.encounterMarkers.dispose();
    this.landscape.dispose();
    this.daylight.target.dispose();
    this.daylight.sky.geometry.dispose();
    this.daylight.sky.material.dispose();
    this.sun.shadow.dispose();
    this.labels.forEach((l) => l.el.remove());
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.reflector?.getRenderTarget().dispose();
    this.floorTexture?.dispose();
    Object.values(this.surfaceMaps).forEach((t) => t.dispose());
    for (const pass of this.composer.passes) pass.dispose?.();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
