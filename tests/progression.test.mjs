import test from 'node:test';
import assert from 'node:assert/strict';
import { BubbleGame, LEVELS } from '../components/game/engine.js';
test('every seed has 34, 42, 50 blocks with three distinct steel layouts', () => {
  for (let seed = 0; seed < 100; seed++) {
    const games = [0, 1, 2].map((level) => new BubbleGame({ level, seed }));
    assert.deepEqual(
      games.map((g) => g.initialBlocks),
      [34, 42, 50],
    );
    const layouts = games.map((g) =>
      JSON.stringify(g.grid.map((row) => row.map((c) => c === 1))),
    );
    assert.equal(new Set(layouts).size, 3);
    assert.deepEqual(
      games.map((g) => g.vents.length),
      [0, 4, 6],
    );
    assert.equal(new BubbleGame({ mode: 'duel', seed }).initialBlocks, 38);
  }
});
test('opponent count, speed, range and bomb pressure increase at every level', () => {
  const games = [0, 1, 2].map((level) => new BubbleGame({ level }));
  assert.deepEqual(
    games.map((g) => g.players.filter((p) => p.ai).length),
    [1, 2, 3],
  );
  for (let i = 0; i < 3; i++) {
    const g = games[i],
      p = g.players[1];
    g.grid.forEach((row) => row.fill(0));
    p.x = 5;
    p.z = 5;
    assert(g.move(p.id, 1, 0));
    assert.equal(p.cooldown, LEVELS[i].enemySpeed);
    assert(g.placeBomb(p.id));
    assert.equal(g.bombs[0].fuse, LEVELS[i].enemyFuse);
    assert.equal(g.bombs[0].range, LEVELS[i].enemyRange);
    assert.equal(p.bombCooldown, LEVELS[i].bombGap);
    g.bombs = [];
    assert.equal(
      g.placeBomb(p.id),
      false,
      'enemy must respect attack cooldown',
    );
    if (i) {
      assert(LEVELS[i].enemySpeed < LEVELS[i - 1].enemySpeed);
      assert(LEVELS[i].enemyRange > LEVELS[i - 1].enemyRange);
      assert(LEVELS[i].bombGap < LEVELS[i - 1].bombGap);
      assert(LEVELS[i].enemyFuse < LEVELS[i - 1].enemyFuse);
      assert(LEVELS[i].time < LEVELS[i - 1].time);
    }
  }
});
test('player movement and fuse stay consistent across difficulty levels', () => {
  for (let level = 0; level < 3; level++) {
    const g = new BubbleGame({ level });
    g.grid.forEach((row) => row.fill(0));
    assert(g.move(1, 1, 0));
    assert.equal(g.players[0].cooldown, 0.145);
    assert(g.placeBomb(1));
    assert.equal(g.bombs[0].fuse, 2.2);
    assert.equal(g.players[0].hp, 3);
  }
});
