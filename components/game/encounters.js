// Encounter timers advance only with the game clock: pause freezes every attack.
export const VENTS = [
  [3, 5],
  [9, 5],
  [5, 3],
  [7, 7],
  [3, 7],
  [9, 3],
];

export function shapeMap(grid, level) {
  if (!level) return;
  const moved =
    level === 1
      ? [
          [4, 4, 5, 4],
          [8, 6, 7, 6],
        ]
      : [
          [4, 4, 5, 4],
          [8, 4, 7, 4],
          [4, 6, 5, 6],
          [8, 6, 7, 6],
        ];
  for (const [x, z, nx, nz] of moved) {
    grid[z][x] = 2;
    grid[nz][nx] = 1;
  }
}

export function bossOccupies(boss, x, z) {
  return boss?.hp > 0 && z === boss.z && Math.abs(x - boss.x) <= 1;
}

export function awakenBoss(g) {
  g.phase = 'awakening';
  g.bombs = [];
  g.blasts = [];
  g.warnings = [];
  g.players = g.players.filter((p) => !p.ai);
  const p = g.players[0];
  p.x = 1;
  p.z = 9;
  p.invincible = 3;
  g.boss = {
    id: 'guardian',
    x: 6,
    z: 5,
    name: g.rules.boss.name,
    hp: g.rules.boss.hp,
    maxHP: g.rules.boss.hp,
    phase: 1,
    awake: 3,
    invincible: 0,
    attackCooldown: 2,
    summonCooldown: 5,
    cycle: 0,
    defeated: false,
  };
  g.emit('boss-awake', { name: g.boss.name, x: 6, z: 5 });
}

function warning(g, kind, cells, delay, name, source = 'boss') {
  if (!cells.length) return;
  g.warnings.push({
    id: g.id(),
    kind,
    cells,
    delay,
    total: delay,
    name,
    source,
  });
  g.emit(kind === 'summon' ? 'summon-warning' : 'attack-warning', { name });
}

function safeSpawn(g, x, z) {
  const p = g.players[0];
  return (
    g.walkable(x, z, null) &&
    Math.abs(x - p.x) + Math.abs(z - p.z) >= 3 &&
    !g.danger().has(`${x},${z}`)
  );
}

function summon(g) {
  const rules = g.rules.boss;
  const live = g.players.filter((p) => p.ai && p.alive).length;
  const pending = g.warnings.filter((w) => w.kind === 'summon').length;
  let count = Math.min(rules.summonCount, rules.minionCap - live - pending);
  const spots = [
    [11, 1],
    [1, 1],
    [11, 9],
    [1, 9],
    [9, 5],
    [3, 5],
  ];
  const rotation = g.boss.cycle % spots.length;
  for (let i = 0; i < spots.length && count > 0; i++) {
    const [x, z] = spots[(i + rotation) % spots.length];
    if (
      safeSpawn(g, x, z) &&
      !g.warnings.some((w) => w.cells.some(([a, b]) => a === x && b === z))
    ) {
      warning(g, 'summon', [[x, z]], 1.8, '小怪召唤');
      count--;
    }
  }
}

function spawnMinion(g, x, z) {
  if (!safeSpawn(g, x, z) || !g.boss || g.boss.hp <= 0) return;
  if (g.players.filter((p) => p.ai && p.alive).length >= g.rules.boss.minionCap)
    return;
  // Keep the actor list bounded even in a long fight.
  g.players = g.players.filter((p) => p.alive || !p.ai);
  g.players.push({
    id: ++g.nextEnemyId,
    x,
    z,
    dx: 0,
    dz: 1,
    alive: true,
    ai: true,
    minion: true,
    hp: 1,
    invincible: 0.8,
    cooldown: 0.5,
    think: 1,
    bombCooldown: 1.5,
    capacity: 1,
    range: 2,
    speed: 0.145,
    color: '#dd80ff',
  });
  g.emit('summon', { x, z });
}

function resolveWarnings(g, dt) {
  const ready = [];
  for (const w of g.warnings) {
    w.delay -= dt;
    if (w.delay <= 0) ready.push(w);
  }
  g.warnings = g.warnings.filter((w) => w.delay > 0);
  for (const w of ready) {
    if (w.kind === 'summon') {
      spawnMinion(g, ...w.cells[0]);
      continue;
    }
    for (const [x, z] of w.cells) {
      if (g.grid[z]?.[x] !== 0) continue;
      g.blasts.push({ id: g.id(), x, z, life: 0.65, owner: -1, hazard: true });
    }
    g.emit('boss-attack', { name: w.name, x: w.cells[0][0], z: w.cells[0][1] });
  }
}

export function updateEncounter(g, dt) {
  if (g.mode !== 'solo') return;
  resolveWarnings(g, dt);
  if (g.phase === 'clear') {
    if (!g.level) return;
    g.ventClock -= dt;
    if (g.ventClock <= 0) {
      const vents = VENTS.slice(0, g.level === 1 ? 4 : 6);
      const cells = [
        vents[g.ventCycle++ % vents.length],
        vents[g.ventCycle % vents.length],
      ].filter(([x, z]) => g.grid[z][x] === 0);
      warning(
        g,
        'attack',
        cells,
        g.level === 1 ? 1.8 : 1.4,
        '蒸汽喷口',
        'vent',
      );
      g.ventClock = g.level === 1 ? 10 : 7;
    }
    return;
  }
  const b = g.boss;
  if (!b || b.hp <= 0) return;
  b.invincible = Math.max(0, b.invincible - dt);
  if (g.phase === 'awakening') {
    b.awake = Math.max(0, b.awake - dt);
    if (b.awake === 0) {
      g.phase = 'boss';
      g.emit('boss-ready', { name: b.name });
    }
    return;
  }
  const rage = b.phase === 2 ? 0.72 : 1;
  b.attackCooldown -= dt;
  b.summonCooldown -= dt;
  if (b.attackCooldown <= 0) {
    const p = g.players[0];
    let cells, name;
    if (g.level > 0 && b.cycle % 2 === 1) {
      cells = [];
      for (let z = 1; z < g.height - 1; z++)
        for (let x = 1; x < g.width - 1; x++)
          if (g.grid[z][x] === 0 && (x === p.x || (b.phase === 2 && z === p.z)))
            cells.push([x, z]);
      name = b.phase === 2 ? '十字钢轨扫射' : '钢轨扫射';
    } else {
      cells = g
        .blastCells({ ...p, range: 1 + g.level })
        .filter(([x, z]) => g.grid[z][x] === 0);
      name = '重锤冲击';
    }
    warning(g, 'attack', cells, g.rules.boss.warning, name);
    b.cycle++;
    b.attackCooldown = g.rules.boss.attackGap * rage;
  }
  if (g.rules.boss.summonCount && b.summonCooldown <= 0) {
    summon(g);
    b.summonCooldown = g.rules.boss.summonGap * rage;
  }
}

export function damageBoss(g) {
  const b = g.boss;
  if (g.phase !== 'boss' || !b || b.hp <= 0 || b.invincible > 0) return;
  if (!g.blasts.some((f) => f.owner === 1 && bossOccupies(b, f.x, f.z))) return;
  b.hp--;
  b.invincible = 0.7;
  g.score += 40;
  g.emit('boss-hit', { hp: b.hp, x: b.x, z: b.z });
  if (g.level === 2 && b.hp > 0 && b.hp <= b.maxHP / 2 && b.phase === 1) {
    b.phase = 2;
    b.attackCooldown = Math.min(b.attackCooldown, 1.5);
    b.summonCooldown = Math.min(b.summonCooldown, 2);
    g.emit('boss-rage', { name: b.name });
  }
  if (b.hp === 0) {
    b.defeated = true;
    g.phase = 'cleared';
    g.warnings = [];
    g.bombs = [];
    g.blasts = [];
    g.players.forEach((p) => {
      if (p.ai) p.alive = false;
    });
    g.score += 500 + g.level * 250;
    g.emit('boss-defeated', { name: b.name, x: b.x, z: b.z });
  }
}
