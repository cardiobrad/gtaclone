/**
 * Sonido 100% sintetizado con Web Audio (sin assets externos):
 * motor (pitch según velocidad), disparos, explosiones y choques.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private skidSrc: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private humSrc: AudioBufferSourceNode | null = null;
  muted = false;

  /** Llamar desde un gesto de usuario (click en "Jugar"). */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private noiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  shoot() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 0.15);
  }

  explosion() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.8);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 1);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.6);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.8, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  crash(intensity: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500 + intensity * 1500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2 + intensity * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 0.25);
  }

  /** Recoger un pickup: chime ascendente. */
  pickup() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(1040, t + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /** Golpe sordo (atropello / muerte de peatón). */
  thud() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Impacto metálico de bala. */
  ricochet() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 0.08);
  }

  /** Sirena de policía en bucle (dos tonos vía LFO cuadrado). */
  siren(on: boolean) {
    if (!this.ctx || !this.master) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.value = 600;
      this.sirenLfo = this.ctx.createOscillator();
      this.sirenLfo.type = 'square';
      this.sirenLfo.frequency.value = 1.5;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 110;
      this.sirenLfo.connect(lfoGain).connect(this.sirenOsc.frequency);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      this.sirenOsc.connect(filter).connect(gain).connect(this.master);
      this.sirenOsc.start();
      this.sirenLfo.start();
    } else if (!on && this.sirenOsc) {
      this.sirenOsc.stop();
      this.sirenLfo?.stop();
      this.sirenOsc = null;
      this.sirenLfo = null;
    }
  }

  /** Rumor de fondo de la ciudad: ruido grave muy suave en bucle. */
  hum(on: boolean) {
    if (!this.ctx || !this.master) return;
    if (on && !this.humSrc) {
      this.humSrc = this.ctx.createBufferSource();
      this.humSrc.buffer = this.noiseBuffer();
      this.humSrc.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.025;
      this.humSrc.connect(filter).connect(gain).connect(this.master);
      this.humSrc.start();
    } else if (!on && this.humSrc) {
      this.humSrc.stop();
      this.humSrc = null;
    }
  }

  /** Claxon lejano ocasional (ambiente de ciudad). */
  distantHorn() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const freq = 240 + Math.random() * 220;
    const dur = 0.25 + Math.random() * 0.4;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.025, t + 0.04);
    gain.gain.setValueAtTime(0.025, t + dur - 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Chirrido de neumáticos continuo. intensidad 0..1, null = parar. */
  skid(intensity: number | null) {
    if (!this.ctx || !this.master) return;
    if (intensity === null || intensity <= 0) {
      if (this.skidSrc) {
        this.skidSrc.stop();
        this.skidSrc = null;
        this.skidGain = null;
        this.skidFilter = null;
      }
      return;
    }
    if (!this.skidSrc) {
      this.skidSrc = this.ctx.createBufferSource();
      this.skidSrc.buffer = this.noiseBuffer();
      this.skidSrc.loop = true;
      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.value = 900;
      this.skidFilter.Q.value = 2.5;
      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.value = 0;
      this.skidSrc.connect(this.skidFilter).connect(this.skidGain).connect(this.master);
      this.skidSrc.start();
    }
    const t = this.ctx.currentTime;
    this.skidGain!.gain.setTargetAtTime(0.05 + intensity * 0.14, t, 0.05);
    this.skidFilter!.frequency.setTargetAtTime(750 + intensity * 500, t, 0.05);
  }

  /** ratio 0..1 (velocidad / velocidad máxima). null/negativo = motor apagado. */
  engine(ratio: number | null) {
    if (!this.ctx || !this.master) return;
    if (ratio === null) {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc = null;
        this.engineGain = null;
        this.engineFilter = null;
      }
      return;
    }
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 400;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
    }
    const target = 45 + ratio * 110;
    this.engineOsc.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineGain!.gain.setTargetAtTime(0.10 + ratio * 0.12, this.ctx.currentTime, 0.1);
    this.engineFilter!.frequency.setTargetAtTime(300 + ratio * 900, this.ctx.currentTime, 0.1);
  }
}

export const sound = new SoundManager();
