import { describe, it, expect } from "vitest";
import { generateMap, isWall, circleHitsWall } from "../src/game/world.js";
import { CHAPTERS, THEME } from "../src/game/data.js";

describe("generateMap", () => {
  for (const ch of CHAPTERS) {
    it(`chapter ${ch.id}: generates a map of the right size with a valid theme`, () => {
      const map = generateMap(ch.map);
      expect(map.w).toBe(ch.map.w);
      expect(map.h).toBe(ch.map.h);
      expect(map.grid.length).toBe(map.w * map.h);
      expect(THEME[map.themeName]).toBeDefined();
      expect(map.spawn).toEqual(ch.map.spawn);
      expect(map.bossArena).toEqual(ch.map.bossArena);
    });

    it(`chapter ${ch.id}: spawn area is clear and walkable`, () => {
      const map = generateMap(ch.map);
      const [sx, sy] = map.spawn;
      expect(isWall(map, sx * 32 + 16, sy * 32 + 16)).toBe(false);
    });

    it(`chapter ${ch.id}: boss arena is reachable from spawn`, () => {
      const map = generateMap(ch.map);
      const [sx, sy] = map.spawn;
      const [bx, by] = map.bossArena;
      // BFS flood fill over non-wall tiles from spawn; boss arena center must be reachable
      const start = sy * map.w + sx;
      const target = by * map.w + bx;
      const seen = new Uint8Array(map.w * map.h);
      const queue = [start];
      seen[start] = 1;
      while (queue.length) {
        const cur = queue.shift();
        if (cur === target) break;
        const cx = cur % map.w, cy = Math.floor(cur / map.w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
          const ni = ny * map.w + nx;
          if (!seen[ni] && map.grid[ni] === 0) { seen[ni] = 1; queue.push(ni); }
        }
      }
      expect(seen[target]).toBe(1);
    });

    it(`chapter ${ch.id}: boss arena center is open floor`, () => {
      const map = generateMap(ch.map);
      const [bx, by] = map.bossArena;
      expect(isWall(map, bx * 32 + 16, by * 32 + 16)).toBe(false);
    });
  }

  it("generates maps with reasonable open-floor ratio (not solid, not empty)", () => {
    const map = generateMap(CHAPTERS[0].map);
    let open = 0;
    for (let i = 0; i < map.grid.length; i++) if (map.grid[i] === 0) open++;
    const ratio = open / map.grid.length;
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.95);
  });

  it("out-of-bounds counts as wall", () => {
    const map = generateMap(CHAPTERS[0].map);
    expect(isWall(map, -10, -10)).toBe(true);
    expect(isWall(map, map.w * 32 + 10, map.h * 32 + 10)).toBe(true);
  });

  it("circleHitsWall detects wall overlap", () => {
    const map = generateMap(CHAPTERS[0].map);
    // find a wall tile
    let wallFound = false;
    for (let y = 0; y < map.h && !wallFound; y++) {
      for (let x = 0; x < map.w && !wallFound; x++) {
        if (map.grid[y * map.w + x] === 1) {
          expect(circleHitsWall(map, x * 32 + 16, y * 32 + 16, 8)).toBe(true);
          wallFound = true;
        }
      }
    }
    expect(wallFound).toBe(true);
  });
});

describe("game data integrity", () => {
  it("every chapter references a boss that exists", () => {
    for (const ch of CHAPTERS) {
      expect(ch.quest.boss).toBeDefined();
    }
  });

  it("chapter maps reference valid themes", () => {
    for (const ch of CHAPTERS) {
      expect(THEME[ch.map.theme]).toBeDefined();
    }
  });

  it("spawn and boss arena are inside map bounds", () => {
    for (const ch of CHAPTERS) {
      const { w, h, spawn, bossArena } = ch.map;
      expect(spawn[0]).toBeGreaterThan(0); expect(spawn[0]).toBeLessThan(w);
      expect(spawn[1]).toBeGreaterThan(0); expect(spawn[1]).toBeLessThan(h);
      expect(bossArena[0]).toBeGreaterThan(0); expect(bossArena[0]).toBeLessThan(w);
      expect(bossArena[1]).toBeGreaterThan(0); expect(bossArena[1]).toBeLessThan(h);
    }
  });
});
