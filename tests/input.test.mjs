import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOVEMENT_BINDINGS,
  bombPlayer,
  canMovePlayer,
} from '../components/game/input.js';
import { BubbleGame } from '../components/game/engine.js';

function press(game, code) {
  const binding = MOVEMENT_BINDINGS.find(([key]) => key === code);
  if (!binding) return false;
  const [, id, dx, dz] = binding;
  return canMovePlayer(id, game.mode) && game.move(id, dx, dz);
}

test('all four arrow keys move P1 in solo mode', () => {
  for (const [key, dx, dz] of [
    ['ArrowUp', 0, -1],
    ['ArrowDown', 0, 1],
    ['ArrowLeft', -1, 0],
    ['ArrowRight', 1, 0],
  ]) {
    const game = new BubbleGame({ mode: 'solo' });
    game.grid.forEach((row) => row.fill(0));
    game.players[0].x = 5;
    game.players[0].z = 5;
    assert.equal(press(game, key), true);
    assert.deepEqual([game.players[0].x, game.players[0].z], [5 + dx, 5 + dz]);
  }
});
test('WASD cannot control the solo bots and controls only P2 in duel', () => {
  const solo = new BubbleGame({ mode: 'solo' });
  assert.equal(press(solo, 'KeyW'), false);
  const duel = new BubbleGame({ mode: 'duel' });
  duel.grid.forEach((row) => row.fill(0));
  const p1 = [duel.players[0].x, duel.players[0].z];
  const p2x = duel.players[1].x;
  assert.equal(press(duel, 'KeyA'), true);
  assert.equal(duel.players[1].x, p2x - 1);
  assert.deepEqual([duel.players[0].x, duel.players[0].z], p1);
});
test('Space belongs to P1, Enter belongs to P2 only in duel', () => {
  for (const mode of ['solo', 'duel'])
    assert.equal(bombPlayer('Space', mode), 1);
  for (const code of ['Enter', 'NumpadEnter']) {
    assert.equal(bombPlayer(code, 'solo'), null);
    assert.equal(bombPlayer(code, 'duel'), 2);
  }
  assert.equal(bombPlayer('ArrowUp', 'solo'), null);
});
