// ============================================================
//  EMBERFALL — Achievement System
//  Tracks player accomplishments and milestones
// ============================================================

// --- Achievement definitions ---
export const ACHIEVEMENTS = {
  // Story progression
  first_steps: {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Start your first chapter',
    icon: '👣',
    secret: false,
    check: (state) => state.chapterIndex >= 0 && state.totalKills > 0,
  },
  
  story_complete: {
    id: 'story_complete',
    name: 'Dawn Bringer',
    description: 'Complete all 3 story chapters',
    icon: '🌅',
    secret: false,
    check: (state) => state.chapterIndex >= 2 && state.bestDepth >= 3,
  },
  
  // Combat
  first_kill: {
    id: 'first_kill',
    name: 'First Blood',
    description: 'Kill your first enemy',
    icon: '🗡️',
    secret: false,
    check: (state) => state.totalKills >= 1,
  },
  
  slayer: {
    id: 'slayer',
    name: 'Monster Slayer',
    description: 'Kill 100 enemies',
    icon: '⚔️',
    secret: false,
    check: (state) => state.totalKills >= 100,
  },
  
  legendary_slayer: {
    id: 'legendary_slayer',
    name: 'Legendary Slayer',
    description: 'Kill 1000 enemies',
    icon: '🏆',
    secret: false,
    check: (state) => state.totalKills >= 1000,
  },
  
  // Depth
  deep_diver: {
    id: 'deep_diver',
    name: 'Deep Diver',
    description: 'Reach depth 5',
    icon: '🛄',
    secret: false,
    check: (state) => state.bestDepth >= 5,
  },
  
  abyssal_explorer: {
    id: 'abyssal_explorer',
    name: 'Abyssal Explorer',
    description: 'Reach depth 10',
    icon: '🌊',
    secret: false,
    check: (state) => state.bestDepth >= 10,
  },
  
  infinite_descent: {
    id: 'infinite_descent',
    name: 'Infinite Descent',
    description: 'Reach depth 20',
    icon: '♾️',
    secret: false,
    check: (state) => state.bestDepth >= 20,
  },
  
  // Bestiary
  naturalist: {
    id: 'naturalist',
    name: 'Novice Naturalist',
    description: 'Discover 3 creatures',
    icon: '📖',
    secret: false,
    check: (state) => state.bestiary && Object.keys(state.bestiary).length >= 3,
  },
  
  loremaster: {
    id: 'loremaster',
    name: 'Loremaster',
    description: 'Discover all creatures',
    icon: '📚',
    secret: false,
    check: (state) => {
      if (!state.bestiary) return false;
      const totalCreatures = Object.keys(ACHIEVEMENTS).length; // Approximate
      return Object.keys(state.bestiary).length >= 11; // All enemy types
    },
  },
  
  // Combat achievements
  golem_slayer: {
    id: 'golem_slayer',
    name: 'Golem Crusher',
    description: 'Kill 10 Golems',
    icon: '💪',
    secret: false,
    check: (state) => state.bestiary?.golem?.kills >= 10,
  },
  
  wolf_hunter: {
    id: 'wolf_hunter',
    name: 'Wolf Hunter',
    description: 'Kill 25 Dire Wolves',
    icon: '🐺',
    secret: false,
    check: (state) => state.bestiary?.wolf?.kills >= 25,
  },
  
  boss_slayer: {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Defeat your first boss',
    icon: '👹',
    secret: false,
    check: (state) => {
      if (!state.bestiary) return false;
      return Object.keys(state.bestiary).some(k => k.startsWith('boss_'));
    },
  },
  
  // Class-specific
  knight_path: {
    id: 'knight_path',
    name: 'Knight\'s Path',
    description: 'Play as the Knight',
    icon: '🛡️',
    secret: false,
    check: (state) => state.playedClasses?.knight,
  },
  
  ranger_path: {
    id: 'ranger_path',
    name: 'Ranger\'s Focus',
    description: 'Play as the Ranger',
    icon: '🏹',
    secret: false,
    check: (state) => state.playedClasses?.ranger,
  },
  
  pyromancer_path: {
    id: 'pyromancer_path',
    name: 'Pyromancer\'s Flame',
    description: 'Play as the Pyromancer',
    icon: '🔥',
    secret: false,
    check: (state) => state.playedClasses?.pyromancer,
  },
  
  // Prestige
  first_prestige: {
    id: 'first_prestige',
    name: 'First Prestige',
    description: 'Earn your first Ember Sigil',
    icon: '🔥',
    secret: false,
    check: (state) => state.sigils >= 1,
  },
  
  sigil_hunter: {
    id: 'sigil_hunter',
    name: 'Sigil Hunter',
    description: 'Earn 50 Ember Sigils',
    icon: '💎',
    secret: false,
    check: (state) => state.sigils >= 50,
  },
  
  // Collection
  craft_master: {
    id: 'craft_master',
    name: 'Craft Master',
    description: 'Craft 10 items',
    icon: '⚒️',
    secret: false,
    check: (state) => state.craftCount >= 10,
  },
  
  collector: {
    id: 'collector',
    name: 'Collector',
    description: 'Collect 100 items',
    icon: '🎒',
    secret: false,
    check: (state) => state.totalItemsCollected >= 100,
  },
  
  // Milestones
  level_10: {
    id: 'level_10',
    name: 'Veteran',
    description: 'Reach level 10',
    icon: '⭐',
    secret: false,
    check: (state) => state.highestLevel >= 10,
  },
  
  level_25: {
    id: 'level_25',
    name: 'Hero',
    description: 'Reach level 25',
    icon: '🌟',
    secret: false,
    check: (state) => state.highestLevel >= 25,
  },
  
  level_50: {
    id: 'level_50',
    name: 'Legend',
    description: 'Reach level 50',
    icon: '👑',
    secret: false,
    check: (state) => state.highestLevel >= 50,
  },
  
  // Endurance
  comeback: {
    id: 'comeback',
    name: 'Phoenix Rising',
    description: 'Revive from death using Phoenix Heart',
    icon: '🔥',
    secret: false,
    check: (state) => state.phoenixRevives >= 1,
  },
  
  survivalist: {
    id: 'survivalist',
    name: 'Survivalist',
    description: 'Die and rise 10 times',
    icon: '💀',
    secret: false,
    check: (state) => state.deathCount >= 10,
  },
  
  fearless: {
    id: 'fearless',
    name: 'Fearless',
    description: 'Die and rise 50 times',
    icon: '⚰️',
    secret: false,
    check: (state) => state.deathCount >= 50,
  },
};

// --- Achievement tracking class ---
export class AchievementManager {
  constructor(state) {
    this.state = state;
    this.unlocked = {};
    this.notifications = [];
    this.load();
  }

  // Load from localStorage
  load() {
    try {
      const data = localStorage.getItem('emberfall_achievements_v1');
      if (data) {
        const parsed = JSON.parse(data);
        this.unlocked = parsed.unlocked || {};
      }
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
  }

  // Save to localStorage
  save() {
    try {
      localStorage.setItem('emberfall_achievements_v1', JSON.stringify({
        unlocked: this.unlocked,
      }));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }

  // Check all achievements and unlock new ones
  checkAll() {
    let newUnlock = false;
    
    for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
      if (this.unlocked[id]) continue;
      
      if (ach.check(this.state)) {
        this.unlock(id);
        newUnlock = true;
      }
    }
    
    return newUnlock;
  }

  // Unlock a specific achievement
  unlock(id) {
    if (this.unlocked[id]) return;
    
    const ach = ACHIEVEMENTS[id];
    if (!ach) return;
    
    this.unlocked[id] = {
      unlockedAt: Date.now(),
      icon: ach.icon,
      name: ach.name,
      description: ach.description,
    };
    
    this.save();
    
    // Queue notification
    this.notifications.push({
      id,
      icon: ach.icon,
      name: ach.name,
      description: ach.description,
      timestamp: Date.now(),
    });
    
    return true;
  }

  // Check if achievement is unlocked
  isUnlocked(id) {
    return !!this.unlocked[id];
  }

  // Get unlocked count
  get unlockedCount() {
    return Object.keys(this.unlocked).length;
  }

  // Get total count
  get totalCount() {
    return Object.keys(ACHIEVEMENTS).length;
  }

  // Get all unlocked achievements
  getUnlocked() {
    return Object.values(this.unlocked);
  }

  // Get secret achievements (not yet discovered)
  getSecrets() {
    return Object.entries(ACHIEVEMENTS)
      .filter(([id, ach]) => ach.secret && !this.unlocked[id])
      .map(([id, ach]) => ({ id, ...ach }));
  }

  // Clear notifications
  clearNotifications() {
    this.notifications = [];
  }

  // Get pending notifications
  getNotifications() {
    return [...this.notifications];
  }
}

// Create singleton-like access through state
export function createAchievementManager(state) {
  return new AchievementManager(state);
}
