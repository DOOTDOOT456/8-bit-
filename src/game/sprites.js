// ============================================================
//  EMBERFALL — Sprite-based rendering module
//  Draws character-based sprites instead of simple circles
// ============================================================

// --- Color palettes for retro sprites ---
const PALETTES = {
  // Player class colors (with highlights)
  knight:    { body: '#4a6fd4', dark: '#2a4f8a', light: '#6a8fe4', accent: '#ffd040' },
  ranger:    { body: '#3fae5a', dark: '#2a8a40', light: '#5fce7a', accent: '#c0e070' },
  pyromancer:{ body: '#e07030', dark: '#b05020', light: '#f08040', accent: '#f0a040' },
  
  // Enemy colors
  slime:     { body: '#60c050', dark: '#409030', light: '#80e070', eye: '#1a1a1a' },
  zombie:    { body: '#5a8a50', dark: '#3a6a30', light: '#7aaa70', eye: '#ff6060' },
  skeleton:  { body: '#e0dcc0', dark: '#b0ac90', light: '#f0ece0', eye: '#ff4040' },
  imp:       { body: '#e06030', dark: '#b04020', light: '#f08040', eye: '#ffe040' },
  wolf:      { body: '#707080', dark: '#505060', light: '#9090a0', eye: '#c0c0ff' },
  golem:     { body: '#909098', dark: '#707078', light: '#b0b0b8', eye: '#8080ff' },
  spiderling:{ body: '#8a3a5a', dark: '#6a2a4a', light: '#aa5a7a', eye: '#ffe040' },
  wraith:    { body: '#404080', dark: '#202060', light: '#6060a0', eye: '#a0a0ff' },
  frostborn: { body: '#80c0f0', dark: '#6090d0', light: '#a0e0ff', eye: '#ffffff' },
  cinderbeast:{ body: '#f06030', dark: '#c04020', light: '#ff8040', eye: '#ff4040' },
  abomination:{ body: '#5a5a6a', dark: '#3a3a4a', light: '#7a7a8a', eye: '#ff2020' },
  
  // Boss colors
  warden:    { body: '#3a5a6a', dark: '#1a3a4a', light: '#5a7a8a', eye: '#ff4040', aura: '#6080a0' },
  spiderqueen:{ body: '#6a3a5a', dark: '#4a1a3a', light: '#8a5a7a', eye: '#ffe040', aura: '#a04080' },
  lich:      { body: '#a050f0', dark: '#8030c0', light: '#c070ff', eye: '#ffffff', aura: '#c080f0' },
};

// --- Draw a player character sprite ---
export function drawPlayer(ctx, x, y, cls, facing, bob, invuln, frame, equippedWeapon, hp, maxHp) {
  const palette = PALETTES[cls] || PALETTES.knight;
  const isInvuln = invuln > 0 && frame % 6 < 3;
  
  ctx.save();
  ctx.translate(x, y + bob);
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw character body (stylized humanoid)
  const bodyColor = isInvuln ? '#ffffff' : palette.body;
  
  // Legs
  ctx.fillStyle = palette.dark;
  ctx.fillRect(-6, 2, 4, 8);
  ctx.fillRect(2, 2, 4, 8);
  
  // Torso
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-8, -6, 16, 10);
  
  // Armor detail
  if (palette.accent) {
    ctx.fillStyle = palette.accent;
    ctx.fillRect(-7, -4, 14, 2);
  }
  
  // Head
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, -10, 7, 0, Math.PI * 2);
  ctx.fill();
  
  // Hair/cap
  ctx.fillStyle = palette.dark;
  ctx.beginPath();
  ctx.arc(0, -13, 7, Math.PI, 2 * Math.PI);
  ctx.fill();
  
  // Eyes (look in facing direction)
  ctx.fillStyle = palette.eye || '#1a1a2a';
  const eyeOffsetX = Math.cos(facing) * 2;
  const eyeOffsetY = Math.sin(facing) * 2;
  ctx.fillRect(-3 + eyeOffsetX, -11 + eyeOffsetY, 2, 2);
  ctx.fillRect(2 + eyeOffsetX, -11 + eyeOffsetY, 2, 2);
  
  // Weapon (if equipped)
  if (equippedWeapon) {
    const weaponColor = equippedWeapon.color || '#c0c0c0';
    const angle = facing;
    
    ctx.save();
    ctx.rotate(angle);
    
    if (equippedWeapon.type === 'weapon') {
      // Draw sword
      ctx.fillStyle = weaponColor;
      ctx.fillRect(8, -2, 14, 4);
      ctx.fillStyle = palette.dark;
      ctx.fillRect(8, -3, 14, 1);
      // Blade tip
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(20, -1, 3, 2);
    } else if (equippedWeapon.type === 'armor') {
      // Armor visual on torso
      ctx.fillStyle = weaponColor;
      ctx.fillRect(-8, -6, 16, 10);
    }
    
    ctx.restore();
  }
  
  // HP bar above head
  if (hp < maxHp) {
    const barWidth = 24;
    const barHeight = 3;
    const hpRatio = hp / maxHp;
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barWidth/2, -20, barWidth, barHeight);
    
    ctx.fillStyle = hpRatio > 0.5 ? '#40c040' : hpRatio > 0.25 ? '#c0c040' : '#c04040';
    ctx.fillRect(-barWidth/2, -20, barWidth * hpRatio, barHeight);
  }
  
  ctx.restore();
}

// --- Draw an enemy sprite ---
export function drawEnemy(ctx, x, y, type, color, r, hitFlash, hp, maxHp, frame, facingAngle) {
  const palette = PALETTES[type] || { body: color, dark: darken(color, 0.6), light: lighten(color, 0.3), eye: '#1a1a1a' };
  const isHit = hitFlash > 0;
  
  ctx.save();
  ctx.translate(x, y);
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.8, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  const bodyColor = isHit ? '#ffffff' : palette.body;
  
  // Different enemy body shapes
  if (type === 'slime') {
    // Slime blob shape
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Slime highlight
    ctx.fillStyle = palette.light;
    ctx.beginPath();
    ctx.ellipse(-2, -2, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'skeleton') {
    // Skeleton - bony appearance
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Bones
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.stroke();
    // Eye sockets
    ctx.fillStyle = palette.eye;
    ctx.fillRect(-3, -3, 2, 2);
    ctx.fillRect(2, -3, 2, 2);
  } else if (type === 'wolf') {
    // Wolf - quadruped shape
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.moveTo(-5, -r);
    ctx.lineTo(-7, -r - 5);
    ctx.lineTo(-3, -r - 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, -r);
    ctx.lineTo(7, -r - 5);
    ctx.lineTo(3, -r - 2);
    ctx.fill();
  } else if (type === 'golem') {
    // Golem - blocky stone appearance
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    // Stone texture
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const sx = -r + (i + 0.5) * (r * 2 / 4);
      ctx.beginPath();
      ctx.moveTo(sx, -r);
      ctx.lineTo(sx, r);
      ctx.stroke();
    }
  } else if (type === 'imp' || type === 'wraith' || type === 'frostborn' || type === 'cinderbeast' || type === 'abomination') {
    // Generic humanoid enemy
    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = palette.eye || '#ff4040';
    const eyeDir = facingAngle || 0;
    ctx.fillRect(-3 + Math.cos(eyeDir) * 2, -3 + Math.sin(eyeDir) * 2, 2, 2);
    ctx.fillRect(2 + Math.cos(eyeDir) * 2, -3 + Math.sin(eyeDir) * 2, 2, 2);
  } else {
    // Default circular enemy
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = palette.eye || '#1a1a1a';
    ctx.fillRect(-3, -3, 2, 2);
    ctx.fillRect(2, -3, 2, 2);
  }
  
  // HP bar if damaged
  if (hp < maxHp) {
    const barWidth = r * 2 + 4;
    const barHeight = 3;
    const hpRatio = hp / maxHp;
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barWidth/2, -r - 8, barWidth, barHeight);
    
    ctx.fillStyle = hpRatio > 0.5 ? '#40c040' : hpRatio > 0.25 ? '#c0c040' : '#c04040';
    ctx.fillRect(-barWidth/2, -r - 8, barWidth * hpRatio, barHeight);
  }
  
  ctx.restore();
}

// --- Draw a boss sprite ---
export function drawBoss(ctx, x, y, boss, frame, shake) {
  const palette = PALETTES[boss.id] || { body: boss.color, dark: darken(boss.color, 0.6), light: lighten(boss.color, 0.3), eye: '#ffffff' };
  const r = boss.r;
  const sx = x + (shake?.x || 0);
  const sy = y + (shake?.y || 0);
  
  ctx.save();
  ctx.translate(sx, sy);
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Aura effect (especially for higher phases)
  if (boss.phase > 1) {
    ctx.strokeStyle = `rgba(255,80,40,${0.15 * boss.phase})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r + 10 + boss.phase * 2 + Math.sin(frame / 10) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Body glow
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  gradient.addColorStop(0, lighten(palette.body, 0.3));
  gradient.addColorStop(1, palette.body);
  ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : gradient;
  ctx.beginPath();
  ctx.arc(0, 0, r + Math.sin(frame / 8) * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Boss-specific features
  if (boss.id === 'spiderqueen') {
    // Spider legs
    ctx.strokeStyle = palette.dark;
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.sin(frame / 20) * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * r * 1.5, Math.sin(angle) * r * 1.5);
      ctx.stroke();
    }
    // Eyes (multiple)
    ctx.fillStyle = palette.eye;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      ctx.fillRect(Math.cos(angle) * 5 - 2, Math.sin(angle) * 5 - 2, 4, 4);
    }
  } else if (boss.id === 'lich') {
    // Lich - robe and skull
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.5);
    ctx.lineTo(-r * 0.8, -r * 0.5);
    ctx.lineTo(r * 0.8, -r * 0.5);
    ctx.lineTo(r, r * 0.5);
    ctx.fill();
    
    // Skull face
    ctx.fillStyle = palette.body;
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye sockets glowing
    ctx.fillStyle = palette.eye;
    ctx.fillRect(-4, -r * 0.3, 3, 3);
    ctx.fillRect(2, -r * 0.3, 3, 3);
  } else {
    // Default boss (warden) - large armored figure
    // Armor plating
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-r, -r * 0.5, r * 2, r);
    
    // Body
    ctx.fillStyle = palette.body;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes glow red
    ctx.fillStyle = palette.eye;
    const eyeDir = Math.atan2(-y, -x);
    ctx.fillRect(-5 + Math.cos(eyeDir) * 4, -5 + Math.sin(eyeDir) * 4, 4, 4);
    ctx.fillRect(2 + Math.cos(eyeDir) * 4, -5 + Math.sin(eyeDir) * 4, 4, 4);
  }
  
  ctx.restore();
}

// --- Draw projectile ---
export function drawProjectile(ctx, pr, frame) {
  const sx = pr.x, sy = pr.y;
  const isFire = pr.fire;
  const isFriendly = pr.friendly;
  
  ctx.save();
  
  if (isFire) {
    // Fireball effect
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, pr.r * 2);
    gradient.addColorStop(0, 'rgba(255,200,100,0.9)');
    gradient.addColorStop(0.5, 'rgba(255,100,30,0.6)');
    gradient.addColorStop(1, 'rgba(200,50,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, pr.r * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx, sy, pr.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (isFriendly && pr.color === '#c0e070') {
    // Arrow/bolt
    ctx.fillStyle = pr.color;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(pr.vy, pr.vx));
    ctx.fillRect(-6, -1.5, 12, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, -1, 3, 2);
    ctx.restore();
  } else {
    // Standard projectile
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.arc(sx, sy, pr.r, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(sx, sy, pr.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

// --- Draw pickup item ---
export function drawPickup(ctx, pk, frame) {
  const sx = pk.x, sy = pk.y + Math.sin(pk.t / 8) * 4;
  const item = pk.itemData;
  
  if (!item) return;
  
  ctx.save();
  
  // Glow
  ctx.fillStyle = item.color + '40';
  ctx.beginPath();
  ctx.arc(sx, sy, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Item icon (diamond shape for collectibles)
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 8);
  ctx.lineTo(sx + 6, sy);
  ctx.lineTo(sx, sy + 8);
  ctx.lineTo(sx - 6, sy);
  ctx.closePath();
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 8);
  ctx.lineTo(sx + 3, sy - 2);
  ctx.lineTo(sx, sy + 2);
  ctx.lineTo(sx - 3, sy - 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

// --- Draw particle effect ---
export function drawParticle(ctx, pt, frame) {
  const alpha = Math.min(1, pt.life / 20);
  ctx.globalAlpha = alpha;
  
  if (pt.color === '#f08040' || pt.color === '#f06030') {
    // Fire particle
    const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.3, pt.color);
    gradient.addColorStop(1, pt.color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r * 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.r / 2, pt.y - pt.r / 2, pt.r, pt.r);
  }
  
  ctx.globalAlpha = 1;
}

// --- Draw damage number ---
export function drawDamageNumber(ctx, dn, frame) {
  const alpha = Math.min(1, dn.t / 20);
  const yOffset = (40 - dn.t) * 0.5;
  
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'center';
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(dn.v.toString(), dn.x - 1, dn.y - 1 + yOffset);
  
  // Main text
  ctx.fillStyle = dn.color;
  ctx.fillText(dn.v.toString(), dn.x, dn.y + yOffset);
  
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';
}

// --- Color helper functions ---
function darken(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
}

function lighten(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.floor(r + (255 - r) * factor));
  const lg = Math.min(255, Math.floor(g + (255 - g) * factor));
  const lb = Math.min(255, Math.floor(b + (255 - b) * factor));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

// --- Draw minimap ---
export function drawMinimap(ctx, map, playerX, playerY, camX, camY, canvasWidth, canvasHeight) {
  const mapW = 120;
  const mapH = (map.h / map.w) * mapW;
  const margin = 10;
  const mapX = canvasWidth - mapW - margin;
  const mapY = margin;
  
  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(mapX - 2, mapY - 2, mapW + 4, mapH + 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX - 2, mapY - 2, mapW + 4, mapH + 4);
  
  // Scale factor
  const scaleX = mapW / map.w;
  const scaleY = mapH / map.h;
  
  // Draw walls
  ctx.fillStyle = 'rgba(100,100,120,0.6)';
  for (let y = 0; y < map.h; y += 2) {
    for (let x = 0; x < map.w; x += 2) {
      if (map.grid[y * map.w + x]) {
        ctx.fillRect(mapX + x * scaleX, mapY + y * scaleY, scaleX * 2, scaleY * 2);
      }
    }
  }
  
  // Draw boss arena indicator
  if (map.bossArena) {
    const [bx, by] = map.bossArena;
    ctx.fillStyle = 'rgba(255,50,50,0.4)';
    ctx.fillRect(mapX + bx * scaleX - 4, mapY + by * scaleY - 4, 8, 8);
  }
  
  // Draw spawn point
  if (map.spawn) {
    const [sx, sy] = map.spawn;
    ctx.fillStyle = 'rgba(50,200,50,0.4)';
    ctx.fillRect(mapX + sx * scaleX - 2, mapY + sy * scaleY - 2, 4, 4);
  }
  
  // Draw player
  ctx.fillStyle = '#ffd040';
  ctx.beginPath();
  ctx.arc(mapX + playerX * scaleX, mapY + playerY * scaleY, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Player direction indicator
  const facing = typeof playerX === 'object' ? playerX.facing : 0;
  ctx.strokeStyle = '#ffd040';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mapX + playerX * scaleX, mapY + playerY * scaleY);
  ctx.lineTo(mapX + playerX * scaleX + Math.cos(facing) * 10, mapY + playerY * scaleY + Math.sin(facing) * 10);
  ctx.stroke();
  
  // Camera view rectangle
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mapX + camX * scaleX,
    mapY + camY * scaleY,
    canvasWidth * scaleX,
    canvasHeight * scaleY
  );
}

// --- Draw ability effect (visual aura around player) ---
export function drawAbilityEffect(ctx, playerX, playerY, abilityType, frame, cdRemaining) {
  if (cdRemaining > 0) return; // No effect on cooldown
  
  const ctxSave = ctx.save();
  
  switch (abilityType) {
    case 'knight':
      // Shield bash aura - blue shield ring
      ctx.strokeStyle = `rgba(74, 111, 212, ${0.4 + Math.sin(frame / 10) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(playerX, playerY, 50 + Math.sin(frame / 8) * 5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Shield glint
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(frame / 5) * 0.2})`;
      ctx.beginPath();
      ctx.arc(playerX - 30, playerY - 20, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'ranger':
      // Volley aura - green circular arrows
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + frame / 20;
        const dist = 40 + Math.sin(frame / 6 + i) * 10;
        const x = playerX + Math.cos(angle) * dist;
        const y = playerY + Math.sin(angle) * dist;
        
        ctx.fillStyle = `rgba(63, 174, 90, ${0.5 + Math.sin(frame / 8 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, 4 + Math.sin(frame / 10) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'pyromancer':
      // Flame nova aura - fire rings
      const colors = ['#f06030', '#f08040', '#ffd040', '#fff'];
      for (let ring = 0; ring < 2; ring++) {
        const radius = 35 + ring * 20 + Math.sin(frame / 12 + ring) * 8;
        const gradient = ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, radius);
        gradient.addColorStop(0, colors[ring] + '60');
        gradient.addColorStop(1, colors[ring] + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
  
  ctx.restore();
}

// --- Draw ability cooldown indicator ---
export function drawAbilityCd(ctx, x, y, cdRemaining, cdMax) {
  const ratio = cdRemaining / cdMax;
  const radius = 16;
  
  // Background circle
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = ratio < 0.2 ? '#40c040' : '#ffd040';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Cooldown arc
  if (ratio > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius - 2, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    ctx.stroke();
  }
  
  // Icon text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', x, y);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'start';
}

// --- Draw firing range/cone indicator ---
export function drawFiringRange(ctx, playerX, playerY, facing, range, attackArc, isRanged) {
  const ctxSave = ctx.save();
  
  if (isRanged) {
    // Ranged: draw range circle
    ctx.strokeStyle = 'rgba(255, 208, 64, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(playerX, playerY, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Aim line
    ctx.strokeStyle = 'rgba(255, 208, 64, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.lineTo(playerX + Math.cos(facing) * range, playerY + Math.sin(facing) * range);
    ctx.stroke();
  } else {
    // Melee: draw attack arc
    const startAngle = facing - attackArc / 2;
    const endAngle = facing + attackArc / 2;
    
    // Arc fill
    ctx.fillStyle = 'rgba(255, 208, 64, 0.15)';
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.arc(playerX, playerY, range, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
    
    // Arc border
    ctx.strokeStyle = 'rgba(255, 208, 64, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerX, playerY, range, startAngle, endAngle);
    ctx.stroke();
    
    // Range circle (dashed)
    ctx.strokeStyle = 'rgba(255, 208, 64, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(playerX, playerY, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  ctx.restore();
}

// --- Draw vignette effect ---
export function drawVignette(ctx, width, height, intensity = 0.5) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, height / 3,
    width / 2, height / 2, height * 0.8
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
