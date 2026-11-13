export type BleepName = 'hover' | 'confirm' | 'back' | 'open' | 'error';

type Tone = { frequency: number; to?: number; duration: number; type: OscillatorType; gain: number; at?: number };

const BLEEPS: Record<BleepName, Tone[]> = {
  hover: [{ frequency: 2200, duration: 0.018, type: 'square', gain: 0.05 }],
  confirm: [
    { frequency: 880, duration: 0.05, type: 'triangle', gain: 0.22 },
    { frequency: 1320, duration: 0.08, type: 'triangle', gain: 0.2, at: 0.05 },
  ],
  back: [{ frequency: 660, to: 330, duration: 0.09, type: 'triangle', gain: 0.2 }],
  open: [{ frequency: 320, to: 960, duration: 0.14, type: 'sine', gain: 0.2 }],
  error: [
    { frequency: 180, duration: 0.09, type: 'sawtooth', gain: 0.14 },
    { frequency: 150, duration: 0.14, type: 'sawtooth', gain: 0.14, at: 0.11 },
  ],
};

export type Bleeps = {
  play: (name: BleepName) => void;
  setVolume: (volume: number) => void;
  dispose: () => void;
};

/** Synthesised UI sounds; no audio files. Silent until the first user gesture unlocks the context. */
export function createBleeps(initialVolume = 0.5): Bleeps {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let volume = initialVolume;

  const ensure = () => {
    if (typeof AudioContext !== 'function') return undefined;
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
    }
    return context;
  };

  return {
    play(name) {
      const audio = ensure();
      if (!audio || !master) return;
      if (audio.state === 'suspended') {
        void audio.resume();
        return;
      }
      for (const tone of BLEEPS[name]) {
        const begin = audio.currentTime + (tone.at ?? 0);
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.frequency, begin);
        if (tone.to) oscillator.frequency.exponentialRampToValueAtTime(tone.to, begin + tone.duration);
        gain.gain.setValueAtTime(tone.gain, begin);
        gain.gain.exponentialRampToValueAtTime(0.0001, begin + tone.duration);
        oscillator.connect(gain).connect(master);
        oscillator.start(begin);
        oscillator.stop(begin + tone.duration);
      }
    },
    setVolume(next) {
      volume = next;
      if (master) master.gain.value = next;
    },
    dispose() {
      void context?.close();
      context = undefined;
      master = undefined;
    },
  };
}

const CONTROLS =
  'button, a[href], [role="tab"], [role="option"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="radio"]';

/** Delegated listeners, so every control gets sound without per-component wiring. */
export function installBleeps(root: Document | HTMLElement, bleeps: Bleeps): () => void {
  let hovered: Element | null = null;
  const control = (event: Event) => {
    const target = (event.target as Element | null)?.closest?.(CONTROLS);
    if (!target || target.matches('[disabled], [aria-disabled="true"], [data-disabled]')) return null;
    return target;
  };
  const onOver = (event: Event) => {
    const target = control(event);
    if (target && target !== hovered) bleeps.play('hover');
    hovered = target;
  };
  const onClick = (event: Event) => {
    const target = control(event);
    if (!target) return;
    const sound = target.closest<HTMLElement>('[data-mh-bleep]')?.dataset.mhBleep as BleepName | undefined;
    bleeps.play(sound ?? 'confirm');
  };
  root.addEventListener('pointerover', onOver);
  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('pointerover', onOver);
    root.removeEventListener('click', onClick);
  };
}
