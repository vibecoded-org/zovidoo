import { Injectable, inject } from '@angular/core';
import * as Tone from 'tone';
import { AudioPayload, Instrument } from './models';
import { StorageService } from './storage.service';

type PlayableInstrument = Exclude<Instrument, 'random'>;

const PLAYABLE_INSTRUMENTS: PlayableInstrument[] = ['piano', 'acoustic-guitar', 'electric-piano', 'organ', 'vibraphone', 'warm-pad', 'marimba'];

@Injectable({ providedIn: 'root' })
export class AudioEngineService {
  private readonly storage = inject(StorageService);

  private synth?: Tone.PolySynth<Tone.Synth>;
  private ready = false;
  private activeInstrument?: PlayableInstrument;
  private lastRandomInstrument?: PlayableInstrument;
  private readonly randomAssignments = new Map<string, PlayableInstrument>();

  async initialize(): Promise<void> {
    await Tone.start();
    this.ready = true;
  }
  async play(payload: AudioPayload, playbackKey = ''): Promise<void> {
    if (!this.ready) await this.initialize();
    this.cancelPlayback();
    this.ensureSynth(this.storage.settings().instrument, playbackKey);
    const synth = this.synth;
    if (!synth) return;
    const now = Tone.now() + 0.05;
    if (payload.kind === 'progression') payload.notes.forEach((notes, index) => synth.triggerAttackRelease(notes.split(','), '1.05', now + index * 1.18));
    else if (payload.kind === 'rhythm') (payload.rhythm ?? []).forEach(offset => synth.triggerAttackRelease(payload.notes[0], .08, now + offset));
    else if (payload.kind === 'interval') { synth.triggerAttackRelease(payload.notes[0], '0.72', now); synth.triggerAttackRelease(payload.notes[1], '0.72', now + 0.85); }
    else synth.triggerAttackRelease(payload.notes, payload.duration ?? 1.15, now);
  }
  /** Immediately tears down the active voice graph so an answer never overlaps playback. */
  stop(): void { this.cancelPlayback(); }
  setVolume(value: number): void { if (this.synth) this.synth.volume.value = value; }
  setInstrument(instrument: Instrument): void {
    this.cancelPlayback();
    this.synth?.dispose();
    this.synth = undefined;
    this.activeInstrument = undefined;
    this.randomAssignments.clear();
    if (instrument !== 'random') this.lastRandomInstrument = instrument;
  }
  dispose(): void { this.cancelPlayback(); this.synth?.dispose(); this.synth = undefined; this.ready = false; }
  private ensureSynth(instrument: Instrument, playbackKey: string): void {
    const playableInstrument = this.resolveInstrument(instrument, playbackKey);
    if (this.synth && this.activeInstrument === playableInstrument) return;
    this.synth?.dispose();
    this.activeInstrument = playableInstrument;
    this.synth = this.createSynth(playableInstrument);
    this.synth.volume.value = this.storage.settings().volume;
  }
  private resolveInstrument(instrument: Instrument, playbackKey: string): PlayableInstrument {
    if (instrument !== 'random') return instrument;
    const existing = playbackKey ? this.randomAssignments.get(playbackKey) : undefined;
    if (existing) return existing;
    const choices = PLAYABLE_INSTRUMENTS.filter(choice => choice !== this.lastRandomInstrument);
    const selected = choices[Math.floor(Math.random() * choices.length)];
    this.lastRandomInstrument = selected;
    if (playbackKey) { this.randomAssignments.set(playbackKey, selected); if (this.randomAssignments.size > 32) this.randomAssignments.delete(this.randomAssignments.keys().next().value as string); }
    return selected;
  }
  private createSynth(instrument: PlayableInstrument): Tone.PolySynth<Tone.Synth> {
    switch (instrument) {
      case 'acoustic-guitar': return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.003, decay: 0.34, sustain: 0.08, release: 0.72 } }).toDestination();
      case 'electric-piano': return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.42, sustain: 0.18, release: 1.35 } }).toDestination();
      case 'organ': return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.025, decay: 0.08, sustain: 0.9, release: 0.3 } }).toDestination();
      case 'vibraphone': return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.004, decay: 0.85, sustain: 0.02, release: 0.95 } }).toDestination();
      case 'warm-pad': return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.18, decay: 0.35, sustain: 0.7, release: 1.9 } }).toDestination();
      case 'marimba': return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, envelope: { attack: 0.002, decay: 0.46, sustain: 0.01, release: 0.52 } }).toDestination();
      default: return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.008, decay: 0.22, sustain: 0.32, release: 1.15 } }).toDestination();
    }
  }
  private cancelPlayback(): void {
    Tone.getTransport().cancel();
    Tone.getTransport().stop();
    this.synth?.releaseAll();
  }
}
