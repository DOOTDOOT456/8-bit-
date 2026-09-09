// ============================================================
//  EMBERFALL — core engine
// ============================================================
import { ITEMS, ENEMY_TYPES, BOSSES, LOOT_TABLE, CLASSES, RARITY_COLORS, DEEP_LOOT } from "./data.js";
import { generateMap, isWall, circleHitsWall } from "./world.js";

// Depth scaling: every endless chapter below depth 3 multiplies enemy stats.
export function depthMultiplier(depth) {
  if (depth <= 3) return 1;
  const d = depth - 3;
  return 1 + d * 0.35 + d * d * 0.04;
}

export function scaleEnemy(type, depth) {
  const m = depthMultiplier(depth);
  if (m === 1) return ENEMY_TYPES[type];
  const t = ENEMY_TYPES[type];
  return { ...t, hp: Math.round(t.hp * m), dmg: Math.round(t.dmg * (1 + (m - 1) * 0.6)), xp: Math.round(t.xp * m) };
}

export function scaleBoss(id, depth) {
  const m = depthMultiplier(depth);
  if (m === 1) return BOSSES[id];
  const b = BOSSES[id];
  return { ...b, hp: Math.round(b.hp * m), dmg: Math.round(b.dmg * (1 + (m - 1) * 0.6)), xp: Math.round(b.xp * m) };
}

export class Game {
  constructor(state) {
    this.state = state; // shared UI/game state object
    this.canvas = null;
    this.ctx = null;
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false, wx: 0, wy: 0 };
    this.running = false;
    this.frame = 0;
    this.cam = { x: 0, y: 0 };
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.enemies = [];
    this.pickups = [];
    this.boss = null;
    this.bossDefeated = false;
    this.bossLooted = false;
    this.killCount = 0;
    this.questKills = 0;
    this.timeOfDay = 0.3; // 0..1, 0.25 = dawn, 0.5 noon, 0.75 dusk
    this.dayNum = 1;
    this.hitStop = 0;
    this.onEvent = () => {};
    this.pauseFlag = false;
    this.depth = 1; // chapter depth: 1-3 story, 4+ endless
    this.multiplayer = false;
    this.p2 = null;
    // netplay
    this.netMode = null; // null | "host" | "client"
    this.netSendState = null;
    this.netSendInput = null;
    this.remoteInput = null;
    this.remoteSeen = 0;
    this.netBoss = null;
    this.netP2 = null;
  }

  startChapter(chapter) {
    this.chapter = chapter;
    this.phoenixUsed = false;
    this.map = generateMap(chapter.map);
    const [sx, sy] = chapter.map.spawn;
    this.player.x = sx * 32 + 16;
    this.player.y = sy * 32 + 16;
    if (this.p2) { this.p2.x = this.player.x + 30; this.p2.y = this.player.y; this.p2.hp = this.p2.maxHp; }
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.pickups = [];
    this.boss = null;
    this.bossDefeated = false;
    this.bossLooted = false;
    this.killCount = 0;
    this.questKills = 0;
    this.timeOfDay = 0.3;
    this.spawnEnemies();
    this.onEvent({ type: "chapterStart", chapter });
  }

  spawnEnemies() {
    const cfg = this.chapter.map.enemies;
    for (const [type, count] of Object.entries(cfg)) {
      for (let i = 0; i < count; i++) this.spawnEnemy(type);
    }
  }

  spawnEnemy(type, x, y) {
    const t = scaleEnemy(type, this.depth);
    if (!t) return;
    for (let tries = 0; tries < 50; tries++) {
      const tx = 2 + Math.floor(Math.random() * (this.map.w - 4));
      const ty = 2 + Math.floor(Math.random() * (this.map.h - 4));
      if (this.map.grid[ty * this.map.w + tx]) continue;
      const px = x ?? tx * 32 + 16, py = y ?? ty * 32 + 16;
      // keep away from player
      if (x === undefined && Math.hypot(px - this.player.x, py - this.player.y) < 260) continue;
      this.enemies.push({
        type, name: t.name, x: px, y: py, hp: t.hp, maxHp: t.hp,
        r: t.r, speed: t.speed, dmg: t.dmg, xp: t.xp,
        aggro: t.aggro, contact: t.contact, ranged: t.ranged, projSpeed: t.projSpeed, projColor: t.projColor, fire: t.fire,
        hitFlash: 0, atkCd: 0, wanderT: 0, wx: 0, wy: 0, spawnT: 20,
      });
      return;
    }
  }

  spawnBoss(id) {
    const b = scaleBoss(id, this.depth);
    const [ax, ay] = this.map.bossArena;
    this.boss = {
      id, name: b.name, x: ax * 32 + 16, y: ay * 32 + 16,
      hp: b.hp, maxHp: b.hp, dmg: b.dmg, speed: b.speed, r: b.r,
      xp: b.xp, phases: b.phases, phase: 1, drops: b.drops,
      ranged: b.ranged, projSpeed: b.projSpeed, projColor: b.projColor,
      spawns: b.spawns, atkCd: 0, hitFlash: 0, active: false, dashCd: 120,
    };
    this.onEvent({ type: "bossSpawn", name: b.name });
  }

  // ------------- player init from class + inventory -------------
  // ------------- Player 2 (local co-op: IJKL move, auto-attack) -------------
  initPlayer2(clsId) {
    const c = CLASSES[clsId];
    this.p2 = {
      cls: clsId, x: this.player.x + 30, y: this.player.y, r: 10,
      maxHp: c.hp + (this.prestige?.maxHp ?? 0), hp: c.hp + (this.prestige?.maxHp ?? 0),
      speed: c.speed, baseDamage: c.damage, attackRange: c.attackRange,
      attackArc: c.attackArc, attackCdMax: c.attackCd, ranged: !!c.ranged,
      attackCd: 0, facing: 0, color: c.color, level: 1,
    };
    this.p2Swing = null;
    this.onEvent({ type: "p2Join", cls: c.name });
  }

  updateP2() {
    const p2 = this.p2;
    if (!p2 || !this.multiplayer) return;
    let dx = 0, dy = 0;
    if (this.netMode === "host" && this.remoteInput) {
      // remote player controls P2 via network
      const rk = this.remoteInput.keys;
      if (rk.left) dx -= 1;
      if (rk.right) dx += 1;
      if (rk.up) dy -= 1;
      if (rk.down) dy += 1;
    } else {
      const k = this.keys;
      if (k.KeyJ) dx -= 1;
      if (k.KeyL) dx += 1;
      if (k.KeyI) dy -= 1;
      if (k.KeyK) dy += 1;
    }
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len; dy /= len;
      const sp = p2.speed + (this.prestige?.speed ?? 0);
      if (!circleHitsWall(this.map, p2.x + dx * sp, p2.y, p2.r)) p2.x += dx * sp;
      if (!circleHitsWall(this.map, p2.x, p2.y + dy * sp, p2.r)) p2.y += dy * sp;
      p2.facing = Math.atan2(dy, dx);
    }
    if (p2.attackCd > 0) p2.attackCd--;
    // auto-attack nearest enemy
    let nearest = null, nd = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p2.x, e.y - p2.y);
      if (d < nd) { nd = d; nearest = e; }
    }
    if (this.boss?.active) {
      const d = Math.hypot(this.boss.x - p2.x, this.boss.y - p2.y);
      if (d < nd) { nd = d; nearest = this.boss; }
    }
    if (this.netMode === "host" && this.remoteInput?.aim && this.frame - this.remoteSeen < 30) {
      // remote player aims via their mouse
      const aim = this.remoteInput.aim;
      const dAim = Math.hypot(aim.x - p2.x, aim.y - p2.y);
      if (nearest && dAim < 400 && p2.attackCd <= 0) {
        p2.attackCd = p2.attackCdMax;
        const ang = Math.atan2(aim.y - p2.y, aim.x - p2.x);
        p2.facing = ang;
        const dmg = p2.baseDamage + (this.prestige?.damage ?? 0);
        this.projectiles.push({ x: p2.x, y: p2.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, dmg, friendly: true, life: 90, color: "#e090c0", r: 4 });
      }
      if (p2.hp <= 0) { p2.hp = p2.maxHp * 0.5; p2.x = this.player.x + 30; p2.y = this.player.y; }
      return;
    }
    if (nearest && p2.attackCd <= 0) {
      p2.attackCd = p2.attackCdMax;
      p2.facing = Math.atan2(nearest.y - p2.y, nearest.x - p2.x);
      const dmg = p2.baseDamage + (this.prestige?.damage ?? 0);
      if (p2.ranged) {
        this.projectiles.push({ x: p2.x, y: p2.y, vx: Math.cos(p2.facing) * 6, vy: Math.sin(p2.facing) * 6, dmg, friendly: true, life: 90, color: "#e090c0", r: 4 });
      } else if (nd < p2.attackRange + nearest.r) {
        if (nearest === this.boss) this.hurtBoss(dmg);
        else this.hurtEnemy(nearest, dmg);
        this.p2Swing = { x: p2.x, y: p2.y, ang: p2.facing, r: p2.attackRange * 0.8, t: 10 };
      }
    }
    // enemies also target p2
    if (p2.hp <= 0) { p2.hp = p2.maxHp * 0.5; p2.x = this.player.x + 30; p2.y = this.player.y; }
  }

  initPlayer(clsId) {
    const c = CLASSES[clsId];
    this.player = {
      cls: clsId, x: 0, y: 0, r: 10,
      maxHp: c.hp + (this.prestige?.maxHp ?? 0), hp: c.hp + (this.prestige?.maxHp ?? 0),
      speed: c.speed, baseDamage: c.damage, defense: c.defense,
      attackRange: c.attackRange, attackArc: c.attackArc,
      attackCdMax: Math.round(c.attackCd * (1 - (this.prestige?.cdr ?? 0))),
      ranged: !!c.ranged, attackCd: 0, facing: 0, level: 1, xp: 0, xpNext: 60,
      invuln: 0, fireImmune: 0,
    };
  }

  get damage() {
    let d = this.player.baseDamage;
    const w = this.equipped.weapon && ITEMS[this.equipped.weapon];
    if (w && w.dmg) d += w.dmg;
    if (this.buffs.strength > 0) d += 10;
    d += (this.prestige?.damage ?? 0);
    return d;
  }
  get defenseTotal() {
    let d = this.player.defense;
    const a = this.equipped.armor && ITEMS[this.equipped.armor];
    if (a && a.def) d += a.def;
    d += (this.prestige?.defense ?? 0);
    return d;
  }
  get speedTotal() {
    let s = this.player.speed;
    const a = this.equipped.armor && ITEMS[this.equipped.armor];
    if (a && a.speed) s += a.speed;
    s += (this.prestige?.speed ?? 0);
    return s;
  }

  // ------------- main loop -------------
  attach(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.bindInput();
    this.loop = this.loop.bind(this);
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  bindInput() {
    window.addEventListener("keydown", e => {
      this.keys[e.code] = true;
      if (e.code === "Escape") { this.pauseFlag = !this.pauseFlag; this.onEvent({ type: "togglePause" }); }
      if (e.code === "KeyE") this.onEvent({ type: "toggleInventory" });
      if (e.code === "KeyQ") this.usePotion("health_pot");
      if (e.code === "KeyR") this.useArtifact();
    });
    window.addEventListener("keyup", e => { this.keys[e.code] = false; });
    this.canvas.addEventListener("mousemove", e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    this.canvas.addEventListener("mousedown", () => { this.mouse.down = true; });
    window.addEventListener("mouseup", () => { this.mouse.down = false; });
  }

  loop() {
    if (!this.running) return;
    this.frame++;
    if (this.netMode === "client") {
      // Client: no simulation — just capture input for the host
      this.captureClientInput();
    } else if (!this.pauseFlag && !this.state.uiOpen) {
      this.update();
      // Host: broadcast snapshot every 3 frames (~20/s)
      if (this.netMode === "host" && this.frame % 3 === 0 && this.netSendState) {
        this.netSendState(this.snapshot());
      }
    }
    this.render();
    requestAnimationFrame(this.loop);
  }

  // ------------- netplay support -------------
  captureClientInput() {
    if (!this.netSendInput) return;
    const k = this.keys;
    const keys = {
      up: !!(k.KeyW || k.ArrowUp || k.KeyI),
      down: !!(k.KeyS || k.ArrowDown || k.KeyK),
      left: !!(k.KeyA || k.ArrowLeft || k.KeyJ),
      right: !!(k.KeyD || k.ArrowRight || k.KeyL),
      ability: !!k.KeyF,
    };
    // aim at mouse world pos relative to snapshot cam
    this.netSendInput({ keys, aim: { x: this.mouse.x + this.cam.x, y: this.mouse.y + this.cam.y } });
  }

  snapshot() {
    const p = this.player;
    return {
      p: { x: Math.round(p.x), y: Math.round(p.y), hp: Math.round(p.hp), maxHp: p.maxHp, cls: p.cls, facing: p.facing, lvl: p.level, inv: p.invuln > 0 },
      p2: this.multiplayer && this.p2 ? { x: Math.round(this.p2.x), y: Math.round(this.p2.y), hp: Math.round(this.p2.hp), maxHp: this.p2.maxHp, cls: this.p2.cls } : null,
      cam: { x: Math.round(this.cam.x), y: Math.round(this.cam.y) },
      en: this.enemies.map(e => ({ x: Math.round(e.x), y: Math.round(e.y), t: e.type, hp: e.hp, mh: e.maxHp })),
      bo: this.boss && this.boss.active ? { x: Math.round(this.boss.x), y: Math.round(this.boss.y), id: this.boss.id, hp: this.boss.hp, mh: this.boss.maxHp, name: this.boss.name, ph: this.boss.phase } : null,
      pk: this.pickups.map(pk => ({ x: Math.round(pk.x), y: Math.round(pk.y), i: pk.item })),
      pr: this.projectiles.map(pr => ({ x: Math.round(pr.x), y: Math.round(pr.y), c: pr.color, r: pr.r })),
      tod: this.timeOfDay,
    };
  }

  applySnapshot(s) {
    if (!this.map || !this.player) return;
    const p = this.player;
    p.x = s.p.x; p.y = s.p.y; p.hp = s.p.hp; p.maxHp = s.p.maxHp; p.facing = s.p.facing;
    p.level = s.p.lvl;
    this.cam.x = s.cam.x; this.cam.y = s.cam.y;
    this.enemies = s.en.map(e => ({
      type: e.t, x: e.x, y: e.y, hp: e.hp, maxHp: e.mh,
      r: ENEMY_TYPES[e.t]?.r ?? 10, color: ENEMY_TYPES[e.t]?.color ?? "#f0f",
    }));
    this.netBoss = s.bo ? { x: s.bo.x, y: s.bo.y, id: s.bo.id, hp: s.bo.hp, maxHp: s.bo.mh, name: s.bo.name, phase: s.bo.ph } : null;
    if (s.bo && !s.bo.name) this.netBoss = null;
    this.pickups = (s.pk || []).map(pk => ({ x: pk.x, y: pk.y, item: pk.i, t: 0 }));
    this.projectiles = (s.pr || []).map(pr => ({ x: pr.x, y: pr.y, color: pr.c, r: pr.r, vx: 0, vy: 0, life: 2, friendly: true }));
    this.timeOfDay = s.tod;
    this.netP2 = s.p2;
  }

  // Client-mode host-input application: host applies client movement
  applyRemoteInput(id, keys, aim) {
    if (this.netMode !== "host") return;
    // Remote player controls P2
    if (!this.multiplayer) {
      this.multiplayer = true;
      this.initPlayer2("ranger");
    }
    this.remoteInput = { keys, aim };
    this.remoteSeen = this.frame;
  }

  update() {
    const p = this.player;
    // day/night
    this.timeOfDay += 1 / (60 * 150); // full cycle ~2.5 min
    if (this.timeOfDay >= 1) { this.timeOfDay -= 1; this.dayNum++; }

    // movement
    let dx = 0, dy = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) dy -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) dy += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) dx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) dx += 1;
    const len = Math.hypot(dx, dy);
    const sp = this.speedTotal;
    if (len > 0) {
      dx /= len; dy /= len;
      this.tryMove(dx * sp, dy * sp);
      this.facing = Math.atan2(dy, dx);
      this.moving = true;
    } else {
      this.moving = false;
    }

    // aim at mouse world pos
    this.mouse.wx = this.mouse.x + this.cam.x;
    this.mouse.wy = this.mouse.y + this.cam.y;

    // attack
    if (this.player.attackCd > 0) this.player.attackCd--;
    if (this.mouse.down && this.player.attackCd <= 0) this.attack();

    // regen slowly
    if (this.frame % 180 === 0 && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + 2);
    if (p.invuln > 0) p.invuln--;
    if (p.abilityCd > 0) p.abilityCd--;
    if (this.artifactCd > 0) this.artifactCd--;
    if (this.buffs.strength > 0) this.buffs.strength--;
    if (this.buffs.burnHeal > 0) { this.buffs.burnHeal--; if (this.frame % 30 === 0) this.healPlayer(2); }

    this.updateEnemies();
    this.updateP2();
    this.updateBoss();
    this.updateProjectiles();
    this.updatePickups();
    this.updateParticles();

    // camera
    const vw = this.canvas.width, vh = this.canvas.height;
    this.cam.x = Math.max(0, Math.min(p.x - vw / 2, this.map.w * 32 - vw));
    this.cam.y = Math.max(0, Math.min(p.y - vh / 2, this.map.h * 32 - vh));

    // boss trigger: entering arena
    const [ax, ay] = this.map.bossArena;
    if (!this.boss && !this.bossDefeated && Math.hypot(p.x - (ax * 32 + 16), p.y - (ay * 32 + 16)) < 340) {
      this.spawnBoss(this.chapter.quest.boss);
    }
  }

  tryMove(dx, dy) {
    const p = this.player;
    if (!circleHitsWall(this.map, p.x + dx, p.y, p.r)) p.x += dx;
    if (!circleHitsWall(this.map, p.x, p.y + dy, p.r)) p.y += dy;
  }

  attack() {
    const p = this.player;
    p.attackCd = p.attackCdMax;
    const ang = Math.atan2(this.mouse.wy - p.y, this.mouse.wx - p.x);
    p.facing = ang;
    if (p.ranged) {
      const w = this.equipped.weapon && ITEMS[this.equipped.weapon];
      this.projectiles.push({
        x: p.x, y: p.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6,
        dmg: this.damage, friendly: true, life: 90,
        color: w?.fire ? "#f08040" : (this.player.cls === "ranger" ? "#c0e070" : "#f0a040"),
        fire: !!w?.fire, pierce: !!w?.pierce, r: 4,
      });
    } else {
      // melee arc
      const w = this.equipped.weapon && ITEMS[this.equipped.weapon];
      let hitAny = false;
      const targets = this.boss && this.boss.active ? [...this.enemies, this.boss] : this.enemies;
      for (const e of targets) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < p.attackRange + e.r) {
          const ea = Math.atan2(e.y - p.y, e.x - p.x);
          let diff = Math.abs(ea - ang);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < p.attackArc / 2) {
            this.hurtEnemy(e, this.damage);
            // knockback
            const kb = 6;
            e.x += Math.cos(ang) * kb; e.y += Math.sin(ang) * kb;
            hitAny = true;
          }
        }
      }
      if (hitAny) this.hitStop = 3;
      this.swing = { ang, t: 10 };
    }
  }

  useAbility() {
    const p = this.player;
    if (p.abilityCd > 0) return;
    const c = CLASSES[p.cls];
    p.abilityCd = 480;
    if (p.cls === "knight") {
      // Shield Bash: stun & knockback front enemies
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 70) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          e.x += Math.cos(a) * 30; e.y += Math.sin(a) * 30;
          e.atkCd = 90; // stunned
          this.hurtEnemy(e, 8);
        }
      }
      if (this.boss?.active) {
        const d = Math.hypot(this.boss.x - p.x, this.boss.y - p.y);
        if (d < 80) { this.hurtBoss(15); this.boss.atkCd = 60; }
      }
    } else if (p.cls === "ranger") {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, dmg: this.damage, friendly: true, life: 60, color: "#c0e070", r: 4 });
      }
    } else if (p.cls === "pyromancer") {
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + ring * 0.26;
          this.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a) * (3 + ring * 2), vy: Math.sin(a) * (3 + ring * 2), dmg: this.damage, friendly: true, life: 40, color: "#f06030", fire: true, r: 5 });
        }
      }
    }
    this.onEvent({ type: "ability", name: c.ability });
  }

  // ------------- damage helpers -------------
  hurtEnemy(e, dmg) {
    e.hp -= dmg;
    e.hitFlash = 6;
    this.damageNumbers.push({ x: e.x, y: e.y - 14, v: dmg, t: 40, color: "#fff" });
    const w = this.equipped.weapon && ITEMS[this.equipped.weapon];
    if (w?.lifesteal) this.healPlayer(Math.ceil(dmg * w.lifesteal));
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
    this.killCount++;
    this.gainXp(e.xp);
    for (let j = 0; j < 8; j++)
      this.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 20, color: ENEMY_TYPES[e.type]?.color ?? "#f00", r: 3 });
    // loot
    const table = LOOT_TABLE[e.type] || {};
    const lootMult = this.prestige?.lootMult ?? 1;
    for (const [item, chance] of Object.entries(table)) {
      if (Math.random() < chance * lootMult) this.dropPickup(e.x, e.y, item, 1);
    }
    if (Math.random() < 0.05 * lootMult) this.dropPickup(e.x, e.y, "health_pot", 1);
    // Ultra-rare elite drops from deep enemies (depth 10+)
    if (this.depth >= 10) {
      for (const dl of DEEP_LOOT) {
        if (Math.random() < dl.eliteChance * lootMult) {
          this.dropPickup(e.x, e.y, dl.item, 1);
          this.onEvent({ type: "legendaryDrop", item: dl.item });
        }
      }
    }
  }

  hurtBoss(dmg) {
    const b = this.boss;
    if (!b || !b.active) return;
    b.hp -= dmg;
    b.hitFlash = 6;
    this.damageNumbers.push({ x: b.x + (Math.random() - 0.5) * 20, y: b.y - b.r - 8, v: dmg, t: 40, color: "#ffd040" });
    const w = this.equipped.weapon && ITEMS[this.equipped.weapon];
    if (w?.lifesteal) this.healPlayer(Math.ceil(dmg * w.lifesteal));
    const frac = b.hp / b.maxHp;
    const newPhase = Math.min(b.phases, Math.floor((1 - frac) * b.phases) + 1);
    if (newPhase > b.phase) { b.phase = newPhase; this.onEvent({ type: "bossPhase", phase: newPhase }); }
    if (b.hp <= 0) this.defeatBoss();
  }

  defeatBoss() {
    const b = this.boss;
    this.bossDefeated = true;
    this.gainXp(b.xp);
    if (!this.bossLooted) {
      this.bossLooted = true;
      for (const [item, n] of Object.entries(b.drops)) {
        const count = Array.isArray(n) ? n[0] + Math.floor(Math.random() * (n[1] - n[0] + 1)) : n;
        this.dropPickup(b.x, b.y, item, count);
      }
      // Deep legendary drops (depth 10+ only)
      const lootMult = this.prestige?.lootMult ?? 1;
      for (const dl of DEEP_LOOT) {
        if (this.depth >= dl.minDepth && Math.random() < dl.bossChance * lootMult) {
          this.dropPickup(b.x, b.y, dl.item, 1);
          this.onEvent({ type: "legendaryDrop", item: dl.item });
        }
      }
    }
    for (let j = 0; j < 40; j++)
      this.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 60, color: "#ffd040", r: 4 });
    this.boss = null;
    this.onEvent({ type: "bossDefeated" });
  }

  gainXp(n) {
    const p = this.player;
    p.xp += Math.round(n * (this.prestige?.xpMult ?? 1));
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = Math.floor(p.xpNext * 1.4);
      p.maxHp += 12;
      p.hp = p.maxHp;
      p.baseDamage += 2;
      this.onEvent({ type: "levelUp", level: p.level });
    }
  }

  healPlayer(n) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + n);
  }

  hurtPlayer(dmg, fire) {
    const p = this.player;
    if (p.invuln > 0) return;
    const actual = Math.max(1, dmg - this.defenseTotal);
    p.hp -= actual;
    // Phoenix Heart: revive once per fight instead of dying
    const ph = this.equipped.artifact === "phoenix_heart" && ITEMS["phoenix_heart"];
    if (p.hp <= 0 && ph && !this.phoenixUsed) {
      this.phoenixUsed = true;
      p.hp = Math.floor(p.maxHp * 0.5);
      p.invuln = 120;
      this.onEvent({ type: "phoenixRevive" });
      return;
    }
    p.invuln = 40;
    this.hitStop = 4;
    this.damageNumbers.push({ x: p.x, y: p.y - 18, v: actual, t: 40, color: "#f05050" });
    if (p.hp <= 0) this.onEvent({ type: "playerDeath" });
  }

  // ------------- enemies AI -------------
  updateEnemies() {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.spawnT > 0) { e.spawnT--; continue; }
      if (e.hitFlash > 0) e.hitFlash--;
      if (e.atkCd > 0) e.atkCd--;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < e.aggro && e.atkCd <= 0) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        const sp = e.speed;
        if (e.ranged) {
          if (d > 120) { e.x += Math.cos(a) * sp; e.y += Math.sin(a) * sp; }
          else if (d < 80) { e.x -= Math.cos(a) * sp; e.y -= Math.sin(a) * sp; }
          if (e.atkCd <= 0 && d < 220) {
            e.atkCd = 100;
            this.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * e.projSpeed, vy: Math.sin(a) * e.projSpeed, dmg: e.dmg, friendly: false, life: 120, color: e.projColor, fire: e.fire, r: 4 });
          }
        } else {
          e.x += Math.cos(a) * sp; e.y += Math.sin(a) * sp;
        }
      } else {
        // wander
        e.wanderT--;
        if (e.wanderT <= 0) { e.wanderT = 60 + Math.random() * 120; e.wx = (Math.random() - 0.5) * e.speed; e.wy = (Math.random() - 0.5) * e.speed; }
        e.x += e.wx; e.y += e.wy;
      }
      // separation from walls
      if (circleHitsWall(this.map, e.x, e.y, e.r)) { e.x -= e.wx * 2; e.y -= e.wy * 2; e.wanderT = 0; }
      // contact damage
      if (e.contact && d < e.r + p.r + 2 && e.atkCd <= 0) {
        this.hurtPlayer(e.dmg);
        e.atkCd = 50;
      }
    }
  }

  updateBoss() {
    const b = this.boss;
    if (!b) return;
    const p = this.player;
    if (b.hitFlash > 0) b.hitFlash--;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (!b.active) { if (d < 300) { b.active = true; this.onEvent({ type: "bossFightStart" }); } else return; }
    if (b.atkCd > 0) b.atkCd--;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    const spd = b.speed * (1 + (b.phase - 1) * 0.35);

    if (b.ranged) {
      if (d > 140) { b.x += Math.cos(a) * spd; b.y += Math.sin(a) * spd; }
      if (b.atkCd <= 0) {
        b.atkCd = Math.max(40, 80 - b.phase * 12);
        const shots = 3 + b.phase * 2;
        for (let i = 0; i < shots; i++) {
          const sa = a + (i - (shots - 1) / 2) * 0.22;
          this.projectiles.push({ x: b.x, y: b.y, vx: Math.cos(sa) * b.projSpeed, vy: Math.sin(sa) * b.projSpeed, dmg: b.dmg, friendly: false, life: 150, color: b.projColor, r: 5, fire: true });
        }
      }
    } else {
      // melee boss with phase-based dash
      b.dashCd--;
      if (b.dashCd <= 0 && d > 60) {
        b.dashCd = Math.max(60, 150 - b.phase * 30);
        b.dash = { vx: Math.cos(a) * 7 * spd, vy: Math.sin(a) * 7 * spd, t: 14 };
      }
      if (b.dash && b.dash.t > 0) {
        b.dash.t--;
        b.x += b.dash.vx; b.y += b.dash.vy;
        if (b.dash.t === 0) b.dash = null;
      } else {
        b.x += Math.cos(a) * spd; b.y += Math.sin(a) * spd;
      }
      if (b.atkCd <= 0 && d < b.r + p.r + 6) { this.hurtPlayer(b.dmg); b.atkCd = 45; }
    }

    // Araxa spawns spiderlings
    if (b.spawns && this.frame % (360 - b.phase * 60) === 0) {
      for (let i = 0; i < 2 + b.phase; i++) this.spawnEnemy(b.spawns, b.x + (Math.random() - 0.5) * 60, b.y + (Math.random() - 0.5) * 60);
    }
    if (circleHitsWall(this.map, b.x, b.y, b.r)) { b.x -= Math.cos(a) * spd; b.y -= Math.sin(a) * spd; }
  }

  updateProjectiles() {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx; pr.y += pr.vy;
      pr.life--;
      let dead = pr.life <= 0 || isWall(this.map, pr.x, pr.y);
      if (!dead) {
        if (pr.friendly) {
          for (const e of this.enemies) {
            if (pr.hitIds?.has(e)) continue;
            if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.r + pr.r) {
              this.hurtEnemy(e, pr.dmg);
              if (pr.pierce) {
                (pr.hitIds ??= new Set()).add(e);
                continue;
              }
              dead = true; break;
            }
          }
          if (!dead && this.boss?.active && Math.hypot(this.boss.x - pr.x, this.boss.y - pr.y) < this.boss.r + pr.r) {
            this.hurtBoss(pr.dmg);
            dead = true;
          }
        } else if (Math.hypot(p.x - pr.x, p.y - pr.y) < p.r + pr.r) {
          this.hurtPlayer(pr.dmg, pr.fire);
          dead = true;
        }
      }
      if (dead) this.projectiles.splice(i, 1);
    }
  }

  updatePickups() {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.t = (pk.t || 0) + 1;
      const d = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (d < 60) { // magnet
        const a = Math.atan2(p.y - pk.y, p.x - pk.x);
        pk.x += Math.cos(a) * 3; pk.y += Math.sin(a) * 3;
      }
      if (d < 16) {
        this.onEvent({ type: "pickup", item: pk.item, count: pk.count });
        this.pickups.splice(i, 1);
      }
    }
  }

  dropPickup(x, y, item, count) {
    this.pickups.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, item, count });
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vx *= 0.92; pt.vy *= 0.92;
      if (--pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y -= 0.6;
      if (--dn.t <= 0) this.damageNumbers.splice(i, 1);
    }
    if (this.swing) { this.swing.t--; if (this.swing.t <= 0) this.swing = null; }
  }

  // ------------- consumables -------------
  usePotion(id) {
    const item = ITEMS[id];
    if (!item || item.type !== "potion") return;
    this.onEvent({ type: "consumePotion", id });
    if (item.heal) this.healPlayer(item.heal);
    if (item.buff) this.buffs.strength = item.buff * 60;
    this.onEvent({ type: "potionUsed", id });
  }

  useArtifact() {
    const id = this.equipped.artifact;
    if (!id) return;
    const item = ITEMS[id];
    if (this.artifactCd > 0) return;
    this.artifactCd = item.cd;
    if (item.effect === "dash") {
      const p = this.player;
      const a = p.facing || 0;
      const reach = id === "sigil_of_depth" ? 12 : 8;
      for (let i = 0; i < 10; i++) {
        if (!circleHitsWall(this.map, p.x + Math.cos(a) * reach, p.y + Math.sin(a) * reach, p.r)) {
          p.x += Math.cos(a) * reach; p.y += Math.sin(a) * reach;
        }
      }
      p.invuln = 20;
    } else if (item.effect === "heal") {
      this.buffs.burnHeal = 120;
    }
  }

  // ------------- quest progress -------------
  onKillCheck() {
    const q = this.chapter.quest;
    if (q.kills > 0) {
      this.questKills++;
      if (this.questKills === q.kills) this.onEvent({ type: "questProgress", text: `Quest: ${this.questKills}/${q.kills} kills — the Warden's keep is open. Seek the boss arena!` });
    }
  }

  // ------------- rendering -------------
  render() {
    const ctx = this.ctx;
    const vw = this.canvas.width, vh = this.canvas.height;
    const m = this.map;
    ctx.fillStyle = "#101014";
    ctx.fillRect(0, 0, vw, vh);
    if (!m) return;

    const t = m.theme;
    const x0 = Math.max(0, Math.floor(this.cam.x / 32));
    const y0 = Math.max(0, Math.floor(this.cam.y / 32));
    const x1 = Math.min(m.w - 1, Math.ceil((this.cam.x + vw) / 32));
    const y1 = Math.min(m.h - 1, Math.ceil((this.cam.y + vh) / 32));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const wall = m.grid[y * m.w + x];
        const sx = x * 32 - this.cam.x, sy = y * 32 - this.cam.y;
        if (wall) {
          ctx.fillStyle = t.wall;
          ctx.fillRect(sx, sy, 32, 32);
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(sx, sy, 32, 3);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? t.ground : t.ground2;
          ctx.fillRect(sx, sy, 32, 32);
        }
      }
    }

    // props (simple)
    for (const prop of m.props) {
      const sx = prop.x - this.cam.x, sy = prop.y - this.cam.y;
      if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
      const colors = { trees: "#2a5a24", rocks: "#808088", crystals: "#a050f0" };
      ctx.fillStyle = colors[prop.kind] || "#888";
      const s = prop.kind === "trees" ? 14 : 10;
      ctx.beginPath();
      ctx.arc(sx, sy, s, 0, Math.PI * 2);
      ctx.fill();
    }

    // pickups
    for (const pk of this.pickups) {
      const sx = pk.x - this.cam.x, sy = pk.y - this.cam.y + Math.sin(pk.t / 12) * 3;
      const item = ITEMS[pk.item];
      ctx.fillStyle = item?.color ?? "#fff";
      ctx.fillRect(sx - 5, sy - 5, 10, 10);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.strokeRect(sx - 5, sy - 5, 10, 10);
    }

    // enemies
    for (const e of this.enemies) {
      const sx = e.x - this.cam.x, sy = e.y - this.cam.y;
      if (sx < -30 || sy < -30 || sx > vw + 30 || sy > vh + 30) continue;
      const t2 = ENEMY_TYPES[e.type];
      ctx.fillStyle = e.hitFlash > 0 ? "#fff" : t2.color;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      ctx.fillStyle = "#1a1a1a";
      const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      ctx.fillRect(sx + Math.cos(a) * 4 - 2, sy + Math.sin(a) * 4 - 2, 3, 3);
      ctx.fillRect(sx + Math.cos(a) * 4 + 1, sy + Math.sin(a) * 4 + 1, 3, 3);
      // hp bar if hurt
      if (e.hp < e.maxHp) {
        ctx.fillStyle = "#300";
        ctx.fillRect(sx - 12, sy - e.r - 8, 24, 3);
        ctx.fillStyle = "#f50";
        ctx.fillRect(sx - 12, sy - e.r - 8, 24 * (e.hp / e.maxHp), 3);
      }
    }

    // boss (client mode renders host's snapshot)
    if (this.netMode === "client") {
      if (this.netBoss) {
        const b = this.netBoss;
        const sx = b.x - this.cam.x, sy = b.y - this.cam.y;
        ctx.fillStyle = BOSSES[b.id]?.color ?? "#f0f";
        ctx.beginPath(); ctx.arc(sx, sy, BOSSES[b.id]?.r ?? 22, 0, Math.PI * 2); ctx.fill();
      }
    } else if (this.boss) this.renderBoss(ctx);

    // projectiles
    for (const pr of this.projectiles) {
      const sx = pr.x - this.cam.x, sy = pr.y - this.cam.y;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(sx, sy, pr.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // particles
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.life / 30;
      ctx.fillRect(pt.x - this.cam.x - pt.r / 2, pt.y - this.cam.y - pt.r / 2, pt.r, pt.r);
      ctx.globalAlpha = 1;
    }

    // player 2 — client mode: render host's P2/remote-hero from snapshot
    if (this.netMode === "client" && this.netP2) {
      const p2 = this.netP2;
      const x2 = p2.x - this.cam.x, y2 = p2.y - this.cam.y;
      ctx.fillStyle = CLASSES[p2.cls]?.color ?? "#e090c0";
      ctx.beginPath(); ctx.arc(x2, y2, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#f05070"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x2, y2, 13, -Math.PI / 2, -Math.PI / 2 + (p2.hp / p2.maxHp) * Math.PI * 2); ctx.stroke();
    } else if (this.multiplayer && this.p2) {
      const p2 = this.p2;
      const x2 = p2.x - this.cam.x, y2 = p2.y - this.cam.y;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(x2, y2 + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p2.color;
      ctx.beginPath(); ctx.arc(x2, y2, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f0f0ff";
      ctx.fillRect(x2 - 1, y2 - 1, 3, 3);
      // p2 hp ring
      ctx.strokeStyle = "#f05070"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x2, y2, 13, -Math.PI / 2, -Math.PI / 2 + (p2.hp / p2.maxHp) * Math.PI * 2); ctx.stroke();
      if (this.p2Swing) {
        ctx.strokeStyle = "rgba(255,200,240,0.8)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.p2Swing.x - this.cam.x, this.p2Swing.y - this.cam.y, this.p2Swing.r, this.p2Swing.ang - 0.7, this.p2Swing.ang + 0.7);
        ctx.stroke();
        this.p2Swing.t--; if (this.p2Swing.t <= 0) this.p2Swing = null;
      }
    }

    // player
    this.renderPlayer(ctx);

    // swing arc
    if (this.swing) {
      const p = this.player;
      ctx.strokeStyle = "rgba(255,255,220,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x - this.cam.x, p.y - this.cam.y, p.attackRange * 0.8, this.swing.ang - 0.7, this.swing.ang + 0.7);
      ctx.stroke();
    }

    // damage numbers
    ctx.font = "bold 12px monospace";
    for (const dn of this.damageNumbers) {
      ctx.fillStyle = dn.color;
      ctx.globalAlpha = Math.min(1, dn.t / 20);
      ctx.fillText(dn.v, dn.x - this.cam.x - 8, dn.y - this.cam.y);
      ctx.globalAlpha = 1;
    }

    // day/night overlay
    const darkness = this.darknessLevel();
    if (darkness > 0) {
      ctx.fillStyle = `rgba(8,10,30,${darkness * 0.55})`;
      ctx.fillRect(0, 0, vw, vh);
      // light radius around player at night
      if (darkness > 0.3) {
        const grd = ctx.createRadialGradient(this.player.x - this.cam.x, this.player.y - this.cam.y, 30, this.player.x - this.cam.x, this.player.y - this.cam.y, 180);
        grd.addColorStop(0, "rgba(255,200,100,0.15)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, vw, vh);
      }
    }

    // vignette on low hp
    if (this.player.hp / this.player.maxHp < 0.3) {
      const a = 0.25 + Math.sin(this.frame / 10) * 0.1;
      const grd = ctx.createRadialGradient(vw / 2, vh / 2, vh / 3, vw / 2, vh / 2, vh);
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, `rgba(200,0,0,${a})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  darknessLevel() {
    // 0 = bright day, 1 = deep night
    const t = this.timeOfDay;
    if (t < 0.2) return 1 - t / 0.2 * 0.2 + 0.8; // late night
    if (t < 0.3) return 0.8 * (1 - (t - 0.2) / 0.1); // dawn
    if (t < 0.7) return 0; // day
    if (t < 0.8) return (t - 0.7) / 0.1 * 0.8; // dusk
    return 0.8; // night
  }

  renderPlayer(ctx) {
    const p = this.player;
    const sx = p.x - this.cam.x, sy = p.y - this.cam.y;
    const c = CLASSES[p.cls];
    const bob = Math.sin(this.frame / 6) * (this.moving ? 1.5 : 0.5);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = p.invuln > 0 && this.frame % 6 < 3 ? "#fff" : c.color;
    ctx.beginPath();
    ctx.arc(sx, sy + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    // face direction indicator
    const a = p.facing || 0;
    ctx.fillStyle = "#1a1a2a";
    ctx.fillRect(sx + Math.cos(a) * 6 - 2, sy + bob + Math.sin(a) * 6 - 2, 4, 4);
    // weapon hint
    const w = this.equipped.weapon && ITEMS[this.equipped.weapon];
    if (w) {
      ctx.fillStyle = w.color;
      ctx.fillRect(sx + Math.cos(a) * 12 - 3, sy + bob + Math.sin(a) * 12 - 3, 6, 6);
    }
  }

  renderBoss(ctx) {
    const b = this.boss;
    const sx = b.x - this.cam.x, sy = b.y - this.cam.y;
    const base = BOSSES[b.id];
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + b.r * 0.8, b.r, b.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = b.hitFlash > 0 ? "#fff" : base.color;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r + Math.sin(this.frame / 8) * 2, 0, Math.PI * 2);
    ctx.fill();
    // eyes glow red
    const a = Math.atan2(this.player.y - b.y, this.player.x - b.x);
    ctx.fillStyle = "#f03030";
    ctx.fillRect(sx + Math.cos(a) * b.r * 0.5 - 3, sy + Math.sin(a) * b.r * 0.5 - 3, 6, 6);
    ctx.fillRect(sx + Math.cos(a) * b.r * 0.5 + 3, sy + Math.sin(a) * b.r * 0.5 + 1, 6, 6);
    // phase aura
    if (b.phase > 1) {
      ctx.strokeStyle = `rgba(255,80,40,${0.2 * b.phase})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, b.r + 8 + b.phase * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    // HP bar (screen top handled by UI)
  }
}
