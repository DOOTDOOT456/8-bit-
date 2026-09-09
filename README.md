<div align="center">

# 🔥 EMBERFALL

### *An 8-Bit Dungeon Saga*

**The Ember has gone dark. The Lich holds the flame. Only you can bring back the dawn.**

[![Built with](https://img.shields.io/badge/built%20with-Vanilla_JS-f0c040?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Canvas](https://img.shields.io/badge/rendered%20on-HTML5_Canvas-e06030?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Size](https://img.shields.io/badge/entire%20game-~43_KB-6ade6a?style=flat-square)](#-play-it-now)

*Inspired by Minecraft Dungeons — rebuilt as its own saga.*

</div>

---

## 📖 The Story

For a hundred years, the **Ember** — the living flame that powered the old kingdom — kept the long night at bay.

Then **Malzhar, the Ember Lich**, tore it from its shrine and caged it in his ribcage.

Now darkness creeps across the land of Emberfall. From the frozen walls of **Frostmere Outpost**, the last free settlement, an elder sends out one final plea. You answer.

Three chapters. Three keys. One Lich.

> 🌲 **Chapter I — The Ember Dies**
> Something ancient stirs beneath the Whispering Woods. The Warden guards the first key — and it has not slept in centuries.

> 🕸️ **Chapter II — Web of Shadows**
> The brass key opens the Gloomroot Caverns. Within coils Araxa, the Spider Queen, whose brood has devoured three villages.

> 🌋 **Chapter III — The Ember Rises**
> At the summit of the Ashen Spire, the Lich waits. Slay him. Free the flame. Let dawn break over Emberfall.

---

## 🎭 Choose Your Path

Every playthrough starts with a choice — and each class plays *completely* differently:

| | Class | Playstyle | Signature Ability |
|---|---|---|---|
| 🛡️ | **Knight** | Slow. Armored. Unbreakable. Cleaves through crowds with sweeping arcs. | **Shield Bash** — stun and launch every enemy in front of you |
| 🏹 | **Ranger** | Fragile but deadly. Fires piercing arrows from safety. | **Volley** — rain 8 arrows in every direction at once |
| 🔥 | **Pyromancer** | Play with fire. Win with fire. Hurls incinerating bolts. | **Flame Nova** — detonate in a double ring of flame |

---

## ⚔️ Features

### Combat & Progression
- ⭐ **XP & leveling** — every kill counts; level-ups boost HP and damage
- 🩸 **Lifesteal weapons** — the Void Reaver drinks your enemies' blood so you don't have to
- 🔥 **Status effects** — fire ignites, arrows pierce, hammers of steel send foes flying
- 💀 **Boss fights with phases** — bosses get *faster, angrier, and meaner* as their HP drops. Araxa spawns her brood mid-fight. Malzhar's attacks fan out with every phase.

### Loot & Crafting
- 🎒 **20+ items across 5 rarity tiers** — Common → Uncommon → Rare → Epic → **Legendary**
- 🗡️ **Equip slots** for weapons, armor, and artifacts — each with real mechanical effects
- ⚒️ **12 crafting recipes** — turn wolf pelts, iron chunks, ember shards, and void crystals into legendary gear
- 💎 **Per-monster loot tables** — wolves drop pelts, golems drop crystals, imps drop *everything burning*

### A Living World
- 🌗 **Full day/night cycle** — real-time clock with nights that go *dark*, lit only by the glow at your side
- 🗺️ **Procedurally generated maps** — cellular-automata caves and forests, different every run
- 👹 **6 enemy types** — slimes, zombies, skeletons, fire imps, dire wolves, and golems, each with its own AI
- 📜 **Quest system** — tracked objectives, kill counters, and story rewards per chapter

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W A S D` / arrows | Move |
| 🖱️ Mouse | Aim |
| Left click | Attack (melee arc or projectile) |
| `F` | Class ability |
| `Q` | Drink health potion |
| `R` | Use artifact |
| `E` | Open inventory & crafting |
| `Esc` | Pause |

---

## 🚀 Play It Now

### Option 1 — Zero install (fastest)

The repo ships with a **pre-built standalone file**: [`emberfall.html`](./emberfall.html)

Download it. Double-click it. Play. That's it — the entire game (engine, art, UI) is inlined in one 43 KB HTML file. It runs from a USB stick, an email attachment, literally anywhere.

### Option 2 — From source

```bash
git clone https://github.com/DOOTDOOT456/8-bit-.git
cd 8-bit-
bun install
bun run dev          # dev server at localhost:5173
```

### Build commands

```bash
bun run build                # standard static build → dist/
bun run build:standalone     # single-file build → emberfall.html
```

---

## 🏗️ Architecture

No frameworks. No game engines. No dependencies at runtime. Just clean, modern JavaScript:

```
├── index.html                  # UI shell: HUD, inventory, quest log, dialogue boxes
├── src/
│   ├── main.js                 # App state + all UI wiring (screens, crafting, toasts)
│   ├── style.css               # Dark-fantasy UI theme
│   └── game/
│       ├── data.js             # The "design doc": classes, items, recipes, quests,
│       │                       #   bosses, story chapters, loot tables, enemy stats
│       ├── world.js            # Cellular-automata map generator + collision
│       └── engine.js           # Game loop, physics, combat, AI, bosses, rendering
└── emberfall.html              # Fully standalone single-file build ⚡
```

**Design principles:**
- 📊 **Data-driven** — every enemy, item, quest, and boss lives in `data.js`. Want a new weapon? Add five lines. Want a Chapter IV? It's one object.
- 🎨 **Everything is drawn in code** — no sprite sheets, no asset pipeline. All visuals are canvas primitives with retro charm.
- 🪶 **Tiny by design** — the whole game gzip-packs to under 15 KB.

---

## 🧙 Cheatsheet for New Adventurers

- **Night is dangerous.** The world goes dark around you — but your inner fire lights the way. Plan dungeon dives for daylight.
- **Craft before you descend.** An *Ember Blade* turns Chapter II from brutal into a victory lap.
- **Boss phases are real.** When the boss starts glowing red — save your ability for the dash.
- **The Warden is a door, not a wall.** Kill 10 creatures in the woods first; the quest will point your way.
- **Save your potions** for phase transitions, not scrapes. You'll know the moment.

---

<div align="center">

### ★ May the dawn find you alive ★

*Built with 🧡 and a single `<canvas>` element*

</div>
