import * as T from 'three';

const hash = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

// Real, shadow-casting voxel geometry, grouped into a few instanced draw calls.
export class VoxelLandscape {
  constructor(scene) {
    this.root = new T.Group();
    this.root.name = 'Shougang voxel landscape';
    this.clouds = [];
    this.time = 0;
    const batches = new Map();
    const add = (kind, x, y, z, w, h, d, color) => {
      if (!batches.has(kind)) batches.set(kind, []);
      batches.get(kind).push({ x, y, z, w, h, d, color });
    };
    const stones = ['#6d716a', '#93988e', '#b1b1a0', '#7f8278', '#c5c4b2'];
    const greens = ['#465d42', '#657c4b', '#7a8959', '#99a06a'];
    // Keep the arena, landmark footprints and the foreground camera corridor clear.
    for (let iz = 0; iz < 66; iz++) {
      const z = -38 + iz * 0.68;
      for (let ix = 0; ix < 100; ix++) {
        const x = -34 + ix * 0.68;
        if ((Math.abs(x) < 17.5 && z > -19) || (z > 0 && x > -21 && x < 26)) continue;
        const n = hash(ix, iz);
        const envelope = z > 0 ? 0.65 : 1;
        const height = Math.max(0.28, Math.round((1.7 + Math.sin(x * 0.23) * 1.25 + Math.cos(z * 0.3) * 1.4 + n * 0.9) * envelope / 0.34) * 0.34);
        add('rock', x, height / 2 - 0.15, z, 0.66, height, 0.66, stones[Math.floor(n * stones.length)]);
        if (n > 0.48)
          add('rock', x - 0.15, height + 0.02, z + 0.1, 0.32, 0.32, 0.32, stones[(ix + iz) % 5]);
        if (n < 0.32)
          add('grass', x, height + 0.035, z, 0.67, 0.12 + n * 0.2, 0.67, greens[(ix + iz) % 4]);
      }
    }
    // Brick courses, lintels, ducts and roof machinery on the existing workshops.
    for (const [x, z] of [[-12, -10], [12, -14], [-14, 6], [14, 5]]) {
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 12; col++) {
          if (col > 3 && col < 8 && row < 6) continue;
          const n = hash(row + x, col + z);
          add('brick', x - 1.78 + col * 0.31 + (row % 2) * 0.08, 0.2 + row * 0.3, z + 2.54,
            0.285, 0.26, 0.06 + n * 0.035, ['#815f4d', '#ab8265', '#b19679', '#6e6559'][Math.floor(n * 4)]);
        }
      }
      add('metal', x, 3.47, z, 4.2, 0.16, 5.2, '#a5ada4');
      for (const side of [-1, 1]) {
        add('metal', x + side * 1.2, 3.78, z - 0.5, 0.85, 0.55, 1.3, '#627473');
        for (let k = 0; k < 6; k++)
          add('metal', x + side * 1.2, 4.07, z - 1 + k * 0.2, 0.71, 0.035, 0.055, '#263c40');
      }
      add('metal', x, 0.85, z + 2.59, 1.13, 1.7, 0.12, '#263b3d');
      for (let k = 0; k < 8; k++)
        add('metal', x, 0.15 + k * 0.2, z + 2.67, 1.1, 0.035, 0.025, '#7c9390');
    }
    // Voxel trees with individually lit leaf clusters, outside every playable cell.
    for (const [x, z, size] of [[-12, 1, 1], [12.8, -4.5, 1.2], [-16, -5, 1.15], [17, 0, 1], [-11, 11, 0.8], [13, 12.5, 0.8], [-18, -16, 1.4], [19, -17, 1.4]]) {
      add('wood', x, 0.95 * size, z, 0.28 * size, 1.9 * size, 0.28 * size, '#645646');
      for (let i = 0; i < 28; i++) {
        const n = hash(i, x), a = i * 2.4, radius = Math.sqrt(n) * 1.2 * size;
        const leaf = 0.55 * size;
        add('grass', x + Math.cos(a) * radius, 1.8 * size + (i % 4) * 0.24 * size,
          z + Math.sin(a) * radius, leaf, leaf * 0.7, leaf, greens[i % greens.length]);
      }
    }
    const unit = new T.BoxGeometry(1, 1, 1), dummy = new T.Object3D();
    this.voxelCount = 0;
    for (const [kind, entries] of batches) {
      const mat = new T.MeshStandardMaterial({ color: '#ffffff', roughness: kind === 'metal' ? 0.34 : 0.87, metalness: kind === 'metal' ? 0.6 : 0.04 });
      const mesh = new T.InstancedMesh(unit, mat, entries.length);
      mesh.name = `Voxels / ${kind}`;
      entries.forEach((v, i) => {
        dummy.position.set(v.x, v.y, v.z);
        dummy.scale.set(v.w, v.h, v.d);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new T.Color(v.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.root.add(mesh);
      this.voxelCount += entries.length;
    }
    const cloudMat = new T.MeshStandardMaterial({ color: '#e4e2d5', roughness: 1 });
    for (const [x, y, z, scale] of [[-27, 21, -37, 1.1], [18, 23, -44, 1.3], [39, 18, -31, 0.75], [-47, 17, -22, 0.8]]) {
      const cloud = new T.InstancedMesh(unit, cloudMat, 34);
      for (let i = 0; i < 34; i++) {
        const a = i * 2.4, r = Math.sqrt(hash(i, x)) * 4;
        dummy.position.set(Math.cos(a) * r, Math.round(hash(i, y) * 2) * 0.45, Math.sin(a) * r * 0.48);
        dummy.scale.set(1.5, 0.45, 1.25);
        dummy.updateMatrix();
        cloud.setMatrixAt(i, dummy.matrix);
      }
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(scale);
      cloud.userData.originX = x;
      cloud.computeBoundingSphere();
      this.root.add(cloud);
      this.clouds.push(cloud);
    }
    scene.add(this.root);
  }
  update(dt, reduced) {
    if (!reduced) this.time += dt;
    this.clouds.forEach((cloud, i) => {
      cloud.position.x = cloud.userData.originX + Math.sin(this.time * 0.025 + i) * 1.8;
    });
  }
  dispose() {
    const geometries = new Set(), materials = new Set();
    this.root.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) materials.add(o.material);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.root.removeFromParent();
  }
}
