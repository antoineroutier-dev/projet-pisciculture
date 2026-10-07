export type AudioBus = "music" | "ambience" | "effects" | "ui";
export type Volumes = Record<AudioBus | "master", number>;
export const AUDIO_KEY = "les-etangs-audio-v1";
export const DEFAULT_VOLUMES: Volumes = {
  master: 50,
  music: 25,
  ambience: 45,
  effects: 65,
  ui: 45,
};
export function parseVolumes(raw: string | null): Volumes {
  let values: Partial<Volumes> = {};
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed.version === 1) values = parsed.volumes || {};
  } catch {
    /* Defaults */
  }
  return Object.fromEntries(
    Object.entries(DEFAULT_VOLUMES).map(([key, value]) => [
      key,
      typeof values[key as keyof Volumes] === "number" &&
      Number.isFinite(values[key as keyof Volumes])
        ? Math.max(0, Math.min(100, values[key as keyof Volumes]!))
        : value,
    ]),
  ) as Volumes;
}
export type Sound =
  | "click"
  | "open"
  | "confirm"
  | "error"
  | "cash"
  | "feed"
  | "truck"
  | "build"
  | "alert"
  | "celebrate";
/** Original deterministic synthesis. No recording, sample, download or autoplay. */
export class AudioMixer {
  private context?: AudioContext;
  private master?: GainNode;
  private buses = new Map<AudioBus, GainNode>();
  private timer?: ReturnType<typeof setInterval>;
  private noise?: AudioBuffer;
  private sources = new Set<AudioScheduledSourceNode>();
  private bed?: {
    source: AudioBufferSourceNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  };
  private beat = 0;
  private lastClick = -1;
  private weather = { season: "Printemps", rain: 0, wind: 0 };
  private disposed = false;
  volumes: Volumes;
  constructor(volumes: Volumes) {
    this.volumes = volumes;
  }
  get state() {
    return this.context?.state || "locked";
  }
  async unlock() {
    if (this.disposed || typeof AudioContext === "undefined" || document.hidden)
      return;
    if (!this.context) {
      const c = (this.context = new AudioContext({
        latencyHint: "interactive",
      }));
      this.master = c.createGain();
      this.master.connect(c.destination);
      for (const bus of ["music", "ambience", "effects", "ui"] as const) {
        const g = c.createGain();
        g.connect(this.master);
        this.buses.set(bus, g);
      }
      this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 1741,
        last = 0;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        last = (last + (seed / 2147483648) * 0.035) / 1.018;
        data[i] = last;
      }
      this.setVolumes(this.volumes);
      this.startBed();
      this.timer = setInterval(() => this.score(), 2400);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }
  setVolumes(volumes: Volumes) {
    this.volumes = volumes;
    const c = this.context;
    if (!c) return;
    this.master?.gain.setTargetAtTime(
      volumes.master / 100,
      c.currentTime,
      0.025,
    );
    for (const [bus, node] of this.buses)
      node.gain.setTargetAtTime(volumes[bus] / 100, c.currentTime, 0.025);
  }
  setWeather(season: string, rain: number, wind: number) {
    this.weather = { season, rain, wind };
    this.updateBed();
  }
  private updateBed() {
    const c = this.context,
      b = this.bed;
    if (!c || !b) return;
    b.filter.frequency.setTargetAtTime(
      450 +
        Math.max(0, this.weather.rain) * 850 +
        Math.max(0, this.weather.wind) * 45,
      c.currentTime,
      0.7,
    );
    b.gain.gain.setTargetAtTime(
      0.15 + Math.min(0.15, this.weather.rain * 0.035),
      c.currentTime,
      0.7,
    );
  }
  private startBed() {
    const c = this.context;
    if (!c || !this.noise) return;
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noise;
    source.loop = true;
    filter.type = "lowpass";
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.buses.get("ambience")!);
    this.bed = { source, filter, gain };
    this.sources.add(source);
    this.updateBed();
    source.start();
  }
  private tone(
    frequency: number,
    duration: number,
    bus: AudioBus,
    volume: number,
    delay = 0,
    end = frequency,
    type: OscillatorType = "sine",
  ) {
    const c = this.context;
    if (!c) return;
    const osc = c.createOscillator(),
      gain = c.createGain(),
      at = c.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      at + duration,
    );
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(
      volume,
      at + Math.min(0.02, duration / 4),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(this.buses.get(bus)!);
    this.sources.add(osc);
    osc.onended = () => {
      this.sources.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
  private splash(
    bus: AudioBus,
    duration: number,
    volume: number,
    frequency: number,
  ) {
    const c = this.context;
    if (!c || !this.noise) return;
    const s = c.createBufferSource(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    s.buffer = this.noise;
    f.type = "bandpass";
    f.frequency.value = frequency;
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    s.connect(f);
    f.connect(g);
    g.connect(this.buses.get(bus)!);
    this.sources.add(s);
    s.onended = () => {
      this.sources.delete(s);
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
    s.start();
    s.stop(c.currentTime + duration);
  }
  play(sound: Sound): boolean {
    if (!this.context || this.context.state !== "running" || document.hidden)
      return false;
    if (sound === "click") {
      const now = this.context.currentTime;
      if (now - this.lastClick < 0.025) return true;
      this.lastClick = now;
    }
    switch (sound) {
      case "click":
        this.tone(660, 0.07, "ui", 0.11, 0, 520);
        break;
      case "open":
        this.tone(392, 0.18, "ui", 0.1);
        this.tone(587, 0.15, "ui", 0.08, 0.045);
        break;
      case "error":
      case "alert":
        this.tone(220, 0.2, "effects", 0.14, 0, 185);
        this.tone(185, 0.25, "effects", 0.1, 0.18);
        break;
      case "cash":
        this.tone(880, 0.35, "effects", 0.14);
        this.tone(1174, 0.4, "effects", 0.09, 0.09);
        break;
      case "feed":
        this.splash("effects", 0.45, 0.5, 1400);
        this.tone(220, 0.18, "effects", 0.07, 0, 80);
        break;
      case "truck":
        this.tone(70, 0.6, "effects", 0.12, 0, 105, "triangle");
        this.splash("effects", 0.65, 0.2, 240);
        break;
      case "build":
        this.splash("effects", 0.4, 0.45, 550);
        this.tone(105, 0.2, "effects", 0.12);
        break;
      case "celebrate":
        [392, 494, 587, 784].forEach((f, i) =>
          this.tone(f, 0.6, "effects", 0.09, i * 0.09),
        );
        break;
      default:
        this.tone(440, 0.2, "ui", 0.11);
        this.tone(660, 0.3, "ui", 0.09, 0.065);
    }
    return true;
  }
  private score() {
    if (this.context?.state !== "running" || document.hidden) return;
    // Three original repeating harmonic phrases, with a separate seasonal bird motif.
    const phrases = [
      [196, 246.94, 293.66, 392],
      [174.61, 220, 261.63, 349.23],
      [164.81, 196, 246.94, 329.63],
    ];
    const phrase = phrases[Math.floor(this.beat / 8) % 3],
      note = phrase[this.beat % 4];
    this.tone(note, 2.2, "music", 0.055);
    this.tone(note / 2, 2.3, "music", 0.035, 0.04);
    const interval =
      this.weather.season === "Printemps"
        ? 2
        : this.weather.season === "Été"
          ? 4
          : 8;
    if (
      this.weather.season !== "Hiver" &&
      this.beat % interval === 0 &&
      this.weather.rain < 2
    ) {
      this.tone(1500, 0.16, "ambience", 0.035, 0, 2250);
      this.tone(2100, 0.18, "ambience", 0.025, 0.22, 1400);
    }
    this.beat++;
  }
  visibility(hidden: boolean) {
    if (!this.context) return;
    if (hidden) void this.context.suspend().catch(() => {});
    else if (this.context.state === "suspended")
      void this.context.resume().catch(() => {});
  }
  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* ended */
      }
      s.disconnect();
    }
    this.sources.clear();
    this.bed?.filter.disconnect();
    this.bed?.gain.disconnect();
    this.buses.forEach((b) => b.disconnect());
    this.master?.disconnect();
    if (this.context) void this.context.close();
  }
}
