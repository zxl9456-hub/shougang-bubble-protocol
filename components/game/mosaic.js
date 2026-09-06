import * as T from 'three';
import { box, material, merge } from './models.js';
const TITLES = ['三高炉', '冷却塔', '雪飞天 · 大跳台'];
export function buildGroundMosaic(data, level) {
  const root = new T.Group();
  const backdrop = new T.Mesh(
    new T.BoxGeometry(11.7, 0.045, 8.75),
    new T.MeshStandardMaterial({
      color: '#091329',
      metalness: 0.48,
      roughness: 0.4,
      emissive: '#071d3b',
      emissiveIntensity: 0.6,
    }),
  );
  backdrop.position.set(0, 0.065, 3);
  root.add(backdrop);
  const geo = new T.BoxGeometry(0.112, 0.035, 0.112),
    mat = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const pixels = new T.InstancedMesh(geo, mat, data.pixels.length),
    dummy = new T.Object3D();
  data.pixels.forEach(([x, y, color], i) => {
    dummy.position.set(
      (x - (data.width - 1) / 2) * 0.118,
      0.105,
      (y - (data.height - 1) / 2) * 0.118 + 3,
    );
    dummy.updateMatrix();
    pixels.setMatrixAt(i, dummy.matrix);
    pixels.setColorAt(i, new T.Color(color));
  });
  pixels.instanceMatrix.needsUpdate = true;
  pixels.instanceColor.needsUpdate = true;
  pixels.frustumCulled = false;
  pixels.count = 0;
  root.add(pixels);
  const colors = ['#ffb357', '#4cecff', '#ff66d5'],
    frame = new T.Group(),
    accent = material(colors[level], 2);
  for (const x of [-5.95, 5.95])
    box(frame, x, 0.09, 3, 0.045, 0.04, 8.95, accent);
  for (const z of [-1.47, 7.47])
    box(frame, 0, 0.09, z, 11.94, 0.04, 0.045, accent);
  root.add(merge(frame));
  const scan = new T.Mesh(
    new T.PlaneGeometry(11.8, 0.085),
    new T.MeshBasicMaterial({
      color: colors[level],
      toneMapped: false,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  scan.rotation.x = -Math.PI / 2;
  scan.position.set(0, 0.145, -1.4);
  root.add(scan);
  root.userData = {
    pixels,
    total: data.pixels.length,
    scan,
    level,
    title: TITLES[level],
  };
  root.visible = false;
  return root;
}
export function updateGroundMosaic(root, time, reduced = false) {
  const u = root.userData,
    t = reduced ? 1 : Math.min(1, Math.max(0, time / 1.65));
  u.pixels.count = Math.floor(u.total * t);
  u.scan.position.z = -1.4 + 8.8 * t;
  u.scan.visible = t < 1;
  return t === 1;
}
