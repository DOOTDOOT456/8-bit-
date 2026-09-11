// ============================================================
//  EMBERFALL — app state + UI wiring
// ============================================================
import "./style.css";
import { Game } from "./game/engine.js";
import { drawPlayer, drawEnemy, drawBoss, drawProjectile, drawPickup, drawParticle, drawDamageNumber, drawMinimap, drawAbilityCd, drawVignette } from "./game/sprites.js";
import { sound } from "./game/sound.js";
import { AchievementManager, ACHIEVEMENTS } from "./game/achievements.js";
import { CLASSES, ITEMS, RECIPES, CHAPTERS, RARITY_COLORS, RARITY_NAMES, PRESTIGE_UPGRADES, prestigeCost, ENDLESS_THEME_CYCLE, ENDLESS_BOSS_CYCLE, ENEMY_TYPES, DEEP_LOOT, LOOT_TABLE, BOSSES, BESTIARY_REWARDS, getDailyQuests } from "./game/data.js";
import { Net, defaultServerUrl } from "./game/net.js";

// --- DOM helpers ---
const $ = sel => document.querySelector(sel);
const show = (id) => { if ($(`#${id}`)) $(`#${id}`).style.display = "flex"; };
const hide = (id) => { if ($(`#${id}`)) $(`#${id}`).style.display = "none"; };
const el = (id) => $(`#${id}`);

// Global cosmetics state
const cosmeticsState = {
  skin: 'default',
  trail: 'none',
  aura: 'none',
};

function getSkin() { return cosmeticsState.skin; }
function setSkin(id) { cosmeticsState.skin = id; }
function getTrail() { return cosmeticsState.trail; }
function setTrail(id) { cosmeticsState.trail = id; }
function getAura() { return cosmeticsState.aura; }
function setAura(id) { cosmeticsState.aura = id; }
function getCosmetics() {
  return {
    skin: cosmeticsState.skin,
    trail: cosmeticsState.trail,
    aura: cosmeticsState.aura,
    skins: [
      { id: 'default', name: 'Default', description: 'Classic player color', color: null, equipped: cosmeticsState.skin === 'default' },
      { id: 'dark', name: 'Dark', description: 'Dark themed player', color: '#2a2a3a', equipped: cosmeticsState.skin === 'dark' },
      { id: 'light', name: 'Light', description: 'Light themed player', color: '#e0e0f0', equipped: cosmeticsState.skin === 'light' },
      { id: 'crimson', name: 'Crimson', description: 'Blood red player', color: '#c03030', equipped: cosmeticsState.skin === 'crimson' },
      { id: 'sapphire', name: 'Sapphire', description: 'Blue sapphire player', color: '#4a6fd4', equipped: cosmeticsState.skin === 'sapphire' },
      { id: 'emerald', name: 'Emerald', description: 'Green emerald player', color: '#3fae5a', equipped: cosmeticsState.skin === 'emerald' },
      { id: 'shadowfire', name: 'Shadowfire', description: 'Purple shadow fire', color: '#8040a0', equipped: cosmeticsState.skin === 'shadowfire' },
      { id: 'dawn', name: 'Dawn', description: 'Golden dawn player', color: '#f0c040', equipped: cosmeticsState.skin === 'dawn' },
      { id: 'void', name: 'Void', description: 'Mysterious void player', color: '#2a2a4a', equipped: cosmeticsState.skin === 'void' },
    ],
    trails: [
      { id: 'none', name: 'No Trail', description: 'No trail effect', color: null, icon: '🚶', equipped: cosmeticsState.trail === 'none' },
      { id: 'ember', name: 'Ember Trail', description: 'Leave a trail of embers', color: '#f06030', icon: '🔥', equipped: cosmeticsState.trail === 'ember' },
      { id: 'frost', name: 'Frost Trail', description: 'Leave a trail of frost', color: '#80c0f0', icon: '❄️', equipped: cosmeticsState.trail === 'frost' },
      { id: 'shadow', name: 'Shadow Trail', description: 'Leave a shadowy trail', color: '#605080', icon: '🌑', equipped: cosmeticsState.trail === 'shadow' },
      { id: 'gold', name: 'Golden Trail', description: 'Leave a trail of gold', color: '#ffd040', icon: '✨', equipped: cosmeticsState.trail === 'gold' },
      { id: 'rainbow', name: 'Rainbow Trail', description: 'Leave a rainbow trail', color: 'rainbow', icon: '🌈', equipped: cosmeticsState.trail === 'rainbow' },
    ],
    auras: [
      { id: 'none', name: 'No Aura', description: 'No aura effect', color: null, icon: '⚪', equipped: cosmeticsState.aura === 'none' },
      { id: 'knight_aura', name: 'Knight\'s Might', description: 'Blue shield aura', color: '#4a6fd4', icon: '🛡️', equipped: cosmeticsState.aura === 'knight_aura' },
      { id: 'ranger_aura', name: 'Ranger\'s Focus', description: 'Green nature aura', color: '#3fae5a', icon: '🏹', equipped: cosmeticsState.aura === 'ranger_aura' },
      { id: 'pyromancer_aura', name: 'Pyromancer\'s Fire', description: 'Orange fire aura', color: '#e07030', icon: '🔥', equipped: cosmeticsState.aura === 'pyromancer_aura' },
      { id: 'champion', name: 'Champion\'s Glory', description: 'Golden champion aura', color: '#ffd040', icon: '🏆', equipped: cosmeticsState.aura === 'champion' },
      { id: 'legendary', name: 'Legendary Presence', description: 'Rainbow legendary aura', color: 'rainbow', icon: '👑', equipped: cosmeticsState.aura === 'legendary' },
    ],
  };
}

const state = {
  uiOpen: false,
  inventory: { health_pot: 2, iron_chunk: 2 },
  equipped: { weapon: null, armor: null, artifact: null },
  chapterIndex: 0,
  storyDone: false,
  // bestiary: discovered enemy ids (persisted)
  bestiary: {},
  bestiaryRewardsClaimed: 0,
  // daily quests (persisted per date)
  dailyDate: "",
  dailyQuests: [],
  dailyProgress: {},
  sigils: 0,
  prestigeRanks: {},     // upgradeId -> rank
  bestDepth: 0,
  totalKills: 0,
  // new tracking
  playedClasses: {},
  craftCount: 0,
  totalItemsCollected: 0,
  highestLevel: 1,
  phoenixRevives: 0,
  deathCount: 0,
  achievements: null, // set after Game init
};

// ---------------- daily quests ----------------
const todayStr = () => new Date().toISOString().slice(0, 10);

function ensureDailyQuests() {
  const today = todayStr();
  if (state.dailyDate !== today) {
    state.dailyDate = today;
    state.dailyQuests = getDailyQuests(today);
    state.dailyProgress = {};
    saveGame();
  } else if (!state.dailyQuests.length) {
    state.dailyQuests = getDailyQuests(today);
  }
}

function bumpDaily(id, amount = 1) {
  ensureDailyQuests();
  for (const q of state.dailyQuests) {
    if (q.id !== id) continue;
    const before = state.dailyProgress[q.id] || 0;
    if (before >= q.n) continue; // already complete
    state.dailyProgress[q.id] = before + amount;
    if (state.dailyProgress[q.id] >= q.n) {
      state.sigils += q.reward;
      toast(`✅ Daily complete: ${q.desc} → +${q.reward} 🔥 Sigils!`);
      refreshDailyUI?.();
    }
    saveGame();
  }
}

// ---------------- save / load (localStorage) ----------------
const SAVE_KEY = "emberfall_save_v1";
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      sigils: state.sigils,
      prestigeRanks: state.prestigeRanks,
      bestiary: state.bestiary,
      bestiaryRewardsClaimed: state.bestiaryRewardsClaimed ?? 0,
      dailyDate: state.dailyDate,
      dailyQuests: state.dailyQuests,
      dailyProgress: state.dailyProgress,
      bestDepth: state.bestDepth,
      totalKills: state.totalKills,
      inventory: state.inventory,
      equipped: state.equipped,
      chapterIndex: state.chapterIndex,
    }));
  } catch (e) { /* storage unavailable */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    Object.assign(state, {
      sigils: s.sigils ?? 0,
      prestigeRanks: s.prestigeRanks ?? {},
      bestiary: s.bestiary ?? {},
      bestiaryRewardsClaimed: s.bestiaryRewardsClaimed ?? 0,
      dailyDate: s.dailyDate ?? "",
      dailyQuests: s.dailyQuests ?? [],
      dailyProgress: s.dailyProgress ?? {},
      bestDepth: s.bestDepth ?? 0,
      totalKills: s.totalKills ?? 0,
      inventory: s.inventory ?? state.inventory,
      equipped: s.equipped ?? state.equipped,
      chapterIndex: s.chapterIndex ?? 0,
    });
    return true;
  } catch (e) { return false; }
}

// Compute prestige stat bonuses from ranks
function prestigeStats() {
  const stats = { damage: 0, maxHp: 0, defense: 0, speed: 0, xpMult: 1, lootMult: 1, cdr: 0 };
  for (const u of PRESTIGE_UPGRADES) {
    const rank = state.prestigeRanks[u.id] || 0;
    if (!rank) continue;
    if (u.stat === "xpMult" || u.stat === "lootMult") stats[u.stat] += u.per * rank;
    else stats[u.stat] += u.per * rank;
  }
  return stats;
}

const game = new Game(state);
game.buffs = { strength: 0, burnHeal: 0 };
game.equipped = state.equipped;
game.artifactCd = 0;
game.prestige = prestigeStats();

// ---------------- screens ----------------
const screens = {
  net: $("#net-screen"),
  classSelect: $("#class-select"),
  story: $("#story-screen"),
  hud: $("#hud"),
  inventory: $("#inventory-screen"),
  questLog: $("#quest-screen"),
  bestiary: $("#bestiary-screen"),
  death: $("#death-screen"),
  victory: $("#victory-screen"),
  descent: $("#descent-screen"),
  dialogue: $("#dialogue-box"),
  toast: $("#toast"),
};

function show(id) { if (screens[id]) screens[id].style.display = "flex"; }
function hide(id) { if (screens[id]) screens[id].style.display = "none"; }
function hideAllUI() { ["classSelect", "story", "inventory", "questLog", "death", "victory"].forEach(hide); }

// ---------------- class select ----------------
function buildClassSelect() {
  const list = $("#class-cards");
  list.innerHTML = "";
  for (const [id, c] of Object.entries(CLASSES)) {
    const card = document.createElement("div");
    card.className = "card class-card";
    card.style.setProperty("--accent", c.color);
    card.innerHTML = `
      <div class="class-glyph" style="background:${c.color}"></div>
      <h3>${c.name}</h3>
      <p class="muted">${c.desc}</p>
      <div class="stats">
        <span>❤ ${c.hp}</span><span>⚔ ${c.damage}</span><span>🛡 ${c.defense}</span><span>👟 ${c.speed}</span>
      </div>
      <p class="ability"><b>${c.ability}</b> — ${c.abilityDesc}</p>
      <button class="btn primary">Solo — ${c.name}</button>
      <button class="btn net-btn">🌐 Online — ${c.name}</button>
    `;
    const soloBtn = card.querySelector(".primary");
    soloBtn && (soloBtn.onclick = () => chooseClass(id, "solo"));
    const netBtn = card.querySelector(".net-btn");
    netBtn && (netBtn.onclick = () => chooseClass(id, "host"));
    list.appendChild(card);
  }
}

function chooseClass(id, mode = "solo") {
  game.prestige = prestigeStats();
  game.initPlayer(id);
  loadGame();
  ensureDailyQuests();
  state.pendingClass = id;
  state.netMode = mode;
  if (mode === "host") {
    hide("classSelect");
    show("net");
    state.uiOpen = true;
    netHost();
  } else {
    startChapter(state.chapterIndex);
  }
}

// ---------------- netplay ----------------
let net = null;

function netStatus(msg, ok = false) {
  const el = $("#net-status");
  if (el) { el.textContent = msg; el.style.color = ok ? "var(--gold)" : "var(--muted)"; }
}

async function netHost() {
  netStatus("Connecting to relay server…");
  net = new Net(defaultServerUrl());
  try { await net.connect(); } catch { netStatus("✗ Cannot reach relay server. Start server/ (npm start) or set ?server=ws://host:port"); return; }
  
  // Create a party for this host
  if (state.playerId) {
    net.send({
      t: "party_create",
      name: state.playerName || `Player ${Math.floor(Math.random() * 1000)}`,
      partyName: `Party ${Math.floor(Math.random() * 1000)}`
    });
  }
  
  net.onMessage = m => {
    if (m.t === "hosted") {
      net.code = m.code;
      $("#net-code").textContent = m.code;
      netStatus(`Room created! Share code:`, true);
      beginHostGame();
    } else if (m.t === "peerJoined") {
      toast(`👥 ${m.name} joined your world!`);
    } else if (m.t === "peerLeft") {
      toast(`${m.name} left the world`);
    }
    // Party messages handled in separate handler
  };
  net.host();
}

function beginHostGame() {
  game.netMode = "host";
  game.netSendState = s => net.sendState(s);
  net.onMessage = m => {
    if (m.t === "input") game.applyRemoteInput(m.id, m.keys, m.aim);
    else if (m.t === "peerJoined") toast(`👥 ${m.name} joined your world!`);
    else if (m.t === "peerLeft") toast(`${m.name} left the world`);
  };
  hide("net");
  state.uiOpen = false;
  startChapter(state.chapterIndex);
}

async function netJoin() {
  const code = $("#join-code").value.trim().toUpperCase();
  if (!code) { netStatus("Enter a room code first"); return; }
  netStatus("Connecting to relay server…");
  net = new Net(defaultServerUrl());
  try { await net.connect(); } catch { netStatus("✗ Cannot reach relay server. Start server/ (npm start) or set ?server=ws://host:port"); return; }
  net.join(code, "Player 2");
  net.onMessage = m => {
    if (m.t === "joined") {
      net.code = m.code;
      netStatus(`Joined room ${m.code}! Waiting for host world…`, true);
      beginClientGame();
    } else if (m.t === "error") {
      netStatus(`✗ ${m.msg}`);
    } else if (m.t === "state") {
      if (!state.clientReady) { state.clientReady = true; hide("net"); state.uiOpen = false; }
      game.applySnapshot(m);
    } else if (m.t === "hostLeft") {
      toast("Host left the world");
    }
  };
}

function beginClientGame() {
  game.netMode = "client";
  game.netSendInput = (input) => net.sendInput(input.keys, input.aim);
  // client needs a minimal player/map shell to render snapshots
  game.initPlayer(state.pendingClass || "knight");
  const ch = getChapter(0);
  game.chapter = ch;
  game.map = { w: 0, h: 0, grid: new Uint8Array(0), theme: { ground: "#333", ground2: "#383838", wall: "#222" }, themeName: "void", props: [], spawn: [0, 0], bossArena: [0, 0] };
  state.clientReady = false;
  state.uiOpen = true; // stay on net screen until first snapshot
}

// ---------------- endless chapter generator ----------------
// Depth 1-3 = story chapters; depth 4+ = procedurally generated endless floors.
function getChapter(index) {
  if (index < CHAPTERS.length) return CHAPTERS[index];
  const depth = index + 1;
  const themeId = ENDLESS_THEME_CYCLE[(depth - 4) % ENDLESS_THEME_CYCLE.length];
  const bossId = ENDLESS_BOSS_CYCLE[(depth - 4) % ENDLESS_BOSS_CYCLE.length];
  const tier = Math.floor((depth - 4) / ENDLESS_BOSS_CYCLE.length); // boss cycle tier
  const w = 70, h = 70;
  const enemyPool = [
    { type: "slime", min: 1 }, { type: "zombie", min: 1 }, { type: "skeleton", min: 1 },
    { type: "imp", min: 2 }, { type: "wolf", min: 2 }, { type: "golem", min: 2 },
    { type: "wraith", min: 4 }, { type: "frostborn", min: 5 }, { type: "cinderbeast", min: 6 }, { type: "abomination", min: 7 },
  ].filter(e => depth >= e.min);
  const enemies = {};
  const count = Math.min(8 + Math.floor(depth / 2), 26);
  for (let i = 0; i < count; i++) {
    const pick = enemyPool[Math.floor(Math.random() * enemyPool.length)].type;
    enemies[pick] = (enemies[pick] || 0) + 1;
  }
  const bossNames = { warden: "Grumble", spiderqueen: "Araxa", lich: "Malzhar" };
  const suffixes = ["Reborn", "Eternal", "Ascendant", "Unbound", "Prime", "Omega"];
  const suffix = suffixes[tier % suffixes.length];
  const themeNames = { void: "the Hollow Void", frost: "the Frostbound Deep", ember: "the Cinder Wastes", cave: "the Sunless Warrens", abyss: "the Abyssal Rift", ash: "the Scorched Ruins", forest: "the Twisted Grove" };
  return {
    id: depth,
    endless: true,
    depth,
    title: `Depth ${depth} — ${themeNames[themeId][0].toUpperCase() + themeNames[themeId].slice(1)}`,
    intro: `The Ember's light pulls you deeper. Below waits ${themeNames[themeId]} — and something wearing the face of ${bossNames[bossId]}, grown ${suffix.toLowerCase()} in the dark. Its power swells with every depth you conquer. Descend, or turn back and forge your legend at the Ember Forge.`,
    quest: {
      name: `Descent ${depth}`,
      desc: `Purge ${themeNames[themeId]} and destroy ${bossNames[bossId]} the ${suffix}.`,
      kills: 6 + Math.min(depth, 20),
      boss: bossId,
      reward: { items: { health_pot: 2, crystal: 1 + Math.floor(depth / 5) }, xp: 200 + depth * 80 },
      onComplete: `${bossNames[bossId]} the ${suffix} dissolves into embers. The stairway to depth ${depth + 1} unfolds below. The descent never ends — and neither do you.`,
    },
    map: {
      w, h,
      theme: themeId,
      spawn: [Math.floor(w / 2), h - 12],
      enemies,
      bossArena: [Math.floor(w / 2), 16],
      bossGate: "none",
      props: { rocks: 60, crystals: 35, trees: themeId === "forest" ? 60 : 0 },
    },
  };
}

// ---------------- chapter / story flow ----------------
function startChapter(i) {
  state.chapterIndex = i;
  const ch = getChapter(i);
  game.depth = ch.depth ?? (i + 1);
  game.startChapter(ch);
  // offline: try to resume from last checkpoint for this class
  if (!game.multiplayer) game.loadCheckpointOrSpawn(ch);
  game.onKillCheckHooked = true;
  // hook kill check
  const origKill = game.killEnemy.bind(game);
  game.killEnemy = e => {
    origKill(e);
    game.onKillCheck();
    state.totalKills++;
    // bestiary discovery
    if (!state.bestiary[e.type]) {
      state.bestiary[e.type] = { kills: 0 };
      toast(`📖 Bestiary: ${ENEMY_TYPES[e.type].name} discovered!`);
    }
    state.bestiary[e.type].kills++;
    checkBestiaryRewards();
    bumpDaily("slayer");
    bumpDaily("kills");
    if (e.type === "golem") bumpDaily("golem");
    if (e.type === "wolf") bumpDaily("wolf");
    if (e.type === "wraith") bumpDaily("wraith");
    saveGame();
  };
  if (game.depth > state.bestDepth) { state.bestDepth = game.depth; saveGame(); }
  bumpDaily("depth", game.depth);
  showStory(ch);
}

function showStory(ch) {
  state.uiOpen = true;
  $("#story-title").textContent = ch.title;
  $("#story-text").textContent = ch.intro;
  $("#story-quest").innerHTML = `<b>New Quest — ${ch.quest.name}:</b> ${ch.quest.desc}`;
  show("story");
}

$("#story-continue").onclick = () => {
  hide("story");
  state.uiOpen = false;
};

// ---------------- death / victory ----------------
game.onEvent = ev => {
  switch (ev.type) {
    case "playerDeath": {
      state.uiOpen = true;
      show("death");
      break;
    }
    case "bossDefeated": {
      // bestiary: reveal the boss (event carries no id; use current quest boss)
      const qb = CHAPTERS[state.chapterIndex]?.quest?.boss ?? game.chapter?.quest?.boss;
      if (qb && !state.bestiary["boss_" + qb]) {
        state.bestiary["boss_" + qb] = { kills: 1 };
        toast(`📖 Bestiary: ${BOSSES[qb].name} revealed!`);
      } else if (qb) state.bestiary["boss_" + qb].kills++;
      bumpDaily("boss");
      saveGame();
      const ch = CHAPTERS[state.chapterIndex];
      setTimeout(() => {
        $("#dialogue-text").textContent = ch.quest.onComplete;
        show("dialogue");
        state.uiOpen = true;
        $("#dialogue-ok").onclick = () => {
          hide("dialogue");
          // quest rewards
          const r = ch.quest.reward;
          for (const [item, n] of Object.entries(r.items)) addInv(item, n);
          game.gainXp(r.xp);
          state.uiOpen = false;
          saveGame();
          if (state.chapterIndex + 1 < CHAPTERS.length) {
            startChapter(state.chapterIndex + 1);
          } else {
            // Story complete — offer the endless descent or prestige
            state.uiOpen = true;
            show("descent");
            refreshDescent();
          }
        };
      }, 900);
      break;
    }
    case "levelUp":
      toast(`⭐ Level Up! Level ${ev.level} — HP & damage increased`);
      bumpDaily("level", ev.level);
      break;
    case "legendaryDrop":
      toast(`✨ LEGENDARY DROP: ${ITEMS[ev.item].name}!`);
      break;
    case "phoenixRevive":
      toast(`🔥 The Phoenix Heart revives you!`);
      break;
    case "pickup":
      addInv(ev.item, ev.count);
      break;
    case "bossSpawn":
    case "bossFightStart":
      $("#bossbar").style.display = "block";
      break;
    case "bossPhase":
      toast(`🔥 The boss enters phase ${ev.phase}!`);
      break;
    case "ability":
      break;
    case "toggleMute":
      updateMuteBtn();
      break;
    case "revivedAtCheckpoint":
      toast("🔥 Revived at your campfire — the Ember remembers you.");
      break;
    case "revivedAtSpawn":
      toast("⚰️ You rise again at the outpost — this story never ends.");
      break;
    case "buffApplied":
      toast(`🍗 Buff: ${ev.name} — ${ev.desc}`);
      break;
    case "buffExpired":
      toast("🍗 Your food buff faded.");
      break;
  }
};

$("#death-retry").onclick = () => {
  hide("death");
  state.uiOpen = false;
  // infinite retry: first try reviving at your last campfire (checkpoint),
  // otherwise fall back to the chapter spawn.
  const revived = game.multiplayer ? false : game.reviveAtCheckpoint();
  if (!revived) {
    game.retryAtSpawn();
  }
  saveGame();
};
$("#death-menu").onclick = () => location.reload();

// ---------------- descent hub (endless + prestige) ----------------
function refreshDescent() {
  const nextDepth = state.chapterIndex + 2; // next chapter index+1, displayed as depth
  $("#descent-depth").textContent = `Deepest depth conquered: ${state.bestDepth}`;
  $("#descent-kills").textContent = `Total kills: ${state.totalKills}`;
  $("#descent-sigils").textContent = `🔥 Ember Sigils: ${state.sigils}`;
  $("#btn-descend").textContent = `Descend to Depth ${nextDepth} →`;
  // prestige upgrade list
  const list = $("#prestige-list");
  list.innerHTML = "";
  for (const u of PRESTIGE_UPGRADES) {
    const rank = state.prestigeRanks[u.id] || 0;
    const cost = prestigeCost(u, rank);
    const maxed = rank >= u.max;
    const row = document.createElement("div");
    row.className = "craft-row";
    row.innerHTML = `
      <div class="inv-icon" style="background:var(--gold)"></div>
      <div><div class="inv-name">${u.icon} ${u.name} <span style="color:var(--gold)">Rank ${rank}/${u.max}</span></div>
      <div class="muted small">${u.desc} — cost: ${cost} 🔥</div></div>
    `;
    const btn = document.createElement("button");
    btn.className = "btn tiny";
    btn.textContent = maxed ? "MAX" : "Upgrade";
    btn.disabled = maxed || state.sigils < cost;
    btn.onclick = () => {
      state.sigils -= cost;
      state.prestigeRanks[u.id] = rank + 1;
      game.prestige = prestigeStats();
      // re-apply maxHp immediately
      const p = game.player;
      const oldMax = p.maxHp;
      p.maxHp = p.maxHp + u.per * (u.stat === "maxHp" ? 1 : 0);
      p.hp += (p.maxHp - oldMax);
      saveGame();
      refreshDescent();
      toast(`${u.icon} ${u.name} → Rank ${rank + 1}!`);
    };
    row.appendChild(btn);
    list.appendChild(row);
  }
}

$("#btn-descend").onclick = () => {
  hide("descent");
  state.uiOpen = false;
  startChapter(state.chapterIndex + 1);
};
$("#btn-prestige-reset").onclick = () => {
  if (state.chapterIndex + 1 < CHAPTERS.length) return; // only after story
  const earned = 1 + Math.max(0, state.chapterIndex + 1 - CHAPTERS.length);
  state.sigils += earned;
  state.chapterIndex = 0;
  saveGame();
  hide("descent");
  state.uiOpen = false;
  toast(`🔥 +${earned} Ember Sigil! The descent resets — your legend does not.`);
  startChapter(0);
};
$("#descent-close").onclick = () => { hide("descent"); state.uiOpen = false; };
// P opens the hub any time after story completion
window.addEventListener("keydown", e => {
  if (e.code === "KeyP" && state.chapterIndex + 1 >= CHAPTERS.length && !state.uiOpen) {
    state.uiOpen = true;
    show("descent");
    refreshDescent();
  }
});

// ---------------- inventory ----------------
function addInv(item, count) {
  state.inventory[item] = (state.inventory[item] || 0) + count;
  refreshInventory();
  toast(`+${count} ${ITEMS[item].name}`);
}

function removeInv(item, count) {
  state.inventory[item] = (state.inventory[item] || 0) - count;
  if (state.inventory[item] <= 0) delete state.inventory[item];
  refreshInventory();
}

function refreshInventory() {
  const grid = $("#inv-grid");
  grid.innerHTML = "";
  for (const [id, count] of Object.entries(state.inventory)) {
    const item = ITEMS[id];
    const cell = document.createElement("div");
    cell.className = "inv-cell";
    cell.style.setProperty("--rc", RARITY_COLORS[item.rarity]);
    cell.innerHTML = `
      <div class="inv-icon" style="background:${item.color}"></div>
      <div class="inv-name">${item.name}</div>
      <div class="inv-count">×${count}</div>
      <div class="inv-rarity">${RARITY_NAMES[item.rarity]}</div>
    `;
    cell.title = item.desc;
    // equipment actions
    if (item.type === "weapon" || item.type === "armor" || item.type === "artifact") {
      const btn = document.createElement("button");
      btn.className = "btn tiny";
      btn.textContent = state.equipped[item.type] === id ? "Unequip" : "Equip";
      btn.onclick = () => {
        if (state.equipped[item.type] === id) state.equipped[item.type] = null;
        else state.equipped[item.type] = id;
        refreshInventory(); refreshEquipped();
      };
      cell.appendChild(btn);
    }
    if (item.type === "potion" || item.type === "food") {
      const btn = document.createElement("button");
      btn.className = "btn tiny";
      btn.textContent = "Use";
      btn.onclick = () => {
        if (game.useItemFromInv(id)) {
          toast(`Used ${item.name}`);
        } else {
          toast("Nothing left to use.");
        }
      };
      cell.appendChild(btn);
    }
    grid.appendChild(cell);
  }
  if (!Object.keys(state.inventory).length) grid.innerHTML = `<p class="muted">Empty. Slay monsters and gather loot!</p>`;
  refreshEquipped();
}

function refreshEquipped() {
  const eq = $("#equipped-slots");
  eq.innerHTML = "";
  for (const slot of ["weapon", "armor", "artifact"]) {
    const id = state.equipped[slot];
    const item = id ? ITEMS[id] : null;
    const div = document.createElement("div");
    div.className = "eq-slot";
    div.style.setProperty("--rc", item ? RARITY_COLORS[item.rarity] : "#333");
    div.innerHTML = item
      ? `<div class="inv-icon" style="background:${item.color}"></div><div class="inv-name">${item.name}</div><div class="inv-rarity">${slot}</div>`
      : `<div class="inv-icon empty"></div><div class="inv-name muted">${slot}</div>`;
    eq.appendChild(div);
  }
  // stat panel
  $("#pstats").innerHTML = `
    ❤ HP <b>${Math.ceil(game.player?.hp ?? 0)}/${game.player?.maxHp ?? 0}</b> &nbsp;
    ⚔ Dmg <b>${game.damage}</b> &nbsp; 🛡 Def <b>${game.defenseTotal}</b> &nbsp;
    ⭐ Lv <b>${game.player?.level ?? 1}</b> (${game.player?.xp ?? 0}/${game.player?.xpNext ?? 60})
    ${game.food ? `<br>🍗 ${ITEMS[game.food.id]?.name ?? "Food"} buff ${Math.ceil(game.food.remaining/60)}s` : ""}
  `;
}

// ---------------- crafting ----------------
function refreshCrafting() {
  const list = $("#craft-list");
  list.innerHTML = "";
  for (const r of RECIPES) {
    const out = ITEMS[r.out];
    const can = Object.entries(r.cost).every(([it, n]) => (state.inventory[it] || 0) >= n);
    const row = document.createElement("div");
    row.className = "craft-row" + (can ? "" : " disabled");
    row.style.setProperty("--rc", RARITY_COLORS[out.rarity]);
    const costStr = Object.entries(r.cost).map(([it, n]) => {
      const have = state.inventory[it] || 0;
      return `<span class="${have >= n ? "" : "lack"}">${ITEMS[it].name} ×${n} (${have})</span>`;
    }).join(", ");
    row.innerHTML = `
      <div class="inv-icon" style="background:${out.color}"></div>
      <div><div class="inv-name">${out.name}${r.count > 1 ? ` ×${r.count}` : ""}</div><div class="muted small">${costStr}</div></div>
    `;
    const btn = document.createElement("button");
    btn.className = "btn tiny";
    btn.textContent = "Craft";
    btn.disabled = !can;
    btn.onclick = () => {
      for (const [it, n] of Object.entries(r.cost)) removeInv(it, n);
      addInv(r.out, r.count);
      toast(`⚒ Crafted ${out.name}!`);
    };
    row.appendChild(btn);
    list.appendChild(row);
  }
}

// ---------------- quest log ----------------
function refreshQuests() {
  const ch = CHAPTERS[state.chapterIndex];
  const q = ch.quest;
  $("#quest-current").innerHTML = `
    <div class="card">
      <h3>📜 ${q.name}</h3>
      <p>${q.desc}</p>
      ${q.kills ? `<p class="muted">Progress: ${game.questKills}/${q.kills} slain</p>` : `<p class="muted">Boss: ${q.boss.toUpperCase()} — find the arena at the top of the map.</p>`}
      <p class="muted small">Chapter ${ch.id}: ${ch.title}</p>
    </div>
  `;
  refreshDailyUI();
}

function refreshDailyUI() {
  const el = $("#daily-list");
  if (!el) return;
  ensureDailyQuests();
  el.innerHTML = "";
  $("#daily-date").textContent = `Today (${state.dailyDate}) — same quests for everyone, worldwide`;
  for (const q of state.dailyQuests) {
    const prog = Math.min(state.dailyProgress[q.id] || 0, q.n);
    const done = prog >= q.n;
    const row = document.createElement("div");
    row.className = "craft-row";
    row.style.borderLeftColor = done ? "var(--gold)" : "var(--border)";
    row.innerHTML = `
      <div class="inv-icon" style="background:${done ? "var(--gold)" : "#2a2a34"}"></div>
      <div><div class="inv-name">${done ? "✅" : "📅"} ${q.desc}</div>
      <div class="muted small">Progress: ${prog}/${q.n} — reward: ${q.reward} 🔥</div></div>
    `;
    el.appendChild(row);
  }
}
window.refreshDailyUI = refreshDailyUI;

// ---------------- bestiary ----------------
function refreshBestiary() {
  const grid = $("#bestiary-grid");
  grid.innerHTML = "";
  const discovered = Object.keys(state.bestiary).length;
  const total = Object.keys(ENEMY_TYPES).length;
  $("#bestiary-progress").textContent = `Discovered ${discovered}/${total} creatures — Total kills: ${state.totalKills}`;
  // reward milestones
  const claimed = state.bestiaryRewardsClaimed || 0;
  const milestoneDiv = $("#bestiary-rewards");
  milestoneDiv.innerHTML = "";
  for (const r of BESTIARY_REWARDS) {
    const done = r.threshold <= claimed;
    const totalAll = Object.keys(ENEMY_TYPES).length + 3;
    const row = document.createElement("div");
    row.className = "craft-row";
    row.style.borderLeftColor = done ? "var(--gold)" : "var(--border)";
    row.innerHTML = `
      <div class="inv-icon" style="background:${done ? "var(--gold)" : "#2a2a34"}"></div>
      <div><div class="inv-name">${done ? "🏆" : "🔒"} ${r.msg}</div>
      <div class="muted small">Discover ${r.threshold} creatures → +${r.xp} XP + items</div></div>
    `;
    milestoneDiv.appendChild(row);
  }

  for (const [id, t] of Object.entries(ENEMY_TYPES)) {
    const known = state.bestiary[id];
    const cell = document.createElement("div");
    cell.className = "inv-cell";
    cell.style.setProperty("--rc", known ? t.color : "#333");
    const loot = LOOT_TABLE[id] || {};
    const lootStr = known
      ? Object.keys(loot).map(k => ITEMS[k]?.name ?? k).join(", ") || "nothing"
      : "???";
    const deepLoot = DEEP_LOOT.length && Object.keys(loot).length === 0 && known ? "" : "";
    cell.innerHTML = `
      <div class="inv-icon" style="background:${known ? t.color : "#2a2a34"}"></div>
      <div class="inv-name">${known ? t.name : "???"}</div>
      ${known ? `
        <div class="inv-rarity">❤ ${t.hp} · ⚔ ${t.dmg} · ${t.ranged ? "🎯 ranged" : "👊 melee"}</div>
        <div class="muted small">Kills: ${known.kills}</div>
        <div class="muted small">Drops: ${lootStr}</div>`
      : `<div class="muted small">Undiscovered</div>`}
    `;
    grid.appendChild(cell);
  }

  // boss section
  const bossGrid = $("#bestiary-bosses");
  bossGrid.innerHTML = "";
  for (const [id, b] of Object.entries(BOSSES)) {
    if (id === "spiderling") continue;
    const known = state.bestiary["boss_" + id];
    const cell = document.createElement("div");
    cell.className = "inv-cell";
    cell.style.setProperty("--rc", known ? b.color : "#333");
    cell.innerHTML = `
      <div class="inv-icon" style="background:${known ? b.color : "#2a2a34"}"></div>
      <div class="inv-name">${known ? b.name : "???"}</div>
      ${known ? `<div class="inv-rarity">❤ ${b.hp} · ⚔ ${b.dmg} · ${b.phases} phases</div>` : `<div class="muted small">Defeat one to reveal</div>`}
    `;
    bossGrid.appendChild(cell);
  }
}

// ---------------- bestiary rewards ----------------
function discoveredCount() {
  return Object.keys(state.bestiary).filter(k => !k.startsWith("boss_")).length +
         Object.keys(state.bestiary).filter(k => k.startsWith("boss_")).length;
}

function checkBestiaryRewards() {
  const count = discoveredCount();
  const claimed = state.bestiaryRewardsClaimed || 0;
  for (const r of BESTIARY_REWARDS) {
    if (count >= r.threshold && r.threshold > claimed) {
      state.bestiaryRewardsClaimed = r.threshold;
      game.gainXp(r.xp);
      for (const [item, n] of Object.entries(r.items)) addInv(item, n);
      toast(`🏆 Bestiary ${r.threshold}/${Object.keys(ENEMY_TYPES).length + 3}: ${r.msg} (+${r.xp} XP)`);
      saveGame();
    }
  }
}

// ---------------- toast ----------------
let toastT;
let toastQueue = [];
let isProcessingToast = false;

function toast(msg, duration = 2500) {
  // Add to queue
  toastQueue.push({ msg, duration, timestamp: Date.now() });
  
  // Process queue if not already processing
  if (!isProcessingToast) {
    processToastQueue();
  }
}

function processToastQueue() {
  if (toastQueue.length === 0) {
    isProcessingToast = false;
    return;
  }
  
  isProcessingToast = true;
  const { msg, duration } = toastQueue.shift();
  
  const el = screens.toast;
  if (!el) {
    processToastQueue();
    return;
  }
  
  el.textContent = msg;
  el.style.display = "block";
  el.style.opacity = '1';
  el.style.transition = 'opacity 0.3s ease';
  
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.display = "none";
      processToastQueue();
    }, 300);
  }, duration);
}

// Quick action: show notifications for important events
function showNotification(title, message, type = 'info') {
  // Create a notification element
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--panel);
    border: 2px solid;
    border-color: ${type === 'success' ? 'var(--gold)' : type === 'error' ? '#f05050' : 'var(--border)'};
    color: var(--text);
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 70;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    animation: notifSlideIn 0.3s ease;
  `;
  
  notif.innerHTML = `
    <div style="font-size:18px;margin-bottom:4px">${type === 'success' ? '✅' : type === 'error' ? '❌' : '📢'} ${title}</div>
    <div style="color:var(--muted);font-weight:normal;font-size:12px">${message}</div>
  `;
  
  document.body.appendChild(notif);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notif.style.transform = 'translateX(-50%) translateY(-20px)';
    notif.style.opacity = '0';
    notif.style.transition = 'all 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, 5000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes notifSlideIn {
    from {
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// ---------------- HUD ----------------
function updateHUD() {
  if (!game.player || !game.map) return;
  const p = game.player;
  $("#hp-fill").style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
  $("#hp-text").textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`;
  $("#xp-fill").style.width = `${p.xp / p.xpNext * 100}%`;
  $("#ch-title").textContent = state.chapterIndex < CHAPTERS.length
    ? CHAPTERS[state.chapterIndex].title
    : `Depth ${state.chapterIndex + 1} — The Endless Descent`;
  const h = Math.floor(game.timeOfDay * 24), mn = Math.floor((game.timeOfDay * 24 % 1) * 60);
  const icon = h >= 6 && h < 19 ? "☀" : "🌙";
  $("#clock").textContent = `${icon} Day ${game.dayNum} — ${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
  // boss bar
  if (game.boss?.active) {
    $("#bossbar").style.display = "block";
    $("#boss-fill").style.width = `${Math.max(0, game.boss.hp / game.boss.maxHp * 100)}%`;
    $("#boss-name").textContent = game.boss.name;
  } else {
    $("#bossbar").style.display = "none";
  }
  // cooldown hint
  const acd = p.abilityCd || 0;
  $("#ability-cd").textContent = acd > 0 ? `Ability: ${Math.ceil(acd / 60)}s` : "Ability: READY (F)";
  requestAnimationFrame(updateHUD);
}

// ability key
window.addEventListener("keydown", e => { if (e.code === "KeyF") game.useAbility(); });

// ---------------- UI toggles ----------------
function toggleScreen(name, buildFn) {
  return () => {
    const open = screens[name].style.display === "flex";
    ["inventory", "questLog", "bestiary"].forEach(hide);
    if (!open) {
      buildFn();
      show(name);
      state.uiOpen = true;
    } else {
      state.uiOpen = false;
    }
  };
}

$("#btn-inv").onclick = toggleScreen("inventory", () => { refreshInventory(); refreshCrafting(); });
$("#btn-quest").onclick = toggleScreen("questLog", refreshQuests);
$("#btn-bestiary").onclick = toggleScreen("bestiary", refreshBestiary);

let muteOn = false;
function updateMuteBtn() {
  const b = $("#btn-mute");
  if (!b) return;
  b.textContent = muteOn ? "🔇 Muted" : "🔊 Sound";
  b.style.color = muteOn ? "var(--gold)" : "";
}
$("#btn-mute").onclick = () => {
  muteOn = !muteOn;
  game.muted = muteOn;
  updateMuteBtn();
};
$("#bestiary-close").onclick = () => { hide("bestiary"); state.uiOpen = false; };
$("#dialogue-ok")?.addEventListener("click", () => { state.uiOpen = false; });
$("#inv-close").onclick = () => { hide("inventory"); state.uiOpen = false; };
$("#quest-close").onclick = () => { hide("questLog"); state.uiOpen = false; };

// ---------------- mobile touch controls ----------------
let touchControls = {
  left: false,
  right: false,
  up: false,
  down: false,
  attack: false,
  ability: false,
  useItem: false,
  useArtifact: false,
};

function setupMobileControls() {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  
  // Touch areas (invisible overlay zones)
  const touchZone = document.createElement('div');
  touchZone.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40%;
    z-index: 20;
    pointer-events: auto;
    display: none;
  `;
  touchZone.id = 'touch-zone';
  document.body.appendChild(touchZone);
  
  // Virtual joystick area (left side)
  const joystickZone = document.createElement('div');
  joystickZone.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.2);
  `;
  joystickZone.id = 'joystick-zone';
  touchZone.appendChild(joystickZone);
  
  // Attack button (right side)
  const attackBtn = document.createElement('button');
  attackBtn.style.cssText = `
    position: absolute;
    bottom: 40px;
    right: 40px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255,80,80,0.3);
    border: 3px solid rgba(255,80,80,0.5);
    color: white;
    font-size: 14px;
    font-weight: bold;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  attackBtn.textContent = 'ATTACK';
  attackBtn.id = 'attack-btn';
  touchZone.appendChild(attackBtn);
  
  // Ability button
  const abilityBtn = document.createElement('button');
  abilityBtn.style.cssText = `
    position: absolute;
    bottom: 40px;
    right: 140px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(255,208,64,0.3);
    border: 3px solid rgba(255,208,64,0.5);
    color: white;
    font-size: 12px;
    font-weight: bold;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  abilityBtn.textContent = 'F\nABILITY';
  abilityBtn.id = 'ability-btn';
  abilityBtn.onclick = () => { game.useAbility(); sound.play('ability'); };
  touchZone.appendChild(abilityBtn);
  
  // Show touch controls on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    touchZone.style.display = 'block';
  }
  
  // Joystick handling
  let joystickActive = false;
  let joystickCenter = { x: 0, y: 0 };
  let joystickTouch = null;
  
  joystickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (joystickActive) return;
    
    const touch = e.changedTouches[0];
    joystickTouch = touch.identifier;
    joystickActive = true;
    
    const rect = joystickZone.getBoundingClientRect();
    joystickCenter.x = rect.left + rect.width / 2;
    joystickCenter.y = rect.top + rect.height / 2;
    
    updateJoystick(touch.clientX, touch.clientY);
  });
  
  joystickZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouch) {
        updateJoystick(touch.clientX, touch.clientY);
      }
    }
  });
  
  joystickZone.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouch) {
        joystickActive = false;
        joystickTouch = null;
        touchControls.left = false;
        touchControls.right = false;
        touchControls.up = false;
        touchControls.down = false;
        // Reset joystick visual
        const js = document.getElementById('joystick-zone');
        js.style.transform = '';
        js.style.borderColor = 'rgba(255,255,255,0.2)';
      }
    }
  });
  
  function updateJoystick(touchX, touchY) {
    const dx = touchX - joystickCenter.x;
    const dy = touchY - joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 60;
    
    if (dist > maxDist) {
      // Clamp to max distance
      const scale = maxDist / dist;
      // Visual feedback
      const js = document.getElementById('joystick-zone');
      js.style.transform = `translate(${dx * scale * 0.3}px, ${dy * scale * 0.3}px)`;
      js.style.borderColor = 'rgba(255,208,64,0.5)';
    }
    
    // Determine direction
    if (dist > 15) {
      const angle = Math.atan2(dy, dx);
      const normDx = dx / dist;
      const normDy = dy / dist;
      
      touchControls.left = normDx < -0.3;
      touchControls.right = normDx > 0.3;
      touchControls.up = normDy < -0.3;
      touchControls.down = normDy > 0.3;
      
      // Sync to game keys for movement
      game.keys = {
        ...game.keys,
        KeyW: touchControls.up,
        KeyS: touchControls.down,
        KeyA: touchControls.left,
        KeyD: touchControls.right,
      };
    } else {
      touchControls.left = false;
      touchControls.right = false;
      touchControls.up = false;
      touchControls.down = false;
    }
  }
  
  // Attack button touch
  attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchControls.attack = true;
    game.mouse.down = true;
    attackBtn.style.background = 'rgba(255,80,80,0.5)';
  });
  
  attackBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchControls.attack = false;
    game.mouse.down = false;
    attackBtn.style.background = 'rgba(255,80,80,0.3)';
  });
  
  // Item use button
  const itemBtn = document.createElement('button');
  itemBtn.style.cssText = `
    position: absolute;
    bottom: 130px;
    right: 40px;
    width: 50px;
    height: 50px;
    border-radius: 8px;
    background: rgba(100,200,255,0.3);
    border: 2px solid rgba(100,200,255,0.5);
    color: white;
    font-size: 10px;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  itemBtn.textContent = 'Q\nPOTION';
  itemBtn.onclick = () => { game.usePotion('health_pot'); };
  touchZone.appendChild(itemBtn);
  
  // Artifact button
  const artifactBtn = document.createElement('button');
  artifactBtn.style.cssText = `
    position: absolute;
    bottom: 130px;
    right: 110px;
    width: 50px;
    height: 50px;
    border-radius: 8px;
    background: rgba(200,150,255,0.3);
    border: 2px solid rgba(200,150,255,0.5);
    color: white;
    font-size: 10px;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  artifactBtn.textContent = 'R\nARTIFACT';
  artifactBtn.onclick = () => { game.useArtifact(); };
  touchZone.appendChild(artifactBtn);
}

// Gyroscope handling for mobile
let gyroRotation = 0;
function handleOrientation(event) {
  if (event.gamma !== null) {
    // Gamma: left/right tilt (-90 to 90)
    gyroRotation = event.gamma * 0.01; // Convert to radians-ish
  }
}

// ---------------- keyboard hints overlay ----------------
function setupKeyboardHints() {
  const hints = document.createElement('div');
  hints.id = 'keyboard-hints';
  hints.style.cssText = `
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.7);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 16px;
    z-index: 25;
    font-size: 11px;
    color: var(--muted);
    display: flex;
    gap: 16px;
    align-items: center;
    pointer-events: none;
    opacity: 0.8;
    transition: opacity 0.3s;
  `;
  
  hints.innerHTML = `
    <span class="hint"><kbd>W A S D</kbd> Move</span>
    <span class="hint"><kbd>F</kbd> Ability</span>
    <span class="hint"><kbd>Left Click</kbd> Attack</span>
    <span class="hint"><kbd>E</kbd> Inventory</span>
    <span class="hint"><kbd>Q</kbd> Potion</span>
    <span class="hint"><kbd>R</kbd> Artifact</span>
  `;
  
  document.body.appendChild(hints);
  
  // Add CSS for kbd elements
  const kbdStyle = document.createElement('style');
  kbdStyle.textContent = `
    #keyboard-hints kbd {
      background: var(--panel2);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 2px 6px;
      font-family: inherit;
      font-size: 10px;
      color: var(--text);
    }
    #keyboard-hints .hint {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    @media (max-width: 768px) {
      #keyboard-hints {
        display: none;
      }
    }
  `;
  document.head.appendChild(kbdStyle);
}

// ---------------- help tooltip ----------------
function setupHelpTooltip() {
  let tooltipTimeout;
  let isTooltipVisible = false;
  
  const tooltip = document.createElement('div');
  tooltip.id = 'help-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--panel);
    border: 1px solid var(--gold);
    border-radius: 8px;
    padding: 12px 20px;
    z-index: 55;
    font-size: 12px;
    color: var(--text);
    max-width: 400px;
    text-align: center;
    display: none;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;
  
  document.body.appendChild(tooltip);
  
  // Show help on first play
  window.addEventListener('load', () => {
    setTimeout(() => {
      showHelpTooltip('🎮 Welcome to EMBERFALL!\nUse WASD to move, click to attack.\nSurvive, loot, and bring back the dawn!\n\nPress H for more controls.', 8000);
    }, 1000);
  });
  
  // Keyboard shortcut hints
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyH':
        showHelpTooltip('📖 CONTROLS & TIPS\n\n🎮 Movement: WASD / Arrow keys\n⚔️ Attack: Left mouse click\n🔥 Ability: F key\n🎒 Inventory: E key\n🧪 Potion: Q key\n💎 Artifact: R key\n🔥 Dash: G key (field skill)\n🏕️ Campfire: H key (set waypoint)\n🔇 Mute: M key\n\n💡 Tips:\n• Light campfires to set waypoints\n• Craft gear before descending\n• Food gives damage/heal buffs\n• Fire weapons burn enemies\n• Bosses get stronger in phases', 12000);
        break;
      case 'Escape':
        hideHelpTooltip();
        break;
    }
  });
  
  function showHelpTooltip(msg, duration = 5000) {
    tooltip.innerHTML = msg.replace(/\n/g, '<br>');
    tooltip.style.display = 'block';
    clearTimeout(tooltipTimeout);
    
    // Fade in
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.3s';
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });
    
    tooltipTimeout = setTimeout(() => {
      hideHelpTooltip();
    }, duration);
  }
  
  function hideHelpTooltip() {
    clearTimeout(tooltipTimeout);
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      tooltip.style.display = 'none';
    }, 300);
  }
  
  window.showHelpTooltip = showHelpTooltip;
  window.hideHelpTooltip = hideHelpTooltip;
}

// ---------------- save indicator ----------------
function setupSaveIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'save-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 20;
    color: var(--gold);
    font-size: 11px;
    opacity: 0;
    transition: opacity 0.5s;
    pointer-events: none;
  `;
  indicator.textContent = '💾 Auto-saving...';
  document.body.appendChild(indicator);
}

// Call setupSaveIndicator in boot
setupSaveIndicator();
  const notifications = state.achievements?.getNotifications() || [];
  if (!notifications.length) return;
  
  for (const notif of notifications) {
    // Show achievement toast
    toast(`🏆 ${notif.icon} ${notif.name}: ${notif.description}`);
  }
  
  state.achievements.clearNotifications();
  
  // Also show in achievement panel if open
  if (screens.achievement && screens.achievement.style.display === 'flex') {
    refreshAchievements();
  }
}

// ---------------- class editor ----------------
let selectedClass = null;
let characterPreviewCanvas = null;
let characterPreviewCtx = null;

function setupClassEditor() {
  // Set up character preview canvas
  characterPreviewCanvas = document.getElementById('character-preview');
  characterPreviewCtx = characterPreviewCanvas?.getContext('2d');
  
  // Set up customization selectors
  setupSkinSelector();
  setupTrailSelector();
  setupAuraSelector();
  
  // Hide character editor initially
  const editor = document.querySelector('.character-editor');
  if (editor) editor.style.display = 'none';
}

function setupSkinSelector() {
  const container = document.getElementById('skin-selector');
  if (!container) return;
  
  container.innerHTML = '';
  const cosmetics = window.getCosmetics?.() || { skins: [] };
  
  for (const skin of cosmetics.skins || []) {
    const btn = document.createElement('button');
    btn.className = 'skin-option';
    btn.style.cssText = `
      width: 60px; height: 60px; margin: 4px; padding: 4px;
      background: ${skin.color || '#333'}; border: 2px solid ${skin.equipped ? 'var(--gold)' : 'var(--border)'};
      cursor: pointer; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: all 0.2s;
    `;
    btn.innerHTML = `
      <div style="width:24px;height:24px;border-radius:50%;background:${skin.color || '#333'};opacity:0.8"></div>
      <div style="font-size:10px;margin-top:4px;color:var(--text);text-align:center">${skin.name}</div>
    `;
    btn.title = skin.description;
    btn.onclick = () => selectSkin(skin.id);
    container.appendChild(btn);
  }
}

function setupTrailSelector() {
  const container = document.getElementById('trail-selector');
  if (!container) return;
  
  container.innerHTML = '';
  const cosmetics = window.getCosmetics?.() || { trails: [] };
  
  for (const trail of cosmetics.trails || []) {
    const btn = document.createElement('button');
    btn.className = 'trail-option';
    btn.style.cssText = `
      width: 60px; height: 60px; margin: 4px; padding: 4px;
      background: ${trail.color || '#2a2a34'}; border: 2px solid ${trail.equipped ? 'var(--gold)' : 'var(--border)'};
      cursor: pointer; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: all 0.2s;
    `;
    btn.innerHTML = `
      <div style="font-size:24px">${trail.icon || '🌟'}</div>
      <div style="font-size:10px;margin-top:4px;color:var(--text);text-align:center">${trail.name}</div>
    `;
    btn.title = trail.description;
    btn.onclick = () => selectTrail(trail.id);
    container.appendChild(btn);
  }
}

function setupAuraSelector() {
  const container = document.getElementById('aura-selector');
  if (!container) return;
  
  container.innerHTML = '';
  const cosmetics = window.getCosmetics?.() || { auras: [] };
  
  for (const aura of cosmetics.auras || []) {
    const btn = document.createElement('button');
    btn.className = 'aura-option';
    btn.style.cssText = `
      width: 60px; height: 60px; margin: 4px; padding: 4px;
      background: ${aura.color || '#2a2a34'}; border: 2px solid ${aura.equipped ? 'var(--gold)' : 'var(--border)'};
      cursor: pointer; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: all 0.2s;
    `;
    btn.innerHTML = `
      <div style="font-size:24px">${aura.icon || '💫'}</div>
      <div style="font-size:10px;margin-top:4px;color:var(--text);text-align:center">${aura.name}</div>
    `;
    btn.title = aura.description;
    btn.onclick = () => selectAura(aura.id);
    container.appendChild(btn);
  }
}

function selectSkin(skinId) {
  if (window.setSkin) window.setSkin(skinId);
  updateCharacterPreview();
  setupSkinSelector(); // Refresh to show selection
}

function selectTrail(trailId) {
  if (window.setTrail) window.setTrail(trailId);
  setupTrailSelector(); // Refresh to show selection
}

function selectAura(auraId) {
  if (window.setAura) window.setAura(auraId);
  setupAuraSelector(); // Refresh to show selection
}

function updateCharacterPreview() {
  if (!characterPreviewCanvas || !characterPreviewCtx) return;
  
  const ctx = characterPreviewCtx;
  const canvas = characterPreviewCanvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw character
  const x = canvas.width / 2;
  const y = canvas.height / 2 + 20;
  const bob = Math.sin(Date.now() / 200) * 3;
  
  // Get current cosmetics
  const skin = window.getSkin?.() || 'default';
  const trail = window.getTrail?.() || 'none';
  const aura = window.getAura?.() || 'none';
  
  // Draw aura
  if (aura !== 'none') {
    const auraColor = getAuraColor(aura);
    ctx.strokeStyle = auraColor + '60';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + bob, 35 + Math.sin(Date.now() / 300) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Draw character body with skin color
  const skinColor = getSkinColor(skin, selectedClass?.color || '#4a6fd4');
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 15 + bob, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(x, y + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Hair
  ctx.fillStyle = darkenColor(skinColor, 0.6);
  ctx.beginPath();
  ctx.arc(x, y - 3 + bob, 10, Math.PI, 2 * Math.PI);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(x - 3, y - 1 + bob, 2, 2);
  ctx.fillRect(x + 2, y - 1 + bob, 2, 2);
  
  // Trail effect
  if (trail !== 'none') {
    const trailColor = getTrailColor(trail, Date.now() / 100);
    ctx.strokeStyle = trailColor + '80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 15 + bob);
    for (let i = 1; i <= 5; i++) {
      const t = Date.now() / 100 + i * 0.2;
      const tx = x - Math.sin(t) * i * 3;
      const ty = y + 15 + bob + i * 4;
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();
  }
  
  // Weapon placeholder
  if (selectedClass) {
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x + 8, y - 5 + bob, 12, 4);
  }
}

function getAuraColor(auraId) {
  const colors = {
    none: 'transparent',
    knight_aura: '#4a6fd4',
    ranger_aura: '#3fae5a',
    pyromancer_aura: '#e07030',
    champion: '#ffd040',
    legendary: 'rainbow',
  };
  return colors[auraId] || '#ffd040';
}

function getSkinColor(skinId, baseColor) {
  const colors = {
    default: baseColor,
    dark: '#2a2a3a',
    light: '#e0e0f0',
    crimson: '#c03030',
    sapphire: '#4a6fd4',
    emerald: '#3fae5a',
    shadowfire: '#8040a0',
    dawn: '#f0c040',
    void: '#2a2a4a',
  };
  return colors[skinId] || baseColor;
}

function getTrailColor(trailId, frame) {
  const colors = {
    none: null,
    ember: '#f06030',
    frost: '#80c0f0',
    shadow: '#605080',
    gold: '#ffd040',
    rainbow: `hsl(${frame % 360}, 100%, 60%)`,
  };
  return colors[trailId] || null;
}

function darkenColor(color, factor) {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  }
  return color;
}

// Show character editor when class is selected
function showClassEditor(clsId) {
  selectedClass = CLASSES[clsId];
  
  const editor = document.querySelector('.character-editor');
  const cards = document.getElementById('class-cards');
  
  if (editor && cards) {
    editor.style.display = 'block';
    cards.style.display = 'none';
    
    // Update header
    const header = document.querySelector('.editor-header h3');
    if (header) header.textContent = `Customize ${selectedClass.name}`;
    
    // Refresh customization options
    setupSkinSelector();
    setupTrailSelector();
    setupAuraSelector();
    
    // Start preview animation
    function animatePreview() {
      updateCharacterPreview();
      requestAnimationFrame(animatePreview);
    }
    animatePreview();
  }
}

// Override class card onclick to show editor
function buildClassSelect() {
  const list = document.getElementById('class-cards');
  if (!list) return;
  
  list.innerHTML = '';
  
  for (const [id, c] of Object.entries(CLASSES)) {
    const card = document.createElement('div');
    card.className = 'card class-card';
    card.style.setProperty('--accent', c.color);
    card.innerHTML = `
      <div class="class-glyph" style="background:${c.color}"></div>
      <h3>${c.name}</h3>
      <p class="muted">${c.desc}</p>
      <div class="stats">
        <span>❤ ${c.hp}</span><span>⚔ ${c.damage}</span><span>🛡 ${c.defense}</span><span>👟 ${c.speed}</span>
      </div>
      <p class="ability"><b>${c.ability}</b> — ${c.abilityDesc}</p>
      <button class="btn primary">Customize ${c.name} →</button>
    `;
    card.querySelector('.primary').onclick = () => showClassEditor(id);
    list.appendChild(card);
  }
}

// Start game with selected class and cosmetics
function startSelectedGame() {
  if (!selectedClass) return;
  
  // Get selected cosmetics
  const skin = window.getSkin?.() || 'default';
  const trail = window.getTrail?.() || 'none';
  const aura = window.getAura?.() || 'none';
  
  console.log('Starting game with:', {
    class: selectedClass.name,
    skin,
    trail,
    aura
  });
  
  // Hide editor and start game
  const editor = document.querySelector('.character-editor');
  if (editor) editor.style.display = 'none';
  
  hide('class-select');
  
  // Initialize game with selected class
  state.pendingClass = selectedClass.cls || Object.keys(CLASSES).find(k => CLASSES[k].name === selectedClass.name);
  
  if (!state.pendingClass) {
    state.pendingClass = 'knight'; // fallback
  }
  
  // Start chapter
  startChapter(state.chapterIndex);
}

// ---------------- party system ----------------
let currentParty = null;

function setupPartyUI() {
  // Party panel (add to net screen or create new party screen)
  const partyPanel = document.createElement('div');
  partyPanel.id = 'party-panel';
  partyPanel.style.cssText = `
    position: fixed;
    top: 80px;
    right: 12px;
    width: 280px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    z-index: 15;
    display: none;
    font-size: 12px;
  `;
  
  partyPanel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0;color:var(--gold);font-size:14px">👥 Party</h3>
      <button class="btn tiny" id="party-close" style="padding:2px 6px">✕</button>
    </div>
    <div id="party-info" style="color:var(--muted);margin-bottom:8px">
      Not in a party
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn tiny" id="party-invite" style="flex:1">Invite Friends</button>
      <button class="btn tiny" id="party-leave" style="flex:1">Leave</button>
    </div>
    <div id="party-members" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"></div>
  `;
  
  document.body.appendChild(partyPanel);
  
  // Party list button in HUD
  const partyBtn = document.createElement('button');
  partyBtn.className = 'btn tiny';
  partyBtn.id = 'btn-party';
  partyBtn.textContent = '👥 Party';
  partyBtn.onclick = togglePartyPanel;
  document.getElementById('hud-btns')?.appendChild(partyBtn);
  
  // Event handlers
  document.getElementById('party-close')?.addEventListener('click', () => {
    hide('party-panel');
  });
  
  document.getElementById('party-leave')?.addEventListener('click', () => {
    if (net && state.partyId) {
      net.send({ t: 'party_leave' });
    }
  });
  
  document.getElementById('party-invite')?.addEventListener('click', () => {
    toast('📋 Party ID: ' + (state.partyId || 'None'));
  });
}

function togglePartyPanel() {
  const panel = document.getElementById('party-panel');
  if (!panel) return;
  
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  
  if (!isOpen) {
    updatePartyUI();
  }
}

function updatePartyUI() {
  const info = document.getElementById('party-info');
  const members = document.getElementById('party-members');
  
  if (!info || !members) return;
  
  if (currentParty) {
    info.innerHTML = `
      <div style="color:var(--gold);font-weight:bold">${currentParty.name}</div>
      <div style="color:var(--muted);font-size:11px">ID: ${currentParty.id} · Leader: ${currentParty.leaderName}</div>
    `;
    
    members.innerHTML = currentParty.members.map(m => `
      <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
        <div style="width:8px;height:8px;border-radius:50%;background:${m.id === state.playerId ? 'var(--gold)' : 'var(--border)'}"></div>
        <span>${m.name} ${m.id === state.playerId ? '(You)' : ''}${m.id === currentParty.leader ? ' 👑' : ''}</span>
      </div>
    `).join('');
  } else {
    info.innerHTML = '<div style="color:var(--muted)">Not in a party</div>';
    members.innerHTML = '';
  }
}

// Party network handlers
net?.onMessage = (m) => {
  // ... existing handlers ...
  
  if (m.t === 'party_created') {
    state.partyId = m.partyId;
    currentParty = m.party;
    currentParty.leaderName = m.leaderName || 'You';
    show('party-panel');
    updatePartyUI();
    toast(`✅ Party created: ${m.party.name}`);
  }
  
  if (m.t === 'party_joined') {
    state.partyId = m.partyId;
    currentParty = m.party;
    currentParty.leaderName = m.party.members.find(p => p.id === m.party.leader)?.name || 'Unknown';
    show('party-panel');
    updatePartyUI();
    toast(`✅ Joined party: ${m.party.name}`);
  }
  
  if (m.t === 'party_left' || m.t === 'party_error') {
    state.partyId = null;
    currentParty = null;
    hide('party-panel');
    if (m.t === 'party_error') {
      toast(`❌ ${m.error}`);
    }
  }
  
  if (m.t === 'party_member_joined') {
    if (currentParty) {
      currentParty.members.push(m.member);
      updatePartyUI();
      toast(`👥 ${m.member.name} joined the party!`);
    }
  }
  
  if (m.t === 'party_member_left') {
    if (currentParty) {
      currentParty.members = currentParty.members.filter(p => p.id !== m.memberId);
      if (currentParty.members.length === 0) {
        state.partyId = null;
        currentParty = null;
        hide('party-panel');
      }
      updatePartyUI();
      toast(`👥 ${m.memberId} left the party`);
    }
  }
};

// ---------------- boot ----------------
// Show start screen with play button
show('start-screen');
hide('class-select');

// Create missing buttons if they don't exist
if (!document.getElementById('btn-play')) {
  const startScreen = document.getElementById('start-screen');
  if (startScreen) {
    const playBtn = document.createElement('button');
    playBtn.id = 'btn-play';
    playBtn.className = 'btn primary';
    playBtn.textContent = 'PLAY EMBERFALL';
    playBtn.style.cssText = 'font-size: 18px; padding: 14px 32px; margin-top: 24px; animation: pulse 2s infinite; cursor: pointer; border: 2px solid var(--gold); color: var(--gold); border-radius: 8px; letter-spacing: 2px;';
    startScreen.appendChild(playBtn);
  }
}
if (!document.getElementById('btn-back-to-start')) {
  const classSelect = document.getElementById('class-select');
  if (classSelect) {
    const backBtn = document.createElement('button');
    backBtn.id = 'btn-back-to-start';
    backBtn.className = 'btn';
    backBtn.textContent = '← Back';
    backBtn.style.cssText = 'margin-bottom: 16px; cursor: pointer;';
    classSelect.insertBefore(backBtn, classSelect.firstChild);
  }
}
if (!document.getElementById('btn-start-game')) {
  const editor = document.querySelector('.character-editor');
  if (editor) {
    const startBtn = document.createElement('button');
    startBtn.id = 'btn-start-game';
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start Game';
    startBtn.style.cssText = 'width: 100%; max-width: 280px; margin-top: 24px; cursor: pointer;';
    editor.appendChild(startBtn);
  }
}
// Play button
const playBtn = document.getElementById('btn-play');
if (playBtn) {
  playBtn.onclick = () => {
    hide('start-screen');
    show('class-select');
    buildClassSelect();
    setupClassEditor();
  };
}

// Back button
const backBtn = document.getElementById('btn-back-to-start');
if (backBtn) {
  backBtn.onclick = () => {
    hide('class-select');
    show('start-screen');
  };
}

// Start game button
const startGameBtn = document.getElementById('btn-start-game');
if (startGameBtn) {
  startGameBtn.onclick = () => {
    startSelectedGame();
  };
}

buildClassSelect();
refreshInventory();
muteOn = game.muted;
updateMuteBtn();

// Setup party UI
setupPartyUI();

// Add keyboard shortcut hints overlay
setupKeyboardHints();

// Add contextual help tooltip
setupHelpTooltip();

// Initialize sound on first interaction
const initAudio = () => {
  sound.init();
  window.removeEventListener('click', initAudio);
  window.removeEventListener('keydown', initAudio);
};
window.addEventListener('click', initAudio);
window.addEventListener('keydown', initAudio);

// Initialize achievements
state.achievements = new AchievementManager(state);

// Setup mobile touch controls
setupMobileControls();

// Setup gyroscope (mobile)
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', handleOrientation);
}

const canvas = $("#game");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
game.attach(canvas);
updateHUD();

// Check achievements periodically
setInterval(() => {
  if (state.achievements) {
    const newUnlock = state.achievements.checkAll();
    if (newUnlock) {
      renderAchievementNotifications();
    }
  }
}, 2000);

// Auto-save reminder
setInterval(() => {
  if (game.player && game.map && !state.uiOpen) {
    // Show subtle save indicator
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
      indicator.style.opacity = '1';
      setTimeout(() => {
        indicator.style.opacity = '0.3';
      }, 1000);
    }
  }
}, 30000);
