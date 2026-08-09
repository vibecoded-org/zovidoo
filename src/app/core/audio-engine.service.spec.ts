import { TestBed } from '@angular/core/testing';
import type { NoteEvent, Smplr } from 'smplr';
import { AudioEngineService } from './audio-engine.service';
import { DEFAULT_SETTINGS, Instrument } from './models';
import { StorageService } from './storage.service';

class FakeAudioContext {
  currentTime = 10;
  state: AudioContextState = 'running';
  readonly destination = {} as AudioDestinationNode;
  readonly gain = { value: 0 } as AudioParam;
  createGain(): GainNode { return { gain: this.gain, connect: jasmine.createSpy('connect'), disconnect: jasmine.createSpy('disconnect') } as unknown as GainNode; }
  resume(): Promise<void> { return Promise.resolve(); }
  close(): Promise<void> { this.state = 'closed'; return Promise.resolve(); }
}

class FakeSampler {
  readonly ready = Promise.resolve();
  readonly starts: Array<Extract<NoteEvent, { note: string | number }>> = [];
  readonly stop = jasmine.createSpy('stop');
  readonly dispose = jasmine.createSpy('dispose');
  start(event: NoteEvent): () => void {
    if (typeof event !== 'object') throw new Error('Tests expect object-form note events.');
    this.starts.push(event);
    return () => undefined;
  }
}

describe('AudioEngineService sampled playback', () => {
  let instrument: Instrument;
  let engine: AudioEngineService;
  let context: FakeAudioContext;
  let samplers: FakeSampler[];
  let soundfont: jasmine.Spy;

  beforeEach(() => {
    instrument = 'piano';
    context = new FakeAudioContext();
    samplers = [];
    soundfont = jasmine.createSpy('Soundfont').and.callFake(() => {
      const sampler = new FakeSampler();
      samplers.push(sampler);
      return sampler as unknown as Smplr;
    });
    TestBed.configureTestingModule({ providers: [AudioEngineService, { provide: StorageService, useValue: { settings: () => ({ ...DEFAULT_SETTINGS, instrument }) } }] });
    engine = TestBed.inject(AudioEngineService);
    const testEngine = engine as unknown as { createContext: () => AudioContext; loadSmplr: () => Promise<typeof import('smplr')> };
    testEngine.createContext = () => context as unknown as AudioContext;
    testEngine.loadSmplr = async () => ({ Soundfont: soundfont } as unknown as typeof import('smplr'));
  });

  afterEach(() => TestBed.resetTestingModule());

  it('schedules sampled notes against the audio clock for every payload shape', async () => {
    await engine.play({ kind: 'chord', notes: ['C4', 'E4', 'G4'] });
    await engine.play({ kind: 'interval', notes: ['C4', 'G4'] });
    await engine.play({ kind: 'progression', notes: ['C4,E4,G4', 'F4,A4,C5'] });
    await engine.play({ kind: 'rhythm', notes: ['C5'], rhythm: [0, .5, 1] });

    const starts = samplers[0].starts;
    expect(starts.slice(0, 3).map(event => [event.note, event.time, event.duration])).toEqual([['C4', 10.02, 1.15], ['E4', 10.02, 1.15], ['G4', 10.02, 1.15]]);
    expect(starts.slice(3, 5).map(event => [event.note, event.time, event.duration])).toEqual([['C4', 10.02, .72], ['G4', 10.87, .72]]);
    expect(starts.slice(5, 11).map(event => [event.note, event.time, event.duration])).toEqual([['C4', 10.02, 1.05], ['E4', 10.02, 1.05], ['G4', 10.02, 1.05], ['F4', 11.2, 1.05], ['A4', 11.2, 1.05], ['C5', 11.2, 1.05]]);
    expect(starts.slice(11).map(event => [event.note, event.time, event.duration])).toEqual([['C5', 10.02, .08], ['C5', 10.52, .08], ['C5', 11.02, .08]]);
  });

  it('stops active and queued voices before replaying or switching instruments', async () => {
    await engine.play({ kind: 'note', notes: ['C4'] });
    engine.stop();
    expect(samplers[0].stop).toHaveBeenCalled();

    instrument = 'acoustic-guitar';
    engine.setInstrument(instrument);
    await engine.play({ kind: 'note', notes: ['D4'] });
    expect(soundfont.calls.count()).toBe(2);
    expect(soundfont.calls.mostRecent().args[1].instrumentUrl).toContain('acoustic_guitar_nylon');
    expect(soundfont.calls.mostRecent().args[1].extraGain).toBe(5);
  });

  it('maps the stored dB volume to the master gain', async () => {
    await engine.initialize();
    engine.setVolume(-20);
    expect(context.gain.value).toBeCloseTo(.1, 8);
  });

  it('reports each payload duration through the final note release', () => {
    expect(engine.playbackDuration({ kind: 'note', notes: ['C4'] })).toBeCloseTo(1.32, 8);
    expect(engine.playbackDuration({ kind: 'interval', notes: ['C4', 'G4'] })).toBeCloseTo(1.74, 8);
    expect(engine.playbackDuration({ kind: 'progression', notes: ['C4,E4,G4', 'F4,A4,C5'] })).toBeCloseTo(2.4, 8);
    expect(engine.playbackDuration({ kind: 'rhythm', notes: ['C5'], rhythm: [0, .5, 1] })).toBeCloseTo(1.25, 8);
  });
});
