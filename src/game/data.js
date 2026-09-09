// ============================================================
//  EMBERFALL — a top-down action RPG (Minecraft-Dungeons-inspired)
//  Data layer: classes, items, recipes, quests, story, enemies
// ============================================================

// ---------------------- CLASSES ----------------------
export const CLASSES = {
  knight: {
    name: "Knight",
    desc: "High armor, cleaving strikes. Slow but unbreakable.",
    hp: 140, speed: 1.9, damage: 12, defense: 6,
    attackRange: 34, attackArc: Math.PI * 0.8, attackCd: 30,
    color: "#4a6fd4", ability: "Shield Bash",
    abilityDesc: "Knock back and stun all enemies in front of you",
  },
  ranger: {
    name: "Ranger",
    desc: "Fires piercing arrows. Fragile but deadly at range.",
    hp: 90, speed: 2.5, damage: 9, defense: 2,
    attackRange: 260, attackArc: 0, attackCd: 18, ranged: true,
    color: "#3fae5a", ability: "Volley",
    abilityDesc: "Rain 8 arrows around you in all directions",
  },
  pyromancer: {
    name: "Pyromancer",
    desc: "Hurls fireballs that burn. Play with fire, win with fire.",
    hp: 100, speed: 2.1, damage: 14, defense: 3,
    attackRange: 200, attackArc: 0, attackCd: 34, ranged: true,
    color: "#e07030", ability: "Flame Nova",
    abilityDesc: "Explode in fire, igniting everything nearby",
  },
};

// ---------------------- ITEMS ----------------------
// rarity: 0 common, 1 uncommon, 2 rare, 3 epic, 4 legendary
export const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
export const RARITY_COLORS = ["#c8c8c8", "#6ade6a", "#5a9cf0", "#c060f0", "#f0a030"];

export const ITEMS = {
  // materials
  ember_shard:  { name: "Ember Shard",    type: "material", rarity: 1, color: "#f08030", desc: "Warm to the touch. Fuel for crafting." },
  iron_chunk:   { name: "Iron Chunk",     type: "material", rarity: 0, color: "#b0b0c0", desc: "Sturdy raw metal." },
  wolf_pelt:    { name: "Wolf Pelt",      type: "material", rarity: 0, color: "#8a6a4a", desc: "Thick fur from a dire wolf." },
  bone:         { name: "Bone",           type: "material", rarity: 0, color: "#e8e0c8", desc: "Ancient and dry." },
  crystal:      { name: "Void Crystal",   type: "material", rarity: 3, color: "#a050f0", desc: "Hums with dark energy." },
  boss_heart:   { name: "Dungeon Heart",  type: "material", rarity: 4, color: "#f04050", desc: "Still beating. Earned from a boss." },

  // weapons
  rust_sword:   { name: "Rusty Sword",    type: "weapon", rarity: 0, color: "#a09080", dmg: 8,  desc: "It has seen better centuries." },
  iron_sword:   { name: "Iron Sword",     type: "weapon", rarity: 1, color: "#c0c0d0", dmg: 14, desc: "Reliable steel." },
  ember_blade:  { name: "Ember Blade",    type: "weapon", rarity: 3, color: "#f0a050", dmg: 24, fire: true, desc: "Ignites enemies on hit." },
  void_reaver:  { name: "Void Reaver",    type: "weapon", rarity: 4, color: "#b060f0", dmg: 34, lifesteal: 0.15, desc: "Heals you for 15% of damage dealt." },
  short_bow:    { name: "Short Bow",      type: "weapon", rarity: 0, color: "#a08050", dmg: 7,  desc: "A humble hunting bow." },
  hunter_bow:   { name: "Hunter's Bow",   type: "weapon", rarity: 2, color: "#c0a050", dmg: 13, pierce: true, desc: "Arrows pierce through enemies." },
  ember_wand:   { name: "Ember Wand",     type: "weapon", rarity: 2, color: "#e08040", dmg: 12, fire: true, desc: "Casts burning bolts." },

  // armor
  cloth_robe:   { name: "Cloth Robe",     type: "armor", rarity: 0, color: "#9090a0", def: 2, desc: "Better than nothing." },
  iron_mail:    { name: "Iron Mail",      type: "armor", rarity: 1, color: "#b0b0c0", def: 5, desc: "Clanky but protective." },
  shadow_cloak: { name: "Shadow Cloak",   type: "armor", rarity: 3, color: "#605080", def: 8, speed: 0.3, desc: "Grants +0.3 move speed." },
  dragon_plate: { name: "Dragon Plate",   type: "armor", rarity: 4, color: "#f06040", def: 12, desc: "Forged from boss hearts." },

  // potions (consumables)
  health_pot:   { name: "Health Potion",  type: "potion", rarity: 0, color: "#f05070", heal: 45, desc: "Restores 45 HP." },
  strength_pot: { name: "Strength Potion",type: "potion", rarity: 2, color: "#f0b040", buff: 20, desc: "+10 damage for 20s." },

  // artifacts (special ability items)
  wind_charm:   { name: "Wind Charm",     type: "artifact", rarity: 2, color: "#80e0f0", cd: 240, effect: "dash", desc: "Dash forward instantly." },
  totem:        { name: "Totem of Regeneration", type: "artifact", rarity: 3, color: "#60d060", cd: 600, effect: "heal", desc: "Heal 60 HP over time." },
};

// ---------------------- RECIPES ----------------------
export const RECIPES = [
  { out: "health_pot",    count: 2, cost: { wolf_pelt: 1, ember_shard: 1 } },
  { out: "strength_pot",  count: 1, cost: { ember_shard: 3, crystal: 1 } },
  { out: "iron_sword",    count: 1, cost: { iron_chunk: 4 } },
  { out: "iron_mail",     count: 1, cost: { iron_chunk: 5, wolf_pelt: 2 } },
  { out: "hunter_bow",    count: 1, cost: { iron_chunk: 3, wolf_pelt: 3 } },
  { out: "ember_wand",    count: 1, cost: { ember_shard: 5, bone: 2 } },
  { out: "ember_blade",   count: 1, cost: { iron_chunk: 6, ember_shard: 8, crystal: 2 } },
  { out: "shadow_cloak",  count: 1, cost: { wolf_pelt: 6, crystal: 2 } },
  { out: "void_reaver",   count: 1, cost: { crystal: 4, boss_heart: 1, iron_chunk: 8 } },
  { out: "dragon_plate",  count: 1, cost: { boss_heart: 2, iron_chunk: 10, ember_shard: 10 } },
  { out: "wind_charm",    count: 1, cost: { ember_shard: 4, bone: 3 } },
  { out: "totem",         count: 1, cost: { crystal: 2, bone: 5, wolf_pelt: 3 } },
];

// ---------------------- ENEMIES ----------------------
export const ENEMY_TYPES = {
  slime:    { name: "Slime",    hp: 22,  dmg: 6,  speed: 0.7, color: "#60c050", r: 9,  xp: 8,  aggro: 120, contact: true },
  zombie:   { name: "Zombie",   hp: 34,  dmg: 9,  speed: 1.0, color: "#5a8a50", r: 10, xp: 14, aggro: 150, contact: true },
  skeleton: { name: "Skeleton", hp: 28,  dmg: 8,  speed: 1.1, color: "#e0dcc0", r: 10, xp: 16, aggro: 200, contact: false, ranged: true, projSpeed: 3.2, projColor: "#e8e0c8" },
  imp:      { name: "Fire Imp", hp: 30,  dmg: 11, speed: 1.4, color: "#e06030", r: 9,  xp: 20, aggro: 180, contact: false, ranged: true, projSpeed: 3.6, projColor: "#f08040", fire: true },
  wolf:     { name: "Dire Wolf",hp: 40,  dmg: 12, speed: 1.9, color: "#707080", r: 11, xp: 22, aggro: 240, contact: true },
  golem:    { name: "Golem",    hp: 90,  dmg: 16, speed: 0.6, color: "#909098", r: 14, xp: 40, aggro: 140, contact: true },
};

// ---------------------- BOSSES ----------------------
export const BOSSES = {
  warden: {
    name: "Grumble, the Warden",
    hp: 420, dmg: 20, speed: 0.85, color: "#3a5a6a", r: 22,
    xp: 200, drops: { iron_chunk: [3, 5], boss_heart: 1 },
    phases: 2,
  },
  spiderqueen: {
    name: "Araxa, Spider Queen",
    hp: 560, dmg: 24, speed: 1.6, color: "#6a3a5a", r: 20,
    xp: 320, drops: { wolf_pelt: [4, 6], boss_heart: 1, crystal: [1, 2] },
    phases: 3, spawns: "spiderling",
  },
  lich: {
    name: "Malzhar, the Ember Lich",
    hp: 800, dmg: 28, speed: 1.0, color: "#a050f0", r: 24,
    xp: 500, drops: { crystal: [3, 5], boss_heart: 2 },
    phases: 3, ranged: true, projSpeed: 4, projColor: "#c080f0",
  },
  spiderling: { name: "Spiderling", hp: 18, dmg: 5, speed: 2.0, color: "#8a5a7a", r: 6, xp: 5, aggro: 300, contact: true },
};

// ---------------------- STORY & QUESTS ----------------------
// World of EMBERFALL: the Ember, the fire that powered the old kingdom,
// was stolen by the Lich Malzhar. Darkness creeps across the land.
export const CHAPTERS = [
  {
    id: 1,
    title: "Chapter I — The Ember Dies",
    intro: "The Ember — heart of the old kingdom — has gone dark. Malzhar the Lich stole its flame. You wake in Frostmere Outpost, the last free settlement. The elder begs you: find the Warden beneath the ruins, and take back the first key.",
    quest: {
      name: "Embers in the Dark",
      desc: "Slay 10 creatures in the Whispering Woods and defeat the Warden in the Ruined Keep.",
      kills: 10,
      boss: "warden",
      reward: { items: { health_pot: 2, iron_chunk: 3 }, xp: 100 },
      onComplete: "The Warden falls. In its chest, a brass key — the first of three. The elder's raven flies it home.",
    },
    map: {
      w: 90, h: 90,
      theme: "forest",
      spawn: [45, 70],
      enemies: { slime: 14, zombie: 8 },
      bossArena: [45, 18],
      bossGate: "wooden",
      props: { trees: 90, rocks: 30 },
    },
  },
  {
    id: 2,
    title: "Chapter II — Web of Shadows",
    intro: "The brass key opens the Gloomroot Caverns — and within coils Araxa, the Spider Queen, Malzhar's first servant. Her brood has devoured three villages. End her, and claim the silver key she guards.",
    quest: {
      name: "The Queen's Nest",
      desc: "Survive the caverns and defeat Araxa, the Spider Queen.",
      kills: 0,
      boss: "spiderqueen",
      reward: { items: { health_pot: 2, crystal: 1 }, xp: 180 },
      onComplete: "Araxa's legs curl inward and still. The silver key drops from her mandibles, slick with venom.",
    },
    map: {
      w: 80, h: 80,
      theme: "cave",
      spawn: [40, 70],
      enemies: { spiderling: 10, imp: 8, wolf: 6 },
      bossArena: [40, 16],
      bossGate: "none",
      props: { rocks: 80, crystals: 40 },
    },
  },
  {
    id: 3,
    title: "Chapter III — The Ember Rises",
    intro: "The silver key turns. At the summit of the Ashen Spire waits Malzhar himself, the Ember caged in his ribcage. Slay the Lich, free the flame, and let dawn break over Emberfall for the first time in a hundred years.",
    quest: {
      name: "Hearts of Fire",
      desc: "Climb the Ashen Spire and destroy Malzhar, the Ember Lich.",
      kills: 0,
      boss: "lich",
      reward: { items: { boss_heart: 1 }, xp: 400 },
      onComplete: "The Lich crumbles. The Ember rises from his chest and blazes back to the sky. DAWN RETURNS TO EMBERFALL. ★ THE END ★",
    },
    map: {
      w: 70, h: 70,
      theme: "ash",
      spawn: [35, 60],
      enemies: { imp: 10, skeleton: 8, golem: 5 },
      bossArena: [35, 14],
      bossGate: "none",
      props: { rocks: 50, crystals: 30 },
    },
  },
];

export const THEME = {
  forest: { ground: "#3d6b35", ground2: "#44763b", wall: "#2a4a24", accent: "#5a8a4a" },
  cave:   { ground: "#4a4048", ground2: "#524850", wall: "#2e2830", accent: "#8a5ab0" },
  ash:    { ground: "#4a3f3a", ground2: "#524740", wall: "#2a2422", accent: "#e06030" },
};

// Enemy loot table: chance to drop item on death
export const LOOT_TABLE = {
  slime:    { ember_shard: 0.4 },
  zombie:   { iron_chunk: 0.3, health_pot: 0.08 },
  skeleton: { bone: 0.5, iron_chunk: 0.15 },
  imp:      { ember_shard: 0.5, health_pot: 0.06 },
  wolf:     { wolf_pelt: 0.5 },
  golem:    { iron_chunk: 0.6, crystal: 0.1 },
  spiderling: { bone: 0.2 },
};
