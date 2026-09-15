import { SoundItem } from '../types';

export interface SynthPlaybackHandle {
  stop: () => void;
  duration: number;
}

/**
 * Procedural Web Audio stim sound synthesizer.
 * Generates tactile, pleasant stim soundscapes natively without external audio files.
 */
export function playProceduralSynth(
  ctx: AudioContext,
  destination: AudioNode,
  synthType: SoundItem['synthSound'] = 'bubble-pop',
  volumeMultiplier: number = 1.0
): SynthPlaybackHandle {
  const t0 = ctx.currentTime;
  const soundGain = ctx.createGain();
  soundGain.gain.setValueAtTime(volumeMultiplier * 0.7, t0);
  soundGain.connect(destination);

  const stoppers: Array<() => void> = [];
  let duration = 0.3;

  const createOsc = (
    type: OscillatorType,
    freq: number,
    startOffset: number = 0
  ): OscillatorNode => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0 + startOffset);
    stoppers.push(() => {
      try {
        osc.stop();
      } catch {}
    });
    return osc;
  };

  const createGainEnv = (
    initialGain: number,
    startOffset: number = 0
  ): GainNode => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(initialGain, t0 + startOffset);
    return gain;
  };

  switch (synthType) {
    case 'bubble-pop': {
      duration = 0.16;
      const osc = createOsc('sine', 320);
      osc.frequency.exponentialRampToValueAtTime(950, t0 + 0.09);
      osc.frequency.exponentialRampToValueAtTime(600, t0 + duration);

      const gain = createGainEnv(0.01);
      gain.gain.linearRampToValueAtTime(1.0, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      gain.connect(soundGain);
      osc.start(t0);
      osc.stop(t0 + duration);
      break;
    }

    case 'wooden-tap': {
      duration = 0.18;
      const osc = createOsc('triangle', 740);
      osc.frequency.exponentialRampToValueAtTime(160, t0 + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(850, t0);
      filter.Q.setValueAtTime(5, t0);

      const gain = createGainEnv(1.0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(soundGain);
      osc.start(t0);
      osc.stop(t0 + duration);
      break;
    }

    case 'click-snap': {
      duration = 0.07;
      const osc = createOsc('square', 1800);
      osc.frequency.exponentialRampToValueAtTime(200, t0 + duration);

      const gain = createGainEnv(0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      gain.connect(soundGain);
      osc.start(t0);
      osc.stop(t0 + duration);
      break;
    }

    case 'chime-high': {
      duration = 0.65;
      [880, 1320, 1760].forEach((freq, idx) => {
        const offset = idx * 0.03;
        const osc = createOsc('sine', freq, offset);
        const gain = createGainEnv(0.4 / (idx + 1), offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0 + offset);
        osc.stop(t0 + duration);
      });
      break;
    }

    case 'marimba-note': {
      duration = 0.35;
      const osc = createOsc('sine', 440);
      const oscHarmonic = createOsc('sine', 1320);

      const gain = createGainEnv(1.0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(soundGain);

      osc.start(t0);
      oscHarmonic.start(t0);
      osc.stop(t0 + duration);
      oscHarmonic.stop(t0 + duration);
      break;
    }

    case 'calm-gong': {
      duration = 1.2;
      const baseFreq = 261.63; // C4
      [1, 2.76, 5.4].forEach((ratio, i) => {
        const osc = createOsc('sine', baseFreq * ratio);
        const gain = createGainEnv(0.5 / (i + 1));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
      });
      break;
    }

    case 'spring-boing': {
      duration = 0.45;
      const osc = createOsc('triangle', 280);
      osc.frequency.linearRampToValueAtTime(620, t0 + 0.12);
      osc.frequency.linearRampToValueAtTime(240, t0 + 0.24);
      osc.frequency.linearRampToValueAtTime(480, t0 + 0.36);
      osc.frequency.linearRampToValueAtTime(300, t0 + duration);

      const gain = createGainEnv(0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      gain.connect(soundGain);
      osc.start(t0);
      osc.stop(t0 + duration);
      break;
    }

    case 'laser-blip': {
      duration = 0.2;
      const osc = createOsc('sawtooth', 1400);
      osc.frequency.exponentialRampToValueAtTime(90, t0 + duration);

      const gain = createGainEnv(0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      gain.connect(soundGain);
      osc.start(t0);
      osc.stop(t0 + duration);
      break;
    }

    case 'gentle-purr': {
      duration = 0.7;
      const osc = createOsc('sine', 80);
      const lfo = createOsc('sine', 24); // 24Hz purr flutter

      const lfoGain = createGainEnv(0.5);
      lfo.connect(lfoGain);

      const mainGain = createGainEnv(0.5);
      mainGain.gain.exponentialRampToValueAtTime(0.01, t0 + duration);

      osc.connect(mainGain);
      mainGain.connect(soundGain);

      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + duration);
      lfo.stop(t0 + duration);
      break;
    }

    case 'sub-thump': {
      duration = 0.25;
      const osc = createOsc('sine', 130);
      osc.frequency.exponentialRampToValueAtTime(40, t0 + duration);

      const gain = createGainEnv(1.0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      gain.connect(soundGain);
      osc.start(t0);
      osc.stop(t0 + duration);
      break;
    }

    case 'empty':
    default: {
      duration = 0.18;
      const osc = createOsc('sine', 520);
      osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.08);

      const gain = createGainEnv(0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      gain.connect(soundGain);
      osc.start(t0);
      osc.stop(t0 + duration);
      break;
    }
  }

  const stop = () => {
    stoppers.forEach((cb) => cb());
    try {
      soundGain.disconnect();
    } catch {}
  };

  return { stop, duration };
}
