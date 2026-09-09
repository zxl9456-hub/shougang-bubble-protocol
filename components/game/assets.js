import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assetUrl } from './asset-url.js';
let pending;
export function loadParkAssets() {
  pending ??= Promise.all([
    ...['furnace-v2', 'cooling-v2', 'big-air-v2', 'mint-v4', 'peach-v4'].map(
      (name) => new GLTFLoader().loadAsync(assetUrl(`/models/${name}.glb`)),
    ),
    Promise.all(
      ['furnace', 'cooling', 'ramp'].map((name) =>
        fetch(assetUrl(`/mosaics/${name}-floor-v4.json`)).then((response) => {
          if (!response.ok) throw Error('地面像素图加载失败');
          return response.json();
        }),
      ),
    ),
  ])
    .then(([furnace, cooling, ramp, runner, forge, mosaics]) => {
      return { furnace, cooling, ramp, runner, forge, mosaics };
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
    material.roughness = Math.max(0.25, material.roughness);
    material.envMapIntensity = 1.2;
    const palette = [['Steel midnight', '#35484d'], ['Graphite', '#293738'], ['Oxidized copper', '#a57150'], ['Brushed alloy', '#b6c5c0'], ['Painted indigo', '#667e83']];
    const tone = palette.find(([name]) => material.name.startsWith(name));
    if (tone) material.color.set(tone[1]);
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
  model.scale.setScalar(0.86);
  outer.add(model);
  model.traverse((o) => {
    if (o.isMesh) {
      const source = o.material;
      const polished = new T.MeshPhysicalMaterial();
      T.MeshStandardMaterial.prototype.copy.call(polished, source);
      polished.defines = { STANDARD: '', PHYSICAL: '' };
      polished.clearcoat = source.name.includes('face') ? 1 : 0.65;
      polished.clearcoatRoughness = 0.16;
      polished.roughness = Math.min(source.roughness, 0.3);
      polished.envMapIntensity = 1.15;
      o.material = polished;
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
