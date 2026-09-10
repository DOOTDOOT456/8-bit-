import { describe, it, expect } from 'vitest';
import {
  depthMultiplier,
  scaleEnemy,
  scaleBoss,
} from '../src/game/engine.js';
import {
  CLASSES,
  ITEMS,
  ENEMY_TYPES,
  BOSSES,
  CHAPTERS,
  RECIPES,
  getDailyQuests,
} from '../src/game/data.js';

describe('Game Data', () => {
  describe('Classes', () => {
    it('should have 3 classes', () => {
      expect(Object.keys(CLASSES)).toHaveLength(3);
      expect(CLASSES.knight).toBeDefined();
      expect(CLASSES.ranger).toBeDefined();
      expect(CLASSES.pyromancer).toBeDefined();
    });

    it('knight should have high armor', () => {
      expect(CLASSES.knight.defense).toBe(6);
      expect(CLASSES.knight.hp).toBe(140);
    });
  });

  describe('Items', () => {
    it('should have various item types', () => {
      const types = new Set(Object.values(ITEMS).map(item => item.type));
      expect(types.has('weapon')).toBe(true);
      expect(types.has('armor')).toBe(true);
      expect(types.has('potion')).toBe(true);
      expect(types.has('artifact')).toBe(true);
      expect(types.has('food')).toBe(true);
      expect(types.has('material')).toBe(true);
    });

    it('legendary items should have rarity 4', () => {
      expect(ITEMS.dawnbreaker.rarity).toBe(4);
      expect(ITEMS.void_reaver.rarity).toBe(4);
      expect(ITEMS.phoenix_heart.rarity).toBe(4);
    });
  });

  describe('Depth Scaling', () => {
    it('should return 1 for depth <= 3', () => {
      expect(depthMultiplier(1)).toBe(1);
      expect(depthMultiplier(2)).toBe(1);
      expect(depthMultiplier(3)).toBe(1);
    });

    it('should increase multiplier with depth', () => {
      const m4 = depthMultiplier(4);
      const m10 = depthMultiplier(10);
      expect(m10).toBeGreaterThan(m4);
      expect(m4).toBeGreaterThan(1);
    });

    it('should scale enemy stats', () => {
      const base = ENEMY_TYPES.slime;
      const scaled = scaleEnemy('slime', 10);
      expect(scaled.hp).toBeGreaterThan(base.hp);
      expect(scaled.dmg).toBeGreaterThan(base.dmg);
    });

    it('should scale boss stats', () => {
      const base = BOSSES.warden;
      const scaled = scaleBoss('warden', 10);
      expect(scaled.hp).toBeGreaterThan(base.hp);
    });
  });

  describe('Enemies', () => {
    it('should have 6 base enemy types', () => {
      expect(Object.keys(ENEMY_TYPES)).toContain('slime');
      expect(Object.keys(ENEMY_TYPES)).toContain('zombie');
      expect(Object.keys(ENEMY_TYPES)).toContain('skeleton');
      expect(Object.keys(ENEMY_TYPES)).toContain('imp');
      expect(Object.keys(ENEMY_TYPES)).toContain('wolf');
      expect(Object.keys(ENEMY_TYPES)).toContain('golem');
    });
  });

  describe('Bosses', () => {
    it('should have 3 bosses', () => {
      expect(Object.keys(BOSSES)).toHaveLength(3);
      expect(BOSSES.warden).toBeDefined();
      expect(BOSSES.spiderqueen).toBeDefined();
      expect(BOSSES.lich).toBeDefined();
    });

    it('bosses should have phase support', () => {
      expect(BOSSES.warden.phases).toBeGreaterThan(0);
      expect(BOSSES.spiderqueen.phases).toBeGreaterThan(0);
      expect(BOSSES.lich.phases).toBeGreaterThan(0);
    });
  });

  describe('Chapters', () => {
    it('should have 3 story chapters', () => {
      expect(CHAPTERS).toHaveLength(3);
      expect(CHAPTERS[0].id).toBe(1);
      expect(CHAPTERS[1].id).toBe(2);
      expect(CHAPTERS[2].id).toBe(3);
    });

    it('each chapter should have a boss', () => {
      for (const ch of CHAPTERS) {
        expect(ch.quest.boss).toBeDefined();
        expect(BOSSES[ch.quest.boss]).toBeDefined();
      }
    });
  });

  describe('Recipes', () => {
    it('should have crafting recipes', () => {
      expect(RECIPES.length).toBeGreaterThan(10);
    });

    it('recipes should have valid output items', () => {
      for (const recipe of RECIPES) {
        expect(ITEMS[recipe.out]).toBeDefined();
      }
    });
  });

  describe('Daily Quests', () => {
    it('should generate quests deterministically', () => {
      const quests1 = getDailyQuests('2024-01-15');
      const quests2 = getDailyQuests('2024-01-15');
      expect(quests1).toEqual(quests2);
    });

    it('should generate 3 quests per day', () => {
      const quests = getDailyQuests('2024-01-15');
      expect(quests.length).toBe(3);
    });

    it('quests should have unique IDs', () => {
      const quests = getDailyQuests('2024-01-15');
      const ids = quests.map(q => q.id);
      expect(new Set(ids).size).toBe(quests.length);
    });
  });
});
