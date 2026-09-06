import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {
  buildGroundMosaic,
  updateGroundMosaic,
} from '../components/game/mosaic.js';
import { ParkAtmosphere, THEMES } from '../components/game/atmosphere.js';
for (const [level, name] of ['furnace', 'cooling', 'ramp'].entries()) {
  const data = JSON.parse(
    await fs.readFile(
      new URL(`../public/mosaics/${name}-floor-v4.json`, import.meta.url),
    ),
  );
  test(`${name} ground image is distinct, fits the playfield and reveals only when triggered`, () => {
    assert.equal(data.name, name);
    assert(data.pixels.length > 1000);
    const seen = new Set();
    for (const [x, y, c] of data.pixels) {
      assert(x >= 0 && x < data.width && y >= 0 && y < data.height);
      assert(c >= 0 && c <= 0xffffff);
      assert(!seen.has(`${x},${y}`));
      seen.add(`${x},${y}`);
    }
    const mosaic = buildGroundMosaic(data, level);
    assert.equal(mosaic.visible, false);
    assert.equal(mosaic.userData.pixels.count, 0);
    mosaic.visible = true;
    updateGroundMosaic(mosaic, 0.8);
    const halfway = mosaic.userData.pixels.count;
    assert(halfway > 0 && halfway < data.pixels.length);
    assert.equal(updateGroundMosaic(mosaic, 2), true);
    assert.equal(mosaic.userData.pixels.count, data.pixels.length);
    assert.equal(mosaic.userData.scan.visible, false);
    updateGroundMosaic(mosaic, 0, true);
    assert.equal(mosaic.userData.pixels.count, data.pixels.length);
    assert.equal(mosaic.userData.level, level);
  });
}
test('environment effects switch theme, animate without invalid transforms and clean shockwaves', () => {
  const scene = new T.Scene(),
    fx = new ParkAtmosphere(scene);
  for (let i = 0; i < 3; i++) {
    fx.setLevel(i);
    assert.equal(
      fx.trailMat.color.getHexString(),
      new T.Color(THEMES[i]).getHexString(),
    );
    fx.update(0.1);
  }
  fx.root.traverse((o) => {
    assert(Number.isFinite(o.position.x + o.position.y + o.position.z));
  });
  fx.shock(new T.Vector3(0, 0, 3));
  assert.equal(fx.waves.length, 1);
  fx.update(0.7);
  assert.equal(fx.waves.length, 0);
  const previous = fx.time;
  fx.update(0.1, true);
  assert.equal(fx.time, previous);
  fx.dispose();
  assert.equal(scene.children.length, 0);
});
