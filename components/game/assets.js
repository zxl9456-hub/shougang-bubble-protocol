import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
let pending;
export function loadParkAssets() {
  pending ??= Promise.all([
    ...['furnace-v2', 'cooling-v2', 'big-air-v2', 'scout-v3', 'forge-v3'].map(
      (name) => new GLTFLoader().loadAsync(`/models/${name}.glb`),
    ),
    new T.TextureLoader().loadAsync('/art/pixel-skyline.png'),
  ])
    .then(([furnace, cooling, ramp, runner, forge, sky]) => {
      sky.colorSpace = T.SRGBColorSpace;
      return { furnace, cooling, ramp, runner, forge, sky };
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}
export function staticModel(asset) {
  asset.scene.updateMatrixWorld(true);
  const buckets = new Map();
  asset.scene.traverse((o) => {
    if (o.isMesh) {
      const geo = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      for (const name of Object.keys(geo.attributes))
        if (!['position', 'normal'].includes(name)) geo.deleteAttribute(name);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      geo.applyMatrix4(o.matrixWorld);
      const bucket = buckets.get(o.material) || [];
      bucket.push(geo);
      buckets.set(o.material, bucket);
    }
  });
  const root = new T.Group();
  for (const [mat, geos] of buckets) {
    const material = mat.clone();
    material.roughness = Math.max(0.3, material.roughness);
    const mesh = new T.Mesh(mergeGeometries(geos), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.glow = material.emissiveIntensity;
    root.add(mesh);
    geos.forEach((g) => g.dispose());
  }
  return root;
}
const animatedTemplates = new WeakMap();
function batchRig(asset) {
  if (animatedTemplates.has(asset)) return animatedTemplates.get(asset);
  const rig = asset.scene.clone(true),
    groups = [];
  rig.traverse((node) => {
    if (node.children.some((c) => c.isMesh)) groups.push(node);
  });
  for (const group of groups) {
    const buckets = new Map();
    for (const child of [...group.children]) {
      if (!child.isMesh) continue;
      child.updateMatrix();
      const geometry = child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone();
      geometry.applyMatrix4(child.matrix);
      const bucket = buckets.get(child.material) || [];
      bucket.push(geometry);
      buckets.set(child.material, bucket);
      group.remove(child);
    }
    for (const [mat, geos] of buckets) {
      group.add(new T.Mesh(mergeGeometries(geos), mat));
      geos.forEach((g) => g.dispose());
    }
  }
  animatedTemplates.set(asset, rig);
  return rig;
}
export function animatedRunner(asset, color) {
  const outer = new T.Group(),
    model = batchRig(asset).clone(true);
  model.scale.setScalar(0.76);
  outer.add(model);
  model.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.geometry = o.geometry.clone();
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material.name.startsWith('Suit_Accent')) {
        o.material.color.set(color);
        o.material.emissive.set(color);
        o.material.emissiveIntensity = 0.16;
      }
      if (o.material.name.startsWith('Suit_Light')) {
        o.material.color.set(color);
        o.material.emissive.set(color);
      }
    }
  });
  const mixer = new T.AnimationMixer(model),
    actions = {};
  for (const clip of asset.animations)
    actions[clip.name] = mixer.clipAction(clip);
  outer.userData = { mixer, actions, currentAction: null, actionUntil: 0 };
  playAction(outer, 'Idle');
  return outer;
}
export function playAction(root, name, once = false) {
  const u = root.userData;
  if (!u.actions?.[name] || u.currentAction === name) return;
  const next = u.actions[name],
    previous = u.actions[u.currentAction];
  next.reset();
  next.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
  next.clampWhenFinished = once;
  next.play();
  if (previous) previous.crossFadeTo(next, 0.1, false);
  u.currentAction = name;
}
