import * as T from 'three';
import { box, cyl, ring, beam, merge, M, material } from './models.js';
export const THEMES = ['#ffb357', '#4cecff', '#ff66d5'];
export class ParkAtmosphere {
  constructor(scene) {
    this.scene = scene;
    this.root = new T.Group();
    scene.add(this.root);
    this.time = 0;
    this.waves = [];
    this.accent = new T.Color(THEMES[0]);
    this.ringMat = new T.MeshBasicMaterial({
      color: '#48dfff',
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
    });
    this.orbits = [];
    for (let i = 0; i < 2; i++) {
      const orbit = new T.Group(),
        hoop = new T.Mesh(
          new T.TorusGeometry(4.25 + i * 0.4, 0.025, 4, 96),
          this.ringMat,
        );
      hoop.rotation.x = Math.PI / 2;
      orbit.add(hoop);
      orbit.position.set(-2.6, 8.5 + i * 0.65, -7.7);
      orbit.rotation.z = i === 0 ? 0.1 : -0.13;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const p = new T.Mesh(new T.BoxGeometry(0.15, 0.08, 0.27), this.ringMat);
        p.position.set(
          Math.cos(a) * (4.25 + i * 0.4),
          0,
          Math.sin(a) * (4.25 + i * 0.4),
        );
        orbit.add(p);
      }
      this.root.add(orbit);
      this.orbits.push(orbit);
    }
    const structure = new T.Group();
    // Neon portal frames, brackets and an elevated light-rail guideway.
    for (const side of [-1, 1]) {
      const x = side * 7.55;
      for (const z of [-2.9, 8.9]) {
        beam(structure, [x, 0, z], [x, 3.8, z], 0.07, M.steel);
        beam(structure, [x, 3.8, z], [x - side * 0.8, 4.2, z], 0.07, M.steel);
        beam(structure, [x, 3.6, z], [x - side * 0.72, 4, z], 0.022, M.pink);
      }
      box(structure, x, 0.07, 3, 0.07, 0.05, 12.5, M.cyan);
      for (let k = 0; k < 10; k++)
        box(
          structure,
          x + side * 0.3,
          0.08,
          -2.4 + k * 1.2,
          0.16,
          0.055,
          0.45,
          k % 2 ? M.cyan : M.pink,
        );
    }
    for (const z of [-15.2, -14.45])
      beam(structure, [-23, 6.12, z], [23, 6.12, z], 0.03, M.cyan);
    this.root.add(merge(structure));
    const train = new T.Group();
    for (let i = 0; i < 3; i++) {
      const x = i * 2.2;
      box(train, x, 0, 0, 2, 0.58, 0.65, M.dark);
      box(train, x, -0.27, 0.35, 2, 0.05, 0.04, M.cyan);
      box(train, x, 0.31, 0, 1.8, 0.04, 0.56, M.pink);
      for (let k = 0; k < 4; k++)
        box(train, x - 0.66 + k * 0.44, 0.045, 0.335, 0.28, 0.26, 0.03, M.cyan);
    }
    this.train = merge(train);
    this.train.position.set(-15, 6.65, -14.7);
    this.root.add(this.train);
    this.beams = [];
    for (const [x, z, color] of [
      [-13, -5, '#25d7ff'],
      [13, -6, '#ff52cf'],
      [-13, 10, '#ffbd68'],
      [13, 10, '#3ee8ff'],
    ]) {
      const pivot = new T.Group();
      pivot.position.set(x, 0, z);
      const shaft = new T.Mesh(
        new T.CylinderGeometry(1.65, 0.08, 19, 12, 1, true),
        new T.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.038,
          depthWrite: false,
          side: T.DoubleSide,
          blending: T.AdditiveBlending,
        }),
      );
      shaft.position.y = 9.5;
      pivot.add(shaft);
      cyl(pivot, 0, 0.22, 0, 0.42, 0.44, M.steel);
      ring(pivot, 0, 0.455, 0, 0.4, material(color, 3));
      this.root.add(pivot);
      this.beams.push(pivot);
    }
    this.trailMat = new T.MeshBasicMaterial({
      color: THEMES[0],
      toneMapped: false,
    });
    this.trails = new T.InstancedMesh(
      new T.BoxGeometry(0.12, 0.065, 0.26),
      this.trailMat,
      64,
    );
    this.trails.frustumCulled = false;
    this.root.add(this.trails);
    this.dummy = new T.Object3D();
    const geometry = new T.BufferGeometry(),
      positions = new Float32Array(520 * 3);
    for (let i = 0; i < 520; i++) {
      positions[i * 3] = (Math.sin(i * 31.37) * 0.5 + 0.5) * 44 - 22;
      positions[i * 3 + 1] = (Math.sin(i * 17.13) * 0.5 + 0.5) * 16;
      positions[i * 3 + 2] = (Math.cos(i * 6.27) * 0.5 + 0.5) * 45 - 25;
    }
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    this.dust = new T.Points(
      geometry,
      new T.PointsMaterial({
        color: THEMES[0],
        size: 0.055,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.root.add(this.dust);
    this.key = new T.PointLight('#45e7ff', 45, 24, 2);
    this.key.position.set(-5, 4, 2);
    this.root.add(this.key);
    this.fill = new T.PointLight('#f354cf', 38, 22, 2);
    this.fill.position.set(7, 3, 0);
    this.root.add(this.fill);
  }
  setLevel(level) {
    this.accent.set(THEMES[level]);
    this.trailMat.color.copy(this.accent);
    this.dust.material.color.copy(this.accent);
    this.fill.color.copy(this.accent);
  }
  shock(position, color = this.accent) {
    const ring = new T.Mesh(
      new T.RingGeometry(0.84, 1, 48),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
        blending: T.AdditiveBlending,
        toneMapped: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = 0.22;
    this.root.add(ring);
    this.waves.push({ mesh: ring, time: 0 });
    if (this.waves.length > 12) {
      const first = this.waves.shift();
      this.removeWave(first);
    }
  }
  removeWave(w) {
    this.root.remove(w.mesh);
    w.mesh.geometry.dispose();
    w.mesh.material.dispose();
  }
  update(dt, reduced = false) {
    if (!reduced) this.time += dt;
    const t = this.time;
    this.orbits.forEach((o, i) => (o.rotation.y = t * (i ? -0.1 : 0.08)));
    this.train.position.x = -23 + ((t * 1.7) % 46);
    this.beams.forEach((b, i) => {
      b.rotation.x = 0.13 + Math.sin(t * 0.18 + i * 1.6) * 0.2;
      b.rotation.z = Math.sin(t * 0.23 + i * 2) * 0.23;
    });
    for (let i = 0; i < 64; i++) {
      const p = ((i / 64) * 51.2 + t * 2.3) % 51.2;
      let x, z, rot;
      if (p < 13.6) {
        x = -6.8 + p;
        z = -3.05;
        rot = Math.PI / 2;
      } else if (p < 25.6) {
        x = 6.8;
        z = -3.05 + p - 13.6;
        rot = 0;
      } else if (p < 39.2) {
        x = 6.8 - (p - 25.6);
        z = 8.95;
        rot = Math.PI / 2;
      } else {
        x = -6.8;
        z = 8.95 - (p - 39.2);
        rot = 0;
      }
      this.dummy.position.set(x, 0.105, z);
      this.dummy.rotation.y = rot;
      this.dummy.updateMatrix();
      this.trails.setMatrixAt(i, this.dummy.matrix);
    }
    this.trails.instanceMatrix.needsUpdate = true;
    this.dust.rotation.y = Math.sin(t * 0.03) * 0.03;
    this.dust.position.y = Math.sin(t * 0.2) * 0.16;
    this.waves = this.waves.filter((w) => {
      w.time += dt;
      if (w.time > 0.65) {
        this.removeWave(w);
        return false;
      }
      w.mesh.scale.setScalar(0.15 + w.time * 4.5);
      w.mesh.material.opacity = 0.75 * (1 - w.time / 0.65);
      return true;
    });
  }
  reset() {
    for (const w of this.waves) this.removeWave(w);
    this.waves = [];
  }
  dispose() {
    this.reset();
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.scene.remove(this.root);
  }
}
