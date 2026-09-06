import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  staticModel,
  animatedRunner,
  playAction,
} from '../components/game/assets.js';
import { buildDistrict } from '../components/game/environment.js';

const assets = {};
for (const [key, file] of [
  ['furnace', 'furnace-v2'],
  ['cooling', 'cooling-v2'],
  ['ramp', 'big-air-v2'],
  ['runner', 'scout-v3'],
  ['forge', 'forge-v3'],
]) {
  const bytes = await fs.readFile(
    new URL(`../public/models/${file}.glb`, import.meta.url),
  );
  assets[key] = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
}
assets.sky = new T.Texture();
test('Blender landmarks retain their dimensions after material batching', () => {
  for (const key of ['furnace', 'cooling', 'ramp']) {
    const before = new T.Box3().setFromObject(assets[key].scene);
    const model = staticModel(assets[key]);
    const after = new T.Box3().setFromObject(model);
    assert.ok(after.min.distanceTo(before.min) < 0.001, key);
    assert.ok(after.max.distanceTo(before.max) < 0.001, key);
    assert.ok(model.children.length <= 12, `${key}: excessive draw calls`);
    model.traverse((o) => {
      if (o.isMesh) assert.ok(o.geometry.attributes.position.count > 0);
    });
  }
  assert.ok(new T.Box3().setFromObject(assets.furnace.scene).max.y > 8);
});
function node(root, name) {
  let result;
  root.traverse((o) => {
    if (new RegExp('^' + name + '[0-9]*$').test(o.name)) result = o;
  });
  assert.ok(result, name);
  return result;
}
for (const key of ['runner', 'forge']) {
  test(`${key} body retains dimensions and faces its travel heading after batching`, () => {
    const runner = animatedRunner(assets[key], '#18d8ff');
    runner.userData.mixer.update(0);
    const bounds = new T.Box3().setFromObject(runner);
    assert.ok(bounds.max.y > 1 && bounds.max.y < 1.5);
    assert.ok(bounds.min.y > -0.1);
    const raw = assets[key].scene;
    raw.updateMatrixWorld(true);
    assert.ok(
      node(raw, 'Visor_glass').getWorldPosition(new T.Vector3()).z >
        node(raw, 'Helmet').getWorldPosition(new T.Vector3()).z,
    );
    assert.ok(node(runner, 'Helmet').getWorldPosition(new T.Vector3()).y > 0.7);
    let before = 0,
      after = 0;
    raw.traverse((o) => (before += o.isMesh ? 1 : 0));
    runner.traverse((o) => (after += o.isMesh ? 1 : 0));
    assert.ok(after < before);
    const expected = new T.Box3().setFromObject(raw);
    assert.ok(bounds.max.distanceTo(expected.max.multiplyScalar(0.76)) < 0.001);
  });
  test(`${key} four animation clips play independently and return to Idle`, () => {
    const a = animatedRunner(assets[key], '#18d8ff'),
      b = animatedRunner(assets[key], '#ff52cf');
    assert.deepEqual(Object.keys(a.userData.actions).sort(), [
      'Hit',
      'Idle',
      'PlaceBubble',
      'Walk',
    ]);
    a.userData.mixer.update(0);
    b.userData.mixer.update(0);
    const still = node(b, 'Leg_L').quaternion.clone();
    playAction(a, 'Walk');
    a.userData.mixer.update(0.2);
    assert.ok(node(a, 'Leg_L').quaternion.angleTo(still) > 0.15);
    assert.ok(node(b, 'Leg_L').quaternion.angleTo(still) < 0.001);
    for (const name of ['PlaceBubble', 'Hit']) {
      playAction(a, name, true);
      a.userData.mixer.update(0.2);
      assert.ok(node(a, 'Helmet').getWorldPosition(new T.Vector3()).y > 0.6);
      a.userData.mixer.update(1);
      playAction(a, 'Idle');
      a.userData.mixer.update(0.2);
      assert.equal(a.userData.currentAction, 'Idle');
    }
  });
}
test('district geometry constructs with the exported assets', () => {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {} }),
    }),
  };
  try {
    const scene = new T.Scene(),
      district = buildDistrict(scene, assets);
    assert.equal(district.landmarks.length, 3);
    scene.traverse((o) => {
      if (o.isMesh) {
        assert.ok(o.geometry?.attributes.position, 'missing merged geometry');
        o.geometry.computeBoundingSphere();
        assert.ok(Number.isFinite(o.geometry.boundingSphere.radius));
      }
    });
    district.reflector.getRenderTarget().dispose();
  } finally {
    globalThis.document = previous;
  }
});
