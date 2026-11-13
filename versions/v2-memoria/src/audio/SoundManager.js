import { SOUND_LIMIT_MS } from '../constants.js';

/**
 * Efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio).
 *
 * Regras:
 * - Só existe UMA voz por vez. Se outro som chega, vence a maior prioridade;
 *   em empate, o mais novo substitui o antigo. Som de prioridade menor é descartado.
 * - Cada som é cortado em SOUND_LIMIT_MS[nome], a duração da animação que ele acompanha.
 */
const PRIORITY = { flip: 1, match: 2, minute: 2, reset: 3, victory: 4, defeat: 4 };

// Nota: [freqInicial, freqFinal, inícioMs, duraçãoMs, onda, volume]
const SOUNDS = {
  flip: [[700, 350, 0, 90, 'triangle', 0.25]],
  match: [
    [660, 660, 0, 140, 'sine', 0.3],
    [880, 880, 150, 150, 'sine', 0.3],
  ],
  minute: [
    [880, 880, 0, 350, 'sine', 0.28],
    [1318, 1318, 200, 500, 'sine', 0.22],
  ],
  reset: [
    [900, 120, 0, 900, 'sawtooth', 0.16],
    [450, 60, 0, 900, 'square', 0.08],
  ],
  victory: [
    [523, 523, 0, 200, 'triangle', 0.3],
    [659, 659, 200, 200, 'triangle', 0.3],
    [784, 784, 400, 200, 'triangle', 0.3],
    [1047, 1047, 600, 200, 'triangle', 0.3],
  ],
  defeat: [
    [392, 392, 0, 200, 'triangle', 0.3],
    [330, 330, 200, 200, 'triangle', 0.3],
    [262, 262, 400, 200, 'triangle', 0.3],
    [196, 196, 600, 200, 'triangle', 0.3],
  ],
};

export default class SoundManager {
  constructor(phaserSoundManager) {
    // WebAudioSoundManager expõe `context`; em NoAudio/HTML5 fica undefined (sem som).
    this.ctx = phaserSoundManager.context || null;
    this.current = null; // { priority, gain, oscillators, endTime }
  }

  play(name) {
    const ctx = this.ctx;
    const notes = SOUNDS[name];
    if (!ctx || !notes) return;
    if (ctx.state === 'suspended') ctx.resume();

    const priority = PRIORITY[name];
    if (this.current && ctx.currentTime < this.current.endTime) {
      if (priority < this.current.priority) return; // som mais importante em andamento
      this.stopCurrent();
    }

    const limit = SOUND_LIMIT_MS[name] / 1000;
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const oscillators = [];

    for (const [f0, f1, startMs, durMs, wave, vol] of notes) {
      const start = startMs / 1000;
      if (start >= limit) continue;
      const end = Math.min(start + durMs / 1000, limit); // clamp no teto da animação

      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(f0, t0 + start);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + end);

      env.gain.setValueAtTime(0.0001, t0 + start);
      env.gain.linearRampToValueAtTime(vol, t0 + start + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + end);

      osc.connect(env).connect(master);
      osc.start(t0 + start);
      osc.stop(t0 + end + 0.02);
      oscillators.push(osc);
    }

    this.current = { priority, gain: master, oscillators, endTime: t0 + limit };
  }

  /** Corta a voz atual com um fade rápido (evita estalo). */
  stopCurrent() {
    const v = this.current;
    if (!v) return;
    const now = this.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + 0.015);
    v.oscillators.forEach((o) => {
      try { o.stop(now + 0.02); } catch { /* já parou */ }
    });
    this.current = null;
  }
}
