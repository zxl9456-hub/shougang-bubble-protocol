export const MOVEMENT_BINDINGS = [
  ['ArrowUp', 1, 0, -1],
  ['ArrowDown', 1, 0, 1],
  ['ArrowLeft', 1, -1, 0],
  ['ArrowRight', 1, 1, 0],
  ['KeyW', 2, 0, -1],
  ['KeyS', 2, 0, 1],
  ['KeyA', 2, -1, 0],
  ['KeyD', 2, 1, 0],
];
export function bombPlayer(code, mode) {
  if (code === 'Space') return 1;
  if (mode === 'duel' && (code === 'Enter' || code === 'NumpadEnter')) return 2;
  return null;
}
export function canMovePlayer(id, mode) {
  return id === 1 || mode === 'duel';
}
