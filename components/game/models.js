import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const mats = new Map();
export function material(color, glow = 0, metal = 0.25) {
  const key = `${color}/${glow}/${metal}`;
  if (!mats.has(key))
    mats.set(
      key,
      new T.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: glow,
        roughness: 0.72,
        metalness: metal,
        flatShading: true,
      }),
    );
  return mats.get(key);
}
export const M = {
  steel: material('#293653'),
  rust: material('#74504d'),
  dark: material('#192541'),
  concrete: material('#59647c'),
  cyan: material('#29deff', 2),
  amber: material('#ffad4c', 2),
  pink: material('#f54dcc', 2),
  white: material('#e9dec3'),
  black: material('#071820'),
};
export function box(g, x, y, z, w, h, d, mat = M.steel) {
  const o = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
export function cyl(g, x, y, z, r, h, mat = M.steel, top = r, segments = 12) {
  const o = new T.Mesh(new T.CylinderGeometry(top, r, h, segments), mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
export function beam(g, a, b, r, mat = M.steel) {
  let A = new T.Vector3(...a),
    B = new T.Vector3(...b),
    v = B.clone().sub(A);
  const m = cyl(
    g,
    ...A.add(B).multiplyScalar(0.5).toArray(),
    r,
    v.length(),
    mat,
    r,
    6,
  );
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
  return m;
}
export function ring(g, x, y, z, r, mat = M.cyan) {
  const o = new T.Mesh(new T.TorusGeometry(r, 0.025, 4, 32), mat);
  o.rotation.x = Math.PI / 2;
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
export function merge(g) {
  g.updateMatrixWorld(true);
  const buckets = new Map();
  g.traverse((o) => {
    if (o.isMesh) {
      const a = buckets.get(o.material) || [];
      a.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
      buckets.set(o.material, a);
    }
  });
  const result = new T.Group();
  buckets.forEach((geos, mat) => {
    const mesh = new T.Mesh(mergeGeometries(geos, false), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    result.add(mesh);
    geos.forEach((v) => v.dispose());
  });
  g.traverse((o) => {
    if (o.isMesh) o.geometry.dispose();
  });
  return result;
}
export function furnace() {
  const g = new T.Group();
  box(g, 0, 0.1, 0, 4.4, 0.2, 3.8);
  cyl(g, 0, 2.1, 0, 1.02, 3.2, M.rust, 0.68, 16);
  cyl(g, 0, 1.2, 0, 1.16, 0.7, M.steel);
  cyl(g, 0, 4.05, 0, 0.55, 1.1, M.rust, 0.3);
  for (const y of [0.7, 1.5, 2.5, 3.4, 4.5]) {
    box(g, 0, y, 0, 3.25, 0.12, 2.55);
    for (const z of [-1.25, 1.25]) {
      beam(g, [-1.6, y + 0.3, z], [1.6, y + 0.3, z], 0.019, M.amber);
      for (const x of [-1.6, -0.8, 0, 0.8, 1.6])
        beam(g, [x, y, z], [x, y + 0.3, z], 0.023, M.rust);
    }
  }
  for (const x of [-1.42, 1.42]) {
    for (const z of [-1.13, 1.13]) {
      beam(g, [x, 0.2, z], [x, 5.3, z], 0.07, M.rust);
      beam(g, [x, 1, z + 0.015], [x, 5.2, z + 0.015], 0.015, M.cyan);
    }
    for (const h of [1.2, 2.5, 3.8]) {
      beam(g, [x, h, -1.1], [x, h + 1.1, 1.1], 0.035, M.rust);
      beam(g, [x, h, 1.1], [x, h + 1.1, -1.1], 0.035, M.rust);
    }
  }
  for (const x of [-2.1, -2.75]) {
    cyl(g, x, 1.55, 0, 0.3, 2.8, M.rust);
    cyl(g, x, 3.05, 0, 0.3, 0.5, M.steel, 0.07);
    beam(g, [x, 3.1, 0], [x, 4.1, 0], 0.12);
    beam(g, [x, 4.1, 0], [0.1, 4.1, 0], 0.12);
    ring(g, x, 1, 0, 0.32, M.amber);
  }
  beam(g, [0.8, 4.5, 0.7], [3, 0.2, 0.7], 0.2, M.rust);
  box(g, 0, 5.25, 0, 3.25, 0.16, 2.5);
  for (let i = 0; i < 6; i++)
    box(g, -1.25 + i * 0.5, 5.5, 0, 0.24, 0.4, 0.8, M.rust);
  return merge(g);
}
export function coolingTower() {
  const g = new T.Group();
  const pts = [
    [1.5, 0],
    [1.5, 0.2],
    [1.25, 0.7],
    [1, 1.3],
    [0.81, 2],
    [0.74, 2.7],
    [0.79, 3.4],
    [0.91, 4.1],
    [1.05, 4.5],
  ].map((v) => new T.Vector2(...v));
  const shell = new T.Mesh(new T.LatheGeometry(pts, 24), M.concrete);
  shell.castShadow = true;
  g.add(shell);
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    for (let j = 0; j < pts.length - 1; j++)
      beam(
        g,
        [pts[j].x * Math.cos(a), pts[j].y, pts[j].x * Math.sin(a)],
        [pts[j + 1].x * Math.cos(a), pts[j + 1].y, pts[j + 1].x * Math.sin(a)],
        0.016,
        M.steel,
      );
  }
  for (const [r, y] of [
    [1.51, 0.2],
    [0.76, 2.7],
    [1.07, 4.5],
  ])
    ring(g, 0, y, 0, r, y < 1 ? M.amber : M.cyan);
  cyl(g, 0, 3.88, 0, 0.77, 0.06, M.black);
  box(g, 0, -0.05, 0, 3.4, 0.1, 3.4);
  return merge(g);
}
export function bigAir() {
  const g = new T.Group();
  const path = [
    [-3.5, 4.4],
    [-3.15, 4.4],
    [-2.8, 4.1],
    [-2.4, 3.5],
    [-2, 2.8],
    [-1.5, 2.15],
    [-1, 1.65],
    [-0.5, 1.4],
    [0, 1.4],
    [0.5, 1.55],
    [1, 1.75],
    [1.3, 1.78],
    [1.6, 1.5],
    [2, 0.9],
    [2.5, 0.45],
    [3, 0.25],
  ];
  path.slice(0, -1).forEach(([x, y], i) => {
    const [xx, yy] = path[i + 1];
    const m = box(
      g,
      (x + xx) / 2,
      (y + yy) / 2,
      0,
      Math.hypot(xx - x, yy - y) + 0.04,
      0.12,
      1.3,
      M.white,
    );
    m.rotation.z = Math.atan2(yy - y, xx - x);
    for (const z of [-0.65, 0.65])
      beam(g, [x, y + 0.1, z], [xx, yy + 0.1, z], 0.04, M.pink);
    if (i % 2 === 0)
      for (const z of [-0.5, 0.5]) {
        beam(g, [x, 0, z], [x, y, z], 0.06);
        beam(g, [x + 0.6, 0, z], [x, y, z], 0.025, M.rust);
      }
  });
  box(g, -3.35, 4.75, 0, 0.65, 0.55, 1.5);
  box(g, -3.35, 4.75, 0.77, 0.45, 0.2, 0.02, M.cyan);
  box(g, 0, 0.02, 0, 7.5, 0.1, 2);
  return merge(g);
}
export function runner(color = '#61ffda') {
  const g = new T.Group();
  const accent = material(color, 0.6);
  box(g, 0, 0.42, 0, 0.38, 0.36, 0.28, M.white);
  box(g, 0, 0.77, 0, 0.49, 0.38, 0.38, M.white);
  box(g, 0, 0.79, 0.205, 0.38, 0.16, 0.05, M.black);
  box(g, 0, 0.79, 0.235, 0.28, 0.055, 0.025, accent);
  box(g, 0, 0.43, 0.155, 0.25, 0.13, 0.04, accent);
  box(g, 0, 0.43, -0.2, 0.27, 0.28, 0.15);
  const legs = [],
    arms = [];
  for (const s of [-1, 1]) {
    const l = box(g, s * 0.12, 0.14, 0, 0.16, 0.26, 0.24);
    legs.push(l);
    const a = box(g, s * 0.28, 0.42, 0, 0.13, 0.3, 0.17, accent);
    arms.push(a);
  }
  box(g, 0.16, 1.05, 0, 0.045, 0.18, 0.045);
  box(g, 0.16, 1.16, 0, 0.095, 0.065, 0.075, M.amber);
  g.userData = { legs, arms };
  return g;
}
export function crate(warm = false) {
  const g = new T.Group();
  box(
    g,
    0,
    0.38,
    0,
    0.78,
    0.72,
    0.78,
    warm ? material('#bc6c3a') : material('#426c91'),
  );
  box(g, 0, 0.77, 0, 0.81, 0.07, 0.81, M.dark);
  for (const x of [-0.32, 0.32])
    for (const z of [-0.32, 0.32]) box(g, x, 0.4, z, 0.07, 0.74, 0.07, M.steel);
  for (const z of [-0.4, 0.4]) {
    box(g, 0, 0.43, z, 0.63, 0.09, 0.015, warm ? M.amber : M.cyan);
    const b = box(g, 0, 0.43, z, 0.07, 0.62, 0.02, warm ? M.amber : M.cyan);
    b.rotation.z = Math.PI / 4;
  }
  box(g, 0, 0.83, 0, 0.22, 0.08, 0.22, M.amber);
  return merge(g);
}
