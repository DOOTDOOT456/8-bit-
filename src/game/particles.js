// ============================================================
//  EMBERFALL — Enhanced Particle System
//  More visual effects and polish
// ============================================================

export class ParticleSystem {
  constructor(game) {
    this.game = game;
    this.particles = [];
    this.emitterPositions = [];
  }

  // Create a burst of particles at a position
  burst(x, y, count, color, speed = 3, life = 30, size = 4) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * speed + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: Math.floor(Math.random() * life + life * 0.5),
        maxLife: life,
        color,
        size: Math.random() * size * 0.5 + size * 0.5,
        gravity: 0.05,
        drag: 0.98,
      });
    }
  }

  // Create a fire effect
  fire(x, y, count = 5) {
    const colors = ['#ff4500', '#ff6347', '#ff8c00', '#ffd700', '#fff'];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const vel = Math.random() * 4 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: Math.floor(Math.random() * 20 + 15),
        maxLife: 35,
        color,
        size: Math.random() * 4 + 2,
        gravity: -0.02,
        drag: 0.95,
        alpha: 1,
      });
    }
  }

  // Create an ice/crystal effect
  ice(x, y, count = 8) {
    const colors = ['#00ffff', '#80ffff', '#ffffff', '#a0d0ff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * 2 + 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: Math.floor(Math.random() * 40 + 30),
        maxLife: 70,
        color,
        size: Math.random() * 3 + 1,
        gravity: -0.01,
        drag: 0.99,
        alpha: 1,
        sparkle: true,
      });
    }
  }

  // Create a magic/wizard effect
  magic(x, y, color = '#90e0ff', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * 5 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: Math.floor(Math.random() * 25 + 20),
        maxLife: 45,
        color,
        size: Math.random() * 5 + 2,
        gravity: 0,
        drag: 0.97,
        alpha: 1,
        glow: true,
      });
    }
  }

  // Create hearts on healing
  hearts(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      const vel = Math.random() * 2 + 1;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - 2,
        life: 40,
        maxLife: 40,
        color: '#ff4080',
        size: 8,
        gravity: -0.05,
        drag: 0.99,
        alpha: 1,
        heart: true,
      });
    }
  }

  // Create stars on legendary drops
  stars(x, y, count = 20) {
    const colors = ['#ffd700', '#fff', '#ffe060', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * 6 + 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: Math.floor(Math.random() * 30 + 25),
        maxLife: 55,
        color,
        size: Math.random() * 4 + 2,
        gravity: 0.02,
        drag: 0.96,
        alpha: 1,
        sparkle: true,
        star: true,
      });
    }
  }

  // Continuous fire effect (for campfires, etc.)
  continuousFire(x, y, countPerFrame = 2) {
    const colors = ['#ff4500', '#ff6347', '#ff8c00', '#ffd700'];
    for (let i = 0; i < countPerFrame; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5;
      const vel = Math.random() * 2 + 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: Math.floor(Math.random() * 25 + 15),
        maxLife: 40,
        color,
        size: Math.random() * 5 + 3,
        gravity: -0.03,
        drag: 0.95,
        alpha: 1,
      });
    }
  }

  // Update all particles
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Apply physics
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      
      // Update life
      p.life--;
      
      // Update alpha
      if (p.life < p.maxLife * 0.3) {
        p.alpha = p.life / (p.maxLife * 0.3);
      }
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Draw all particles
  draw(ctx, camX, camY) {
    for (const p of this.particles) {
      const sx = p.x - camX;
      const sy = p.y - camY;
      
      ctx.globalAlpha = p.alpha || 1;
      
      if (p.heart) {
        // Draw heart shape
        this.drawHeart(ctx, sx, sy, p.size);
      } else if (p.star) {
        // Draw star shape
        this.drawStar(ctx, sx, sy, p.size);
      } else if (p.glow) {
        // Draw glowing circle
        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * 2);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, p.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.sparkle) {
        // Draw sparkle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add sparkle cross
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - p.size * 2, sy);
        ctx.lineTo(sx + p.size * 2, sy);
        ctx.moveTo(sx, sy - p.size * 2);
        ctx.lineTo(sx, sy + p.size * 2);
        ctx.stroke();
      } else {
        // Standard particle
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
      }
      
      ctx.globalAlpha = 1;
    }
  }

  // Draw a heart shape
  drawHeart(ctx, x, y, size) {
    const s = size / 2;
    ctx.fillStyle = '#ff4080';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(
      x, y,
      x - s * 1.2, y,
      x - s * 1.2, y + s * 0.6
    );
    ctx.bezierCurveTo(
      x - s * 1.2, y + s * 1.2,
      x, y + s * 1.6,
      x, y + s * 2
    );
    ctx.bezierCurveTo(
      x, y + s * 1.6,
      x + s * 1.2, y + s * 1.2,
      x + s * 1.2, y + s * 0.6
    );
    ctx.bezierCurveTo(
      x + s * 1.2, y,
      x, y,
      x, y + s * 0.3
    );
    ctx.closePath();
    ctx.fill();
  }

  // Draw a star shape
  drawStar(ctx, x, y, size) {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    let rotation = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x, y - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(
        x + Math.cos(rotation) * outerRadius,
        y + Math.sin(rotation) * outerRadius
      );
      rotation += step;
      
      ctx.lineTo(
        x + Math.cos(rotation) * innerRadius,
        y + Math.sin(rotation) * innerRadius
      );
      rotation += step;
    }
    
    ctx.lineTo(x, y - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  // Clear all particles
  clear() {
    this.particles = [];
  }

  // Get particle count
  get count() {
    return this.particles.length;
  }
}
