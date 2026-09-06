// Offline rasterization of the authored 3D landmarks into an instanced floor-tile map.
import fs from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const width = 96,
  height = 72;
await fs.mkdir('public/mosaics', { recursive: true });
for (const [name, file] of [
  ['furnace', 'furnace-v2'],
  ['cooling', 'cooling-v2'],
  ['ramp', 'big-air-v2'],
]) {
  const bytes = await fs.readFile(`public/models/${file}.glb`),
    g = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    );
  let root = g.scene;
  if (name === 'cooling') {
    const group = new T.Group();
    root.position.x = -1.5;
    group.add(root);
    const twin = root.clone(true);
    twin.position.set(1.6, 0, -1.1);
    twin.scale.setScalar(0.87);
    group.add(twin);
    root = group;
  }
  root.updateMatrixWorld(true);
  const bound = new T.Box3().setFromObject(root),
    center = bound.getCenter(new T.Vector3());
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position
    .copy(center)
    .add(new T.Vector3(name === 'ramp' ? 8 : 11, 7, 16));
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const tris = [],
    points = [],
    light = new T.Vector3(-0.5, 1, 1).normalize();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position,
      idx = o.geometry.index,
      count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const world = [0, 1, 2].map((j) =>
        new T.Vector3()
          .fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j)
          .applyMatrix4(o.matrixWorld),
      );
      const normal = new T.Vector3()
        .crossVectors(
          world[1].clone().sub(world[0]),
          world[2].clone().sub(world[0]),
        )
        .normalize();
      const mat = o.material;
      const color = mat.color
        .clone()
        .multiplyScalar(0.5 + Math.max(0, normal.dot(light)) * 0.9);
      color.add(
        mat.emissive
          .clone()
          .multiplyScalar(Math.min(mat.emissiveIntensity, 0.8)),
      );
      color.offsetHSL(0, 0.02, 0.025);
      const rgb = color.getHex(),
        q = (v) => Math.min(255, Math.round(v / 24) * 24),
        quant =
          (q((rgb >> 16) & 255) << 16) |
          (q((rgb >> 8) & 255) << 8) |
          q(rgb & 255);
      const v = world.map((p) => p.applyMatrix4(camera.matrixWorldInverse));
      points.push(...v);
      tris.push({ v, color: quant });
    }
  });
  let minx = Infinity,
    miny = Infinity,
    maxx = -Infinity,
    maxy = -Infinity;
  for (const p of points) {
    minx = Math.min(minx, p.x);
    maxx = Math.max(maxx, p.x);
    miny = Math.min(miny, p.y);
    maxy = Math.max(maxy, p.y);
  }
  const scale = Math.min(
      (width - 10) / (maxx - minx),
      (height - 10) / (maxy - miny),
    ),
    cx = (minx + maxx) / 2,
    cy = (miny + maxy) / 2;
  const depth = new Float32Array(width * height).fill(-Infinity),
    colors = new Int32Array(width * height).fill(-1);
  const edge = (a, b, x, y) =>
    (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
  for (const tri of tris) {
    const v = tri.v.map((p) => ({
      x: (p.x - cx) * scale + width / 2,
      y: height / 2 - (p.y - cy) * scale,
      z: p.z,
    }));
    const [a, b, c] = v,
      area = edge(a, b, c.x, c.y);
    if (Math.abs(area) < 1e-7) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...v.map((p) => p.x)))),
      x1 = Math.min(width - 1, Math.ceil(Math.max(...v.map((p) => p.x)))),
      y0 = Math.max(0, Math.floor(Math.min(...v.map((p) => p.y)))),
      y1 = Math.min(height - 1, Math.ceil(Math.max(...v.map((p) => p.y))));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const w0 = edge(b, c, x + 0.5, y + 0.5) / area,
          w1 = edge(c, a, x + 0.5, y + 0.5) / area,
          w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * a.z + w1 * b.z + w2 * c.z,
          k = y * width + x;
        if (z > depth[k]) {
          depth[k] = z;
          colors[k] = tri.color;
        }
      }
  }
  const pixels = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (colors[y * width + x] >= 0)
        pixels.push([x, y, colors[y * width + x]]);
  await fs.writeFile(
    `public/mosaics/${name}-floor-v4.json`,
    JSON.stringify({ name, width, height, pixels }),
  );
  console.log(name, pixels.length, 'floor pixels');
}
