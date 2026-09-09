import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { BubbleGame, LEVELS } from '../components/game/engine.js';
import {
  createGuardian,
  animateGuardian,
  EncounterMarkers,
} from '../components/game/guardian.js';

function advance(g, seconds) {
  for (let i = 0; i < Math.ceil(seconds / 0.05); i++) g.update(0.05);
}
function encounter(level, score = 0, journey) {
  const g = new BubbleGame({ level, score, journey });
  for (const row of g.grid)
    for (let x = 0; x < row.length; x++) if (row[x] === 2) row[x] = 0;
  g.grid[1][3] = 2;
  g.initialBlocks = 1;
  g.players.forEach((p) => {
    p.think = 999;
  });
  g.placeBomb(1);
  g.move(1, 0, 1);
  advance(g, 0.2);
  g.move(1, 0, 1);
  advance(g, 2.1);
  assert.equal(g.phase, 'awakening');
  return g;
}
function hitWithRealBubble(g) {
  const p = g.players[0];
  p.x = 4;
  p.z = 5;
  p.cooldown = 0;
  assert(g.placeBomb(1));
  assert(g.move(1, -1, 0));
  advance(g, 0.2);
  assert(g.move(1, 0, 1));
  advance(g, 2.15);
}

test('guardian health, attack frequency, warning time and summons increase across stages', () => {
  assert.deepEqual(
    LEVELS.map((l) => l.boss.hp),
    [4, 7, 12],
  );
  assert.deepEqual(
    LEVELS.map((l) => l.boss.summonCount),
    [0, 1, 2],
  );
  assert.deepEqual(
    LEVELS.map((l) => l.boss.minionCap),
    [0, 2, 4],
  );
  for (let i = 1; i < 3; i++) {
    assert(LEVELS[i].boss.attackGap < LEVELS[i - 1].boss.attackGap);
    assert(LEVELS[i].boss.warning < LEVELS[i - 1].boss.warning);
    assert(LEVELS[i].boss.warning > 1.2);
  }
});

test('every stage transitions safely, blocks the guardian footprint and grants three preparation seconds', () => {
  for (let level = 0; level < 3; level++) {
    const g = encounter(level);
    assert.equal(g.remainingBlocks, 0);
    assert.equal(g.landmarkUnlocked, false);
    assert.equal(g.players.length, 1);
    assert.equal(g.boss.hp, LEVELS[level].boss.hp);
    for (const x of [5, 6, 7])
      assert.equal(g.walkable(x, 5, g.players[0]), false);
    advance(g, 2.6);
    assert.equal(g.phase, 'awakening');
    assert.equal(g.warnings.length, 0);
    advance(g, 0.5);
    assert.equal(g.phase, 'boss');
  }
});

test('bubble damage counts once per blast, steel blocks damage and minions cannot defeat their own boss', () => {
  const g = encounter(2);
  advance(g, 3.1);
  g.boss.attackCooldown = g.boss.summonCooldown = 999;
  hitWithRealBubble(g);
  assert.equal(g.boss.hp, 11);
  advance(g, 0.8);
  assert.equal(g.boss.hp, 11, 'one bubble must not repeatedly drain health');
  const enemyBomb = { id: g.id(), owner: 101, x: 4, z: 5, range: 3, fuse: 0 };
  g.bombs.push(enemyBomb);
  advance(g, 0.1);
  assert.equal(g.boss.hp, 11);
  advance(g, 0.7);
  const blocked = { id: g.id(), owner: 1, x: 6, z: 3, range: 3, fuse: 0 };
  g.bombs.push(blocked);
  advance(g, 0.1);
  assert.equal(g.boss.hp, 11, 'steel at 6,4 shields the boss');
});

test('orange attack telegraphs allow escape before a short-lived damaging strike', () => {
  const g = encounter(0);
  advance(g, 3.1);
  const p = g.players[0];
  p.invincible = 0;
  g.boss.attackCooldown = 0;
  advance(g, 0.05);
  const w = g.warnings[0];
  assert(w && w.delay >= 1.7);
  const hp = p.hp;
  advance(g, 0.7);
  assert.equal(p.hp, hp);
  assert.equal(g.blasts.length, 0);
  g.move(1, 1, 0);
  advance(g, 0.2);
  g.move(1, 1, 0);
  advance(g, 1);
  assert(g.blasts.some((b) => b.hazard));
  assert.equal(p.hp, hp, 'moving two tiles must evade the level-one hammer');
  advance(g, 0.8);
  assert.equal(g.blasts.length, 0);
});

test('standing on a telegraphed cell costs one life, with invulnerability against overlap', () => {
  const g = encounter(1);
  advance(g, 3.1);
  g.players[0].invincible = 0;
  g.boss.attackCooldown = 0;
  advance(g, 1.65);
  assert.equal(g.players[0].hp, 2);
  advance(g, 0.3);
  assert.equal(g.players[0].hp, 2);
});

test('summoning uses visible portals, delayed safe spawning and a strict population cap', () => {
  for (const level of [1, 2]) {
    const g = encounter(level);
    advance(g, 3.1);
    g.boss.attackCooldown = 999;
    g.boss.summonCooldown = 0;
    advance(g, 0.05);
    assert.equal(g.players.length, 1);
    assert.equal(g.warnings.filter((w) => w.kind === 'summon').length, level);
    advance(g, 1.9);
    assert.equal(g.players.filter((p) => p.minion).length, level);
    g.players[0].invincible = 999;
    let attacks = 0;
    for (let i = 0; i < 1200; i++) {
      g.update(0.05);
      attacks += g
        .drainEvents()
        .filter((e) => e.type === 'bomb' && e.player >= 100).length;
      assert(
        g.players.filter((p) => p.ai && p.alive).length <=
          LEVELS[level].boss.minionCap,
      );
      assert(g.players.length <= 10);
      for (const p of g.players) if (p.alive) assert.equal(g.grid[p.z][p.x], 0);
    }
    assert(attacks > 0, 'summoned minions must actually fight');
  }
});

test('portals never materialize an enemy on the player, a bomb or another enemy', () => {
  const g = encounter(2);
  advance(g, 3.1);
  g.boss.summonCooldown = 0;
  g.boss.attackCooldown = 999;
  advance(g, 0.05);
  const [x, z] = g.warnings.find((w) => w.kind === 'summon').cells[0];
  g.players[0].x = x;
  g.players[0].z = z;
  advance(g, 1.9);
  assert(!g.players.some((p) => p.ai && p.x === x && p.z === z));
});

test('steam hazards are limited to later maps and pause freezes all encounter timers', () => {
  for (let level = 0; level < 3; level++) {
    const g = new BubbleGame({ level });
    g.players.forEach((p) => {
      p.think = 999;
    });
    for (const [x, z] of g.vents) g.grid[z][x] = 0;
    advance(g, 12.2);
    assert.equal(
      g.warnings.some((w) => w.source === 'vent'),
      level > 0,
    );
  }
  const g = encounter(2);
  advance(g, 3.1);
  g.boss.attackCooldown = 0;
  g.boss.summonCooldown = 0;
  advance(g, 0.05);
  g.paused = true;
  const before = g.snapshot();
  advance(g, 20);
  assert.deepEqual(g.snapshot(), before);
  g.paused = false;
  advance(g, 0.1);
  assert(g.warnings[0].delay < before.warnings[0].delay);
});

test('steel monster enrages at half health without skipping warnings', () => {
  const g = encounter(2);
  advance(g, 3.1);
  g.boss.attackCooldown = g.boss.summonCooldown = 999;
  g.players[0].invincible = 999;
  for (let i = 0; i < 6; i++) {
    hitWithRealBubble(g);
    advance(g, 0.6);
  }
  assert.equal(g.boss.hp, 6);
  assert.equal(g.boss.phase, 2);
  assert.equal(g.drainEvents().filter((e) => e.type === 'boss-rage').length, 1);
  g.boss.attackCooldown = 0;
  g.boss.cycle = 1;
  advance(g, 0.05);
  assert(g.warnings.some((w) => w.name === '十字钢轨扫射' && w.delay > 1.2));
});

test('all three guardians fall to actual bubbles, carry accurate totals and emit a single finale', () => {
  let score = 0,
    journey;
  for (let level = 0; level < 3; level++) {
    const g = encounter(level, score, journey);
    advance(g, 3.1);
    g.players[0].invincible = 999;
    for (let hit = 0; hit < LEVELS[level].boss.hp; hit++) {
      g.boss.attackCooldown = g.boss.summonCooldown = 999;
      hitWithRealBubble(g);
      advance(g, 0.6);
    }
    assert.equal(g.boss.hp, 0);
    assert.equal(g.landmarkUnlocked, true);
    assert.equal(g.result, level === 2 ? 'complete' : 'won');
    const events = g.drainEvents();
    assert.equal(events.filter((e) => e.type === 'boss-defeated').length, 1);
    assert.equal(events.filter((e) => e.type === 'unlock').length, 1);
    assert.equal(events.filter((e) => e.type === 'finish').length, 1);
    assert.equal(g.bombs.length + g.warnings.length + g.blasts.length, 0);
    const end = g.snapshot();
    advance(g, 1);
    assert.deepEqual(g.snapshot(), end);
    journey = end.totals;
    score = g.score;
    assert.equal(journey.bosses, level + 1);
    assert.equal(journey.blocks, level + 1);
  }
  const fresh = new BubbleGame();
  assert.equal(fresh.boss, null);
  assert.equal(fresh.score, 0);
  assert.equal(fresh.snapshot().totals.bosses, 0);
});

test('losing or timing out during a boss battle cannot unlock a landmark', () => {
  for (const fail of ['lost', 'timeout']) {
    const g = encounter(2);
    advance(g, 3.1);
    if (fail === 'lost') g.players[0].alive = false;
    else g.time = 0;
    g.judge();
    assert.equal(g.result, fail);
    assert.equal(g.landmarkUnlocked, false);
  }
});

test('guardian meshes and hazard markers fit the arena, animate finitely and clean up', () => {
  for (let level = 0; level < 3; level++) {
    const model = createGuardian(level),
      bounds = new T.Box3().setFromObject(model);
    assert(bounds.max.x - bounds.min.x <= 3);
    assert(bounds.max.y < 2.5);
    animateGuardian(
      model,
      { phase: 2, charging: true, invincible: 0 },
      10,
      false,
    );
    model.updateMatrixWorld(true);
    model.traverse((m) =>
      assert(m.matrixWorld.elements.every(Number.isFinite)),
    );
  }
  const scene = new T.Scene(),
    markers = new EncounterMarkers(scene),
    g = encounter(2);
  advance(g, 3.1);
  g.boss.attackCooldown = 0;
  advance(g, 0.05);
  markers.sync(g.snapshot());
  assert(markers.tiles.count > 0);
  markers.update(10, true);
  assert.equal(markers.tiles.material.opacity, 0.5);
  const snapshot = g.snapshot();
  snapshot.warnings = [];
  markers.sync(snapshot);
  assert.equal(markers.tiles.count, 0);
  assert.equal(markers.crosses.count, 0);
  markers.dispose();
  assert.equal(scene.children.length, 0);
});
