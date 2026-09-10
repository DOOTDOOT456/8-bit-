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
      <button class="btn net-btn">🌐 Play Online — ${c.name}</button>
    `;
    card.querySelector(".primary").onclick = () => chooseClass(id, "solo");
    card.querySelector(".co-op-btn").onclick = () => chooseClass(id, "coop");
    card.querySelector(".net-btn").onclick = () => chooseClass(id, "host");
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
function toast(msg) {
  const el = screens.toast;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.style.display = "none"; }, 2500);
}

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

// ---------------- achievement notifications ----------------
function renderAchievementNotifications() {
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

// ---------------- netplay buttons ----------------
$("#btn-net-host")?.addEventListener("click", () => { if (!net) netHost(); });
$("#btn-net-join")?.addEventListener("click", netJoin);
$("#net-close")?.addEventListener("click", () => {
  if (net) { net.close(); net = null; }
  hide("net");
  show("classSelect");
  state.uiOpen = false;
});

// ---------------- boot ----------------
buildClassSelect();
refreshInventory();
muteOn = game.muted;
updateMuteBtn();

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
