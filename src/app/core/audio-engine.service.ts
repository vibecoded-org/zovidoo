import { Injectable, inject } from '@angular/core';
import type { Smplr } from 'smplr';
import { AudioPayload, Instrument } from './models';
import { StorageService } from './storage.service';

const SOUNDFONT_URLS: Record<Instrument, string> = {
  piano: 'assets/audio/fluidr3/acoustic_grand_piano-mp3.js',
  'acoustic-guitar': 'assets/audio/fluidr3/acoustic_guitar_nylon-mp3.js',
};
const PLAYBACK_LEAD_TIME = .02;
const PLAYBACK_RELEASE_TAIL = .15;

@Injectable({ providedIn: 'root' })
export class AudioEngineService {
  private readonly storage = inject(StorageService);

  private context?: AudioContext;
  private masterGain?: GainNode;
  private smplr?: typeof import('smplr');
  private readonly players = new Map<Instrument, Smplr>();
  private initialization?: Promise<void>;
  private playbackGeneration = 0;

  // Kept as replaceable factories to make playback sequencing testable without Web Audio.
  private createContext = (): AudioContext => new AudioContext();
  private loadSmplr = (): Promise<typeof import('smplr')> => import('smplr');

  async initialize(): Promise<void> {
    if (!this.initialization) this.initialization = this.createAudioGraph().catch(error => { this.initialization = undefined; throw error; });
    await this.initialization;
    if (this.context?.state === 'suspended') await this.context.resume();
  }
  async play(payload: AudioPayload, _playbackKey = ''): Promise<void> {
    const generation = this.cancelPlayback();
    await this.initialize();
    const player = await this.playerFor(this.storage.settings().instrument);
    if (generation !== this.playbackGeneration || !this.context) return;

    const startTime = this.context.currentTime + PLAYBACK_LEAD_TIME;
    if (payload.kind === 'progression') payload.notes.forEach((notes, index) => this.trigger(player, notes.split(','), 1.05, startTime + index * 1.18));
    else if (payload.kind === 'rhythm') (payload.rhythm ?? []).forEach(offset => this.trigger(player, payload.notes[0], .08, startTime + offset));
    else if (payload.kind === 'interval') { this.trigger(player, payload.notes[0], .72, startTime); this.trigger(player, payload.notes[1], .72, startTime + .85); }
    else this.trigger(player, payload.notes, payload.duration ?? 1.15, startTime);
  }
  /** Returns the scheduled phrase length, including a brief sample-release tail. */
  playbackDuration(payload: AudioPayload): number {
    if (payload.kind === 'progression') return Math.max(0, payload.notes.length - 1) * 1.18 + 1.05 + PLAYBACK_LEAD_TIME + PLAYBACK_RELEASE_TAIL;
    if (payload.kind === 'rhythm') return Math.max(0, ...(payload.rhythm ?? [0])) + .08 + PLAYBACK_LEAD_TIME + PLAYBACK_RELEASE_TAIL;
    if (payload.kind === 'interval') return .85 + .72 + PLAYBACK_LEAD_TIME + PLAYBACK_RELEASE_TAIL;
    return (payload.duration ?? 1.15) + PLAYBACK_LEAD_TIME + PLAYBACK_RELEASE_TAIL;
  }
  /** Cancels pending notes and stops active sampled voices without unloading the selected banks. */
  stop(): void { this.cancelPlayback(); }
  setVolume(value: number): void { if (this.masterGain) this.masterGain.gain.value = this.dbToGain(value); }
  setInstrument(instrument: Instrument): void {
    this.cancelPlayback();
  }
  dispose(): void {
    this.cancelPlayback();
    this.players.forEach(player => player.dispose());
    this.players.clear();
    this.masterGain?.disconnect();
    if (this.context && this.context.state !== 'closed') void this.context.close();
    this.context = undefined;
    this.masterGain = undefined;
    this.smplr = undefined;
    this.initialization = undefined;
  }
  private async createAudioGraph(): Promise<void> {
    const [context, smplr] = await Promise.all([Promise.resolve(this.createContext()), this.loadSmplr()]);
    this.context = context;
    this.smplr = smplr;
    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.dbToGain(this.storage.settings().volume);
    this.masterGain.connect(context.destination);
  }
  private async playerFor(instrument: Instrument): Promise<Smplr> {
    const existing = this.players.get(instrument);
    if (existing) { await existing.ready; return existing; }
    if (!this.context || !this.masterGain) throw new Error('Audio engine is not initialized.');
    const { Soundfont } = this.smplr ?? await this.loadSmplr();
    const player = Soundfont(this.context, { instrumentUrl: SOUNDFONT_URLS[instrument], destination: this.masterGain, extraGain: 5 });
    this.players.set(instrument, player);
    try { await player.ready; return player; }
    catch (error) { this.players.delete(instrument); player.dispose(); throw error; }
  }
  private cancelPlayback(): number {
    this.playbackGeneration += 1;
    this.players.forEach(player => player.stop());
    return this.playbackGeneration;
  }
  private trigger(player: Smplr, notes: string | string[], duration: number, time: number): void {
    (Array.isArray(notes) ? notes : [notes]).forEach(note => player.start({ note, duration, time }));
  }
  private dbToGain(value: number): number { return Math.pow(10, value / 20); }
}
