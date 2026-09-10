// ============================================================
//  EMBERFALL — Sound effects system using Web Audio API
//  Procedurally generated sounds (no assets required)
// ============================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  // Initialize audio context (must be called from user interaction)
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available');
      this.enabled = false;
    }
  }

  // Resume audio context (needed after page load)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toggle sound on/off
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Play a sound effect
  play(type, params = {}) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    
    switch (type) {
      case 'hit':
        this.playHitSound(now, params);
        break;
      case 'kill':
        this.playKillSound(now, params);
        break;
      case 'playerHit':
        this.playPlayerHitSound(now, params);
        break;
      case 'projectile':
        this.playProjectileSound(now, params);
        break;
      case 'pickup':
        this.playPickupSound(now, params);
        break;
      case 'potion':
        this.playPotionSound(now, params);
        break;
      case 'levelUp':
        this.playLevelUpSound(now, params);
        break;
      case 'ability':
        this.playAbilitySound(now, params);
        break;
      case 'bossHit':
        this.playBossHitSound(now, params);
        break;
      case 'bossFightStart':
        this.playBossFightStartSound(now, params);
        break;
      case 'bossDefeated':
        this.playBossDefeatedSound(now, params);
        break;
      case 'death':
        this.playDeathSound(now, params);
        break;
      case 'fireApply':
        this.playFireSound(now, params);
        break;
      case 'chestOpen':
        this.playChestOpenSound(now, params);
        break;
      case 'checkpoint':
        this.playCheckpointSound(now, params);
        break;
      case 'footstep':
        this.playFootstepSound(now, params);
        break;
      case 'dash':
        this.playDashSound(now, params);
        break;
      default:
        break;
    }
  }

  // --- Individual sound generators ---

  playHitSound(now, params) {
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    // Short noise burst
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start(now);
  }

  playKillSound(now, params) {
    // Satisfying pop/dissolve sound
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Rising tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Noise for dissolve
    const noiseGain = this.ctx.createGain();
    noiseGain.connect(this.ctx.destination);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(noiseGain);
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    noise.start(now);
  }

  playPlayerHitSound(now, params) {
    // Sharp pain sound
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playProjectileSound(now, params) {
    // Whoosh for arrows/projectiles
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playPickupSound(now, params) {
    // Bright pickup chime
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playPotionSound(now, params) {
    // Drinking sound
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Glug glug
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(250, now + 0.1);
    osc.frequency.setValueAtTime(300, now + 0.2);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playLevelUpSound(now, params) {
    // Ascending chime
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0.15, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      osc.connect(gain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  playAbilitySound(now, params) {
    // Power-up sound for abilities
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    // Sweep down
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.4);

    // Add noise
    const noiseGain = this.ctx.createGain();
    noiseGain.connect(this.ctx.destination);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(noiseGain);
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    noise.start(now);
  }

  playBossHitSound(now, params) {
    // Heavy hit
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playBossFightStartSound(now, params) {
    // Dramatic boss entrance
    const noteLength = 0.3;
    
    [220, 330, 440].forEach((freq, i) => {
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0.2, now + i * noteLength);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * noteLength + 0.3);

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * noteLength);
      osc.connect(gain);
      osc.start(now + i * noteLength);
      osc.stop(now + i * noteLength + 0.3);
    });
  }

  playBossDefeatedSound(now, params) {
    // Victory fanfare
    const notes = [523, 659, 784, 1047, 784, 1047, 1319]; // C5, E5, G5, C6, G5, C6, E6
    notes.forEach((freq, i) => {
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.3);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      osc.connect(gain);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  }

  playDeathSound(now, params) {
    // Descending death sound
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playFireSound(now, params) {
    // Sizzle sound for fire
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start(now);
  }

  playChestOpenSound(now, params) {
    // Treasure chest open
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    // Click + chime
    const click = this.ctx.createOscillator();
    click.type = 'square';
    click.frequency.setValueAtTime(1000, now);
    click.frequency.exponentialRampToValueAtTime(500, now + 0.05);
    click.connect(gain);
    click.start(now);
    click.stop(now + 0.1);

    const chime = this.ctx.createOscillator();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(800, now + 0.1);
    chime.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    chime.connect(gain);
    chime.start(now + 0.1);
    chime.stop(now + 0.4);
  }

  playCheckpointSound(now, params) {
    // Campfire lit sound
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    // Warm glow sound
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.3);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.5);

    // Fire crackle
    const noiseGain = this.ctx.createGain();
    noiseGain.connect(this.ctx.destination);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(noiseGain);
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    noise.start(now);
  }

  playFootstepSound(now, params) {
    // Subtle footstep
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    const noise = this.ctx.createOscillator();
    noise.type = 'sine';
    noise.frequency.setValueAtTime(80, now);
    noise.connect(gain);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  playDashSound(now, params) {
    // Whoosh for dash
    const gain = this.ctx.createGain();
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// Singleton instance
export const sound = new SoundManager();
