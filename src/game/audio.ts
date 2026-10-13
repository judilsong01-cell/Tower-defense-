// Procedural audio: every sound effect and the music are synthesised with the Web Audio API,
// so the game ships no audio files. Browsers (and the Android WebView) only allow audio after a
// user gesture, so the engine starts on the first tap (see unlock()).

export type SfxName =
  | 'click'
  | 'deploy'
  | 'blade'
  | 'impact'
  | 'shot'
  | 'blast'
  | 'heal'
  | 'skill'
  | 'kill'
  | 'leak'
  | 'opDown'
  | 'enemyShot'
  | 'win'
  | 'lose';

export type MusicTrack = 'menu' | 'battle';

/** Minimum seconds between two plays of the same effect (fast battles fire many events). */
const MIN_GAP: Partial<Record<SfxName, number>> = {
  blade: 0.06,
  impact: 0.07,
  shot: 0.05,
  blast: 0.09,
  heal: 0.2,
  kill: 0.05,
  enemyShot: 0.12,
  click: 0.04,
};

// A minor groove (i - VI - III - VII), with a semba-like syncopated kick.
const BPM = 104;
const STEP = 60 / BPM / 4; // a 16th note
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
];
const BASS = [45, 41, 36, 43];
const KICK = [0, 6, 8, 11];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noise!: AudioBuffer;
  private last = new Map<SfxName, number>();
  private track: MusicTrack | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  sfxOn = true;
  musicOn = true;

  /** Creates the audio context; call from a user gesture. Safe to call many times. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.55 : 0;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.16 : 0;
    this.musicBus.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // Silence in the background (app switched, screen off).
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
    if (this.track) this.startMusic();
  }

  setSfx(on: boolean): void {
    this.sfxOn = on;
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.02);
  }

  setMusicOn(on: boolean): void {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.1);
  }

  /** Switches the background music (null stops it). */
  music(track: MusicTrack | null): void {
    if (this.track === track) return;
    this.track = track;
    if (!track) {
      this.stopMusic();
      return;
    }
    if (this.ctx) this.startMusic();
  }

  play(name: SfxName, volume = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxOn || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const gap = MIN_GAP[name] ?? 0;
    if (now - (this.last.get(name) ?? -1) < gap) return;
    this.last.set(name, now);
    const v = volume;
    switch (name) {
      case 'click':
        this.tone(1320, now, 0.05, 'square', 0.12 * v, 990);
        break;
      case 'deploy':
        this.noiseHit(now, 0.12, 0.5 * v, 'lowpass', 300);
        this.tone(220, now, 0.18, 'triangle', 0.35 * v, 440);
        this.tone(660, now + 0.06, 0.12, 'sine', 0.15 * v);
        break;
      case 'blade':
        this.noiseHit(now, 0.07, 0.35 * v, 'bandpass', 3800, 2);
        this.tone(1800, now, 0.05, 'sawtooth', 0.05 * v, 900);
        break;
      case 'impact':
        this.noiseHit(now, 0.09, 0.45 * v, 'lowpass', 700);
        this.tone(140, now, 0.12, 'sine', 0.4 * v, 70);
        break;
      case 'shot':
        this.noiseHit(now, 0.05, 0.3 * v, 'highpass', 2400);
        this.tone(900, now, 0.04, 'square', 0.06 * v, 300);
        break;
      case 'blast':
        this.noiseHit(now, 0.35, 0.6 * v, 'lowpass', 900, 1, 120);
        this.tone(90, now, 0.3, 'sine', 0.5 * v, 40);
        break;
      case 'heal':
        [784, 988, 1175].forEach((f, i) => this.tone(f, now + i * 0.05, 0.18, 'sine', 0.12 * v));
        break;
      case 'skill':
        this.tone(330, now, 0.35, 'sawtooth', 0.12 * v, 990);
        [523, 659, 784].forEach((f, i) => this.tone(f, now + 0.05 + i * 0.04, 0.3, 'triangle', 0.12 * v));
        break;
      case 'kill':
        this.tone(660, now, 0.12, 'square', 0.08 * v, 220);
        this.noiseHit(now, 0.06, 0.15 * v, 'bandpass', 1500);
        break;
      case 'leak':
        this.tone(880, now, 0.14, 'square', 0.18 * v);
        this.tone(660, now + 0.16, 0.2, 'square', 0.18 * v);
        break;
      case 'opDown':
        this.tone(440, now, 0.4, 'triangle', 0.25 * v, 110);
        break;
      case 'enemyShot':
        this.noiseHit(now, 0.04, 0.12 * v, 'highpass', 3000);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, now + i * 0.12, 0.35, 'triangle', 0.25 * v));
        this.tone(1319, now + 0.5, 0.6, 'sine', 0.15 * v);
        break;
      case 'lose':
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, now + i * 0.18, 0.4, 'triangle', 0.22 * v));
        break;
    }
  }

  // ---- synthesis helpers ---------------------------------------------------

  private tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, glideTo?: number, bus?: GainNode): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(bus ?? this.sfxBus);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private noiseHit(at: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, q = 1, sweepTo?: number, bus?: GainNode): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, at);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(bus ?? this.sfxBus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  // ---- music ------------------------------------------------------------------

  private startMusic(): void {
    this.stopMusic();
    if (!this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    // Look-ahead scheduler: queue the next notes a little ahead of time.
    this.timer = setInterval(() => this.schedule(), 50);
  }

  private stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.track || ctx.state !== 'running') return;
    const battle = this.track === 'battle';
    while (this.nextTime < ctx.currentTime + 0.25) {
      const t = this.nextTime;
      const s = this.step % 16;
      const bar = Math.floor(this.step / 16) % 4;
      const chord = CHORDS[bar];
      if (s === 0) {
        // Soft pad holding the bar's chord.
        for (const n of chord) this.tone(midi(n), t, STEP * 15, 'triangle', battle ? 0.05 : 0.07, undefined, this.musicBus);
      }
      if (battle || s % 8 === 0) {
        if (KICK.includes(s)) {
          this.tone(110, t, 0.18, 'sine', battle ? 0.9 : 0.5, 45, this.musicBus);
        }
        if (s % 2 === 0) this.noiseHit(t, 0.03, s % 4 === 2 ? 0.25 : 0.12, 'highpass', 7000, 1, undefined, this.musicBus);
      }
      if (battle && (s === 4 || s === 12)) this.noiseHit(t, 0.12, 0.35, 'bandpass', 1800, 0.8, undefined, this.musicBus);
      // Bass: root on the syncopated beats, fifth/octave answers.
      const root = BASS[bar];
      if (s === 0 || s === 6 || s === 10) this.tone(midi(root), t, STEP * 2.5, 'triangle', 0.5, undefined, this.musicBus);
      if (s === 13) this.tone(midi(root + 7), t, STEP * 2, 'triangle', 0.35, undefined, this.musicBus);
      // A sparse melody line over the menu, a busier one in battle.
      if ((battle && (s === 2 || s === 9 || s === 14)) || (!battle && (s === 3 || s === 11))) {
        const n = chord[(this.step >> 2) % 3] + 12;
        this.tone(midi(n), t, STEP * 1.6, 'sine', 0.12, undefined, this.musicBus);
      }
      this.nextTime += STEP;
      this.step++;
    }
  }
}

export const audio = new AudioEngine();
