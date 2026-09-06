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
  ['furnace', 'furnace'],
  ['cooling', 'cooling'],
  ['ramp', 'big-air'],
  ['runner', 'runner'],
]) {
  const bytes = await fs.readFile(
    new URL(`../public/models/${file}-v2.glb`, import.meta.url),
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
test('runner exports a complete body and faces its direction of travel', () => {
  const runner = animatedRunner(assets.runner, '#18d8ff');
  runner.userData.mixer.update(0);
  const bounds = new T.Box3().setFromObject(runner);
  assert.ok(bounds.max.y > 1.1 && bounds.max.y < 1.4, 'helmet/antenna height');
  assert.ok(bounds.min.y > -0.1, 'feet near origin');
  const visor = runner
    .getObjectByName('Visor_glass')
    .getWorldPosition(new T.Vector3());
  const helmet = runner
    .getObjectByName('Helmet')
    .getWorldPosition(new T.Vector3());
  assert.ok(
    visor.z > helmet.z,
    'visor must face positive Z before heading rotation',
  );
  assert.ok(helmet.y > 0.7, 'helmet hierarchy must retain rest transforms');
});
test('runner clips animate independently and transition back to Idle', () => {
  const a = animatedRunner(assets.runner, '#18d8ff'),
    b = animatedRunner(assets.runner, '#ff52cf');
  assert.deepEqual(Object.keys(a.userData.actions).sort(), [
    'Hit',
    'Idle',
    'PlaceBubble',
    'Walk',
  ]);
  a.userData.mixer.update(0);
  b.userData.mixer.update(0);
  const still = b.getObjectByName('Leg_L').quaternion.clone();
  playAction(a, 'Walk');
  a.userData.mixer.update(0.2);
  assert.ok(a.getObjectByName('Leg_L').quaternion.angleTo(still) > 0.15);
  assert.ok(b.getObjectByName('Leg_L').quaternion.angleTo(still) < 0.001);
  for (const name of ['PlaceBubble', 'Hit']) {
    playAction(a, name, true);
    a.userData.mixer.update(0.2);
    assert.ok(
      a.getObjectByName('Helmet').getWorldPosition(new T.Vector3()).y > 0.6,
    );
    a.userData.mixer.update(1);
    playAction(a, 'Idle');
    a.userData.mixer.update(0.2);
    assert.equal(a.userData.currentAction, 'Idle');
  }
});
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
