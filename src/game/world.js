import { THEME } from "./data.js";

// Cellular-automata cave/forest map generator
export function generateMap(cfg) {
  const { w, h, theme, props = {} } = cfg;
  const t = THEME[theme];

  // grid: 0 = floor, 1 = wall
  let grid = new Uint8Array(w * h);
  const rnd = () => Math.random();

  // seed walls randomly
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      grid[y * w + x] = (x === 0 || y === 0 || x === w - 1 || y === h - 1 || rnd() < 0.42) ? 1 : 0;

  // smooth with cellular automata
  for (let pass = 0; pass < 4; pass++) {
    const next = new Uint8Array(grid);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (!(dx === 0 && dy === 0) && grid[(y + dy) * w + (x + dx)]) walls++;
        next[y * w + x] = walls >= 5 ? 1 : 0;
      }
    }
    grid = next;
  }

  // carve boss arena (top area) and a corridor from spawn to it
  const [bx, by] = cfg.bossArena;
  const [sx, sy] = cfg.spawn;
  const arenaR = 12;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((x - bx) ** 2 + (y - by) ** 2 < arenaR * arenaR) grid[y * w + x] = 0;

  // carve winding corridor spawn -> arena
  let cx = sx, cy = sy;
  while (cy > by || cx !== bx) {
    grid[cy * w + cx] = 0;
    // clear a 3-wide path
    for (let d = -1; d <= 1; d++) {
      if (cx + d >= 0 && cx + d < w) grid[cy * w + cx + d] = 0;
      if (cy + d >= 0 && cy + d < h) grid[(cy + d) * w + cx] = 0;
    }
    if (cy > by && (cx === bx || rnd() < 0.7)) cy--;
    else if (cx < bx) cx++;
    else if (cx > bx) cx--;
    else cy--;
  }

  // clear spawn area
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) grid[y * w + x] = 0;
    }

  // decorative props: {x, y, kind}
  const propList = [];
  const kinds = Object.keys(props);
  for (const kind of kinds) {
    const n = props[kind];
    for (let i = 0; i < n; i++) {
      const x = 2 + Math.floor(rnd() * (w - 4));
      const y = 2 + Math.floor(rnd() * (h - 4));
      if (!grid[y * w + x] && !(Math.abs(x - sx) < 5 && Math.abs(y - sy) < 5)) {
        // don't block corridor completely — props are passable visuals / soft obstacles
        propList.push({ x: x * 32 + 16 + (rnd() - 0.5) * 10, y: y * 32 + 16 + (rnd() - 0.5) * 10, kind, r: kind === "trees" ? 8 : 6 });
      }
    }
  }

  return { w, h, grid, theme: t, themeName: theme, props: propList, spawn: cfg.spawn, bossArena: cfg.bossArena };
}

export function isWall(map, px, py) {
  const tx = Math.floor(px / 32), ty = Math.floor(py / 32);
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return true;
  return map.grid[ty * map.w + tx] === 1;
}

export function circleHitsWall(map, x, y, r) {
  return isWall(map, x - r, y) || isWall(map, x + r, y) || isWall(map, x, y - r) || isWall(map, x, y + r)
    || isWall(map, x - r * 0.7, y - r * 0.7) || isWall(map, x + r * 0.7, y - r * 0.7)
    || isWall(map, x - r * 0.7, y + r * 0.7) || isWall(map, x + r * 0.7, y + r * 0.7);
}
