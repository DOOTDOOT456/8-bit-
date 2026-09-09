// ============================================================
//  EMBERFALL — app state + UI wiring
// ============================================================
import "./style.css";
import { Game } from "./game/engine.js";
import { CLASSES, ITEMS, RECIPES, CHAPTERS, RARITY_COLORS, RARITY_NAMES } from "./game/data.js";

const $ = sel => document.querySelector(sel);

const state = {
  uiOpen: false,
  inventory: { health_pot: 2, iron_chunk: 2 },
  equipped: { weapon: null, armor: null, artifact: null },
  chapterIndex: 0,
  storyDone: false,
};

const game = new Game(state);
game.buffs = { strength: 0, burnHeal: 0 };
game.equipped = state.equipped;
game.artifactCd = 0;

// ---------------- screens ----------------
const screens = {
  classSelect: $("#class-select"),
  story: $("#story-screen"),
  hud: $("#hud"),
  inventory: $("#inventory-screen"),
  questLog: $("#quest-screen"),
  death: $("#death-screen"),
  victory: $("#victory-screen"),
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
      <button class="btn primary">Play ${c.name}</button>
    `;
    card.querySelector("button").onclick = () => chooseClass(id);
    list.appendChild(card);
  }
}

function chooseClass(id) {
  game.initPlayer(id);
  state.chapterIndex = 0;
  startChapter(0);
}

// ---------------- chapter / story flow ----------------
function startChapter(i) {
  state.chapterIndex = i;
  const ch = CHAPTERS[i];
  game.startChapter(ch);
  game.onKillCheckHooked = true;
  // hook kill check
  const origKill = game.killEnemy.bind(game);
  game.killEnemy = e => { origKill(e); game.onKillCheck(); };
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
          if (state.chapterIndex + 1 < CHAPTERS.length) {
            startChapter(state.chapterIndex + 1);
          } else {
            state.uiOpen = true;
            show("victory");
          }
        };
      }, 900);
      break;
    }
    case "levelUp":
      toast(`⭐ Level Up! Level ${ev.level} — HP & damage increased`);
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
  }
};

$("#death-retry").onclick = () => {
  hide("death");
  state.uiOpen = false;
  const p = game.player;
  p.hp = p.maxHp;
  const [sx, sy] = CHAPTERS[state.chapterIndex].map.spawn;
  p.x = sx * 32 + 16; p.y = sy * 32 + 16;
  game.boss = null; game.bossDefeated = false;
  game.enemies = game.enemies.filter(e => Math.hypot(e.x - p.x, e.y - p.y) > 300);
};

$("#death-menu").onclick = () => location.reload();
$("#victory-menu").onclick = () => location.reload();

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
    if (item.type === "potion") {
      const btn = document.createElement("button");
      btn.className = "btn tiny";
      btn.textContent = "Use";
      btn.onclick = () => {
        if (item.heal) game.healPlayer(item.heal);
        if (item.buff) game.buffs.strength = item.buff * 60;
        removeInv(id, 1);
        toast(`Used ${item.name}`);
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
  $("#ch-title").textContent = CHAPTERS[state.chapterIndex].title;
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
    ["inventory", "questLog"].forEach(hide);
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
$("#dialogue-ok")?.addEventListener("click", () => { state.uiOpen = false; });
$("#inv-close").onclick = () => { hide("inventory"); state.uiOpen = false; };
$("#quest-close").onclick = () => { hide("questLog"); state.uiOpen = false; };

// ---------------- boot ----------------
buildClassSelect();
refreshInventory();
const canvas = $("#game");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
game.attach(canvas);
updateHUD();
