// Simple audio system for game sound effects
class AudioManager {
  private context: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled = true;
  private volume = 0.3;

  async init() {
    if (this.context) return;
    
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create basic procedural sound effects
      await this.createProceduralSounds();
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }

  private async createProceduralSounds() {
    if (!this.context) return;

    // Hit/damage sound - sharp percussive
    const hitBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.1, this.context.sampleRate);
    const hitData = hitBuffer.getChannelData(0);
    for (let i = 0; i < hitData.length; i++) {
      const t = i / hitData.length;
      const decay = Math.exp(-t * 15);
      const noise = (Math.random() - 0.5) * 0.3;
      const tone = Math.sin(t * 800 * Math.PI) * 0.4;
      hitData[i] = (noise + tone) * decay;
    }
    this.sounds.set('hit', hitBuffer);

    // Pickup sound - pleasant chime
    const pickupBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.3, this.context.sampleRate);
    const pickupData = pickupBuffer.getChannelData(0);
    for (let i = 0; i < pickupData.length; i++) {
      const t = i / pickupData.length;
      const decay = Math.exp(-t * 3);
      const freq1 = Math.sin(t * 880 * Math.PI) * 0.3;
      const freq2 = Math.sin(t * 1320 * Math.PI) * 0.2;
      pickupData[i] = (freq1 + freq2) * decay;
    }
    this.sounds.set('pickup', pickupBuffer);

    // Door sound - mechanical clunk
    const doorBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.4, this.context.sampleRate);
    const doorData = doorBuffer.getChannelData(0);
    for (let i = 0; i < doorData.length; i++) {
      const t = i / doorData.length;
      const decay = Math.exp(-t * 8);
      const noise = (Math.random() - 0.5) * 0.6;
      const thud = Math.sin(t * 120 * Math.PI) * 0.4;
      doorData[i] = (noise * 0.3 + thud) * decay;
    }
    this.sounds.set('door', doorBuffer);

    // Jump sound - whoosh
    const jumpBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.2, this.context.sampleRate);
    const jumpData = jumpBuffer.getChannelData(0);
    for (let i = 0; i < jumpData.length; i++) {
      const t = i / jumpData.length;
      const decay = 1 - t;
      const swoosh = (Math.random() - 0.5) * Math.sin(t * 20 * Math.PI);
      jumpData[i] = swoosh * decay * 0.15;
    }
    this.sounds.set('jump', jumpBuffer);

    // Projectile fire sound
    const fireBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.15, this.context.sampleRate);
    const fireData = fireBuffer.getChannelData(0);
    for (let i = 0; i < fireData.length; i++) {
      const t = i / fireData.length;
      const decay = Math.exp(-t * 12);
      const pop = Math.sin(t * 400 * Math.PI + Math.sin(t * 50) * 2) * 0.3;
      const hiss = (Math.random() - 0.5) * 0.2;
      fireData[i] = (pop + hiss) * decay;
    }
    this.sounds.set('fire', fireBuffer);
  }

  play(soundName: string, volume: number = 1) {
    if (!this.enabled || !this.context || !this.sounds.has(soundName)) return;

    try {
      const buffer = this.sounds.get(soundName)!;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      
      source.buffer = buffer;
      gain.gain.value = this.volume * volume;
      
      source.connect(gain);
      gain.connect(this.context.destination);
      
      source.start();
    } catch (error) {
      console.warn('Failed to play sound:', soundName, error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isEnabled() {
    return this.enabled;
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

export function getAudio(): AudioManager {
  if (!audioManager) {
    audioManager = new AudioManager();
    // Auto-initialize on first user interaction (iOS-specific fixes)
    const initOnInteraction = () => {
      console.log('Initializing audio on user interaction (iOS)'); // Debug
      audioManager!.init();
      document.removeEventListener('click', initOnInteraction);
      document.removeEventListener('keydown', initOnInteraction);
      document.removeEventListener('touchstart', initOnInteraction);
      document.removeEventListener('touchend', initOnInteraction);
    };
    document.addEventListener('click', initOnInteraction, { once: true });
    document.addEventListener('keydown', initOnInteraction, { once: true });
    document.addEventListener('touchstart', initOnInteraction, { once: true, passive: true }); // iOS
    document.addEventListener('touchend', initOnInteraction, { once: true, passive: true }); // iOS
  }
  return audioManager;
}
