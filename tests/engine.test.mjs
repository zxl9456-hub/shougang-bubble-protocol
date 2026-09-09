import test from 'node:test';
import assert from 'node:assert/strict';
import { BubbleGame, LEVELS } from '../components/game/engine.js';
const blank = (mode) => {
  const g = new BubbleGame({ mode });
  for (let z = 1; z < 10; z++) for (let x = 1; x < 12; x++) g.grid[z][x] = 0;
  g.players.forEach((p) => (p.think = 999));
  g.drainEvents();
  return g;
};
const advance = (g, t) => {
  for (let i = 0; i < Math.ceil(t / 0.05); i++) g.update(0.05);
};
test('movement respects steel, crates, players, borders and cooldown', () => {
  const g = blank('duel');
  g.grid[1][2] = 1;
  assert.equal(g.move(1, 1, 0), false);
  g.grid[1][2] = 2;
  assert.equal(g.move(1, 1, 0), false);
  g.grid[1][2] = 0;
  assert.equal(g.move(1, 1, 0), true);
  assert.equal(g.move(1, 1, 0), false);
  advance(g, 0.2);
  assert.equal(g.move(1, 0, -1), false);
  assert.equal(g.move(1, 1, 1), false);
});
test('bomb owner can leave but cannot reenter a live bomb', () => {
  const g = blank('duel');
  assert.equal(g.placeBomb(1), true);
  assert.equal(g.placeBomb(1), false);
  assert.equal(g.move(1, 1, 0), true);
  advance(g, 0.2);
  assert.equal(g.move(1, -1, 0), false);
});
test('blast stops at first crate and never penetrates steel', () => {
  const g = blank('duel');
  g.grid[3][4] = 2;
  g.grid[3][2] = 1;
  const b = { id: 1, x: 3, z: 3, range: 4, owner: 1, fuse: 0 };
  g.bombs = [b];
  g.explode(b);
  const cells = g.blasts.map((v) => `${v.x},${v.z}`);
  assert(cells.includes('4,3'));
  assert(!cells.includes('5,3'));
  assert(!cells.includes('2,3'));
  assert(!cells.includes('1,3'));
  assert.equal(g.grid[3][4], 0);
});
test('explosions chain immediately and expire completely', () => {
  const g = blank('duel');
  g.players[0].x = 1;
  g.players[0].z = 9;
  g.bombs = [
    { id: 1, x: 5, z: 5, range: 2, owner: 1, fuse: 0 },
    { id: 2, x: 7, z: 5, range: 2, owner: 2, fuse: 2 },
  ];
  g.explode(g.bombs[0]);
  assert.equal(g.bombs.length, 0);
  assert(g.blasts.some((b) => b.x === 9 && b.z === 5));
  advance(g, 0.6);
  assert.equal(g.blasts.length, 0);
});
test('same-tick double knockout is a draw', () => {
  const g = blank('duel');
  g.players[0].x = 3;
  g.players[0].z = 3;
  g.players[1].x = 5;
  g.players[1].z = 3;
  g.bombs = [{ id: 12, x: 4, z: 3, range: 2, owner: 1, fuse: 0 }];
  g.update(0.01);
  assert.equal(g.result, 'draw');
});
test('one survivor wins a local duel', () => {
  const g = blank('duel');
  g.placeBomb(1);
  advance(g, 2.3);
  assert.equal(g.result, 'p2');
});
test('solo player has three lives and receives temporary invulnerability', () => {
  const g = blank('solo');
  g.blasts = [{ id: 1, x: 1, z: 1, life: 0.5 }];
  g.update(0.05);
  assert.equal(g.players[0].hp, 2);
  advance(g, 0.3);
  assert.equal(g.players[0].hp, 2);
  assert.equal(g.players[0].alive, true);
});
test('last block begins a guardian encounter and does not grant an early victory', () => {
  const g = blank('solo');
  g.grid[3][3] = 2;
  g.grid[7][7] = 2;
  const bomb = { id: 50, x: 3, z: 4, range: 2, owner: 1 };
  g.bombs = [bomb];
  g.explode(bomb);
  g.judge();
  assert.equal(g.remainingBlocks, 1);
  assert.equal(g.landmarkUnlocked, false);
  assert.equal(g.status, 'playing');
  const final = { id: 51, x: 7, z: 8, range: 2, owner: 1 };
  g.bombs = [final];
  g.explode(final);
  g.judge();
  assert.equal(g.remainingBlocks, 0);
  assert.equal(g.landmarkUnlocked, false);
  assert.equal(g.players.length, 1);
  assert.equal(g.phase, 'awakening');
  assert.equal(g.boss.hp, LEVELS[0].boss.hp);
  assert.equal(g.result, null);
  assert.equal(
    g.drainEvents().filter((e) => e.type === 'boss-awake').length,
    1,
  );
  g.judge();
  assert.equal(g.drainEvents().length, 0);
});
test('robot destruction counts and phase transition provides a safe arrival', () => {
  const g = blank('solo');
  g.grid[3][3] = 2;
  g.players[0].x = 3;
  g.players[0].z = 4;
  g.players[0].hp = 1;
  g.bombs = [{ id: 60, x: 3, z: 4, range: 2, owner: 2, fuse: 0 }];
  g.update(0.01);
  assert.equal(g.players[0].alive, true);
  assert.equal(g.result, null);
  assert.equal(g.phase, 'awakening');
  assert.deepEqual([g.players[0].x, g.players[0].z], [1, 9]);
  assert.equal(g.blasts.length, 0);
  assert.equal(g.drainEvents().filter((e) => e.type === 'unlock').length, 0);
});
test('real 2.2 second fuse triggers a guardian rather than skipping the final battle', () => {
  const g = blank('solo');
  g.level = 2;
  g.grid[1][3] = 2;
  g.players[0].invincible = 10;
  assert(g.placeBomb(1));
  advance(g, 2);
  assert.equal(g.grid[1][3], 2);
  assert.equal(g.landmarkUnlocked, false);
  advance(g, 0.3);
  assert.equal(g.grid[1][3], 0);
  assert.equal(g.result, null);
  assert.equal(g.phase, 'awakening');
  const h = blank('solo');
  h.grid[5][5] = 2;
  h.time = 0.01;
  h.update(0.02);
  assert.equal(h.result, 'timeout');
  assert.equal(h.landmarkUnlocked, false);
});
test('clearing blocks in duel preserves last-survivor victory and does not unlock a campaign landmark', () => {
  const g = blank('duel');
  g.grid[3][3] = 2;
  const bomb = { id: 70, x: 3, z: 4, range: 2, owner: 1 };
  g.bombs = [bomb];
  g.explode(bomb);
  g.judge();
  assert.equal(g.remainingBlocks, 0);
  assert.equal(g.landmarkUnlocked, false);
  assert.equal(g.status, 'playing');
  g.players[1].alive = false;
  g.judge();
  assert.equal(g.result, 'p1');
});
test('pause freezes movement, fuse and match clock; finished games are inert', () => {
  const g = blank('duel');
  g.placeBomb(1);
  g.paused = true;
  const before = g.snapshot();
  advance(g, 3);
  assert.deepEqual(g.snapshot(), before);
  assert.equal(g.move(1, 1, 0), false);
  assert.equal(g.placeBomb(2), false);
  g.paused = false;
  g.finish('draw');
  const end = g.snapshot();
  advance(g, 3);
  assert.deepEqual(g.snapshot(), end);
});
test('powerups respect caps and update abilities', () => {
  const g = blank('solo'),
    p = g.players[0];
  p.range = 5;
  p.hp = 2;
  for (const type of ['range', 'capacity', 'speed', 'heart']) {
    g.pickups.push({ id: g.id(), x: p.x, z: p.z, type });
    g.collect(p);
  }
  assert.equal(p.range, 5);
  assert.equal(p.capacity, 3);
  assert(p.speed < 0.145);
  assert.equal(p.hp, 3);
});
test('all seeded maps keep every block reachable and spawns escapable', () => {
  for (let level = 0; level < 3; level++)
    for (let seed = 0; seed < 100; seed++) {
      const g = new BubbleGame({ level, seed });
      assert(g.initialBlocks > 0);
      assert.equal(g.initialBlocks, g.remainingBlocks);
      for (const p of g.players) {
        assert.equal(g.grid[p.z][p.x], 0);
        assert(g.route(p, (x, z) => Math.abs(x - p.x) + Math.abs(z - p.z) > 2));
      }
      const queue = [[1, 1]],
        seen = new Set(['1,1']);
      for (let i = 0; i < queue.length; i++) {
        const [x, z] = queue[i];
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const xx = x + dx,
            zz = z + dz,
            k = `${xx},${zz}`;
          if (!g.isWall(xx, zz) && !seen.has(k)) {
            seen.add(k);
            queue.push([xx, zz]);
          }
        }
      }
      for (let z = 0; z < g.height; z++)
        for (let x = 0; x < g.width; x++)
          if (g.grid[z][x] >= 2) assert(seen.has(`${x},${z}`));
    }
});
test('robots move, break barriers and retain valid positions across seeded simulations', () => {
  let moves = 0,
    broken = 0;
  for (let seed = 1; seed <= 15; seed++) {
    const g = new BubbleGame({ level: 2, seed });
    g.players[0].invincible = 999;
    for (let t = 0; t < 1200 && g.status === 'playing'; t++) {
      const before = g.players.map((p) => `${p.x},${p.z}`);
      g.update(0.05);
      g.players.forEach((p, i) => {
        if (before[i] !== `${p.x},${p.z}`) moves++;
        if (p.alive) assert.equal(g.grid[p.z][p.x], 0);
      });
    }
    broken += g.destroyed;
  }
  assert(moves > 100);
  assert(broken > 20);
});
