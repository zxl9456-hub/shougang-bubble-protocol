import {
  shapeMap,
  VENTS,
  bossOccupies,
  awakenBoss,
  updateEncounter,
  damageBoss,
} from './encounters.js';
export const WIDTH = 13,
  HEIGHT = 11;
export const LEVELS = [
  {
    name: '炉火重燃',
    landmark: '三高炉',
    subtitle: '穿过高炉巷道，清空方块后击败炉芯守卫。',
    mapName: '高炉巷战',
    boss: {
      name: '炉芯守卫',
      hp: 4,
      attackGap: 5.2,
      warning: 1.8,
      summonGap: 0,
      summonCount: 0,
      minionCap: 0,
    },
    difficulty: '初阶',
    blocks: 34,
    enemies: 1,
    time: 310,
    enemySpeed: 0.29,
    enemyRange: 2,
    enemyCapacity: 1,
    enemyHP: 1,
    enemyFuse: 2.4,
    bombGap: 3.4,
    supplyChance: 0.36,
    color: '#ffb357',
  },
  {
    name: '冷却回路',
    landmark: '冷却塔',
    subtitle: '绕过错位钢墙与蒸汽喷口，迎战会召唤小怪的冷却监工。',
    mapName: '冷却迷阵',
    boss: {
      name: '冷却监工',
      hp: 7,
      attackGap: 4.3,
      warning: 1.5,
      summonGap: 12,
      summonCount: 1,
      minionCap: 2,
    },
    difficulty: '进阶',
    blocks: 42,
    enemies: 2,
    time: 290,
    enemySpeed: 0.23,
    enemyRange: 3,
    enemyCapacity: 2,
    enemyHP: 2,
    enemyFuse: 2.1,
    bombGap: 2.6,
    supplyChance: 0.3,
    color: '#4cecff',
  },
  {
    name: '飞向未来',
    landmark: '雪飞天',
    subtitle: '突破钢轨要塞，击败会狂暴和成群召唤小怪的钢铁怪兽。',
    mapName: '钢轨要塞',
    boss: {
      name: '钢铁怪兽',
      hp: 12,
      attackGap: 3.5,
      warning: 1.25,
      summonGap: 9,
      summonCount: 2,
      minionCap: 4,
    },
    difficulty: '挑战',
    blocks: 50,
    enemies: 3,
    time: 270,
    enemySpeed: 0.18,
    enemyRange: 4,
    enemyCapacity: 3,
    enemyHP: 2,
    enemyFuse: 1.85,
    bombGap: 1.9,
    supplyChance: 0.24,
    color: '#ff66d5',
  },
];
const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const key = (x, z) => `${x},${z}`;
export class BubbleGame {
  constructor({
    mode = 'solo',
    level = 0,
    seed = 2026,
    score = 0,
    journey = { blocks: 0, bosses: 0, elapsed: 0 },
  } = {}) {
    if (!['solo', 'duel'].includes(mode)) throw Error('Invalid mode');
    this.mode = mode;
    this.level = Math.max(0, Math.min(2, level));
    this.rules = LEVELS[this.level];
    this.width = WIDTH;
    this.height = HEIGHT;
    this.seed = seed >>> 0;
    this.serial = 0;
    this.score = score;
    this.entryScore = score;
    this.journey = { ...journey };
    this.elapsed = 0;
    this.phase = 'clear';
    this.boss = null;
    this.warnings = [];
    this.ventClock = 12;
    this.ventCycle = 0;
    this.nextEnemyId = 100;
    this.vents =
      mode === 'solo' && this.level > 0
        ? VENTS.slice(0, this.level === 1 ? 4 : 6)
        : [];
    this.time = mode === 'solo' ? LEVELS[this.level].time : 120;
    this.status = 'playing';
    this.result = null;
    this.paused = false;
    this.events = [];
    this.bombs = [];
    this.blasts = [];
    this.pickups = [];
    this.landmarkUnlocked = false;
    this.destroyed = 0;
    this.revision = 0;
    this.grid = Array.from({ length: HEIGHT }, (_, z) =>
      Array.from({ length: WIDTH }, (_, x) =>
        !x ||
        !z ||
        x === WIDTH - 1 ||
        z === HEIGHT - 1 ||
        (x % 2 === 0 && z % 2 === 0)
          ? 1
          : 2,
      ),
    );
    if (mode === 'solo') shapeMap(this.grid, this.level);
    const spawns = [
      [1, 1],
      [11, 9],
      [11, 1],
      [1, 9],
    ];
    for (const [x, z] of spawns)
      for (const [dx, dz] of [
        [0, 0],
        ...DIRS,
        ...DIRS.map(([a, b]) => [a * 2, b * 2]),
      ]) {
        if (this.grid[z + dz]?.[x + dx] === 2) this.grid[z + dz][x + dx] = 0;
      }
    for (const [x, z] of spawns) {
      const sx = x < 6 ? 1 : -1,
        sz = z < 5 ? 1 : -1;
      for (const [dx, dz] of [
        [2 * sx, sz],
        [sx, 2 * sz],
      ])
        if (this.grid[z + dz][x + dx] === 2) this.grid[z + dz][x + dx] = 0;
    }
    const candidates = [];
    for (let z = 0; z < HEIGHT; z++)
      for (let x = 0; x < WIDTH; x++)
        if (this.grid[z][x] === 2) candidates.push([x, z]);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const blockCount = mode === 'solo' ? this.rules.blocks : 38;
    candidates.forEach(([x, z], i) => {
      this.grid[z][x] = i < blockCount ? 2 : 0;
    });
    this.initialBlocks = this.remainingBlocks;
    this.players = spawns
      .slice(0, mode === 'duel' ? 2 : LEVELS[this.level].enemies + 1)
      .map(([x, z], i) => ({
        id: i + 1,
        x,
        z,
        dx: 0,
        dz: 1,
        alive: true,
        hp: mode === 'solo' ? (i === 0 ? 3 : this.rules.enemyHP) : 1,
        invincible: 0,
        cooldown: 0,
        ai: mode === 'solo' && i > 0,
        think: mode === 'solo' && i > 0 ? 1.5 : 0,
        bombCooldown: 0,
        capacity: mode === 'solo' && i > 0 ? this.rules.enemyCapacity : 2,
        range: mode === 'solo' && i > 0 ? this.rules.enemyRange : 2,
        speed: 0.145,
        color:
          i === 0
            ? '#39d8f5'
            : i === 1
              ? '#ff7753'
              : i === 2
                ? '#ffc162'
                : '#bd8fff',
      }));
    this.emit('start');
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  get remainingBlocks() {
    return this.grid.reduce(
      (total, row) => total + row.filter((v) => v >= 2).length,
      0,
    );
  }
  id() {
    return ++this.serial;
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
    this.revision++;
  }
  drainEvents() {
    return this.events.splice(0);
  }
  isWall(x, z) {
    return this.grid[z]?.[x] === undefined || this.grid[z][x] === 1;
  }
  bombAt(x, z) {
    return this.bombs.find((b) => b.x === x && b.z === z);
  }
  walkable(x, z, player, ignoreActors = false) {
    return (
      this.grid[z]?.[x] === 0 &&
      !this.bombAt(x, z) &&
      !bossOccupies(this.boss, x, z) &&
      (ignoreActors ||
        !this.players.some(
          (p) => p !== player && p.alive && p.x === x && p.z === z,
        ))
    );
  }
  move(id, dx, dz) {
    const p = this.players.find((v) => v.id === id);
    if (
      this.status !== 'playing' ||
      this.paused ||
      !p?.alive ||
      p.cooldown > 0 ||
      Math.abs(dx) + Math.abs(dz) !== 1
    )
      return false;
    p.dx = dx;
    p.dz = dz;
    if (!this.walkable(p.x + dx, p.z + dz, p)) return false;
    p.x += dx;
    p.z += dz;
    p.cooldown = p.speed;
    if (p.ai) p.cooldown = this.rules.enemySpeed;
    this.collect(p);
    this.revision++;
    return true;
  }
  collect(p) {
    const found = this.pickups.filter((v) => v.x === p.x && v.z === p.z);
    for (const v of found) {
      this.pickups = this.pickups.filter((a) => a !== v);
      if (v.type === 'range') p.range = Math.min(5, p.range + 1);
      if (v.type === 'capacity') p.capacity = Math.min(5, p.capacity + 1);
      if (v.type === 'speed') p.speed = Math.max(0.085, p.speed - 0.018);
      if (v.type === 'heart') p.hp = Math.min(3, p.hp + 1);
      this.emit('pickup', { pickup: v.type, player: p.id });
    }
  }
  placeBomb(id) {
    const p = this.players.find((v) => v.id === id);
    if (
      this.status !== 'playing' ||
      this.paused ||
      !p?.alive ||
      this.bombAt(p.x, p.z) ||
      (p.ai && p.bombCooldown > 0) ||
      this.bombs.filter((b) => b.owner === id).length >= p.capacity
    )
      return false;
    this.bombs.push({
      id: this.id(),
      x: p.x,
      z: p.z,
      fuse: p.ai ? this.rules.enemyFuse : 2.2,
      range: p.range,
      owner: id,
      color: p.color,
    });
    if (p.ai) p.bombCooldown = this.rules.bombGap;
    this.emit('bomb', { player: id });
    return true;
  }
  blastCells(b, grid = this.grid) {
    const cells = [[b.x, b.z]];
    for (const [dx, dz] of DIRS)
      for (let n = 1; n <= b.range; n++) {
        const x = b.x + dx * n,
          z = b.z + dz * n;
        if (grid[z]?.[x] === undefined || grid[z][x] === 1) break;
        cells.push([x, z]);
        if (grid[z][x] >= 2) break;
      }
    return cells;
  }
  danger(extra) {
    const set = new Set();
    for (const b of [...this.bombs, ...(extra ? [extra] : [])])
      for (const [x, z] of this.blastCells(b)) set.add(key(x, z));
    for (const b of this.blasts) set.add(key(b.x, b.z));
    for (const w of this.warnings)
      if (w.kind === 'attack') for (const [x, z] of w.cells) set.add(key(x, z));
    return set;
  }
  route(p, goal, forbidden = new Set(), extraBomb = null) {
    const queue = [[p.x, p.z, []]],
      seen = new Set([key(p.x, p.z)]);
    for (let i = 0; i < queue.length; i++) {
      const [x, z, path] = queue[i];
      if (path.length && goal(x, z)) return path;
      for (const [dx, dz] of DIRS) {
        const nx = x + dx,
          nz = z + dz,
          k = key(nx, nz);
        if (
          seen.has(k) ||
          !this.walkable(nx, nz, p, true) ||
          (extraBomb && nx === extraBomb.x && nz === extraBomb.z) ||
          forbidden.has(k)
        )
          continue;
        seen.add(k);
        queue.push([nx, nz, [...path, [dx, dz]]]);
      }
    }
    return null;
  }
  ai(p, dt) {
    p.think -= dt;
    if (p.think > 0 || p.cooldown > 0 || !p.alive) return;
    p.think = 0.09;
    const danger = this.danger();
    if (danger.has(key(p.x, p.z))) {
      const flames = new Set(this.blasts.map((b) => key(b.x, b.z)));
      const path = this.route(p, (x, z) => !danger.has(key(x, z)), flames);
      if (path) this.move(p.id, ...path[0]);
      return;
    }
    const nearCrate = DIRS.some(
      ([dx, dz]) => this.grid[p.z + dz]?.[p.x + dx] >= 2,
    );
    const target = this.players.find((a) => a.id === 1 && a.alive);
    const nearEnemy =
      target &&
      this.blastCells({ ...p, range: p.range }).some(
        ([x, z]) => x === target.x && z === target.z,
      );
    if (nearCrate || nearEnemy) {
      const hypothetical = { x: p.x, z: p.z, range: p.range };
      const after = this.danger(hypothetical);
      const escape = this.route(
        p,
        (x, z) => !after.has(key(x, z)),
        new Set(),
        hypothetical,
      );
      if (
        escape &&
        escape.length * this.rules.enemySpeed < this.rules.enemyFuse - 0.35 &&
        this.placeBomb(p.id)
      )
        return;
    }
    const path = this.route(
      p,
      (x, z) =>
        (target && Math.abs(target.x - x) + Math.abs(target.z - z) <= 1) ||
        DIRS.some(([dx, dz]) => this.grid[z + dz]?.[x + dx] >= 2),
      danger,
    );
    if (path) {
      this.move(p.id, ...path[0]);
      return;
    }
    const dirs = [...DIRS].sort(() => this.random() - 0.5);
    for (const [dx, dz] of dirs)
      if (!danger.has(key(p.x + dx, p.z + dz)) && this.move(p.id, dx, dz))
        return;
  }
  explode(first) {
    const queue = [first],
      done = new Set(),
      grid = this.grid.map((row) => [...row]);
    while (queue.length) {
      const b = queue.shift();
      if (done.has(b.id) || !this.bombs.includes(b)) continue;
      done.add(b.id);
      this.bombs = this.bombs.filter((a) => a !== b);
      for (const [x, z] of this.blastCells(b, grid)) {
        this.blasts.push({ id: this.id(), x, z, life: 0.5, owner: b.owner });
        const chain = this.bombAt(x, z);
        if (chain) queue.push(chain);
        const type = this.grid[z][x];
        if (type >= 2) {
          this.grid[z][x] = 0;
          this.destroyed++;
          if (b.owner === 1) this.score += 10;
          this.emit('destroy', { x, z, owner: b.owner });
          if (
            this.random() <
            (this.mode === 'solo' ? this.rules.supplyChance : 0.32)
          ) {
            const types = ['range', 'capacity', 'speed', 'heart'];
            this.pickups.push({
              id: this.id(),
              x,
              z,
              type: types[Math.floor(this.random() * 4)],
              safeUntil: 0.55,
            });
          }
        }
      }
      this.emit('explode', { x: b.x, z: b.z });
    }
    if (
      this.mode === 'solo' &&
      this.phase === 'clear' &&
      this.destroyed > 0 &&
      this.remainingBlocks === 0
    ) {
      awakenBoss(this);
    }
  }
  damage() {
    for (const p of this.players) {
      if (!p.alive || p.invincible > 0) continue;
      if (
        this.blasts.some(
          (b) => b.x === p.x && b.z === p.z && !(p.ai && b.hazard),
        )
      ) {
        p.hp--;
        p.invincible = 1.5;
        if (p.hp <= 0) {
          p.alive = false;
          if (p.ai) this.score += 100;
          if (p.minion && this.players[0].hp < 3 && this.random() < 0.35)
            this.pickups.push({ id: this.id(), x: p.x, z: p.z, type: 'heart' });
          this.emit('eliminated', { player: p.id });
        } else this.emit('hurt', { player: p.id, hp: p.hp });
      }
    }
  }
  finish(result) {
    this.result = result;
    this.status = 'finished';
    this.emit('finish', { result });
  }
  judge() {
    if (this.status !== 'playing') return;
    if (this.mode === 'solo') {
      if (!this.players[0].alive) {
        this.finish('lost');
        return;
      }
      if (
        !this.landmarkUnlocked &&
        this.remainingBlocks === 0 &&
        this.boss?.defeated
      ) {
        this.landmarkUnlocked = true;
        this.score += 300;
        this.emit('unlock', {
          level: this.level,
          landmark: LEVELS[this.level].landmark,
        });
      }
      if (this.landmarkUnlocked)
        this.finish(this.level === 2 ? 'complete' : 'won');
      else if (!this.players[0].alive) this.finish('lost');
      else if (this.time <= 0) this.finish('timeout');
    } else {
      const live = this.players.filter((p) => p.alive);
      if (live.length === 0) this.finish('draw');
      else if (live.length === 1) this.finish(`p${live[0].id}`);
      else if (this.time <= 0) this.finish('draw');
    }
  }
  update(dt) {
    if (this.status !== 'playing' || this.paused) return;
    dt = Math.max(0, Math.min(dt, 0.1));
    this.time = Math.max(0, this.time - dt);
    this.elapsed += dt;
    this.players.forEach((p) => {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.bombCooldown = Math.max(0, p.bombCooldown - dt);
      p.invincible = Math.max(0, p.invincible - dt);
    });
    this.blasts.forEach((b) => (b.life -= dt));
    this.blasts = this.blasts.filter((b) => b.life > 0);
    this.bombs.forEach((b) => (b.fuse -= dt));
    for (const b of [...this.bombs]) if (b.fuse <= 0) this.explode(b);
    updateEncounter(this, dt);
    this.damage();
    damageBoss(this);
    for (const p of this.players) if (p.ai) this.ai(p, dt);
    this.damage();
    this.judge();
  }
  snapshot() {
    return {
      mode: this.mode,
      entryScore: this.entryScore,
      journey: { ...this.journey },
      phase: this.phase,
      boss: this.boss ? { ...this.boss } : null,
      warnings: this.warnings.map((w) => ({
        ...w,
        cells: w.cells.map((c) => [...c]),
      })),
      vents: this.vents.map((c) => [...c]),
      elapsed: this.elapsed,
      totals: {
        blocks: this.journey.blocks + this.destroyed,
        bosses: this.journey.bosses + (this.boss?.defeated ? 1 : 0),
        elapsed: this.journey.elapsed + this.elapsed,
      },
      level: this.level,
      width: this.width,
      height: this.height,
      grid: this.grid.map((a) => [...a]),
      players: this.players.map((p) => ({ ...p })),
      bombs: this.bombs.map((p) => ({ ...p })),
      blasts: this.blasts.map((p) => ({ ...p })),
      pickups: this.pickups.map((p) => ({ ...p })),
      time: this.time,
      status: this.status,
      result: this.result,
      paused: this.paused,
      score: this.score,
      landmarkUnlocked: this.landmarkUnlocked,
      remainingBlocks: this.remainingBlocks,
      initialBlocks: this.initialBlocks,
      destroyed: this.destroyed,
      revision: this.revision,
    };
  }
}
