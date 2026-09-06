import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { M, material, box, cyl, beam, merge } from './models.js';
import { staticModel } from './assets.js';
function asphalt() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#27334d';
  ctx.fillRect(0, 0, 128, 128);
  let seed = 77;
  for (let i = 0; i < 2600; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = seed % 128,
      y = (seed >>> 10) % 128;
    ctx.fillStyle = ['#1c2743', '#364261', '#26395c', '#202d47'][i % 4];
    ctx.fillRect(x, y, 1 + (i % 3), 1 + (i % 2));
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(30, 30);
  t.magFilter = T.NearestFilter;
  return t;
}
export function sign(
  scene,
  text,
  x,
  y,
  z,
  w = 1.4,
  h = 4,
  color = '#ff52d9',
  vertical = true,
) {
  const c = document.createElement('canvas');
  c.width = vertical ? 160 : 768;
  c.height = vertical ? 512 : 144;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#080d25';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${vertical ? 100 : 78}px "PingFang SC",sans-serif`;
  if (vertical)
    Array.from(text).forEach((letter, i) =>
      ctx.fillText(letter, c.width / 2, 80 + i * 140),
    );
  else ctx.fillText(text, c.width / 2, c.height / 2);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.magFilter = T.NearestFilter;
  const m = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map: t, side: T.DoubleSide, toneMapped: false }),
  );
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}
export function buildDistrict(scene, assets) {
  const ground = new T.Group();
  const floorTexture = asphalt();
  const roadMat = new T.MeshStandardMaterial({
    map: floorTexture,
    color: '#7583ad',
    roughness: 0.26,
    metalness: 0.48,
    transparent: true,
    opacity: 0.81,
  });
  const reflector = new Reflector(new T.PlaneGeometry(90, 70), {
    clipBias: 0.005,
    textureWidth: 768,
    textureHeight: 768,
    color: 0x454572,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, -0.07, -8);
  scene.add(reflector);
  const floor = new T.Mesh(new T.PlaneGeometry(90, 70), roadMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.035, -8);
  floor.receiveShadow = true;
  scene.add(floor);
  // Small pavers keep the play area legible while the street runs through the district.
  const floorA = material('#303c60', 0, 0.38),
    floorB = material('#293454', 0, 0.45);
  for (let z = 0; z < 11; z++)
    for (let x = 0; x < 13; x++) {
      box(
        ground,
        x - 6,
        0.005,
        z - 2,
        0.985,
        0.04,
        0.985,
        (x + z) % 2 ? floorA : floorB,
      );
      if ((x + z) % 3 === 0)
        box(
          ground,
          x - 6 + 0.25,
          0.028,
          z - 2 - 0.28,
          0.21,
          0.008,
          0.025,
          material('#546387'),
        );
    }
  for (const x of [-6.75, 6.75]) {
    box(ground, x, 0.03, 3, 0.07, 0.055, 11.5, x < 0 ? M.pink : M.cyan);
    for (let z = -3; z < 10; z += 0.55)
      box(
        ground,
        x + 0.23,
        0.06,
        z,
        0.3,
        0.1,
        0.42,
        Math.floor(z * 2) % 2 ? M.white : M.panel || M.steel,
      );
  }
  for (const z of [-2.8, 8.8])
    box(ground, 0, 0.04, z, 13.6, 0.06, 0.045, M.pink);
  // Rail corridor, catwalks and multi-level pipe bridges.
  for (const x of [-8.3, -8.7])
    box(ground, x, 0.035, 1, 0.06, 0.065, 28, M.concrete);
  for (let z = -13; z < 15; z += 0.48)
    box(ground, -8.5, 0.01, z, 1.04, 0.05, 0.1, M.rust);
  for (const side of [-1, 1]) {
    const x = side * 10;
    for (const y of [2.4, 2.77])
      beam(ground, [x, y, -19], [x, y, 11], 0.14, M.rust);
    for (let z = -18; z < 12; z += 3) {
      box(ground, x, 1.5, z, 0.16, 3, 0.16, M.steel);
      box(ground, x, 2.95, z, 1, 0.1, 0.12, M.steel);
      box(ground, x, 3.15, z, 0.34, 0.08, 0.34, side === 1 ? M.cyan : M.pink);
    }
    for (let z = -8; z < 12; z += 4) {
      beam(ground, [side * 8.3, 0, z], [side * 8.3, 3, z], 0.04, M.steel);
      beam(ground, [side * 8.3, 3, z], [side * 7.5, 3, z], 0.04, M.steel);
      box(ground, side * 7.5, 2.97, z, 0.6, 0.07, 0.2, M.cyan);
    }
  }
  const neonBlue = material('#18d8ff', 1.8),
    neonPink = material('#f235c2', 1.7),
    building = material('#132047', 0, 0.65),
    steel = material('#23375f', 0, 0.7);
  for (let i = 0; i < 23; i++) {
    const x = -37 + i * 3.3,
      z = -23 - (i % 4) * 3,
      h = 4 + ((i * 13) % 11),
      w = 1.35 + (i % 3) * 0.45;
    box(ground, x, h / 2, z, w, h, 2, building);
    box(ground, x, h + 0.1, z, w + 0.1, 0.15, 2.1, steel);
    for (let j = 0; j < Math.floor(h / 0.6); j++)
      for (let k = 0; k < 3; k++)
        if ((i * 7 + j * 3 + k) % 4 !== 0)
          box(
            ground,
            x - w * 0.35 + k * w * 0.35,
            0.65 + j * 0.59,
            z + 1.012,
            0.12,
            0.17,
            0.02,
            (i + j) % 3 ? neonBlue : neonPink,
          );
    if (i % 3 === 0) beam(ground, [x, h, z], [x, h + 2.3, z], 0.04, steel);
  }
  for (const [x, z] of [
    [-12, -10],
    [12, -14],
    [-14, 6],
    [14, 5],
  ]) {
    box(ground, x, 1.7, z, 4, 3.4, 5, steel);
    for (let k = 0; k < 6; k++)
      box(ground, x - 1.55 + k * 0.63, 1.75, z + 2.52, 0.1, 2.7, 0.035, M.rust);
    box(ground, x, 3.4, z + 2.5, 4.1, 0.05, 0.055, M.pink);
  }
  // Elevated pedestrian pipe gallery behind the furnace.
  for (const x of [-8, -3, 3, 8]) {
    box(ground, x, 2.85, -15, 0.18, 5.7, 0.18, steel);
    beam(ground, [x, 2, -15], [x + 2, 5.6, -15], 0.04, M.rust);
  }
  box(ground, 0, 5.7, -15, 20, 0.18, 1.25, steel);
  for (const y of [5.9, 6.35])
    beam(ground, [-10, y, -14.35], [10, y, -14.35], 0.025, M.pink);
  for (let x = -10; x <= 10; x += 0.6)
    beam(ground, [x, 5.75, -14.35], [x, 6.35, -14.35], 0.016, steel);
  scene.add(merge(ground));
  const landmarks = [];
  const layout = [
    [assets.furnace, -2.6, -7.7, 1.18],
    [assets.cooling, 5.2, -10.8, 1.5],
    [assets.ramp, -10.6, -10.8, 1.15],
  ];
  for (const [asset, x, z, s] of layout) {
    const m = staticModel(asset);
    m.position.set(x, 0, z);
    m.scale.setScalar(s);
    scene.add(m);
    landmarks.push(m);
  }
  const twin = staticModel(assets.cooling);
  twin.position.set(10, -0.04, -13);
  twin.scale.setScalar(1.28);
  scene.add(twin);
  sign(scene, '首钢', 2.1, 6, -7, 1.18, 3.25, '#ff5ad6');
  sign(scene, '夜行', -7, 5, -11, 1.1, 3, '#6ae8ff');
  sign(
    scene,
    'SHOUGANG  /  BUBBLE NIGHT',
    0,
    2.3,
    -3.7,
    7.6,
    0.85,
    '#81edff',
    false,
  );
  // Pixel foliage outside the field echoes the neon trees in the reference.
  const flora = new T.Group();
  for (const [x, z] of [
    [8.5, -3.7],
    [10, 3],
    [-9, 7],
  ]) {
    beam(flora, [x, 0, z], [x, 2, z], 0.09, steel);
    for (let i = 0; i < 20; i++) {
      const a = i * 2.4,
        r = 0.28 + (i % 4) * 0.18;
      box(
        flora,
        x + Math.sin(a) * r,
        1.5 + (i % 4) * 0.24,
        z + Math.cos(a) * r,
        0.33,
        0.25,
        0.36,
        i % 3 ? material('#ac3b9b', 0.2) : material('#246389', 0.25),
      );
    }
  }
  scene.add(merge(flora));
  const skyline = new T.Mesh(
    new T.PlaneGeometry(150, 70),
    new T.MeshBasicMaterial({ map: assets.sky, fog: false }),
  );
  skyline.position.set(0, 27, -53);
  scene.add(skyline);
  return { landmarks, reflector, floorTexture };
}
