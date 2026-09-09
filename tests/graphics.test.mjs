import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { VoxelLandscape } from '../components/game/landscape.js';
import { resolutionFor, ContactShadows, surfaceMaps } from '../components/game/cinema.js';
import { ParkScene } from '../components/game/scene.js';
import { crate } from '../components/game/models.js';

test('high resolution stays within a GPU budget across phone, laptop and 4K screens', () => {
  for (const [w, h, dpr] of [[375, 812, 3], [1440, 900, 2], [3840, 2160, 2]]) {
    const high = resolutionFor(w, h, dpr, 'high');
    const low = resolutionFor(w, h, dpr, 'balanced');
    assert(high.width * high.height <= 3605000);
    assert(low.width * low.height <= 1505000);
    assert(high.width >= low.width && high.height >= low.height);
    assert(Math.abs(high.width / high.height - w / h) < 0.004);
  }
  assert.equal(resolutionFor(1440, 900, 1, 'high').width, 1440);
});

test('voxel scenery has bounded draw calls and never intersects the playable grid', () => {
  const scene = new T.Scene(), landscape = new VoxelLandscape(scene);
  assert(landscape.voxelCount > 3500 && landscape.voxelCount < 14000);
  assert(landscape.root.children.length <= 10);
  scene.updateMatrixWorld(true);
  const field = new T.Box3(new T.Vector3(-6.55, 0, -2.55), new T.Vector3(6.55, 8, 8.55));
  const unit = new T.Box3(new T.Vector3(-0.5, -0.5, -0.5), new T.Vector3(0.5, 0.5, 0.5));
  const matrix = new T.Matrix4();
  landscape.root.children.forEach((mesh) => {
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      matrix.premultiply(mesh.matrixWorld);
      assert(matrix.elements.every(Number.isFinite));
      assert(!unit.clone().applyMatrix4(matrix).intersectsBox(field));
    }
  });
  landscape.update(0.5, false);
  const t = landscape.time;
  landscape.update(10, true);
  assert.equal(landscape.time, t);
  landscape.dispose();
  assert.equal(scene.children.length, 0);
});

test('switching from lobby to orthographic combat updates AO and removes all depth blur', () => {
  const scene = new T.Scene(), lobby = new T.PerspectiveCamera(), game = new T.OrthographicCamera();
  const ao = new ContactShadows(scene, lobby);
  const park = { lobbyCamera: lobby, quality: 'high', renderPass: {}, contactShadows: ao, depthOfField: { enabled: true } };
  ParkScene.prototype.useCamera.call(park, game);
  assert.equal(ao.camera, game);
  assert.equal(ao.gtaoMaterial.defines.PERSPECTIVE_CAMERA, 0);
  assert.equal(park.depthOfField.enabled, false);
  ParkScene.prototype.useCamera.call(park, lobby);
  assert.equal(ao.gtaoMaterial.defines.PERSPECTIVE_CAMERA, 1);
  assert.equal(park.depthOfField.enabled, true);
  park.quality = 'balanced';
  ParkScene.prototype.useCamera.call(park, lobby);
  assert.equal(park.depthOfField.enabled, false);
  ao.dispose();
});

test('wet surface maps contain bounded roughness variation and beveled crates retain collision size', () => {
  const maps = surfaceMaps();
  for (const texture of Object.values(maps)) {
    assert.equal(texture.image.data.length, 128 * 128 * 4);
    assert(new Set(texture.image.data).size > 10);
    texture.dispose();
  }
  for (const warm of [true, false]) {
    const model = crate(warm), bounds = new T.Box3().setFromObject(model);
    assert(bounds.max.x - bounds.min.x < 0.9);
    assert(bounds.max.z - bounds.min.z < 0.9);
    model.traverse((o) => { if (o.isMesh) assert(o.geometry.attributes.normal); });
  }
});
