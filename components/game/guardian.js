import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, cyl, ring, merge } from './models.js';

export function createGuardian(level = 0) {
  const root = new T.Group(),
    body = new T.Group();
  const accent = ['#ffae54', '#45d8ed', '#ff6547'][level];
  const armor = new T.MeshPhysicalMaterial({
    color: '#344953',
    metalness: 0.65,
    roughness: 0.36,
    clearcoat: 0.4,
  });
  const trim = new T.MeshPhysicalMaterial({
    color: '#bdbba9',
    metalness: 0.65,
    roughness: 0.32,
  });
  const black = new T.MeshPhysicalMaterial({
    color: '#101c25',
    metalness: 0.5,
    roughness: 0.5,
  });
  const glow = new T.MeshPhysicalMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.3,
    roughness: 0.3,
  });
  const hull = new T.Mesh(
    new RoundedBoxGeometry(1.12, 1.05, 0.73, 2, 0.09),
    armor,
  );
  hull.position.y = 1.02;
  body.add(hull);
  box(body, 0, 1.79, 0, 0.89, 0.58, 0.65, armor);
  box(body, 0, 1.82, 0.34, 0.72, 0.2, 0.06, black);
  for (const side of [-1, 1]) {
    box(body, side * 0.22, 1.84, 0.385, 0.21, 0.06, 0.035, glow);
    box(body, side * 0.35, 0.3, 0.06, 0.48, 0.37, 0.74, black);
    box(body, side * 0.35, 0.51, 0.02, 0.31, 0.17, 0.39, trim);
    cyl(body, side * 0.34, 1.7, -0.33, 0.12, 1, armor, 0.1, 8);
    cyl(body, side * 0.34, 2.2, -0.33, 0.14, 0.07, trim, 0.14, 8);
    box(body, side * 0.6, 1.18, 0, 0.1, 0.48, 0.6, trim);
  }
  box(body, 0, 1.07, 0.39, 0.66, 0.65, 0.1, black);
  box(body, 0, 1.07, 0.45, 0.41, 0.46, 0.045, glow);
  for (let i = -1; i <= 1; i++)
    box(body, i * 0.15, 1.07, 0.48, 0.045, 0.47, 0.025, trim);
  box(body, 0, 1.55, 0.34, 0.55, 0.07, 0.06, trim);
  root.add(merge(body));
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group(),
      shell = new T.Group();
    box(shell, 0, -0.08, 0, 0.49, 0.47, 0.63, armor);
    cyl(shell, 0, -0.4, 0, 0.14, 0.3, trim, 0.14, 8);
    box(shell, 0, -0.67, 0.06, 0.5, 0.38, 0.66, black);
    for (let k = -1; k <= 1; k++)
      box(shell, k * 0.14, -0.68, 0.405, 0.07, 0.22, 0.04, trim);
    box(shell, 0, 0.17, 0.06, 0.3, 0.045, 0.3, glow);
    arm.add(merge(shell));
    arm.position.set(side * 0.85, 1.37, 0);
    root.add(arm);
    arms.push(arm);
  }
  ring(root, 0, 0.05, 0, 0.9, glow);
  root.scale.setScalar([0.86, 0.94, 1][level]);
  root.userData.arms = arms;
  root.userData.glow = glow;
  root.userData.ownedMaterials = [armor, trim, black, glow];
  return root;
}

export function animateGuardian(root, boss, t, reduced) {
  const motion = reduced ? 0 : Math.sin(t * (boss.phase === 2 ? 7 : 3));
  root.userData.arms.forEach((arm, i) => {
    arm.rotation.x = boss.charging ? -0.9 : motion * 0.07 * (i ? 1 : -1);
  });
  root.userData.glow.emissiveIntensity =
    boss.invincible > 0 ? 2 : boss.charging ? 1.9 : 1.15;
  root.rotation.z = boss.invincible > 0 && !reduced ? motion * 0.025 : 0;
}

export class EncounterMarkers {
  constructor(scene) {
    this.root = new T.Group();
    const mat = new T.MeshBasicMaterial({
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    this.tiles = new T.InstancedMesh(
      new T.BoxGeometry(0.91, 0.025, 0.91),
      mat,
      286,
    );
    this.crosses = new T.InstancedMesh(
      new T.BoxGeometry(0.08, 0.03, 0.57),
      new T.MeshBasicMaterial({ color: '#fff2bf', depthWrite: false }),
      572,
    );
    this.vents = new T.InstancedMesh(
      new T.BoxGeometry(0.64, 0.03, 0.64),
      new T.MeshStandardMaterial({
        color: '#776045',
        metalness: 0.6,
        roughness: 0.5,
      }),
      6,
    );
    for (const mesh of [this.tiles, this.crosses, this.vents]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.root.add(mesh);
    }
    this.dummy = new T.Object3D();
    this.color = new T.Color();
    scene.add(this.root);
  }
  sync(state) {
    let n = 0,
      v = 0;
    for (const [x, z] of state.vents || [])
      if (state.grid[z][x] === 0) {
        this.dummy.position.set(x - 6, 0.055, z - 2);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.vents.setMatrixAt(v++, this.dummy.matrix);
      }
    for (const w of state.warnings || [])
      for (const [x, z] of w.cells) {
        if (n >= 286) break;
        this.dummy.position.set(x - 6, 0.095, z - 2);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.tiles.setMatrixAt(n, this.dummy.matrix);
        this.tiles.setColorAt(
          n,
          this.color.set(w.kind === 'summon' ? '#c96cff' : '#ff9c32'),
        );
        for (let i = 0; i < 2; i++) {
          this.dummy.rotation.y = Math.PI * (i ? -0.25 : 0.25);
          this.dummy.updateMatrix();
          this.crosses.setMatrixAt(n * 2 + i, this.dummy.matrix);
        }
        n++;
      }
    this.tiles.count = n;
    this.crosses.count = n * 2;
    this.vents.count = v;
    for (const m of [this.tiles, this.crosses, this.vents])
      m.instanceMatrix.needsUpdate = true;
    if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true;
  }
  update(t, reduced) {
    this.tiles.material.opacity = reduced ? 0.5 : 0.43 + Math.sin(t * 6) * 0.12;
  }
  dispose() {
    this.root.removeFromParent();
    for (const m of this.root.children) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}
