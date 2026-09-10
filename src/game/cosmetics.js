// ============================================================
//  EMBERFALL — Cosmetics System
//  Player visual customization options
// ============================================================

// --- Cosmetic items ---
export const COSMETICS = {
  // Trail effects
  trails: {
    none: { name: 'No Trail', description: 'No trail effect', rarity: 0, color: null, icon: '🚶' },
    ember: { name: 'Ember Trail', description: 'Leave a trail of embers', rarity: 1, color: '#f06030', icon: '🔥' },
    frost: { name: 'Frost Trail', description: 'Leave a trail of frost', rarity: 1, color: '#80c0f0', icon: '❄️' },
    shadow: { name: 'Shadow Trail', description: 'Leave a shadowy trail', rarity: 2, color: '#605080', icon: '🌑' },
    gold: { name: 'Golden Trail', description: 'Leave a trail of gold', rarity: 3, color: '#ffd040', icon: '✨' },
    rainbow: { name: 'Rainbow Trail', description: 'Leave a rainbow trail', rarity: 4, color: 'rainbow', icon: '🌈' },
  },
  
  // Aura effects
  auras: {
    none: { name: 'No Aura', description: 'No aura effect', rarity: 0, color: null, icon: '⚪' },
    knight_aura: { name: 'Knight\'s Might', description: 'Blue shield aura', rarity: 1, color: '#4a6fd4', icon: '🛡️' },
    ranger_aura: { name: 'Ranger\'s Focus', description: 'Green nature aura', rarity: 1, color: '#3fae5a', icon: '🏹' },
    pyromancer_aura: { name: 'Pyromancer\'s Fire', description: 'Orange fire aura', rarity: 1, color: '#e07030', icon: '🔥' },
    champion: { name: 'Champion\'s Glory', description: 'Golden champion aura', rarity: 3, color: '#ffd040', icon: '🏆' },
    legendary: { name: 'Legendary Presence', description: 'Rainbow legendary aura', rarity: 4, color: 'rainbow', icon: '👑' },
  },
  
  // Weapon effects
  weapon_effects: {
    none: { name: 'Standard', description: 'No special effect', rarity: 0, color: null, icon: '⚔️' },
    fire: { name: 'Fire Strikes', description: 'Weapon leaves fire trails', rarity: 1, color: '#f06030', icon: '🔥' },
    ice: { name: 'Ice Strikes', description: 'Weapon leaves ice trails', rarity: 1, color: '#80c0f0', icon: '❄️' },
    lightning: { name: 'Lightning Strikes', description: 'Weapon sparks with lightning', rarity: 2, color: '#c0c0ff', icon: '⚡' },
    holy: { name: 'Holy Strikes', description: 'Weapon glows with holy light', rarity: 3, color: '#ffd040', icon: '✨' },
  },
  
  // Player skins (color variations)
  skins: {
    default: { name: 'Default', description: 'Classic player color', rarity: 0, color: null, icon: '🎨' },
    dark: { name: 'Dark', description: 'Dark themed player', rarity: 1, color: '#2a2a3a', icon: '🌑' },
    light: { name: 'Light', description: 'Light themed player', rarity: 1, color: '#e0e0f0', icon: '☀️' },
    crimson: { name: 'Crimson', description: 'Blood red player', rarity: 2, color: '#c03030', icon: '❤️' },
    sapphire: { name: 'Sapphire', description: 'Blue sapphire player', rarity: 2, color: '#4a6fd4', icon: '💎' },
    emerald: { name: 'Emerald', description: 'Green emerald player', rarity: 2, color: '#3fae5a', icon: '💚' },
    shadowfire: { name: 'Shadowfire', description: 'Purple shadow fire', rarity: 3, color: '#8040a0', icon: '🔮' },
    dawn: { name: 'Dawn', description: 'Golden dawn player', rarity: 3, color: '#f0c040', icon: '🌅' },
    void: { name: 'Void', description: 'Mysterious void player', rarity: 4, color: '#2a2a4a', icon: '🕳️' },
  },
};

// --- Player cosmetics state ---
export class CosmeticsManager {
  constructor(playerId) {
    this.playerId = playerId;
    this.trail = 'none';
    this.aura = 'none';
    this.weaponEffect = 'none';
    this.skin = 'default';
    this.load();
  }
  
  load() {
    try {
      const data = localStorage.getItem(`emberfall_cosmetics_${this.playerId}`);
      if (data) {
        const cosmetics = JSON.parse(data);
        this.trail = cosmetics.trail || 'none';
        this.aura = cosmetics.aura || 'none';
        this.weaponEffect = cosmetics.weaponEffect || 'none';
        this.skin = cosmetics.skin || 'default';
      }
    } catch (e) {
      console.warn('Failed to load cosmetics:', e);
    }
  }
  
  save() {
    try {
      localStorage.setItem(`emberfall_cosmetics_${this.playerId}`, JSON.stringify({
        trail: this.trail,
        aura: this.aura,
        weaponEffect: this.weaponEffect,
        skin: this.skin,
      }));
    } catch (e) {
      console.warn('Failed to save cosmetics:', e);
    }
  }
  
  setTrail(trailId) {
    if (COSMETICS.trails[trailId]) {
      this.trail = trailId;
      this.save();
      return true;
    }
    return false;
  }
  
  setAura(auraId) {
    if (COSMETICS.auras[auraId]) {
      this.aura = auraId;
      this.save();
      return true;
    }
    return false;
  }
  
  setWeaponEffect(effectId) {
    if (COSMETICS.weapon_effects[effectId]) {
      this.weaponEffect = effectId;
      this.save();
      return true;
    }
    return false;
  }
  
  setSkin(skinId) {
    if (COSMETICS.skins[skinId]) {
      this.skin = skinId;
      this.save();
      return true;
    }
    return false;
  }
  
  // Get trail color (with animation support)
  getTrailColor(frame) {
    const trail = COSMETICS.trails[this.trail];
    if (!trail || !trail.color) return null;
    
    if (trail.color === 'rainbow') {
      // Rainbow animation
      const hue = (frame * 2) % 360;
      return `hsl(${hue}, 100%, 60%)`;
    }
    return trail.color;
  }
  
  // Get aura color
  getAuraColor() {
    const aura = COSMETICS.auras[this.aura];
    if (!aura || !aura.color) return null;
    
    if (aura.color === 'rainbow') {
      return 'rainbow';
    }
    return aura.color;
  }
  
  // Get skin color (overrides default class color)
  getSkinColor(baseColor, frame) {
    const skin = COSMETICS.skins[this.skin];
    if (!skin || !skin.color) return baseColor;
    
    if (skin.color === 'rainbow') {
      const hue = (frame * 2) % 360;
      return `hsl(${hue}, 100%, 60%)`;
    }
    return skin.color;
  }
  
  // Get all cosmetics
  getCosmetics() {
    return {
      trail: this.trail,
      aura: this.aura,
      weaponEffect: this.weaponEffect,
      skin: this.skin,
      trails: Object.entries(COSMETICS.trails).map(([id, item]) => ({
        id,
        ...item,
        equipped: id === this.trail,
      })),
      auras: Object.entries(COSMETICS.auras).map(([id, item]) => ({
        id,
        ...item,
        equipped: id === this.aura,
      })),
      weaponEffects: Object.entries(COSMETICS.weapon_effects).map(([id, item]) => ({
        id,
        ...item,
        equipped: id === this.weaponEffect,
      })),
      skins: Object.entries(COSMETICS.skins).map(([id, item]) => ({
        id,
        ...item,
        equipped: id === this.skin,
      })),
    };
  }
  
  // Reset all cosmetics to default
  reset() {
    this.trail = 'none';
    this.aura = 'none';
    this.weaponEffect = 'none';
    this.skin = 'default';
    this.save();
  }
}

// --- Unlock conditions for cosmetics ---
export const COSMETIC_UNLOCKS = {
  // Unlock ember trail by reaching depth 3
  trails: {
    ember: { type: 'depth', value: 3 },
    frost: { type: 'depth', value: 5 },
    shadow: { type: 'depth', value: 8 },
    gold: { type: 'kills', value: 100 },
    rainbow: { type: 'kills', value: 500 },
  },
  
  // Unlock auras by achievements
  auras: {
    knight_aura: { type: 'playedClass', value: 'knight' },
    ranger_aura: { type: 'playedClass', value: 'ranger' },
    pyromancer_aura: { type: 'playedClass', value: 'pyromancer' },
    champion: { type: 'depth', value: 10 },
    legendary: { type: 'kills', value: 1000 },
  },
  
  // Unlock weapon effects by crafting
  weapon_effects: {
    fire: { type: 'crafted', value: 'ember_blade' },
    ice: { type: 'crafted', value: 'hunter_bow' },
    lightning: { type: 'crafted', value: 'void_reaver' },
    holy: { type: 'crafted', value: 'dragon_plate' },
  },
  
  // Unlock skins by progression
  skins: {
    dark: { type: 'chapter', value: 1 },
    light: { type: 'chapter', value: 1 },
    crimson: { type: 'chapter', value: 2 },
    sapphire: { type: 'chapter', value: 2 },
    emerald: { type: 'chapter', value: 2 },
    shadowfire: { type: 'depth', value: 5 },
    dawn: { type: 'depth', value: 8 },
    void: { type: 'kills', value: 250 },
  },
};

// Check if a cosmetic is unlocked
export function isCosmeticUnlocked(cosmeticId, unlockCondition, playerState) {
  if (!unlockCondition) return true; // No condition = always available
  
  switch (unlockCondition.type) {
    case 'depth':
      return playerState.bestDepth >= unlockCondition.value;
    case 'kills':
      return playerState.totalKills >= unlockCondition.value;
    case 'chapter':
      return playerState.chapterIndex >= unlockCondition.value - 1;
    case 'playedClass':
      return playerState.playedClasses?.[unlockCondition.value];
    case 'crafted':
      return playerState.inventory?.[unlockCondition.value];
    default:
      return false;
  }
}

// Get all unlocked cosmetics for a player
export function getUnlockedCosmetics(playerState) {
  const unlocked = {
    trails: [],
    auras: [],
    weaponEffects: [],
    skins: [],
  };
  
  for (const [id, condition] of Object.entries(COSMETIC_UNLOCKS.trails)) {
    if (isCosmeticUnlocked(id, condition, playerState)) {
      unlocked.trails.push(id);
    }
  }
  
  for (const [id, condition] of Object.entries(COSMETIC_UNLOCKS.auras)) {
    if (isCosmeticUnlocked(id, condition, playerState)) {
      unlocked.auras.push(id);
    }
  }
  
  for (const [id, condition] of Object.entries(COSMETIC_UNLOCKS.weapon_effects)) {
    if (isCosmeticUnlocked(id, condition, playerState)) {
      unlocked.weaponEffects.push(id);
    }
  }
  
  for (const [id, condition] of Object.entries(COSMETIC_UNLOCKS.skins)) {
    if (isCosmeticUnlocked(id, condition, playerState)) {
      unlocked.skins.push(id);
    }
  }
  
  return unlocked;
}
